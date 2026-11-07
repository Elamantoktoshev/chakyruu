import type { Palette } from '@chakyruu/shared';
import type { ReactNode } from 'react';
import type { InvitationContent } from '../api/types';

/** live: the guest page; preview: builder / hero phone; thumbnail: template cards (hero only). */
export type InvitationViewMode = 'live' | 'preview' | 'thumbnail';

/** Interactive pieces the page injects; templates only decide where they go. */
export interface TemplateSlots {
  /** Personal greeting on guest links ("Урматтуу Асан байке!"). */
  greeting?: ReactNode;
  /** RSVP form; the preview passes nothing and gets a placeholder. */
  rsvp?: ReactNode;
  /** Sections after RSVP (tilekter). */
  extra?: ReactNode;
}

/** Every template is a React component with exactly these props. */
export interface TemplateProps {
  invitation: InvitationContent;
  palette: Palette;
  mode: InvitationViewMode;
  slots: TemplateSlots;
}
