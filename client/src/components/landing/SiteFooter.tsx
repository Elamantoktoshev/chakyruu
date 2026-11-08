import { Link } from 'react-router';
import { SITE_CONTACTS, instagramHref, tiktokHref, whatsappMessageHref } from '../../config/site';
import { useI18n } from '../../i18n/LanguageContext';
import { ChatIcon } from '../ui/SiteIcons';

export function SiteFooter() {
  const { t } = useI18n();
  const linkClass = 'flex min-h-11 items-center transition hover:text-white';
  return (
    <footer className="bg-night text-white/65">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-display text-2xl font-extrabold text-white">
            Chakyruu<span className="text-brand">.kg</span>
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed">{t.footerAbout}</p>
          <a
            href={whatsappMessageHref(t.whatsappGreeting)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-whatsapp px-5 font-display font-bold text-white transition hover:brightness-105"
          >
            <ChatIcon className="h-5 w-5" />
            {SITE_CONTACTS.whatsapp}
          </a>
        </div>
        <div>
          <p className="font-display text-sm font-bold uppercase tracking-wider text-white">{t.footerContacts}</p>
          <ul className="mt-3 text-sm">
            <li><a href={instagramHref} target="_blank" rel="noopener noreferrer" className={linkClass}>Instagram @{SITE_CONTACTS.instagram}</a></li>
            <li><a href={tiktokHref} target="_blank" rel="noopener noreferrer" className={linkClass}>TikTok @{SITE_CONTACTS.tiktok}</a></li>
            <li><a href={`mailto:${SITE_CONTACTS.email}`} className={linkClass}>{SITE_CONTACTS.email}</a></li>
          </ul>
        </div>
        <div className="text-sm">
          <ul>
            <li><Link to="/templates" className={linkClass}>{t.navTemplates}</Link></li>
            <li><Link to="/tamadalar" className={linkClass}>{t.catalogTitle}</Link></li>
            <li><Link to="/oferta" className={linkClass}>{t.footerOffer}</Link></li>
            <li><Link to="/privacy" className={linkClass}>{t.footerPrivacy}</Link></li>
            <li><Link to="/contacts" className={linkClass}>{t.footerContacts}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-5 py-5 text-xs text-white/40">{t.footerCopyright.replace('{year}', String(new Date().getFullYear()))}</p>
      </div>
    </footer>
  );
}
