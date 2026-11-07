import { describe, expect, it } from 'vitest';
import { TEMPLATE_CATALOG, TEMPLATE_KEYS, isTemplateKey, resolvePalette } from './templates.js';

const HEX = /^#[0-9A-F]{6}$/;

describe('template catalogue', () => {
  it('has the 8 templates of the brief, each with 3–5 palettes', () => {
    expect(TEMPLATE_KEYS).toEqual(['classic', 'minimal', 'alatoo', 'nazik', 'bala', 'batyr', 'yubiley', 'shyrdak']);
    for (const key of TEMPLATE_KEYS) {
      const { palettes } = TEMPLATE_CATALOG[key];
      expect(palettes.length, key).toBeGreaterThanOrEqual(3);
      expect(palettes.length, key).toBeLessThanOrEqual(5);
    }
  });

  it('uses unique palette ids and strict #RRGGBB colours (they end up in inline CSS)', () => {
    for (const key of TEMPLATE_KEYS) {
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
