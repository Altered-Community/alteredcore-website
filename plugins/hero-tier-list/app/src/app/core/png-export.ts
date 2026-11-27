import { FACTION_TOKENS, heroArtSources, type Hero } from './heroes';
import type { Tier } from './ranking';

export interface ExportRow {
  tier: Tier;
  heroes: Hero[];
}

export interface ExportInput {
  title: string;
  subtitle: string;
  credit: string;
  rows: ExportRow[];
  /** Element whose computed `--ac-*` tokens give the colours: the export follows the site's theme. */
  themeSource: Element;
}

const WIDTH = 1600;
const PAD = 40;
const LABEL = 150;
const TILE_W = 126;
const TILE_H = 168;
const GAP = 8;
/** Vertical anchor of the crop in the full art (744 × 1039): the heroes' faces sit in the upper third. */
const ART_FOCUS_Y = 0.22;
const FONT = "'Figtree', system-ui, sans-serif";

/**
 * Draws the tier list on a canvas, as a PNG: title, one row per tier (its colour and name, then its heroes' full
 * arts with their names), credit line. The arts come from the CDN with CORS, so the canvas stays exportable.
 */
export async function renderTierListPng(input: ExportInput): Promise<Blob> {
  const css = getComputedStyle(input.themeSource);
  const token = (name: string) => css.getPropertyValue(name).trim();
  const color = {
    bg: token('--ac-color-bg-app'),
    row: token('--ac-color-surface'),
    border: token('--ac-color-border'),
    text: token('--ac-color-text'),
    muted: token('--ac-color-text-muted'),
    onTier: token('--ac-tier-on'),
    ink: token('--ac-card-ink'),
    onArt: token('--ac-color-on-strong'),
  };

  await document.fonts?.ready;
  const images = new Map(await Promise.all(input.rows.flatMap((r) => r.heroes).map(async (h) => [h.id, await loadArt(h)] as const)));

  const cols = Math.floor((WIDTH - 2 * PAD - LABEL - GAP) / (TILE_W + GAP));
  const rowHeight = (n: number) => Math.max(1, Math.ceil(n / cols)) * (TILE_H + GAP) + GAP;
  const header = 120;
  const footer = 56;
  const height = header + input.rows.reduce((sum, r) => sum + rowHeight(r.heroes.length) + GAP, 0) + footer;

  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2D unavailable');
  ctx.scale(scale, scale);

  ctx.fillStyle = color.bg;
  ctx.fillRect(0, 0, WIDTH, height);

  ctx.fillStyle = color.text;
  ctx.font = `800 40px ${FONT}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(input.title, PAD, PAD + 36, WIDTH - 2 * PAD);
  ctx.fillStyle = color.muted;
  ctx.font = `600 18px ${FONT}`;
  ctx.fillText(input.subtitle, PAD, PAD + 68, WIDTH - 2 * PAD);

  let y = header;
  for (const { tier, heroes } of input.rows) {
    const h = rowHeight(heroes.length);
    const x0 = PAD;
    const rowWidth = WIDTH - 2 * PAD;

    roundRect(ctx, x0, y, rowWidth, h, 14);
    ctx.fillStyle = color.row;
    ctx.fill();
    ctx.strokeStyle = color.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.save();
    roundRect(ctx, x0, y, LABEL, h, [14, 0, 0, 14]);
    ctx.fillStyle = token(`--ac-tier-${tier.color}`);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = color.onTier;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const labelSize = tier.name.length <= 3 ? 44 : tier.name.length <= 8 ? 26 : 20;
    ctx.font = `800 ${labelSize}px ${FONT}`;
    wrapText(ctx, tier.name, x0 + LABEL / 2, y + h / 2, LABEL - 20, labelSize * 1.15, 3);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    heroes.forEach((hero, i) => {
      const x = x0 + LABEL + GAP + (i % cols) * (TILE_W + GAP);
      const ty = y + GAP + Math.floor(i / cols) * (TILE_H + GAP);
      drawTile(ctx, hero, images.get(hero.id) ?? null, x, ty, token(FACTION_TOKENS[hero.faction]), color);
    });
    y += h + GAP;
  }

  ctx.fillStyle = color.muted;
  ctx.font = `600 14px ${FONT}`;
  ctx.fillText(input.credit, PAD, height - PAD + 12, WIDTH - 2 * PAD);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG unavailable'))), 'image/png'));
}

function drawTile(
  ctx: CanvasRenderingContext2D,
  hero: Hero,
  img: HTMLImageElement | null,
  x: number,
  y: number,
  factionColor: string,
  color: { ink: string; onArt: string; row: string },
): void {
  ctx.save();
  roundRect(ctx, x, y, TILE_W, TILE_H, 10);
  ctx.fillStyle = factionColor;
  ctx.fill();
  roundRect(ctx, x + 3, y + 3, TILE_W - 6, TILE_H - 6, 8);
  ctx.clip();
  ctx.fillStyle = color.ink;
  ctx.fillRect(x, y, TILE_W, TILE_H);
  if (img) {
    const w = TILE_W - 6;
    const h = TILE_H - 6;
    const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const iw = img.naturalWidth * s;
    const ih = img.naturalHeight * s;
    ctx.drawImage(img, x + 3 + (w - iw) / 2, y + 3 + (h - ih) * ART_FOCUS_Y, iw, ih);
  }
  const grad = ctx.createLinearGradient(0, y + TILE_H * 0.5, 0, y + TILE_H);
  grad.addColorStop(0, 'transparent');
  grad.addColorStop(1, color.ink);
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = grad;
  ctx.fillRect(x, y + TILE_H * 0.5, TILE_W, TILE_H * 0.5);
  ctx.globalAlpha = 1;
  ctx.fillStyle = color.onArt;
  ctx.font = `700 13px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const lines = splitLines(ctx, hero.name, TILE_W - 14, 2);
  lines.forEach((line, i) => ctx.fillText(line, x + TILE_W / 2, y + TILE_H - 12 - (lines.length - 1 - i) * 15, TILE_W - 10));
  ctx.restore();
}

function loadArt(hero: Hero): Promise<HTMLImageElement | null> {
  const sources = heroArtSources(hero);
  return new Promise((resolve) => {
    const tryAt = (i: number) => {
      if (i >= sources.length) return resolve(null);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => tryAt(i + 1);
      img.src = sources[i];
    };
    tryAt(0);
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number | number[]): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function splitLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1]}…`;
    return kept;
  }
  return lines;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, maxWidth: number, lineHeight: number, maxLines: number): void {
  const lines = splitLines(ctx, text, maxWidth, maxLines);
  const top = cy - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, i) => ctx.fillText(line, cx, top + i * lineHeight, maxWidth));
}

/** File name of the export: the title in lower-case ASCII, dashes between words. */
export function exportFileName(title: string): string {
  const slug = title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  return `${slug || 'tier-list'}.png`;
}
