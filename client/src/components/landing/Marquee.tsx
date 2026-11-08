import { useI18n } from '../../i18n/LanguageContext';

/** Endless ticker of toi types and features under the hero (decorative: hidden from screen readers). */
export function Marquee() {
  const { t } = useI18n();
  // Two identical halves: the strip slides by -50% and loops without a visible jump.
  const items = [...t.marquee, ...t.marquee];
  return (
    <div className="relative overflow-hidden border-y border-brand/10 bg-brand py-4 text-white" aria-hidden="true">
      <ul className="animate-marquee flex w-max items-center gap-8 whitespace-nowrap font-display text-lg font-bold">
        {items.map((item, index) => (
          <li key={`${item}-${index}`} className="flex items-center gap-8">
            {item}
            <svg viewBox="0 0 20 20" className="h-4 w-4 text-lemon">
              <path d="M10 0 L12.4 7.6 L20 10 L12.4 12.4 L10 20 L7.6 12.4 L0 10 L7.6 7.6 Z" fill="currentColor" />
            </svg>
          </li>
        ))}
      </ul>
      <span className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-brand to-transparent" />
      <span className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-brand to-transparent" />
    </div>
  );
}
