import { Component, forwardRef, input, model } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { nextId, ValueAccessor } from '../value-accessor';

export interface AcOption<T = string> {
  value: T;
  label: string;
}

/** Native select: `ac-field` / `ac-select` (design-system/css/components/field.css). */
@Component({
  selector: 'ac-select',
  host: { class: 'ac-field' },
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => AcSelect), multi: true }],
  templateUrl: './select.html',
  styleUrl: './select.scss',
})
export class AcSelect extends ValueAccessor<string> {
  readonly value = model('');
  readonly options = input<AcOption[]>([]);
  readonly label = input('');
  readonly ariaLabel = input('');
  readonly inlineLabel = input(false);
  protected readonly id = nextId('ac-select');

  pick(v: string): void {
    this.emit(v);
    this.onTouched();
  }
}
