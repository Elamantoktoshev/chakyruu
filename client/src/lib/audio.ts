import { MUSIC_FADE_IN_MS } from '@chakyruu/shared';

type FrameScheduler = (callback: (time: number) => void) => number;

/** Seconds kept before the end: starting later would loop straight back to 0. */
const END_MARGIN_SEC = 1;

/**
 * Raises the volume from 0 to 1 over `durationMs` (ease-in, so the first notes are soft).
 * Returns a cancel function. iOS Safari ignores `volume`, so there the song simply starts.
 */
export function fadeIn(
  audio: HTMLAudioElement,
  durationMs: number = MUSIC_FADE_IN_MS,
  schedule: FrameScheduler = requestAnimationFrame,
  cancel: (id: number) => void = cancelAnimationFrame,
): () => void {
  let startedAt: number | null = null;
  let frameId = 0;
  audio.volume = 0;

  const step = (time: number) => {
    startedAt ??= time;
    const progress = Math.min(1, (time - startedAt) / durationMs);
    audio.volume = progress * progress;
    if (progress < 1) frameId = schedule(step);
  };
  frameId = schedule(step);
  return () => cancel(frameId);
}

/** Moves to `seconds` once the duration is known (with preload="none" it is not yet). */
export function seekWhenReady(audio: HTMLAudioElement, seconds: number): void {
  if (seconds <= 0) return;
  const seek = () => {
    const isTooLate = Number.isFinite(audio.duration) && seconds >= audio.duration - END_MARGIN_SEC;
    audio.currentTime = isTooLate ? 0 : seconds;
  };
  const HAVE_METADATA = 1;
  if (audio.readyState >= HAVE_METADATA) seek();
  else audio.addEventListener('loadedmetadata', seek, { once: true });
}

const METADATA_TIMEOUT_MS = 10_000;

/** Length of a local mp3 in whole seconds, read by the browser; null if it cannot tell. */
export function measureDuration(file: File, createAudio: () => HTMLAudioElement = () => new Audio()): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = createAudio();
    const finish = (seconds: number | null) => {
      window.clearTimeout(timer);
      URL.revokeObjectURL(url);
      resolve(seconds);
    };
    const timer = window.setTimeout(() => finish(null), METADATA_TIMEOUT_MS);
    audio.preload = 'metadata';
    audio.addEventListener('loadedmetadata', () => {
      const isKnown = Number.isFinite(audio.duration) && audio.duration > 0;
      finish(isKnown ? Math.round(audio.duration) : null);
    }, { once: true });
    audio.addEventListener('error', () => finish(null), { once: true });
    audio.src = url;
  });
}
