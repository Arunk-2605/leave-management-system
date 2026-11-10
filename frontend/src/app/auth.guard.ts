import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService, User } from './auth.service';
import { map, take } from 'rxjs';

export const AuthGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.currentUser$.pipe(
    take(1),
    map((user: User | null) => {
      // If neither user nor token exists, redirect to login
      if (!user && !authService.token) {
        router.navigate(['/login']);
        return false;
      }

      if (user) {
        const allowedRole = route.data['role'] as string | undefined;
        if (allowedRole && user.role !== allowedRole) {
          const userRole = user.role.toLowerCase();
          router.navigate([`/${userRole}`]);
          return false;
        }
      }

      return true;
    })
  );
};

export const authGuard = AuthGuard;
