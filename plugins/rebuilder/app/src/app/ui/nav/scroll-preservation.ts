import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from '@angular/router';

export interface ScrollPreservationOptions {
  /** Predicate matching URLs that display the reused list component. */
  isTargetUrl: (url: string) => boolean;
  /** Called right as navigation leaves the target URL. */
  onLeave?: () => void;
  /** Called on every `NavigationEnd` landing on the target URL (whether returning or staying). */
  onRouteMatch?: () => void;
  /** Called when returning to the target URL after having left it, right before scroll restoration. */
  onReturn?: () => void;
  /** Called inside `requestAnimationFrame` right after scroll position is restored. */
  onRestored?: () => void;
}

/**
 * Preserves window scroll offset across `RouteReuseStrategy` transitions for a kept-alive list view.
 * Must be called inside an injection context (component constructor).
 */
export function attachScrollPreservation(options: ScrollPreservationOptions): void {
  const router = inject(Router);
  const destroyRef = inject(DestroyRef);
  let savedScroll = 0;
  let trackScroll = true;

  const onScroll = () => {
    if (trackScroll && options.isTargetUrl(router.url)) savedScroll = window.scrollY;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  destroyRef.onDestroy(() => window.removeEventListener('scroll', onScroll));

  router.events.pipe(takeUntilDestroyed(destroyRef)).subscribe((e) => {
    if (e instanceof NavigationStart && options.isTargetUrl(router.url) && !options.isTargetUrl(e.url)) {
      const y = window.scrollY;
      if (y > 0 || savedScroll === 0) savedScroll = y;
      trackScroll = false;
      options.onLeave?.();
    }
    if (e instanceof NavigationStart && e.navigationTrigger === 'popstate' && options.isTargetUrl(e.url)) {
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    }
    if ((e instanceof NavigationCancel || e instanceof NavigationError) && options.isTargetUrl(router.url)) {
      trackScroll = true;
    }
    if (e instanceof NavigationEnd && options.isTargetUrl(e.urlAfterRedirects)) {
      options.onRouteMatch?.();
    }
    if (e instanceof NavigationEnd && options.isTargetUrl(e.urlAfterRedirects) && !trackScroll) {
      options.onReturn?.();
      const y = savedScroll;
      // Instant: the site's Bootstrap makes the root scroll smooth, and the app scrolls to the top of each page it opens.
      const apply = () => window.scrollTo({ top: y, behavior: 'instant' });
      apply();
      requestAnimationFrame(() => {
        apply();
        trackScroll = true;
        options.onRestored?.();
        if ('scrollRestoration' in history) history.scrollRestoration = 'auto';
      });
    }
  });
}
