import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, NavigationStart, Router, RouterOutlet, type Route } from '@angular/router';
import { ALTERED_CORE } from '../host';
import { AcNavigationHistory } from '../../ui/nav';

/** Root of the embedded editor: no app bar, site menu or footer — the AlteredCore site draws them. */
@Component({
  selector: 'app-rebuilder-embed',
  imports: [RouterOutlet],
  templateUrl: './embed-app.html',
})
export class EmbedApp {
  constructor() {
    inject(AcNavigationHistory);
    const host = inject(ALTERED_CORE);
    const route = inject(ActivatedRoute);
    // The page shown: its component (a deck's tabs, its editor's views share one) and its deck.
    let page: { component: Route['loadComponent']; id: unknown } | null = null;
    let popstate = false;
    inject(Router)
      .events.pipe(takeUntilDestroyed())
      .subscribe((e) => {
        if (e instanceof NavigationStart) popstate = e.navigationTrigger === 'popstate';
        if (!(e instanceof NavigationEnd)) return;
        let r = route.snapshot;
        while (r.firstChild) r = r.firstChild;
        // A page opened from another starts at its top: the window would keep the scroll of the page left (a deck
        // opened from far down the list). Back and forward leave it to the browser; the decks list puts its own back.
        const next = { component: r.routeConfig?.loadComponent, id: r.params['id'] };
        if (page && (next.component !== page.component || next.id !== page.id) && !popstate) window.scrollTo({ top: 0, behavior: 'instant' });
        page = next;
        // The site menu entry of the plugin stays current on every client route that declares it.
        const nav = r.data['nav'] as string | undefined;
        host.setActiveNav?.(nav ? host.page.basePath + nav : null);
      });
  }
}
