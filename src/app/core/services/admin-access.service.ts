import { Injectable, effect, inject, signal } from '@angular/core';
import { UserService } from './user.service';
import { ProfileService } from './profile.service';
import { LoggerService } from './logger.service';

/** Expone si la sesión activa tiene systemRole 'admin', reactivo a login/logout, para condicionar la UI (p. ej. el link de navegación). */
@Injectable({ providedIn: 'root' })
export class AdminAccessService {
  private readonly user = inject(UserService);
  private readonly logger = inject(LoggerService);
  private readonly profileService = inject(ProfileService);

  readonly isAdmin = signal(false);

  constructor() {
    effect(() => {
      if (!this.user.currentUser()) {
        this.isAdmin.set(false);
        return;
      }
      // Registro el fallo de GET /api/profile/me: antes isAdmin quedaba en false sin rastro en consola.
      this.profileService
        .getMine()
        .then((profile) => this.isAdmin.set(profile.systemRole === 'admin'))
        .catch((error) => {
          this.logger.error('AdminAccess', 'could not load the profile to check the admin role', error);
          this.isAdmin.set(false);
        });
    });
  }
}
