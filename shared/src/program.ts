export const MAX_PROGRAM_ITEMS = 12;
export const PROGRAM_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
export const PROGRAM_TITLE_MAX = 80;

/** One line of the toi programme: "18:00 — Тосуп алуу". */
export interface ProgramItem {
  time: string;
  title: string;
}

function isProgramItem(value: unknown): value is ProgramItem {
  if (typeof value !== 'object' || value === null) return false;
  const { time, title } = value as Record<string, unknown>;
  return (
    Object.keys(value).length === 2 &&
    typeof time === 'string' &&
    PROGRAM_TIME_PATTERN.test(time) &&
    typeof title === 'string' &&
    title.trim().length > 0 &&
    title.trim().length <= PROGRAM_TITLE_MAX
  );
}

/**
 * Stored JSON from the database → a safe list (anything malformed is dropped, not rendered).
 * Written without zod so the invitation page does not have to download it.
 */
export function readProgram(value: unknown): ProgramItem[] {
  if (!Array.isArray(value) || value.length > MAX_PROGRAM_ITEMS || !value.every(isProgramItem)) return [];
  return value.map(({ time, title }) => ({ time, title: title.trim() })).sort((a, b) => a.time.localeCompare(b.time));
}
