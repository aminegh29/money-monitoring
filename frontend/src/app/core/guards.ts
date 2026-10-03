import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { isNative } from './config';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() ? true : inject(Router).createUrlTree(['/login']);
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return router.createUrlTree(['/login']);
  return auth.isAdmin() ? true : router.createUrlTree(['/app/dashboard']);
};

/** The marketing landing page only makes sense on the web; the mobile apps open on sign-in / dashboard. */
export const landingGuard: CanActivateFn = () => {
  if (!isNative) return true;
  const auth = inject(AuthService);
  return inject(Router).createUrlTree([auth.isLoggedIn() ? auth.homeRoute() : '/login']);
};

/** Login/register pages: already signed-in users go straight to their home page. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() ? inject(Router).createUrlTree([auth.homeRoute()]) : true;
};
