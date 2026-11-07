import { resolvePalette } from '@chakyruu/shared';
import { Suspense, useState, type ReactNode } from 'react';
import type { InvitationContent, Language } from '../../api/types';
import { FixedLanguage } from '../../i18n/LanguageContext';
import { paletteStyle } from '../../lib/theme';
import { templateComponent } from '../../templates/registry';
import type { InvitationViewMode } from '../../templates/types';
import { OpeningOverlay } from '../../openings/OpeningOverlay';
import { MusicButton } from './MusicButton';

export type { InvitationViewMode } from '../../templates/types';

type Props = {
  invitation: InvitationContent;
  /** Language the invitation is rendered in (guest's choice on the live page, the form value in preview). */
  lang: Language;
  mode: InvitationViewMode;
  /** Top-right controls (language switch) — live page only. */
  topBar?: ReactNode;
  /** Personal greeting shown above the names (guest links). */
  greeting?: ReactNode;
  /** RSVP block; the preview passes a placeholder. */
  rsvp?: ReactNode;
  /** Extra sections after RSVP (tilekter). */
  children?: ReactNode;
  /** Opening scene; absent for tiny previews (template cards). */
  opening?: {
    /** Guest name on personal links, otherwise the hosts. */
    doorLabel: string;
    isLooping?: boolean;
  };
};

/** Skeleton while the template chunk loads (first visit on a slow network). */
function TemplateLoading() {
  return <div className="h-[26rem] animate-pulse bg-burgundy/20" aria-hidden="true" />;
}

/**
 * The invitation: picks the template component and paints it with the chosen palette.
 * Music and the language switch float above any template.
 */
export function InvitationView({ invitation, lang, mode, topBar, greeting, rsvp, children, opening }: Props) {
  const palette = resolvePalette(invitation.template.componentKey, invitation.paletteId);
  const Template = templateComponent(invitation.template.componentKey);
  // Bumped by the guest's first tap on the opening scene: the player may start (autoplay rules).
  const [musicStart, setMusicStart] = useState(0);

  return (
    <FixedLanguage lang={lang}>
      <main
        style={paletteStyle(palette)}
        className="relative mx-auto w-full max-w-md overflow-hidden bg-cream text-ink shadow-2xl shadow-burgundy/10"
      >
        {opening && (
          <OpeningOverlay
            animation={invitation.openingAnimation}
            doorLabel={opening.doorLabel}
            mode={mode === 'live' ? 'live' : 'preview'}
            isLooping={opening.isLooping}
            onEnter={() => setMusicStart((n) => n + 1)}
          />
        )}
        <div className="absolute inset-x-4 top-4 z-10 flex items-start justify-between gap-3">
          <MusicButton trackId={invitation.musicTrackId} startSignal={musicStart} />
          <div className="ml-auto">{topBar}</div>
        </div>
        <Suspense fallback={<TemplateLoading />}>
          <Template invitation={invitation} palette={palette} mode={mode} slots={{ greeting, rsvp, extra: children }} />
        </Suspense>
      </main>
    </FixedLanguage>
  );
}
