import { Component, forwardRef, input, model } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { ArIcon } from '../../icon';
import { nextId, ValueAccessor } from '../value-accessor';

export interface ArOption<T = string> {
  value: T;
  label: string;
}

/** Native select, styled — DS-Champs. */
@Component({
  selector: 'ar-select',
  imports: [ArIcon],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ArSelect), multi: true }],
  templateUrl: './select.html',
  styleUrl: './select.scss',
})
export class ArSelect extends ValueAccessor<string> {
  readonly value = model('');
  readonly options = input<ArOption[]>([]);
  readonly label = input('');
  readonly ariaLabel = input('');
  readonly inlineLabel = input(false);
  protected readonly id = nextId('ar-select');

  pick(v: string): void {
    this.emit(v);
    this.onTouched();
  }
}
