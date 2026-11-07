import { z } from 'zod';
import { MUSIC_DURATION_MAX_SEC, MUSIC_START_MAX_SEC, TRACK_CATEGORIES, TRACK_TITLE_MAX } from './music.js';

/** Track ids: cuid for admin-created rows, readable slugs for the seeded ones. */
export const trackIdSchema = z.string().regex(/^[a-z0-9-]{2,40}$/);

/** Files shipped with the client live in /public/music. */
const bundledFileSchema = z.string().regex(/^\/music\/[a-z0-9][a-z0-9._-]{0,80}\.mp3$/, 'Must look like /music/name.mp3');

const durationSchema = z.number().int().min(1).max(MUSIC_DURATION_MAX_SEC);

export const trackCreateSchema = z
  .object({
    title: z.string().trim().min(1).max(TRACK_TITLE_MAX),
    category: z.enum(TRACK_CATEGORIES),
    /** A file already in client/public/music; otherwise upload one afterwards. */
    file: bundledFileSchema.nullable().default(null),
    durationSec: durationSchema.nullable().default(null),
  })
  .strict();
/** What a client sends (file and duration may be omitted). */
export type TrackCreateInput = z.input<typeof trackCreateSchema>;
/** After parsing, with defaults applied. */
export type TrackCreateData = z.output<typeof trackCreateSchema>;

export const trackPatchSchema = z
  .object({
    title: z.string().trim().min(1).max(TRACK_TITLE_MAX),
    category: z.enum(TRACK_CATEGORIES),
    active: z.boolean(),
    sortOrder: z.number().int().min(0).max(10_000),
    durationSec: durationSchema.nullable(),
  })
  .partial()
  .strict();
export type TrackPatchInput = z.infer<typeof trackPatchSchema>;

/** Multipart field sent next to an uploaded mp3: the length measured by the browser. */
export const uploadDurationSchema = z.object({
  durationSec: z.coerce.number().int().min(1).max(MUSIC_DURATION_MAX_SEC).optional(),
});

export const musicStartSchema = z.number().int().min(0).max(MUSIC_START_MAX_SEC);
