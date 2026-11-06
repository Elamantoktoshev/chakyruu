import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, ApiError } from '../api/client';
import type { SessionUser } from '../api/types';

export type AuthState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'error'; error: unknown }
  | { status: 'authenticated'; user: SessionUser };

interface AuthContextValue {
  state: AuthState;
  /** Called after a successful OTP verification. */
  signIn: (user: SessionUser) => void;
  signOut: () => Promise<void>;
  /** The server rejected our session (401) — drop it locally. */
  sessionExpired: () => void;
  reload: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api
      .me()
      .then((user) => !cancelled && setState({ status: 'authenticated', user }))
      .catch((error: unknown) => {
        if (cancelled) return;
        const isAnonymous = error instanceof ApiError && error.status === 401;
        setState(isAnonymous ? { status: 'anonymous' } : { status: 'error', error });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const signIn = useCallback((user: SessionUser) => setState({ status: 'authenticated', user }), []);
  const sessionExpired = useCallback(() => setState({ status: 'anonymous' }), []);
  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      // Even if the request fails, forget the session locally; the cookie expires on its own.
      setState({ status: 'anonymous' });
    }
  }, []);

  const value = useMemo(
    () => ({ state, signIn, signOut, sessionExpired, reload }),
    [state, signIn, signOut, sessionExpired, reload],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
