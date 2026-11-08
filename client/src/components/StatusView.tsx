import { useEffect } from 'react';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/LanguageContext';

/** Neutral loading ring in the site colour (also shown before an invitation loads). */
function Spinner({ className = '' }: { className?: string }) {
  return <span className={`inline-block h-10 w-10 animate-spin rounded-full border-4 border-brand/20 border-t-brand ${className}`} aria-hidden="true" />;
}

export function LoadingView() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 text-brand">
      <Spinner />
      <p className="font-display text-lg font-bold">{t.loading}</p>
    </div>
  );
}

interface ErrorViewProps {
  error: unknown;
  onRetry: () => void;
  /** Text shown for 404; defaults to "invitation not found". */
  notFoundMessage?: string;
}

export function ErrorView({ error, onRetry, notFoundMessage }: ErrorViewProps) {
  const { t } = useI18n();
  const { sessionExpired } = useAuth();
  const isNotFound = error instanceof ApiError && error.status === 404;
  const isUnauthorized = error instanceof ApiError && error.status === 401;

  // The session expired while a protected page was open: drop it so RequireAuth sends the user to /login.
  useEffect(() => {
    if (isUnauthorized) sessionExpired();
  }, [isUnauthorized, sessionExpired]);

  if (isUnauthorized) return <LoadingView />;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft font-display text-2xl font-extrabold text-brand" aria-hidden="true">!</span>
      <p className="font-display font-extrabold text-2xl text-night">
        {isNotFound ? (notFoundMessage ?? t.notFound) : t.errorGeneric}
      </p>
      {!isNotFound && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full bg-brand px-6 py-2.5 text-sm font-medium text-white"
        >
          {t.retry}
        </button>
      )}
    </div>
  );
}
