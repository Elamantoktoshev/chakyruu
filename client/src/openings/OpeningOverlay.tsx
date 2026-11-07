import { effectiveOpening, type OpeningAnimation } from '@chakyruu/shared';
import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useI18n } from '../i18n/LanguageContext';

const loadScenes = () => import('./scenes');
const LazyScene = lazy(async () => {
  const { SCENES } = await loadScenes();
  return { default: ({ animation, ...props }: { animation: keyof typeof SCENES; doorLabel: string; initials: string }) => {
    const Scene = SCENES[animation];
    return <Scene {...props} />;
  } };
});

const LEAVE_MS = 450;
/** Landing hero loop: closed → open → invitation visible → closed again. */
const LOOP_CLOSED_MS = 1600;
const LOOP_OPEN_PAUSE_MS = 3200;

type Phase = 'closed' | 'opening' | 'leaving' | 'done';

type Props = {
  animation: OpeningAnimation;
  /** Name on the door / envelope. */
  doorLabel: string;
  /** "live" covers the screen; "preview" covers the phone frame (sticky inside its scroll area). */
  mode: 'live' | 'preview';
  /** Plays by itself in a loop (landing page hero). */
  isLooping?: boolean;
  /** The guest's first tap: the music may start now (browsers block autoplay without a gesture). */
  onEnter?: () => void;
};

/** Joining words between the two names ("Айбек жана Айзада", "Бакыт и Айгүл"). */
const CONJUNCTIONS = new Set(['жана', 'и', 'and']);

export function initialsOf(names: string): string {
  const letters = names
    .split(/[\s&,+]+/u)
    .filter((word) => word && !CONJUNCTIONS.has(word.toLocaleLowerCase('ru')))
    .map((word) => word[0])
    .filter((letter): letter is string => Boolean(letter && /\p{L}/u.test(letter)));
  return letters.slice(0, 2).join(' & ') || '♥';
}

/** Full-screen opening scene above the invitation. NONE / reduced motion render nothing. */
export function OpeningOverlay({ animation, doorLabel, mode, isLooping = false, onEnter }: Props) {
  const { t } = useI18n();
  const prefersReducedMotion = useReducedMotion();
  const effective = effectiveOpening(animation, prefersReducedMotion);
  const [phase, setPhase] = useState<Phase>('closed');
  const [duration, setDuration] = useState(2000);
  const timers = useRef<number[]>([]);

  const schedule = (fn: () => void, ms: number) => {
    timers.current = [...timers.current, window.setTimeout(fn, ms)];
  };
  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };

  useEffect(() => clearTimers, []);
  useEffect(() => {
    void loadScenes().then(({ SCENE_DURATION_MS }) => {
      if (effective !== 'NONE') setDuration(SCENE_DURATION_MS[effective]);
    });
  }, [effective]);

  // A new choice in the builder replays from the start.
  useEffect(() => {
    clearTimers();
    setPhase('closed');
  }, [animation]);

  // Live page: no scrolling under the overlay.
  const isCovering = mode === 'live' && effective !== 'NONE' && phase !== 'done';
  useEffect(() => {
    if (!isCovering) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isCovering]);

  function finish(after: number) {
    schedule(() => setPhase('leaving'), after);
    schedule(() => setPhase('done'), after + LEAVE_MS);
  }

  function enter() {
    if (phase !== 'closed') return;
    onEnter?.();
    setPhase('opening');
    finish(duration);
  }

  function skip() {
    clearTimers();
    onEnter?.();
    setPhase('done');
  }

  useEffect(() => {
    if (!isLooping || effective === 'NONE') return undefined;
    if (phase === 'closed') schedule(() => {
      setPhase('opening');
      finish(duration);
    }, LOOP_CLOSED_MS);
    if (phase === 'done') schedule(() => setPhase('closed'), LOOP_OPEN_PAUSE_MS);
    return undefined;
  }, [isLooping, phase, effective, duration]); // eslint-disable-line react-hooks/exhaustive-deps -- timers are cleared by phase changes

  if (effective === 'NONE' || phase === 'done') return null;

  const position =
    mode === 'live'
      ? 'fixed inset-0 z-50'
      : // Stays at the top of the phone frame while the invitation underneath scrolls.
        'sticky top-0 z-30 -mb-[38rem] h-[38rem]';

  return (
    <div
      // On the live page the scene is a modal step: screen readers and keyboards stay inside it until it opens.
      {...(isLooping ? { 'aria-hidden': true } : { role: 'dialog', 'aria-modal': mode === 'live', 'aria-label': doorLabel })}
      className={`opening-root ${position} overflow-hidden ${phase === 'opening' ? 'is-opening' : ''} ${phase === 'leaving' ? 'is-opening is-leaving' : ''}`}
    >
      <Suspense fallback={<div className="absolute inset-0 bg-cream" />}>
        <LazyScene animation={effective} doorLabel={doorLabel} initials={initialsOf(doorLabel)} />
      </Suspense>
      {!isLooping && (
        <>
          <div className="opening-hint absolute inset-x-0 bottom-16 flex justify-center">
            <button
              type="button"
              autoFocus={mode === 'live'}
              onClick={enter}
              className="opening-cta min-h-14 rounded-full bg-burgundy px-10 font-serif text-xl text-cream shadow-xl shadow-burgundy/30"
            >
              {t.openingEnter}
            </button>
          </div>
          <button type="button" onClick={skip} className="absolute right-4 top-4 min-h-11 rounded-full bg-black/25 px-4 text-sm text-white backdrop-blur">
            {t.openingSkip}
          </button>
        </>
      )}
    </div>
  );
}
