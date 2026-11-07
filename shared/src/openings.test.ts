import { describe, expect, it } from 'vitest';
import { OPENING_ANIMATIONS, effectiveOpening } from './openings.js';

describe('effectiveOpening', () => {
  it('keeps the chosen animation normally', () => {
    for (const opening of OPENING_ANIMATIONS) expect(effectiveOpening(opening, false)).toBe(opening);
  });

  it('switches to NONE when the guest prefers reduced motion', () => {
    expect(effectiveOpening('BOZ_UY', true)).toBe('NONE');
    expect(effectiveOpening('CURTAINS', true)).toBe('NONE');
  });
});
