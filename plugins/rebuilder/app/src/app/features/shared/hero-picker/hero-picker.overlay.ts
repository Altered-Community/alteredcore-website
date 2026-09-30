import { Component, computed, inject, signal, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { CardsApiService, type HeroGroup } from '../../../core/cards-api.service';
import { OwnershipApiService } from '../../../core/ownership-api.service';
import { heroOnBga } from '../../../core/formats';
import { ArChip } from '../../../ui/chips';
import type { DeckHero } from '../../../core/models';
import { ArButton } from '../../../ui/buttons';
import { ArFactionTabs, ArHeroSelector, factionName, type ArHeroOption } from '../../../ui/metier';
import { ArBreakpointService } from '../../../ui/layout.services';
import { ArOverlayRef } from '../../../ui/overlay';

/** Heroes from the cards API for `ar-hero-selector`: `heroes` is null while loading; `error` on failure. */
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

/** A numbered collector copy (trophy prints, a per-copy serial segment), offered only with « Numérotées ». */
function isSerializedPrint(ref: string): boolean {
  const parts = ref.split('_');
  return parts[1] === 'WCF25' || parts.length > 6;
}

/** « _XXX »: the API's « any copy » slot of a serialized print, never a card. */
function isPlaceholderPrint(ref: string): boolean {
  const parts = ref.split('_');
  return parts.length > 6 && parts.at(-1) === 'XXX';
}

/**
 * Heroes to choose from: one per hero, or with « Alt arts » every other print as its own choice (numbered copies with
 * « Numérotées » only), as the site's hero picker.
 */
export function heroChoices(heroes: readonly HeroGroup[] | null, options: { altArts: boolean; serialized: boolean }): ArHeroOption[] | null {
  if (!heroes) return null;
  const standard = (h: HeroGroup): ArHeroOption => ({ ...h, unavailableOnBga: !heroOnBga(h.prints.length ? h.prints.map((p) => p.reference) : [h.reference]) });
  if (!options.altArts) return heroes.map(standard);
  return heroes.flatMap((h) => [
    standard(h),
    ...h.prints
      .filter((p) => p.variation !== 'standard' && p.reference !== h.reference && !isPlaceholderPrint(p.reference) && (options.serialized || !isSerializedPrint(p.reference)))
      .map((p) => ({ reference: p.reference, name: `${h.name} · ${printLabel(p)}`, faction: h.faction, unavailableOnBga: !heroOnBga([p.reference]) })),
  ]);
}

function printLabel(p: { reference: string; variation: string }): string {
  const set = p.reference.split('_')[1] ?? '';
  const kind = p.variation === 'promo' ? 'Promo' : p.variation === 'serialized' ? $localize`:@@shared.heroPicker.serializedPrint:Numérotée` : p.variation;
  return `${kind} ${set}`.trim();
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
  imports: [ArFactionTabs, ArHeroSelector, ArButton, ArChip],
  host: { class: 'ar-overlay-content' },
  templateUrl: './hero-picker.overlay.html',
  styleUrl: './hero-picker.overlay.scss',
})
export class HeroPickerOverlay {
  private readonly ownership = inject(OwnershipApiService);
  protected readonly ref = inject<ArOverlayRef<DeckHero, HeroPickerData>>(ArOverlayRef);
  protected readonly bp = inject(ArBreakpointService);
  private readonly load = injectHeroes();
  protected readonly altArts = signal(false);
  protected readonly serialized = signal(false);
  protected readonly heroes = computed(() => heroChoices(this.load.heroes(), { altArts: this.altArts(), serialized: this.serialized() }));
  /** « Alt arts » is hidden in « Global » alt-art mode: the preferred print comes from the player's preferences. */
  protected readonly global = toSignal(this.ownership.globalAltArts(), { initialValue: false });
  protected readonly error = this.load.error;
  protected readonly picked = signal<ArHeroOption | null>(this.ref.data?.selected ?? null);
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
export function openHeroPickerStep(parent: Pick<ArOverlayRef, 'openStep'>, selected?: DeckHero | null): ArOverlayRef<DeckHero, HeroPickerData> {
  return parent.openStep<HeroPickerOverlay, DeckHero, HeroPickerData>(HeroPickerOverlay, {
    title: heroPickerTitle(),
    data: { selected },
  });
}
