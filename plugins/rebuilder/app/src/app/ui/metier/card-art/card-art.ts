import { Component, ElementRef, Service, afterNextRender, afterRenderEffect, computed, inject, input, linkedSignal, signal, viewChild, type OnDestroy } from '@angular/core';
import { cardImageSources } from '../../../core/card-art';
import { factionColor } from '../factions';
import { contentLocale } from '../../../core/locale';

/**
 * Card / hero visual with lazy loading and a fallback chain; hatch placeholder in the faction colour,
 * or a plain light grey one without text when `neutral` (card tiles: it flashes less while scrolling).
 * No `decoding="async"`: with ~30 images on screen, Chrome rasters some tiles before their image is
 * decoded and never redraws them, so a loaded card stays blank until it is scrolled away and back.
 */
@Component({
  selector: 'ac-card-art',
  host: {
    '[class.ac-hatch]': '!neutral()',
    '[class.neutral]': 'neutral()',
    '[style.background-color]': 'neutral() ? null : tint()',
    '[class.loaded]': 'loaded()',
    '[class.instant]': 'instant()',
  },
  templateUrl: './card-art.html',
  styleUrl: './card-art.scss',
})
export class AcCardArt implements OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly viewport = inject(AcViewportLoader);
  /** Art starts downloading once the tile is ~1.5 screens from the viewport (or immediately when eager). */
  private readonly inView = signal(false);
  readonly reference = input.required<string>();
  readonly faction = input<string | null | undefined>(null);
  readonly placeholder = input($localize`:@@ui.cardArt.placeholder:Visuel de la carte`);
  readonly eager = input(false);
  /** Light grey placeholder, no hatch, no faction colour, no text. */
  readonly neutral = input(false);
  readonly position = input('center');
  /** Replaces the fallback chain derived from `reference`. */
  readonly sources = input<string[] | null>(null);

  /** Compared by value: a parent that rebuilds the same list must not retry sources that already failed. */
  private readonly chain = computed(() => this.sources() ?? cardImageSources(this.reference(), contentLocale()), {
    equal: (a, b) => a.length === b.length && a.every((src, i) => src === b[i]),
  });
  private readonly attempt = linkedSignal({ source: this.chain, computation: () => 0 });
  protected readonly src = computed(() => this.chain()[this.attempt()] ?? null);
  /**
   * Reset with the displayed src only: a new image shows the placeholder until it loads, while an <img> that keeps
   * its src never fires `load` again (a unique whose card object is replaced once its effect arrives).
   */
  protected readonly loaded = linkedSignal({ source: this.src, computation: () => false });
  protected readonly tint = computed(() => factionColor(this.faction()));
  /** Eager art is in the first render: no frame of placeholder before it. */
  protected readonly visible = computed(() => this.eager() || this.inView());
  private readonly img = viewChild<ElementRef<HTMLImageElement>>('img');
  /**
   * Eager art already in the browser's cache (the same hero after the editor's view changed, which renders the page
   * again): shown at once, without the placeholder and the fade of an image that downloads.
   */
  protected readonly instant = linkedSignal({ source: this.src, computation: () => false });

  constructor() {
    afterNextRender(() => {
      if (!this.eager()) this.viewport.observe(this.host.nativeElement, () => this.inView.set(true));
    });
    // Eager art only (portraits): the tiles of a grid load lazily and keep their fade, without this check each.
    afterRenderEffect(() => {
      if (!this.eager()) return;
      const img = this.img()?.nativeElement;
      if (!img || this.loaded() || !img.complete || !img.naturalWidth) return;
      this.instant.set(true);
      this.loaded.set(true);
    });
  }

  ngOnDestroy(): void {
    this.viewport.unobserve(this.host.nativeElement);
  }

  next(): void {
    this.attempt.update((n) => n + 1);
  }
}

/**
 * One IntersectionObserver shared by every card visual. Art loads when a tile has stayed within
 * the lookahead zone for DWELL_MS, so tiles skipped by a fast flick never download their image.
 */
const DWELL_MS = 150;

@Service()
export class AcViewportLoader {
  private readonly callbacks = new Map<Element, () => void>();
  private readonly timers = new Map<Element, ReturnType<typeof setTimeout>>();
  private observer?: IntersectionObserver;

  observe(el: Element, onVisible: () => void): void {
    if (typeof IntersectionObserver === 'undefined') {
      onVisible();
      return;
    }
    this.observer ??= new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const el = e.target;
          clearTimeout(this.timers.get(el));
          this.timers.delete(el);
          if (!e.isIntersecting) continue;
          this.timers.set(
            el,
            setTimeout(() => {
              this.callbacks.get(el)?.();
              this.unobserve(el);
            }, DWELL_MS),
          );
        }
      },
      { rootMargin: '50% 0px 150% 0px' },
    );
    this.callbacks.set(el, onVisible);
    this.observer.observe(el);
  }

  unobserve(el: Element): void {
    clearTimeout(this.timers.get(el));
    this.timers.delete(el);
    this.callbacks.delete(el);
    this.observer?.unobserve(el);
  }
}
