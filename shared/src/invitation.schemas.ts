import { z } from 'zod';
import { EVENT_TYPES, LANGUAGES, MUSIC_TRACK_IDS, PAYMENT_PROVIDERS } from './catalog.js';
import { OPENING_ANIMATIONS } from './openings.js';
import { programSchema } from './program.js';
import { giftCodeSchema } from './partners.js';
import { SLUG_MAX_LENGTH, SLUG_PATTERN } from './slug.js';
import { isTwoGisUrl } from './urls.js';

export const HOST_NAMES_MAX = 120;
export const VENUE_NAME_MAX = 150;
export const VENUE_ADDRESS_MAX = 200;
export const MESSAGE_MAX = 1000;


/** Empty strings from form inputs become null. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === '' ? null : value))
    .nullable();

const partnerIdSchema = z.string().min(1).max(40);

export const slugSchema = z.string().trim().toLowerCase().min(3).max(SLUG_MAX_LENGTH).regex(SLUG_PATTERN);

export const invitationIdSchema = z.object({ id: z.string().min(1).max(40) });

/** A gift code from a partner makes the invitation free and pre-fills the venue. */
export const createInvitationSchema = z
  .object({ templateId: z.string().min(1).max(60), giftCode: giftCodeSchema.optional() })
  .strict();

/** Autosave payload: every field optional, unknown keys rejected. */
export const invitationDraftSchema = z
  .object({
    templateId: z.string().min(1).max(60),
    hostNames: z.string().trim().max(HOST_NAMES_MAX),
    eventType: z.enum(EVENT_TYPES),
    eventDate: z.iso.datetime({ offset: true }).nullable(),
    venueName: z.string().trim().max(VENUE_NAME_MAX),
    venueAddress: optionalText(VENUE_ADDRESS_MAX),
    venueMapUrl: optionalText(500).refine((url) => url === null || isTwoGisUrl(url), 'Must be a https 2GIS link'),
    message: optionalText(MESSAGE_MAX),
    language: z.enum(LANGUAGES),
    adultsOnly: z.boolean(),
    musicTrackId: z.enum(MUSIC_TRACK_IDS).nullable(),
    /** Must be one of the template's palettes (checked on the server). */
    paletteId: z.string().regex(/^[a-z0-9-]{2,40}$/).nullable(),
    /** Age on the "Юбилей" template. */
    heroNumber: z.number().int().min(1).max(150).nullable(),
    openingAnimation: z.enum(OPENING_ANIMATIONS),
    program: programSchema,
    /** Hide "made with Chakyruu.kg" — only on partner gifts (checked on the server). */
    hideBranding: z.boolean(),
    /** Partners shown on the invitation (validated on the server against the catalogue). */
    venueOrgId: partnerIdSchema.nullable(),
    tamadaOrgId: partnerIdSchema.nullable(),
    hallId: partnerIdSchema.nullable(),
  })
  .partial()
  .strict();

export type InvitationDraftInput = z.infer<typeof invitationDraftSchema>;

/** What must be filled in before an invitation can be published. */
export const publishReadySchema = z.object({
  hostNames: z.string().trim().min(2),
  eventDate: z.date(),
  venueName: z.string().trim().min(2),
});

export type MissingForPublish = 'hostNames' | 'eventDate' | 'venueName';

export const publishSchema = z.object({ provider: z.enum(PAYMENT_PROVIDERS) });
