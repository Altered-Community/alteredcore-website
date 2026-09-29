import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AccountActions } from './features/shared/account-actions/account-actions';
import { SiteMenuService } from './features/shared/site-menu/site-menu';
import { siteLinks } from './features/shared/site-links';
import { ArIconButton } from './ui/buttons';
import { ArBreakpointService, ArDensityService } from './ui/layout.services';
import { ArAppBar, ArNavigationHistory } from './ui/nav';

/**
 * Shell: the expanded app bar is global (≥ 768 px). Compact screens render their own
 * `ar-app-bar appearance="compact"` because title and actions change per screen.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ArAppBar, AccountActions, ArIconButton],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly bp = inject(ArBreakpointService);
  protected readonly menu = inject(SiteMenuService);
  protected readonly links = siteLinks();

  constructor() {
    inject(ArDensityService);
    inject(ArNavigationHistory);
  }
}
