import { Component, computed, inject, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { counts, defaultPrints } from '../../../core/alt-art-defaults';
import { cardImageUrl } from '../../../core/card-art';
import type { AltArtChoice } from '../../../core/ownership-api.service';
import { AcButton } from '../../../ui/buttons';
import { AcOverlayRef, AcOverlayService } from '../../../ui/overlay';

export interface AltArtPickerData {
  choice: AltArtChoice;
  /** The family's copies in the deck, one print a copy. */
  prints: () => readonly string[];
  /** The family's copies take `prints`, one print a copy. */
  set: (prints: readonly string[]) => void;
}

/**
 * The brush of a card: the illustration of each of its copies in this deck. A touched illustration goes on the selected
 * copy, then the next copy is selected; an illustration whose owned copies are all placed waits. « Arts par défaut » puts
 * the player's default alt arts back. Each change is saved with the deck.
 */
@Component({
  selector: 'app-alt-art-picker',
  imports: [AcButton],
  host: { class: 'ac-overlay-content' },
  templateUrl: './alt-art-picker.overlay.html',
  styleUrl: './alt-art-picker.overlay.scss',
})
export class AltArtPickerOverlay {
  protected readonly ref = inject<AcOverlayRef<void, AltArtPickerData>>(AcOverlayRef);
  private readonly data = this.ref.data!;
  /**
   * The copies, the ones on a default alt art in the order of the defaults (1st copy on the 1st default…) when the
   * window opens; then each copy keeps its place while the illustrations change.
   */
  protected readonly copies = signal<readonly string[]>(ordered(this.data.choice, this.data.prints()));
  /** The selected copy: the next illustration touched goes on it. */
  protected readonly active = signal(0);
  protected readonly slots = computed(() => this.copies().map((reference, i) => ({ reference, src: cardImageUrl(reference), label: copyLabel(i + 1) })));
  protected readonly pool = computed(() => {
    const copies = this.copies();
    const active = this.active();
    return this.data.choice.options.options.map((o, i) => {
      const placed = copies.filter((c) => c === o.reference).length;
      // Taken by the other copies: the selected copy gives its own print back when it changes.
      const elsewhere = copies.filter((c, j) => c === o.reference && j !== active).length;
      const owned = o.ownedQuantity;
      return {
        reference: o.reference,
        src: cardImageUrl(o.reference),
        label: printLabel(i + 1),
        off: owned !== null && elsewhere >= owned,
        unowned: owned === 0,
        note: owned === null ? unlimited() : owned === 0 ? notOwned() : placedLabel(placed, owned),
      };
    });
  });
  protected readonly isDefault = computed(() => this.copies().join() === defaultPrints(this.data.choice, this.copies().length).join());
  /** The site's « Arts alternatifs par défaut » page (plugin ownership). */
  protected readonly settingsUrl = `${environment.siteUrl.replace(/\/$/, '')}/pages/ownership-alt-arts`;

  protected select(index: number): void {
    this.active.set(index);
  }

  protected place(reference: string, off: boolean): void {
    const copies = this.copies();
    if (off || !copies.length) return;
    const active = this.active();
    const next = copies.map((c, i) => (i === active ? reference : c));
    this.copies.set(next);
    this.active.set((active + 1) % next.length);
    this.data.set(next);
  }

  protected resetToDefaults(): void {
    const next = defaultPrints(this.data.choice, this.copies().length);
    this.copies.set(next);
    this.active.set(0);
    this.data.set(next);
  }
}

/** `prints` with the copies on a default alt art first, in the order of the defaults, then the others. */
function ordered(choice: AltArtChoice, prints: readonly string[]): string[] {
  const left = counts(prints);
  const out: string[] = [];
  for (const d of defaultPrints(choice, prints.length)) {
    const n = left.get(d) ?? 0;
    if (!n) continue;
    out.push(d);
    left.set(d, n - 1);
  }
  for (const [print, n] of left) for (let i = 0; i < n; i++) out.push(print);
  return out;
}

const copyLabel = (n: number) => $localize`:@@altArt.marker:Exemplaire ${n}:n:`;
const printLabel = (n: number) => $localize`:@@altArt.tile:Illustration ${n}:n:`;
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
