import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ArNavigationHistory, COUNT_REPLACE_AS_PUSH } from './navigation-history';

@Component({ template: '' })
class Blank {}

describe('ArNavigationHistory', () => {
  let router: Router;
  let history: ArNavigationHistory;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '**', component: Blank }])],
    });
    router = TestBed.inject(Router);
    history = TestBed.inject(ArNavigationHistory);
  });

  it('cannot go back from the page the app was opened on', async () => {
    await router.navigateByUrl('/cartes');
    expect(history.canGoBack).toBe(false);
  });

  it('can go back after an in-app navigation', async () => {
    await router.navigateByUrl('/');
    await router.navigateByUrl('/cartes');
    expect(history.canGoBack).toBe(true);
  });

  it('ignores navigations that replace the current entry', async () => {
    await router.navigateByUrl('/cartes');
    await router.navigateByUrl('/cartes?source=uniques', { replaceUrl: true });
    expect(history.canGoBack).toBe(false);
  });

  it('counts a replaceUrl that reuses the drawer history entry', async () => {
    await router.navigateByUrl('/');
    await router.navigateByUrl('/cartes', { replaceUrl: true, info: COUNT_REPLACE_AS_PUSH });
    expect(history.canGoBack).toBe(true);
  });
});
