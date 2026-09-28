import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ALTERED_CORE } from '../host';
import { ArDensityService } from '../../ui/layout.services';
import { ArNavigationHistory } from '../../ui/nav';

/** Root of the embedded editor: no app bar, site menu or footer — the AlteredCore site draws them. */
@Component({
  selector: 'app-rebuilder-embed',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  templateUrl: './embed-app.html',
})
export class EmbedApp {
  constructor() {
    inject(ArDensityService);
    inject(ArNavigationHistory);
    // The site menu has one entry per section (Decks, Deck Builder): follow the client route.
    const host = inject(ALTERED_CORE);
    const route = inject(ActivatedRoute);
    inject(Router)
      .events.pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => {
        let r = route.snapshot;
        while (r.firstChild) r = r.firstChild;
        const nav = r.data['nav'] as string | undefined;
        host.setActiveNav?.(nav ? host.page.basePath + nav : null);
      });
  }
}
