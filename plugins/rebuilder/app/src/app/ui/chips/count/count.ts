import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ar-count',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.success]': "tone() === 'success'", '[class.soft]': "tone() === 'soft'" },
  templateUrl: './count.html',
  styleUrl: './count.scss',
})
export class ArCount {
  readonly value = input<number | string>(0);
  readonly tone = input<'dark' | 'success' | 'soft'>('dark');
}
