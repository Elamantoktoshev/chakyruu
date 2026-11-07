import { describe, expect, it } from 'vitest';
import { buildIcs, escapeIcsText } from './ics.js';

const event = {
  uid: 'cmw123@chakyruu.kg',
  title: 'Айбек & Айзада — Үйлөнүү той',
  description: 'Сиздерди тоюбузга чакырабыз!\nКелиңиздер.',
  location: '«Ала-Тоо» тойканасы, Ош ш.; Ленин көч. 1',
  start: new Date('2027-06-15T17:00:00+06:00'),
  durationMinutes: 240,
  url: 'https://chakyruu.kg/aibek-aizada',
  now: new Date('2026-11-07T00:00:00Z'),
};

describe('escapeIcsText', () => {
  it('escapes backslashes, commas, semicolons and newlines (RFC 5545)', () => {
    expect(escapeIcsText('a\\b, c; d\ne')).toBe('a\\\\b\\, c\; d\\ne');
  });
});

describe('buildIcs', () => {
  const ics = buildIcs(event);
  const lines = ics.split('\r\n');

  it('is a VCALENDAR with one VEVENT and CRLF line endings', () => {
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/\n/);
  });

  it('stores the start in UTC so every calendar shows Bishkek 17:00 correctly', () => {
    expect(lines).toContain('DTSTART:20270615T110000Z');
    expect(lines).toContain('DTEND:20270615T150000Z');
    expect(lines).toContain('DTSTAMP:20261107T000000Z');
  });

  it('escapes user text so names cannot break the file', () => {
    const unfolded = ics.replace(/\r\n /g, '');
    expect(unfolded).toContain('LOCATION:«Ала-Тоо» тойканасы\\, Ош ш.\; Ленин көч. 1');
    expect(unfolded).toContain('DESCRIPTION:Сиздерди тоюбузга чакырабыз!\\nКелиңиздер.');
    // An injected line break is escaped to "\n", so it stays inside SUMMARY and no new component starts.
    const injected = buildIcs({ ...event, title: 'X\r\nEND:VEVENT\r\nBEGIN:VEVENT' }).replace(/\r\n /g, '').split('\r\n');
    expect(injected.filter((line) => line === 'BEGIN:VEVENT')).toHaveLength(1);
    expect(injected.find((line) => line.startsWith('SUMMARY:'))).toBe('SUMMARY:X\\nEND:VEVENT\\nBEGIN:VEVENT');
  });

  it('folds lines longer than 75 bytes', () => {
    const long = buildIcs({ ...event, description: 'Той '.repeat(60) });
    for (const line of long.split('\r\n')) expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75);
  });
});
