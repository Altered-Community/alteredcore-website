import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { BGA_LABEL, visibleFormats } from '../../../core/formats';
import { ArButton } from '../../../ui/buttons';
import { ArChip } from '../../../ui/chips';
import { ArInput, ArRadioCard, ArSegmented, ArTextarea } from '../../../ui/fields';
import { ArBreakpointService } from '../../../ui/layout.services';
import { ArFactionTabs, ArHeroSelector, factionName } from '../../../ui/metier';
import { ArOverlayRef, ArOverlayService } from '../../../ui/overlay';
import { heroChoices, injectHeroes } from '../hero-picker/hero-picker.overlay';
import { OwnershipApiService } from '../../../core/ownership-api.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { NewDeckForm, type NewDeckResult } from '../new-deck.form';

export type { NewDeckResult } from '../new-deck.form';

/** Width (px) below which 6 faction pills of 13 px labels no longer fit on one row. */
const NARROW_HEROES_COLUMN = 500;

export const VISIBILITY_OPTIONS = [
  { value: false, label: $localize`:@@newDeck.private:Privé`, icon: 'lock' as const },
  { value: true, label: $localize`:@@newDeck.public:Public`, icon: 'eye' as const },
];

/**
 * « Nouveau deck » with the hero choice in the same window (design/features/creation-heros-integre.md).
 * ≥ 768 px: heroes on the left, name / visibility / format on the right, each column scrolls.
 * Compact: one scrolling column (faction row + hero carousel), « Créer le deck » pinned at the bottom.
 */
@Component({
  selector: 'app-new-deck',
  imports: [ArButton, ArInput, ArRadioCard, ArSegmented, ArTextarea, ArFactionTabs, ArHeroSelector, ArChip],
  host: { class: 'ar-overlay-content' },
  templateUrl: './new-deck.overlay.html',
  styleUrl: './new-deck.overlay.scss',
})
export class NewDeckOverlay {
  private readonly ownership = inject(OwnershipApiService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly ref = inject<ArOverlayRef<NewDeckResult>>(ArOverlayRef);
  protected readonly bp = inject(ArBreakpointService);
  protected readonly formats = visibleFormats();
  protected readonly bga = BGA_LABEL;
  protected readonly visibility = VISIBILITY_OPTIONS;
  private readonly load = injectHeroes();
  protected readonly altArts = signal(false);
  protected readonly serialized = signal(false);
  protected readonly heroes = computed(() => heroChoices(this.load.heroes(), { altArts: this.altArts(), serialized: this.serialized() }));
  protected readonly global = toSignal(this.ownership.globalAltArts(), { initialValue: false });
  protected readonly error = this.load.error;

  readonly form = new NewDeckForm();
  /**
   * Heroes column too narrow for 6 faction pills on one row (medium windows, 768 to about 950 px): the pills
   * wrap to 3 × 2 and the heroes use 3 columns, so no label is cut.
   */
  protected readonly narrow = signal(false);
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
    title: $localize`:@@title.newDeck:Nouveau deck`,
    width: 1080,
    height: 'fill',
    compact: 'fullscreen',
  });
}
