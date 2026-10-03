import { inject, Injectable, Pipe, PipeTransform, signal } from '@angular/core';
import ar from '../i18n/ar';
import en from '../i18n/en';
import es from '../i18n/es';
import fr from '../i18n/fr';
import it from '../i18n/it';
import webAr from '../i18n/web-ar';
import webEn from '../i18n/web-en';
import webEs from '../i18n/web-es';
import webFr from '../i18n/web-fr';
import webIt from '../i18n/web-it';

export type LangCode = 'en' | 'fr' | 'ar' | 'es' | 'it';

export const LANGUAGES: { code: LangCode; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'ar', name: 'العربية', flag: '🇲🇦' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
];

// Texts shared with the Expo app, plus the web-only ones under "web".
const DICTS: Record<LangCode, object> = {
  en: { ...en, web: webEn },
  fr: { ...fr, web: webFr },
  ar: { ...ar, web: webAr },
  es: { ...es, web: webEs },
  it: { ...it, web: webIt },
};
/** Locale for dates and month names. ar-MA keeps Western digits, like the amounts. */
const LOCALES: Record<LangCode, string> = { en: 'en-US', fr: 'fr-FR', ar: 'ar-MA', es: 'es-ES', it: 'it-IT' };
const LANG_KEY = 'mm_lang';

export function isLangCode(code: unknown): code is LangCode {
  return typeof code === 'string' && code in DICTS;
}

function initialLang(): LangCode {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (isLangCode(saved)) return saved;
  } catch {}
  const browser = (navigator.language ?? 'en').slice(0, 2);
  return isLangCode(browser) ? browser : 'en';
}

// Module-level so plain functions (services, chart callbacks) can translate; templates use the pipes below.
let current: LangCode = initialLang();

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
  if (typeof value !== 'string') value = lookup(DICTS.en, key);
  if (typeof value !== 'string') return key;
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (match, name: string) => (params[name] !== undefined ? String(params[name]) : match));
}

/** Translates a key that holds a list. */
export function tList(key: string): string[] {
  const value = lookup(DICTS[current], key) ?? lookup(DICTS.en, key);
  return Array.isArray(value) ? value : [];
}

/** Default categories are stored in English by the backend; custom ones are shown as typed. */
export function catName(name: string): string {
  const value = lookup(DICTS[current], `cat.${name}`);
  return typeof value === 'string' ? value : name;
}

function applyToDocument(code: LangCode) {
  document.documentElement.lang = code;
  document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr';
}

@Injectable({ providedIn: 'root' })
export class I18nService {
  /** Read it in a template or computed() to re-render when the language changes. */
  readonly lang = signal<LangCode>(current);

  constructor() {
    applyToDocument(current);
  }

  set(code: LangCode) {
    if (code === current) return;
    current = code;
    this.lang.set(code);
    applyToDocument(code);
    try {
      localStorage.setItem(LANG_KEY, code);
    } catch {}
  }
}

/** {{ 'dashboard.pulse' | t }} or {{ 'goals.monthsLeft' | t: { n: 3 } }} */
@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private i18n = inject(I18nService);

  transform(key: string, params?: Record<string, string | number>): string {
    this.i18n.lang();
    return t(key, params);
  }
}

/** {{ category.name | cat }}: translated name of a default category. */
@Pipe({ name: 'cat', pure: false })
export class CategoryNamePipe implements PipeTransform {
  private i18n = inject(I18nService);

  transform(name: string | null | undefined): string {
    this.i18n.lang();
    return name ? catName(name) : '';
  }
}
