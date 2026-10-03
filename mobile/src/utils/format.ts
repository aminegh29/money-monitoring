// Ported from frontend/src/app/shared/pipes.ts and the Months helper in core/ui.service.ts.
// Amounts keep one format in every language ("1,234.50 MAD", like the AI texts); dates follow the language.
import { currentLocale, t } from '@/i18n';

const numberFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatMoney(value: number | null | undefined, currency: string): string {
  return `${numberFormat.format(value ?? 0)} ${currency}`;
}

export function compact(v: number): string {
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(1) + 'k';
  return String(Math.round(v));
}

export function timeAgo(value: string | null | undefined): string {
  if (!value) return t('time.never');
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return t('time.justNow');
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t('time.minAgo', { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('time.hAgo', { n: hours });
  const days = Math.floor(hours / 24);
  if (days < 30) return t('time.dAgo', { n: days });
  return new Date(value).toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

/** Helpers for "YYYY-MM" month strings. */
export const Months = {
  current(): string {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  },
  shift(month: string, delta: number): string {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  },
  label(month: string, style: 'long' | 'short' = 'long'): string {
    const [y, m] = month.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString(currentLocale(), { month: style, year: 'numeric' });
  },
  /** Month name only ("October"). */
  name(month: string, style: 'long' | 'short' = 'long'): string {
    const [y, m] = month.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString(currentLocale(), { month: style });
  },
  today(): string {
    return Months.toIso(new Date());
  },
  /** A sensible default date for a new entry in the given month. */
  defaultDate(month: string): string {
    return month === Months.current() ? Months.today() : `${month}-01`;
  },
  /** "YYYY-MM-DD" n months from today. */
  addMonths(n: number): string {
    const d = new Date();
    d.setMonth(d.getMonth() + n);
    return Months.toIso(d);
  },
  toIso(d: Date): string {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  },
  fromIso(iso: string): Date {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  },
};
