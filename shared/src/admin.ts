import { z } from 'zod';
import { CATALOG_STATUSES, ORG_TYPES, type OrgType } from './partners.js';

export const LEAD_STATUSES = ['NEW', 'CONTACTED', 'CONVERTED'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export const PRICE_AUDIENCES = ['CLIENT', 'VENUE', 'TAMADA'] as const;
export type PriceAudience = (typeof PRICE_AUDIENCES)[number];

/** Price row that publishing a single invitation costs. */
export const INVITATION_PRICE_CODE = 'INVITATION_PUBLISH';
export const MAX_ADMIN_CREDIT_GRANT = 1000;

/** Which package price list a partner sees. Agencies buy venue packages. */
export function packageAudience(type: OrgType): PriceAudience {
  return type === 'TAMADA' ? 'TAMADA' : 'VENUE';
}

export const adminIdParamsSchema = z.object({ id: z.string().min(1).max(40) });
export const adminOrgQuerySchema = z.object({ type: z.enum(ORG_TYPES).optional() });
export const adminOrgPatchSchema = z.object({ catalogStatus: z.enum(CATALOG_STATUSES) }).strict();
export const grantCreditsSchema = z.object({ amount: z.number().int().min(1).max(MAX_ADMIN_CREDIT_GRANT) }).strict();
export const adminLeadQuerySchema = z.object({ status: z.enum(LEAD_STATUSES).optional() });
export const leadPatchSchema = z.object({ status: z.enum(['NEW', 'CONTACTED']) }).strict();
export const convertLeadSchema = z.object({ name: z.string().trim().min(2).max(120).optional() }).strict();
export const priceCodeParamsSchema = z.object({ code: z.string().regex(/^[A-Z0-9_]{2,40}$/) });
export const pricePatchSchema = z
  .object({ amountSom: z.number().int().min(0).max(10_000_000), active: z.boolean() })
  .partial()
  .strict()
  .refine((patch) => Object.keys(patch).length > 0, 'Nothing to update');

export const PAYMENT_STATUSES = ['PENDING', 'SUCCEEDED', 'FAILED'] as const;
export const adminPaymentQuerySchema = z.object({ status: z.enum(PAYMENT_STATUSES).optional() });
