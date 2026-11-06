import { useEffect } from 'react';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/LanguageContext';
import { OrnamentDivider } from './Ornament';

export function LoadingView() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 text-burgundy">
      <OrnamentDivider className="w-40 animate-pulse" />
      <p className="font-serif text-lg">{t.loading}</p>
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
      <OrnamentDivider className="w-48" />
      <p className="font-serif text-2xl text-burgundy">
        {isNotFound ? (notFoundMessage ?? t.notFound) : t.errorGeneric}
      </p>
      {!isNotFound && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full bg-burgundy px-6 py-2.5 text-sm font-medium text-cream"
        >
          {t.retry}
        </button>
      )}
    </div>
  );
}
