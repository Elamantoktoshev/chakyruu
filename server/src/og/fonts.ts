import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export interface OgFont {
  name: string;
  data: Buffer;
  weight: 500 | 600 | 700;
  style: 'normal';
}

/**
 * The same fonts as the site (satori reads woff, not woff2). satori uses only the first font
 * registered under a name, so every subset gets its own name and the styles list them in order
 * (see SERIF_STACK / SANS_STACK). Kyrgyz ң ө ү come from Playfair 2: Playfair Display lacks them.
 */
type FontFile = Omit<OgFont, 'data' | 'style'> & { file: string };

const FONT_FILES: readonly FontFile[] = [
  { name: 'Serif Latin', weight: 700, file: '@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff' },
  { name: 'Serif Cyrillic', weight: 700, file: '@fontsource/playfair-display/files/playfair-display-cyrillic-700-normal.woff' },
  { name: 'Serif Kyrgyz', weight: 700, file: '@fontsource/playfair/files/playfair-cyrillic-ext-700-normal.woff' },
  { name: 'Sans Latin', weight: 500, file: '@fontsource/inter/files/inter-latin-500-normal.woff' },
  { name: 'Sans Cyrillic', weight: 500, file: '@fontsource/inter/files/inter-cyrillic-500-normal.woff' },
  { name: 'Sans Kyrgyz', weight: 500, file: '@fontsource/inter/files/inter-cyrillic-ext-500-normal.woff' },
  { name: 'Sans Latin', weight: 600, file: '@fontsource/inter/files/inter-latin-600-normal.woff' },
  { name: 'Sans Cyrillic', weight: 600, file: '@fontsource/inter/files/inter-cyrillic-600-normal.woff' },
  { name: 'Sans Kyrgyz', weight: 600, file: '@fontsource/inter/files/inter-cyrillic-ext-600-normal.woff' },
];

/** Playfair Display with the Kyrgyz letters from Playfair 2. */
export const SERIF_STACK = 'Serif Latin, Serif Cyrillic, Serif Kyrgyz';
/** Inter. */
export const SANS_STACK = 'Sans Latin, Sans Cyrillic, Sans Kyrgyz';

let loading: Promise<OgFont[]> | null = null;

/** Read once per process. */
export function loadOgFonts(): Promise<OgFont[]> {
  loading ??= Promise.all(
    FONT_FILES.map(async ({ file, ...font }) => ({ ...font, style: 'normal' as const, data: await readFile(require.resolve(file)) })),
  ).catch((error: unknown) => {
    loading = null;
    throw error;
  });
  return loading;
}
