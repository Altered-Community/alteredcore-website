import { Component, computed, input, model } from '@angular/core';
import { AcIcon, type AcIconName } from '../../icon';

export interface AcSegment<T = string> {
  value: T;
  label?: string;
  icon?: AcIconName;
  ariaLabel?: string;
}

/** Segmented control: `ac-segmented` (design-system/css/components/segmented.css). */
@Component({
  selector: 'ac-segmented',
  imports: [AcIcon],
  host: {
    role: 'group',
    class: 'ac-segmented',
    '[attr.aria-label]': 'ariaLabel()',
    '[class.ac-segmented--full]': 'fullWidth()',
    '[class.ac-segmented--lg]': "size() === 'lg'",
  },
  templateUrl: './segmented.html',
  styleUrl: './segmented.scss',
})
export class AcSegmented<T = string> {
  readonly options = input<AcSegment<T>[]>([]);
  readonly value = model<T>();
  readonly ariaLabel = input('');
  readonly fullWidth = input(false);
  readonly size = input<'md' | 'lg'>('md');
  protected readonly iconOnly = computed(() => this.options().every((o) => o.icon && !o.label));
}
