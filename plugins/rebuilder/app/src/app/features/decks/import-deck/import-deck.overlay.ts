import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { CardsApiService } from '../../../core/cards-api.service';
import { typeOf } from '../../../core/deck-rules';
import { cardToLine, factionFromReference } from '../../../core/deck-view';
import { GuestDeckService } from '../../../core/guest-deck.service';
import type { Card, DeckCardLine, DeckHero } from '../../../core/models';
import { localizedText } from '../../../core/models';
import { ArButton } from '../../../ui/buttons';
import { contentLocale } from '../../../core/locale';
import { ArInput, ArSegmented } from '../../../ui/fields';
import { EquinoxImport } from '../equinox/equinox-import';
import { ArBreakpointService } from '../../../ui/layout.services';
import { ArOverlayRef, ArOverlayService } from '../../../ui/overlay';

/** Parses "3 ALT_CORE_B_AX_04_C" / "ALT_… x3" lines into reference → quantity. */
export function parseDecklist(text: string): { reference: string; quantity: number }[] {
  const out = new Map<string, number>();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = /^(\d{1,3})\s*[x×]?\s+(ALT_[A-Z0-9_]+)$/i.exec(line) ?? /^(ALT_[A-Z0-9_]+)\s*[x×]?\s*(\d{1,3})$/i.exec(line);
    if (!m) continue;
    const [qty, ref] = /^\d/.test(m[1]) ? [Number(m[1]), m[2]] : [Number(m[2]), m[1]];
    const key = ref.toUpperCase();
    out.set(key, (out.get(key) ?? 0) + qty);
  }
  return [...out].map(([reference, quantity]) => ({ reference, quantity }));
}

export type ImportMode = 'list' | 'equinox';

/** `deckId`: the guest deck made from a list. */
export interface ImportResult {
  deckId?: string;
}

/** Import window: a decklist into a guest deck, or the altered.gg export (Equinox ZIP) into the account. */
@Component({
  selector: 'app-import-deck',
  imports: [ArButton, ArInput, ArSegmented, EquinoxImport],
  host: { class: 'ar-overlay-content' },
  templateUrl: './import-deck.overlay.html',
  styleUrl: './import-deck.overlay.scss',
})
export class ImportDeckOverlay {
  protected readonly ref = inject<ArOverlayRef<ImportResult, { mode: ImportMode }>>(ArOverlayRef);
  private readonly router = inject(Router);
  private readonly api = inject(CardsApiService);
  private readonly guests = inject(GuestDeckService);
  protected readonly bp = inject(ArBreakpointService);
  protected readonly name = signal('');
  protected readonly text = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly mode = signal<ImportMode>(this.ref.data.mode);
  protected readonly modes = [
    { value: 'list' as ImportMode, label: $localize`:@@decks.import.modeList:Liste de cartes` },
    { value: 'equinox' as ImportMode, label: $localize`:@@decks.import.modeEquinox:Export altered.gg` },
  ];

  /** During an import, a close by the user (cross, Escape, backdrop, Back) asks to cancel it first. */
  protected guardClose(busy: boolean, equinox: EquinoxImport): void {
    this.ref.closeGuard.set(
      busy
        ? () => {
            equinox.askCancel();
            return false;
          }
        : null,
    );
  }

  protected signIn(): void {
    this.ref.close();
    void this.router.navigateByUrl('/login');
  }

  run(): void {
    const rows = parseDecklist(this.text());
    if (!rows.length) {
      this.error.set($localize`:@@decks.import.noLines:Aucune ligne reconnue. Format attendu : « quantité référence ».`);
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.api
      .batch(rows.map((r) => r.reference), contentLocale())
      .pipe(catchError(() => of([] as Card[])))
      .subscribe((cards) => {
        const byRef = new Map(cards.map((c) => [c.reference, c]));
        let hero: DeckHero | null = null;
        const lines: DeckCardLine[] = rows.map((r) => {
          const card = byRef.get(r.reference) ?? ({ reference: r.reference } as Card);
          if (typeOf(card) === 'HERO' && !hero) {
            hero = {
              reference: card.reference,
              name: localizedText(card.name, contentLocale()) || card.reference,
              faction: card.faction?.code ?? factionFromReference(card.reference),
            };
          }
          return cardToLine(card, typeOf(card) === 'HERO' ? 1 : r.quantity);
        });
        const deck = this.guests.create({ name: this.name().trim() || $localize`:@@decks.import.defaultName:Deck importé`, hero, deckCards: lines });
        this.busy.set(false);
        this.ref.close({ deckId: deck.id });
      });
  }
}

export function openImportDeck(overlay: ArOverlayService, mode: ImportMode = 'list') {
  return overlay.open<ImportDeckOverlay, ImportResult>(ImportDeckOverlay, {
    title: $localize`:@@decks.import.titleDecks:Importer des decks`,
    width: 560,
    data: { mode },
  });
}
