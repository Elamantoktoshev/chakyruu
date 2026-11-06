import type { UserRole } from '@prisma/client';
import { HttpError } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { maskPhone, type SmsProvider } from './sms.js';
import { generateOtpCode, generateSessionToken, hashOtp, hashSessionToken, safeEqualHex } from './tokens.js';

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
/** Server-side resend gap: stops SMS bombing and stops an attacker from silently replacing the victim's code. */
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
/** Caps SMS cost and total guesses against one phone (at most 50 guesses per day). */
export const OTP_DAILY_LIMIT_PER_PHONE = 10;
const DAY_MS = 24 * 60 * 60 * 1000;
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface SessionUser {
  id: string;
  phone: string;
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
  getSessionUser(token: string): Promise<SessionUser | null>;
  revokeSession(token: string): Promise<void>;
}

export interface AuthServiceDeps {
  otpSecret: string;
  sms: SmsProvider;
  now?: () => Date;
  /** Never in production: return the code in the response instead of relying on SMS. */
  exposeOtpInResponse?: boolean;
}

const sessionUserSelect = { id: true, phone: true, name: true, role: true, organizationId: true } as const;

const invalidCode = (): HttpError => new HttpError(400, 'Invalid or expired code');

export function createAuthService({
  otpSecret,
  sms,
  now = () => new Date(),
  exposeOtpInResponse = false,
}: AuthServiceDeps): AuthService {
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
    const code = generateOtpCode();

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

    try {
      await sms.send(phone, `Chakyruu.kg: ваш код ${code}. Никому его не сообщайте.`);
    } catch (error: unknown) {
      console.error(`[auth] SMS delivery failed for ${maskPhone(phone)}`, error);
      throw new HttpError(503, 'Could not send SMS, please try again later');
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
    const user = await prisma.user.upsert({
      where: { phone },
      update: {},
      create: { phone },
      select: sessionUserSelect,
    });

    const token = generateSessionToken();
    const expiresAt = new Date(checkedAt.getTime() + SESSION_TTL_MS);
    await prisma.session.create({ data: { tokenHash: hashSessionToken(token), userId: user.id, expiresAt } });
    return { token, expiresAt, user };
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

  return { requestOtp, verifyOtp, getSessionUser, revokeSession };
}
