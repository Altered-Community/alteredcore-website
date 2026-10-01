import { Component, input } from '@angular/core';

@Component({
  selector: 'ar-tag',
  host: { '[class]': "'tone-' + tone()" },
  templateUrl: './tag.html',
  styleUrl: './tag.scss',
})
export class ArTag {
  readonly tone = input<'green' | 'violet' | 'red' | 'orange'>('green');
}
