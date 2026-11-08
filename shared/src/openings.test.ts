import { describe, expect, it } from 'vitest';
import { OPENING_ANIMATIONS, effectiveOpening, resolveOpening } from './openings.js';

describe('effectiveOpening', () => {
  it('keeps the chosen animation normally', () => {
    for (const opening of OPENING_ANIMATIONS) expect(effectiveOpening(opening, false)).toBe(opening);
  });

  it('switches to NONE when the guest prefers reduced motion', () => {
    expect(effectiveOpening('BOZ_UY', true)).toBe('NONE');
    expect(effectiveOpening('CURTAINS', true)).toBe('NONE');
  });
});

describe('resolveOpening', () => {
  it('plays the chosen code-drawn scene', () => {
    expect(resolveOpening('ENVELOPE', null, false)).toEqual({ kind: 'scene', scene: 'ENVELOPE' });
  });

  it("plays the template's own layered opening for TEMPLATE", () => {
    expect(resolveOpening('TEMPLATE', 'hands', false)).toEqual({ kind: 'layered', opening: 'hands' });
  });

  it('maps a template that uses a built-in scene to that scene', () => {
    expect(resolveOpening('TEMPLATE', 'curtains', false)).toEqual({ kind: 'scene', scene: 'CURTAINS' });
  });

  it('falls back to the default scene when TEMPLATE meets a design without its own opening', () => {
    expect(resolveOpening('TEMPLATE', null, false)).toEqual({ kind: 'scene', scene: 'BOZ_UY' });
  });

  it('shows nothing for NONE or when the guest prefers reduced motion', () => {
    expect(resolveOpening('NONE', 'hands', false)).toEqual({ kind: 'none' });
    expect(resolveOpening('TEMPLATE', 'hands', true)).toEqual({ kind: 'none' });
  });
});
