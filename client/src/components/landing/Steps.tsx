import type { ReactElement } from 'react';
import { useI18n } from '../../i18n/LanguageContext';
import { Reveal } from '../Reveal';

const ILLUSTRATIONS: readonly (() => ReactElement)[] = [
  // Create: lines being written on a card
  () => (
    <svg viewBox="0 0 80 60" className="h-16 w-20" aria-hidden="true">
      <rect x="8" y="6" width="64" height="48" rx="6" fill="var(--color-cream)" stroke="var(--color-gold)" strokeWidth="2" />
      <path className="step-draw" d="M18 22 h44 M18 32 h30 M18 42 h38" stroke="var(--color-burgundy)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  // Send: a paper plane flying off
  () => (
    <svg viewBox="0 0 80 60" className="h-16 w-20 overflow-visible" aria-hidden="true">
      <g className="step-fly">
        <path d="M14 34 L66 14 L48 50 L40 36 Z" fill="var(--color-burgundy)" />
        <path d="M40 36 L66 14" stroke="var(--color-gold)" strokeWidth="2" />
      </g>
    </svg>
  ),
  // Track: answers ticking in
  () => (
    <svg viewBox="0 0 80 60" className="h-16 w-20" aria-hidden="true">
      {[14, 30, 46].map((y, i) => (
        <g key={y}>
          <rect x="30" y={y - 4} width="38" height="8" rx="4" fill="var(--color-gold)" opacity="0.4" />
          <circle className="step-pop" cx="18" cy={y} r="6" fill="var(--color-burgundy)" style={{ animationDelay: `${i * 0.35}s` }} />
        </g>
      ))}
    </svg>
  ),
];

export function Steps() {
  const { t } = useI18n();
  return (
    <section className="relative bg-graphite py-20 text-cream">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <h2 className="font-serif text-4xl sm:text-5xl">{t.stepsTitle}</h2>
        </Reveal>
        <ol className="mt-10 grid gap-5 sm:grid-cols-3">
          {t.steps.map(([title, text], index) => (
            <Reveal key={title} as="li" delayMs={index * 120} className="relative rounded-3xl border border-white/10 bg-white/5 p-6">
              <span className="absolute right-5 top-3 font-serif text-6xl font-bold text-gold/25" aria-hidden="true">
                {index + 1}
              </span>
              {ILLUSTRATIONS[index]?.()}
              <h3 className="mt-4 font-serif text-2xl text-gold-light">{title}</h3>
              <p className="mt-2 text-cream/75">{text}</p>
              {index < t.steps.length - 1 && (
                <span className="absolute -right-4 top-1/2 hidden -translate-y-1/2 text-2xl text-gold sm:block" aria-hidden="true">
                  →
                </span>
              )}
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
