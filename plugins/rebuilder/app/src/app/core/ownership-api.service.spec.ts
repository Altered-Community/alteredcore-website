import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { OwnershipApiService } from './ownership-api.service';

describe('OwnershipApiService', () => {
  const env = environment as { ownershipApiUrl: string };
  let http: HttpTestingController;
  let api: OwnershipApiService;

  beforeEach(() => {
    env.ownershipApiUrl = '/api/v1/services/ownership';
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    api = TestBed.inject(OwnershipApiService);
  });
  afterEach(() => {
    http.verify();
    env.ownershipApiUrl = '';
  });

  it('asks whether a deck waits for the default alt arts, and treats an error as no', async () => {
    const env2 = environment as { siteUrl: string };
    env2.siteUrl = '';
    const pending = lastValueFrom(api.pendingDefaults('d1'));
    const req = http.expectOne((r) => r.url === '/papi/ownership/alt-art-pending' && r.params.get('deck') === 'd1');
    req.flush({ pending: true });
    expect(await pending).toBe(true);
    const failed = lastValueFrom(api.pendingDefaults('d1'));
    http.expectOne((r) => r.url === '/papi/ownership/alt-art-pending').flush('no', { status: 401, statusText: 'Unauthorized' });
    expect(await failed).toBe(false);
  });

  it('tells the site a deck took its default alt arts', async () => {
    const done = lastValueFrom(api.clearPendingDefaults('d1'), { defaultValue: undefined });
    const req = http.expectOne('/papi/ownership/alt-art-pending');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toMatchObject({ deck: 'd1' });
    req.flush(null, { status: 204, statusText: 'No Content' });
    await done;
  });
});
