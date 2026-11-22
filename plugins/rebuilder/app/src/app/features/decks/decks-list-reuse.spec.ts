import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, RouterOutlet, provideRouter, RouteReuseStrategy } from '@angular/router';
import { DecksListReuseStrategy, isDecksListUrl } from './decks-list-reuse';

@Component({ imports: [RouterOutlet], template: '<router-outlet />' })
class Host {}

@Component({ template: 'list' })
class List {
  marker = '';
}

@Component({ template: 'deck' })
class Deck {}

describe('isDecksListUrl', () => {
  it('matches only the list', () => {
    expect(isDecksListUrl('/decks')).toBe(true);
    expect(isDecksListUrl('/decks?tab=community')).toBe(true);
    expect(isDecksListUrl('/decks/new')).toBe(false);
    expect(isDecksListUrl('/decks/abc')).toBe(false);
    expect(isDecksListUrl('/decks/abc/edit')).toBe(false);
  });
});

describe('DecksListReuseStrategy', () => {
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: RouteReuseStrategy, useClass: DecksListReuseStrategy },
        provideRouter([
          { path: 'decks', component: List },
          { path: 'decks/:id', component: Deck },
        ]),
      ],
    });
    router = TestBed.inject(Router);
  });

  it('reattaches the same list after opening a deck and coming back', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await router.navigateByUrl('/decks?tab=community');
    fixture.detectChanges();
    const first = fixture.debugElement.query(By.directive(List)).componentInstance as List;
    first.marker = 'kept';

    await router.navigateByUrl('/decks/community-deck');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.directive(List))).toBeNull();

    await router.navigateByUrl('/decks?tab=community');
    fixture.detectChanges();
    const again = fixture.debugElement.query(By.directive(List)).componentInstance as List;
    expect(again).toBe(first);
    expect(again.marker).toBe('kept');
  });

  it('does not reuse a community list when the URL is Mes decks', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await router.navigateByUrl('/decks?tab=community');
    fixture.detectChanges();
    const first = fixture.debugElement.query(By.directive(List)).componentInstance as List;

    await router.navigateByUrl('/decks/community-deck');
    fixture.detectChanges();
    await router.navigateByUrl('/decks');
    fixture.detectChanges();
    const mine = fixture.debugElement.query(By.directive(List)).componentInstance as List;
    expect(mine).not.toBe(first);
  });
});
