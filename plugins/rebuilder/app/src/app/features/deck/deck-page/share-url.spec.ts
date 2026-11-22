import { APP_BASE_HREF, LocationStrategy } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Router, UrlSerializer, provideRouter } from '@angular/router';
import { LegacyUrlSerializer } from '../../../embed/legacy-url.serializer';
import { deckShareUrl } from './share-url';

describe('deckShareUrl', () => {
  it('builds the site deck page link under the base href', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: APP_BASE_HREF, useValue: '/alteredcore/pages/' },
        { provide: UrlSerializer, useValue: new LegacyUrlSerializer() },
      ],
    });
    const url = deckShareUrl(TestBed.inject(Router), TestBed.inject(LocationStrategy), '01a0-d3a0', 'https://example.org');
    expect(url).toBe('https://example.org/alteredcore/pages/deck?id=01a0-d3a0');
  });
});
