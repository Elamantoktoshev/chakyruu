import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { api } from '../api/client';
import type { AuthOptions } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { AppHeader } from '../components/AppHeader';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';
import { InAppBrowserNotice } from '../components/auth/InAppBrowserNotice';
import { BrandMark } from '../components/ui/BrandLogo';
import { useI18n } from '../i18n/LanguageContext';
import { requestErrorMessage, verifyErrorMessage } from './loginErrors';
import { PHONE_PREFIX, isValidPhone, safeNextPath, sanitizeLocalPart, toE164 } from '../lib/phone';

const RESEND_COOLDOWN_S = 60;
const CODE_LENGTH = 6;

const inputClass =
  'w-full rounded-xl border border-line bg-white/80 px-4 py-3 text-base outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20';
const primaryButtonClass =
  'w-full rounded-2xl bg-brand py-4 font-display font-bold text-white shadow-lg shadow-brand/20 transition hover:bg-brand-dark disabled:opacity-60';

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

/** Whether the server has Google sign-in configured; the button stays hidden until it says yes. */
/** If the server cannot be asked, offer both: it still refuses whatever is switched off. */
const FALLBACK_OPTIONS: AuthOptions = { google: true, phone: true };

/** Which sign-in methods the server has on; null until it answers (so the phone form never flashes). */
function useAuthOptions(): AuthOptions | null {
  const [options, setOptions] = useState<AuthOptions | null>(null);
  useEffect(() => {
    let isCurrent = true;
    api
      .authOptions()
      .then((answer) => isCurrent && setOptions(answer))
      .catch(() => isCurrent && setOptions(FALLBACK_OPTIONS));
    return () => {
      isCurrent = false;
    };
  }, []);
  return options;
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
  // The server sends people back here with ?error=google when Google sign-in did not work.
  const [error, setError] = useState<string | null>(() => (searchParams.get('error') === 'google' ? t.errorGoogle : null));
  const options = useAuthOptions();
  const resendIn = useSecondsUntil(resendAt);
  // Anti-bot signals checked by the server: time since the form appeared, and a hidden field people never fill.
  const shownAt = useRef(Date.now());
  const [honeypot, setHoneypot] = useState('');

  if (state.status === 'authenticated') return <Navigate to={next} replace />;

  async function sendCode(phone: string) {
    setIsBusy(true);
    setError(null);
    try {
      const { devCode } = await api.requestOtp(phone, { elapsedMs: Date.now() - shownAt.current, website: honeypot });
      if (devCode) {
        // Development without SMS: skip the code step entirely.
        signIn(await api.verifyOtp(phone, devCode));
        navigate(next, { replace: true });
        return;
      }
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
        <BrandMark className="mx-auto mb-5 h-14 w-14 shadow-xl shadow-brand/25" />
        <h1 className="text-center font-display font-extrabold text-4xl text-night">{t.loginTitle}</h1>
        <p className="mt-4 text-center text-night/70">{t.loginSubtitle}</p>

        <div className="mt-8 rounded-3xl border border-line bg-white/70 p-6 shadow-sm">
          {options === null && <p className="py-6 text-center text-sm text-night/50">{t.loading}</p>}
          {options?.google && codeSentTo === null && (
            <>
              <InAppBrowserNotice />
              <GoogleSignInButton href={api.googleSignInUrl(next)} label={t.loginWithGoogle} />
              {options.phone ? (
                <div className="my-5 flex items-center gap-3 text-sm text-night/50" aria-hidden="true">
                  <span className="h-px flex-1 bg-line" />
                  {t.loginOr}
                  <span className="h-px flex-1 bg-line" />
                </div>
              ) : (
                <div className="mt-4">
                  <ErrorMessage message={error} />
                </div>
              )}
            </>
          )}
          {!options?.phone ? null : codeSentTo === null ? (
            <form onSubmit={handlePhoneSubmit} noValidate className="space-y-5">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-night/80">{t.phoneLabel}</span>
                <div className="flex items-stretch gap-2">
                  <span className="flex items-center rounded-xl border border-line bg-page px-3 font-medium text-brand">
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
              {/* Honeypot: invisible to people and screen readers, filled by form-spamming bots. */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                className="absolute -left-[9999px] h-px w-px opacity-0"
              />
              <ErrorMessage message={error} />
              <button type="submit" disabled={isBusy} className={primaryButtonClass}>
                {isBusy ? t.sending : t.sendCode}
              </button>
            </form>
          ) : (
            <form onSubmit={handleCodeSubmit} noValidate className="space-y-5">
              <p className="text-center text-sm text-night/70">
                {t.codeSentTo} <span className="font-semibold text-brand tabular-nums">{codeSentTo}</span>
              </p>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-night/80">{t.codeLabel}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={CODE_LENGTH}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH))}
                  className={`${inputClass} text-center font-display text-2xl tracking-[0.5em] tabular-nums`}
                />
              </label>
              <ErrorMessage message={error} />
              <button type="submit" disabled={isBusy} className={primaryButtonClass}>
                {isBusy ? t.verifying : t.verify}
              </button>
              <div className="flex flex-col items-center gap-2 text-sm">
                {resendIn > 0 ? (
                  <span className="text-night/60">{t.resendIn.replace('{s}', String(resendIn))}</span>
                ) : (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => void sendCode(codeSentTo)}
                    className="text-brand underline underline-offset-4 disabled:opacity-60"
                  >
                    {t.resend}
                  </button>
                )}
                <button type="button" onClick={handleChangePhone} className="text-night/60 hover:text-brand">
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
