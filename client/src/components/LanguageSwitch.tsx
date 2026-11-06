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
      className="inline-flex rounded-full border border-gold/60 bg-cream/90 p-0.5 text-xs font-semibold shadow-sm backdrop-blur"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={lang === option.value}
          onClick={() => setLang(option.value)}
          className={`rounded-full px-3 py-1 transition-colors ${
            lang === option.value ? 'bg-burgundy text-cream' : 'text-burgundy hover:bg-cream-dark'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
