/** Minimal iCalendar (RFC 5545) for "Календарга кошуу". No library needed for one event. */
export interface IcsEvent {
  uid: string;
  title: string;
  description: string;
  location: string;
  start: Date;
  durationMinutes: number;
  url: string;
  now?: Date;
}

const MAX_LINE_BYTES = 75;

export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/** 20270615T110000Z */
function icsUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Splits a content line into ≤75-byte chunks joined by CRLF + space, never inside a UTF-8 character. */
function foldLine(line: string): string {
  const chunks: string[] = [];
  let current = '';
  for (const char of line) {
    const limit = chunks.length === 0 ? MAX_LINE_BYTES : MAX_LINE_BYTES - 1;
    if (new TextEncoder().encode(current + char).length > limit) {
      chunks.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  chunks.push(current);
  return chunks.join('\r\n ');
}

export function buildIcs(event: IcsEvent): string {
  const end = new Date(event.start.getTime() + event.durationMinutes * 60_000);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Chakyruu.kg//Invitation//KY',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(event.uid)}`,
    `DTSTAMP:${icsUtc(event.now ?? new Date())}`,
    `DTSTART:${icsUtc(event.start)}`,
    `DTEND:${icsUtc(end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    `LOCATION:${escapeIcsText(event.location)}`,
    `URL:${escapeIcsText(event.url)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}
