import type { ReactElement } from 'react';
import { useI18n } from '../../i18n/LanguageContext';
import { Reveal } from '../Reveal';
import { eyebrow, sectionTitle } from '../ui/buttons';

const ILLUSTRATIONS: readonly (() => ReactElement)[] = [
  // Create: lines being written on a card
  () => (
    <svg viewBox="0 0 80 60" className="h-16 w-20" aria-hidden="true">
      <rect x="8" y="6" width="64" height="48" rx="8" fill="#fff" stroke="var(--color-brand)" strokeOpacity="0.3" strokeWidth="2" />
      <path className="step-draw" d="M18 22 h44 M18 32 h30 M18 42 h38" stroke="var(--color-brand)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  // Send: a paper plane flying off
  () => (
    <svg viewBox="0 0 80 60" className="h-16 w-20 overflow-visible" aria-hidden="true">
      <g className="step-fly">
        <path d="M14 34 L66 14 L48 50 L40 36 Z" fill="var(--color-lilac)" />
        <path d="M40 36 L66 14" stroke="#fff" strokeWidth="2" />
      </g>
    </svg>
  ),
  // Track: answers ticking in
  () => (
    <svg viewBox="0 0 80 60" className="h-16 w-20" aria-hidden="true">
      {[14, 30, 46].map((y, i) => (
        <g key={y}>
          <rect x="30" y={y - 4} width="38" height="8" rx="4" fill="var(--color-peach)" opacity="0.25" />
          <circle className="step-pop" cx="18" cy={y} r="6" fill="var(--color-peach)" style={{ animationDelay: `${i * 0.35}s` }} />
        </g>
      ))}
    </svg>
  ),
];

const BADGES = ['bg-brand shadow-brand/30', 'bg-lilac shadow-lilac/30', 'bg-peach shadow-peach/30'] as const;

/** "3 кадам": create → send on WhatsApp → watch the answers. */
export function Steps() {
  const { t } = useI18n();
  return (
    <section className="bg-gradient-to-b from-white via-brand-soft/70 to-white py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className={eyebrow}>{t.stepsTitle}</p>
          <h2 className={`mt-4 ${sectionTitle}`}>{t.stepsHeading}</h2>
        </Reveal>
        <ol className="relative mt-14 grid gap-6 sm:grid-cols-3">
          <span className="absolute left-[16%] right-[16%] top-7 hidden border-t-2 border-dashed border-night/10 sm:block" aria-hidden="true" />
          {t.steps.map(([title, text], index) => (
            <Reveal key={title} as="li" delayMs={index * 120} className="relative text-center">
              <span className={`relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl font-display text-xl font-extrabold text-white shadow-lg ${BADGES[index] ?? BADGES[0]}`}>
                {index + 1}
              </span>
              <div className="mt-6 rounded-3xl border border-line bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-night/5">
                <div className="flex justify-center">{ILLUSTRATIONS[index]?.()}</div>
                <h3 className="mt-4 font-display text-xl font-bold text-night">{title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{text}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
