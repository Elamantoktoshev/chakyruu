import type { InvitationContent, Language } from '../../api/types';

/** Static sample for the hero phone: renders without waiting for the API (fast first paint). */
export function heroInvitation(lang: Language): InvitationContent {
  return {
    slug: 'aibek-aizada',
    hostNames: 'Айбек & Айзада',
    eventType: 'WEDDING',
    eventDate: '2027-06-15T11:00:00.000Z',
    venueName: lang === 'KY' ? '«Ала-Тоо» тойканасы' : 'Тойкана «Ала-Тоо»',
    venueAddress: null,
    venueMapUrl: null,
    photoUrl: null,
    musicTrackId: null,
    musicStartSec: 0,
    music: null,
    gallery: [],
    message: null,
    language: lang,
    adultsOnly: false,
    paletteId: 'bordo-gold',
    heroNumber: null,
    openingAnimation: 'BOZ_UY',
    program: [],
    hideBranding: true,
    template: { id: 'tpl-classic', name: 'Классика', type: 'WEDDING', componentKey: 'classic', isUniversal: false, config: {}, priceSom: null, badge: null, description: {} },
  };
}
