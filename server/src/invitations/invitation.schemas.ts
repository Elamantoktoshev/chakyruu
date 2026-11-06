import { z } from 'zod';

export const MAX_GUESTS_PER_RSVP = 20;

export const slugParamsSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug may contain only latin letters, digits and dashes'),
});

export const rsvpBodySchema = z
  .object({
    guestName: z.string().trim().min(2).max(100),
    attending: z.boolean(),
    guestsCount: z.number().int().min(1).max(MAX_GUESTS_PER_RSVP).default(1),
    comment: z.string().trim().max(500).optional(),
  })
  .transform((body) => ({
    ...body,
    // Declined guests bring nobody — normalise so totals stay correct.
    guestsCount: body.attending ? body.guestsCount : 0,
    comment: body.comment ? body.comment : null,
  }));

export type RsvpInput = z.infer<typeof rsvpBodySchema>;
