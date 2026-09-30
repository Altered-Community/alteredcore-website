import { Component, ElementRef, forwardRef, input, model, output, viewChild } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { ArIcon, type ArIconName } from '../../icon';
import { nextId, ValueAccessor } from '../value-accessor';

/** Text field with optional label and leading icon — DS-Champs. */
@Component({
  selector: 'ar-input',
  imports: [ArIcon],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ArInput), multi: true }],
  templateUrl: './input.html',
  styleUrl: './input.scss',
})
export class ArInput extends ValueAccessor<string> {
  readonly value = model('');
  readonly label = input('');
  readonly ariaLabel = input('');
  readonly placeholder = input('');
  readonly type = input('text');
  readonly icon = input<ArIconName | undefined>(undefined);
  readonly required = input(false);
  readonly invalid = input(false);
  readonly clearable = input(false);
  /** Shown, not edited (a link to copy); focusing it selects the text. */
  readonly readonly = input(false);
  readonly appearance = input<'default' | 'subtle'>('default');
  readonly inputmode = input<string | null>(null);
  readonly enterkeyhint = input<string | null>(null);
  readonly enter = output<string>();
  protected readonly id = nextId('ar-input');
  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');

  focus(): void {
    this.field()?.nativeElement.focus();
  }
}
