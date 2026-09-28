import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ArIcon } from '../../icon';

/** Titled group of deck cards (Personnages 19 · 9 cartes différentes), optionally foldable. */
@Component({
  selector: 'ar-deck-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ArIcon, NgTemplateOutlet],
  host: { '[class.flat]': "appearance() === 'flat'" },
  templateUrl: './deck-section.html',
  styleUrl: './deck-section.scss',
})
export class ArDeckSection {
  readonly title = input.required<string>();
  readonly count = input(0);
  readonly distinct = input<number | null>(null);
  readonly collapsible = input(false);
  readonly appearance = input<'card' | 'flat'>('card');
  readonly open = model(true);
}
