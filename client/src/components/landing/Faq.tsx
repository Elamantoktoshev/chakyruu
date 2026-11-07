import { useI18n } from '../../i18n/LanguageContext';
import { Reveal } from '../Reveal';
import { ChevronIcon } from './LandingIcons';

/** Native <details> accordion: no JavaScript, keyboard and screen-reader friendly. */
export function Faq() {
  const { t } = useI18n();
  return (
    <section className="mx-auto max-w-3xl px-5 py-20">
      <Reveal>
        <h2 className="text-center font-serif text-4xl text-graphite sm:text-5xl">{t.faqTitle}</h2>
      </Reveal>
      <div className="mt-10 space-y-3">
        {t.faq.map(([question, answer]) => (
          <details key={question} className="group rounded-2xl border border-gold/40 bg-white/70 open:bg-white open:shadow-md">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-medium text-graphite [&::-webkit-details-marker]:hidden">
              {question}
              <ChevronIcon className="h-5 w-5 shrink-0 text-burgundy transition group-open:rotate-180" />
            </summary>
            <p className="px-5 pb-5 leading-relaxed text-ink/70">{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
