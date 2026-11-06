import { describe, expect, it } from 'vitest';
import {
  OTP_CODE_LENGTH,
  generateOtpCode,
  generateSessionToken,
  hashOtp,
  hashSessionToken,
  safeEqualHex,
} from './tokens.js';

const SECRET = 'test-secret-test-secret-test-secret!!';

describe('generateOtpCode', () => {
  it('returns a zero-padded numeric string of the configured length', () => {
    for (let i = 0; i < 200; i += 1) {
      expect(generateOtpCode()).toMatch(new RegExp(`^\\d{${OTP_CODE_LENGTH}}$`));
    }
  });
});

describe('generateSessionToken', () => {
  it('returns unique url-safe tokens with 256 bits of entropy', () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
});

describe('hashSessionToken', () => {
  it('is deterministic and does not return the token itself', () => {
    const token = generateSessionToken();
    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
    expect(hashSessionToken(token)).not.toContain(token);
    expect(hashSessionToken(token)).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('hashOtp', () => {
  it('binds the code to the phone and the secret', () => {
    const base = hashOtp(SECRET, '+996700123456', '123456');
    expect(hashOtp(SECRET, '+996700123456', '123456')).toBe(base);
    expect(hashOtp(SECRET, '+996700999999', '123456')).not.toBe(base);
    expect(hashOtp(SECRET, '+996700123456', '654321')).not.toBe(base);
    expect(hashOtp(`${SECRET}x`, '+996700123456', '123456')).not.toBe(base);
  });
});

describe('safeEqualHex', () => {
  it('compares hex digests without throwing on length mismatch', () => {
    const digest = hashSessionToken('abc');
    expect(safeEqualHex(digest, digest)).toBe(true);
    expect(safeEqualHex(digest, hashSessionToken('abd'))).toBe(false);
    expect(safeEqualHex(digest, 'abcd')).toBe(false);
  });
});
