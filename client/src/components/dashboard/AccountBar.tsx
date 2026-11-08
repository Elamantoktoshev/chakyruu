import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../auth/AuthContext';
import { useI18n } from '../../i18n/LanguageContext';

/** Who is signed in (phone or Google e-mail) and the "log out" button, at the top of the cabinet. */
export function AccountBar() {
  const { t, localePath } = useI18n();
  const { state, signOut } = useAuth();
  const navigate = useNavigate();
  const [isLeaving, setIsLeaving] = useState(false);

  if (state.status !== 'authenticated') return null;
  const account = state.user.phone ?? state.user.email;

  async function handleLogout() {
    setIsLeaving(true);
    await signOut();
    navigate(localePath(''), { replace: true });
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white/70 px-4 py-2.5">
      <span className="min-w-0 truncate text-sm text-night/70 tabular-nums">{account}</span>
      <button
        type="button"
        onClick={() => void handleLogout()}
        disabled={isLeaving}
        className="flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-night/70 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {t.logout}
      </button>
    </div>
  );
}
