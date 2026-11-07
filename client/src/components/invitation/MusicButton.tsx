import { findMusicTrack } from '@chakyruu/shared';
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n/LanguageContext';

type Props = {
  trackId: string | null;
  /** Changes when the guest taps "Кириңиз" — start playing within that user gesture. */
  startSignal?: number;
};

/** Floating play/pause button. Hidden when no track is chosen or its file is missing. */
export function MusicButton({ trackId, startSignal = 0 }: Props) {
  // Picking another track in the builder remounts the player, which resets play/availability state.
  return <MusicPlayer key={trackId ?? 'none'} trackId={trackId} startSignal={startSignal} />;
}

function MusicPlayer({ trackId, startSignal = 0 }: Props) {
  const { t } = useI18n();
  const track = findMusicTrack(trackId);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUnavailable, setIsUnavailable] = useState(false);

  useEffect(() => {
    if (startSignal === 0 || !audioRef.current || !track) return;
    audioRef.current
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsUnavailable(true));
  }, [startSignal, track]);

  if (!track || isUnavailable) return null;

  async function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }
    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      setIsUnavailable(true);
    }
  }

  return (
    <>
      <audio ref={audioRef} src={track.src} preload="none" loop onError={() => setIsUnavailable(true)} />
      <button
        type="button"
        onClick={() => void toggle()}
        aria-label={isPlaying ? t.musicPause : t.musicPlay}
        aria-pressed={isPlaying}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-burgundy/90 text-cream shadow-lg backdrop-blur transition hover:bg-burgundy"
      >
        <span aria-hidden="true" className={isPlaying ? 'animate-pulse' : ''}>
          {isPlaying ? '❚❚' : '♪'}
        </span>
      </button>
    </>
  );
}
