import { describe, expect, it } from 'vitest';
import { isReservedSlug, legacyPublicRedirect, localeOfPath, localizedPath, matchPublicPage } from './index.js';

describe('public page URLs', () => {
  it('builds localized paths with a trailing slash only for the home page', () => {
    expect(localizedPath('ky', '')).toBe('/ky/');
    expect(localizedPath('ru', '/templates')).toBe('/ru/templates');
  });

  it('matches only the listed public pages', () => {
    expect(matchPublicPage('/ky/')).toEqual({ locale: 'ky', page: '' });
    expect(matchPublicPage('/ky')).toEqual({ locale: 'ky', page: '' });
    expect(matchPublicPage('/ru/templates')).toEqual({ locale: 'ru', page: 'templates' });
    expect(matchPublicPage('/ru/templates/')).toEqual({ locale: 'ru', page: 'templates' });
    expect(matchPublicPage('/ru/dashboard')).toBeNull();
    expect(matchPublicPage('/templates')).toBeNull();
    expect(matchPublicPage('/en/')).toBeNull();
  });

  it('knows the locale of prefixed paths only', () => {
    expect(localeOfPath('/ru/tamadalar')).toBe('ru');
    expect(localeOfPath('/ky')).toBe('ky');
    expect(localeOfPath('/kyz-uzatuu')).toBeNull();
    expect(localeOfPath('/dashboard')).toBeNull();
  });

  it('sends old URLs to the Kyrgyz pages', () => {
    expect(legacyPublicRedirect('/')).toBe('/ky/');
    expect(legacyPublicRedirect('/templates')).toBe('/ky/templates');
    expect(legacyPublicRedirect('/templates/')).toBe('/ky/templates');
    expect(legacyPublicRedirect('/oferta')).toBe('/ky/oferta');
    expect(legacyPublicRedirect('/dashboard')).toBeNull();
    expect(legacyPublicRedirect('/aibek-aizada')).toBeNull();
  });

  it('keeps invitation slugs away from locale prefixes', () => {
    expect(isReservedSlug('ky')).toBe(true);
    expect(isReservedSlug('ru')).toBe(true);
    expect(isReservedSlug('blog')).toBe(true);
  });
});
