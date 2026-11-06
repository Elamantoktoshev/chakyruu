import { describe, expect, it } from 'vitest';
import { maskPhone } from './sms.js';

describe('maskPhone', () => {
  it('keeps the country code and the last two digits only', () => {
    expect(maskPhone('+996700123456')).toBe('+996*******56');
  });
});
