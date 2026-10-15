// Cuenta de ejemplo que pidió el profesor: solo se muestra como placeholder en el login. Llega al compilar
// desde DEMO_ACCOUNT_EMAIL y DEMO_ACCOUNT_PASSWORD (scripts/build.mjs las inyecta con --define); sin ellas
// queda vacía y el login usa sus placeholders genéricos.
declare const DEMO_ACCOUNT_EMAIL: string | undefined;
declare const DEMO_ACCOUNT_PASSWORD: string | undefined;

export const demoAccount = {
  email: typeof DEMO_ACCOUNT_EMAIL === 'string' ? DEMO_ACCOUNT_EMAIL : '',
  password: typeof DEMO_ACCOUNT_PASSWORD === 'string' ? DEMO_ACCOUNT_PASSWORD : '',
};
