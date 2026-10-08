import { CdkDrag, CdkDropList, CdkDropListGroup, type CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, computed, inject, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { slotChoices, slotDefaults } from '../../../core/alt-art-defaults';
import { cardImageUrl } from '../../../core/card-art';
import type { AltArtChoice } from '../../../core/ownership-api.service';
import { AcButton } from '../../../ui/buttons';
import { AcIcon } from '../../../ui/icon';
import { AcOverlayRef, AcOverlayService } from '../../../ui/overlay';

export interface AltArtPickerData {
  choice: AltArtChoice;
  /** The family's copies in the deck, one print a copy. */
  prints: () => readonly string[];
  /** The family's copies take `prints`, one print a copy. */
  set: (prints: readonly string[]) => void;
}

/**
 * The brush of a card: the illustration of each of its copies in this deck. A copy left free shows, faded, its default
 * alt art (the player's slot for that copy, within the copies owned), which the deck takes. A touched illustration goes
 * on the first free copy; one dragged onto a copy goes on that copy; a touched copy is free again. An illustration whose
 * owned copies are all chosen waits. Each change is saved with the deck.
 */
@Component({
  selector: 'app-alt-art-picker',
  imports: [AcButton, AcIcon, CdkDropListGroup, CdkDropList, CdkDrag],
  host: { class: 'ac-overlay-content' },
  templateUrl: './alt-art-picker.overlay.html',
  styleUrl: './alt-art-picker.overlay.scss',
})
export class AltArtPickerOverlay {
  protected readonly ref = inject<AcOverlayRef<void, AltArtPickerData>>(AcOverlayRef);
  private readonly data = this.ref.data!;
  /** Each copy's illustration chosen in this deck, `null` for a copy left to its default alt art. */
  protected readonly chosen = signal(slotChoices(this.data.choice, this.data.prints()));
  /** Each copy's illustration in the deck. */
  private readonly prints = computed(() => slotDefaults(this.data.choice, this.chosen()));
  protected readonly slots = computed(() => {
    const chosen = this.chosen();
    return this.prints().map((reference, i) => ({
      src: cardImageUrl(reference),
      label: copyLabel(i + 1),
      chosen: chosen[i] !== null,
      freeLabel: freeLabel(i + 1),
    }));
  });
  protected readonly full = computed(() => !this.chosen().includes(null));
  protected readonly pool = computed(() => {
    const prints = this.prints();
    const chosen = this.chosen();
    return this.data.choice.options.options.map((o, i) => {
      const placed = prints.filter((p) => p === o.reference).length;
      const owned = o.ownedQuantity;
      return {
        reference: o.reference,
        src: cardImageUrl(o.reference),
        label: printLabel(i + 1),
        off: this.taken(o.reference, chosen),
        note: owned === null ? unlimited() : owned === 0 ? notOwned() : placedLabel(placed, owned),
      };
    });
  });
  protected readonly allDefault = computed(() => this.chosen().every((c) => c === null));
  /** The site's « Arts alternatifs par défaut » page (plugin ownership). */
  protected readonly settingsUrl = `${environment.siteUrl.replace(/\/$/, '')}/pages/ownership-alt-arts`;
  /** A long press starts a drag on touch screens, so that a swipe still scrolls the illustrations. */
  protected readonly dragDelay = { touch: 300, mouse: 0 };
  /** Nothing is dropped on the illustrations. */
  protected readonly noDrop = () => false;

  /** A touched illustration: on the first free copy. */
  protected place(reference: string): void {
    const index = this.chosen().indexOf(null);
    if (index !== -1) this.choose(index, reference);
  }

  /** An illustration dropped on a copy. */
  protected drop(event: CdkDragDrop<number, unknown, string>): void {
    if (event.container !== event.previousContainer) this.choose(event.container.data, event.item.data);
  }

  /** A touched copy: back to its default alt art. */
  protected free(index: number): void {
    this.update(this.chosen().map((c, i) => (i === index ? null : c)));
  }

  protected resetToDefaults(): void {
    this.update(this.chosen().map(() => null));
  }

  private choose(index: number, reference: string): void {
    const chosen = this.chosen();
    if (chosen[index] === reference || this.taken(reference, chosen.map((c, i) => (i === index ? null : c)))) return;
    this.update(chosen.map((c, i) => (i === index ? reference : c)));
  }

  /** Every owned copy of `reference` is chosen (or the player owns none). */
  private taken(reference: string, chosen: readonly (string | null)[]): boolean {
    const owned = this.data.choice.options.options.find((o) => o.reference === reference)?.ownedQuantity ?? null;
    return owned !== null && chosen.filter((c) => c === reference).length >= owned;
  }

  private update(chosen: (string | null)[]): void {
    this.chosen.set(chosen);
    this.data.set(this.prints());
  }
}

const copyLabel = (n: number) => $localize`:@@altArt.marker:Exemplaire ${n}:n:`;
const printLabel = (n: number) => $localize`:@@altArt.tile:Illustration ${n}:n:`;
const freeLabel = (n: number) => $localize`:@@editor.altArtPicker.free:Exemplaire ${n}:n:, illustration choisie : rendre l’art par défaut`;
const unlimited = () => $localize`:@@editor.altArtPicker.unlimited:Illimitée`;
const notOwned = () => $localize`:@@editor.altArtPicker.notOwned:Non possédée`;
const placedLabel = (placed: number, owned: number) =>
  placed > 1
    ? $localize`:@@editor.altArtPicker.placedMany:${placed}:placed: / ${owned}:owned: placées`
    : $localize`:@@editor.altArtPicker.placedOne:${placed}:placed: / ${owned}:owned: placée`;

/** The brush of a card of the deck, in its own window (sheet on a phone). */
export function openAltArtPicker(overlay: AcOverlayService, name: string, data: AltArtPickerData): AcOverlayRef<void, AltArtPickerData> {
  const copies = data.prints().length;
  return overlay.open<AltArtPickerOverlay, void, AltArtPickerData>(AltArtPickerOverlay, {
    title: name,
    subtitle: copies > 1 ? $localize`:@@editor.altArtPicker.copiesMany:${copies}:n: exemplaires dans ce deck` : $localize`:@@editor.altArtPicker.copiesOne:1 exemplaire dans ce deck`,
    data,
    width: 1000,
  });
}
