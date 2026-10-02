import { Component, input } from '@angular/core';

/** Card surface: `ac-card` (design-system/css/components/card.css). */
@Component({
  selector: 'ac-card',
  host: { class: 'ac-card', '[class.ac-card--sm]': "padding() === 'sm'", '[class.ac-card--flush]': "padding() === 'none'" },
  templateUrl: './card-surface.html',
})
export class AcCardSurface {
  readonly padding = input<'md' | 'sm' | 'none'>('md');
}
