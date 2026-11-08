import { z } from 'zod';

export const PROMO_CODE_MIN = 3;
export const PROMO_CODE_MAX = 32;
const PROMO_CODE_PATTERN = /^[A-Z0-9-]+$/;
const NOTE_MAX = 200;
const MAX_USES_LIMIT = 1_000_000;

/** People type codes in any case and with stray spaces: "  toi2027 " → "TOI2027". */
export function normalizePromoCode(input: string): string {
  return input.replace(/\s+/g, '').toUpperCase();
}

/** Price after the discount, rounded to whole som (bank transfers are in som). */
export function discountedSom(priceSom: number, discountPercent: number): number {
  return Math.max(0, Math.round((priceSom * (100 - discountPercent)) / 100));
}

export const promoCodeSchema = z
  .string()
  .transform(normalizePromoCode)
  .pipe(z.string().min(PROMO_CODE_MIN).max(PROMO_CODE_MAX).regex(PROMO_CODE_PATTERN, 'Only letters A–Z, digits and "-"'));

/** "Колдонуу" on the pay page: does this code work for this invitation, and what is the new price? */
export const promoCheckSchema = z.object({ code: promoCodeSchema }).strict();

export const promoCreateSchema = z
  .object({
    code: promoCodeSchema,
    discountPercent: z.number().int().min(1).max(100),
    maxUses: z.number().int().min(1).max(MAX_USES_LIMIT).nullable().default(null),
    /** End of the last valid day, ISO; null = no end date. */
    expiresAt: z.iso.datetime({ offset: true }).nullable().default(null),
    note: z.string().trim().max(NOTE_MAX).nullable().default(null),
  })
  .strict();

export const promoPatchSchema = z.object({ isActive: z.boolean() }).strict();

export type PromoCreateInput = z.infer<typeof promoCreateSchema>;
