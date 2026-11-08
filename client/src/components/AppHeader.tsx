import { Link, useLocation } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { whatsappMessageHref } from '../config/site';
import { useI18n } from '../i18n/LanguageContext';
import { LanguageSwitch } from './LanguageSwitch';
import { MobileMenu } from './MobileMenu';
import { BrandLogo } from './ui/BrandLogo';
import { ChatIcon } from './ui/SiteIcons';

/** Site header: brand, section links, WhatsApp, login / cabinet and language. Shown on every app page. */
export function AppHeader() {
  const { t, localePath } = useI18n();
  const { state } = useAuth();
  const isLoggedIn = state.status === 'authenticated';
  const role = state.status === 'authenticated' ? state.user.role : null;
  const { pathname } = useLocation();
  const linkClass = 'flex min-h-11 items-center rounded-xl px-3 font-semibold text-night/75 transition hover:bg-brand-soft hover:text-brand';
  const activeClass = 'bg-brand-soft text-brand';

  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link to={localePath('')} aria-label={t.brand} className="min-w-0 rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20">
          <BrandLogo />
        </Link>
        <nav className="flex shrink-0 items-center gap-1 text-sm">
          <Link to={localePath('')} aria-current={pathname === localePath('') ? 'page' : undefined} className={`${linkClass} hidden md:flex ${pathname === localePath('') ? activeClass : ''}`}>
            {t.navHome}
          </Link>
          <Link
            to={localePath('templates')}
            aria-current={pathname === localePath('templates') ? 'page' : undefined}
            className={`${linkClass} hidden md:flex ${pathname === localePath('templates') ? activeClass : ''}`}
          >
            {t.navTemplates}
          </Link>
          <a href={`${localePath('')}#prices`} className={`${linkClass} hidden md:flex`}>
            {t.navPrices}
          </a>
          <Link
            to={localePath('tamadalar')}
            aria-current={pathname === localePath('tamadalar') ? 'page' : undefined}
            className={`${linkClass} hidden lg:flex ${pathname === localePath('tamadalar') ? activeClass : ''}`}
          >
            {t.catalogTitle}
          </Link>
          {role === 'ORG_ADMIN' && (
            <Link to="/partner" className={`${linkClass} hidden md:flex`}>
              {t.navPartner}
            </Link>
          )}
          {role === 'ADMIN' && (
            <Link to="/admin" className={`${linkClass} hidden md:flex`}>
              {t.navAdmin}
            </Link>
          )}
          <a
            href={whatsappMessageHref(t.whatsappGreeting)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t.whatsappCta}
            className="hidden h-11 w-11 items-center justify-center rounded-xl text-whatsapp transition hover:bg-mint-soft sm:flex"
          >
            <ChatIcon className="h-6 w-6" />
          </a>
          <Link
            to={isLoggedIn ? '/dashboard' : '/login?next=/dashboard'}
            className="flex min-h-11 items-center whitespace-nowrap rounded-xl bg-brand-soft px-3 font-display font-bold text-brand transition hover:bg-brand hover:text-white sm:px-4"
          >
            {isLoggedIn ? t.navDashboard : t.navLogin}
          </Link>
          {/* On phones the language switch lives inside the ☰ menu, so the header fits a 320 px screen. */}
          <div className="hidden md:block">
            <LanguageSwitch />
          </div>
          <MobileMenu role={role} />
        </nav>
      </div>
    </header>
  );
}
