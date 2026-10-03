import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { apiUrl, serverUrl } from './config';
import { t } from './i18n';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();
  const isApi = req.url.startsWith(apiUrl());
  const request = token && isApi ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(request).pipe(
    catchError((err: HttpErrorResponse) => {
      // Expired/invalid session (not a failed login attempt): send the user back to sign in.
      if (err.status === 401 && isApi && token && !req.url.includes('/auth/login')) {
        auth.logout('expired');
      }
      return throwError(() => err);
    }),
  );
};

/** Extracts a readable message from an API error. */
export function errorMessage(err: unknown, fallback?: string): string {
  const otherwise = fallback ?? t('common.somethingWrong');
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return t('errors.cannotReach', { url: serverUrl() });
    return err.error?.message ?? otherwise;
  }
  return otherwise;
}
