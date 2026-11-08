import { PAYMENT_PROVIDERS } from './catalog.js';
import { z } from 'zod';
import { isTwoGisUrl } from './urls.js';
import { phoneSchema } from './phone.schemas.js';
import { CATALOG_STATUSES, GIFT_CODE_ALPHABET, GIFT_CODE_LENGTH, LEAD_NAME_MAX, LEAD_NAME_MIN, LEAD_VENUE_MAX, ORG_TYPES, PARTNER_LANGUAGES, normalizeCity, normalizeGiftCode } from './partners.js';

export const partnerLeadSchema = z
  .object({
    type: z.enum(ORG_TYPES),
    name: z.string().trim().min(LEAD_NAME_MIN).max(LEAD_NAME_MAX),
    phone: phoneSchema,
    venueName: z.string().trim().min(LEAD_NAME_MIN).max(LEAD_VENUE_MAX),
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

const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === '' ? null : value))
    .nullable();

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
  .object({ priceCode: z.string().regex(/^[A-Z0-9_]{2,40}$/), provider: z.enum(PAYMENT_PROVIDERS) })
  .strict();
