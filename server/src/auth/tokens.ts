import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

export const OTP_CODE_LENGTH = 6;
const SESSION_TOKEN_BYTES = 32;

/** Cryptographically random numeric code, zero-padded (e.g. "004217"). */
export function generateOtpCode(): string {
  return randomInt(0, 10 ** OTP_CODE_LENGTH)
    .toString()
    .padStart(OTP_CODE_LENGTH, '0');
}

/** Opaque session token for the cookie (256 bits, base64url). */
export function generateSessionToken(): string {
  return randomBytes(SESSION_TOKEN_BYTES).toString('base64url');
}

/** Only this digest is stored, so a DB leak does not leak usable sessions. */
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Keyed hash of the code bound to the phone. A 6-digit code has tiny entropy,
 * so a plain hash could be brute-forced offline; the server secret prevents that.
 */
export function hashOtp(secret: string, phone: string, code: string): string {
  return createHmac('sha256', secret).update(`${phone}:${code}`).digest('hex');
}

/** Constant-time comparison of two hex digests. */
export function safeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
}
