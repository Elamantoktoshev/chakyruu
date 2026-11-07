/** Must match the Prisma `TrackCategory` enum. */
export const TRACK_CATEGORIES = ['ULUTTUK', 'ZAMANBAP', 'BALDARGA', 'KLASSIKA'] as const;
export type TrackCategory = (typeof TRACK_CATEGORIES)[number];

/** Own mp3 uploaded in the builder (before compression). */
export const MAX_MUSIC_BYTES = 10 * 1024 * 1024;
/** Admin uploads may be longer recordings. */
export const MAX_TRACK_BYTES = 20 * 1024 * 1024;
/** "Start the song from 0:35" — capped at 10 minutes. */
export const MUSIC_START_MAX_SEC = 600;
export const MUSIC_DURATION_MAX_SEC = 3600;
/** Volume rises from silence to full over this time when the music starts. */
export const MUSIC_FADE_IN_MS = 2000;

export const TRACK_TITLE_MAX = 80;

/** 95 → "1:35". */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** The furthest a song may be started from: a few seconds before its end, never past the cap. */
export function maxMusicStart(durationSec: number | null): number {
  const LAST_SECONDS_KEPT = 5;
  if (!durationSec) return MUSIC_START_MAX_SEC;
  return Math.max(0, Math.min(MUSIC_START_MAX_SEC, durationSec - LAST_SECONDS_KEPT));
}
