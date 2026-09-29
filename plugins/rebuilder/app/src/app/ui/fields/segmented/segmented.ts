import { Component, computed, input, model } from '@angular/core';
import { ArIcon, type ArIconName } from '../../icon';

export interface ArSegment<T = string> {
  value: T;
  label?: string;
  icon?: ArIconName;
  ariaLabel?: string;
}

/** Segmented control — DS-Champs / DS-Navigation. */
@Component({
  selector: 'ar-segmented',
  imports: [ArIcon],
  host: {
    role: 'group',
    '[attr.aria-label]': 'ariaLabel()',
    '[class.full]': 'fullWidth()',
    '[class.sm]': "size() === 'sm'",
    '[class.lg]': "size() === 'lg'",
    '[class.icons]': 'iconOnly()',
    '[style.--ar-seg-cols]': 'options().length',
  },
  templateUrl: './segmented.html',
  styleUrl: './segmented.scss',
})
export class ArSegmented<T = string> {
  readonly options = input<ArSegment<T>[]>([]);
  readonly value = model<T>();
  readonly ariaLabel = input('');
  readonly fullWidth = input(false);
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  protected readonly iconOnly = computed(() => this.options().every((o) => o.icon && !o.label));
}
