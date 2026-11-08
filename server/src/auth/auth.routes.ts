import { timingSafeEqual } from 'node:crypto';
import { Router, type CookieOptions, type Request, type Response } from 'express';
import { sendOk } from '../lib/http.js';
import { rateLimit } from '../lib/rateLimit.js';
import { currentUser, readSessionToken, requireAuth, SESSION_COOKIE } from './auth.middleware.js';
import { MIN_FORM_FILL_MS, PHONE_PATTERN, requestCodeSchema, verifyCodeSchema } from './auth.schemas.js';
import { OTP_TTL_MS } from './auth.service.js';
import { HttpError } from '../lib/http.js';
import { maskPhone } from './sms.js';
import type { AuthService } from './auth.service.js';
import { clientIp } from '../lib/clientIp.js';
import { logger } from '../lib/logger.js';
import { createGoogleAttempt, type GoogleOAuth } from './google.js';

const WINDOW_MS = 10 * 60 * 1000;
const OTP_REQUESTS_PER_PHONE = 3;
const OTP_REQUESTS_PER_IP = 10;
const OTP_VERIFIES_PER_IP = 10;
const GOOGLE_STARTS_PER_IP = 20;
/** How long a person has to pick their Google account. */
const GOOGLE_ATTEMPT_TTL_MS = 10 * 60 * 1000;
const GOOGLE_ATTEMPT_COOKIE = 'g_oauth';
const GOOGLE_COOKIE_PATH = '/api/auth/google';
const DEFAULT_NEXT_PATH = '/dashboard';
const MAX_NEXT_PATH_LENGTH = 200;

/** Only same-site paths, so the sign-in cannot be turned into an open redirect. */
export function safeNextPath(value: unknown): string {
  if (typeof value !== 'string' || value.length > MAX_NEXT_PATH_LENGTH) return DEFAULT_NEXT_PATH;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return DEFAULT_NEXT_PATH;
  return value;
}

interface GoogleAttempt {
  state: string;
  codeVerifier: string;
  next: string;
}

function readGoogleAttempt(raw: unknown): GoogleAttempt | null {
  if (typeof raw !== 'string') return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { state, codeVerifier, next } = parsed as Record<string, unknown>;
    if (typeof state !== 'string' || typeof codeVerifier !== 'string') return null;
    return { state, codeVerifier, next: safeNextPath(next) };
  } catch {
    return null;
  }
}

function sameText(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Rate-limit key by the submitted phone; arbitrary strings fall back to the IP so keys stay small. */
function phoneKey(req: Request): string {
  const phone: unknown = (req.body as { phone?: unknown } | undefined)?.phone;
  const trimmed = typeof phone === 'string' ? phone.trim() : '';
  return PHONE_PATTERN.test(trimmed) ? `phone:${trimmed}` : `ip:${clientIp(req)}`;
}

export interface AuthRouterOptions {
  auth: AuthService;
  isProduction: boolean;
  /** Absent → "Sign in with Google" is switched off. */
  google?: GoogleOAuth;
  /** The site's own address; Google sends people back here. */
  siteUrl: string;
}

export function createAuthRouter({ auth, isProduction, google, siteUrl }: AuthRouterOptions): Router {
  const router = Router();
  const cookieBase: CookieOptions = { httpOnly: true, sameSite: 'lax', secure: isProduction, path: '/api' };

  router.post(
    '/request-code',
    rateLimit({ windowMs: WINDOW_MS, max: OTP_REQUESTS_PER_IP }),
    rateLimit({ windowMs: WINDOW_MS, max: OTP_REQUESTS_PER_PHONE, key: phoneKey }),
    async (req, res) => {
      const { phone, website, elapsedMs } = requestCodeSchema.parse(req.body);
      if (website) {
        // Honeypot filled: answer like a success so the bot learns nothing, but send no SMS.
        logger.warn(`[auth] honeypot triggered for ${maskPhone(phone)} from ${clientIp(req)}`);
        sendOk(res, { expiresInSeconds: OTP_TTL_MS / 1000 });
        return;
      }
      if (elapsedMs < MIN_FORM_FILL_MS) throw new HttpError(429, 'Please wait a moment and try again');
      sendOk(res, await auth.requestOtp(phone));
    },
  );

  router.post('/verify', rateLimit({ windowMs: WINDOW_MS, max: OTP_VERIFIES_PER_IP }), async (req, res) => {
    const { phone, code } = verifyCodeSchema.parse(req.body);
    const session = await auth.verifyOtp(phone, code);
    res.cookie(SESSION_COOKIE, session.token, { ...cookieBase, expires: session.expiresAt });
    sendOk(res, session.user);
  });

  router.get('/options', (_req, res) => {
    sendOk(res, { google: Boolean(google) });
  });

  const attemptCookie: CookieOptions = { httpOnly: true, sameSite: 'lax', secure: isProduction, path: GOOGLE_COOKIE_PATH };
  const backToLogin = (res: Response) => res.redirect(303, `${siteUrl}/login?error=google`);

  router.get('/google/start', rateLimit({ windowMs: WINDOW_MS, max: GOOGLE_STARTS_PER_IP }), (req, res) => {
    if (!google) throw new HttpError(404, 'Google sign-in is not enabled');
    const { state, codeVerifier, codeChallenge } = createGoogleAttempt();
    const attempt: GoogleAttempt = { state, codeVerifier, next: safeNextPath(req.query.next) };
    res.cookie(GOOGLE_ATTEMPT_COOKIE, JSON.stringify(attempt), { ...attemptCookie, maxAge: GOOGLE_ATTEMPT_TTL_MS });
    res.redirect(303, google.authorizationUrl({ state, codeChallenge }));
  });

  router.get('/google/callback', async (req, res) => {
    const attempt = readGoogleAttempt((req.cookies as Record<string, unknown>)[GOOGLE_ATTEMPT_COOKIE]);
    res.clearCookie(GOOGLE_ATTEMPT_COOKIE, attemptCookie);
    const { code, state } = req.query;
    if (!google || !attempt || typeof code !== 'string' || typeof state !== 'string' || !sameText(state, attempt.state)) {
      // Cancelled on Google's screen, expired, or a forged callback.
      backToLogin(res);
      return;
    }
    try {
      const session = await auth.signInWithGoogle(await google.exchange(code, attempt.codeVerifier));
      res.cookie(SESSION_COOKIE, session.token, { ...cookieBase, expires: session.expiresAt });
      res.redirect(303, `${siteUrl}${attempt.next}`);
    } catch (error: unknown) {
      if (!(error instanceof HttpError)) logger.error({ err: error }, '[auth] Google sign-in crashed');
      backToLogin(res);
    }
  });

  router.post('/logout', async (req, res) => {
    const token = readSessionToken(req.cookies);
    if (token) await auth.revokeSession(token);
    res.clearCookie(SESSION_COOKIE, cookieBase);
    sendOk(res, { loggedOut: true });
  });

  router.get('/me', requireAuth, (_req, res) => {
    sendOk(res, currentUser(res));
  });

  return router;
}
