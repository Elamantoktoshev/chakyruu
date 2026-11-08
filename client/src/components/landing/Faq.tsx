import { whatsappMessageHref } from '../../config/site';
import { useI18n } from '../../i18n/LanguageContext';
import { Reveal } from '../Reveal';
import { eyebrow, sectionTitle, whatsappButton } from '../ui/buttons';
import { ChatIcon } from '../ui/SiteIcons';
import { ChevronIcon } from './LandingIcons';

/** Native <details> accordion (no JavaScript, keyboard friendly) plus a WhatsApp card for anything else. */
export function Faq() {
  const { t } = useI18n();
  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-5 py-20 lg:grid-cols-[1fr_22rem] lg:py-24">
      <div>
        <Reveal>
          <p className={eyebrow}>FAQ</p>
          <h2 className={`mt-4 ${sectionTitle}`}>{t.faqTitle}</h2>
        </Reveal>
        <div className="mt-8 space-y-3">
          {t.faq.map(([question, answer]) => (
            <details key={question} className="group rounded-2xl border border-line bg-white transition open:shadow-xl open:shadow-night/5">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 font-display font-bold text-night [&::-webkit-details-marker]:hidden">
                {question}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand transition group-open:rotate-180 group-open:bg-brand group-open:text-white">
                  <ChevronIcon className="h-4 w-4" />
                </span>
              </summary>
              <p className="px-6 pb-6 leading-relaxed text-muted">{answer}</p>
            </details>
          ))}
        </div>
      </div>
      <Reveal delayMs={120} className="h-fit rounded-[2rem] bg-mint-soft p-8 lg:sticky lg:top-24">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-whatsapp text-white shadow-lg shadow-whatsapp/30">
          <ChatIcon className="h-7 w-7" />
        </span>
        <h3 className="mt-6 font-display text-2xl font-extrabold text-night">{t.faqContactTitle}</h3>
        <p className="mt-2 leading-relaxed text-muted">{t.faqContactText}</p>
        <a href={whatsappMessageHref(t.whatsappGreeting)} target="_blank" rel="noopener noreferrer" className={`mt-6 w-full ${whatsappButton}`}>
          {t.whatsappCta}
        </a>
      </Reveal>
    </section>
  );
}
