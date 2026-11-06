/** Toi dates are entered and shown in Bishkek time (UTC+6, no DST). */
export const EVENT_TIME_ZONE = 'Asia/Bishkek';
const BISHKEK_OFFSET = '+06:00';

export interface LocalDateTime {
  /** YYYY-MM-DD for <input type="date"> */
  date: string;
  /** HH:MM for <input type="time"> */
  time: string;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

/** "2027-06-15" + "17:00" → "2027-06-15T17:00:00+06:00"; null while either part is empty/invalid. */
export function toEventIso({ date, time }: LocalDateTime): string | null {
  if (!DATE_PATTERN.test(date) || !TIME_PATTERN.test(time)) return null;
  const iso = `${date}T${time}:00${BISHKEK_OFFSET}`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

/** Inverse of toEventIso, for any ISO timestamp (stored in UTC by the server). */
export function fromEventIso(iso: string | null): LocalDateTime {
  if (!iso || Number.isNaN(Date.parse(iso))) return { date: '', time: '' };
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: EVENT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes): string => parts.find((part) => part.type === type)?.value ?? '';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
}
