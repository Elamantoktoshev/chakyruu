import type { SceneOpening } from '@chakyruu/shared';
import type { ReactElement } from 'react';
import { BozUy } from '../components/art/BozUy';
import { Tunduk } from '../components/art/Tunduk';
import './openings.css';

export interface SceneProps {
  /** Guest name (personal link) or the hosts' names. */
  doorLabel: string;
  /** Initials on the wax seal. */
  initials: string;
}

function BozUyScene({ doorLabel }: SceneProps) {
  return (
    <div className="absolute inset-0 bg-cream">
      <div className="bozuy-camera absolute inset-0">
        {/* Sky: solid layers (no transparency) so nothing behind the scene shows through. */}
        <div className="absolute inset-0 bg-gradient-to-b from-gold-light via-cream to-cream" />
        <svg viewBox="0 0 400 120" preserveAspectRatio="none" className="absolute inset-x-0 bottom-[38%] h-40 w-full" aria-hidden="true">
          <path d="M0 120 L0 70 L60 30 L110 60 L170 10 L230 55 L290 25 L350 60 L400 40 L400 120 Z" fill="var(--color-burgundy)" opacity="0.12" />
          <path d="M0 120 L0 90 L80 60 L150 85 L220 55 L300 88 L360 70 L400 85 L400 120 Z" fill="var(--color-burgundy)" opacity="0.18" />
        </svg>
        <div className="absolute inset-x-0 bottom-0 h-[38%] bg-cream-dark" />
        <div className="absolute inset-0 flex items-center justify-center">
          <BozUy className="w-[min(94%,30rem)]" doorLabel={doorLabel} />
        </div>
      </div>
    </div>
  );
}

function EnvelopeScene({ doorLabel, initials }: SceneProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-cream-dark">
      <div className="relative h-56 w-80 max-w-[86%]">
        <div className="absolute inset-0 rounded-lg bg-burgundy-dark shadow-2xl" />
        <div className="envelope-card absolute inset-x-4 top-4 bottom-2 rounded-md bg-cream p-4 text-center shadow">
          <p className="text-[10px] uppercase tracking-[0.3em] text-gold">Chakyruu</p>
          <p className="mt-3 font-serif text-xl text-burgundy">{doorLabel}</p>
        </div>
        {/* front pocket */}
        <div className="absolute inset-x-0 bottom-0 h-3/5 rounded-b-lg bg-burgundy [clip-path:polygon(0_0,50%_45%,100%_0,100%_100%,0_100%)]" />
        <div className="envelope-flap absolute inset-x-0 top-0 h-3/5 bg-burgundy [clip-path:polygon(0_0,100%_0,50%_100%)]" />
        <div className="envelope-seal absolute left-1/2 top-[52%] flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gold font-serif text-xl font-bold text-burgundy-dark shadow-lg ring-4 ring-gold/40">
          {initials}
        </div>
      </div>
    </div>
  );
}

function CurtainsScene({ doorLabel }: SceneProps) {
  const velvet =
    'repeating-linear-gradient(90deg, rgb(0 0 0 / 0.28) 0 6%, rgb(255 255 255 / 0.06) 9% 12%, rgb(0 0 0 / 0.2) 15%)';
  return (
    <div className="absolute inset-0 overflow-hidden bg-cream">
      <p className="absolute inset-x-0 top-1/3 px-8 text-center font-serif text-3xl text-burgundy">{doorLabel}</p>
      <div className="curtain curtain-left absolute inset-y-0 left-0 w-1/2 bg-burgundy" style={{ backgroundImage: velvet }} />
      <div className="curtain curtain-right absolute inset-y-0 right-0 w-1/2 bg-burgundy" style={{ backgroundImage: velvet }} />
      <div className="curtain-valance absolute inset-x-0 top-0 h-16 bg-burgundy-dark shadow-lg">
        <div className="absolute inset-x-0 bottom-0 h-2 bg-gold" />
      </div>
    </div>
  );
}

function TundukScene() {
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-graphite">
      <div className="tunduk-light absolute h-24 w-24 rounded-full bg-[radial-gradient(circle,var(--color-cream)_0%,transparent_70%)]" />
      <Tunduk className="tunduk-crown relative h-64 w-64" />
    </div>
  );
}

export const SCENES: Readonly<Record<SceneOpening, (props: SceneProps) => ReactElement>> = {
  BOZ_UY: BozUyScene,
  ENVELOPE: EnvelopeScene,
  CURTAINS: CurtainsScene,
  TUNDUK: TundukScene,
};

/** Total length per scene until the invitation is shown (1.5–2.5 s as agreed). */
export const SCENE_DURATION_MS: Readonly<Record<SceneOpening, number>> = {
  BOZ_UY: 2200,
  ENVELOPE: 2100,
  CURTAINS: 1700,
  TUNDUK: 2000,
};
