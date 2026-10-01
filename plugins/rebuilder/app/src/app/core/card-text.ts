import type { Card } from './models';
import { localizedText } from './models';
import { contentLocale } from './locale';

export interface TextStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  gold?: boolean;
}

export type EffectPart =
  | ({ kind: 'text'; text: string } & TextStyle)
  /** A glyph of the `alteredicons` font; `scale` is relative to the text size. */
  | { kind: 'icon'; glyph: string; scale: number; title: string }
  /** `{2}` cost digits, printed as circled numbers. */
  | { kind: 'number'; glyph: string; text: string };

/** One printed line: abilities are separated by a double space in the API text. */
export type EffectLine = EffectPart[];

/** `alteredicons` code points and sizes, as in Altered-Card-Renderer `core.json`. */
export const ICONS: Record<string, { glyph: string; scale: number; title: string }> = {
  R: { glyph: '\ue024', scale: 1, title: $localize`:@@rules.icon.playedFromReserve:Joué depuis la Réserve` },
  J: { glyph: '\ue026', scale: 0.8, title: $localize`:@@rules.icon.playedFromAnywhere:Joué de partout` },
  H: { glyph: '\ue023', scale: 1, title: $localize`:@@rules.icon.playedFromHand:Joué depuis la Main` },
  T: { glyph: '\ue027', scale: 1, title: $localize`:@@rules.icon.exhaustMe:Épuisez-moi` },
  D: { glyph: '\ue029', scale: 1.2, title: $localize`:@@rules.icon.discardMeFromReserve:Défaussez-moi de la Réserve` },
  O: { glyph: '\ue02d', scale: 1, title: 'O' },
  M: { glyph: '\ue025', scale: 1, title: 'M' },
  V: { glyph: '\ue037', scale: 1, title: 'V' },
  I: { glyph: '\ue02f', scale: 0.8, title: 'I' },
};
/** Pen glyph before the artist name in the card footer. */
export const PEN_GLYPH = '\ue02e';

const CIRCLED = ['\u24ea', '\u2776', '\u2777', '\u2778', '\u2779', '\u277a', '\u277b', '\u277c', '\u277d', '\u277e'];

const TOKEN = /\[\[(.*?)\]\]|\[\]|\[(.*?)\]|#(.*?)#|\{([A-Za-z0-9])\}|[()]/g;

/**
 * Card text markup (cards API), read like the Altered site renderer: `{J}` icons, `{2}` circled
 * digits, `{X}` bold, `[keyword]` bold, `[[link]]` bold underlined, `#text#` gold, `(reminder)`
 * italic, `[]` a space, `—` a hyphen, and a double space between two abilities. Spaces are kept
 * as printed.
 */
export function effectLines(text: string | null | undefined): EffectLine[] {
  if (!text?.trim()) return [];
  return text
    .replace(/—/g, '-')
    .split('  ')
    .map(parseLine)
    .filter((line) => line.some((p) => p.kind !== 'text' || p.text.trim()));
}

function parseLine(line: string): EffectLine {
  const parts: EffectLine = [];
  let italic = false;
  const push = (text: string, style: TextStyle = {}) => {
    if (!text) return;
    const s: TextStyle = { ...style, ...(italic ? { italic: true } : {}) };
    const last = parts[parts.length - 1];
    if (last?.kind === 'text' && sameStyle(last, s)) last.text += text;
    else parts.push({ kind: 'text', text, ...s });
  };
  let at = 0;
  for (const m of line.matchAll(TOKEN)) {
    push(line.slice(at, m.index));
    at = m.index + m[0].length;
    const [all, link, keyword, gold, code] = m;
    if (link !== undefined) push(link, { bold: true, underline: true });
    else if (all === '[]') push(' ');
    else if (keyword !== undefined) push(keyword, { bold: true });
    else if (gold !== undefined) push(gold, { gold: true });
    else if (code !== undefined) {
      const icon = ICONS[code.toUpperCase()];
      if (icon) parts.push({ kind: 'icon', ...icon });
      else if (/\d/.test(code)) parts.push({ kind: 'number', glyph: CIRCLED[Number(code)], text: code });
      else push(code, { bold: true });
    } else if (all === '(') {
      push('(');
      italic = true;
    } else {
      italic = false;
      push(')');
    }
  }
  push(line.slice(at));
  return parts;
}

function sameStyle(a: TextStyle, b: TextStyle): boolean {
  return !!a.bold === !!b.bold && !!a.italic === !!b.italic && !!a.underline === !!b.underline && !!a.gold === !!b.gold;
}

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function esc(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => ESC[ch]);
}

/** The same markup `ar-unique-card` used to build one node at a time. Spaces are not added between parts. */
export function linesHtml(lines: EffectLine[]): string {
  return lines.map((line) => `<p>${line.map(partHtml).join('')}</p>`).join('');
}

function partHtml(part: EffectPart): string {
  if (part.kind === 'icon') {
    const label = esc(part.title);
    return `<span class="glyph" role="img" style="font-size: ${part.scale}em" aria-label="${label}" title="${label}">${esc(part.glyph)}</span>`;
  }
  if (part.kind === 'number') return `<span class="num" role="img" aria-label="${esc(part.text)}">${esc(part.glyph)}</span>`;
  const cls = [part.bold && 'b', part.italic && 'i', part.underline && 'u', part.gold && 'gold'].filter(Boolean).join(' ');
  return `<span${cls ? ` class="${cls}"` : ''}>${esc(part.text)}</span>`;
}

/** Printed length, the measure the renderer uses to pick the frame and the text size. */
export function printedLength(lines: EffectLine[]): number {
  const chars = lines.reduce((n, line) => n + line.reduce((m, p) => m + (p.kind === 'text' ? p.text.length : 1), 0), 0);
  return chars + Math.max(0, lines.length - 1);
}

/** `echoEffect` is a string, a locale map, or a list of either depending on the endpoint. */
export function echoText(value: Card['echoEffect'], locale: 'fr' | 'en' = contentLocale()): string {
  if (!value) return '';
  const list = Array.isArray(value) ? value : [value];
  return list.map((v) => localizedText(v, locale)).filter(Boolean).join('  ');
}

export function cardEffects(card: Card): { main: EffectLine[]; echo: EffectLine[] } {
  return {
    main: effectLines(localizedText(card.mainEffect, contentLocale())),
    echo: effectLines(echoText(card.echoEffect)),
  };
}
