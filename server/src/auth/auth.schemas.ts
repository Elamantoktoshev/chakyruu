import { phoneSchema } from '@chakyruu/shared';
import { z } from 'zod';

export { PHONE_PATTERN, phoneSchema } from '@chakyruu/shared';

/** A person needs at least this long between opening the form and asking for a code. */
export const MIN_FORM_FILL_MS = 1500;
const DAY_MS = 86_400_000;

/**
 * Phone plus two light anti-bot signals from the login form: `website` is a hidden field
 * people never see (bots fill every input), `elapsedMs` is the time since the form was shown.
 */
export const requestCodeSchema = z.object({
  phone: phoneSchema,
  website: z.string().max(200).optional(),
  elapsedMs: z.number().int().min(0).max(DAY_MS),
});

export const verifyCodeSchema = z.object({
  phone: phoneSchema,
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Code must be 6 digits'),
});

export type RequestCodeInput = z.infer<typeof requestCodeSchema>;
export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>;
