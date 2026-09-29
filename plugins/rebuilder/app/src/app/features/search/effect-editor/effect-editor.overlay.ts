import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import type { AbilityRef, EffectBlock } from '../../../core/card-filters';
import { UniquesApiService, type AbilityKind } from '../../../core/uniques-api.service';
import { AcButton } from '../../../ui/buttons';
import { AcCombobox } from '../../../ui/fields';
import { AcBreakpointService } from '../../../ui/layout.services';
import { AcOverlayRef, AcOverlayService } from '../../../ui/overlay';

export interface EffectEditorData {
  effect: EffectBlock;
  index: number;
}

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

  apply(): void {
    this.ref.close({
      ...this.ref.data.effect,
      triggers: this.pickedTriggers(),
      conditions: this.pickedConditions(),
      effects: this.pickedEffects(),
    });
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
