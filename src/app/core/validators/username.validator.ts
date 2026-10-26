import { AbstractControl, AsyncValidatorFn, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { environment } from '../../../environments/environment';

const { minLength, maxLength, pattern, checkDebounceMs } = environment.username;

/** Formato del nombre de usuario: obligatorio, alfanumérico y con largo configurable. */
export const usernameValidators: ValidatorFn[] = [
  Validators.required,
  Validators.minLength(minLength),
  Validators.maxLength(maxLength),
  Validators.pattern(pattern),
];

/**
 * Pregunto al backend si el nombre está libre; current evita marcar el propio al editar y, si falla, no bloqueo:
 * el backend valida otra vez al guardar.
 */
export function usernameAvailableValidator(
  check: (username: string) => Promise<{ available: boolean }>,
  current: () => string = () => ''
): AsyncValidatorFn {
  return async (control: AbstractControl): Promise<ValidationErrors | null> => {
    const value = String(control.value ?? '').trim();
    if (!value || value.toLowerCase() === current().toLowerCase()) return null;
    await new Promise((resolve) => setTimeout(resolve, checkDebounceMs));
    if (value !== String(control.value ?? '').trim()) return null;
    try {
      const { available } = await check(value);
      return available ? null : { usernameTaken: true };
    } catch {
      return null;
    }
  };
}
