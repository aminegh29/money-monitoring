import { inject, Pipe, PipeTransform } from '@angular/core';
import { marked } from 'marked';
import { currentLocale, I18nService, t } from '../core/i18n';

// Amounts keep one format in every language ("1,234.50 MAD", like the AI texts); dates follow the language.
const numberFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatMoney(value: number | null | undefined, currency: string): string {
  return `${numberFormat.format(value ?? 0)} ${currency}`;
}

@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(value: number | null | undefined, currency = 'MAD'): string {
    return formatMoney(value, currency);
  }
}

/** Renders Markdown to HTML. Bind with [innerHTML], which Angular sanitizes. */
@Pipe({ name: 'markdown' })
export class MarkdownPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    // Escape raw HTML coming from the model, then let marked render the Markdown.
    const escaped = (value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
    return marked.parse(escaped, { async: false, breaks: true }) as string;
  }
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

/** Impure so it follows language changes. */
@Pipe({ name: 'timeAgo', pure: false })
export class TimeAgoPipe implements PipeTransform {
  private i18n = inject(I18nService);

  transform(value: string | null | undefined): string {
    this.i18n.lang();
    return timeAgo(value);
  }
}

@Pipe({ name: 'monthLabel', pure: false })
export class MonthLabelPipe implements PipeTransform {
  private i18n = inject(I18nService);

  transform(month: string, style: 'long' | 'short' = 'long'): string {
    this.i18n.lang();
    const [y, m] = month.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString(currentLocale(), { month: style, year: 'numeric' });
  }
}

/** "2026-10-03" → "Oct 3, 2026" in the current language. */
@Pipe({ name: 'date2', pure: false })
export class LocalDatePipe implements PipeTransform {
  private i18n = inject(I18nService);

  transform(iso: string | null | undefined, style: 'medium' | 'weekday' = 'medium'): string {
    this.i18n.lang();
    if (!iso) return '';
    const d = new Date(iso.slice(0, 10) + 'T00:00:00');
    return style === 'weekday'
      ? d.toLocaleDateString(currentLocale(), { weekday: 'short', day: 'numeric', month: 'short' })
      : d.toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
