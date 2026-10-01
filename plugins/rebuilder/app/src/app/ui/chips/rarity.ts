import { assetUrl } from '../../core/asset-url';

export const RARITY_ICONS = [
  { key: 'C', label: $localize`:@@ui.rarity.common:Commune`, src: assetUrl('assets/icons/rarete-commune.png') },
  { key: 'R', label: $localize`:@@ui.rarity.rare:Rare`, src: assetUrl('assets/icons/rarete-rare.png') },
  { key: 'U', label: $localize`:@@ui.rarity.unique:Unique`, src: assetUrl('assets/icons/rarete-unique.png') },
  { key: 'E', label: $localize`:@@ui.rarity.exalted:Exaltée`, src: assetUrl('assets/icons/rarete-exaltee.png') },
] as const;

export function rarityIcon(rarity: string): { src: string; label: string } {
  const key = rarity.toUpperCase().startsWith('R') ? 'R' : rarity.toUpperCase().startsWith('U') ? 'U' : rarity.toUpperCase().startsWith('E') ? 'E' : 'C';
  const hit = RARITY_ICONS.find((r) => r.key === key)!;
  return { src: hit.src, label: hit.label };
}
