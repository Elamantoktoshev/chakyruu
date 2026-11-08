import { useRef } from 'react';
import { Link } from 'react-router';
import type { UserRole } from '../api/types';
import { whatsappMessageHref } from '../config/site';
import { useI18n } from '../i18n/LanguageContext';
import { LanguageSwitch } from './LanguageSwitch';
import { ChatIcon } from './ui/SiteIcons';

type Props = {
  /** Partner / admin links for signed-in staff; null for everyone else. */
  role: UserRole | null;
};

/** Phone-only navigation ("☰"): native <details>, closes itself after a tap on a link. */
export function MobileMenu({ role }: Props) {
  const { t } = useI18n();
  const menuRef = useRef<HTMLDetailsElement>(null);
  const close = () => menuRef.current?.removeAttribute('open');
  const itemClass = 'flex min-h-12 items-center rounded-xl px-4 font-display font-bold text-night transition hover:bg-brand-soft hover:text-brand';

  return (
    <details ref={menuRef} className="group relative md:hidden">
      <summary
        aria-label="Menu"
        className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-xl text-night transition hover:bg-brand-soft [&::-webkit-details-marker]:hidden"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
          <path className="group-open:hidden" d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path className="hidden group-open:block" d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </summary>
      <nav className="absolute right-0 top-13 w-64 max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-white p-2 shadow-2xl shadow-night/10">
        <Link to="/" onClick={close} className={itemClass}>{t.navHome}</Link>
        <Link to="/templates" onClick={close} className={itemClass}>{t.navTemplates}</Link>
        <a href="/#prices" onClick={close} className={itemClass}>{t.navPrices}</a>
        <Link to="/tamadalar" onClick={close} className={itemClass}>{t.catalogTitle}</Link>
        {role === 'ORG_ADMIN' && <Link to="/partner" onClick={close} className={itemClass}>{t.navPartner}</Link>}
        {role === 'ADMIN' && <Link to="/admin" onClick={close} className={itemClass}>{t.navAdmin}</Link>}
        <a
          href={whatsappMessageHref(t.whatsappGreeting)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={close}
          className="mt-1 flex min-h-12 items-center gap-2 rounded-xl bg-whatsapp px-4 font-display font-bold text-white"
        >
          <ChatIcon className="h-5 w-5" />
          {t.whatsappCta}
        </a>
        <div className="mt-2 flex justify-center border-t border-line pt-3 pb-1">
          <LanguageSwitch />
        </div>
      </nav>
    </details>
  );
}
