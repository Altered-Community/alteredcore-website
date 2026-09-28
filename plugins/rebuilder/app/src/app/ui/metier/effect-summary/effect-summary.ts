import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { AbilityRef, EffectBlock } from '../../../core/card-filters';
import { ArIcon } from '../../icon';

/** "Quand … ou … / Si … / Alors … ou …" summary of one effect block. */
@Component({
  selector: 'ar-effect-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ArIcon],
  templateUrl: './effect-summary.html',
  styleUrl: './effect-summary.scss',
})
export class ArEffectSummary {
  readonly effect = input.required<EffectBlock>();
  readonly title = input('Effet 1');
  readonly edit = output<void>();
  readonly remove = output<void>();
  protected readonly rows = computed(() => {
    const e = this.effect();
    const out: { label: string; values: AbilityRef[] }[] = [];
    if (e.triggers.length) out.push({ label: 'Quand', values: e.triggers });
    if (e.conditions.length) out.push({ label: 'Si', values: e.conditions });
    if (e.effects.length) out.push({ label: 'Alors', values: e.effects });
    return out;
  });
}
