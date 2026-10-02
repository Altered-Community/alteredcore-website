import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { OwnershipApiService, mergeAltArtLines } from './ownership-api.service';

describe('mergeAltArtLines', () => {
  it('flattens the lines and sums repeated references', () => {
    expect(
      mergeAltArtLines([
        [{ reference: 'ALT_A_ALT', quantity: 2 }, { reference: 'ALT_A', quantity: 1 }],
        [{ reference: 'ALT_A', quantity: 2 }],
      ]),
    ).toEqual([
      { cardReference: 'ALT_A_ALT', quantity: 2 },
      { cardReference: 'ALT_A', quantity: 3 },
    ]);
  });

  it('is null without usable lines', () => {
    expect(mergeAltArtLines(undefined)).toBeNull();
    expect(mergeAltArtLines([[{ quantity: 1 }]])).toBeNull();
  });
});

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

  it('reads the « Global » mode, and treats an error as per-deck', async () => {
    const global = lastValueFrom(api.globalAltArts());
    http.expectOne('/api/v1/services/ownership/api/alt-arts/preference-mode').flush({ mode: 'Global' });
    expect(await global).toBe(true);
    const failed = lastValueFrom(api.globalAltArts());
    http.expectOne('/api/v1/services/ownership/api/alt-arts/preference-mode').flush('down', { status: 502, statusText: 'Bad Gateway' });
    expect(await failed).toBe(false);
  });

  it('sends the cards as reference / quantity, and keeps them on an error', async () => {
    const cards = [{ cardReference: 'ALT_A', quantity: 3 }];
    const applied = lastValueFrom(api.applyAltArts(cards));
    const req = http.expectOne('/api/v1/services/ownership/api/alt-arts/apply-to-deck');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual([{ reference: 'ALT_A', quantity: 3 }]);
    req.flush({ lines: [[{ reference: 'ALT_A_ALT', quantity: 3 }]] });
    expect(await applied).toEqual([{ cardReference: 'ALT_A_ALT', quantity: 3 }]);
    const kept = lastValueFrom(api.applyAltArts(cards));
    http.expectOne('/api/v1/services/ownership/api/alt-arts/apply-to-deck').flush('no', { status: 500, statusText: 'Error' });
    expect(await kept).toBe(cards);
  });
});
