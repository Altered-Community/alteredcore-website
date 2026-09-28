import { Observable, firstValueFrom, of, throwError } from 'rxjs';
import { SiteNavPreloading } from './site-nav-preloading';

describe('SiteNavPreloading', () => {
  it('preloads the menu destinations', async () => {
    for (const path of ['', 'cartes', 'decks', 'login']) {
      const strategy = new SiteNavPreloading();
      const load = vi.fn(() => of(path));
      await firstValueFrom(strategy.preload({ path }, load));
      expect(load).toHaveBeenCalledOnce();
    }
  });

  it('leaves the editor, a deck and the design system lazy', async () => {
    const strategy = new SiteNavPreloading();
    for (const path of ['decks/new', 'decks/:id', 'decks/:id/edit', '_ds', '**']) {
      const load = vi.fn(() => of(path));
      await firstValueFrom(strategy.preload({ path }, load));
      expect(load).not.toHaveBeenCalled();
    }
  });

  it('swallows a failed preload so the next route still loads', async () => {
    const strategy = new SiteNavPreloading();
    const load = vi.fn(() => throwError(() => new Error('chunk')));
    await expect(firstValueFrom(strategy.preload({ path: 'cartes' }, load))).resolves.toBeNull();
  });

  it('loads Cartes before starting Decks', async () => {
    const strategy = new SiteNavPreloading();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let decksStarted = false;
    const cartesDone = firstValueFrom(
      strategy.preload(
        { path: 'cartes' },
        () =>
          new Observable<null>((subscriber) => {
            void gate.then(() => {
              subscriber.next(null);
              subscriber.complete();
            });
          }),
      ),
    );
    const decksDone = firstValueFrom(
      strategy.preload({ path: 'decks' }, () => {
        decksStarted = true;
        return of('decks');
      }),
    );
    await Promise.resolve();
    expect(decksStarted).toBe(false);
    release();
    await cartesDone;
    await decksDone;
    expect(decksStarted).toBe(true);
  });
});
