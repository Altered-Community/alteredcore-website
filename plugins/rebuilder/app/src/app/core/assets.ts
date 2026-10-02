import { assetUrl } from './asset-url';

/** Static icons copied from Yutsa/alteredcore-website (plugins/core-altered-cards/assets). */

export const GEM_FILE: Record<string, string> = {
  COMMON: 'C',
  RARE: 'R',
  UNIQUE: 'U',
  EXALTED: 'E',
  C: 'C',
  R: 'R',
  U: 'U',
  E: 'E',
};

export function gemSrc(rarity: string): string {
  const file = GEM_FILE[rarity.toUpperCase()] ?? 'C';
  return assetUrl(`assets/gems/${file}.png`);
}

export function factionSrc(code: string | undefined | null): string | null {
  if (!code) return null;
  const c = code.toUpperCase();
  if (!/^(AX|BR|LY|MU|OR|YZ)$/.test(c)) return null;
  return assetUrl(`assets/faction/${c}.png`);
}
