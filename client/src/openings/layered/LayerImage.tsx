import { useState } from 'react';
import type { ManifestPalette } from '@chakyruu/shared';

type Props = {
  src: string;
  /** Shown on the placeholder until the artwork exists ("Сол кол"). */
  label: string;
  palette: ManifestPalette;
  /** Tiny blurred preview (data: URL) shown while the real picture loads. */
  blurDataUrl?: string;
  /** Fills its box (background, cover) instead of keeping the picture's own height. */
  isFill?: boolean;
  isEager?: boolean;
};

/**
 * A template picture that never breaks the design: while loading it shows the blurred preview, and
 * if the file does not exist yet it becomes a soft gradient plate in the template colours, labelled
 * with the layer name, so templates work before the artist delivers the pictures.
 */
export function LayerImage({ src, label, palette, blurDataUrl, isFill = false, isEager = false }: Props) {
  // Remembered per src: a new file (e.g. just uploaded in /admin) gets a fresh try.
  const [loaded, setLoaded] = useState<{ src: string; state: 'loading' | 'ready' | 'missing' }>({ src, state: 'loading' });
  const state = loaded.src === src ? loaded.state : 'loading';
  const setState = (next: 'ready' | 'missing') => setLoaded({ src, state: next });

  if (state === 'missing') {
    return (
      <div
        className={`flex items-center justify-center rounded-[6%] border border-dashed border-white/50 p-2 text-center text-[clamp(8px,3.2cqw,15px)] font-semibold tracking-wide text-white/90 ${isFill ? 'h-full w-full rounded-none' : 'aspect-square w-full'}`}
        style={{ backgroundImage: `linear-gradient(140deg, ${palette.primary}cc, ${palette.accent}99)` }}
        data-placeholder={label}
      >
        {label}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      draggable={false}
      loading={isEager ? 'eager' : 'lazy'}
      decoding="async"
      onLoad={() => setState('ready')}
      onError={() => setState('missing')}
      className={`block select-none ${isFill ? 'h-full w-full object-cover' : 'h-auto w-full'}`}
      style={state === 'loading' && blurDataUrl ? { backgroundImage: `url(${blurDataUrl})`, backgroundSize: 'cover' } : undefined}
    />
  );
}
