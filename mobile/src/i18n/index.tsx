import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { I18nManager } from 'react-native';
import ar from './ar';
import en from './en';
import es from './es';
import fr from './fr';
import it from './it';

export type LangCode = 'en' | 'fr' | 'ar' | 'es' | 'it';

export const LANGUAGES: { code: LangCode; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'ar', name: 'العربية', flag: '🇲🇦' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
];

const DICTS = { en, fr, ar, es, it };
/** Locale used for dates and month names. ar-MA keeps Western digits, like the amounts. */
const LOCALES: Record<LangCode, string> = { en: 'en-US', fr: 'fr-FR', ar: 'ar-MA', es: 'es-ES', it: 'it-IT' };
const LANG_KEY = 'mm_lang';

export function isLangCode(code: unknown): code is LangCode {
  return typeof code === 'string' && code in DICTS;
}

function deviceLanguage(): LangCode {
  try {
    const code = getLocales()[0]?.languageCode;
    return isLangCode(code) ? code : 'en';
  } catch {
    return 'en';
  }
}

// The active language lives at module level so plain functions (formatters, API errors) can translate too.
// Components re-render through I18nProvider when it changes.
let current: LangCode = deviceLanguage();

export function currentLang(): LangCode {
  return current;
}

export function currentLocale(): string {
  return LOCALES[current];
}

function lookup(dict: unknown, key: string): unknown {
  let node: unknown = dict;
  for (const part of key.split('.')) {
    if (node && typeof node === 'object' && part in node) node = (node as Record<string, unknown>)[part];
    else return undefined;
  }
  return node;
}

/** Translates a key such as "dashboard.pulse"; {placeholders} are filled from params. */
export function t(key: string, params?: Record<string, string | number>): string {
  let value = lookup(DICTS[current], key);
  if (typeof value !== 'string') value = lookup(en, key);
  if (typeof value !== 'string') return key;
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (match, name: string) => (params[name] !== undefined ? String(params[name]) : match));
}

/** Translates a key that holds a list (suggestions, CSV headers…). */
export function tList(key: string): string[] {
  const value = lookup(DICTS[current], key) ?? lookup(en, key);
  return Array.isArray(value) ? value : [];
}

/** Default categories are stored in English by the backend; custom ones are shown as typed. */
export function catName(name: string): string {
  const value = lookup(DICTS[current], `cat.${name}`);
  return typeof value === 'string' ? value : name;
}

/**
 * Flips the native layout for Arabic. React Native only applies the change after a reload,
 * so this returns true when the app must restart.
 */
export function applyDirection(code: LangCode): boolean {
  const rtl = code === 'ar';
  if (I18nManager.isRTL === rtl) return false;
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
  return true;
}

interface I18nValue {
  lang: LangCode;
  setLang: (code: LangCode) => void;
}

const I18nContext = createContext<I18nValue>({ lang: current, setLang: () => {} });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(current);

  const setLang = useCallback((code: LangCode) => {
    current = code;
    setLangState(code);
    AsyncStorage.setItem(LANG_KEY, code).catch(() => {});
  }, []);

  // The language chosen last time wins over the device language.
  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY)
      .then((saved) => {
        if (isLangCode(saved)) {
          current = saved;
          setLangState(saved);
          applyDirection(saved);
        } else {
          applyDirection(current);
        }
      })
      .catch(() => {});
  }, []);

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Re-renders the component when the language changes. */
export function useI18n() {
  return useContext(I18nContext);
}
