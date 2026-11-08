import { useEffect, useState, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  /** What the server HTML and the first browser paint show (keep the same size to avoid layout shift). */
  fallback?: ReactNode;
};

/**
 * Renders its children only in the browser, after hydration. For decorative, code-split widgets
 * (the animated demo phone): the server render stays complete and script-free, and hydration matches.
 */
export function ClientOnly({ children, fallback = null }: Props) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);
  return <>{isMounted ? children : fallback}</>;
}
