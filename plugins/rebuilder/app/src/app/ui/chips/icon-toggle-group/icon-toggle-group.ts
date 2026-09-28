import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

/** Multi-toggle group of icon buttons (rarity filter). */
@Component({
  selector: 'ar-icon-toggle-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'group', '[attr.aria-label]': 'ariaLabel()', '[style.--cols]': 'options().length' },
  templateUrl: './icon-toggle-group.html',
  styleUrl: './icon-toggle-group.scss',
})
export class ArIconToggleGroup {
  readonly options = input<{ value: string; icon: string; label: string; short?: string }[]>([]);
  readonly values = model<string[]>([]);
  readonly ariaLabel = input('');

  toggle(v: string): void {
    this.values.update((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]));
  }
}
