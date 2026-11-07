import { z } from 'zod';
import { isTwoGisUrl } from './urls.js';
import { phoneSchema } from './phone.js';

export const partnerLeadSchema = z
  .object({
    type: z.enum(['VENUE', 'TAMADA', 'AGENCY']),
    name: z.string().trim().min(2).max(80),
    phone: phoneSchema,
    venueName: z.string().trim().min(2).max(120),
    city: z
      .string()
      .trim()
      .max(60)
      .transform((value) => (value === '' ? null : value))
      .nullable()
      .optional(),
  })
  .strict();

export type PartnerLeadInput = z.input<typeof partnerLeadSchema>;

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

const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === '' ? null : value))
    .nullable();

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

const citySchema = z
  .string()
  .max(60)
  .transform((value) => (value.trim() === '' ? null : normalizeCity(value)))
  .nullable();

const nullablePhone = z
  .union([z.literal(''), phoneSchema])
  .transform((value) => (value === '' ? null : value))
  .nullable();

const INSTAGRAM_HANDLE = /^[A-Za-z0-9._]{1,30}$/;

/** "@handle", "handle" or "https://instagram.com/handle/" → "handle". */
function toInstagramHandle(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const fromUrl = trimmed.match(/^https:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9._]{1,30})\/?$/)?.[1];
  const handle = fromUrl ?? trimmed.replace(/^@/, '');
  return INSTAGRAM_HANDLE.test(handle) ? handle : '';
}

const instagramSchema = z
  .string()
  .transform(toInstagramHandle)
  .refine((handle) => handle !== '', 'Instagram must be a handle like @name or an instagram.com link')
  .nullable();

const mapUrlSchema = nullableText(500).refine((url) => url === null || isTwoGisUrl(url), 'Must be a https 2GIS link');

/** Partner's public profile (partial update; balance, type and moderation are not editable here). */
export const orgProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    phone: nullablePhone,
    whatsapp: nullablePhone,
    instagram: instagramSchema,
    city: citySchema,
    address: nullableText(200),
    mapUrl: mapUrlSchema,
  })
  .partial()
  .strict();

export type OrgProfileInput = z.input<typeof orgProfileSchema>;

export const hallSchema = z
  .object({ name: z.string().trim().min(1).max(80), capacity: z.number().int().min(1).max(5000) })
  .strict();

const VIDEO_HOSTS = ['instagram.com', 'www.instagram.com', 'youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'];

function isVideoUrl(value: string): boolean {
  try {
    const { protocol, hostname } = new URL(value);
    return protocol === 'https:' && VIDEO_HOSTS.includes(hostname);
  } catch {
    return false;
  }
}

export const tamadaProfileSchema = z
  .object({
    displayName: z.string().trim().min(2).max(80),
    bio: nullableText(600),
    languages: z
      .array(z.enum(PARTNER_LANGUAGES))
      .max(PARTNER_LANGUAGES.length * 2)
      .transform((languages) => [...new Set(languages)]),
    priceFromSom: z.number().int().min(0).max(1_000_000).nullable(),
    videoUrls: z.array(z.string().trim().refine(isVideoUrl, 'Only https Instagram / YouTube links')).max(6),
  })
  .partial()
  .strict();

export type TamadaProfileInput = z.input<typeof tamadaProfileSchema>;

/** Calendar date without time, "YYYY-MM-DD", and a real day of the month. */
export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
  }, 'Invalid date');

export function normalizeGiftCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, '');
}

/** "K7MQ3XPA" → "K7MQ-3XPA" for display. */
export function formatGiftCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export const giftCodeSchema = z
  .string()
  .transform(normalizeGiftCode)
  .refine((code) => code.length === GIFT_CODE_LENGTH && [...code].every((ch) => GIFT_CODE_ALPHABET.includes(ch)), 'Invalid gift code');

export const createGiftSchema = z
  .object({
    clientPhone: phoneSchema,
    eventDate: dateOnlySchema,
    hallId: z.string().min(1).max(40).optional(),
  })
  .strict();

export type CreateGiftInput = z.infer<typeof createGiftSchema>;

export const catalogQuerySchema = z.object({
  city: z.string().trim().min(1).max(60).transform(normalizeCity).optional(),
  lang: z.enum(PARTNER_LANGUAGES).optional(),
  priceMax: z.coerce.number().int().min(0).max(1_000_000).optional(),
  date: dateOnlySchema.optional(),
});

export type CatalogQuery = z.infer<typeof catalogQuerySchema>;

export const purchaseCreditsSchema = z
  .object({ priceCode: z.string().regex(/^[A-Z0-9_]{2,40}$/), provider: z.enum(['MBANK', 'ODENGI', 'ELSOM']) })
  .strict();
