import type { UserRole } from '@prisma/client';
import { HttpError } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { SMS_FAILED_USER_MESSAGE, logSmsFailure } from './sms-failure.js';
import { loginCodeText, maskPhone, type SmsProvider } from './sms.js';
import { generateOtpCode, generateSessionToken, hashOtp, hashSessionToken, safeEqualHex } from './tokens.js';
import { logger } from '../lib/logger.js';
import { notifyAdmin } from '../notify/notifier.js';
import type { GoogleProfile } from './google.js';

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
/** Server-side resend gap: stops SMS bombing and stops an attacker from silently replacing the victim's code. */
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
/** Caps SMS cost and total guesses against one phone (at most 50 guesses per day). */
export const OTP_DAILY_LIMIT_PER_PHONE = 10;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Budget guard: SMS sent by the whole site per 24 h (SMS_DAILY_LIMIT overrides). */
export const DEFAULT_SMS_DAILY_LIMIT = 500;
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface SessionUser {
  id: string;
  /** Null when the person signed in with Google only. */
  phone: string | null;
  email: string | null;
  name: string | null;
  role: UserRole;
  organizationId: string | null;
}

export interface CreatedSession {
  token: string;
  expiresAt: Date;
  user: SessionUser;
}

export interface OtpRequestResult {
  expiresInSeconds: number;
  /** Development only (DEV_LOGIN_WITHOUT_SMS): the code itself, so the client can log in by phone alone. */
  devCode?: string;
}

export interface AuthService {
  requestOtp(phone: string): Promise<OtpRequestResult>;
  verifyOtp(phone: string, code: string): Promise<CreatedSession>;
  /** Finds the user by Google account id (creating one on first sign-in) and opens a session. */
  signInWithGoogle(profile: GoogleProfile): Promise<CreatedSession>;
  getSessionUser(token: string): Promise<SessionUser | null>;
  revokeSession(token: string): Promise<void>;
}

export interface AuthServiceDeps {
  otpSecret: string;
  sms: SmsProvider;
  now?: () => Date;
  /** Never in production: return the code in the response instead of relying on SMS. */
  exposeOtpInResponse?: boolean;
  /** Demo numbers → fixed code; no SMS is sent to them (TEST_LOGIN_PHONES). */
  testLoginPhones?: ReadonlyMap<string, string>;
  /** Most SMS the site may send in 24 h; protects the Nikita.kg balance from SMS bombing. */
  smsDailyLimit?: number;
  /** Google-verified e-mails that get the ADMIN role on sign-in (ADMIN_EMAILS). */
  adminEmails?: ReadonlySet<string>;
}

const sessionUserSelect = { id: true, phone: true, email: true, name: true, role: true, organizationId: true } as const;

const invalidCode = (): HttpError => new HttpError(400, 'Invalid or expired code');

export function createAuthService({
  otpSecret,
  sms,
  now = () => new Date(),
  exposeOtpInResponse = false,
  testLoginPhones = new Map<string, string>(),
  smsDailyLimit = DEFAULT_SMS_DAILY_LIMIT,
  adminEmails = new Set<string>(),
}: AuthServiceDeps): AuthService {
  /** Codes issued in the last 24 h to real numbers = SMS actually paid for. */
  async function assertSmsBudget(issuedAt: Date): Promise<void> {
    const demoPhones = [...testLoginPhones.keys()];
    const sentToday = await prisma.otpCode.count({
      where: { createdAt: { gt: new Date(issuedAt.getTime() - DAY_MS) }, phone: { notIn: demoPhones } },
    });
    if (sentToday >= smsDailyLimit) {
      logger.error(`[auth] daily SMS limit of ${smsDailyLimit} reached — login codes are paused`);
      throw new HttpError(503, 'Login is temporarily unavailable, please try again later');
    }
  }

  async function assertCanIssueCode(phone: string, issuedAt: Date): Promise<void> {
    const [latest, issuedToday] = await Promise.all([
      prisma.otpCode.findFirst({ where: { phone }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
      prisma.otpCode.count({ where: { phone, createdAt: { gt: new Date(issuedAt.getTime() - DAY_MS) } } }),
    ]);
    if (latest && issuedAt.getTime() - latest.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
      throw new HttpError(429, 'Please wait before requesting a new code');
    }
    if (issuedToday >= OTP_DAILY_LIMIT_PER_PHONE) {
      throw new HttpError(429, 'Too many codes requested today, please try again tomorrow');
    }
  }

  async function requestOtp(phone: string): Promise<OtpRequestResult> {
    const issuedAt = now();
    await assertCanIssueCode(phone, issuedAt);
    const demoCode = testLoginPhones.get(phone);
    if (!demoCode) await assertSmsBudget(issuedAt);
    const code = demoCode ?? generateOtpCode();

    // A new code invalidates every earlier unused one for this phone.
    await prisma.$transaction([
      prisma.otpCode.updateMany({ where: { phone, consumedAt: null }, data: { consumedAt: issuedAt } }),
      prisma.otpCode.create({
        data: {
          phone,
          codeHash: hashOtp(otpSecret, phone, code),
          expiresAt: new Date(issuedAt.getTime() + OTP_TTL_MS),
          createdAt: issuedAt,
        },
      }),
    ]);

    if (demoCode) {
      logger.info(`[auth] demo number ${maskPhone(phone)}: fixed code, no SMS`);
      return { expiresInSeconds: OTP_TTL_MS / 1000 };
    }
    try {
      await sms.send(phone, loginCodeText(code));
    } catch (error: unknown) {
      logSmsFailure(phone, error);
      throw new HttpError(503, SMS_FAILED_USER_MESSAGE);
    }
    const expiresInSeconds = OTP_TTL_MS / 1000;
    return exposeOtpInResponse ? { expiresInSeconds, devCode: code } : { expiresInSeconds };
  }

  async function verifyOtp(phone: string, code: string): Promise<CreatedSession> {
    const checkedAt = now();
    const otp = await prisma.otpCode.findFirst({
      where: { phone, consumedAt: null, expiresAt: { gt: checkedAt } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, codeHash: true },
    });
    if (!otp) throw invalidCode();

    // Count the attempt atomically so parallel guesses cannot exceed the limit.
    const counted = await prisma.otpCode.updateMany({
      where: { id: otp.id, consumedAt: null, attempts: { lt: OTP_MAX_ATTEMPTS } },
      data: { attempts: { increment: 1 } },
    });
    if (counted.count === 0) {
      throw new HttpError(429, 'Too many attempts, please request a new code');
    }

    if (!safeEqualHex(otp.codeHash, hashOtp(otpSecret, phone, code))) throw invalidCode();

    // Single use: only one concurrent request can flip consumedAt.
    const consumed = await prisma.otpCode.updateMany({
      where: { id: otp.id, consumedAt: null },
      data: { consumedAt: checkedAt },
    });
    if (consumed.count === 0) throw invalidCode();

    // First successful login registers the user.
    const isNewUser = (await prisma.user.count({ where: { phone } })) === 0;
    const user = await prisma.user.upsert({
      where: { phone },
      update: {},
      create: { phone },
      select: sessionUserSelect,
    });

    if (isNewUser) notifyAdmin({ type: 'user_registered', phone });
    return openSession(user, checkedAt);
  }

  async function openSession(user: SessionUser, openedAt: Date): Promise<CreatedSession> {
    const token = generateSessionToken();
    const expiresAt = new Date(openedAt.getTime() + SESSION_TTL_MS);
    await prisma.session.create({ data: { tokenHash: hashSessionToken(token), userId: user.id, expiresAt } });
    return { token, expiresAt, user };
  }

  async function signInWithGoogle({ sub, email, name }: GoogleProfile): Promise<CreatedSession> {
    const signedInAt = now();
    const isNewUser = (await prisma.user.count({ where: { googleId: sub } })) === 0;
    // Only an address Google verified (google.ts passes null otherwise) can be on the admin list.
    const adminRole = email && adminEmails.has(email) ? ({ role: 'ADMIN', organizationId: null } as const) : {};
    // Keep the e-mail current; never overwrite a name the user may have set.
    const user = await prisma.user.upsert({
      where: { googleId: sub },
      update: { email, ...adminRole },
      create: { googleId: sub, email, name, ...adminRole },
      select: sessionUserSelect,
    });
    if (isNewUser) notifyAdmin({ type: 'user_registered', phone: null, email });
    return openSession(user, signedInAt);
  }

  async function getSessionUser(token: string): Promise<SessionUser | null> {
    const tokenHash = hashSessionToken(token);
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      select: { expiresAt: true, user: { select: sessionUserSelect } },
    });
    if (!session) return null;
    if (session.expiresAt <= now()) {
      await prisma.session.deleteMany({ where: { tokenHash } });
      return null;
    }
    return session.user;
  }

  async function revokeSession(token: string): Promise<void> {
    await prisma.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
  }

  return { requestOtp, verifyOtp, signInWithGoogle, getSessionUser, revokeSession };
}
