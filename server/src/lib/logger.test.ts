import { describe, expect, it } from 'vitest';
import { maskPhonesInText, redactUrl } from './logger.js';

describe('maskPhonesInText', () => {
  it('masks Kyrgyz numbers anywhere in a message', () => {
    expect(maskPhonesInText('SMS to +996700123456 failed')).toBe('SMS to +996*******56 failed');
    expect(maskPhonesInText('phones 996555000111, +996700000099')).toBe('phones +996*******11, +996*******99');
  });
});

describe('redactUrl', () => {
  it('hides personal-link tokens and codes in query strings', () => {
    expect(redactUrl('/aibek-aizada?g=fixture_token_01&lang=ru')).toBe('/aibek-aizada?g=[redacted]&lang=ru');
    expect(redactUrl('/api/x?code=123456')).toBe('/api/x?code=[redacted]');
    expect(redactUrl('/api/public/prices')).toBe('/api/public/prices');
  });
});
