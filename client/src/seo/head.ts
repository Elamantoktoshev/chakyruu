import { SITE_LOCALES, localizedPath, type SiteLocale } from '@chakyruu/shared';

export interface SeoImage {
  url: string;
  width: number;
  height: number;
  alt: string;
}

export interface SeoMeta {
  locale: SiteLocale;
  /** Path after the locale ("" for the home page, "templates", …). */
  page: string;
  title: string;
  description: string;
  /** Absolute or site-relative; defaults to the landing preview (1200×630). */
  image?: SeoImage;
  /** Structured data (JSON-LD objects). */
  jsonLd?: readonly object[];
}

const OG_LOCALE: Readonly<Record<SiteLocale, string>> = { ky: 'ky_KG', ru: 'ru_RU' };
const DEFAULT_IMAGE: SeoImage = { url: '/og-landing.png', width: 1200, height: 630, alt: 'Chakyruu.kg' };

/** Every tag this module writes carries it, so the browser can swap them on navigation. */
export const SEO_ATTR = 'data-seo';

const ESCAPES: Readonly<Record<string, string>> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escape = (value: string): string => value.replace(/[&<>"']/g, (char) => ESCAPES[char] ?? char);
/** JSON inside <script>: "<" escaped so text can never close the tag. */
const scriptJson = (value: unknown): string => JSON.stringify(value).replace(/</g, '\\u003c');

const absolute = (siteUrl: string, url: string): string => (url.startsWith('/') ? `${siteUrl}${url}` : url);

/** <title>, description, canonical, hreflang (ky, ru, x-default), Open Graph, Twitter and JSON-LD. */
export function buildHeadTags(meta: SeoMeta, siteUrl: string): string {
  const site = siteUrl.replace(/\/+$/, '');
  const canonical = `${site}${localizedPath(meta.locale, meta.page)}`;
  const image = meta.image ?? DEFAULT_IMAGE;
  const imageUrl = absolute(site, image.url);
  const attr = `${SEO_ATTR}=""`;
  const named = (name: string, content: string) => `<meta ${attr} name="${name}" content="${escape(content)}" />`;
  const property = (name: string, content: string | number) => `<meta ${attr} property="${name}" content="${escape(String(content))}" />`;
  const alternate = (hreflang: string, locale: SiteLocale) =>
    `<link ${attr} rel="alternate" hreflang="${hreflang}" href="${escape(`${site}${localizedPath(locale, meta.page)}`)}" />`;

  return [
    `<title ${attr}>${escape(meta.title)}</title>`,
    named('description', meta.description),
    named('robots', 'index, follow'),
    `<link ${attr} rel="canonical" href="${escape(canonical)}" />`,
    ...SITE_LOCALES.map((locale) => alternate(locale, locale)),
    alternate('x-default', 'ky'),
    property('og:type', 'website'),
    property('og:site_name', 'Chakyruu.kg'),
    property('og:locale', OG_LOCALE[meta.locale]),
    ...SITE_LOCALES.filter((locale) => locale !== meta.locale).map((locale) => property('og:locale:alternate', OG_LOCALE[locale])),
    property('og:url', canonical),
    property('og:title', meta.title),
    property('og:description', meta.description),
    property('og:image', imageUrl),
    property('og:image:width', image.width),
    property('og:image:height', image.height),
    property('og:image:alt', image.alt),
    named('twitter:card', 'summary_large_image'),
    named('twitter:title', meta.title),
    named('twitter:description', meta.description),
    named('twitter:image', imageUrl),
    ...(meta.jsonLd ?? []).map((data) => `<script ${attr} type="application/ld+json">${scriptJson(data)}</script>`),
  ].join('\n    ');
}

/** The default tags of index.html (and earlier pages' tags) that a page's own head replaces. */
export const REPLACED_HEAD_SELECTOR = [
  'title',
  'meta[name="description"]',
  'meta[name="robots"]',
  'meta[property^="og:"]',
  'meta[name^="twitter:"]',
  'link[rel="canonical"]',
  'link[rel="alternate"][hreflang]',
  `script[${SEO_ATTR}]`,
].join(', ');
