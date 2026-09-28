import qrcode from 'qrcode-generator';
import { echoText } from './card-text';
import type { Card } from './models';
import { localizedText } from './models';
import { contentLocale } from './locale';

/**
 * Layout of a unique character card, from the Altered-Card-Renderer configuration
 * (`cdn.alteredcore.org/forge/config/*.json`): positions in % of the 744 × 1039 card, font sizes
 * in px of that card, so `px / 7.44` gives `cqw`.
 */
export type UniqueFrame = 'T1' | 'T2' | 'T3' | 'T4';
export type BiomeVariant = 'zero' | 'small' | 'normal' | 'best';

export const CARD_WIDTH = 744;

/** First-line centre of the main text for each frame (`framedata.json`, `char_u_N.effects.y`). */
export const EFFECT_Y: Record<UniqueFrame, number> = { T1: 65.5, T2: 58, T3: 73, T4: 65 };

/** Raw text length as the renderer counts it: an icon is one character, `[]` nothing. */
export function rawEffectLength(text: string): number {
  return text
    .replace(/\{[A-Za-z0-9]\}/g, 'X')
    .replace(/\[\]/g, '')
    .replace(/ {2,}/g, ' ')
    .trim().length;
}

/** T1/T2 carry a support ability box, T2/T4 leave room for 200+ characters of main text. */
export function uniqueFrame(card: Card): UniqueFrame {
  const long = rawEffectLength(localizedText(card.mainEffect, contentLocale())) >= 200;
  const support = !!echoText(card.echoEffect);
  if (support) return long ? 'T2' : 'T1';
  return long ? 'T4' : 'T3';
}

/** zero; best = the only highest of 2+ non-zero; small = the only lowest when none is zero. */
export function biomeVariants(values: number[]): BiomeVariant[] {
  const nonZero = values.filter((v) => v > 0);
  const max = Math.max(...values);
  const min = nonZero.length ? Math.min(...nonZero) : null;
  const allNonZero = values.every((v) => v > 0);
  return values.map((v) => {
    if (v === 0) return 'zero';
    if (v === max && values.filter((x) => x === max).length === 1 && nonZero.length >= 2) return 'best';
    if (v === min && nonZero.filter((x) => x === min).length === 1 && allNonZero) return 'small';
    return 'normal';
  });
}

/** Main text size (px on the card) by printed length (`elements.json`, `effects.fontSizeByLength`). */
export function effectFontPx(length: number): number {
  return stepSize(length, 31, [[180, 28], [250, 25], [330, 22], [420, 19]]);
}

/** Support text size (px on the card), `discardEffects.fontSizeByLength`. */
export function supportFontPx(length: number): number {
  return stepSize(length, 25, [[120, 22], [180, 19], [250, 16]]);
}

function stepSize(length: number, base: number, steps: [number, number][]): number {
  return steps.reduce((size, [from, px]) => (length >= from ? px : size), base);
}

export function cqw(px: number): number {
  return Math.round((px / CARD_WIDTH) * 10000) / 100;
}

export type QrVersion = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/** Byte capacity of QR versions 1–10 at correction level M. */
const QR_M_BYTES = [14, 26, 42, 62, 84, 106, 122, 152, 180, 213];

/**
 * Version QRCode.js picks on the Altered site: it counts 3 bytes more than the text (a UTF-8 BOM
 * check that is always true), so a 24-character reference gets version 3, not 2.
 */
export function qrVersion(text: string): QrVersion {
  const i = QR_M_BYTES.findIndex((max) => text.length + 3 <= max);
  return (i === -1 ? 10 : i + 1) as QrVersion;
}

export interface QrModules {
  size: number;
  /** SVG path of horizontal runs. Same pixels as one rect per module, much shorter. */
  path: string;
}

const qrCache = new Map<string, QrModules>();

/**
 * QR for a unique reference (error correction M, no quiet zone). Cached: a reference does not
 * change, and Aperçu remounts cards that were already drawn in the list.
 */
export function qrModules(reference: string): QrModules {
  const hit = qrCache.get(reference);
  if (hit) return hit;
  const code = qrcode(qrVersion(reference), 'M');
  code.addData(reference);
  code.make();
  const n = code.getModuleCount();
  let path = '';
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      if (!code.isDark(r, c)) {
        c++;
        continue;
      }
      const start = c;
      while (c < n && code.isDark(r, c)) c++;
      path += `M${start} ${r}h${c - start}v1H${start}z`;
    }
  }
  const value = { size: n, path };
  qrCache.set(reference, value);
  return value;
}

/** « Personnage - Soldat, Animal » (`cardType` value of the renderer mapping). */
export function typeLine(card: Card): string {
  const type = localizedText(card.cardType?.name, contentLocale());
  const subs = (card.cardSubTypes ?? []).map((s) => localizedText(s.name, contentLocale())).filter(Boolean).join(', ');
  return subs ? `${type} - ${subs}` : type;
}

/** Collector number, or one derived from the reference like the renderer does. */
export function collectorNumber(card: Card): string {
  if (card.collectorNumberFormatedId) return card.collectorNumberFormatedId;
  const parts = card.reference.split('_');
  const collector = parts.length >= 6 ? parts.slice(3).join('-') : card.reference;
  return card.set?.code ? `${card.set.code}-${collector}` : collector;
}
