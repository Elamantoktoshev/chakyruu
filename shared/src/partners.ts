export const ORG_TYPES = ['VENUE', 'TAMADA', 'AGENCY'] as const;
export type OrgType = (typeof ORG_TYPES)[number];
export const PARTNER_LANGUAGES = ['KY', 'RU', 'UZ'] as const;
export type PartnerLanguage = (typeof PARTNER_LANGUAGES)[number];
export const CATALOG_STATUSES = ['HIDDEN', 'PUBLISHED'] as const;
export type CatalogStatus = (typeof CATALOG_STATUSES)[number];

/** A gift code stays valid until this many days after the toi. */
export const GIFT_VALID_DAYS_AFTER_EVENT = 30;
export const GIFT_CODE_LENGTH = 8;
/** No 0/O, 1/I/L — codes are read out over the phone. */
export const GIFT_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Canonical city spelling ("ош" / "ОШ " → "Ош", "жалал-абад" → "Жалал-Абад"), applied on write and
 * in queries so filtering is an exact match (Postgres lower() is unreliable for Cyrillic under C locale).
 */
export function normalizeCity(city: string): string {
  return city
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('ru')
    .replace(/(^|[\s-])(\p{L})/gu, (_match, sep: string, letter: string) => sep + letter.toLocaleUpperCase('ru'));
}

export function normalizeGiftCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, '');
}

/** "K7MQ3XPA" → "K7MQ-3XPA" for display. */
export function formatGiftCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export const LEAD_NAME_MIN = 2;
export const LEAD_NAME_MAX = 80;
export const LEAD_VENUE_MAX = 120;
