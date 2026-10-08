import { NgTemplateOutlet } from '@angular/common';
import { _getFocusedElementPierceShadowDom } from '@angular/cdk/platform';
import { Component, ElementRef, Injector, afterNextRender, computed, inject, input, output } from '@angular/core';
import { isUniqueReference } from '../../../core/card-art';
import type { Card } from '../../../core/models';
import { localizedText } from '../../../core/models';
import { AcCardAdd, AcStepper } from '../../buttons';
import { AcBadge } from '../../chips';
import { AcIcon } from '../../icon';
import { AcCardArt } from '../card-art/card-art';
import { AcUniqueCard } from '../unique-card/unique-card';
import { contentLocale } from '../../../core/locale';

/** Search / preview / consultation tile — ac-card-tile (DS-Metier). */
@Component({
  selector: 'ac-card-tile',
  imports: [NgTemplateOutlet, AcCardArt, AcCardAdd, AcStepper, AcUniqueCard, AcBadge, AcIcon],
  host: { role: 'article', '[attr.aria-label]': 'name()' },
  templateUrl: './card-tile.html',
  styleUrl: './card-tile.scss',
})
export class AcCardTile {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  readonly card = input.required<Card>();
  readonly quantity = input(0);
  readonly max = input(3);
  readonly readonly = input(false);
  /** Card browser: the card alone, without « + », stepper or ×n. */
  readonly plain = input(false);
  readonly eager = input(false);
  /** Why the card cannot be added (`max` is 0), shown in place of « + ». */
  readonly blockedReason = input<string | null>(null);
  readonly quantityChange = output<number>();
  /** Favorite star over the visual (the site's favorites): `null` hides it (signed out). */
  readonly favorite = input<boolean | null>(null);
  readonly favoriteToggle = output<void>();
  /** The visual is a button that emits `zoom` (the page opens the card large). */
  readonly zoomable = input(false);
  readonly zoom = output<void>();
  /** Brush over the visual (a card with several illustrations, in an editable deck): emits `illustrate`. */
  readonly illustrations = input(false);
  readonly illustrate = output<void>();
  /** Short label over the visual, framed (an owned alt art in the search: « 2 possédées »). */
  readonly note = input<string | null>(null);

  protected readonly blockedShort = $localize`:@@ui.deckRow.blocked:Interdite`;
  protected readonly name = computed(() => localizedText(this.card().name, contentLocale()) || this.card().reference);
  protected readonly favoriteLabel = computed(() =>
    this.favorite() ? $localize`:@@ui.cardTile.unfavorite:Retirer ${this.name()}:name: des favoris` : $localize`:@@ui.cardTile.favorite:Ajouter ${this.name()}:name: aux favoris`,
  );
  protected readonly zoomLabel = computed(() => $localize`:@@ui.cardTile.zoom:Agrandir ${this.name()}:name:`);
  protected readonly illustrateLabel = computed(() => $localize`:@@ui.cardTile.illustrate:Choisir les illustrations de ${this.name()}:name:`);
  protected readonly addLabel = computed(() => $localize`:@@ui.cardTile.add:Ajouter ${this.name()}:name: au deck`);
  protected readonly copiesLabel = computed(() => $localize`:@@ui.cardTile.copiesInDeck:Exemplaires de ${this.name()}:name: dans le deck`);
  protected readonly quantityLabel = computed(() => {
    const n = this.quantity();
    return n === 1 ? $localize`:@@ui.cardTile.quantityOne:${n}:count: exemplaire(s)` : $localize`:@@ui.cardTile.quantity:${n}:count: exemplaire(s)`;
  });
  protected readonly unique = computed(() => isUniqueReference(this.card().reference));

  /**
   * « + » becomes a stepper at 1 copy, and back at 0: the focused button is replaced, so the focus
   * moves to the new control instead of falling to the page (keyboard, screen readers).
   */
  protected changeQuantity(quantity: number): void {
    const focused = _getFocusedElementPierceShadowDom();
    const hadFocus = !!focused && this.host.nativeElement.contains(focused);
    this.quantityChange.emit(quantity);
    if (!hadFocus) return;
    afterNextRender(
      () => {
        const active = _getFocusedElementPierceShadowDom();
        if (active && this.host.nativeElement.contains(active)) return;
        this.host.nativeElement.querySelector<HTMLElement>(quantity > 0 ? '.action .inc' : '.action button')?.focus();
      },
      { injector: this.injector },
    );
  }
}
