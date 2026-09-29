import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AcNavigationHistory } from './navigation-history';

@Component({ template: '' })
class Blank {}

describe('AcNavigationHistory', () => {
  let router: Router;
  let history: AcNavigationHistory;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '**', component: Blank }])],
    });
    router = TestBed.inject(Router);
    history = TestBed.inject(AcNavigationHistory);
  });

  it('cannot go back from the page the app was opened on', async () => {
    await router.navigateByUrl('/decks');
    expect(history.canGoBack).toBe(false);
  });

  it('can go back after an in-app navigation', async () => {
    await router.navigateByUrl('/');
    await router.navigateByUrl('/decks');
    expect(history.canGoBack).toBe(true);
  });

  it('ignores navigations that replace the current entry', async () => {
    await router.navigateByUrl('/decks');
    await router.navigateByUrl('/decks?source=uniques', { replaceUrl: true });
    expect(history.canGoBack).toBe(false);
  });

});
