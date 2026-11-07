import { z } from 'zod';

export const MAX_PROGRAM_ITEMS = 12;

/** One line of the toi programme: "18:00 — Тосуп алуу". */
export const programItemSchema = z
  .object({
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:MM'),
    title: z.string().trim().min(1).max(80),
  })
  .strict();

export const programSchema = z.array(programItemSchema).max(MAX_PROGRAM_ITEMS);
export type ProgramItem = z.infer<typeof programItemSchema>;

/** Stored JSON from the database → a safe list (anything malformed is dropped, not rendered). */
export function readProgram(value: unknown): ProgramItem[] {
  const parsed = programSchema.safeParse(value);
  return parsed.success ? [...parsed.data].sort((a, b) => a.time.localeCompare(b.time)) : [];
}
