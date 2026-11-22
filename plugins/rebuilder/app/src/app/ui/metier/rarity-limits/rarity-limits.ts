import { Component, computed, input } from '@angular/core';
import type { RarityLimit } from '../../../core/deck-rules';
import { AcBadge, RARITY_ICONS } from '../../chips';

/** A capped rarity as shown: its icon, its name, `under` / `at` / `over` the cap, and « Rare : 12 sur 15 maximum ». */
export interface RarityLimitItem extends RarityLimit {
  icon: string;
  /** The icon file's size (`width` / `height` attributes). */
  iconWidth: number;
  iconHeight: number;
  name: string;
  state: 'under' | 'at' | 'over';
  label: string;
}

export function rarityLimitItems(limits: readonly RarityLimit[]): RarityLimitItem[] {
  return limits.map((r) => {
    const { src: icon, label: name, width: iconWidth, height: iconHeight } = RARITY_ICONS.find((i) => i.key === r.key)!;
    return {
      ...r,
      icon,
      iconWidth,
      iconHeight,
      name,
      state: r.count > r.limit ? 'over' : r.count === r.limit ? 'at' : 'under',
      label: $localize`:@@ui.rarityLimits.item:${name}:rarity: : ${r.count}:count: sur ${r.limit}:limit: maximum`,
    };
  });
}

const TONES = { under: 'neutral', at: 'green', over: 'red' } as const;

/**
 * Rares, Exalteds and Uniques against the format's caps, one badge each: grey below the cap, green at it, red above.
 */
@Component({
  selector: 'ac-rarity-limits',
  imports: [AcBadge],
  host: { role: 'group', '[attr.aria-label]': 'groupLabel', '[class.dense]': 'dense()' },
  templateUrl: './rarity-limits.html',
  styleUrl: './rarity-limits.scss',
})
export class AcRarityLimits {
  readonly limits = input.required<readonly RarityLimit[]>();
  /** Dense badges and smaller icons: a phone's app bar. */
  readonly dense = input(false);
  protected readonly groupLabel = $localize`:@@ui.rarityLimits.label:Raretés limitées par le format`;
  protected readonly items = computed(() => rarityLimitItems(this.limits()).map((r) => ({ ...r, tone: TONES[r.state] })));
}
