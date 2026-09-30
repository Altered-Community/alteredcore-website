import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { AuthSession } from '../../../core/auth-session';
import { CardsApiService } from '../../../core/cards-api.service';
import { typeOf } from '../../../core/deck-rules';
import { cardToLine, factionFromReference } from '../../../core/deck-view';
import { DecksApiService } from '../../../core/decks-api.service';
import { visibleFormats } from '../../../core/formats';
import { GuestDeckService } from '../../../core/guest-deck.service';
import type { Card, DeckCardLine, DeckFormat, DeckHero } from '../../../core/models';
import { localizedText } from '../../../core/models';
import { ArButton } from '../../../ui/buttons';
import { contentLocale } from '../../../core/locale';
import { ArInput, ArSegmented, ArSelect } from '../../../ui/fields';
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

/** `deckId`: the deck made from a list (account deck when signed in, guest deck otherwise). */
export interface ImportResult {
  deckId?: string;
}

/** Import window: a decklist into an account deck (a guest deck when signed out), or the altered.gg export (Equinox ZIP) into the account. */
@Component({
  selector: 'app-import-deck',
  imports: [ArButton, ArInput, ArSegmented, ArSelect, EquinoxImport],
  host: { class: 'ar-overlay-content' },
  templateUrl: './import-deck.overlay.html',
  styleUrl: './import-deck.overlay.scss',
})
export class ImportDeckOverlay {
  protected readonly ref = inject<ArOverlayRef<ImportResult, { mode: ImportMode }>>(ArOverlayRef);
  private readonly router = inject(Router);
  private readonly api = inject(CardsApiService);
  private readonly guests = inject(GuestDeckService);
  private readonly decksApi = inject(DecksApiService);
  private readonly auth = inject(AuthSession);
  protected readonly bp = inject(ArBreakpointService);
  protected readonly name = signal('');
  protected readonly format = signal<DeckFormat>('standard');
  private readonly formatList = visibleFormats();
  protected readonly formats = this.formatList.map((f) => ({ value: f.value, label: f.label }));
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

  protected setFormat(value: string): void {
    this.format.set(this.formatList.find((f) => f.value === value)?.value ?? 'standard');
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
        const name = this.name().trim() || $localize`:@@decks.import.defaultName:Deck importé`;
        const format = this.format();
        if (!this.auth.isLoggedIn()) {
          const deck = this.guests.create({ name, format, hero, deckCards: lines });
          this.busy.set(false);
          this.ref.close({ deckId: deck.id });
          return;
        }
        // Signed in: an account deck, as « Nouveau deck » does. On a refusal the window stays open with the list.
        const deckCards = lines.map((l) => ({ cardReference: l.cardReference, quantity: l.quantity }));
        this.decksApi.create({ name, format, isPublic: false, deckCards }).subscribe({
          next: (deck) => {
            this.busy.set(false);
            this.ref.close({ deckId: deck.id });
          },
          error: (err: unknown) => {
            this.busy.set(false);
            this.error.set(importErrorMessage(err));
          },
        });
      });
  }
}

function importErrorMessage(err: unknown): string {
  const status = err instanceof HttpErrorResponse ? err.status : -1;
  if (status === 0) return $localize`:@@decks.import.errNetwork:Impossible de joindre le serveur. Vérifiez votre connexion.`;
  if (status === 401) return $localize`:@@decks.import.errSession:Session expirée : reconnectez-vous.`;
  if (status === 400 || status === 422) return $localize`:@@decks.import.errRejected:Le serveur refuse ce deck : vérifiez les références de la liste.`;
  return $localize`:@@decks.import.errServer:Le deck n’a pas pu être créé sur votre compte. Réessayez.`;
}

export function openImportDeck(overlay: ArOverlayService, mode: ImportMode = 'list') {
  return overlay.open<ImportDeckOverlay, ImportResult>(ImportDeckOverlay, {
    title: $localize`:@@decks.import.titleDecks:Importer des decks`,
    width: 560,
    data: { mode },
  });
}
