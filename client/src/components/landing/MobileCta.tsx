import { Link } from 'react-router';
import { useI18n } from '../../i18n/LanguageContext';

/** Thumb-reach "Түзүү" button on phones, shown once the hero button has scrolled away. */
export function MobileCta({ href, isVisible }: { href: string; isVisible: boolean }) {
  const { t } = useI18n();
  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 p-3 transition-transform duration-300 sm:hidden ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}
      aria-hidden={!isVisible}
    >
      <Link
        to={href}
        tabIndex={isVisible ? 0 : -1}
        className="flex min-h-14 items-center justify-center rounded-2xl bg-brand font-display font-bold text-white shadow-2xl shadow-brand/40"
      >
        {t.mobileCta}
      </Link>
    </div>
  );
}
