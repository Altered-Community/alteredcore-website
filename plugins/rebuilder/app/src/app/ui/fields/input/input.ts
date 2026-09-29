import { Component, ElementRef, forwardRef, input, model, output, viewChild } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { AcIcon, type AcIconName } from '../../icon';
import { nextId, ValueAccessor } from '../value-accessor';

/** Text field with optional label and leading icon: `ac-field` / `ac-input` (design-system/css/components/field.css). */
@Component({
  selector: 'ac-input',
  imports: [AcIcon],
  host: { class: 'ac-field' },
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => AcInput), multi: true }],
  templateUrl: './input.html',
  styleUrl: './input.scss',
})
export class AcInput extends ValueAccessor<string> {
  readonly value = model('');
  readonly label = input('');
  readonly ariaLabel = input('');
  readonly placeholder = input('');
  readonly type = input('text');
  readonly icon = input<AcIconName | undefined>(undefined);
  readonly required = input(false);
  readonly invalid = input(false);
  readonly clearable = input(false);
  readonly appearance = input<'default' | 'subtle'>('default');
  readonly inputmode = input<string | null>(null);
  readonly enterkeyhint = input<string | null>(null);
  readonly enter = output<string>();
  protected readonly id = nextId('ac-input');
  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');

  focus(): void {
    this.field()?.nativeElement.focus();
  }
}
