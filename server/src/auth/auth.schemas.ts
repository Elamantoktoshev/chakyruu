import { phoneSchema } from '@chakyruu/shared';
import { z } from 'zod';

export { PHONE_PATTERN, phoneSchema } from '@chakyruu/shared';

export const requestCodeSchema = z.object({ phone: phoneSchema });

export const verifyCodeSchema = z.object({
  phone: phoneSchema,
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Code must be 6 digits'),
});

export type RequestCodeInput = z.infer<typeof requestCodeSchema>;
export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>;
