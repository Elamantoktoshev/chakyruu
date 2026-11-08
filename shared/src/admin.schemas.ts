import { z } from 'zod';
import { LEAD_STATUSES, MAX_ADMIN_CREDIT_GRANT, PAYMENT_STATUSES, STATS_PERIODS } from './admin.js';
import { EVENT_TYPES } from './catalog.js';
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
export const adminStatsQuerySchema = z.object({ period: z.enum(STATS_PERIODS).default('week') });

/** Highest price an admin can set on one design (som). Matches the DB check constraint. */
export const TEMPLATE_PRICE_MAX_SOM = 100_000;
export const TEMPLATE_BADGES = ['HIT', 'NEW'] as const;
export type TemplateBadgeId = (typeof TEMPLATE_BADGES)[number];

const cardText = z.string().trim().max(160);

export const adminTemplatePatchSchema = z
  .object({
    name: z.string().trim().min(2).max(40),
    /** null = the shop-wide publish price. */
    priceSom: z.number().int().min(0).max(TEMPLATE_PRICE_MAX_SOM).nullable(),
    badge: z.enum(TEMPLATE_BADGES).nullable(),
    type: z.enum(EVENT_TYPES),
    sortOrder: z.number().int().min(0).max(10_000),
    isActive: z.boolean(),
    description: z.object({ ky: cardText, ru: cardText }).partial().strict(),
  })
  .partial()
  .strict()
  .refine((patch) => Object.keys(patch).length > 0, 'Nothing to update');

/** `?file=layers/hand-left.webp` — the manifest slot an upload goes to. */
export const templateAssetQuerySchema = z.object({ file: z.string().regex(/^(layers\/)?[a-z0-9][a-z0-9-]{0,40}\.webp$/, 'Unknown asset file') });
