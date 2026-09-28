import { Injectable, InjectionToken, computed, effect, inject, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Observable, Subscription, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthSession } from './auth-session';
import { CardsApiService } from './cards-api.service';
import { computeDeckStatus, maxCopiesFor, type DeckStatus } from './deck-rules';
import { cardToLine, deckStats, groupLines, heroOf, isHeroLine, lineToCard, mergeUniqueFace, uniqueNeedsPrintedEffect } from './deck-view';
import { DecksApiService } from './decks-api.service';
import { GuestDeckService } from './guest-deck.service';
import {
  type Card,
  type Deck,
  type DeckFormat,
  type DeckHero,
  type DeckWrite,
  type HydratedLine,
  deckLines,
  localizedText,
} from './models';
import { contentLocale } from './locale';

export interface NewDeckInput {
  name: string;
  hero: DeckHero;
  format: DeckFormat;
  isPublic: boolean;
}

const SAVE_DELAY_MS = 400;

/**
 * Where « Créer le deck » stores a new deck. `guest` (default): localStorage, copied to the account
 * from the login page. `account`: straight to the decks API when a token is present (embedded in the
 * AlteredCore site, where the deck then shows up in the site's deck list).
 */
export const DECK_CREATE_TARGET = new InjectionToken<'guest' | 'account'>('DECK_CREATE_TARGET', {
  factory: () => 'guest',
});

/**
 * Editor state for one deck. Guests (no Keycloak token) autosave to localStorage;
 * with a token, changes are PATCHed to decks.alteredcore.org.
 */
@Injectable({ providedIn: 'root' })
export class DeckStore {
  private readonly decksApi = inject(DecksApiService);
  private readonly cardsApi = inject(CardsApiService);
  private readonly guests = inject(GuestDeckService);
  private readonly auth = inject(AuthSession);
  private readonly createTarget = inject(DECK_CREATE_TARGET);
  /** In-flight fill of unique faces; cancelled when another deck is applied. */
  private uniqueFaces?: Subscription;

  /** Id of the server deck to fetch; `null` for guest decks and new decks (resource idle). */
  private readonly serverId = signal<string | null>(null);
  /** Switching id cancels the in-flight request, so a late response never overwrites the current deck. */
  private readonly serverDeck = rxResource({
    params: () => this.serverId() ?? undefined,
    stream: ({ params: id }) => this.decksApi.get(id, contentLocale()),
  });

  readonly loading = computed(() => this.serverDeck.isLoading());
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly dirty = signal(false);

  readonly deckId = signal<string | null>(null);
  readonly name = signal('');
  readonly format = signal<DeckFormat>('standard');
  readonly isPublic = signal(false);
  readonly hero = signal<DeckHero | null>(null);
  readonly createdAt = signal<string | null>(null);
  readonly isGuest = signal(true);
  /** Non-hero lines. */
  readonly lines = signal<HydratedLine[]>([]);

  readonly status = computed<DeckStatus>(() => computeDeckStatus(this.lines(), this.format()));
  readonly groups = computed(() => groupLines(this.lines()));
  readonly stats = computed(() => deckStats(this.lines()));
  readonly total = computed(() => this.status().total);
  readonly distinct = computed(() => this.lines().filter((l) => l.quantity > 0).length);
  readonly quantities = computed(() => new Map(this.lines().map((l) => [l.card.reference, l.quantity])));
  readonly editable = computed(() => this.isGuest() || this.auth.isLoggedIn());

  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const err = this.serverDeck.error();
      if (err) {
        const status = (err as { status?: number }).status;
        untracked(() =>
          this.error.set(
            status === 401 || status === 403 ? 'Ce deck est privé : connexion requise.' : 'Impossible de charger le deck.',
          ),
        );
        return;
      }
      if (!this.serverDeck.hasValue()) return;
      const deck = this.serverDeck.value();
      untracked(() => this.apply({ ...deck, guest: false }));
    });
  }

  quantityOf(reference: string): number {
    return this.quantities().get(reference) ?? 0;
  }

  maxFor(card: Card): number {
    return maxCopiesFor(card, this.format());
  }

  create(input: NewDeckInput): Deck {
    const deck = this.guests.create({
      name: input.name.trim() || 'Nouveau deck',
      format: input.format,
      isPublic: input.isPublic,
      hero: input.hero,
      deckCards: [heroLine(input.hero)],
    });
    this.serverId.set(null);
    this.apply(deck);
    return deck;
  }

  /**
   * `create()` on the decks API when `DECK_CREATE_TARGET` is `account` and the user is signed in;
   * a guest deck otherwise, or when the API refuses (the deck is not lost).
   */
  createDeck(input: NewDeckInput): Observable<Deck> {
    if (this.createTarget !== 'account' || !this.auth.isLoggedIn()) return of(this.create(input));
    const body: DeckWrite = {
      name: input.name.trim() || 'Nouveau deck',
      format: input.format,
      isPublic: input.isPublic,
      deckCards: [{ cardReference: input.hero.reference, quantity: 1 }],
    };
    this.saving.set(true);
    return this.decksApi.create(body).pipe(
      map((created) => {
        this.saving.set(false);
        const deck: Deck = { ...created, hero: created.hero ?? input.hero, deckCards: created.deckCards ?? [heroLine(input.hero)], guest: false };
        this.serverId.set(null);
        this.apply(deck);
        return deck;
      }),
      catchError((err: unknown) => {
        this.saving.set(false);
        console.warn('Re:Builder: server deck creation failed, keeping a local deck', err);
        return of(this.create(input));
      }),
    );
  }

  /** Loads a guest deck synchronously, or a server deck (public decks need no token). */
  load(id: string): void {
    if (this.deckId() === id && !this.error() && (this.lines().length || this.hero())) return;
    if (this.serverId() === id && this.loading()) return;
    this.flush();
    this.error.set(null);
    if (GuestDeckService.isGuestId(id)) {
      this.serverId.set(null);
      const guest = this.guests.get(id);
      if (!guest) {
        this.reset();
        this.deckId.set(id);
        this.error.set('Deck introuvable sur cet appareil.');
        return;
      }
      this.apply(guest);
      return;
    }
    this.reset();
    this.deckId.set(id);
    // Same id after an error or a reset: the params do not change, so refetch explicitly.
    if (this.serverId() === id) this.serverDeck.reload();
    else this.serverId.set(id);
  }

  setQuantity(card: Card, quantity: number): void {
    if (!this.editable()) return;
    const qty = Math.max(0, Math.min(this.maxFor(card), Math.round(quantity)));
    this.lines.update((current) => {
      const i = current.findIndex((l) => l.card.reference === card.reference);
      if (i === -1) return qty > 0 ? [...current, { card, quantity: qty }] : current;
      if (qty === 0) return current.filter((_, idx) => idx !== i);
      const next = current.slice();
      next[i] = { ...next[i], quantity: qty };
      return next;
    });
    this.touch();
  }

  addCard(card: Card): void {
    this.setQuantity(card, this.quantityOf(card.reference) + 1);
  }

  removeCard(reference: string): void {
    const line = this.lines().find((l) => l.card.reference === reference);
    if (line) this.setQuantity(line.card, line.quantity - 1);
  }

  updateSettings(settings: { hero?: DeckHero; format?: DeckFormat; isPublic?: boolean; name?: string }): void {
    if (settings.hero) this.hero.set(settings.hero);
    if (settings.format) this.format.set(settings.format);
    if (settings.isPublic !== undefined) this.isPublic.set(settings.isPublic);
    if (settings.name !== undefined) this.name.set(settings.name);
    this.touch();
  }

  rename(name: string): void {
    this.name.set(name);
    this.touch();
  }

  /** Copies the current deck into a new guest deck and returns its id. */
  duplicate(nameSuffix = ' (copie)'): string {
    const copy = this.guests.create({
      name: `${this.name() || 'Deck'}${nameSuffix}`,
      format: this.format(),
      isPublic: false,
      hero: this.hero(),
      deckCards: this.serializeLines(),
    });
    return copy.id;
  }

  delete(): Observable<boolean> {
    const id = this.deckId();
    if (!id) return of(false);
    if (GuestDeckService.isGuestId(id)) {
      this.guests.delete(id);
      this.clear();
      return of(true);
    }
    return this.decksApi.delete(id).pipe(
      map(() => {
        this.clear();
        return true;
      }),
      catchError(() => {
        this.error.set('Suppression refusée : connexion requise.');
        return of(false);
      }),
    );
  }

  /** Writes pending changes immediately (navigation away, tests). */
  flush(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
      this.save();
    }
  }

  reset(): void {
    this.deckId.set(null);
    this.name.set('');
    this.format.set('standard');
    this.isPublic.set(false);
    this.hero.set(null);
    this.createdAt.set(null);
    this.lines.set([]);
    this.dirty.set(false);
    this.isGuest.set(true);
  }

  /** Forgets the deck and cancels any pending fetch. */
  clear(): void {
    this.serverId.set(null);
    this.reset();
  }

  private touch(): void {
    this.dirty.set(true);
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.save();
    }, SAVE_DELAY_MS);
  }

  private serializeLines() {
    const hero = this.hero();
    return [...(hero ? [heroLine(hero)] : []), ...this.lines().map((l) => cardToLine(l.card, l.quantity))];
  }

  private save(): void {
    const id = this.deckId();
    if (!id) return;
    if (GuestDeckService.isGuestId(id)) {
      const existing = this.guests.get(id);
      this.guests.save({
        ...(existing ?? { id }),
        id,
        name: this.name() || 'Nouveau deck',
        format: this.format(),
        isPublic: this.isPublic(),
        hero: this.hero(),
        legal: this.status().legal && !!this.hero(),
        deckCards: this.serializeLines(),
        guest: true,
      });
      this.dirty.set(false);
      return;
    }
    if (!this.auth.isLoggedIn()) return;
    const payload: Partial<DeckWrite> = {
      name: this.name(),
      format: this.format(),
      isPublic: this.isPublic(),
      deckCards: this.serializeLines().map((l) => ({ cardReference: l.cardReference, quantity: l.quantity })),
    };
    this.saving.set(true);
    this.decksApi.patch(id, payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.dirty.set(false);
      },
      error: (err: { status?: number }) => {
        this.saving.set(false);
        this.error.set(err.status === 401 ? 'Enregistrement serveur refusé (401).' : 'Échec de la sauvegarde.');
      },
    });
  }

  private apply(deck: Deck): void {
    const hero = heroOf(deck);
    this.deckId.set(deck.id);
    this.name.set(deck.name || 'Sans nom');
    this.format.set((deck.format as DeckFormat) || 'standard');
    this.isPublic.set(!!deck.isPublic);
    this.hero.set(hero);
    this.createdAt.set(deck.createdAt ?? deck.updatedAt ?? null);
    this.isGuest.set(!!deck.guest || GuestDeckService.isGuestId(deck.id));
    this.lines.set(
      deckLines(deck)
        .filter((l) => !isHeroLine(l, hero))
        .map((l) => ({ card: lineToCard(l), quantity: l.quantity })),
    );
    this.dirty.set(false);
    this.fillUniqueFaces(deck.id);
  }

  /**
   * Deck lines from the decks API (and guest lines saved before effects were kept) have costs and
   * powers but not the printed effect. Commons carry that text in their image; a unique is drawn
   * by `ar-unique-card`, so the face is fetched from the cards API.
   */
  private fillUniqueFaces(deckId: string): void {
    this.uniqueFaces?.unsubscribe();
    const refs = [...new Set(this.lines().filter((l) => uniqueNeedsPrintedEffect(l.card)).map((l) => l.card.reference))];
    if (!refs.length) {
      this.uniqueFaces = undefined;
      return;
    }
    this.uniqueFaces = this.cardsApi
      .batch(refs, contentLocale())
      .pipe(catchError(() => of([] as Card[])))
      .subscribe((cards) => {
        if (this.deckId() !== deckId || !cards.length) return;
        const byRef = new Map(cards.map((c) => [c.reference, c]));
        this.lines.update((lines) =>
          lines.map((l) => {
            const full = byRef.get(l.card.reference);
            return full && uniqueNeedsPrintedEffect(l.card) ? { ...l, card: mergeUniqueFace(l.card, full) } : l;
          }),
        );
      });
  }
}

function heroLine(hero: DeckHero) {
  return {
    cardReference: hero.reference,
    quantity: 1,
    name: hero.name,
    factionCode: hero.faction,
    cardTypeReference: 'HERO',
  };
}

export function displayName(card: Card): string {
  return localizedText(card.name, contentLocale()) || card.reference;
}
