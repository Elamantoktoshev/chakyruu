import { TRACK_CATEGORIES, formatDuration, type TrackCategory, type TrackPatchInput } from '@chakyruu/shared';
import { useCallback, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { api } from '../../api/client';
import type { AdminTrack } from '../../api/types';
import { useAsync } from '../../api/useAsync';
import { ListenButton } from '../../builder/ListenButton';
import { inputClass } from '../../builder/fields';
import { useTrackPreview } from '../../builder/useTrackPreview';
import { useI18n } from '../../i18n/LanguageContext';
import { measureDuration } from '../../lib/audio';
import { ErrorView, LoadingView } from '../StatusView';

/** Music catalogue: add tracks, upload their mp3, switch them on and off. */
export function TracksTab() {
  const { t } = useI18n();
  const load = useCallback(() => api.admin.tracks(), []);
  const state = useAsync(load);
  const preview = useTrackPreview();

  if (state.status === 'loading') return <LoadingView />;
  if (state.status === 'error') return <ErrorView error={state.error} onRetry={state.reload} />;

  async function run(action: () => Promise<unknown>) {
    try {
      await action();
      state.reload();
    } catch {
      window.alert(t.errorGeneric);
    }
  }

  return (
    <div className="space-y-5">
      <p className="rounded-2xl bg-brand/15 p-3 text-sm text-night/75">{t.adminTrackLicense}</p>
      <AddTrackForm onAdd={(input) => run(() => api.admin.createTrack(input))} />
      {state.data.length === 0 ? (
        <p className="text-sm text-night/60">{t.adminTracksEmpty}</p>
      ) : (
        <ul className="space-y-3">
          {state.data.map((track) => (
            <TrackRow
              key={track.id}
              track={track}
              isPlaying={track.file !== null && preview.playingSrc === track.file}
              onListen={() => track.file && void preview.toggle(track.file)}
              onPatch={(patch) => run(() => api.admin.updateTrack(track.id, patch))}
              onUpload={(file, durationSec) => run(() => api.admin.uploadTrackFile(track.id, file, durationSec))}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

type AddInput = { title: string; category: TrackCategory; file: string | null };

function AddTrackForm({ onAdd }: { onAdd: (input: AddInput) => Promise<void> }) {
  const { t } = useI18n();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get('title') ?? '').trim();
    const file = String(data.get('file') ?? '').trim();
    if (!title) return;
    await onAdd({ title, category: data.get('category') as TrackCategory, file: file || null });
    form.reset();
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-2 rounded-2xl border border-line bg-white/70 p-4">
      <p className="font-medium text-brand">{t.adminTrackAdd}</p>
      <input name="title" required maxLength={80} placeholder={t.adminTrackTitle} aria-label={t.adminTrackTitle} className={inputClass} />
      <select name="category" aria-label={t.fieldMusic} className={inputClass} defaultValue="ULUTTUK">
        {TRACK_CATEGORIES.map((category) => (
          <option key={category} value={category}>{t.musicCategories[category]}</option>
        ))}
      </select>
      <input name="file" placeholder="/music/komuz.mp3" aria-label={t.adminTrackFilePath} className={inputClass} />
      <p className="text-xs text-night/55">{t.adminTrackFilePath}</p>
      <button type="submit" className="min-h-12 rounded-xl bg-brand px-6 text-sm font-semibold text-white">{t.adminTrackAdd}</button>
    </form>
  );
}

type RowProps = {
  track: AdminTrack;
  isPlaying: boolean;
  onListen: () => void;
  onPatch: (patch: TrackPatchInput) => Promise<void>;
  onUpload: (file: File, durationSec: number | null) => Promise<void>;
};

function TrackRow({ track, isPlaying, onListen, onPatch, onUpload }: RowProps) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileLabel = !track.file ? t.adminTrackNoFile : track.isUploaded ? t.adminTrackUploaded : t.adminTrackBundled;

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setIsUploading(true);
    try {
      await onUpload(file, await measureDuration(file));
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <li className={`rounded-2xl border border-line p-4 ${track.active ? 'bg-white/70' : 'bg-stone-100'}`}>
      <div className="flex items-center gap-3">
        {track.file && <ListenButton title={track.title} isPlaying={isPlaying} onClick={onListen} />}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-night">{track.title}</p>
          <p className="text-xs text-night/60">
            {t.musicCategories[track.category]} · {fileLabel}
            {track.durationSec ? ` · ${formatDuration(track.durationSec)}` : ''}
            {track.usedBy > 0 ? ` · ${t.adminTrackUsedBy.replace('{n}', String(track.usedBy))}` : ''}
          </p>
        </div>
        <button
          type="button"
          disabled={!track.file}
          title={track.file ? undefined : t.adminTrackNeedsFile}
          onClick={() => void onPatch({ active: !track.active })}
          className={`min-h-11 shrink-0 rounded-xl px-4 text-sm font-medium disabled:opacity-50 ${track.active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-700'}`}
        >
          {track.active ? t.adminTrackActive : t.adminTrackInactive}
        </button>
      </div>
      <button
        type="button"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        className="mt-3 min-h-11 rounded-xl border border-brand/50 px-4 text-sm font-medium text-brand disabled:opacity-60"
      >
        {isUploading ? t.musicUploading : track.isUploaded ? t.adminTrackReplace : t.adminTrackUpload}
      </button>
      <input ref={inputRef} type="file" accept="audio/mpeg,.mp3" className="hidden" onChange={(e) => void handleFile(e)} />
    </li>
  );
}
