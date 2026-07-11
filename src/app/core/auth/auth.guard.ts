import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  while (authService.isLoading()) {
    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  return authService.isAuthenticated ? true : router.parseUrl('/auth');
};
