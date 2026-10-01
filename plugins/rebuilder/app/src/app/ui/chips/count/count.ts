import { Component, input } from '@angular/core';

@Component({
  selector: 'ar-count',
  host: { '[class.success]': "tone() === 'success'", '[class.soft]': "tone() === 'soft'" },
  templateUrl: './count.html',
  styleUrl: './count.scss',
})
export class ArCount {
  readonly value = input<number | string>(0);
  readonly tone = input<'dark' | 'success' | 'soft'>('dark');
}
