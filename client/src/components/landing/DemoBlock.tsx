import { Link } from 'react-router';
import { BozUy } from '../art/BozUy';
import { useI18n } from '../../i18n/LanguageContext';
import { Reveal } from '../Reveal';

/** Invites the visitor to open the real demo invitation as a guest would. */
export function DemoBlock() {
  const { t } = useI18n();
  return (
    <section className="px-5 py-16">
      <Reveal className="mx-auto grid max-w-5xl items-center gap-8 overflow-hidden rounded-[2.5rem] border border-gold/40 bg-gradient-to-br from-cream via-white to-gold-light/40 p-8 sm:grid-cols-[1fr_auto] sm:p-12">
        <div>
          <h2 className="font-serif text-3xl text-graphite sm:text-4xl">{t.demoTitle}</h2>
          <p className="mt-3 max-w-lg text-ink/70">{t.demoText}</p>
          <Link
            to="/aibek-aizada"
            className="mt-6 inline-flex min-h-14 items-center rounded-full bg-graphite px-8 font-semibold text-cream shadow-lg transition hover:-translate-y-0.5"
          >
            {t.heroDemo} →
          </Link>
        </div>
        <BozUy className="mx-auto w-56 sm:w-64" doorLabel="Айбек & Айзада" />
      </Reveal>
    </section>
  );
}
