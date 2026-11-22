import { assetUrl } from '../../core/asset-url';

/**
 * Rarity icons with their files' sizes (`width` / `height` attributes): an icon sized in CSS by its height only takes
 * its width before the image loads, so a row of icons does not grow (or wrap) when they arrive.
 */
export const RARITY_ICONS = [
  { key: 'C', label: $localize`:@@ui.rarity.common:Commune`, src: assetUrl('assets/icons/rarete-commune.png'), width: 40, height: 23 },
  { key: 'R', label: $localize`:@@ui.rarity.rare:Rare`, src: assetUrl('assets/icons/rarete-rare.png'), width: 40, height: 23 },
  { key: 'U', label: $localize`:@@ui.rarity.unique:Unique`, src: assetUrl('assets/icons/rarete-unique.png'), width: 40, height: 23 },
  { key: 'E', label: $localize`:@@ui.rarity.exalted:Exaltée`, src: assetUrl('assets/icons/rarete-exaltee.png'), width: 200, height: 100 },
] as const;

export function rarityIcon(rarity: string): { src: string; label: string; width: number; height: number } {
  const key = rarity.toUpperCase().startsWith('R') ? 'R' : rarity.toUpperCase().startsWith('U') ? 'U' : rarity.toUpperCase().startsWith('E') ? 'E' : 'C';
  const hit = RARITY_ICONS.find((r) => r.key === key)!;
  return { src: hit.src, label: hit.label, width: hit.width, height: hit.height };
}
