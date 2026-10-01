import { Component, computed, forwardRef, input, model } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { ArIcon } from '../../icon';
import { nextId, ValueAccessor } from '../value-accessor';

export interface ArOption<T = string> {
  value: T;
  label: string;
  /** `<optgroup>` label; consecutive options of the same group are listed under it. */
  group?: string;
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
  /** Runs of consecutive options with the same `group` (`''`: outside any `<optgroup>`). */
  protected readonly groups = computed(() =>
    this.options().reduce<{ label: string; options: ArOption[] }[]>((runs, o) => {
      const label = o.group ?? '';
      const last = runs.at(-1);
      if (last && last.label === label) last.options.push(o);
      else runs.push({ label, options: [o] });
      return runs;
    }, []),
  );

  pick(v: string): void {
    this.emit(v);
    this.onTouched();
  }
}
