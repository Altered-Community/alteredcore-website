import { Service } from '@angular/core';
import { assetUrl } from './asset-url';

/** Size of a printed card image (Altered-Card-Renderer, the CDN's card images). */
export const SNAPSHOT_WIDTH = 744;
export const SNAPSHOT_HEIGHT = 1039;
/** Snapshots kept as object URLs; the oldest is revoked past this. */
const CACHE_SIZE = 40;

const FONTS = [
  { family: 'Altered Haptic', weight: 400, file: 'HapticPro-Regular.woff2' },
  { family: 'Altered Haptic', weight: 800, file: 'HapticPro-Extrabold.woff2' },
  { family: 'Altered Icons', weight: 400, file: 'alteredicons.woff2' },
  { family: 'Altered Circled', weight: 400, file: 'NotoSansSymbols-circled.woff2' },
];

function dataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}

/**
 * PNG of a drawn unique card (`ac-unique-card`), so that "Copy image" / "Save image" give the whole card and not
 * its illustration alone: the face is a stack of the illustration, the frame and text, not one image.
 * The node is drawn with html-to-image (SVG foreignObject on a canvas), loaded on first use. The CDN sends
 * `Access-Control-Allow-Origin: *`, so the illustration does not taint the canvas. Only the printed-card fonts are
 * embedded, not every `@font-face` of the page.
 */
@Service()
export class AcUniqueSnapshot {
  private fontCss?: Promise<string>;
  private readonly cache = new Map<string, Promise<string | null>>();

  /** Object URL of the PNG, or null when the card could not be drawn. Same key, same promise. */
  snapshot(key: string, node: HTMLElement): Promise<string | null> {
    const hit = this.cache.get(key);
    if (hit) {
      // Most recently used last.
      this.cache.delete(key);
      this.cache.set(key, hit);
      return hit;
    }
    const pending = this.draw(node).catch(() => null);
    this.cache.set(key, pending);
    // A failure is not cached: the next hover tries again (an illustration that was still loading).
    void pending.then((url) => {
      if (!url && this.cache.get(key) === pending) this.cache.delete(key);
    });
    this.evict();
    return pending;
  }

  private evict(): void {
    while (this.cache.size > CACHE_SIZE) {
      const [oldest, url] = this.cache.entries().next().value as [string, Promise<string | null>];
      this.cache.delete(oldest);
      void url.then((u) => u && URL.revokeObjectURL(u));
    }
  }

  /**
   * The face is laid out in `cqw`: a copy of it in a hidden 744 px box gets the printed card's layout (line breaks,
   * sizes), instead of the small tile's scaled up.
   */
  private async draw(node: HTMLElement): Promise<string | null> {
    const [{ toBlob }, fontEmbedCSS] = await Promise.all([import('html-to-image'), this.fonts()]);
    const box = document.createElement('div');
    box.setAttribute('aria-hidden', 'true');
    box.style.cssText = `position:fixed;left:-${2 * SNAPSHOT_WIDTH}px;top:0;width:${SNAPSHOT_WIDTH}px;height:${SNAPSHOT_HEIGHT}px;pointer-events:none;`;
    const copy = node.cloneNode(true) as HTMLElement;
    copy.querySelector('.snapshot')?.remove();
    box.append(copy);
    // Same shadow root as the card: its (emulated) component styles apply to the copy.
    (node.parentNode ?? document.body).appendChild(box);
    try {
      await Promise.all([...copy.querySelectorAll('img')].map((img) => img.decode().catch(() => undefined)));
      // html-to-image copies an <svg> as is, without its children's computed styles: the QR code's class fills.
      for (const el of copy.querySelectorAll<SVGElement>('svg *')) el.style.fill = getComputedStyle(el).fill;
      const blob = await toBlob(copy, { fontEmbedCSS, width: SNAPSHOT_WIDTH, height: SNAPSHOT_HEIGHT, pixelRatio: 1 });
      return blob ? URL.createObjectURL(blob) : null;
    } finally {
      box.remove();
    }
  }

  private fonts(): Promise<string> {
    this.fontCss ??= Promise.all(
      FONTS.map(async (f) => {
        const res = await fetch(assetUrl(`assets/unique-card/fonts/${f.file}`));
        if (!res.ok) throw new Error(`${f.file}: ${res.status}`);
        const src = await dataUrl(await res.blob());
        return `@font-face{font-family:'${f.family}';font-weight:${f.weight};src:url(${src}) format('woff2');}`;
      }),
    )
      .then((rules) => rules.join('\n'))
      .catch((e: unknown) => {
        this.fontCss = undefined;
        throw e;
      });
    return this.fontCss;
  }
}
