import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { apiUrl } from './config';
import { currentLang, I18nService, isLangCode, LangCode } from './i18n';
import { AuthResponse, User } from './models';

const TOKEN_KEY = 'mm_token';
const USER_KEY = 'mm_user';

function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function tokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' && payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private i18n = inject(I18nService);

  readonly token = signal<string | null>(null);
  readonly user = signal<User | null>(null);
  readonly isLoggedIn = computed(() => !!this.token());
  readonly isAdmin = computed(() => this.user()?.role === 'ADMIN');
  readonly currency = computed(() => this.user()?.currency ?? 'MAD');

  constructor() {
    const token = storageGet(TOKEN_KEY);
    const user = storageGet(USER_KEY);
    if (token && user && !tokenExpired(token)) {
      this.token.set(token);
      this.setUser(JSON.parse(user));
      // Deferred: the HTTP interceptor injects this service, so it can't be used while constructing.
      setTimeout(() => this.refreshMe());
    } else {
      this.clear();
    }
  }

  login(email: string, password: string) {
    return this.http.post<AuthResponse>(`${apiUrl()}/auth/login`, { email, password }).pipe(tap((r) => this.setSession(r)));
  }

  /** The language chosen before signing up becomes the account language. */
  register(body: { fullName: string; email: string; password: string; currency: string }) {
    return this.http
      .post<AuthResponse>(`${apiUrl()}/auth/register`, { ...body, language: currentLang() })
      .pipe(tap((r) => this.setSession(r)));
  }

  forgotPassword(email: string) {
    return this.http.post<{ message: string }>(`${apiUrl()}/auth/forgot-password`, { email });
  }

  validateResetToken(token: string) {
    return this.http.get<{ valid: boolean }>(`${apiUrl()}/auth/reset-password/validate`, { params: { token } });
  }

  resetPassword(token: string, password: string) {
    return this.http.post<{ message: string }>(`${apiUrl()}/auth/reset-password`, { token, password });
  }

  refreshMe() {
    this.http.get<User>(`${apiUrl()}/auth/me`).subscribe({ next: (u) => this.setUser(u), error: () => {} });
  }

  /** Stores the user; the account language (set here or in the mobile app) becomes the UI language. */
  setUser(user: User) {
    this.user.set(user);
    if (isLangCode(user.language)) this.i18n.set(user.language);
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {}
  }

  /** Switches the UI at once and saves the choice on the account so the AI and the mobile app follow. */
  changeLanguage(code: LangCode) {
    this.i18n.set(code);
    if (this.token()) {
      this.http.put<User>(`${apiUrl()}/profile/language`, { language: code }).subscribe({ next: (u) => this.setUser(u), error: () => {} });
    }
  }

  homeRoute(): string {
    return this.isAdmin() ? '/admin' : '/app/dashboard';
  }

  logout(reason?: string) {
    this.clear();
    this.router.navigate(['/login'], reason ? { queryParams: { reason } } : {});
  }

  private setSession(r: AuthResponse) {
    this.token.set(r.token);
    try {
      localStorage.setItem(TOKEN_KEY, r.token);
    } catch {}
    this.setUser(r.user);
  }

  private clear() {
    this.token.set(null);
    this.user.set(null);
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {}
  }
}
