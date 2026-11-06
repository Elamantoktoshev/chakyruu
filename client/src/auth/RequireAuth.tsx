import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { ErrorView, LoadingView } from '../components/StatusView';
import { useAuth } from './AuthContext';

/** Renders children only for a logged-in user; otherwise sends them to /login?next=… */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { state, reload } = useAuth();
  const location = useLocation();

  if (state.status === 'loading') return <LoadingView />;
  if (state.status === 'error') return <ErrorView error={state.error} onRetry={reload} />;
  if (state.status === 'anonymous') {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return children;
}
