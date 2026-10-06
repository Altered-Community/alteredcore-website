import { Component, ElementRef, Injector, afterNextRender, computed, inject, input, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { heroArtSources } from '../../../core/card-art';
import type { DeckLegality } from '../../../core/deck-legality';
import { DeckStore } from '../../../core/deck-store';
import { formatInfo } from '../../../core/formats';
import { AcIconButton } from '../../../ui/buttons';
import { AcBadge, AcTerrainTotals } from '../../../ui/chips';
import { AcIcon } from '../../../ui/icon';
import { AcCardArt, AcCostCurve, factionColor } from '../../../ui/metier';
import { AcOverlayService } from '../../../ui/overlay';
import { openCardZoom } from '../../shared/card-zoom/card-zoom.overlay';

/** From this length the title takes one type size less, so that two lines keep the bar's height. */
const LONG_NAME = 40;

/**
 * The deck bar from 768 px, above the deck page and the editor: hero art, faction border, name (two lines at most),
 * format and badges, counts per type, cost curve, terrain totals, then the page's actions (`[barActions]`).
 * `reduced` (editor search and starting hand): one row, smaller art, a mini curve with the `highlight` bucket outlined.
 */
@Component({
  selector: 'app-deck-bar',
  imports: [NgTemplateOutlet, RouterLink, AcCardArt, AcCostCurve, AcTerrainTotals, AcBadge, AcIcon, AcIconButton],
  host: { '[class.reduced]': 'reduced()' },
  templateUrl: './deck-bar.html',
  styleUrl: './deck-bar.scss',
})
export class DeckBar {
  protected readonly deck = inject(DeckStore);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  private readonly overlay = inject(AcOverlayService);

  readonly reduced = input(false);
  readonly legality = input.required<DeckLegality>();
  /** Editor: the settings button on the art, the rename button next to the name, the number of problems. */
  readonly editable = input(false);
  /** Bucket of the mini curve outlined (cost of the last card added). */
  readonly highlight = input<number | null>(null);
  readonly openSettings = output<void>();
  readonly showLegality = output<void>();

  protected readonly renaming = signal(false);
  protected readonly heroArt = computed(() => {
    const ref = this.deck.hero()?.reference;
    return ref ? heroArtSources(ref) : null;
  });
  protected readonly border = computed(() => factionColor(this.deck.hero()?.faction));
  protected readonly long = computed(() => this.deck.name().length > LONG_NAME);
  protected readonly formatLabel = computed(() => formatInfo(this.deck.format()).label);
  protected readonly problems = computed(() => this.legality().rules.length + this.legality().errors.length);
  protected readonly illegalLabel = computed(() => {
    const n = this.problems();
    if (!this.editable() || !n) return $localize`:@@deck.page.illegal:Non légal`;
    return n === 1 ? $localize`:@@deck.bar.illegalOne:Non légal · ${n}:count: problème` : $localize`:@@deck.bar.illegalMany:Non légal · ${n}:count: problèmes`;
  });
  protected readonly labels = {
    legalDetails: $localize`:@@deck.bar.legalDetails:Légal : voir les règles du format`,
    illegalDetails: $localize`:@@deck.page.illegalDetails:Non légal : voir le détail`,
    settings: $localize`:@@ui.deckSummary.settings:Réglages du deck : héros, format, visibilité`,
    rename: $localize`:@@ui.editableTitle.rename:Renommer le deck`,
    name: $localize`:@@ui.editableTitle.label:Nom du deck`,
    public: $localize`:@@deck.page.public:Public`,
    private: $localize`:@@deck.page.private:Privé`,
  };
  protected readonly zoomLabel = computed(() => $localize`:@@ui.cardTile.zoom:Agrandir ${this.deck.hero()?.name ?? ''}:name:`);

  /** Read-only: the hero's card large. */
  protected zoomHero(): void {
    const hero = this.deck.hero();
    if (hero) openCardZoom(this.overlay, { card: { reference: hero.reference, name: hero.name, faction: { code: hero.faction, name: hero.faction }, cardType: { reference: 'HERO' } } });
  }

  protected startRename(): void {
    this.renaming.set(true);
    afterNextRender(
      () => {
        const field = this.el.querySelector<HTMLInputElement>('input.rename');
        field?.focus();
        field?.select();
      },
      { injector: this.injector },
    );
  }

  /** Enter or leaving the field keeps the name (an empty one is ignored), Échap gives up. */
  protected endRename(value: string | null): void {
    if (!this.renaming()) return;
    this.renaming.set(false);
    const name = value?.trim();
    if (name && name !== this.deck.name()) this.deck.rename(name);
    afterNextRender(() => this.el.querySelector<HTMLElement>('.rename-button')?.focus(), { injector: this.injector });
  }
}
