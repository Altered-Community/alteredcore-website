import { ChangeDetectionStrategy, Component, Injectable, InjectionToken, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { ArIcon } from '../../../ui/icon';
import { COUNT_REPLACE_AS_PUSH } from '../../../ui/nav/navigation-history';
import { ArOverlayRef, ArOverlayService } from '../../../ui/overlay';
import { type ArNavLink } from '../../../ui/nav';
import { siteLinks } from '../site-links';

/** Compact site menu (left drawer opened by the ☰ button). */
@Component({
  selector: 'app-site-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ArIcon],
  host: { class: 'ar-overlay-content' },
  templateUrl: './site-menu.html',
  styleUrl: './site-menu.scss',
})
export class SiteMenu {
  protected readonly ref = inject(ArOverlayRef);
  private readonly overlays = inject(ArOverlayService);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly links = siteLinks();

  protected isActive(l: ArNavLink): boolean {
    const path = this.router.url.split(/[?#]/)[0];
    return path === l.route || (!l.exact && path.startsWith(`${l.route}/`));
  }

  /**
   * Navigate on the tap. The drawer pushed a history entry; `yieldHistoryToNavigation` lets this
   * `replaceUrl` navigation reuse it, so we don't `history.back()` (that pop would cancel the
   * route) and we don't wait for the entry to disappear before loading the page.
   */
  protected go(event: MouseEvent, route: string): void {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    const current = this.router.url.split('#')[0];
    if (current === route) {
      this.ref.close();
      return;
    }
    this.overlays.yieldHistoryToNavigation();
    void this.router.navigateByUrl(route, { replaceUrl: true, info: COUNT_REPLACE_AS_PUSH });
    // Same path with a different query (Decks vs « Communauté ») does not trip NavigationStart's
    // path check, so the drawer is still open: close it without rewinding history.
    if (this.overlays.isOpen(this.ref)) this.ref.close();
  }
}

/** False when the app is embedded in a site that draws its own navigation (no ☰ button). */
export const SITE_MENU_ENABLED = new InjectionToken<boolean>('SITE_MENU_ENABLED', { factory: () => true });

@Injectable({ providedIn: 'root' })
export class SiteMenuService {
  private readonly overlay = inject(ArOverlayService);
  private readonly router = inject(Router);

  open(): void {
    this.overlay.open(SiteMenu, { title: 'Altered Re:Builder', width: 420, compact: 'drawer' });
  }

  goLogin(): void {
    void this.router.navigateByUrl('/login');
  }
}
