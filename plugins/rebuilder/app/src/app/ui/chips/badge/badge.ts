import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ArIcon, type ArIconName } from '../../icon';
import type { ArTone } from '../../fields';

@Component({
  selector: 'ar-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ArIcon],
  host: { '[class]': "'tone-' + tone() + (size() === 28 ? ' lg' : '')" },
  templateUrl: './badge.html',
  styleUrl: './badge.scss',
})
export class ArBadge {
  readonly tone = input<ArTone>('blue');
  readonly icon = input<ArIconName | undefined>(undefined);
  readonly size = input<24 | 28>(24);
}
