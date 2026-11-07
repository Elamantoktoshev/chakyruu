import { z } from 'zod';
import { GUEST_NAME_MAX, GUEST_STATUSES, GUEST_TOKEN_PATTERN, MAX_PARTY_SIZE } from './guests.js';

export const bulkGuestsSchema = z.object({ text: z.string().max(20_000) });

export const guestListQuerySchema = z.object({ status: z.enum(GUEST_STATUSES).optional() });

export const guestParamsSchema = z.object({ id: z.string().min(1).max(40), guestId: z.string().min(1).max(40) });

/** Personal link token (?g=…). */
export const guestTokenSchema = z.string().regex(GUEST_TOKEN_PATTERN);

/**
 * Guest answer from the invitation page. Either the personal-link token or, on the shared link,
 * the name the guest typed. Declining always means 0 people.
 */
export const rsvpSchema = z
  .object({
    token: guestTokenSchema.optional(),
    name: z.string().trim().min(2).max(GUEST_NAME_MAX).optional(),
    attending: z.boolean(),
    guestsCount: z.number().int().min(1).max(MAX_PARTY_SIZE).default(1),
  })
  .strict()
  .refine((body) => body.token !== undefined || body.name !== undefined, {
    message: 'Either token or name is required',
    path: ['name'],
  })
  .transform((body) => ({ ...body, guestsCount: body.attending ? body.guestsCount : 0 }));

export type RsvpInput = z.input<typeof rsvpSchema>;
