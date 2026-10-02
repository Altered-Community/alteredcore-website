import { environment } from '../../environments/environment';
import { contentLocale } from './locale';
import type { Deck } from './models';

/** The image could not be had (deck not found, decks API down): not the browser's fault. */
export class DeckImageUnavailable extends Error {}

/** Where the image is asked for: a deck of the decks API by its id (GET), a guest deck by its content (`body`, POST). */
export interface DeckImageSource {
  url: string;
  body?: string;
}

/**
 * The deck's decklist image (its link preview's og:image, 2400×1260 JPEG), drawn by the site's card plugin
 * (`/papi/core-altered-cards/deck-image`), the user's private decks included; `null` outside the site.
 *
 * A guest deck, kept on this device, is unknown to the decks API: its hero and cards are sent instead, and its image
 * has no QR code (the deck has no page).
 */
export function deckImageSource(id: string, guest?: Deck | null): DeckImageSource | null {
  if (!environment.pluginApiUrl || !id) return null;
  const params = new URLSearchParams(guest ? { lang: contentLocale() } : { id, lang: contentLocale() });
  const url = `${environment.siteUrl.replace(/\/$/, '')}/papi/core-altered-cards/deck-image?${params}`;
  if (!guest) return { url };
  const body = { name: guest.name, format: guest.format ?? '', hero: guest.hero ?? null, cards: guest.deckCards ?? guest.cards ?? [] };
  return { url, body: JSON.stringify(body) };
}

/** File name of the saved image: the deck's name in lower case, without accents or punctuation. */
export function deckImageFileName(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');
  return `${slug || 'deck'}.jpg`;
}

async function fetchImage({ url, body }: DeckImageSource): Promise<Blob> {
  let res: Response;
  try {
    res = await fetch(
      url,
      body === undefined
        ? { credentials: 'same-origin' }
        : { method: 'POST', credentials: 'same-origin', body, headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': environment.siteCsrf } },
    );
  } catch {
    throw new DeckImageUnavailable('network');
  }
  if (!res.ok) throw new DeckImageUnavailable(String(res.status));
  return res.blob();
}

/** Clipboards take PNG images only. */
async function toPng(image: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(image);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((png) => (png ? resolve(png) : reject(new Error('png'))), 'image/png'));
}

/**
 * Copies the image to the clipboard. The ClipboardItem gets the image's promise during the click: Safari refuses a
 * write once the click's permission is gone, and drawing the image takes seconds.
 */
export async function copyDeckImage(source: DeckImageSource): Promise<void> {
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) throw new Error('clipboard');
  const png = fetchImage(source).then(toPng);
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
  } catch (err) {
    // The image's own failure, rather than the clipboard's.
    await png;
    throw err;
  }
}

/** Saves the image in the browser's downloads. */
export async function downloadDeckImage(source: DeckImageSource, name: string): Promise<void> {
  const href = URL.createObjectURL(await fetchImage(source));
  const link = document.createElement('a');
  link.href = href;
  link.download = deckImageFileName(name);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 60_000);
}

/** Opens the image in a new tab. The tab is opened during the click (popup blockers), then shown the image. */
export async function openDeckImage(source: DeckImageSource): Promise<void> {
  const tab = window.open('', '_blank');
  try {
    const href = URL.createObjectURL(await fetchImage(source));
    if (tab) tab.location.href = href;
    else window.open(href, '_blank');
    setTimeout(() => URL.revokeObjectURL(href), 60_000);
  } catch (err) {
    tab?.close();
    throw err;
  }
}
