import { Component, computed, input } from '@angular/core';
import type { RarityLimit } from '../../../core/format-rules';
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

/** The Commons, which no format caps: their icon, their name and « Commune : 20 ». */
export function commonItem(count: number) {
  const { src: icon, label: name, width: iconWidth, height: iconHeight } = RARITY_ICONS.find((i) => i.key === 'C')!;
  return { icon, iconWidth, iconHeight, count, label: $localize`:@@ui.rarityLimits.common:${name}:rarity: : ${count}:count:` };
}

/**
 * Rares, Exalteds and Uniques against the format's caps, one badge each: grey below the cap, green at it, red above.
 * `commons` (when given): a grey badge before them with the deck's Commons, which have no cap.
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
  /** The deck's Commons, shown first; `null`: left out. */
  readonly commons = input<number | null>(null);
  protected readonly groupLabel = $localize`:@@ui.rarityLimits.label:Raretés limitées par le format`;
  protected readonly common = computed(() => {
    const count = this.commons();
    return count === null ? null : commonItem(count);
  });
  protected readonly items = computed(() => rarityLimitItems(this.limits()).map((r) => ({ ...r, tone: TONES[r.state] })));
}
