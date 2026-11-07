import { describe, expect, it } from 'vitest';
import { SINGLE_SMS_MAX_LENGTH, loginCodeText, maskPhone } from './sms.js';

describe('maskPhone', () => {
  it('keeps the country code and the last two digits only', () => {
    expect(maskPhone('+996700123456')).toBe('+996*******56');
  });
});

describe('loginCodeText', () => {
  it('is the agreed text and fits into one Cyrillic SMS', () => {
    const text = loginCodeText('123456');
    expect(text).toBe('Chakyruu: кодуңуз 123456');
    expect(text.length).toBeLessThanOrEqual(SINGLE_SMS_MAX_LENGTH);
  });
});
