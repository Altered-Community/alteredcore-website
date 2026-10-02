import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, concat, forkJoin, of, switchMap, type Observable } from 'rxjs';
import type { AbilityRef, EffectBlock } from '../../../core/card-filters';
import { UniquesApiService, type AbilityKind, type UniquesEffect, type UniquesQuery } from '../../../core/uniques-api.service';
import { AcButton } from '../../../ui/buttons';
import { AcCombobox } from '../../../ui/fields';
import { AcBreakpointService } from '../../../ui/layout.services';
import { AcOverlayRef, AcOverlayService } from '../../../ui/overlay';

export interface EffectEditorData {
  effect: EffectBlock;
  index: number;
  /**
   * The search the block belongs to, `effects[index]` being this block: each list is narrowed to the
   * values that still give a card. Without it, the lists show every value.
   */
  query?: UniquesQuery;
}

/** Ids each list is narrowed to; `null` keeps the whole list (not loaded yet, or the API failed). */
type Narrowing = Record<AbilityKind, Set<number> | null>;

const NO_NARROWING: Narrowing = { triggers: null, conditions: null, effects: null };

/** ac-effect-editor — one combobox per criterion; values OR-ed, criteria AND-ed. */
@Component({
  selector: 'ac-effect-editor',
  imports: [AcCombobox, AcButton],
  host: { class: 'ac-overlay-content' },
  templateUrl: './effect-editor.overlay.html',
  styleUrl: './effect-editor.overlay.scss',
})
export class EffectEditorOverlay {
  protected readonly ref = inject<AcOverlayRef<EffectBlock, EffectEditorData>>(AcOverlayRef);
  private readonly api = inject(UniquesApiService);
  protected readonly bp = inject(AcBreakpointService);
  protected readonly loadError = signal(false);

  protected readonly triggers = this.load('triggers');
  protected readonly conditions = this.load('conditions');
  protected readonly effects = this.load('effects');

  protected readonly pickedTriggers = signal<AbilityRef[]>(this.ref.data.effect.triggers);
  protected readonly pickedConditions = signal<AbilityRef[]>(this.ref.data.effect.conditions);
  protected readonly pickedEffects = signal<AbilityRef[]>(this.ref.data.effect.effects);

  private readonly narrowing = toSignal(
    toObservable(
      computed<UniquesEffect>(() => ({
        triggers: this.pickedTriggers().map((a) => a.id),
        conditions: this.pickedConditions().map((a) => a.id),
        effects: this.pickedEffects().map((a) => a.id),
      })),
    ).pipe(switchMap((block) => this.narrow(block))),
    { initialValue: NO_NARROWING },
  );

  protected readonly triggerOptions = computed(() => narrowed(this.triggers(), this.narrowing().triggers));
  protected readonly conditionOptions = computed(() => narrowed(this.conditions(), this.narrowing().conditions));
  protected readonly effectOptions = computed(() => narrowed(this.effects(), this.narrowing().effects));

  constructor() {
    this.ref.title.set(effectTitle(this.ref.data.index));
    this.ref.headerAction.set({
      label: $localize`:@@search.effect.clear:Effacer`,
      run: () => {
        this.pickedTriggers.set([]);
        this.pickedConditions.set([]);
        this.pickedEffects.set([]);
      },
    });
  }

  private load(kind: AbilityKind) {
    return toSignal(
      this.api.abilities(kind).pipe(
        catchError(() => {
          this.loadError.set(true);
          return of([] as AbilityRef[]);
        }),
      ),
      { initialValue: [] as AbilityRef[] },
    );
  }

  /**
   * The ids each list keeps with `block` as picked so far. The whole lists come back first, so a
   * value that a change makes possible again is never missing while the answer is on its way.
   * An exact reference looks one card up, whatever the other criteria: nothing to narrow.
   */
  private narrow(block: UniquesEffect): Observable<Narrowing> {
    const { query, index } = this.ref.data;
    if (!query || query.reference) return of(NO_NARROWING);
    const ids = (kind: AbilityKind) => this.api.narrowAbilities(query, index, block, kind).pipe(catchError(() => of(null)));
    return concat(of(NO_NARROWING), forkJoin({ triggers: ids('triggers'), conditions: ids('conditions'), effects: ids('effects') }));
  }

  apply(): void {
    this.ref.close({
      ...this.ref.data.effect,
      triggers: this.pickedTriggers(),
      conditions: this.pickedConditions(),
      effects: this.pickedEffects(),
    });
  }
}

function narrowed(options: AbilityRef[], ids: Set<number> | null): AbilityRef[] {
  return ids ? options.filter((o) => ids.has(o.id)) : options;
}

/** « Effet n », 1-based. */
export function effectTitle(index: number): string {
  return $localize`:@@search.effect.title:Effet ${index + 1}:n:`;
}

export function openEffectEditor(overlay: AcOverlayService, data: EffectEditorData) {
  return overlay.open<EffectEditorOverlay, EffectBlock, EffectEditorData>(EffectEditorOverlay, {
    title: effectTitle(data.index),
    data,
    width: 520,
    sheetHeight: 'full',
  });
}

/** « Effet n » in place of the content of `parent` (mobile « Filtres » sheet), with a back arrow. */
export function openEffectEditorStep(parent: Pick<AcOverlayRef, 'openStep'>, data: EffectEditorData) {
  return parent.openStep<EffectEditorOverlay, EffectBlock, EffectEditorData>(EffectEditorOverlay, {
    title: effectTitle(data.index),
    data,
  });
}
