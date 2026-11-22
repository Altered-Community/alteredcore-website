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

  it('saves a family’s default alt arts (« partout ») on the ownership service', async () => {
    const saved = lastValueFrom(api.setAltArtPreference({ familyId: 4, faction: 'AX', rarity: 'C' }, ['ALT_CORE_A_AX_04_C']), { defaultValue: undefined });
    const req = http.expectOne('/api/v1/services/ownership/api/alt-arts/preferences');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ familyId: 4, faction: 'AX', rarity: 'C', slotReferences: ['ALT_CORE_A_AX_04_C'] });
    req.flush(null);
    await saved;
  });
});
