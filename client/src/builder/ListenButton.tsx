import { useI18n } from '../i18n/LanguageContext';

type Props = { title: string; isPlaying: boolean; onClick: () => void };

/** Round ▶ / ■ button used to preview a song in the builder. */
export function ListenButton({ title, isPlaying, onClick }: Props) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isPlaying ? t.musicStopListening : t.musicListen.replace('{title}', title)}
      aria-pressed={isPlaying}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-sm transition ${
        isPlaying ? 'border-brand bg-brand text-white' : 'border-line text-brand hover:border-brand'
      }`}
    >
      <span aria-hidden="true">{isPlaying ? '■' : '▶'}</span>
    </button>
  );
}
