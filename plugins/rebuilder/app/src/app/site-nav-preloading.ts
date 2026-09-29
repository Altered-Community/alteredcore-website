import { Service } from '@angular/core';
import { type PreloadingStrategy, type Route } from '@angular/router';
import { Observable, firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * ☰ destinations. Loaded after the first navigation so a tap does not pay a
 * lazy-chunk waterfall (route chunk, then its static imports, one round trip each).
 * Cartes and Decks run one after another: a tap to Cartes must not wait behind the
 * Decks graph. Editor and deck consultation stay lazy.
 */
const PRELOAD_PATHS = new Set(['cartes', 'decks']);

@Service()
export class SiteNavPreloading implements PreloadingStrategy {
  /** Serial so the router’s parallel `preload()` calls don’t fetch every graph at once. */
  private tail: Promise<void> = Promise.resolve();

  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    if (!PRELOAD_PATHS.has(route.path ?? '')) return of(null);
    return new Observable((subscriber) => {
      let cancelled = false;
      this.tail = this.tail
        .then(async () => {
          if (cancelled) return;
          await firstValueFrom(load().pipe(catchError(() => of(null))));
        })
        .then(() => {
          if (cancelled) return;
          subscriber.next(null);
          subscriber.complete();
        });
      return () => {
        cancelled = true;
      };
    });
  }
}
