import { useEffect, useRef, useState } from 'react';

type Callback = (isVisible: boolean) => void;

/** One observer for all sections — cheap even on low-end phones. */
let observer: IntersectionObserver | null = null;
const callbacks = new WeakMap<Element, Callback>();

function sharedObserver(): IntersectionObserver | null {
  if (typeof IntersectionObserver === 'undefined') return null;
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        callbacks.get(entry.target)?.(true);
        observer?.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
  );
  return observer;
}

/** Adds `is-visible` once the element scrolls into view. Without IntersectionObserver it shows at once. */
export function useReveal<T extends Element>(): { ref: React.RefObject<T | null>; isVisible: boolean } {
  const ref = useRef<T>(null);
  // Same first value on the server and in the browser (hydration); the effect reveals it.
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    const io = sharedObserver();
    if (!element || !io) {
      setIsVisible(true);
      return undefined;
    }
    callbacks.set(element, setIsVisible);
    io.observe(element);
    return () => {
      io.unobserve(element);
      callbacks.delete(element);
    };
  }, []);

  return { ref, isVisible };
}
