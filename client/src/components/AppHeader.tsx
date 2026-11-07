import { Link } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/LanguageContext';
import { LanguageSwitch } from './LanguageSwitch';

/** Site header: brand, language switch and login / dashboard link. Shown on every app page. */
export function AppHeader() {
  const { t } = useI18n();
  const { state } = useAuth();
  const isLoggedIn = state.status === 'authenticated';
  const role = state.status === 'authenticated' ? state.user.role : null;
  const linkClass = 'flex min-h-11 items-center rounded-full px-3 font-medium text-burgundy hover:bg-cream-dark';

  return (
    <header className="sticky top-0 z-30 border-b border-gold/30 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <Link to="/" className="font-serif text-xl font-bold text-burgundy">
          {t.brand}
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link to="/tamadalar" className={`${linkClass} hidden sm:flex`}>
            {t.catalogTitle}
          </Link>
          {role === 'ORG_ADMIN' && (
            <Link to="/partner" className={linkClass}>
              {t.navPartner}
            </Link>
          )}
          {role === 'ADMIN' && (
            <Link to="/admin" className={linkClass}>
              {t.navAdmin}
            </Link>
          )}
          <Link
            to={isLoggedIn ? '/dashboard' : '/login?next=/dashboard'}
            className="flex min-h-11 items-center rounded-full px-3 font-medium text-burgundy hover:bg-cream-dark"
          >
            {isLoggedIn ? t.navDashboard : t.navLogin}
          </Link>
          <LanguageSwitch />
        </nav>
      </div>
    </header>
  );
}
