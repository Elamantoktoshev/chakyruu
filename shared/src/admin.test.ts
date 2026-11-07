import { describe, expect, it } from 'vitest';
import { grantCreditsSchema, leadPatchSchema, packageAudience, pricePatchSchema } from './admin.js';

describe('admin schemas', () => {
  it('limits manual credit grants to a positive, bounded integer', () => {
    expect(grantCreditsSchema.parse({ amount: 10 })).toEqual({ amount: 10 });
    for (const amount of [0, -5, 1.5, 100_000]) expect(grantCreditsSchema.safeParse({ amount }).success, String(amount)).toBe(false);
  });

  it('does not let a lead be marked CONVERTED by hand (only by creating the organization)', () => {
    expect(leadPatchSchema.safeParse({ status: 'CONTACTED' }).success).toBe(true);
    expect(leadPatchSchema.safeParse({ status: 'CONVERTED' }).success).toBe(false);
  });

  it('accepts partial price edits but not empty ones', () => {
    expect(pricePatchSchema.parse({ amountSom: 800 })).toEqual({ amountSom: 800 });
    expect(pricePatchSchema.safeParse({}).success).toBe(false);
    expect(pricePatchSchema.safeParse({ amountSom: -1 }).success).toBe(false);
  });

  it('sells venue packages to agencies', () => {
    expect(packageAudience('AGENCY')).toBe('VENUE');
    expect(packageAudience('TAMADA')).toBe('TAMADA');
  });
});
