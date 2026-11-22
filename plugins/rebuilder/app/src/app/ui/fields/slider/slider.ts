import { Component, computed, input, model } from '@angular/core';

/** Slider that applies at once: `ac-slider` (design-system/css/components/field.css), a native range input. */
@Component({
  selector: 'ac-slider',
  templateUrl: './slider.html',
})
export class AcSlider {
  readonly ariaLabel = input.required<string>();
  readonly min = input(0);
  readonly max = input(100);
  readonly step = input(1);
  readonly value = model(0);
  /** Value as a share of the range, for the filled part of the track. */
  protected readonly fill = computed(() => `${((this.value() - this.min()) / ((this.max() - this.min()) || 1)) * 100}%`);
}
