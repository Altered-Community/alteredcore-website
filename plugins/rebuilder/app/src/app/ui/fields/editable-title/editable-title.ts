import { Component, computed, input, model, output } from '@angular/core';
import { ArIcon } from '../../icon';
import { nextId } from '../value-accessor';

/** Deck title editable in place (desktop editor header). */
@Component({
  selector: 'ar-editable-title',
  imports: [ArIcon],
  templateUrl: './editable-title.html',
  styleUrl: './editable-title.scss',
})
export class ArEditableTitle {
  readonly value = model('');
  readonly ariaLabel = input('Nom du deck');
  readonly commit = output<string>();
  protected readonly id = nextId('ar-title');
  protected readonly width = computed(() => Math.min(44, Math.max(8, Math.ceil(this.value().length * 1.2) + 2)));
}
