import { z } from 'zod';
import { guestTokenSchema } from './guests.schemas.js';
import { TILEK_AUTHOR_MAX, TILEK_TEXT_MAX } from './tilek.js';

/** Anonymous per-browser id used to allow one like per browser. */
export const clientIdSchema = z.uuid();

/** Through a personal link the author is the guest; on the shared link the name is typed. */
export const createTilekSchema = z
  .object({
    token: guestTokenSchema.optional(),
    authorName: z.string().trim().min(2).max(TILEK_AUTHOR_MAX).optional(),
    text: z.string().trim().min(2).max(TILEK_TEXT_MAX),
  })
  .strict()
  .refine((body) => body.token !== undefined || body.authorName !== undefined, {
    message: 'Either token or authorName is required',
    path: ['authorName'],
  });

export type CreateTilekInput = z.infer<typeof createTilekSchema>;

export const likeTilekSchema = z.object({ clientId: clientIdSchema }).strict();
export const tilekListQuerySchema = z.object({ clientId: clientIdSchema.optional() });
export const hideTilekSchema = z.object({ hidden: z.boolean() }).strict();
export const tilekParamsSchema = z.object({ tilekId: z.string().min(1).max(40) });
export const myTilekParamsSchema = z.object({ id: z.string().min(1).max(40), tilekId: z.string().min(1).max(40) });
