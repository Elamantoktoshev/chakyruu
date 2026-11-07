/** How the invitation opens for the guest. The first tap also starts the music (autoplay rules). */
export const OPENING_ANIMATIONS = ['BOZ_UY', 'ENVELOPE', 'CURTAINS', 'TUNDUK', 'NONE'] as const;
export type OpeningAnimation = (typeof OPENING_ANIMATIONS)[number];

export const DEFAULT_OPENING: OpeningAnimation = 'BOZ_UY';

/** prefers-reduced-motion always wins: such guests get the invitation without animation. */
export function effectiveOpening(chosen: OpeningAnimation, prefersReducedMotion: boolean): OpeningAnimation {
  return prefersReducedMotion ? 'NONE' : chosen;
}
