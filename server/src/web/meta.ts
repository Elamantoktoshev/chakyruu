import { EVENT_TITLES, type Language } from '@chakyruu/shared';
import { cardContent, type CardRow } from '../og/og.service.js';
import { OG_SIZE } from '../og/render.js';

export interface PageMeta {
  title: string;
  description: string;
  /** Canonical URL (never contains the guest's personal token). */
  url: string;
  image: { url: string; width: number; height: number; alt: string };
  locale: 'ky_KG' | 'ru_RU';
  /** Invitations are private pages: never indexed. */
  isNoindex: boolean;
  /** Hero photo: fetched together with the HTML, it is the page's largest element (LCP). */
  preloadImage: string | null;
}

/** Only our own paths or https URLs are preloaded (the URL is user-influenced data). */
export function safePreloadUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  return /^https:\/\/[^\s"'<>]+$/.test(url) ? url : null;
}

const HTML_ESCAPES: Readonly<Record<string, string>> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Text and attribute values go through this: names come from users. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}

const PERSONAL_TITLE: Readonly<Record<Language, (name: string) => string>> = {
  KY: (name) => `Урматтуу ${name}, сизди тойго чакырабыз!`,
  RU: (name) => `${name}, приглашаем вас на той!`,
};
const CALL_TO_ACTION: Readonly<Record<Language, string>> = {
  KY: 'Чакырууну ачып, жообуңузду бериңиз.',
  RU: 'Откройте приглашение и ответьте.',
};

/** og:title is personal on a guest's link: «Урматтуу Асан байке, сизди тойго чакырабыз!» */
export function invitationMeta(row: CardRow, guestName: string | null, appUrl: string): PageMeta {
  const lang = row.language;
  const content = cardContent(row);
  const general = `${row.hostNames} — ${EVENT_TITLES[lang][row.eventType]}`;
  const details = [content.dateLine, content.venue].filter(Boolean).join(' · ');
  return {
    title: guestName ? PERSONAL_TITLE[lang](guestName) : general,
    description: [details, CALL_TO_ACTION[lang]].filter(Boolean).join(' — '),
    url: `${appUrl}/${row.slug}`,
    image: { url: `${appUrl}/api/og/${row.slug}.png?v=${row.updatedAt.getTime()}`, ...OG_SIZE, alt: general },
    locale: lang === 'KY' ? 'ky_KG' : 'ru_RU',
    isNoindex: true,
    preloadImage: safePreloadUrl(row.photoUrl),
  };
}

export function renderMetaTags(meta: PageMeta): string {
  const property = (name: string, value: string | number) => `<meta property="${name}" content="${escapeHtml(String(value))}" />`;
  const named = (name: string, value: string) => `<meta name="${name}" content="${escapeHtml(value)}" />`;
  return [
    `<title>${escapeHtml(meta.title)}</title>`,
    named('description', meta.description),
    ...(meta.isNoindex ? [named('robots', 'noindex, nofollow')] : []),
    `<link rel="canonical" href="${escapeHtml(meta.url)}" />`,
    ...(meta.preloadImage ? [`<link rel="preload" as="image" href="${escapeHtml(meta.preloadImage)}" fetchpriority="high" />`] : []),
    property('og:type', 'website'),
    property('og:site_name', 'Chakyruu.kg'),
    property('og:locale', meta.locale),
    property('og:title', meta.title),
    property('og:description', meta.description),
    property('og:url', meta.url),
    property('og:image', meta.image.url),
    property('og:image:type', 'image/png'),
    property('og:image:width', meta.image.width),
    property('og:image:height', meta.image.height),
    property('og:image:alt', meta.image.alt),
    named('twitter:card', 'summary_large_image'),
  ].join('\n    ');
}

/** Default page tags in index.html that a page with its own meta replaces. */
const DEFAULT_TAGS = [
  /<title>[\s\S]*?<\/title>\s*/gi,
  /<meta\s+name="description"[^>]*>\s*/gi,
  /<meta\s+property="og:[^"]*"[^>]*>\s*/gi,
  /<meta\s+name="twitter:[^"]*"[^>]*>\s*/gi,
  /<link\s+rel="canonical"[^>]*>\s*/gi,
];

/** Replaces the landing page's default <title>, description and Open Graph tags with the page's own. */
export function injectMeta(html: string, meta: PageMeta): string {
  const withoutDefaults = DEFAULT_TAGS.reduce((result, pattern) => result.replace(pattern, ''), html);
  return withoutDefaults.replace('</head>', `  ${renderMetaTags(meta)}\n  </head>`);
}
