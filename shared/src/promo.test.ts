import { describe, expect, it } from 'vitest';
import { discountedSom, normalizePromoCode, promoCheckSchema, promoCreateSchema, publishSchema } from './index.js';

describe('promo codes', () => {
  it('normalizes what people type', () => {
    expect(normalizePromoCode('  toi 2027 ')).toBe('TOI2027');
    expect(promoCheckSchema.parse({ code: 'toi-2027' })).toEqual({ code: 'TOI-2027' });
  });

  it('rejects codes with other characters or the wrong length', () => {
    expect(promoCheckSchema.safeParse({ code: 'ТОЙ' }).success).toBe(false);
    expect(promoCheckSchema.safeParse({ code: 'AB' }).success).toBe(false);
    expect(promoCheckSchema.safeParse({ code: 'A'.repeat(33) }).success).toBe(false);
  });

  it('rounds the discounted price to whole som and never below zero', () => {
    expect(discountedSom(499, 20)).toBe(399);
    expect(discountedSom(499, 50)).toBe(250);
    expect(discountedSom(499, 100)).toBe(0);
  });

  it('creates codes with sensible defaults and limits', () => {
    expect(promoCreateSchema.parse({ code: 'toi2027', discountPercent: 20 })).toEqual({
      code: 'TOI2027',
      discountPercent: 20,
      maxUses: null,
      expiresAt: null,
      note: null,
    });
    expect(promoCreateSchema.safeParse({ code: 'TOI', discountPercent: 0 }).success).toBe(false);
    expect(promoCreateSchema.safeParse({ code: 'TOI', discountPercent: 101 }).success).toBe(false);
    expect(promoCreateSchema.safeParse({ code: 'TOI', discountPercent: 10, maxUses: 0 }).success).toBe(false);
  });

  it('lets publish carry an optional promo code', () => {
    expect(publishSchema.parse({ provider: 'MBANK' })).toEqual({ provider: 'MBANK' });
    expect(publishSchema.parse({ provider: 'SIMBANK', promoCode: ' toi2027' })).toEqual({ provider: 'SIMBANK', promoCode: 'TOI2027' });
  });
});
