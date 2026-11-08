import { localeOfPath, localizedPath, type SiteLocale } from '@chakyruu/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useInRouterContext, useLocation, useNavigate } from 'react-router';
import type { Language } from '../api/types';
import { dictionaries, locales, type Dict } from './dict';

const STORAGE_KEY = 'chakyruu.lang';

interface LanguageContextValue {
  lang: Language;
  t: Dict;
  locale: string;
  /** "ky" / "ru": the URL prefix of public pages in this language. */
  siteLocale: SiteLocale;
  /** Path of a public page in the current language: localePath('templates') → "/ky/templates". */
  localePath: (page: string) => string;
  setLang: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const toSiteLocale = (lang: Language): SiteLocale => (lang === 'RU' ? 'ru' : 'ky');
const toLanguage = (locale: SiteLocale): Language => (locale === 'ru' ? 'RU' : 'KY');

function readStoredLanguage(): Language {
  // The server render has no storage: public pages take their language from the URL anyway.
  if (typeof window === 'undefined') return 'KY';
  try {
    return localStorage.getItem(STORAGE_KEY) === 'RU' ? 'RU' : 'KY';
  } catch {
    return 'KY';
  }
}

function storeLanguage(lang: Language): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Private mode / storage disabled — language just won't persist.
  }
}

function buildValue(lang: Language, setLang: (lang: Language) => void): LanguageContextValue {
  const siteLocale = toSiteLocale(lang);
  return {
    lang,
    t: dictionaries[lang],
    locale: locales[lang],
    siteLocale,
    localePath: (page) => localizedPath(siteLocale, page),
    setLang,
  };
}

/** Keeps <html lang> in step with the page language (screen readers, Google). */
function useDocumentLanguage(lang: Language): void {
  useEffect(() => {
    document.documentElement.lang = toSiteLocale(lang);
  }, [lang]);
}

/**
 * Public pages (/ky/…, /ru/…) take their language from the URL, so each language has its own
 * indexable address; switching language opens the same page under the other prefix.
 * App pages (cabinet, builder) keep the language the person picked last.
 */
function RoutedLanguageProvider({ children }: { children: ReactNode }) {
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();
  const urlLocale = localeOfPath(pathname);
  const [stored, setStored] = useState<Language>(readStoredLanguage);
  const lang = urlLocale ? toLanguage(urlLocale) : stored;

  const setLang = useCallback(
    (next: Language) => {
      setStored(next);
      storeLanguage(next);
      if (urlLocale && toLanguage(urlLocale) !== next) {
        navigate(`/${toSiteLocale(next)}${pathname.slice(urlLocale.length + 1) || '/'}${search}${hash}`);
      }
    },
    [urlLocale, pathname, search, hash, navigate],
  );
  useDocumentLanguage(lang);
  const value = useMemo(() => buildValue(lang, setLang), [lang, setLang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

/** Outside a router (isolated component tests): the stored language only. */
function StoredLanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(readStoredLanguage);
  const setLang = useCallback((next: Language) => {
    setLangState(next);
    storeLanguage(next);
  }, []);
  useDocumentLanguage(lang);
  const value = useMemo(() => buildValue(lang, setLang), [lang, setLang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  return useInRouterContext() ? <RoutedLanguageProvider>{children}</RoutedLanguageProvider> : <StoredLanguageProvider>{children}</StoredLanguageProvider>;
}

/**
 * Renders a subtree in a fixed language (e.g. the builder preview in the invitation's language)
 * while the language switch keeps changing the outer UI language.
 */
export function FixedLanguage({ lang, children }: { lang: Language; children: ReactNode }) {
  const outer = useI18n();
  const value = useMemo(() => buildValue(lang, outer.setLang), [lang, outer.setLang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useI18n must be used inside <LanguageProvider>');
  return ctx;
}
