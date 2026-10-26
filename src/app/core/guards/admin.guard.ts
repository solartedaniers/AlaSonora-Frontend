import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserService } from '../services/user.service';
import { ProfileService } from '../services/profile.service';
import { LoggerService } from '../services/logger.service';

/** Bloqueo /admin a quien no tenga sesión activa y systemRole 'admin'. */
export const adminGuard: CanActivateFn = async () => {
  const userService = inject(UserService);
  const logger = inject(LoggerService);
  const profileService = inject(ProfileService);
  const router = inject(Router);

  if (!(await userService.isAuthenticated())) {
    return router.createUrlTree(['/login']);
  }

  try {
    const profile = await profileService.getMine();
    return profile.systemRole === 'admin' ? true : router.createUrlTree(['/dashboard']);
  } catch (error) {
    // Atrapo el rechazo de getMine(): sin esto la guardia quedaba colgada y la navegación se cancelaba sin aviso.
    logger.error('AdminGuard', 'could not verify the admin role', error);
    return router.createUrlTree(['/dashboard']);
  }
};
