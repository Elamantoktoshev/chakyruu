import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n/LanguageContext';
import { isGoogleBlockedBrowser } from '../../lib/inAppBrowser';
import { copyText } from '../../lib/share';

/** Inside Instagram / Facebook / TikTok Google sign-in fails: explain how to open the page in a real browser. */
export function InAppBrowserNotice() {
  const { t } = useI18n();
  const [isBlocked, setIsBlocked] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  // Read in an effect: the server render has no user agent, and hydration must match.
  useEffect(() => setIsBlocked(isGoogleBlockedBrowser(navigator.userAgent)), []);
  if (!isBlocked) return null;

  return (
    <div role="note" className="mb-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
      <p className="font-semibold">{t.inAppBrowserTitle}</p>
      <p className="mt-1">{t.inAppBrowserText}</p>
      <button
        type="button"
        onClick={() => void copyText(window.location.href).then(setIsCopied)}
        className="mt-3 min-h-11 w-full rounded-xl bg-white font-semibold text-amber-900 ring-1 ring-amber-300"
      >
        {isCopied ? t.copied : t.inAppBrowserCopy}
      </button>
    </div>
  );
}
