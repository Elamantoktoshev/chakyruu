import { findMusicTrack } from '@chakyruu/shared';
import { useRef, useState } from 'react';
import { useI18n } from '../../i18n/LanguageContext';

type Props = { trackId: string | null };

/** Floating play/pause button. Hidden when no track is chosen or its file is missing. */
export function MusicButton({ trackId }: Props) {
  // Picking another track in the builder remounts the player, which resets play/availability state.
  return <MusicPlayer key={trackId ?? 'none'} trackId={trackId} />;
}

function MusicPlayer({ trackId }: Props) {
  const { t } = useI18n();
  const track = findMusicTrack(trackId);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUnavailable, setIsUnavailable] = useState(false);

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
