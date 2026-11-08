import { createContext, useContext, useEffect } from 'react';
import { REPLACED_HEAD_SELECTOR, buildHeadTags, type SeoMeta } from './head';

/** Server render: receives the page's meta so entry-server can put it into <head>. */
const SeoCollectorContext = createContext<((meta: SeoMeta) => void) | null>(null);
export const SeoCollectorProvider = SeoCollectorContext.Provider;

function applyHead(meta: SeoMeta): void {
  document.head.querySelectorAll(REPLACED_HEAD_SELECTOR).forEach((element) => element.remove());
  document.head.insertAdjacentHTML('beforeend', buildHeadTags(meta, window.location.origin));
}

/**
 * Head tags of a public page. On the server they go straight into the HTML (bots read them
 * without JavaScript); in the browser they are refreshed when the person moves between pages.
 */
export function Seo(meta: SeoMeta) {
  const collect = useContext(SeoCollectorContext);
  collect?.(meta);
  const key = JSON.stringify(meta);
  useEffect(() => {
    applyHead(JSON.parse(key) as SeoMeta);
  }, [key]);
  return null;
}
