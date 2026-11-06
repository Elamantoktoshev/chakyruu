import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Language } from '../api/types';
import { dictionaries, locales, type Dict } from './dict';

const STORAGE_KEY = 'chakyruu.lang';

interface LanguageContextValue {
  lang: Language;
  t: Dict;
  locale: string;
  setLang: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'RU' ? 'RU' : 'KY';
  } catch {
    return 'KY';
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(readStoredLanguage);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode / storage disabled — language just won't persist.
    }
    document.documentElement.lang = next === 'KY' ? 'ky' : 'ru';
  }, []);

  const value = useMemo(
    () => ({ lang, t: dictionaries[lang], locale: locales[lang], setLang }),
    [lang, setLang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

/**
 * Renders a subtree in a fixed language (e.g. the builder preview in the invitation's language)
 * while the language switch keeps changing the outer UI language.
 */
export function FixedLanguage({ lang, children }: { lang: Language; children: ReactNode }) {
  const outer = useI18n();
  const value = useMemo(
    () => ({ lang, t: dictionaries[lang], locale: locales[lang], setLang: outer.setLang }),
    [lang, outer.setLang],
  );
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useI18n must be used inside <LanguageProvider>');
  return ctx;
}
