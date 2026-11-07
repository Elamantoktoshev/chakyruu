import { MAX_MUSIC_BYTES, formatDuration } from '@chakyruu/shared';
import { useRef, useState, type ChangeEvent } from 'react';
import { ApiError, api, type MusicUpdate } from '../api/client';
import type { MusicView } from '../api/types';
import { useI18n } from '../i18n/LanguageContext';
import { measureDuration } from '../lib/audio';
import { ListenButton } from './ListenButton';

type Props = {
  invitationId: string;
  music: MusicView | null;
  playingSrc: string | null;
  onListen: (src: string) => void;
  /** Sends pending autosave changes first, so a queued track choice cannot erase the upload. */
  beforeUpload: () => Promise<void>;
  onChanged: (update: MusicUpdate) => void;
};

const MP3_ACCEPT = 'audio/mpeg,.mp3';

/** Upload of the owner's own mp3 (≤ 10 MB; the server checks the content and compresses it). */
export function OwnMusicField({ invitationId, music, playingSrc, onListen, beforeUpload, onChanged }: Props) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const own = music?.isCustom ? music : null;

  async function run(action: () => Promise<MusicUpdate>) {
    setIsBusy(true);
    setError(null);
    try {
      await beforeUpload();
      onChanged(await action());
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 413) setError(t.musicTooLarge);
      else if (err instanceof ApiError && err.status === 400) setError(t.musicBadType);
      else setError(t.errorGeneric);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_MUSIC_BYTES) {
      setError(t.musicTooLarge);
      return;
    }
    const durationSec = await measureDuration(file);
    await run(() => api.uploadMusic(invitationId, file, durationSec));
  }

  return (
    <div className="space-y-3">
      {own && (
        <div className="flex items-center gap-3 rounded-2xl border border-gold/50 bg-white/70 p-3">
          <ListenButton title={t.musicOwnFile} isPlaying={playingSrc === own.src} onClick={() => onListen(own.src)} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{t.musicOwnFile}</p>
            {own.durationSec && <p className="text-xs text-ink/55">{formatDuration(own.durationSec)}</p>}
          </div>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => void run(() => api.removeMusic(invitationId))}
            className="min-h-11 px-3 text-sm font-medium text-red-700 disabled:opacity-60"
          >
            {t.musicRemoveOwn}
          </button>
        </div>
      )}
      <button
        type="button"
        disabled={isBusy}
        onClick={() => inputRef.current?.click()}
        className="min-h-11 w-full rounded-full border-2 border-dashed border-burgundy/60 px-5 text-sm font-medium text-burgundy transition hover:bg-burgundy/5 disabled:opacity-60"
      >
        {isBusy ? t.musicUploading : own ? t.musicReplace : t.musicUpload}
      </button>
      <input ref={inputRef} type="file" accept={MP3_ACCEPT} className="hidden" onChange={(e) => void handleFile(e)} />
      {error ? (
        <p role="alert" className="text-xs font-medium text-red-700">{error}</p>
      ) : (
        <p className="text-xs text-ink/55">{t.musicOwnHint}</p>
      )}
    </div>
  );
}
