import { useEffect, useRef, useState } from 'react';

/**
 * One shared <audio> for "listen" buttons in the builder: starting a song stops the previous one.
 * Returns the src that is playing (or null) and a toggle.
 */
export function useTrackPreview() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingSrc, setPlayingSrc] = useState<string | null>(null);

  useEffect(
    () => () => {
      audioRef.current?.pause();
      audioRef.current = null;
    },
    [],
  );

  function stop() {
    audioRef.current?.pause();
    setPlayingSrc(null);
  }

  async function toggle(src: string) {
    if (playingSrc === src) {
      stop();
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(src);
    audio.addEventListener('ended', () => setPlayingSrc(null), { once: true });
    audioRef.current = audio;
    setPlayingSrc(src);
    try {
      await audio.play();
    } catch {
      // Missing file or refused playback: just show the button as stopped again.
      setPlayingSrc((current) => (current === src ? null : current));
    }
  }

  return { playingSrc, toggle, stop };
}
