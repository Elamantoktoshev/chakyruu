import { describe, expect, it } from 'vitest';
import { DRAWN_TEMPLATE_KEYS, TEMPLATE_CATALOG, TEMPLATE_KEYS, isPaletteOf, isTemplateKey, resolvePalette } from './templates.js';

const HEX = /^#[0-9A-F]{6}$/;

describe('template catalogue', () => {
  it('has the 8 code-drawn templates of the brief, each with 3–5 palettes, plus the illustrated one', () => {
    expect(DRAWN_TEMPLATE_KEYS).toEqual(['classic', 'minimal', 'alatoo', 'nazik', 'bala', 'batyr', 'yubiley', 'shyrdak']);
    expect(TEMPLATE_KEYS).toEqual([...DRAWN_TEMPLATE_KEYS, 'illustrated']);
    for (const key of DRAWN_TEMPLATE_KEYS) {
      const { palettes } = TEMPLATE_CATALOG[key];
      expect(palettes.length, key).toBeGreaterThanOrEqual(3);
      expect(palettes.length, key).toBeLessThanOrEqual(5);
    }
  });

  it('uses unique palette ids and strict #RRGGBB colours (they end up in inline CSS)', () => {
    for (const key of DRAWN_TEMPLATE_KEYS) {
      const ids = TEMPLATE_CATALOG[key].palettes.map((palette) => palette.id);
      expect(new Set(ids).size, key).toBe(ids.length);
      for (const palette of TEMPLATE_CATALOG[key].palettes) {
        for (const color of [palette.primary, palette.accent, palette.background, palette.ink]) {
          expect(color, `${key}/${palette.id}`).toMatch(HEX);
        }
      }
    }
  });

  it('marks Shyrdak as universal and gives every other template a toi type', () => {
    expect(TEMPLATE_CATALOG.shyrdak.isUniversal).toBe(true);
    expect(TEMPLATE_CATALOG.classic.eventType).toBe('WEDDING');
    expect(TEMPLATE_CATALOG.yubiley.eventType).toBe('MAARAKE');
  });
});

describe('resolvePalette', () => {
  it('returns the chosen palette of the template', () => {
    expect(resolvePalette('bala', 'pink').id).toBe('pink');
  });

  it('falls back to the first palette for a missing or foreign id', () => {
    expect(resolvePalette('bala', null).id).toBe(TEMPLATE_CATALOG.bala.palettes[0]?.id);
    expect(resolvePalette('bala', 'bordo-gold').id).toBe(TEMPLATE_CATALOG.bala.palettes[0]?.id);
  });

  it('falls back to Classic for an unknown template key', () => {
    expect(isTemplateKey('nope')).toBe(false);
    expect(resolvePalette('nope', null).id).toBe(TEMPLATE_CATALOG.classic.palettes[0]?.id);
  });
});

describe('illustrated templates', () => {
  const manifest = {
    version: 1,
    slug: 'ak-boz-uy',
    palette: { primary: '#123456', accent: '#C9A24B', background: '#FFFFFF', ink: '#111111', card: '#EEEEEE', isDark: false },
    font: 'serif',
    opening: { kind: 'hands' },
  };

  it('takes the palette from the manifest in Template.config', () => {
    expect(resolvePalette('illustrated', null, manifest)).toMatchObject({ id: 'manifest', primary: '#123456', background: '#FFFFFF' });
  });

  it('falls back to Classic when the manifest is missing or broken', () => {
    expect(resolvePalette('illustrated', null, {}).id).toBe(TEMPLATE_CATALOG.classic.palettes[0]?.id);
    expect(resolvePalette('illustrated', null, { ...manifest, palette: { ...manifest.palette, primary: 'red' } }).id).not.toBe('manifest');
  });

  it('has no palette choices, so a palette id from another template is refused', () => {
    expect(isTemplateKey('illustrated')).toBe(true);
    expect(isPaletteOf('illustrated', 'bordo-gold')).toBe(false);
  });
});
