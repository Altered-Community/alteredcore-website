import { Component, computed, inject, signal } from '@angular/core';
import qrcode from 'qrcode-generator';
import { DeckStore } from '../../../core/deck-store';
import { ArButton } from '../../../ui/buttons';
import { ArInput } from '../../../ui/fields';
import { ArIcon } from '../../../ui/icon';
import { ArOverlayRef, ArOverlayService } from '../../../ui/overlay';

export interface ShareDeckData {
  url: string;
  /** The user's own private deck: first « Ce deck est privé », with « Rendre public & partager » (as on the site). */
  privateOwned: boolean;
}

/** QR code of `text` as one SVG path (`n`: modules per side). */
export function qrPath(text: string): { size: number; path: string } {
  const code = qrcode(0, 'M');
  code.addData(text);
  code.make();
  const n = code.getModuleCount();
  let path = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!code.isDark(r, c)) continue;
      const start = c;
      while (c + 1 < n && code.isDark(r, c + 1)) c++;
      path += `M${start} ${r}h${c - start + 1}v1H${start}z`;
    }
  }
  return { size: n, path };
}

/** « Partager ce deck »: the link, « Copier », and a QR code (the site's share window). */
@Component({
  selector: 'app-share-deck',
  imports: [ArButton, ArInput, ArIcon],
  host: { class: 'ar-overlay-content' },
  templateUrl: './share-deck.overlay.html',
  styleUrl: './share-deck.overlay.scss',
})
export class ShareDeckOverlay {
  protected readonly ref = inject<ArOverlayRef<void, ShareDeckData>>(ArOverlayRef);
  private readonly deck = inject(DeckStore);
  protected readonly url = this.ref.data.url;
  protected readonly step = signal<'private' | 'share'>(this.ref.data.privateOwned ? 'private' : 'share');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly copied = signal(false);
  protected readonly qr = computed(() => qrPath(this.url));
  protected readonly qrLabel = $localize`:@@deck.share.qr:QR code du lien`;
  private copiedTimer?: ReturnType<typeof setTimeout>;

  protected makePublic(): void {
    this.busy.set(true);
    this.error.set(null);
    this.deck.makePublic().subscribe((ok) => {
      this.busy.set(false);
      if (ok) this.step.set('share');
      else this.error.set(this.deck.error());
    });
  }

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.url);
      this.copied.set(true);
      clearTimeout(this.copiedTimer);
      this.copiedTimer = setTimeout(() => this.copied.set(false), 2000);
    } catch {
      this.copied.set(false);
    }
  }
}

export function openShareDeck(overlay: ArOverlayService, data: ShareDeckData): ArOverlayRef<void, ShareDeckData> {
  return overlay.open<ShareDeckOverlay, void, ShareDeckData>(ShareDeckOverlay, {
    title: $localize`:@@deck.share.title:Partager ce deck`,
    data,
    width: 420,
  });
}
