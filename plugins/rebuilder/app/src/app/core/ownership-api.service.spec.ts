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

  it('reads the « Global » alt-art mode, and treats an error as « par deck »', async () => {
    const global = lastValueFrom(api.globalAltArts());
    http.expectOne('/api/v1/services/ownership/api/alt-arts/preference-mode').flush({ mode: 'Global' });
    expect(await global).toBe(true);
    const failed = lastValueFrom(api.globalAltArts());
    http.expectOne('/api/v1/services/ownership/api/alt-arts/preference-mode').flush('no', { status: 500, statusText: 'Error' });
    expect(await failed).toBe(false);
  });
});
