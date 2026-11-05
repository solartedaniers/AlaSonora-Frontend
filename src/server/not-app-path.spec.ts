import config from './not-app-paths.json';
import { NotAppPathFilter } from './not-app-path';

describe('NotAppPathFilter', () => {
  const filter = new NotAppPathFilter(config);

  it('rejects the paths that scanners ask for', () => {
    for (const path of [
      '/sftp-config.json',
      '/swagger.json',
      '/go.mod',
      '/security.txt',
      '/.well-known/security.txt',
      '/.env',
      '/.git/config',
      '/.aws/credentials',
      '/api/.env',
      '/wp-admin',
      '/wp-admin/setup-config.php',
      '/WP-LOGIN.PHP',
      '/cgi-bin/luci',
      '/actuator/health',
      '/index.php',
      '/backup.zip',
    ]) {
      expect(filter.matches(path)).withContext(path).toBeTrue();
    }
  });

  it('lets every route of the app reach Angular, including its own 404 page', () => {
    for (const path of [
      '/',
      '/map',
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password',
      '/dashboard',
      '/record',
      '/result/3f6c2b1e-9a4d-4c1b-8e2f-1a2b3c4d5e6f',
      '/photo-id',
      '/history',
      '/profile',
      '/admin',
      '/map/',
      '/mapa',
      '/.well-known',
    ]) {
      expect(filter.matches(path)).withContext(path).toBeFalse();
    }
  });
});
