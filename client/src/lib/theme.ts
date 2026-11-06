import type { CSSProperties } from 'react';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

interface Palette {
  primary?: string;
  accent?: string;
  background?: string;
}

function readPalette(config: unknown): Palette {
  if (typeof config !== 'object' || config === null) return {};
  const palette = (config as { palette?: unknown }).palette;
  return typeof palette === 'object' && palette !== null ? (palette as Palette) : {};
}

const safeColor = (value: unknown): string | undefined =>
  typeof value === 'string' && HEX_COLOR.test(value) ? value : undefined;

/**
 * Template colours as CSS variables. Tailwind v4 utilities read `var(--color-*)`, so
 * setting them on a subtree re-themes every `bg-burgundy`, `text-gold`, … inside it.
 * Only strict #RRGGBB values are accepted, so DB content cannot inject CSS.
 */
export function templateThemeStyle(config: unknown): CSSProperties {
  const palette = readPalette(config);
  const primary = safeColor(palette.primary);
  const accent = safeColor(palette.accent);
  const background = safeColor(palette.background);
  return {
    ...(primary && { '--color-burgundy': primary, '--color-burgundy-dark': primary }),
    ...(accent && { '--color-gold': accent, '--color-gold-light': accent }),
    ...(background && { '--color-cream': background }),
  } as CSSProperties;
}
