import { Component, input, output } from '@angular/core';

/**
 * Rich radio choice (formats). Wrap several in a `role=radiogroup` container.
 * `row`: tag beside the title; `stacked`: tag under the description; `compact`: one-line description with
 * ellipsis and the tag vertically centred on the right (Nouveau deck). Look: `ac-radio-card`.
 */
// `title` is an input: a static title="…" would also stay on the host as the browser's tooltip over the whole component.
@Component({
  selector: 'ac-radio-card',
  host: { '[attr.title]': 'null' },
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
