// Cuenta de ejemplo que pidió el profesor, solo como placeholder del login; llega al compilar desde DEMO_ACCOUNT_EMAIL
// y DEMO_ACCOUNT_PASSWORD (scripts/build.mjs) y sin ellas queda vacía.
declare const DEMO_ACCOUNT_EMAIL: string | undefined;
declare const DEMO_ACCOUNT_PASSWORD: string | undefined;

export const demoAccount = {
  email: typeof DEMO_ACCOUNT_EMAIL === 'string' ? DEMO_ACCOUNT_EMAIL : '',
  password: typeof DEMO_ACCOUNT_PASSWORD === 'string' ? DEMO_ACCOUNT_PASSWORD : '',
};
