import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { BGA_LABEL, DECK_FORMATS } from '../../../core/formats';
import { ArButton } from '../../../ui/buttons';
import { ArInput, ArRadioCard, ArSegmented } from '../../../ui/fields';
import { ArBreakpointService } from '../../../ui/layout.services';
import { ArFactionTabs, ArHeroSelector, factionName } from '../../../ui/metier';
import { ArOverlayRef, ArOverlayService } from '../../../ui/overlay';
import { injectHeroes } from '../hero-picker/hero-picker.overlay';
import { NewDeckForm, type NewDeckResult } from '../new-deck.form';

export type { NewDeckResult } from '../new-deck.form';

/** Width (px) below which 6 faction pills of 13 px labels no longer fit on one row. */
const NARROW_HEROES_COLUMN = 500;

export const VISIBILITY_OPTIONS = [
  { value: false, label: 'Privé', icon: 'lock' as const },
  { value: true, label: 'Public', icon: 'eye' as const },
];

/**
 * « Nouveau deck » with the hero choice in the same window (design/features/creation-heros-integre.md).
 * ≥ 768 px: heroes on the left, name / visibility / format on the right, each column scrolls.
 * Compact: one scrolling column (faction row + hero carousel), « Créer le deck » pinned at the bottom.
 */
@Component({
  selector: 'app-new-deck',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ArButton, ArInput, ArRadioCard, ArSegmented, ArFactionTabs, ArHeroSelector],
  host: { class: 'ar-overlay-content' },
  templateUrl: './new-deck.overlay.html',
  styleUrl: './new-deck.overlay.scss',
})
export class NewDeckOverlay {
  protected readonly ref = inject<ArOverlayRef<NewDeckResult>>(ArOverlayRef);
  protected readonly bp = inject(ArBreakpointService);
  protected readonly formats = DECK_FORMATS;
  protected readonly bga = BGA_LABEL;
  protected readonly visibility = VISIBILITY_OPTIONS;
  private readonly load = injectHeroes();
  protected readonly heroes = this.load.heroes;
  protected readonly error = this.load.error;

  readonly form = new NewDeckForm();
  /**
   * Heroes column too narrow for 6 faction pills on one row (medium windows, 768 to about 950 px): the pills
   * wrap to 3 × 2 and the heroes use 3 columns, so no label is cut.
   */
  protected readonly narrow = signal(false);
  private readonly destroyRef = inject(DestroyRef);
  private readonly heroesCol = viewChild.required<ElementRef<HTMLElement>>('heroesCol');
  protected readonly faction = signal(this.form.hero()?.faction || 'AX');

  constructor() {
    afterNextRender(() => {
      const el = this.heroesCol().nativeElement;
      const measure = () => {
        const style = getComputedStyle(el);
        const content = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        this.narrow.set(content < NARROW_HEROES_COLUMN);
      };
      measure();
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(measure);
      observer.observe(el);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected factionLabel(code: string): string {
    return factionName(code);
  }

  create(): void {
    const result = this.form.result();
    if (result) this.ref.close(result);
  }
}

export function openNewDeck(overlay: ArOverlayService): ArOverlayRef<NewDeckResult> {
  return overlay.open<NewDeckOverlay, NewDeckResult>(NewDeckOverlay, {
    title: 'Nouveau deck',
    width: 1080,
    height: 'fill',
    compact: 'fullscreen',
  });
}
