import { Component, computed, input } from '@angular/core';
import type { DeckSaveState } from '../../../core/deck-store';
import { AcIcon } from '../../icon';

/**
 * Discreet autosave indicator: « Enregistrement… », « Enregistré » or « Non enregistré » (the
 * reason and « Réessayer » are shown by the screen). Nothing before the first change.
 * `iconOnly`: the text is kept for screen readers only (compact app bar).
 */
@Component({
  selector: 'ac-save-status',
  imports: [AcIcon],
  host: {
    role: 'status',
    '[class]': "'ac-save-status--' + state()",
    '[class.icon-only]': 'iconOnly()',
    '[attr.title]': 'iconOnly() ? label() : null',
  },
  templateUrl: './save-status.html',
  styleUrl: './save-status.scss',
})
export class AcSaveStatus {
  readonly state = input.required<DeckSaveState>();
  readonly iconOnly = input(false);

  protected readonly label = computed(() => {
    const state = this.state();
    switch (state) {
      case 'idle':
        return '';
      case 'pending':
      case 'saving':
        return $localize`:@@ui.saveStatus.saving:Enregistrement…`;
      case 'saved':
        return $localize`:@@ui.saveStatus.saved:Enregistré`;
      case 'error':
        return $localize`:@@ui.saveStatus.error:Non enregistré`;
      default: {
        const never: never = state;
        return never;
      }
    }
  });
}
