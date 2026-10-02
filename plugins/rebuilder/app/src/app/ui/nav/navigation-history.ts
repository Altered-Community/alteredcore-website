import { Service, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';

/**
 * Counts the history entries the app pushed since it booted, so that « Retour » can go back
 * within the app, or fall back to a parent route on a deep link. Injected at startup (`EmbedApp`).
 */
@Service()
export class AcNavigationHistory {
  private readonly router = inject(Router);
  private depth = 0;
  private started = false;
  private pending: 'push' | 'pop' | 'none' = 'none';

  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe((e) => {
      if (e instanceof NavigationStart) {
        const extras = this.router.currentNavigation()?.extras;
        // replaceUrl updates the current entry (query change, overlay handoff): not a new step.
        this.pending = e.navigationTrigger === 'popstate' ? 'pop' : extras?.skipLocationChange || extras?.replaceUrl ? 'none' : 'push';
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
