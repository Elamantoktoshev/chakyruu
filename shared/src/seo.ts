/** Languages that have their own public URLs: /ky/… and /ru/… */
export const SITE_LOCALES = ['ky', 'ru'] as const;
export type SiteLocale = (typeof SITE_LOCALES)[number];
export const DEFAULT_SITE_LOCALE: SiteLocale = 'ky';

/**
 * Public, indexable pages, as paths after the locale ("" is the home page: /ky/).
 * Everything else (cabinet, builder, pay, admin, invitations) is private and noindex.
 */
export const PUBLIC_PAGES = ['', 'templates', 'tamadalar', 'oferta', 'privacy', 'contacts'] as const;
export type PublicPage = (typeof PUBLIC_PAGES)[number];

/** "/ky/" for the home page, "/ru/templates" for the others. */
export function localizedPath(locale: SiteLocale, page: string): string {
  const clean = page.replace(/^\/+|\/+$/g, '');
  return clean ? `/${locale}/${clean}` : `/${locale}/`;
}

/** "/ru/templates" → { locale: 'ru', page: 'templates' }; non-public paths → null. */
export function matchPublicPage(pathname: string): { locale: SiteLocale; page: PublicPage } | null {
  const match = /^\/(ky|ru)(?:\/([^/]*))?\/?$/.exec(pathname);
  if (!match) return null;
  const page = (match[2] ?? '') as PublicPage;
  return (PUBLIC_PAGES as readonly string[]).includes(page) ? { locale: match[1] as SiteLocale, page } : null;
}

/** Locale of a /ky/… or /ru/… path, or null for unprefixed app pages. */
export function localeOfPath(pathname: string): SiteLocale | null {
  const match = /^\/(ky|ru)(?:\/|$)/.exec(pathname);
  return match ? (match[1] as SiteLocale) : null;
}

/** Old unprefixed public URLs → their Kyrgyz page (301), so shared links and search results keep working. */
export function legacyPublicRedirect(pathname: string): string | null {
  const page = pathname.replace(/^\/+|\/+$/g, '');
  if (page !== '' && !(PUBLIC_PAGES as readonly string[]).includes(page)) return null;
  return localizedPath(DEFAULT_SITE_LOCALE, page);
}
