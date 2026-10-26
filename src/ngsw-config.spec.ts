import swConfig from '../ngsw-config.json';
import { environment } from './environments/environment';

/** Convierto el glob como lo hace @angular/service-worker en dataGroups: "?" literal y sin anclar. */
function toPattern(glob: string): RegExp {
  const escaped = glob
    .split('/')
    .map((segment) => (segment === '**' ? '.*' : segment.replace(/[.+^${}()|[\]\\?]/g, '\\$&').replace(/\*/g, '[^/]*')))
    .join('\\/');
  return new RegExp(escaped);
}

describe('ngsw-config dataGroups', () => {
  const patterns = swConfig.dataGroups.flatMap((group) => group.urls.map(toPattern));
  const cached = (path: string) => patterns.some((pattern) => pattern.test(`${environment.apiBaseUrl}${path}`));

  it('only caches the public reads that the offline map and landing need', () => {
    expect(cached('/detections?visibility=public')).toBeTrue();
    expect(cached('/network-stats')).toBeTrue();
  });

  it('never caches anything that depends on the token', () => {
    for (const path of [
      '/ai/status',
      '/profile/me',
      '/notifications',
      '/notifications/read',
      '/detections/mine',
      '/detections/mine/stats?zone=x',
      '/detections/feed',
      '/detections/42',
      '/admin/users',
      '/usernames/availability?username=x',
    ]) {
      expect(cached(path)).withContext(path).toBeFalse();
    }
  });
});
