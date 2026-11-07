import type { Palette } from '@chakyruu/shared';
import type { CSSProperties } from 'react';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const WHITE = '#ffffff';
const BLACK = '#000000';

function toRgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

/** Linear mix of two #RRGGBB colours; `amount` is the share of `b` (0…1). */
export function mixHex(a: string, b: string, amount: number): string {
  if (!HEX_COLOR.test(a) || !HEX_COLOR.test(b)) throw new Error(`Not a #RRGGBB colour: ${a} / ${b}`);
  const share = Math.min(1, Math.max(0, amount));
  const [ra, ga, ba] = toRgb(a);
  const [rb, gb, bb] = toRgb(b);
  const channel = (x: number, y: number) => Math.round(x + (y - x) * share).toString(16).padStart(2, '0');
  return `#${channel(ra, rb)}${channel(ga, gb)}${channel(ba, bb)}`;
}

/**
 * Template palette → the theme CSS variables. Tailwind v4 utilities read `var(--color-*)`,
 * so setting them on the invitation root re-themes every `bg-burgundy`, `text-gold`, `bg-surface`, …
 * Palettes come from the shared catalogue (strict hex, tested), never from user input.
 */
export function paletteStyle(palette: Palette): CSSProperties {
  return {
    '--color-burgundy': palette.primary,
    '--color-burgundy-dark': mixHex(palette.primary, BLACK, 0.2),
    '--color-gold': palette.accent,
    '--color-gold-light': mixHex(palette.accent, WHITE, 0.35),
    '--color-cream': palette.background,
    '--color-cream-dark': mixHex(palette.background, palette.ink, 0.07),
    '--color-ink': palette.ink,
    // Cards: white on light templates, a lifted shade of the background on dark ones.
    '--color-surface': palette.isDark ? mixHex(palette.background, WHITE, 0.08) : WHITE,
    colorScheme: palette.isDark ? 'dark' : 'light',
  } as CSSProperties;
}
