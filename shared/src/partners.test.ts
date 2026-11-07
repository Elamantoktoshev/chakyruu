import { describe, expect, it } from 'vitest';
import {
  catalogQuerySchema,
  createGiftSchema,
  dateOnlySchema,
  hallSchema,
  normalizeCity,
  normalizeGiftCode,
  orgProfileSchema,
  tamadaProfileSchema,
} from './partners.js';

describe('orgProfileSchema', () => {
  it('normalises Instagram handles and URLs to a bare handle', () => {
    expect(orgProfileSchema.parse({ instagram: '@ala_too.toikana' }).instagram).toBe('ala_too.toikana');
    expect(orgProfileSchema.parse({ instagram: 'https://www.instagram.com/nurbek.tamada/' }).instagram).toBe('nurbek.tamada');
    expect(orgProfileSchema.parse({ instagram: '' }).instagram).toBeNull();
    expect(orgProfileSchema.safeParse({ instagram: 'https://evil.example/x' }).success).toBe(false);
  });

  it('requires +996 numbers and https 2GIS links, and rejects unknown fields', () => {
    expect(orgProfileSchema.safeParse({ whatsapp: '0700123456' }).success).toBe(false);
    expect(orgProfileSchema.parse({ whatsapp: '+996700123456' }).whatsapp).toBe('+996700123456');
    expect(orgProfileSchema.safeParse({ mapUrl: 'https://evil.example' }).success).toBe(false);
    expect(orgProfileSchema.safeParse({ invitationCredits: 1000 }).success).toBe(false);
    expect(orgProfileSchema.safeParse({ catalogStatus: 'PUBLISHED' }).success).toBe(false);
  });
});

describe('normalizeCity', () => {
  it('gives one spelling for any casing and spacing', () => {
    expect(normalizeCity(' ОШ ')).toBe('Ош');
    expect(normalizeCity('жалал-абад')).toBe('Жалал-Абад');
    expect(normalizeCity('ысык   көл')).toBe('Ысык Көл');
  });
});

describe('hallSchema', () => {
  it('accepts a named hall with a sane capacity', () => {
    expect(hallSchema.parse({ name: ' Чоң зал ', capacity: 400 })).toEqual({ name: 'Чоң зал', capacity: 400 });
    expect(hallSchema.safeParse({ name: 'Зал', capacity: 0 }).success).toBe(false);
  });
});

describe('tamadaProfileSchema', () => {
  it('accepts only Instagram / YouTube video links', () => {
    expect(
      tamadaProfileSchema.safeParse({ videoUrls: ['https://www.instagram.com/reel/abc', 'https://youtu.be/xyz', 'https://www.youtube.com/watch?v=1'] }).success,
    ).toBe(true);
    for (const url of ['http://youtube.com/x', 'https://tiktok.com/@x', 'javascript:alert(1)', 'https://youtube.com.evil.io/x']) {
      expect(tamadaProfileSchema.safeParse({ videoUrls: [url] }).success, url).toBe(false);
    }
  });

  it('dedupes languages and limits them to KY / RU / UZ', () => {
    expect(tamadaProfileSchema.parse({ languages: ['KY', 'RU', 'KY'] }).languages).toEqual(['KY', 'RU']);
    expect(tamadaProfileSchema.safeParse({ languages: ['EN'] }).success).toBe(false);
  });
});

describe('dates and gift codes', () => {
  it('parses YYYY-MM-DD only', () => {
    expect(dateOnlySchema.parse('2027-06-15')).toBe('2027-06-15');
    for (const value of ['2027-6-15', '15.06.2027', '2027-02-30', '']) {
      expect(dateOnlySchema.safeParse(value).success, value).toBe(false);
    }
  });

  it('normalises codes typed with spaces, dashes or lowercase', () => {
    expect(normalizeGiftCode(' k7mq-3xpa ')).toBe('K7MQ3XPA');
    expect(normalizeGiftCode('K7MQ 3XPA')).toBe('K7MQ3XPA');
  });

  it('validates a gift for a client phone and event date', () => {
    expect(createGiftSchema.parse({ clientPhone: '+996555123456', eventDate: '2027-06-15' })).toEqual({
      clientPhone: '+996555123456',
      eventDate: '2027-06-15',
    });
    expect(createGiftSchema.safeParse({ clientPhone: '0555123456', eventDate: '2027-06-15' }).success).toBe(false);
  });
});

describe('catalogQuerySchema', () => {
  it('coerces numeric price filters from the query string', () => {
    expect(catalogQuerySchema.parse({ city: ' Ош ', lang: 'KY', priceMax: '20000', date: '2027-06-15' })).toEqual({
      city: 'Ош',
      lang: 'KY',
      priceMax: 20000,
      date: '2027-06-15',
    });
    expect(catalogQuerySchema.safeParse({ priceMax: '-1' }).success).toBe(false);
  });
});
