import { Component, input, output } from '@angular/core';

/**
 * Rich radio choice (formats). Wrap several in a `role=radiogroup` container.
 * `row`: tag beside the title; `stacked`: tag under the description; `compact`: one-line description with
 * ellipsis and the tag vertically centred on the right (Nouveau deck). Look: `ac-radio-card`.
 */
@Component({
  selector: 'ac-radio-card',
  templateUrl: './radio-card.html',
  styleUrl: './radio-card.scss',
})
export class AcRadioCard {
  readonly name = input('ac-radio');
  readonly title = input.required<string>();
  readonly description = input('');
  readonly tag = input<{ label: string; tone: 'green' | 'violet' | 'red' } | null>(null);
  readonly checked = input(false);
  readonly layout = input<'row' | 'stacked' | 'compact'>('row');
  readonly choose = output<void>();
}
