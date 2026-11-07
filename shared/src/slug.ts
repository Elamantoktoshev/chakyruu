/** Public invitation URL slug: lowercase latin, digits, single dashes. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MIN_LENGTH = 3;
export const SLUG_MAX_LENGTH = 60;
const FALLBACK_SLUG = 'toi';

/** First path segments used by the app itself — an invitation must never shadow them. */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  'about',
  'admin',
  'api',
  'assets',
  'contacts',
  'create',
  'dashboard',
  'draft',
  'help',
  'login',
  'logout',
  'music',
  'oferta',
  'partner',
  'partners',
  'pay',
  'privacy',
  'settings',
  'static',
  'tamadalar',
  'terms',
  'uploads',
]);

/** Russian + Kyrgyz (and common Kazakh) Cyrillic → readable latin. */
const TRANSLIT: Readonly<Record<string, string>> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'i',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'iu', я: 'ia',
  ң: 'ng', ө: 'o', ү: 'u',
  ұ: 'u', ә: 'a', ғ: 'g', қ: 'k', һ: 'h', і: 'i',
};

function transliterate(text: string): string {
  return Array.from(text.toLowerCase(), (char) => TRANSLIT[char] ?? char).join('');
}

/** "Айбек & Айзада" → "aibek-aizada". May return "" if nothing usable remains. */
export function slugify(text: string): string {
  return transliterate(text)
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/^-+|-+$/g, '');
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug);
}

/** A valid, non-reserved base slug for the given host names (the server adds -2, -3… on conflict). */
export function baseSlugFor(hostNames: string): string {
  const slug = slugify(hostNames);
  if (slug.length < SLUG_MIN_LENGTH) return FALLBACK_SLUG;
  return isReservedSlug(slug) ? `${slug}-${FALLBACK_SLUG}` : slug;
}

/** attempt 1 → "base", attempt 2 → "base-2", … */
export function slugWithSuffix(base: string, attempt: number): string {
  return attempt <= 1 ? base : `${base}-${attempt}`;
}
