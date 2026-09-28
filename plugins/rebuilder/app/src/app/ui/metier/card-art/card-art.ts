import { ChangeDetectionStrategy, Component, ElementRef, Injectable, afterNextRender, computed, inject, input, linkedSignal, signal, type OnDestroy } from '@angular/core';
import { cardImageSources } from '../../../core/card-art';
import { factionColor } from '../factions';

/** Card / hero visual with lazy loading and a fallback chain; hatch placeholder in the faction colour. */
@Component({
  selector: 'ar-card-art',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ar-hatch',
    '[style.background-color]': 'tint()',
    '[class.loaded]': 'loaded()',
  },
  templateUrl: './card-art.html',
  styleUrl: './card-art.scss',
})
export class ArCardArt implements OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly viewport = inject(ArViewportLoader);
  /** Art starts downloading once the tile is ~1.5 screens from the viewport (or immediately when eager). */
  protected readonly visible = signal(false);
  readonly reference = input.required<string>();
  readonly faction = input<string | null | undefined>(null);
  readonly placeholder = input('Visuel de la carte');
  readonly eager = input(false);
  readonly position = input('center');
  /** Replaces the fallback chain derived from `reference`. */
  readonly sources = input<string[] | null>(null);

  protected readonly loaded = signal(false);
  private readonly chain = computed(() => this.sources() ?? cardImageSources(this.reference(), 'fr'));
  private readonly attempt = linkedSignal({ source: this.chain, computation: () => 0 });
  protected readonly src = computed(() => this.chain()[this.attempt()] ?? null);
  protected readonly tint = computed(() => factionColor(this.faction()));

  constructor() {
    afterNextRender(() => {
      if (this.eager()) this.visible.set(true);
      else this.viewport.observe(this.host.nativeElement, () => this.visible.set(true));
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

@Injectable({ providedIn: 'root' })
export class ArViewportLoader {
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
