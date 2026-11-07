import { z } from 'zod';
import { LEAD_STATUSES, MAX_ADMIN_CREDIT_GRANT, PAYMENT_STATUSES } from './admin.js';
import { CATALOG_STATUSES, ORG_TYPES } from './partners.js';

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
export const adminPaymentQuerySchema = z.object({ status: z.enum(PAYMENT_STATUSES).optional() });
