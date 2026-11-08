import { Link } from 'react-router';
import { whatsappMessageHref } from '../../config/site';
import { useI18n } from '../../i18n/LanguageContext';
import { Reveal } from '../Reveal';
import { primaryButton, whatsappLightButton } from '../ui/buttons';
import { ArrowRightIcon, ChatIcon } from '../ui/SiteIcons';

/** Mid-page call to action: create for free, or ask a question on WhatsApp. */
export function CtaBand({ createHref }: { createHref: string }) {
  const { t } = useI18n();
  return (
    <section className="px-5">
      <Reveal className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-night px-7 py-10 text-white shadow-2xl shadow-night/20 sm:px-12">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-brand/45 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-28 left-10 h-64 w-64 rounded-full bg-lemon/20 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col items-start justify-between gap-7 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-display text-2xl font-extrabold sm:text-3xl">{t.ctaBandTitle}</h2>
            <p className="mt-2 text-white/70">{t.ctaBandText}</p>
          </div>
          <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row">
            <Link to={createHref} className={`group ${primaryButton}`}>
              {t.heroCta}
              <ArrowRightIcon className="h-5 w-5 transition group-hover:translate-x-1" />
            </Link>
            <a href={whatsappMessageHref(t.whatsappGreeting)} target="_blank" rel="noopener noreferrer" className={whatsappLightButton}>
              <ChatIcon className="h-5 w-5 text-whatsapp" />
              {t.whatsappCta}
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
