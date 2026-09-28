import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ar-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.sm]': "padding() === 'sm'", '[class.none]': "padding() === 'none'" },
  templateUrl: './card-surface.html',
  styleUrl: './card-surface.scss',
})
export class ArCardSurface {
  readonly padding = input<'md' | 'sm' | 'none'>('md');
}
