import { Component, computed, input } from '@angular/core';
import type { RarityLimit } from '../../../core/deck-rules';
import { AcBadge, RARITY_ICONS } from '../../chips';

/**
 * Rares, Exalteds and Uniques against the format's caps, one badge each: grey below the cap, green at it, red above.
 */
@Component({
  selector: 'ac-rarity-limits',
  imports: [AcBadge],
  host: { role: 'group', '[attr.aria-label]': 'groupLabel' },
  templateUrl: './rarity-limits.html',
  styleUrl: './rarity-limits.scss',
})
export class AcRarityLimits {
  readonly limits = input.required<readonly RarityLimit[]>();
  protected readonly groupLabel = $localize`:@@ui.rarityLimits.label:Raretés limitées par le format`;
  protected readonly items = computed(() =>
    this.limits().map((r) => {
      const icon = RARITY_ICONS.find((i) => i.key === r.key)!;
      return {
        ...r,
        icon: icon.src,
        tone: r.count > r.limit ? ('red' as const) : r.count === r.limit ? ('green' as const) : ('neutral' as const),
        label: $localize`:@@ui.rarityLimits.item:${icon.label}:rarity: : ${r.count}:count: sur ${r.limit}:limit: maximum`,
      };
    }),
  );
}
