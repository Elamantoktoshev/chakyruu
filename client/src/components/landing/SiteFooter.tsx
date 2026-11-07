import { Link } from 'react-router';
import { SITE_CONTACTS, instagramHref, tiktokHref, whatsappHref } from '../../config/site';
import { useI18n } from '../../i18n/LanguageContext';
import { OrnamentBand } from '../Ornament';

export function SiteFooter() {
  const { t } = useI18n();
  const linkClass = 'flex min-h-11 items-center hover:text-gold-light';
  return (
    <footer className="bg-graphite text-cream/75">
      <div className="py-1 text-gold/50">
        <OrnamentBand />
      </div>
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-3">
        <div>
          <p className="font-serif text-2xl text-cream">Chakyruu.kg</p>
          <p className="mt-2 text-sm">{t.footerAbout}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">{t.footerContacts}</p>
          <ul className="mt-2 text-sm">
            <li><a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={linkClass}>WhatsApp {SITE_CONTACTS.whatsapp}</a></li>
            <li><a href={instagramHref} target="_blank" rel="noopener noreferrer" className={linkClass}>Instagram @{SITE_CONTACTS.instagram}</a></li>
            <li><a href={tiktokHref} target="_blank" rel="noopener noreferrer" className={linkClass}>TikTok @{SITE_CONTACTS.tiktok}</a></li>
            <li><a href={`mailto:${SITE_CONTACTS.email}`} className={linkClass}>{SITE_CONTACTS.email}</a></li>
          </ul>
        </div>
        <div className="text-sm">
          <ul>
            <li><Link to="/oferta" className={linkClass}>{t.footerOffer}</Link></li>
            <li><Link to="/privacy" className={linkClass}>{t.footerPrivacy}</Link></li>
            <li><Link to="/tamadalar" className={linkClass}>{t.catalogTitle}</Link></li>
          </ul>
          <p className="mt-4 text-xs text-cream/50">{t.footerCopyright.replace('{year}', String(new Date().getFullYear()))}</p>
        </div>
      </div>
    </footer>
  );
}
