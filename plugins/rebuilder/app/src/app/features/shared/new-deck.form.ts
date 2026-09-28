import { computed, signal } from '@angular/core';
import type { DeckFormat, DeckHero } from '../../core/models';

export interface NewDeckResult {
  name: string;
  hero: DeckHero;
  format: DeckFormat;
  isPublic: boolean;
}

/**
 * State of « Nouveau deck ». Picking a hero pre-fills the name with « Deck <héros> » while the field is empty
 * or still holds the previously generated name; once the user has typed a name of their own it is kept.
 */
export class NewDeckForm {
  readonly name = signal('');
  readonly hero = signal<DeckHero | null>(null);
  readonly format = signal<DeckFormat>('standard');
  /** `boolean | undefined` to bind `ar-segmented [(value)]` directly. */
  readonly isPublic = signal<boolean | undefined>(false);
  readonly ready = computed(() => !!this.hero() && !!this.name().trim());
  private generatedName = '';

  selectHero(hero: DeckHero | null): void {
    if (!hero) return;
    this.hero.set({ reference: hero.reference, name: hero.name, faction: hero.faction });
    const current = this.name();
    if (!current.trim() || current === this.generatedName) {
      this.generatedName = `Deck ${hero.name}`;
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
    return { name, hero, format: this.format(), isPublic: !!this.isPublic() };
  }
}
