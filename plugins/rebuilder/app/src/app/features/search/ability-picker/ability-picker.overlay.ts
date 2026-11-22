import { Component, inject, type Signal, type WritableSignal } from '@angular/core';
import type { AbilityRef } from '../../../core/card-filters';
import { AcButton } from '../../../ui/buttons';
import { AcCheckList } from '../../../ui/fields';
import { AcOverlayRef } from '../../../ui/overlay';

export interface AbilityPickerData {
  options: Signal<AbilityRef[]>;
  /** The editor's own list: a check shows on its criterion at once, « Valider » only goes back. */
  picked: WritableSignal<AbilityRef[]>;
  /** Accessible name of the list (« effet »). */
  label: string;
  searchPlaceholder: string;
}

/**
 * ac-ability-picker — compact step of the effect editor for one criterion: the search and the checkbox
 * list over the whole sheet, open while values are checked. The values show, joined by « ou », on the
 * criterion once back.
 */
@Component({
  selector: 'ac-ability-picker',
  imports: [AcCheckList, AcButton],
  host: { class: 'ac-overlay-content' },
  templateUrl: './ability-picker.overlay.html',
  styleUrl: './ability-picker.overlay.scss',
})
export class AbilityPickerStep {
  protected readonly ref = inject<AcOverlayRef<void, AbilityPickerData>>(AcOverlayRef);
  protected readonly data = this.ref.data;

  constructor() {
    this.ref.headerAction.set({
      label: $localize`:@@search.effect.uncheckAll:Tout décocher`,
      run: () => this.data.picked.set([]),
    });
  }
}
