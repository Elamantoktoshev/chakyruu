import { describe, expect, it } from 'vitest';
import { programSchema, readProgram } from './program.js';

describe('programSchema', () => {
  it('accepts HH:MM items and rejects bad times, empty titles and long lists', () => {
    expect(programSchema.safeParse([{ time: '18:00', title: 'Тосуп алуу' }]).success).toBe(true);
    expect(programSchema.safeParse([{ time: '25:00', title: 'x' }]).success).toBe(false);
    expect(programSchema.safeParse([{ time: '18:00', title: ' ' }]).success).toBe(false);
    expect(programSchema.safeParse(Array.from({ length: 13 }, () => ({ time: '18:00', title: 'x' }))).success).toBe(false);
  });
});

describe('readProgram', () => {
  it('sorts by time and ignores malformed stored data', () => {
    expect(readProgram([{ time: '20:00', title: 'Бий' }, { time: '18:00', title: 'Тосуп алуу' }]).map((i) => i.time)).toEqual(['18:00', '20:00']);
    expect(readProgram('oops')).toEqual([]);
    expect(readProgram(null)).toEqual([]);
  });
});
