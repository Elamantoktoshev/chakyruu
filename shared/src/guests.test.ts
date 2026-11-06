import { describe, expect, it } from 'vitest';
import { MAX_GUESTS_PER_PASTE, guestGreeting, guestLink, inviteMessage, parseGuestList, rsvpSchema, whatsappUrl } from './guests.js';

describe('parseGuestList', () => {
  it('turns one name per line into guests, trimming and skipping blank lines', () => {
    expect(parseGuestList('  Асан байке \n\n  Айгүл эже\r\nНурлан   Асанов ')).toEqual([
      { name: 'Асан байке', phone: null },
      { name: 'Айгүл эже', phone: null },
      { name: 'Нурлан Асанов', phone: null },
    ]);
  });

  it('picks up a +996 phone written at the end of a line', () => {
    expect(parseGuestList('Асан байке +996700123456\nАйгүл, +996555000111')).toEqual([
      { name: 'Асан байке', phone: '+996700123456' },
      { name: 'Айгүл', phone: '+996555000111' },
    ]);
  });

  it('leaves non-+996 numbers as part of the name rather than guessing', () => {
    expect(parseGuestList('Асан 0700123456')).toEqual([{ name: 'Асан 0700123456', phone: null }]);
  });

  it('drops case-insensitive duplicates within one paste', () => {
    expect(parseGuestList('Асан байке\nасан БАЙКЕ\nАйгүл').map((g) => g.name)).toEqual(['Асан байке', 'Айгүл']);
  });

  it('strips list markers and caps very long names', () => {
    const [guest] = parseGuestList(`1. ${'А'.repeat(200)}`);
    expect(guest?.name).toHaveLength(100);
    expect(parseGuestList('- Асан\n• Айгүл\n2) Нурлан').map((g) => g.name)).toEqual(['Асан', 'Айгүл', 'Нурлан']);
  });

  it(`accepts at most ${MAX_GUESTS_PER_PASTE} guests at once`, () => {
    const text = Array.from({ length: MAX_GUESTS_PER_PASTE + 5 }, (_, i) => `Конок ${i}`).join('\n');
    expect(parseGuestList(text)).toHaveLength(MAX_GUESTS_PER_PASTE);
  });
});

describe('guestGreeting', () => {
  it('uses "Урматтуу" in Kyrgyz with the name as written', () => {
    expect(guestGreeting('Асан байке', 'KY')).toBe('Урматтуу Асан байке!');
  });

  it('picks the Russian gender from Kyrgyz honorifics and drops the honorific', () => {
    expect(guestGreeting('Асан байке', 'RU')).toBe('Уважаемый Асан!');
    expect(guestGreeting('Бакыт агай', 'RU')).toBe('Уважаемый Бакыт!');
    expect(guestGreeting('Айгүл эже', 'RU')).toBe('Уважаемая Айгүл!');
    expect(guestGreeting('Гүлнара апа', 'RU')).toBe('Уважаемая Гүлнара!');
  });

  it('uses the plural for couples and families', () => {
    expect(guestGreeting('Асан жана Айгүл', 'RU')).toBe('Уважаемые Асан жана Айгүл!');
    expect(guestGreeting('Асановдор үй-бүлөсү', 'KY')).toBe('Урматтуу Асановдор үй-бүлөсү!');
    expect(guestGreeting('Семья Асановых', 'RU')).toBe('Уважаемые Семья Асановых!');
  });

  it('falls back to a neutral Russian form when the gender is unknown', () => {
    expect(guestGreeting('Нурлан', 'RU')).toBe('Уважаемый(-ая) Нурлан!');
  });
});

describe('guestLink', () => {
  it('builds the personal link with the token as ?g=', () => {
    expect(guestLink('https://chakyruu.kg', 'aibek-aizada', 'tok_123')).toBe('https://chakyruu.kg/aibek-aizada?g=tok_123');
    expect(guestLink('https://chakyruu.kg/', 'aibek-aizada', null)).toBe('https://chakyruu.kg/aibek-aizada');
  });
});

describe('inviteMessage and whatsappUrl', () => {
  const url = 'https://chakyruu.kg/aibek-aizada?g=tok';

  it('writes a ready-to-send message in the invitation language', () => {
    expect(inviteMessage({ lang: 'KY', guestName: 'Асан байке', hostNames: 'Айбек & Айзада', url })).toBe(
      `Урматтуу Асан байке!\nСизди тоюбузга чакырабыз. Чакыруу: ${url}\n— Айбек & Айзада`,
    );
    expect(inviteMessage({ lang: 'RU', guestName: null, hostNames: 'Айбек & Айзада', url })).toBe(
      `Здравствуйте!\nПриглашаем вас на наш той. Приглашение: ${url}\n— Айбек & Айзада`,
    );
  });

  it('opens a chat with the guest when the phone is known, otherwise the contact picker', () => {
    expect(whatsappUrl('+996700123456', 'Салам!')).toBe('https://wa.me/996700123456?text=%D0%A1%D0%B0%D0%BB%D0%B0%D0%BC!');
    expect(whatsappUrl(null, 'a b')).toBe('https://wa.me/?text=a%20b');
  });
});

describe('rsvpSchema', () => {
  it('accepts a personal-link answer and a shared-link answer with a name', () => {
    expect(rsvpSchema.parse({ token: 'abcdefghijklmnopqrstuv', attending: true, guestsCount: 3 })).toMatchObject({ guestsCount: 3 });
    expect(rsvpSchema.parse({ name: ' Асель ', attending: true })).toMatchObject({ name: 'Асель', guestsCount: 1 });
  });

  it('forces 0 people when the guest declines', () => {
    expect(rsvpSchema.parse({ name: 'Асель', attending: false, guestsCount: 4 }).guestsCount).toBe(0);
  });

  it('requires a token or a name and rejects bad values', () => {
    expect(rsvpSchema.safeParse({ attending: true }).success).toBe(false);
    expect(rsvpSchema.safeParse({ name: 'Асель', attending: 'yes' }).success).toBe(false);
    expect(rsvpSchema.safeParse({ name: 'Асель', attending: true, guestsCount: 21 }).success).toBe(false);
    expect(rsvpSchema.safeParse({ token: '../../etc', attending: true }).success).toBe(false);
  });
});
