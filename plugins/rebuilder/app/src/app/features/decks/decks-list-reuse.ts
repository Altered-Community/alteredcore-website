import { Service } from '@angular/core';
import {
  BaseRouteReuseStrategy,
  destroyDetachedRouteHandle,
  type ActivatedRouteSnapshot,
  type DetachedRouteHandle,
} from '@angular/router';

/**
 * Keeps the Decks list mounted across deck consultation.
 * Remounting it refetches from an empty page: the browser then restores the old scroll
 * onto that short skeleton list and the viewport sits on the gray placeholders.
 * Same tab (`?tab=`) reattaches the stored list; a different tab starts clean.
 */
@Service({ autoProvided: false })
export class DecksListReuseStrategy extends BaseRouteReuseStrategy {
  private stored: { key: string; handle: DetachedRouteHandle } | null = null;

  override shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return decksListKey(route) !== null;
  }

  override store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle | null): void {
    if (decksListKey(route) === null) return;
    if (!handle) {
      this.stored = null;
      return;
    }
    if (this.stored && this.stored.handle !== handle) destroyDetachedRouteHandle(this.stored.handle);
    this.stored = { key: decksListKey(route) as string, handle };
  }

  override shouldAttach(route: ActivatedRouteSnapshot): boolean {
    const key = decksListKey(route);
    if (!key || !this.stored) return false;
    if (this.stored.key !== key) {
      this.discard();
      return false;
    }
    return true;
  }

  override retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    const key = decksListKey(route);
    if (!key || this.stored?.key !== key) return null;
    return this.stored.handle;
  }

  /** While the list is detached, its lazy injector must stay alive. */
  retrieveStoredRouteHandles(): DetachedRouteHandle[] {
    return this.stored ? [this.stored.handle] : [];
  }

  private discard(): void {
    const handle = this.stored?.handle;
    this.stored = null;
    if (handle) destroyDetachedRouteHandle(handle);
  }
}

/** `null` when `route` is not the Decks list (`/decks`, not `/decks/:id`). */
export function decksListKey(route: ActivatedRouteSnapshot): string | null {
  if (route.routeConfig?.path !== 'decks') return null;
  return route.queryParamMap.get('tab') === 'community' ? 'community' : 'mine';
}

/** True for `/decks` and `/decks?tab=…`, false for a deck, the editor, or `/decks/new`. */
export function isDecksListUrl(url: string): boolean {
  const path = url.split(/[?#]/)[0];
  return path === '/decks';
}
