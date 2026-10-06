import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal, type Signal, type WritableSignal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, concat, of, switchMap } from 'rxjs';
import type { AbilityRef, EffectBlock } from '../../../core/card-filters';
import { UniquesApiService, type AbilityKind, type UniquesEffect, type UniquesQuery } from '../../../core/uniques-api.service';
import { AcButton } from '../../../ui/buttons';
import { AcCheckList, AcOrValues } from '../../../ui/fields';
import { AcIcon } from '../../../ui/icon';
import { AcBreakpointService } from '../../../ui/layout.services';
import { AcOverlayRef, AcOverlayService } from '../../../ui/overlay';
import { AbilityPickerStep, type AbilityPickerData } from '../ability-picker/ability-picker.overlay';

export interface EffectEditorData {
  effect: EffectBlock;
  index: number;
  /**
   * The search the block belongs to, `effects[index]` being this block: each list is narrowed to the
   * values that still give a card. Without it, the lists show every value.
   */
  query?: UniquesQuery;
}

const KINDS: AbilityKind[] = ['triggers', 'conditions', 'effects'];

interface CriterionTexts {
  /** « Quand », « Si », « Alors ». */
  label: string;
  /** « déclencheur », « condition », « effet ». */
  sub: string;
  /** Compact: button that opens the criterion's list. */
  add: string;
  /** Nothing picked: the criterion does not filter. */
  any: string;
  search: string;
}

const TEXTS: Record<AbilityKind, CriterionTexts> = {
  triggers: {
    label: $localize`:@@search.effect.whenLabel:Quand`,
    sub: $localize`:@@search.effect.triggerSub:déclencheur`,
    add: $localize`:@@search.effect.addTrigger:Ajouter un déclencheur`,
    any: $localize`:@@search.effect.anyTrigger:Tous les déclencheurs`,
    search: $localize`:@@search.effect.searchTrigger:Rechercher un déclencheur…`,
  },
  conditions: {
    label: $localize`:@@search.effect.ifLabel:Si`,
    sub: $localize`:@@search.effect.conditionSub:condition`,
    add: $localize`:@@search.effect.addCondition:Ajouter une condition`,
    any: $localize`:@@search.effect.anyCondition:Toutes les conditions`,
    search: $localize`:@@search.effect.searchCondition:Rechercher une condition…`,
  },
  effects: {
    label: $localize`:@@search.effect.thenLabel:Alors`,
    sub: $localize`:@@search.effect.effectSub:effet`,
    add: $localize`:@@search.effect.addEffect:Ajouter un effet`,
    any: $localize`:@@search.effect.anyEffect:Tous les effets`,
    search: $localize`:@@search.effect.searchEffect:Rechercher un effet…`,
  },
};

/** One criterion of the block: its texts, the values offered and the values picked. */
interface Criterion extends CriterionTexts {
  kind: AbilityKind;
  options: Signal<AbilityRef[]>;
  picked: WritableSignal<AbilityRef[]>;
}

/**
 * ac-effect-editor — values OR-ed inside a criterion, criteria AND-ed. Window: the three criteria on the
 * left with their values, the checkbox list of the selected one on the right, so checking never moves
 * the list. Compact: the criteria, each opening its checkbox list as a step (`ac-ability-picker`).
 */
@Component({
  selector: 'ac-effect-editor',
  imports: [AcCheckList, AcOrValues, AcButton, AcIcon, NgTemplateOutlet],
  host: { class: 'ac-overlay-content' },
  templateUrl: './effect-editor.overlay.html',
  styleUrl: './effect-editor.overlay.scss',
})
export class EffectEditorOverlay {
  protected readonly ref = inject<AcOverlayRef<EffectBlock, EffectEditorData>>(AcOverlayRef);
  private readonly api = inject(UniquesApiService);
  protected readonly bp = inject(AcBreakpointService);
  protected readonly loadError = signal(false);

  private readonly picked: Record<AbilityKind, WritableSignal<AbilityRef[]>> = {
    triggers: signal(this.ref.data.effect.triggers),
    conditions: signal(this.ref.data.effect.conditions),
    effects: signal(this.ref.data.effect.effects),
  };

  protected readonly criteria: Criterion[] = KINDS.map((kind) => ({ kind, ...TEXTS[kind], options: this.options(kind), picked: this.picked[kind] }));

  /** Window: the criterion whose list is shown. */
  protected readonly active = signal<AbilityKind>('triggers');

  constructor() {
    this.ref.title.set(effectTitle(this.ref.data.index));
    this.ref.headerAction.set({
      label: $localize`:@@search.effect.clear:Effacer`,
      run: () => KINDS.forEach((k) => this.picked[k].set([])),
    });
  }

  /** Compact: the criterion's checkbox list as a step of the same sheet. */
  protected openPicker(c: Criterion): void {
    this.ref.openStep<AbilityPickerStep, void, AbilityPickerData>(AbilityPickerStep, {
      title: c.label,
      subtitle: c.sub,
      data: { options: c.options, picked: c.picked, label: c.sub, searchPlaceholder: c.search },
    });
  }

  /** The values of `kind`, narrowed to those that still give a card. */
  private options(kind: AbilityKind): Signal<AbilityRef[]> {
    const all = toSignal(
      this.api.abilities(kind).pipe(
        catchError(() => {
          this.loadError.set(true);
          return of([] as AbilityRef[]);
        }),
      ),
      { initialValue: [] as AbilityRef[] },
    );
    const ids = this.narrowing(kind);
    return computed(() => {
      const keep = ids();
      return keep ? all().filter((o) => keep.has(o.id)) : all();
    });
  }

  /**
   * The ids `kind` keeps with the block as picked, `null` for the whole list. The server leaves the
   * criterion being narrowed out, so only the two other criteria ask again: checking values in a list
   * never reshapes that list. The whole list comes back first, so a value that a change makes possible
   * again is never missing while the answer is on its way. An exact reference looks one card up,
   * whatever the other criteria: nothing to narrow.
   */
  private narrowing(kind: AbilityKind): Signal<Set<number> | null> {
    const { query, index } = this.ref.data;
    if (!query || query.reference) return signal(null);
    const others = computed(() => KINDS.filter((k) => k !== kind).map((k) => this.picked[k]()));
    const ids = (values: Record<AbilityKind, AbilityRef[]>): UniquesEffect => ({
      triggers: values.triggers.map((a) => a.id),
      conditions: values.conditions.map((a) => a.id),
      effects: values.effects.map((a) => a.id),
    });
    return toSignal(
      toObservable(others).pipe(
        switchMap(() => concat(of(null), this.api.narrowAbilities(query, index, ids(this.values()), kind).pipe(catchError(() => of(null))))),
      ),
      { initialValue: null },
    );
  }

  private values(): Record<AbilityKind, AbilityRef[]> {
    return { triggers: this.picked.triggers(), conditions: this.picked.conditions(), effects: this.picked.effects() };
  }

  apply(): void {
    this.ref.close({ ...this.ref.data.effect, ...this.values() });
  }
}

/** « Effet n », 1-based. */
export function effectTitle(index: number): string {
  return $localize`:@@search.effect.title:Effet ${index + 1}:n:`;
}

export function openEffectEditor(overlay: AcOverlayService, data: EffectEditorData) {
  return overlay.open<EffectEditorOverlay, EffectBlock, EffectEditorData>(EffectEditorOverlay, {
    title: effectTitle(data.index),
    data,
    width: 880,
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
