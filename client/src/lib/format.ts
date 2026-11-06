import type { Language } from '../api/types';

/** Events are held in Kyrgyzstan, so always show local Bishkek time regardless of the viewer's timezone. */
const EVENT_TIME_ZONE = 'Asia/Bishkek';

/**
 * Month / weekday names are spelled out explicitly: browsers (notably Chrome) ship a trimmed ICU
 * without Kyrgyz data and silently fall back to Russian for `ky-KG`.
 */
const MONTHS: Record<Language, readonly string[]> = {
  KY: ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'],
  RU: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
};

/** Index 0 = Sunday, matching `Date#getDay`. */
const WEEKDAYS: Record<Language, readonly string[]> = {
  KY: ['жекшемби', 'дүйшөмбү', 'шейшемби', 'шаршемби', 'бейшемби', 'жума', 'ишемби'],
  RU: ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'],
};

const WEEKDAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface DateParts {
  day: number;
  month: number;
  year: number;
  weekday: number;
}

/** Calendar parts of the instant as seen in Bishkek, independent of the browser's locale data. */
function getEventDateParts(iso: string): DateParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    weekday: 'short',
    timeZone: EVENT_TIME_ZONE,
  }).formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return {
    day: Number(get('day')),
    month: Number(get('month')) - 1,
    year: Number(get('year')),
    weekday: WEEKDAY_KEYS.indexOf(get('weekday')),
  };
}

export interface FormattedEventDate {
  date: string;
  weekday: string;
}

/** KY: «15-июнь, 2027-ж.» / RU: «15 июня 2027 г.», plus the weekday name. */
export function formatEventDate(iso: string, lang: Language): FormattedEventDate {
  const { day, month, year, weekday } = getEventDateParts(iso);
  const monthName = MONTHS[lang][month];
  const date = lang === 'KY' ? `${day}-${monthName}, ${year}-ж.` : `${day} ${monthName} ${year} г.`;
  return { date, weekday: WEEKDAYS[lang][weekday] ?? '' };
}

export function formatEventTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: EVENT_TIME_ZONE,
  }).format(new Date(iso));
}

export function formatDateTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: EVENT_TIME_ZONE,
  }).format(new Date(iso));
}

/** Same-site absolute path ("/uploads/x.png"), but not protocol-relative "//host" or "/\host". */
const SAME_SITE_PATH = /^\/(?![/\\])/;

/**
 * Returns the URL only if it uses http(s) or is a same-site path (uploaded photos);
 * blocks `javascript:` / `data:` injection in href/src.
 */
export function safeUrl(url: string | null): string | undefined {
  if (!url) return undefined;
  if (SAME_SITE_PATH.test(url)) return url;
  try {
    const { protocol } = new URL(url);
    return protocol === 'https:' || protocol === 'http:' ? url : undefined;
  } catch {
    return undefined;
  }
}
