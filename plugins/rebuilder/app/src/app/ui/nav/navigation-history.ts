import { Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';

/**
 * `replaceUrl` normally updates the current entry (query change, overlay handoff that does
 * *not* move to a new page). The site menu reuses the drawer entry for a real page change:
 * pass this as `info` so « Retour » still counts that step.
 */
export const COUNT_REPLACE_AS_PUSH = { countReplaceAsPush: true } as const;

function countsReplaceAsPush(info: unknown): boolean {
  return !!info && typeof info === 'object' && (info as { countReplaceAsPush?: boolean }).countReplaceAsPush === true;
}

/**
 * Counts the history entries the app pushed since it booted, so that « Retour » can go back
 * within the app, or fall back to a parent route on a deep link. Inject it at startup (`App`).
 */
@Injectable({ providedIn: 'root' })
export class ArNavigationHistory {
  private readonly router = inject(Router);
  private depth = 0;
  private started = false;
  private pending: 'push' | 'pop' | 'none' = 'none';

  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe((e) => {
      if (e instanceof NavigationStart) {
        const extras = this.router.currentNavigation()?.extras;
        const replaceIsPush = !!extras?.replaceUrl && countsReplaceAsPush(extras.info);
        this.pending =
          e.navigationTrigger === 'popstate' ? 'pop' : extras?.skipLocationChange || (extras?.replaceUrl && !replaceIsPush) ? 'none' : 'push';
      } else if (e instanceof NavigationEnd) {
        if (!this.started) this.started = true;
        else if (this.pending === 'push') this.depth++;
        else if (this.pending === 'pop') this.depth = Math.max(0, this.depth - 1);
      }
    });
  }

  get canGoBack(): boolean {
    return this.depth > 0;
  }
}
