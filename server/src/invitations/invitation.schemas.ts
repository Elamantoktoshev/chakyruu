import { guestTokenSchema, slugSchema } from '@chakyruu/shared';
import { z } from 'zod';

export const slugParamsSchema = z.object({ slug: slugSchema });

/** ?g=<token> — malformed tokens are treated as "no token" rather than an error. */
export const publicInvitationQuerySchema = z.object({
  g: z
    .string()
    .optional()
    .transform((value) => (value !== undefined && guestTokenSchema.safeParse(value).success ? value : undefined)),
});
