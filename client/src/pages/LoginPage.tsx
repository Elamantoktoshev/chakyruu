import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { api, ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { AppHeader } from '../components/AppHeader';
import { OrnamentDivider } from '../components/Ornament';
import type { Dict } from '../i18n/dict';
import { useI18n } from '../i18n/LanguageContext';
import { PHONE_PREFIX, isValidPhone, safeNextPath, sanitizeLocalPart, toE164 } from '../lib/phone';

const RESEND_COOLDOWN_S = 60;
const CODE_LENGTH = 6;

const inputClass =
  'w-full rounded-xl border border-gold/50 bg-white/80 px-4 py-3 text-base outline-none transition focus:border-burgundy focus:ring-2 focus:ring-burgundy/20';
const primaryButtonClass =
  'w-full rounded-full bg-burgundy py-4 font-semibold tracking-wide text-cream shadow-lg shadow-burgundy/20 transition hover:bg-burgundy-dark disabled:opacity-60';

function requestErrorMessage(error: unknown, t: Dict): string {
  if (error instanceof ApiError && error.status === 400) return t.errorPhone;
  if (error instanceof ApiError && error.status === 429) return t.errorTooMany;
  return t.errorGeneric;
}

function verifyErrorMessage(error: unknown, t: Dict): string {
  if (error instanceof ApiError && error.status === 400) return t.errorCode;
  if (error instanceof ApiError && error.status === 429) return t.errorTooManyAttempts;
  return t.errorGeneric;
}

/** Seconds left until `deadline`, re-rendering once per second while > 0. */
function useSecondsUntil(deadline: number): number {
  const [now, setNow] = useState(() => Date.now());
  const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
  useEffect(() => {
    if (remaining === 0) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [remaining]);
  return remaining;
}

export function LoginPage() {
  const { t } = useI18n();
  const { state, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNextPath(searchParams.get('next'), '/dashboard');

  const [localPart, setLocalPart] = useState('');
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [resendAt, setResendAt] = useState(0);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resendIn = useSecondsUntil(resendAt);

  if (state.status === 'authenticated') return <Navigate to={next} replace />;

  async function sendCode(phone: string) {
    setIsBusy(true);
    setError(null);
    try {
      await api.requestOtp(phone);
      setCodeSentTo(phone);
      setCode('');
      setResendAt(Date.now() + RESEND_COOLDOWN_S * 1000);
    } catch (err: unknown) {
      setError(requestErrorMessage(err, t));
    } finally {
      setIsBusy(false);
    }
  }

  function handlePhoneSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const phone = toE164(localPart);
    if (!isValidPhone(phone)) {
      setError(t.errorPhone);
      return;
    }
    void sendCode(phone);
  }

  async function handleCodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!codeSentTo || code.length !== CODE_LENGTH) {
      setError(t.errorCode);
      return;
    }
    setIsBusy(true);
    setError(null);
    try {
      signIn(await api.verifyOtp(codeSentTo, code));
      navigate(next, { replace: true });
    } catch (err: unknown) {
      setError(verifyErrorMessage(err, t));
      setIsBusy(false);
    }
  }

  function handleChangePhone() {
    setCodeSentTo(null);
    setCode('');
    setError(null);
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-8">
      <div className="my-auto">
        <h1 className="text-center font-serif text-4xl text-burgundy">{t.loginTitle}</h1>
        <OrnamentDivider className="mx-auto mt-4 max-w-xs" />
        <p className="mt-4 text-center text-ink/70">{t.loginSubtitle}</p>

        <div className="mt-8 rounded-3xl border border-gold/40 bg-white/70 p-6 shadow-sm">
          {codeSentTo === null ? (
            <form onSubmit={handlePhoneSubmit} noValidate className="space-y-5">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink/80">{t.phoneLabel}</span>
                <div className="flex items-stretch gap-2">
                  <span className="flex items-center rounded-xl border border-gold/50 bg-cream px-3 font-medium text-burgundy">
                    {PHONE_PREFIX}
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="700123456"
                    value={localPart}
                    onChange={(e) => setLocalPart(sanitizeLocalPart(e.target.value))}
                    className={`${inputClass} tracking-wider tabular-nums`}
                  />
                </div>
              </label>
              <ErrorMessage message={error} />
              <button type="submit" disabled={isBusy} className={primaryButtonClass}>
                {isBusy ? t.sending : t.sendCode}
              </button>
            </form>
          ) : (
            <form onSubmit={handleCodeSubmit} noValidate className="space-y-5">
              <p className="text-center text-sm text-ink/70">
                {t.codeSentTo} <span className="font-semibold text-burgundy tabular-nums">{codeSentTo}</span>
              </p>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink/80">{t.codeLabel}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={CODE_LENGTH}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH))}
                  className={`${inputClass} text-center font-serif text-2xl tracking-[0.5em] tabular-nums`}
                />
              </label>
              <ErrorMessage message={error} />
              <button type="submit" disabled={isBusy} className={primaryButtonClass}>
                {isBusy ? t.verifying : t.verify}
              </button>
              <div className="flex flex-col items-center gap-2 text-sm">
                {resendIn > 0 ? (
                  <span className="text-ink/60">{t.resendIn.replace('{s}', String(resendIn))}</span>
                ) : (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => void sendCode(codeSentTo)}
                    className="text-burgundy underline underline-offset-4 disabled:opacity-60"
                  >
                    {t.resend}
                  </button>
                )}
                <button type="button" onClick={handleChangePhone} className="text-ink/60 hover:text-burgundy">
                  {t.changePhone}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      </main>
    </div>
  );
}

function ErrorMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-center text-sm font-medium text-red-700">
      {message}
    </p>
  );
}
