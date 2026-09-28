import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Rich radio choice (formats). Wrap several in a `role=radiogroup` container.
 * `row`: tag beside the title; `stacked`: tag under the description; `compact`: one-line description with
 * ellipsis and the tag vertically centred on the right (Nouveau deck).
 */
@Component({
  selector: 'ar-radio-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.selected]': 'checked()',
    '[class.stacked]': "layout() === 'stacked'",
  },
  templateUrl: './radio-card.html',
  styleUrl: './radio-card.scss',
})
export class ArRadioCard {
  readonly name = input('ar-radio');
  readonly title = input.required<string>();
  readonly description = input('');
  readonly tag = input<{ label: string; tone: 'green' | 'violet' | 'red' } | null>(null);
  readonly checked = input(false);
  readonly layout = input<'row' | 'stacked' | 'compact'>('row');
  readonly choose = output<void>();
}
