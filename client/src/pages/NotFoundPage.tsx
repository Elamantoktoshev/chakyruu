import { Link } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { AppHeader } from '../components/AppHeader';
import { primaryButton, secondaryButton } from '../components/ui/buttons';
import { OyuPattern } from '../components/ui/OyuPattern';
import { ArrowRightIcon } from '../components/ui/SiteIcons';
import { useI18n } from '../i18n/LanguageContext';

/** Wrong link or a removed invitation: say so and offer the two useful next steps. */
export function NotFoundPage() {
  const { t } = useI18n();
  const { state } = useAuth();
  const createHref = state.status === 'authenticated' ? '/create' : '/login?next=/create';

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-5 py-16">
        <OyuPattern className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 text-brand/10" />
        <div className="relative mx-auto max-w-md text-center">
          <p className="font-display text-7xl font-extrabold tracking-tight text-brand/20" aria-hidden="true">
            404
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-night">{t.notFoundPageTitle}</h1>
          <p className="mt-3 text-lg leading-relaxed text-muted">{t.notFoundPageText}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link to={createHref} className={`group ${primaryButton} min-h-14`}>
              {t.heroCta}
              <ArrowRightIcon className="h-5 w-5 transition group-hover:translate-x-1" />
            </Link>
            <Link to="/" className={`${secondaryButton} min-h-14`}>
              {t.navHome}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
