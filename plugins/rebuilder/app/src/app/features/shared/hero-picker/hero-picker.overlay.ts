import { Component, inject, signal, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { CardsApiService, type HeroGroup } from '../../../core/cards-api.service';
import type { DeckHero } from '../../../core/models';
import { AcButton } from '../../../ui/buttons';
import { AcFactionTabs, AcHeroSelector, factionName, type AcHeroOption } from '../../../ui/metier';
import { AcBreakpointService } from '../../../ui/layout.services';
import { AcOverlayRef } from '../../../ui/overlay';

/** Heroes from the cards API for `ac-hero-selector`: `heroes` is null while loading; `error` on failure. */
export function injectHeroes(): { heroes: Signal<HeroGroup[] | null>; error: Signal<boolean> } {
  const api = inject(CardsApiService);
  const error = signal(false);
  const heroes = toSignal(
    api.heroes().pipe(
      catchError(() => {
        error.set(true);
        return of([] as HeroGroup[]);
      }),
    ),
    { initialValue: null },
  );
  return { heroes, error: error.asReadonly() };
}

function heroPickerTitle(): string {
  return $localize`:@@shared.heroPicker.title:Choisir un héros`;
}

export interface HeroPickerData {
  selected?: DeckHero | null;
}

/** « Choisir un héros » — a step of « Réglages du deck », shown in the same window / sheet. */
@Component({
  selector: 'app-hero-picker',
  imports: [AcFactionTabs, AcHeroSelector, AcButton],
  host: { class: 'ac-overlay-content' },
  templateUrl: './hero-picker.overlay.html',
  styleUrl: './hero-picker.overlay.scss',
})
export class HeroPickerOverlay {
  protected readonly ref = inject<AcOverlayRef<DeckHero, HeroPickerData>>(AcOverlayRef);
  protected readonly bp = inject(AcBreakpointService);
  private readonly load = injectHeroes();
  protected readonly heroes = this.load.heroes;
  protected readonly error = this.load.error;
  protected readonly picked = signal<AcHeroOption | null>(this.ref.data?.selected ?? null);
  protected readonly faction = signal(this.ref.data?.selected?.faction || 'AX');

  constructor() {
    this.ref.title.set(heroPickerTitle());
    this.ref.description.set($localize`:@@shared.heroPicker.description:Le héros détermine votre faction et les cartes disponibles.`);
  }

  protected factionLabel(code: string): string {
    return factionName(code);
  }

  confirm(): void {
    const p = this.picked();
    if (p) this.ref.close({ reference: p.reference, name: p.name, faction: p.faction });
  }
}

/** Shows « Choisir un héros » in place of the content of `parent` (no second window). */
export function openHeroPickerStep(parent: Pick<AcOverlayRef, 'openStep'>, selected?: DeckHero | null): AcOverlayRef<DeckHero, HeroPickerData> {
  return parent.openStep<HeroPickerOverlay, DeckHero, HeroPickerData>(HeroPickerOverlay, {
    title: heroPickerTitle(),
    data: { selected },
  });
}
