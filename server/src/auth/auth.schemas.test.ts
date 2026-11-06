import { describe, expect, it } from 'vitest';
import { requestCodeSchema, verifyCodeSchema } from './auth.schemas.js';

describe('requestCodeSchema', () => {
  it('requires a valid phone', () => {
    expect(requestCodeSchema.parse({ phone: '+996700123456' })).toEqual({ phone: '+996700123456' });
    expect(requestCodeSchema.safeParse({}).success).toBe(false);
    expect(requestCodeSchema.safeParse({ phone: '0700123456' }).success).toBe(false);
  });
});

describe('verifyCodeSchema', () => {
  it('accepts a 6-digit code', () => {
    expect(verifyCodeSchema.parse({ phone: '+996700123456', code: ' 012345 ' })).toEqual({
      phone: '+996700123456',
      code: '012345',
    });
  });

  it('rejects codes that are not exactly 6 digits', () => {
    for (const code of ['12345', '1234567', '12a456', '']) {
      expect(verifyCodeSchema.safeParse({ phone: '+996700123456', code }).success, code).toBe(false);
    }
  });
});
