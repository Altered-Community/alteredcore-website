import { Component, computed, input, model, output } from '@angular/core';
import { AcIcon } from '../../icon';
import { nextId } from '../value-accessor';

/** Deck title editable in place (desktop editor header). */
@Component({
  selector: 'ac-editable-title',
  imports: [AcIcon],
  templateUrl: './editable-title.html',
  styleUrl: './editable-title.scss',
})
export class AcEditableTitle {
  readonly value = model('');
  /** Someone else's deck: the name is shown, not editable. */
  readonly readonly = input(false);
  readonly ariaLabel = input($localize`:@@ui.editableTitle.label:Nom du deck`);
  readonly commit = output<string>();
  protected readonly id = nextId('ac-title');
  protected readonly width = computed(() => Math.min(44, Math.max(8, Math.ceil(this.value().length * 1.2) + 2)));
}
