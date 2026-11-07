import { describe, expect, it } from 'vitest';
import { isValidPhone, phoneSchema, sanitizeLocalPart, toE164 } from './index.js';

describe('phoneSchema', () => {
  it('accepts +996 followed by exactly 9 digits and trims surrounding spaces', () => {
    expect(phoneSchema.parse('+996700123456')).toBe('+996700123456');
    expect(phoneSchema.parse('  +996555000111 ')).toBe('+996555000111');
  });

  it('rejects every other format', () => {
    const invalid = [
      '0700123456',
      '996700123456',
      '+99670012345',
      '+9967001234567',
      '+996 700 123 456',
      '+996-700-123-456',
      '+7700123456',
      '+996abcdefghi',
      '',
    ];
    for (const phone of invalid) {
      expect(phoneSchema.safeParse(phone).success, phone).toBe(false);
    }
  });
});

describe('client helpers', () => {
  it('keeps digits only and caps the local part at 9', () => {
    expect(sanitizeLocalPart('700 12-34 56')).toBe('700123456');
    expect(sanitizeLocalPart('7001234567890')).toBe('700123456');
    expect(sanitizeLocalPart('abc')).toBe('');
  });

  it('accepts a whole pasted number in any common form', () => {
    for (const input of ['+996700000001', '996700000001', '0700000001', '+996 (700) 00-00-01', '0 700 000 001']) {
      expect(sanitizeLocalPart(input), input).toBe('700000001');
    }
  });

  it('builds and validates E.164 numbers', () => {
    expect(isValidPhone(toE164('700123456'))).toBe(true);
    expect(isValidPhone(toE164('70012345'))).toBe(false);
    expect(isValidPhone('+7700123456')).toBe(false);
  });
});
