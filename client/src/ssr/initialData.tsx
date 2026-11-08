import { createContext, useContext } from 'react';
import type { PublicPrice, Template } from '../api/types';

/**
 * Data the server already loaded for a public page. It is rendered into the HTML and handed to
 * the browser, so the first client render matches the server one and makes no extra request.
 */
export interface InitialData {
  templates?: Template[];
  prices?: PublicPrice[];
}

/** Must match server/src/web/ssr.ts. */
export const INITIAL_DATA_ID = 'initial-data';

const InitialDataContext = createContext<InitialData>({});
export const InitialDataProvider = InitialDataContext.Provider;

export function useInitialData<K extends keyof InitialData>(key: K): InitialData[K] {
  return useContext(InitialDataContext)[key];
}

/** Reads (once) what the server embedded in the page; {} on pages rendered in the browser only. */
export function readEmbeddedInitialData(): InitialData {
  const element = document.getElementById(INITIAL_DATA_ID);
  if (!element?.textContent) return {};
  try {
    const parsed: unknown = JSON.parse(element.textContent);
    return typeof parsed === 'object' && parsed !== null ? (parsed as InitialData) : {};
  } catch {
    return {};
  }
}
