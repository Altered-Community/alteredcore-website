import { Component, computed, input, output } from '@angular/core';
import type { AbilityRef, EffectBlock } from '../../../core/card-filters';
import { AcIcon } from '../../icon';
import { AcRichLabel } from '../../fields';

/** "Quand … ou … / Si … / Alors … ou …" summary of one effect block. */
// `title` is an input: a static title="…" would also stay on the host as the browser's tooltip over the whole component.
@Component({
  selector: 'ac-effect-summary',
  host: { '[attr.title]': 'null' },
  imports: [AcIcon, AcRichLabel],
  templateUrl: './effect-summary.html',
  styleUrl: './effect-summary.scss',
})
export class AcEffectSummary {
  readonly effect = input.required<EffectBlock>();
  readonly title = input($localize`:@@ui.effectSummary.title:Effet 1`);
  /** « Dupliquer » offered: not for a block that exists once (the support effect). */
  readonly duplicable = input(true);
  readonly edit = output<void>();
  readonly duplicate = output<void>();
  readonly remove = output<void>();
  protected readonly editLabel = computed(() => $localize`:@@ui.effectSummary.edit:Modifier ${this.title()}:title:`);
  protected readonly duplicateLabel = computed(() => $localize`:@@ui.effectSummary.duplicate:Dupliquer ${this.title()}:title:`);
  protected readonly removeLabel = computed(() => $localize`:@@ui.effectSummary.remove:Supprimer ${this.title()}:title:`);
  protected readonly rows = computed(() => {
    const e = this.effect();
    const out: { label: string; values: AbilityRef[] }[] = [];
    if (e.triggers.length) out.push({ label: $localize`:@@ui.effectSummary.when:Quand`, values: e.triggers });
    if (e.conditions.length) out.push({ label: $localize`:@@ui.effectSummary.if:Si`, values: e.conditions });
    if (e.effects.length) out.push({ label: $localize`:@@ui.effectSummary.then:Alors`, values: e.effects });
    return out;
  });
}
