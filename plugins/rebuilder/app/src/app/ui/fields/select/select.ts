import { Component, computed, forwardRef, input, model } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { nextId, ValueAccessor } from '../value-accessor';

export interface AcOption<T = string> {
  value: T;
  label: string;
  /** `<optgroup>` label; consecutive options of the same group are listed under it. */
  group?: string;
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
  /** Runs of consecutive options with the same `group` (`''`: outside any `<optgroup>`). */
  protected readonly groups = computed(() =>
    this.options().reduce<{ label: string; options: AcOption[] }[]>((runs, o) => {
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
