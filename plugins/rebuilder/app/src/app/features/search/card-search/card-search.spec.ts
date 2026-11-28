import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthSession } from '../../../core/auth-session';
import { flushFormats } from '../../../core/formats.testing';
import { ALTERED_CORE, type AlteredCoreHost } from '../../../embed/host';
import { CardSearchStore } from '../card-search.store';
import { CardSearch } from './card-search';

function makeAuth(loggedIn: boolean): AuthSession {
  const isLoggedIn = signal(loggedIn).asReadonly();
  const username = signal(loggedIn ? 'alice' : null).asReadonly();
  return {
    token: signal<string | null>(null).asReadonly(),
    isLoggedIn,
    username,
    sessionRestoring: signal(false).asReadonly(),
    sessionNotice: signal<string | null>(null).asReadonly(),
    ensureFresh: () => of(undefined),
    refresh: () => of(false),
  };
}

describe('CardSearch tabs parity (browse & builder modes)', () => {
  const origResizeObserver = globalThis.ResizeObserver;

  beforeEach(() => {
    if (!globalThis.ResizeObserver) {
      globalThis.ResizeObserver = class {
        observe(): void {
          /* noop */
        }
        unobserve(): void {
          /* noop */
        }
        disconnect(): void {
          /* noop */
        }
      };
    }
  });

  afterEach(() => {
    globalThis.ResizeObserver = origResizeObserver;
  });

  async function setup(opts: { loggedIn: boolean; browse: boolean; url?: string; hostServices?: AlteredCoreHost['services'] }) {
    const providers: unknown[] = [
      CardSearchStore,
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([{ path: '**', component: CardSearch }]),
      { provide: AuthSession, useValue: makeAuth(opts.loggedIn) },
    ];
    if (opts.hostServices) {
      providers.push({
        provide: ALTERED_CORE,
        useValue: { services: opts.hostServices } as Partial<AlteredCoreHost>,
      });
    }
    TestBed.configureTestingModule({
      imports: [CardSearch],
      providers: providers as never[],
    });
    const router = TestBed.inject(Router);
    await router.navigateByUrl(opts.url ?? '/');
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(CardSearch);
    fixture.componentRef.setInput('browse', opts.browse);
    if (!opts.browse) {
      fixture.componentRef.setInput('faction', 'AX');
      fixture.componentRef.setInput('format', 'frontier');
    }
    fixture.detectChanges();
    flushFormats(http);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const tabs = () =>
      [...el.querySelectorAll<HTMLButtonElement>('ac-tabs button[role=tab]')].map((b) => ({
        label: b.textContent?.trim() ?? '',
        disabled: b.disabled,
        selected: b.getAttribute('aria-selected') === 'true',
      }));
    const cleanup = () => {
      http.match(() => true).forEach((r) => {
        if (!r.cancelled) r.flush({ iter: { total: 0 }, cards: [], artists: [] });
      });
      fixture.destroy();
    };
    return { fixture, router, http, el, tabs, cleanup };
  }

  for (const mode of [
    { name: 'browse (/pages/cards)', browse: true },
    { name: 'builder (/pages/deckbuilder)', browse: false },
  ]) {
    it(`${mode.name}: when logged out, keeps all 3 account tabs (Collection, Ownership, Favorites) visible and disabled`, async () => {
      const { tabs, el, cleanup } = await setup({ loggedIn: false, browse: mode.browse });
      expect(tabs()).toEqual([
        { label: 'Toutes les cartes', disabled: false, selected: true },
        { label: 'Collection physique', disabled: true, selected: false },
        { label: 'Propriété numérique', disabled: true, selected: false },
        { label: 'Favoris', disabled: true, selected: false },
      ]);

      // Clicking any disabled account tab never switches away from Toutes les cartes
      const btns = el.querySelectorAll<HTMLButtonElement>('ac-tabs button[role=tab]');
      btns[1].click();
      btns[2].click();
      btns[3].click();
      expect(tabs()[0].selected).toBe(true);
      cleanup();
    });

    it(`${mode.name}: when logged out, direct ?source=favorites|collection|owned falls back to Toutes les cartes`, async () => {
      for (const qs of ['?source=favorites', '?source=collection', '?source=owned', '?tab=favoris']) {
        TestBed.resetTestingModule();
        const { tabs, cleanup } = await setup({ loggedIn: false, browse: mode.browse, url: `/${qs}` });
        expect(tabs()[0]).toEqual({ label: 'Toutes les cartes', disabled: false, selected: true });
        cleanup();
      }
    });

    it(`${mode.name}: when logged in, enables all 4 tabs in canonical standard order`, async () => {
      const { tabs, cleanup } = await setup({ loggedIn: true, browse: mode.browse });
      expect(tabs()).toEqual([
        { label: 'Toutes les cartes', disabled: false, selected: true },
        { label: 'Collection physique', disabled: false, selected: false },
        { label: 'Propriété numérique', disabled: false, selected: false },
        { label: 'Favoris', disabled: false, selected: false },
      ]);
      cleanup();
    });
  }

  it('respects host service availability when logged in (disabled when service absent)', async () => {
    const { tabs, cleanup } = await setup({
      loggedIn: true,
      browse: true,
      hostServices: { cards: 'https://cards.example', ownership: '/api/v1/services/ownership' },
    });
    expect(tabs()).toEqual([
      { label: 'Toutes les cartes', disabled: false, selected: true },
      { label: 'Collection physique', disabled: true, selected: false },
      { label: 'Propriété numérique', disabled: false, selected: false },
      { label: 'Favoris', disabled: false, selected: false },
    ]);
    cleanup();
  });
});
