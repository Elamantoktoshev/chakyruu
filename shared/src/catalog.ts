/** Kinds of toi. Must match the Prisma `TemplateType` enum. */
export const EVENT_TYPES = ['WEDDING', 'KYZ_UZATUU', 'BESHIK', 'SUNNOT', 'MAARAKE'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const LANGUAGES = ['KY', 'RU'] as const;
export type Language = (typeof LANGUAGES)[number];

export const PAYMENT_PROVIDERS = ['MBANK', 'ODENGI', 'ELSOM'] as const;
export type PaymentProviderId = (typeof PAYMENT_PROVIDERS)[number];

export interface MusicTrack {
  id: string;
  title: string;
  /** Served by the client from /public/music. The files are added separately (licensing). */
  src: string;
}

export const MUSIC_TRACKS: readonly MusicTrack[] = [
  { id: 'komuz-joy', title: 'Комуз — Шаттык', src: '/music/komuz-joy.mp3' },
  { id: 'komuz-lyric', title: 'Комуз — Лирика', src: '/music/komuz-lyric.mp3' },
  { id: 'piano-wedding', title: 'Фортепиано — Той', src: '/music/piano-wedding.mp3' },
  { id: 'strings-classic', title: 'Скрипка — Классика', src: '/music/strings-classic.mp3' },
  { id: 'folk-dance', title: 'Элдик бий', src: '/music/folk-dance.mp3' },
];

export const MUSIC_TRACK_IDS = MUSIC_TRACKS.map((track) => track.id) as [string, ...string[]];

export function findMusicTrack(id: string | null | undefined): MusicTrack | undefined {
  return MUSIC_TRACKS.find((track) => track.id === id);
}
