import { APP_BASE_HREF, LocationStrategy } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { deckShareUrl } from './share-url';

describe('deckShareUrl', () => {
  it('builds the link under the base href of the site page', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: APP_BASE_HREF, useValue: '/alteredcore/pages/rebuilder/' }] });
    const url = deckShareUrl(TestBed.inject(Router), TestBed.inject(LocationStrategy), '01a0-d3a0', 'https://example.org');
    expect(url).toBe('https://example.org/alteredcore/pages/rebuilder/decks/01a0-d3a0');
  });
});
