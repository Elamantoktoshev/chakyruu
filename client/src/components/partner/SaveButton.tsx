import { useI18n } from '../../i18n/LanguageContext';
import type { SaveState } from './useSaveState';

export function SaveButton({ state, label }: { state: SaveState; label?: string }) {
  const { t } = useI18n();
  const caption = state.status === 'saving' ? t.profileSaving : state.status === 'saved' ? t.savedOk : (label ?? t.save);
  return (
    <div className="space-y-2">
      {state.status === 'error' && (
        <p role="alert" className="text-sm font-medium text-red-700">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={state.status === 'saving'}
        className="min-h-12 w-full rounded-full bg-burgundy font-semibold text-cream disabled:opacity-60"
      >
        {caption}
      </button>
    </div>
  );
}
