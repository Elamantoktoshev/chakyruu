import type { OrgType } from './partners.js';

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

export const PAYMENT_STATUSES = ['PENDING', 'SUCCEEDED', 'FAILED'] as const;
