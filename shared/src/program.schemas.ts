import { z } from 'zod';
import { MAX_PROGRAM_ITEMS, PROGRAM_TIME_PATTERN, PROGRAM_TITLE_MAX } from './program.js';

/** One line of the toi programme: "18:00 — Тосуп алуу". */
export const programItemSchema = z
  .object({
    time: z.string().regex(PROGRAM_TIME_PATTERN, 'Time must be HH:MM'),
    title: z.string().trim().min(1).max(PROGRAM_TITLE_MAX),
  })
  .strict();

export const programSchema = z.array(programItemSchema).max(MAX_PROGRAM_ITEMS);
