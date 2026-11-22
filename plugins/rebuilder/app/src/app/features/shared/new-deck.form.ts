import { computed, signal } from '@angular/core';
import type { DeckFormat, DeckHero } from '../../core/models';

export interface NewDeckResult {
  name: string;
  hero: DeckHero;
  format: DeckFormat;
  isPublic: boolean;
  /** Optional, trimmed; empty when none was typed. */
  description: string;
}

/**
 * State of « Nouveau deck ». Picking a hero pre-fills the name with « Deck <héros> » while the field is empty
 * or still holds the previously generated name; once the user has typed a name of their own it is kept.
 */
export class NewDeckForm {
  readonly name = signal('');
  readonly description = signal('');
  readonly hero = signal<DeckHero | null>(null);
  readonly format = signal<DeckFormat>('standard');
  /** `boolean | undefined` to bind `ac-segmented [(value)]` directly. */
  readonly isPublic = signal<boolean | undefined>(false);
  readonly ready = computed(() => !!this.hero() && !!this.name().trim());
  private generatedName = '';

  /** `defaultArt`: picked without « Alt arts », the hero takes the player's default alt art. */
  selectHero(hero: DeckHero | null, defaultArt = false): void {
    if (!hero) return;
    this.hero.set({ reference: hero.reference, name: hero.name, faction: hero.faction, ...(defaultArt ? { defaultArt } : {}) });
    const current = this.name();
    if (!current.trim() || current === this.generatedName) {
      this.generatedName = $localize`:@@newDeck.defaultName:Deck ${hero.name}:hero:`;
      this.name.set(this.generatedName);
    }
  }

  /** User input in the name field. */
  editName(value: string): void {
    this.name.set(value);
  }

  result(): NewDeckResult | null {
    const hero = this.hero();
    const name = this.name().trim();
    if (!hero || !name) return null;
    return { name, hero, format: this.format(), isPublic: !!this.isPublic(), description: this.description().trim() };
  }
}
