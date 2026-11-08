import { ILLUSTRATED_TEMPLATE_KEY, manifestOf, openingDurationMs, type TemplateManifest } from '@chakyruu/shared';
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import type { Template } from '../../api/types';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useI18n } from '../../i18n/LanguageContext';
import { InvitationView } from '../invitation/InvitationView';
import { sampleInvitation } from '../TemplateCard';

const LayeredScene = lazy(async () => ({ default: (await import('../../openings/layered/LayeredScene')).LayeredScene }));

/** Pause after a phone-screen preview before it may play again. */
const REPLAY_PAUSE_MS = 900;
/** Share of the card that must be on screen for the touch-screen preview to start. */
const IN_VIEW_RATIO = 0.6;

/**
 * Preview playback: on hover with a mouse; on touch screens once each time the card scrolls into
 * view. Never with prefers-reduced-motion.
 */
function usePreviewPlayback(manifest: TemplateManifest | null) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [isPlaying, setIsPlaying] = useState(false);
  const canPlay = manifest !== null && !prefersReducedMotion;
  const playMs = manifest ? openingDurationMs(manifest) + REPLAY_PAUSE_MS : 0;

  useEffect(() => {
    const element = ref.current;
    if (!element || !canPlay || typeof IntersectionObserver === 'undefined') return undefined;
    const hasHover = window.matchMedia?.('(hover: hover)').matches ?? true;
    if (hasHover) return undefined;
    let timer = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || timer) return;
        setIsPlaying(true);
        timer = window.setTimeout(() => {
          setIsPlaying(false);
          timer = 0;
        }, playMs);
      },
      { threshold: IN_VIEW_RATIO },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
    // Primitive deps only: the observer is created once per card, not on every play.
  }, [canPlay, playMs]);

  const hoverHandlers = canPlay
    ? { onPointerEnter: (event: React.PointerEvent) => event.pointerType === 'mouse' && setIsPlaying(true), onPointerLeave: () => setIsPlaying(false) }
    : {};
  return { ref, isPlaying, hoverHandlers };
}

type Props = { template: Template; isRendered: boolean; label: string };

/** Phone mockup on a catalog card: the illustrated cover (plays its opening) or a live mini render. */
export function CatalogPhone({ template, isRendered, label }: Props) {
  const { lang } = useI18n();
  const manifest = useMemo(
    () => (template.componentKey === ILLUSTRATED_TEMPLATE_KEY ? manifestOf(template.config) : null),
    [template.componentKey, template.config],
  );
  const { ref, isPlaying, hoverHandlers } = usePreviewPlayback(manifest);

  return (
    <div
      ref={ref}
      {...hoverHandlers}
      className="relative mx-auto aspect-[9/19] w-[10.5rem] overflow-hidden rounded-[1.9rem] border-[6px] border-night bg-night shadow-2xl shadow-night/25 transition duration-500 group-hover:-translate-y-2"
    >
      <span className="absolute left-1/2 top-1 z-20 h-3.5 w-14 -translate-x-1/2 rounded-full bg-night" aria-hidden="true" />
      <div className={`relative h-full overflow-hidden rounded-[1.45rem] bg-cream ${isPlaying ? 'is-opening' : ''}`}>
        {isRendered && manifest && (
          <Suspense fallback={<div className="absolute inset-0" style={{ backgroundColor: manifest.palette.card }} />}>
            {/* Adding .is-opening again restarts the CSS animation: no remount needed. */}
            <LayeredScene manifest={manifest} doorLabel={label} />
          </Suspense>
        )}
        {isRendered && !manifest && (
          <div className="pointer-events-none w-[28rem] origin-top-left scale-[0.348]" inert>
            <InvitationView invitation={sampleInvitation(template, lang)} lang={lang} mode="preview" />
          </div>
        )}
      </div>
    </div>
  );
}
