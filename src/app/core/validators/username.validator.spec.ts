import { fakeAsync, tick } from '@angular/core/testing';
import { FormControl, ValidationErrors } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { usernameAvailableValidator, usernameValidators } from './username.validator';

describe('username validators', () => {
  const { minLength, maxLength, checkDebounceMs } = environment.username;

  describe('usernameValidators', () => {
    const errorsFor = (value: string) => new FormControl(value, usernameValidators).errors;

    it('accepts an alphanumeric name within the configured length', () => {
      expect(errorsFor('a1'.padEnd(minLength, 'b'))).toBeNull();
    });

    it('rejects names that are too short, too long or not alphanumeric', () => {
      expect(errorsFor('a'.repeat(minLength - 1))?.['minlength']).toBeTruthy();
      expect(errorsFor('a'.repeat(maxLength + 1))?.['maxlength']).toBeTruthy();
      expect(errorsFor('bird watcher')?.['pattern']).toBeTruthy();
    });
  });

  describe('usernameAvailableValidator', () => {
    const run = (validator: ReturnType<typeof usernameAvailableValidator>, control: FormControl) => {
      let result: ValidationErrors | null | undefined;
      (validator(control) as Promise<ValidationErrors | null>).then((errors) => (result = errors));
      tick(checkDebounceMs);
      return () => result;
    };

    it('marks a taken name after the debounce', fakeAsync(() => {
      const check = jasmine.createSpy('check').and.resolveTo({ available: false });
      const result = run(usernameAvailableValidator(check), new FormControl('owl'));
      tick();
      expect(check).toHaveBeenCalledOnceWith('owl');
      expect(result()).toEqual({ usernameTaken: true });
    }));

    it('skips the request for the current name, ignoring case', fakeAsync(() => {
      const check = jasmine.createSpy('check');
      const result = run(usernameAvailableValidator(check, () => 'Owl'), new FormControl('owl'));
      expect(check).not.toHaveBeenCalled();
      expect(result()).toBeNull();
    }));

    it('ignores a value that changed during the debounce', fakeAsync(() => {
      const check = jasmine.createSpy('check');
      const control = new FormControl('owl');
      const pending = usernameAvailableValidator(check)(control) as Promise<ValidationErrors | null>;
      control.setValue('owl2', { emitEvent: false });
      let result: ValidationErrors | null | undefined;
      pending.then((errors) => (result = errors));
      tick(checkDebounceMs);
      expect(check).not.toHaveBeenCalled();
      expect(result).toBeNull();
    }));

    it('does not block the form when the check fails', fakeAsync(() => {
      const check = jasmine.createSpy('check').and.rejectWith(new Error('offline'));
      const result = run(usernameAvailableValidator(check), new FormControl('owl'));
      tick();
      expect(result()).toBeNull();
    }));
  });
});
