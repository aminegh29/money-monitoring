import { Injectable, signal } from '@angular/core';
import { currentLocale } from './i18n';
import { Native } from './native';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  readonly toasts = signal<Toast[]>([]);

  show(kind: ToastKind, title: string, message?: string, timeout = 4500) {
    const toast = { id: this.nextId++, kind, title, message };
    this.toasts.update((t) => [...t, toast].slice(-4));
    setTimeout(() => this.dismiss(toast.id), timeout);
  }

  success(title: string, message?: string) {
    this.show('success', title, message);
  }

  error(title: string, message?: string) {
    this.show('error', title, message, 6000);
  }

  info(title: string, message?: string) {
    this.show('info', title, message);
  }

  warning(title: string, message?: string) {
    this.show('warning', title, message, 7000);
  }

  dismiss(id: number) {
    this.toasts.update((t) => t.filter((x) => x.id !== id));
  }
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<'light' | 'dark'>(this.initial());

  constructor() {
    this.apply(this.theme());
  }

  toggle() {
    const next = this.theme() === 'light' ? 'dark' : 'light';
    this.theme.set(next);
    this.apply(next);
    try {
      localStorage.setItem('mm_theme', next);
    } catch {}
  }

  private initial(): 'light' | 'dark' {
    try {
      const saved = localStorage.getItem('mm_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}
    return 'dark'; // the neon theme is designed dark-first
  }

  private apply(theme: 'light' | 'dark') {
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#04050d' : '#eef0fb');
    Native.setStatusBarTheme(theme);
  }
}

/** Helpers for "YYYY-MM" month strings. */
export const Months = {
  current(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  },
  shift(month: string, delta: number): string {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
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
  /** "YYYY-MM-DD" n months from today. */
  addMonths(n: number): string {
    const d = new Date();
    d.setMonth(d.getMonth() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },
  today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },
  /** A sensible default date for a new entry in the given month. */
  defaultDate(month: string): string {
    return month === Months.current() ? Months.today() : `${month}-01`;
  },
};
