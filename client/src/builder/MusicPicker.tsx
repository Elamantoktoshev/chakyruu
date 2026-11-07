import { TRACK_CATEGORIES, formatDuration, maxMusicStart, type TrackCategory } from '@chakyruu/shared';
import { useCallback, useState } from 'react';
import { api, type MusicUpdate } from '../api/client';
import type { MusicView, OwnerInvitation, Track } from '../api/types';
import { useAsync } from '../api/useAsync';
import { useI18n } from '../i18n/LanguageContext';
import type { BuilderChange } from './BuilderForm';
import { ListenButton } from './ListenButton';
import { OwnMusicField } from './OwnMusicField';
import { useTrackPreview } from './useTrackPreview';

type Section = TrackCategory | 'OWN';

type Props = {
  invitation: OwnerInvitation;
  onChange: (change: BuilderChange) => void;
  beforeUpload: () => Promise<void>;
};

const chipClass = (isActive: boolean) =>
  `min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition ${
    isActive ? 'border-burgundy bg-burgundy text-cream' : 'border-gold/50 bg-white/70 text-burgundy hover:border-burgundy/60'
  }`;

function trackMusic(track: Track): MusicView {
  return { src: track.file, title: track.title, durationSec: track.durationSec, startSec: 0, isCustom: false };
}

/** Music field: catalogue by category with "listen", own mp3 upload and the start second. */
export function MusicPicker({ invitation, onChange, beforeUpload }: Props) {
  const { t } = useI18n();
  const tracks = useAsync(useCallback(() => api.listTracks(), []));
  const preview = useTrackPreview();
  const music = invitation.music;
  const [section, setSection] = useState<Section>(music?.isCustom ? 'OWN' : 'ULUTTUK');

  const allTracks = tracks.status === 'success' ? tracks.data : [];
  const sectionTracks = allTracks.filter((track) => track.category === section);

  function chooseTrack(track: Track | null) {
    preview.stop();
    onChange({
      patch: { musicTrackId: track?.id ?? null, musicStartSec: 0 },
      view: { musicTrackId: track?.id ?? null, musicStartSec: 0, music: track ? trackMusic(track) : null },
    });
  }

  function setStart(startSec: number) {
    onChange({ patch: { musicStartSec: startSec }, view: { musicStartSec: startSec, music: music && { ...music, startSec } } });
  }

  const sections: { value: Section; label: string }[] = [
    ...TRACK_CATEGORIES.map((category) => ({ value: category, label: t.musicCategories[category] })),
    { value: 'OWN', label: t.musicOwnTab },
  ];

  return (
    <fieldset className="space-y-3">
      <legend className="mb-1.5 text-sm font-medium text-ink/80">{t.fieldMusic}</legend>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        {sections.map(({ value, label }) => (
          <button key={value} type="button" aria-pressed={section === value} onClick={() => setSection(value)} className={chipClass(section === value)}>
            {label}
          </button>
        ))}
      </div>

      {section === 'OWN' ? (
        <OwnMusicField
          invitationId={invitation.id}
          music={music}
          playingSrc={preview.playingSrc}
          onListen={(src) => void preview.toggle(src)}
          beforeUpload={beforeUpload}
          onChanged={(update: MusicUpdate) => onChange({ view: update })}
        />
      ) : (
        <TrackList
          tracks={sectionTracks}
          isLoading={tracks.status === 'loading'}
          selectedId={music?.isCustom ? null : invitation.musicTrackId}
          playingSrc={preview.playingSrc}
          onListen={(src) => void preview.toggle(src)}
          onChoose={chooseTrack}
        />
      )}

      <button type="button" aria-pressed={music === null} onClick={() => chooseTrack(null)} className={chipClass(music === null)}>
        {t.musicNone}
      </button>

      {music && <StartSlider music={music} onChange={setStart} />}
    </fieldset>
  );
}

type TrackListProps = {
  tracks: readonly Track[];
  isLoading: boolean;
  selectedId: string | null;
  playingSrc: string | null;
  onListen: (src: string) => void;
  onChoose: (track: Track) => void;
};

function TrackList({ tracks, isLoading, selectedId, playingSrc, onListen, onChoose }: TrackListProps) {
  const { t } = useI18n();
  if (isLoading) return <div className="h-16 animate-pulse rounded-2xl bg-gold/15" aria-hidden="true" />;
  if (tracks.length === 0) return <p className="rounded-2xl border border-dashed border-gold/50 p-4 text-sm text-ink/60">{t.musicEmpty}</p>;

  return (
    <ul className="divide-y divide-gold/25 overflow-hidden rounded-2xl border border-gold/50 bg-white/70">
      {tracks.map((track) => {
        const isSelected = track.id === selectedId;
        return (
          <li key={track.id} className={`flex items-center gap-3 p-2.5 ${isSelected ? 'bg-burgundy/5' : ''}`}>
            <ListenButton title={track.title} isPlaying={playingSrc === track.file} onClick={() => onListen(track.file)} />
            <button
              type="button"
              aria-pressed={isSelected}
              onClick={() => onChoose(track)}
              className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-2 text-left"
            >
              <span className={`truncate text-sm ${isSelected ? 'font-semibold text-burgundy' : 'text-ink'}`}>{track.title}</span>
              <span className="flex shrink-0 items-center gap-2 text-xs text-ink/50">
                {track.durationSec && formatDuration(track.durationSec)}
                <span
                  aria-hidden="true"
                  className={`h-5 w-5 rounded-full border-2 ${isSelected ? 'border-burgundy bg-burgundy shadow-[inset_0_0_0_3px_white]' : 'border-gold/60'}`}
                />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function StartSlider({ music, onChange }: { music: MusicView; onChange: (startSec: number) => void }) {
  const { t } = useI18n();
  const max = maxMusicStart(music.durationSec);
  if (max === 0) return null;
  return (
    <label className="block rounded-2xl border border-gold/40 bg-white/60 p-3">
      <span className="flex justify-between text-sm font-medium text-ink/80">
        {t.musicStart.replace('{time}', formatDuration(music.startSec))}
        {music.durationSec && <span className="text-ink/45">{formatDuration(music.durationSec)}</span>}
      </span>
      <input
        type="range"
        min={0}
        max={max}
        step={1}
        value={Math.min(music.startSec, max)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-burgundy"
      />
      <span className="block text-xs text-ink/55">{t.musicStartHint}</span>
    </label>
  );
}
