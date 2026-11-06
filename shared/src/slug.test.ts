import { describe, expect, it } from 'vitest';
import { RESERVED_SLUGS, SLUG_PATTERN, baseSlugFor, isReservedSlug, slugify, slugWithSuffix } from './slug.js';

describe('slugify', () => {
  it('transliterates Russian and Kyrgyz Cyrillic into a kebab-case latin slug', () => {
    expect(slugify('Айбек Айзада')).toBe('aibek-aizada');
    expect(slugify('Айбек & Айзада')).toBe('aibek-aizada');
    expect(slugify('Нурсултан жана Гүлнара')).toBe('nursultan-zhana-gulnara');
    expect(slugify('Өмүр, Ұлан Ңайза')).toBe('omur-ulan-ngaiza');
    expect(slugify('Щукин Юрий Чынгыз')).toBe('shchukin-iurii-chyngyz');
  });

  it('keeps latin letters and digits, lowercases and collapses separators', () => {
    expect(slugify('  Aibek -- Aizada 2027!! ')).toBe('aibek-aizada-2027');
  });

  it('drops soft and hard signs', () => {
    expect(slugify('Ильяс Объединение')).toBe('ilias-obedinenie');
  });

  it('returns an empty string when nothing usable is left', () => {
    expect(slugify('!!! ♥ ???')).toBe('');
  });

  it('caps the length without leaving a trailing dash', () => {
    const slug = slugify('а'.repeat(30) + ' ' + 'б'.repeat(60));
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('reserved slugs', () => {
  it('blocks app routes so an invitation cannot shadow them', () => {
    for (const slug of ['create', 'dashboard', 'login', 'pay', 'api', 'uploads']) {
      expect(isReservedSlug(slug), slug).toBe(true);
      expect(RESERVED_SLUGS.has(slug)).toBe(true);
    }
    expect(isReservedSlug('aibek-aizada')).toBe(false);
  });
});

describe('baseSlugFor', () => {
  it('uses the slugified host names', () => {
    expect(baseSlugFor('Айбек & Айзада')).toBe('aibek-aizada');
  });

  it('falls back to "toi" when the names give nothing usable', () => {
    expect(baseSlugFor('♥')).toBe('toi');
    expect(baseSlugFor('Аа')).toBe('toi');
  });

  it('never returns a reserved route', () => {
    expect(baseSlugFor('Login')).toBe('login-toi');
  });

  it('always passes the public slug format', () => {
    for (const names of ['Айбек Айзада', '♥', 'Create', 'Ө']) {
      expect(baseSlugFor(names)).toMatch(SLUG_PATTERN);
    }
  });
});

describe('slugWithSuffix', () => {
  it('returns the base for the first attempt and appends -2, -3… afterwards', () => {
    expect(slugWithSuffix('aibek-aizada', 1)).toBe('aibek-aizada');
    expect(slugWithSuffix('aibek-aizada', 2)).toBe('aibek-aizada-2');
    expect(slugWithSuffix('aibek-aizada', 7)).toBe('aibek-aizada-7');
  });
});
