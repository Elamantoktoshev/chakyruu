import type { Language } from './catalog.js';

export const GUEST_STATUSES = ['INVITED', 'ATTENDING', 'DECLINED'] as const;
export type GuestStatus = (typeof GUEST_STATUSES)[number];

export const MAX_GUESTS_PER_PASTE = 300;
export const MAX_GUESTS_PER_INVITATION = 1000;
export const GUEST_NAME_MAX = 100;
/** Most people a single RSVP may bring (family). */
export const MAX_PARTY_SIZE = 20;

/** Personal link token (?g=…). */
export const GUEST_TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

export interface ParsedGuest {
  name: string;
  phone: string | null;
}

const LIST_MARKER = /^(?:\d+[.)]|[-•*–—])\s*/;
const TRAILING_PHONE = /[\s,;]*(\+996\d{9})\s*$/;

function parseLine(line: string): ParsedGuest | null {
  const withoutMarker = line.trim().replace(LIST_MARKER, '');
  const phone = withoutMarker.match(TRAILING_PHONE)?.[1] ?? null;
  const name = (phone ? withoutMarker.replace(TRAILING_PHONE, '') : withoutMarker)
    .replace(/\s+/g, ' ')
    .replace(/[\s,;]+$/, '')
    .slice(0, GUEST_NAME_MAX)
    .trim();
  return name ? { name, phone } : null;
}

/** "Асан байке +996700123456\nАйгүл эже" → guests. One per line, duplicates dropped, capped. */
export function parseGuestList(text: string): ParsedGuest[] {
  const seen = new Set<string>();
  const guests: ParsedGuest[] = [];
  for (const line of text.split(/\r?\n/)) {
    const guest = parseLine(line);
    const key = guest?.name.toLocaleLowerCase('ru');
    if (!guest || !key || seen.has(key)) continue;
    seen.add(key);
    guests.push(guest);
    if (guests.length >= MAX_GUESTS_PER_PASTE) break;
  }
  return guests;
}

const MALE_HONORIFICS = new Set(['байке', 'ага', 'агай', 'аке', 'ата']);
const FEMALE_HONORIFICS = new Set(['эже', 'эжеке', 'апа', 'апаке', 'жеңе']);
const PLURAL_MARKERS = /\s(?:жана|и)\s|&|үй-бүлө|семья/i;

function russianGreeting(name: string): string {
  if (PLURAL_MARKERS.test(name)) return `Уважаемые ${name}!`;
  const words = name.split(' ');
  const last = words.at(-1)?.toLocaleLowerCase('ru') ?? '';
  const base = words.slice(0, -1).join(' ');
  if (base && MALE_HONORIFICS.has(last)) return `Уважаемый ${base}!`;
  if (base && FEMALE_HONORIFICS.has(last)) return `Уважаемая ${base}!`;
  return `Уважаемый(-ая) ${name}!`;
}

/**
 * Personal salutation for a guest link. Kyrgyz keeps the name as the host wrote it
 * ("Урматтуу Асан байке!"); Russian derives the gender from Kyrgyz honorifics.
 */
export function guestGreeting(name: string, lang: Language): string {
  return lang === 'KY' ? `Урматтуу ${name}!` : russianGreeting(name);
}

export function guestLink(origin: string, slug: string, token: string | null): string {
  const base = `${origin.replace(/\/+$/, '')}/${slug}`;
  return token ? `${base}?g=${encodeURIComponent(token)}` : base;
}

interface InviteMessageInput {
  lang: Language;
  guestName: string | null;
  hostNames: string;
  url: string;
}

/** Ready-to-send text for WhatsApp / copy, in the invitation's language. */
export function inviteMessage({ lang, guestName, hostNames, url }: InviteMessageInput): string {
  const greeting = guestName ? guestGreeting(guestName, lang) : lang === 'KY' ? 'Саламатсызбы!' : 'Здравствуйте!';
  const body = lang === 'KY' ? `Сизди тоюбузга чакырабыз. Чакыруу: ${url}` : `Приглашаем вас на наш той. Приглашение: ${url}`;
  const signature = hostNames.trim() ? `\n— ${hostNames.trim()}` : '';
  return `${greeting}\n${body}${signature}`;
}

/** wa.me deep link: straight to the guest's chat when the phone is known, otherwise WhatsApp asks whom to send to. */
export function whatsappUrl(phone: string | null, text: string): string {
  const digits = phone ? phone.replace(/\D/g, '') : '';
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

