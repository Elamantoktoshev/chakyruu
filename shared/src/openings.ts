import type { IllustratedOpening, OpeningKind } from './manifest.js';

/**
 * How the invitation opens for the guest. The first tap also starts the music (autoplay rules).
 * TEMPLATE = the illustrated template's own layered opening (hands, branches, cloche…).
 */
export const OPENING_ANIMATIONS = ['BOZ_UY', 'ENVELOPE', 'CURTAINS', 'TUNDUK', 'TEMPLATE', 'NONE'] as const;
export type OpeningAnimation = (typeof OPENING_ANIMATIONS)[number];

/** The code-drawn scenes in client/src/openings/scenes.tsx. */
export type SceneOpening = Exclude<OpeningAnimation, 'TEMPLATE' | 'NONE'>;

export const DEFAULT_OPENING: SceneOpening = 'BOZ_UY';


/** prefers-reduced-motion always wins: such guests get the invitation without animation. */
export function effectiveOpening(chosen: OpeningAnimation, prefersReducedMotion: boolean): OpeningAnimation {
  return prefersReducedMotion ? 'NONE' : chosen;
}


export type ResolvedOpening = { kind: 'none' } | { kind: 'scene'; scene: SceneOpening } | { kind: 'layered'; opening: IllustratedOpening };

const SCENE_OF_KIND: Readonly<Partial<Record<OpeningKind, SceneOpening>>> = {
  'boz-uy': 'BOZ_UY',
  envelope: 'ENVELOPE',
  curtains: 'CURTAINS',
  tunduk: 'TUNDUK',
};

/**
 * What the guest actually sees. `templateOpening` is the manifest's opening kind for illustrated
 * templates (null for the code-drawn ones). TEMPLATE on a design without its own opening falls back
 * to the default scene, so switching templates never leaves an invitation without an opening.
 */
export function resolveOpening(chosen: OpeningAnimation, templateOpening: OpeningKind | null, prefersReducedMotion: boolean): ResolvedOpening {
  const effective = effectiveOpening(chosen, prefersReducedMotion);
  if (effective === 'NONE') return { kind: 'none' };
  if (effective !== 'TEMPLATE') return { kind: 'scene', scene: effective };
  if (!templateOpening) return { kind: 'scene', scene: DEFAULT_OPENING };
  const scene = SCENE_OF_KIND[templateOpening];
  return scene ? { kind: 'scene', scene } : { kind: 'layered', opening: templateOpening as IllustratedOpening };
}
