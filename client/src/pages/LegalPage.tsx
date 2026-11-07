import { AppHeader } from '../components/AppHeader';
import { SiteFooter } from '../components/landing/SiteFooter';
import { useI18n } from '../i18n/LanguageContext';

/**
 * Offer / privacy pages. TODO: the legal texts are to be provided by the owner before launch;
 * until then the page says so instead of showing invented terms.
 */
export function LegalPage({ kind }: { kind: 'offer' | 'privacy' }) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12">
        <h1 className="font-serif text-4xl text-graphite">{kind === 'offer' ? t.footerOffer : t.footerPrivacy}</h1>
        <p className="mt-6 text-ink/70">{t.legalPending}</p>
      </main>
      <SiteFooter />
    </div>
  );
}
