import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

export function authGuard() {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }
  if (auth.isSessionExpired()) {
    auth.logout();
    return router.createUrlTree(['/login'], { queryParams: { expired: '1' } });
  }
  return true;
}

export function adminGuard() {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }
  if (auth.isSessionExpired()) {
    auth.logout();
    return router.createUrlTree(['/login'], { queryParams: { expired: '1' } });
  }
  if (!auth.isAdmin()) {
    return router.createUrlTree(['/empleados']);
  }
  return true;
}

export function loginGuard() {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated() && !auth.isSessionExpired()) {
    return router.createUrlTree(['/']);
  }
  if (auth.isAuthenticated()) {
    auth.logout();
  }
  return true;
}
