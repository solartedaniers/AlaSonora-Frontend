import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpParams, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserService } from '../services/user.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  const TOKEN = 'jwt-token';
  const api = environment.apiBaseUrl;
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    const user = jasmine.createSpyObj<UserService>('UserService', { getAccessToken: Promise.resolve(TOKEN) });
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: UserService, useValue: user },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  const authorizationFor = async (request: () => Promise<unknown>, url: string) => {
    const pending = request();
    await new Promise((resolve) => setTimeout(resolve));
    const call = backend.expectOne((req) => req.url === url);
    call.flush({});
    await pending;
    return call.request.headers.get('Authorization');
  };

  it('adds the bearer token to private backend calls', async () => {
    const url = `${api}/profile/me`;
    expect(await authorizationFor(() => firstValueFrom(http.get(url)), url)).toBe(`Bearer ${TOKEN}`);
  });

  it('skips the token on public reads, so an expired session cannot break them', async () => {
    const species = `${api}/species/1`;
    expect(await authorizationFor(() => firstValueFrom(http.get(species)), species)).toBeNull();
    const detections = `${api}/detections`;
    const params = new HttpParams().set('visibility', 'public');
    expect(await authorizationFor(() => firstValueFrom(http.get(detections, { params })), detections)).toBeNull();
  });

  it('keeps the token on the same path when it is not a public read', async () => {
    const detections = `${api}/detections`;
    expect(await authorizationFor(() => firstValueFrom(http.post(detections, {})), detections)).toBe(`Bearer ${TOKEN}`);
  });

  it('never sends the token to other origins', async () => {
    const external = 'https://example.org/data';
    expect(await authorizationFor(() => firstValueFrom(http.get(external)), external)).toBeNull();
  });
});
