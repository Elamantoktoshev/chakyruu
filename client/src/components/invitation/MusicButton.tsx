import { useEffect, useRef, useState } from 'react';
import type { MusicView } from '../../api/types';
import { useI18n } from '../../i18n/LanguageContext';
import { fadeIn, seekWhenReady } from '../../lib/audio';

type Props = {
  music: MusicView | null;
  /** Changes when the guest taps "Кириңиз" — start playing within that user gesture. */
  startSignal?: number;
};

/** Floating record player. Hidden when there is no music or its file cannot be played. */
export function MusicButton({ music, startSignal = 0 }: Props) {
  if (!music) return null;
  // Another song (or start second) remounts the player, which resets its state.
  return <MusicPlayer key={`${music.src}#${music.startSec}`} music={music} startSignal={startSignal} />;
}

function MusicPlayer({ music, startSignal }: { music: MusicView; startSignal: number }) {
  const { t } = useI18n();
  const audioRef = useRef<HTMLAudioElement>(null);
  const stopFadeRef = useRef<() => void>(() => undefined);
  const hasSeekedRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUnavailable, setIsUnavailable] = useState(false);

  async function start() {
    const audio = audioRef.current;
    if (!audio) return;
    if (!hasSeekedRef.current) {
      hasSeekedRef.current = true;
      seekWhenReady(audio, music.startSec);
    }
    stopFadeRef.current();
    stopFadeRef.current = fadeIn(audio);
    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      // Autoplay refused or the file is broken: hide the player rather than show a dead button.
      stopFadeRef.current();
      setIsUnavailable(true);
    }
  }

  function pause() {
    stopFadeRef.current();
    audioRef.current?.pause();
    setIsPlaying(false);
  }

  useEffect(() => {
    if (startSignal > 0) void start();
    // Only a new tap on the opening scene should (re)start the music.
  }, [startSignal]);

  useEffect(() => () => stopFadeRef.current(), []);

  if (isUnavailable) return null;

  return (
    <>
      <audio ref={audioRef} src={music.src} preload="none" loop onError={() => setIsUnavailable(true)} />
      <button
        type="button"
        onClick={() => (isPlaying ? pause() : void start())}
        aria-label={isPlaying ? t.musicPause : t.musicPlay}
        aria-pressed={isPlaying}
        className="group relative flex h-12 w-12 items-center justify-center rounded-full shadow-lg shadow-black/30 transition active:scale-95"
      >
        <VinylRecord isSpinning={isPlaying} />
        <span
          aria-hidden="true"
          className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-[9px] text-graphite ring-2 ring-cream ${isPlaying ? '' : 'pl-px'}`}
        >
          {isPlaying ? '❚❚' : '▶'}
        </span>
      </button>
    </>
  );
}

const GROOVE_RADII = [21, 18.5, 16, 13.5] as const;

function VinylRecord({ isSpinning }: { isSpinning: boolean }) {
  return (
    <svg viewBox="0 0 48 48" className={`vinyl h-12 w-12 ${isSpinning ? 'is-spinning' : ''}`} aria-hidden="true">
      <circle cx="24" cy="24" r="24" fill="#141110" />
      {GROOVE_RADII.map((radius) => (
        <circle key={radius} cx="24" cy="24" r={radius} fill="none" stroke="#ffffff" strokeOpacity="0.08" strokeWidth="0.8" />
      ))}
      {/* Light reflection: makes the rotation visible. */}
      <path d="M24 3 A21 21 0 0 1 42 13" fill="none" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="24" cy="24" r="9" fill="var(--color-burgundy)" />
      <circle cx="24" cy="24" r="6.5" fill="none" stroke="var(--color-gold)" strokeWidth="0.8" />
      <circle cx="24" cy="24" r="1.6" fill="#141110" />
    </svg>
  );
}
