import { Component, computed, input } from '@angular/core';

/** Avatar initial used in app bars: `ac-avatar` (design-system/css/components/chips.css). */
@Component({
  selector: 'ac-avatar',
  host: { class: 'ac-avatar', '[class.ac-avatar--lg]': 'size() === 32' },
  templateUrl: './avatar.html',
})
export class AcAvatar {
  readonly name = input('');
  readonly size = input<28 | 32>(28);
  protected readonly initial = computed(() => (this.name().trim()[0] ?? '?').toUpperCase());
}
