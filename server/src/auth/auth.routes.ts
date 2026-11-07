import { Router, type CookieOptions, type Request } from 'express';
import { sendOk } from '../lib/http.js';
import { rateLimit } from '../lib/rateLimit.js';
import { currentUser, readSessionToken, requireAuth, SESSION_COOKIE } from './auth.middleware.js';
import { MIN_FORM_FILL_MS, PHONE_PATTERN, requestCodeSchema, verifyCodeSchema } from './auth.schemas.js';
import { OTP_TTL_MS } from './auth.service.js';
import { HttpError } from '../lib/http.js';
import { maskPhone } from './sms.js';
import type { AuthService } from './auth.service.js';
import { clientIp } from '../lib/clientIp.js';

const WINDOW_MS = 10 * 60 * 1000;
const OTP_REQUESTS_PER_PHONE = 3;
const OTP_REQUESTS_PER_IP = 10;
const OTP_VERIFIES_PER_IP = 10;

/** Rate-limit key by the submitted phone; arbitrary strings fall back to the IP so keys stay small. */
function phoneKey(req: Request): string {
  const phone: unknown = (req.body as { phone?: unknown } | undefined)?.phone;
  const trimmed = typeof phone === 'string' ? phone.trim() : '';
  return PHONE_PATTERN.test(trimmed) ? `phone:${trimmed}` : `ip:${clientIp(req)}`;
}

export interface AuthRouterOptions {
  auth: AuthService;
  isProduction: boolean;
}

export function createAuthRouter({ auth, isProduction }: AuthRouterOptions): Router {
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
        console.warn(`[auth] honeypot triggered for ${maskPhone(phone)} from ${clientIp(req)}`);
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
