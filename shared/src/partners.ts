import { z } from 'zod';
import { phoneSchema } from './phone.js';

export const partnerLeadSchema = z
  .object({
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
