import type { InvitationViewMode } from '../types';

/** In the phone-frame preview `dvh` would mean the whole screen, so fixed heights are used there. */
export function heroHeight(mode: InvitationViewMode, size: 'tall' | 'short' = 'tall'): string {
  if (mode !== 'live') return size === 'tall' ? 'h-[26rem]' : 'h-80';
  return size === 'tall' ? 'h-[68dvh] max-h-[42rem] min-h-[26rem]' : 'h-[50dvh] max-h-[34rem] min-h-80';
}
