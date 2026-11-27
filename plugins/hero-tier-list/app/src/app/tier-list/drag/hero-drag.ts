import { Injector, Service, afterNextRender, inject, signal } from '@angular/core';
import { moveHero, tierOf, type Ranking } from '../../core/ranking';
import { TierListStore } from '../../core/tier-list.store';
import { EMBED_MOUNT } from '../../embed/host';

/** Id of the pool's drop zone (the tiers use their own ids). */
export const POOL_LIST = 'pool';

/** Where the dragged hero would land: a list, and its final place in that list (heroes other than itself). */
export interface DropTarget {
  list: string;
  index: number;
}

interface Zone {
  list: string;
  /** Area that catches the pointer (a whole tier row, its label included). */
  hit: HTMLElement;
  /** Element whose `.slot` children are the list's heroes, in order. */
  items: HTMLElement;
  /** Scrolls on its own (the pool next to the board): scrolled when the pointer nears its edges. */
  readonly scrolls: boolean;
}

interface Press {
  slot: HTMLElement;
  heroId: string;
  from: string;
  pointerId: number;
  touch: boolean;
  x0: number;
  y0: number;
  x: number;
  y: number;
  timer?: ReturnType<typeof setTimeout>;
}

interface Session extends Press {
  preview: HTMLElement;
  dx: number;
  dy: number;
  frame?: number;
}

/** Mouse: a drag starts after this many pixels. Touch: after a press this long, without moving more than TOUCH_SLOP. */
const MOUSE_THRESHOLD = 4;
const TOUCH_DELAY = 220;
const TOUCH_SLOP = 10;
/** Distance to a scrolling edge (viewport, pool) where auto-scroll starts, and its top speed per frame. */
const EDGE = 72;
const MAX_SCROLL = 18;
const SETTLE_MS = 160;
/**
 * The dragged art, tilted and a bit larger. In the transform, after the translation: the `rotate` / `scale` CSS
 * properties apply before it, around the top-left corner of the page, and would move the art away from the pointer.
 */
const LIFT = 'rotate(-3deg) scale(1.08)';
const SLIDE = { duration: 170, easing: 'cubic-bezier(0.2, 0, 0, 1)' };

/**
 * Drag and drop of the heroes, on pointer events, for wrapping lists:
 * - the hero's art follows the pointer (a copy of its tile, in the plugin's shadow root);
 * - the landing place is a slot shown in the list, computed in reading order (row by row, left to right), so the
 *   empty end of a tier means « last », the start of a row « before its first hero »;
 * - the other heroes slide to make room (FLIP with the Web Animations API), the dropped one settles into its slot;
 * - the viewport and the pool auto-scroll near their edges; Escape or a drop outside the lists puts it back.
 * Touch: a short press starts the drag, so a swipe over the heroes still scrolls the page. The Angular CDK's drag
 * and drop was not used: its wrapping (« mixed ») lists insert before the nearest hero, so the end of a tier could
 * not be reached.
 */
@Service()
export class HeroDrag {
  private readonly store = inject(TierListStore);
  private readonly mount = inject(EMBED_MOUNT);
  private readonly injector = inject(Injector);

  readonly dragging = signal<{ heroId: string; from: string } | null>(null);
  readonly target = signal<DropTarget | null>(null);

  private readonly zones = new Set<Zone>();
  private press: Press | null = null;
  private session: Session | null = null;
  private settling = false;

  register(zone: Zone): () => void {
    this.zones.add(zone);
    return () => this.zones.delete(zone);
  }

  /** `pointerdown` on a hero's slot. */
  start(event: PointerEvent, slot: HTMLElement, heroId: string, from: string): void {
    if (event.button !== 0 || this.press || this.session || this.settling) return;
    const touch = event.pointerType !== 'mouse';
    this.press = { slot, heroId, from, pointerId: event.pointerId, touch, x0: event.clientX, y0: event.clientY, x: event.clientX, y: event.clientY };
    if (touch) this.press.timer = setTimeout(() => this.press && this.begin(this.press), TOUCH_DELAY);
    window.addEventListener('pointermove', this.onMove, { passive: true });
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onCancel);
    window.addEventListener('keydown', this.onKey);
    // Not passive: once a touch drag has started, its moves must not scroll the page. The touch events also carry the
    // drag on their own when the browser sends `pointercancel` (it took the gesture for a scroll) after the long press.
    document.addEventListener('touchmove', this.onTouchMove, { passive: false });
    document.addEventListener('touchend', this.onTouchEnd);
    document.addEventListener('touchcancel', this.onTouchCancel);
    slot.addEventListener('contextmenu', this.onContextMenu);
  }

  private readonly onMove = (e: PointerEvent): void => {
    const p = this.session ?? this.press;
    if (!p || e.pointerId !== p.pointerId) return;
    p.x = e.clientX;
    p.y = e.clientY;
    if (this.session) {
      this.placePreview();
      this.scheduleFrame();
      return;
    }
    const distance = Math.hypot(p.x - p.x0, p.y - p.y0);
    if (p.touch) {
      // Moved before the press was long enough: a scroll, not a drag.
      if (distance > TOUCH_SLOP) this.release();
    } else if (distance > MOUSE_THRESHOLD) {
      this.begin(p);
    }
  };

  private readonly onUp = (e: PointerEvent): void => {
    if (this.session && e.pointerId === this.session.pointerId) this.finish(true);
    else this.release();
  };

  private readonly onCancel = (): void => {
    // A touch drag goes on with the touch events (onTouchMove / onTouchEnd).
    if (this.session?.touch) return;
    if (this.session) this.finish(false);
    else this.release();
  };

  private readonly onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.session) {
      e.preventDefault();
      this.finish(false);
    }
  };

  private readonly onTouchMove = (e: TouchEvent): void => {
    const s = this.session;
    if (!s?.touch) return;
    if (e.cancelable) e.preventDefault();
    const t = e.touches[0];
    if (!t) return;
    s.x = t.clientX;
    s.y = t.clientY;
    this.placePreview();
    this.scheduleFrame();
  };

  private readonly onTouchEnd = (e: TouchEvent): void => {
    if (this.session?.touch && e.touches.length === 0) this.finish(true);
  };

  private readonly onTouchCancel = (): void => {
    if (this.session?.touch) this.finish(false);
  };

  private readonly onContextMenu = (e: Event): void => {
    e.preventDefault();
  };

  private begin(p: Press): void {
    clearTimeout(p.timer);
    this.press = null;
    const tile = p.slot.querySelector('ac-hero-tile') as HTMLElement | null;
    const rect = (tile ?? p.slot).getBoundingClientRect();
    const preview = (tile ?? p.slot).cloneNode(true) as HTMLElement;
    preview.classList.add('ac-hero-drag-preview');
    preview.setAttribute('aria-hidden', 'true');
    // Inline: the tile's own `position: relative` would win over a stylesheet rule of the same weight.
    Object.assign(preview.style, { position: 'fixed', top: '0', left: '0', margin: '0', width: `${rect.width}px` });
    this.mount.container.appendChild(preview);
    // Grab point: where the button went down on the tile, not where the pointer is now (a quick gesture is already
    // far from it at its first move), so the art stays under the finger at the spot it was taken by.
    this.session = { ...p, preview, dx: p.x0 - rect.left, dy: p.y0 - rect.top };
    this.placePreview();
    navigator.vibrate?.(8);

    const zone = [...this.zones].find((z) => z.list === p.from);
    const index = zone ? this.slotsOf(zone).indexOf(p.slot) : -1;
    this.dragging.set({ heroId: p.heroId, from: p.from });
    this.target.set(p.from === POOL_LIST ? { list: POOL_LIST, index: 0 } : { list: p.from, index: Math.max(0, index) });
    this.scheduleFrame();
  }

  private placePreview(): void {
    const s = this.session;
    if (s) s.preview.style.transform = `translate3d(${s.x - s.dx}px, ${s.y - s.dy}px, 0) ${LIFT}`;
  }

  /** One frame: auto-scroll, then the landing place under the pointer. Runs while the drag lasts. */
  private scheduleFrame(): void {
    const s = this.session;
    if (!s || s.frame !== undefined) return;
    s.frame = requestAnimationFrame(() => {
      s.frame = undefined;
      if (this.session !== s) return;
      const scrolled = this.autoScroll(s);
      this.updateTarget(s);
      if (scrolled) this.scheduleFrame();
    });
  }

  private autoScroll(s: Session): boolean {
    const speed = (d: number) => Math.ceil(MAX_SCROLL * Math.min(1, (EDGE - d) / EDGE));
    for (const z of this.zones) {
      if (!z.scrolls) continue;
      const r = z.items.getBoundingClientRect();
      if (s.x < r.left || s.x > r.right || s.y < r.top || s.y > r.bottom) continue;
      const before = z.items.scrollTop;
      if (s.y - r.top < EDGE / 2) z.items.scrollTop -= speed((s.y - r.top) * 2);
      else if (r.bottom - s.y < EDGE / 2) z.items.scrollTop += speed((r.bottom - s.y) * 2);
      if (z.items.scrollTop !== before) return true;
    }
    const top = this.pageTop();
    const before = window.scrollY;
    if (s.y - top < EDGE) window.scrollBy(0, -speed(Math.max(0, s.y - top)));
    else if (window.innerHeight - s.y < EDGE) window.scrollBy(0, speed(window.innerHeight - s.y));
    return window.scrollY !== before;
  }

  /** Top of the page content, under the site's fixed header. */
  private pageTop(): number {
    return parseFloat(getComputedStyle(this.mount.container).getPropertyValue('--ac-page-top')) || 0;
  }

  private updateTarget(s: Session): void {
    const zone = [...this.zones].find((z) => contains(z.hit.getBoundingClientRect(), s.x, s.y));
    const current = this.target();
    let next: DropTarget | null = null;
    if (zone?.list === POOL_LIST) next = { list: POOL_LIST, index: 0 };
    else if (zone) {
      // Over the slot already shown: stay, or the slot would chase the pointer as the heroes move around it.
      const slot = zone.items.querySelector(':scope > .drop-slot');
      if (slot && current?.list === zone.list && contains(slot.getBoundingClientRect(), s.x, s.y)) return;
      next = { list: zone.list, index: this.indexAt(zone, s.x, s.y) };
    }
    if (next?.list === current?.list && next?.index === current?.index) return;
    this.animateLayout(() => this.target.set(next));
  }

  /** Place in reading order: after every hero on a row above the pointer, and before those right of it on its row. */
  private indexAt(zone: Zone, x: number, y: number): number {
    const slots = this.slotsOf(zone).filter((el) => !el.classList.contains('is-drag-source'));
    let index = 0;
    for (const el of slots) {
      const r = el.getBoundingClientRect();
      const before = y > r.bottom || (y >= r.top && x > r.left + r.width / 2);
      if (!before) break;
      index++;
    }
    return index;
  }

  private slotsOf(zone: Zone): HTMLElement[] {
    return [...zone.items.querySelectorAll<HTMLElement>(':scope > .slot')];
  }

  /** Runs `change`, then slides every hero of the lists from where it was to where the new layout puts it. */
  private animateLayout(change: () => void): void {
    const before = new Map<HTMLElement, DOMRect>();
    for (const z of this.zones) {
      for (const el of z.items.querySelectorAll<HTMLElement>(':scope > .slot, :scope > .drop-slot')) before.set(el, el.getBoundingClientRect());
    }
    change();
    afterNextRender(
      {
        read: () => {
          for (const [el, old] of before) {
            if (!el.isConnected) continue;
            const now = el.getBoundingClientRect();
            const dx = old.left - now.left;
            const dy = old.top - now.top;
            if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
            el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], SLIDE);
          }
        },
      },
      { injector: this.injector },
    );
  }

  /** Drop (`commit`) or put back: the art flies to its slot, then the ranking changes under it. */
  private finish(commit: boolean): void {
    const s = this.session;
    if (!s) return;
    if (s.frame !== undefined) cancelAnimationFrame(s.frame);
    this.session = null;
    this.removeListeners(s.slot);
    this.settling = true;
    // Now, not after the animation: the browser sends its `click` right after the release, and it is not a tap.
    this.store.dragEnded();

    if (commit) this.updateTargetNow(s);
    const target = commit ? this.target() : null;
    const back = !target || (target.list === POOL_LIST && s.from === POOL_LIST);
    const done = () => {
      if (!back && target) {
        this.store.apply((r) => moveRanking(r, s.heroId, target));
      }
      this.dragging.set(null);
      this.target.set(null);
      afterNextRender({ write: () => s.preview.remove() }, { injector: this.injector });
      this.settling = false;
    };

    if (back && s.from !== POOL_LIST) {
      // Back where it was: show its slot again, and fly there.
      const zone = [...this.zones].find((z) => z.list === s.from);
      const index = zone ? this.slotsOf(zone).indexOf(s.slot) : 0;
      this.animateLayout(() => this.target.set({ list: s.from, index: Math.max(0, index) }));
    }
    afterNextRender({ read: () => this.settle(s, back, done) }, { injector: this.injector });
  }

  /** The target under the release point, without waiting for the next frame. */
  private updateTargetNow(s: Session): void {
    this.session = s;
    this.updateTarget(s);
    this.session = null;
  }

  private settle(s: Session, back: boolean, done: () => void): void {
    const to = back && s.from === POOL_LIST ? s.slot : (this.mount.container.querySelector('.drop-slot') as HTMLElement | null);
    if (!to || (!back && this.target()?.list === POOL_LIST)) {
      s.preview.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120 }).finished.then(done, done);
      s.preview.style.opacity = '0';
      return;
    }
    const r = to.getBoundingClientRect();
    s.preview.classList.add('is-settling');
    const anim = s.preview.animate(
      [{ transform: s.preview.style.transform }, { transform: `translate3d(${r.left}px, ${r.top}px, 0) rotate(0deg) scale(1)` }],
      { duration: SETTLE_MS, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'forwards' },
    );
    anim.finished.then(done, done);
  }

  private release(): void {
    if (!this.press) return;
    clearTimeout(this.press.timer);
    this.removeListeners(this.press.slot);
    this.press = null;
  }

  private removeListeners(slot: HTMLElement): void {
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onCancel);
    window.removeEventListener('keydown', this.onKey);
    document.removeEventListener('touchmove', this.onTouchMove);
    document.removeEventListener('touchend', this.onTouchEnd);
    document.removeEventListener('touchcancel', this.onTouchCancel);
    slot.removeEventListener('contextmenu', this.onContextMenu);
  }
}

function contains(r: DOMRect, x: number, y: number): boolean {
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

/** The ranking with the hero at `target`; the same ranking (no history entry) when it is already there. */
function moveRanking(r: Ranking, heroId: string, target: DropTarget): Ranking {
  const tier = tierOf(r, heroId);
  if (target.list === POOL_LIST ? !tier : tier?.id === target.list && tier.heroes.indexOf(heroId) === target.index) return r;
  return moveHero(r, heroId, target.list === POOL_LIST ? null : target.list, target.index);
}
