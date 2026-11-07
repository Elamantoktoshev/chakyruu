import { TEMPLATE_CATALOG } from '@chakyruu/shared';
import { describe, expect, it } from 'vitest';
import { mixHex, paletteStyle } from './theme';

describe('mixHex', () => {
  it('mixes two colours linearly', () => {
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mixHex('#7A1F2B', '#000000', 0)).toBe('#7a1f2b');
    expect(mixHex('#7A1F2B', '#000000', 1)).toBe('#000000');
  });

  it('refuses anything that is not #RRGGBB (the result goes into inline CSS)', () => {
    expect(() => mixHex('red', '#000000', 0.5)).toThrow();
  });
});

describe('paletteStyle', () => {
  it('maps a palette to the theme variables', () => {
    const [classic] = TEMPLATE_CATALOG.classic.palettes;
    expect(paletteStyle(classic!)).toMatchObject({
      '--color-burgundy': '#7A1F2B',
      '--color-gold': '#C9A24B',
      '--color-cream': '#FBF5EA',
      '--color-surface': '#ffffff',
      colorScheme: 'light',
    });
  });

  it('gives dark templates a dark card surface so light text stays readable', () => {
    const [dark] = TEMPLATE_CATALOG.yubiley.palettes;
    const style = paletteStyle(dark!) as Record<string, string>;
    expect(style['--color-surface']).not.toBe('#ffffff');
    expect(style.colorScheme).toBe('dark');
  });
});
