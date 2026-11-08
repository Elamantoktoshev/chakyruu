import type { Language } from '../api/types';
import { useI18n } from '../i18n/LanguageContext';

const OPTIONS: readonly { value: Language; label: string }[] = [
  { value: 'KY', label: 'КЫР' },
  { value: 'RU', label: 'РУС' },
];

export function LanguageSwitch() {
  const { lang, setLang } = useI18n();

  return (
    <div
      role="group"
      aria-label="Language"
      className="inline-flex rounded-xl border border-line bg-white p-0.5 text-xs font-bold shadow-sm"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={lang === option.value}
          onClick={() => setLang(option.value)}
          className={`min-h-9 rounded-[0.6rem] px-2.5 transition-colors ${
            lang === option.value ? 'bg-night text-white' : 'text-muted hover:bg-brand-soft hover:text-brand'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
