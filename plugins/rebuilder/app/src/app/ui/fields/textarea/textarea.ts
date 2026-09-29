import { Component, forwardRef, input, model } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { nextId, ValueAccessor } from '../value-accessor';

/** Multi-line text field with a label, same look as `ar-input` — DS-Champs. */
@Component({
  selector: 'ar-textarea',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ArTextarea), multi: true }],
  templateUrl: './textarea.html',
  styleUrl: './textarea.scss',
})
export class ArTextarea extends ValueAccessor<string> {
  readonly value = model('');
  readonly label = input('');
  readonly ariaLabel = input('');
  readonly placeholder = input('');
  /** Visible lines before the field scrolls (the user can make it taller). */
  readonly rows = input(4);
  readonly maxlength = input<number | null>(null);
  readonly invalid = input(false);
  protected readonly id = nextId('ar-textarea');
}
