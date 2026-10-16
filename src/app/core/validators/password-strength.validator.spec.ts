import { FormControl } from '@angular/forms';
import { PASSWORD_MIN_LENGTH, passwordStrengthValidator } from './password-strength.validator';

describe('passwordStrengthValidator', () => {
  const validate = (value: string | null) => passwordStrengthValidator(new FormControl(value));

  it('accepts a password that meets every rule', () => {
    expect(validate('A1'.padEnd(PASSWORD_MIN_LENGTH, 'x'))).toBeNull();
  });

  it('reports each unmet rule separately', () => {
    expect(validate('a'.repeat(PASSWORD_MIN_LENGTH))).toEqual({ noUppercase: true, noNumber: true });
    expect(validate('A1'.padEnd(PASSWORD_MIN_LENGTH - 1, 'x'))).toEqual({ minLength: true });
  });

  it('treats a null value as an empty password', () => {
    expect(validate(null)).toEqual({ minLength: true, noUppercase: true, noNumber: true });
  });
});
