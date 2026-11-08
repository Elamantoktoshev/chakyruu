import { Link } from 'react-router';
import { BozUy } from '../art/BozUy';
import { useI18n } from '../../i18n/LanguageContext';
import { Reveal } from '../Reveal';
import { primaryButton } from '../ui/buttons';
import { PlayIcon } from '../ui/SiteIcons';

/** Invites the visitor to open the real demo invitation as a guest would. */
export function DemoBlock() {
  const { t } = useI18n();
  return (
    <section className="px-5 py-16">
      <Reveal className="mx-auto grid max-w-5xl items-center gap-8 overflow-hidden rounded-[2rem] bg-gradient-to-br from-peach-soft via-white to-lemon-soft p-8 ring-1 ring-line sm:grid-cols-[1fr_auto] sm:p-12">
        <div>
          <h2 className="font-display text-3xl font-extrabold text-night sm:text-4xl">{t.demoTitle}</h2>
          <p className="mt-3 max-w-lg text-muted">{t.demoText}</p>
          <Link
            to="/aibek-aizada"
            className={`mt-6 ${primaryButton} min-h-14`}
          >
            <PlayIcon className="h-5 w-5" />
            {t.heroDemo}
          </Link>
        </div>
        <BozUy className="mx-auto w-56 sm:w-64" doorLabel="Айбек & Айзада" />
      </Reveal>
    </section>
  );
}
