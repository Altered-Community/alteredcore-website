import { Service, computed, effect, inject, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, Subscription, of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AuthSession } from './auth-session';
import { CardCatalogService } from './card-catalog.service';
import { DeckAutosaveQueue } from './deck-autosave-queue';
import { DeckCreateFailurePrompt } from './deck-create-failure';
import { UNKNOWN_LEGALITY, legalityFromApi, type DeckLegality } from './deck-legality';
import { DeckPrintModel, heroLine, heroPins, plainHero } from './deck-print-model';
import { deckWriteCards, familyOf, printKey } from './deck-prints';
import { typeOf } from './deck-rules';
import { maxCopiesFor } from './format-rules';
import { FormatsService } from './formats.service';
import { authorOf, cardToLine, deckStats, groupLines, heroOf, isHeroLine, lineToCard, mergeUniqueFace, uniqueNeedsPrintedEffect } from './deck-view';
import { DecksApiService } from './decks-api.service';
import { GuestDeckService } from './guest-deck.service';
import type { AltArtChoice } from './ownership-api.service';
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
import { uiLocale } from './i18n';
import { heroArtSources } from './card-art';

export type { DeckSaveState } from './deck-autosave-queue';

export interface NewDeckInput {
  name: string;
  hero: DeckHero;
  format: DeckFormat;
  isPublic: boolean;
  description?: string;
}

/** Why a deck could not be opened: private (401/403), unknown id (404), unreachable API, other HTTP error. */
export type DeckLoadError = 'private' | 'notFound' | 'network' | 'server';

/**
 * Editor state for one deck. Guests (no Keycloak token) autosave to localStorage;
 * with a token, changes are PATCHed to the decks API, which validates each save: the legality shown is its answer.
 * Delegates autosave scheduling/single-flight queuing to `DeckAutosaveQueue` and print/pin/token overrides to `DeckPrintModel`.
 */
@Service()
export class DeckStore {
  private readonly decksApi = inject(DecksApiService);
  private readonly cardsApi = inject(CardCatalogService);
  private readonly formats = inject(FormatsService);
  private readonly guests = inject(GuestDeckService);
  private readonly auth = inject(AuthSession);
  private readonly createFailure = inject(DeckCreateFailurePrompt);
  /** In-flight fill of unique faces; cancelled when another deck is applied. */
  private uniqueFaces?: Subscription;

  private readonly printModel = new DeckPrintModel();
  private readonly autosave = new DeckAutosaveQueue({
    currentDeckId: () => this.deckId(),
    isGuestId: (id) => GuestDeckService.isGuestId(id),
    canSaveRemote: () => this.auth.isLoggedIn(),
    saveGuest: (id) => this.saveGuestDeck(id),
    buildPayload: () => this.payload(),
    patchRemote: (id, payload, options) => this.decksApi.patch(id, payload, options),
    onRemoteSaved: (saved) => {
      if (!saved) return;
      this.printModel.absorbAnswer(saved);
      // The verdict on what was sent: the newest the API gave, until the next answer.
      this.apiLegality.set(legalityFromApi(saved));
    },
    formatError: (err) => apiErrorMessage(err, saveErrorHead),
    unauthorizedError: () => saveErrorHead(401),
  });

  /** Id of the server deck to fetch; `null` for guest decks and new decks (resource idle). */
  private readonly serverId = signal<string | null>(null);
  /** Switching id cancels the in-flight request, so a late response never overwrites the current deck. */
  private readonly serverDeck = rxResource({
    params: () => this.serverId() ?? undefined,
    stream: ({ params: id }) => this.decksApi.get(id, uiLocale()),
  });

  readonly loading = computed(() => this.serverDeck.isLoading());
  /**
   * The deck is being opened (fetched, or not chosen yet): its views show skeletons, never the empty deck the store
   * holds meanwhile (« 0 cartes », « Deck vide », « Non légal »).
   */
  readonly opening = computed(() => !this.loadError() && (this.loading() || !this.deckId()));
  /** A save request to the decks API is running. */
  readonly saving = this.autosave.saving;
  /** Why the deck could not be opened; a failed save goes to `saveError`, a failed delete or « Rendre public » to `actionError`. */
  readonly error = signal<string | null>(null);
  /** Last `delete()` / `makePublic()` refused or unreachable: displayable message; the deck stays open. */
  readonly actionError = signal<string | null>(null);
  /** Set with `error` when the deck could not be opened. */
  readonly loadError = signal<DeckLoadError | null>(null);
  /** Last save refused or unreachable: displayable message, with the API's violations. `null` after a save succeeds. */
  readonly saveError = this.autosave.saveError;
  /** Changes not written yet (waiting for the save delay, being sent, or refused). */
  readonly dirty = this.autosave.dirty;
  readonly saveState = this.autosave.saveState;

  readonly deckId = signal<string | null>(null);
  readonly name = signal('');
  readonly description = signal('');
  readonly isDraft = signal<boolean | null>(null);
  readonly format = signal<DeckFormat>('standard');
  readonly isPublic = signal(false);
  readonly hero = signal<DeckHero | null>(null);
  /** The hero's frameless art, with its fallbacks: the portrait of the deck bar, the app bar and « Résumé du deck ». */
  readonly heroArt = computed(() => {
    const ref = this.hero()?.reference;
    return ref ? heroArtSources(ref) : null;
  });
  readonly createdAt = signal<string | null>(null);
  /** Owner's pseudo (`owner.pseudo` of a public deck), `null` when the API does not tell it. */
  readonly owner = signal<string | null>(null);
  readonly isGuest = signal(true);
  /** Non-hero lines: the prints shown. */
  readonly lines = signal<HydratedLine[]>([]);
  /** The prints the deck chooses itself, 1st copy first, by card (`printKey`, family + rarity): its `altArtOverrides`. */
  readonly pins = this.printModel.pins;
  /** The deck's token prints (`altArtOverrides.tokens`). */
  readonly tokenPrints = this.printModel.tokenPrints;

  /** The format's rules (decks API), `null` until they are loaded or for an unknown format. */
  readonly rules = computed(() => this.formats.rulesFor(this.format()));
  /** `legal` / `errors` / `legalityDetail` of the decks API's last answer (GET, or the answer to the last save). */
  private readonly apiLegality = signal<DeckLegality | null>(null);
  /** The decks API's verdict; `unknown` for a guest deck or before the API has validated the deck. */
  readonly legality = computed<DeckLegality>(() => this.apiLegality() ?? UNKNOWN_LEGALITY);
  readonly groups = computed(() => groupLines(this.lines()));
  readonly stats = computed(() => deckStats(this.lines()));
  readonly total = computed(() => this.lines().reduce((n, l) => (l.quantity > 0 && typeOf(l.card) !== 'HERO' ? n + l.quantity : n), 0));
  readonly distinct = computed(() => this.lines().filter((l) => l.quantity > 0).length);
  readonly quantities = computed(() => new Map(this.lines().map((l) => [l.card.reference, l.quantity])));

  private readonly mineWanted = signal(false);
  private readonly mineIds = rxResource({
    params: () => (this.mineWanted() && this.auth.isLoggedIn() ? { user: this.auth.username(), token: this.auth.token() } : undefined),
    stream: () => this.decksApi.mineIds(),
  });
  /** Decks created on the account from this tab: theirs before the account list is refetched. */
  private readonly createdIds = signal<ReadonlySet<string>>(new Set());
  /**
   * The open deck belongs to the user: `true` for guest decks, `null` while the deck opens (the store holds an empty guest
   * deck meanwhile) or the account list loads.
   */
  readonly owned = computed<boolean | null>(() => {
    if (this.opening()) return null;
    if (this.isGuest()) return true;
    const id = this.deckId();
    if (!id || !this.auth.isLoggedIn()) return false;
    if (this.createdIds().has(id)) return true;
    if (this.mineIds.error()) return false;
    if (this.mineIds.isLoading()) return null;
    return this.mineIds.hasValue() ? this.mineIds.value().has(id) : null;
  });
  readonly editable = computed(() => this.owned() === true);
  readonly steppersShown = computed(() => this.owned() !== false);

  /** Last copy count changed from the editor (`delta` > 0: added), for the « Annuler » toast. */
  readonly lastChange = signal<{ card: Card; quantity: number; delta: number } | null>(null);

  constructor() {
    effect(() => {
      const err = this.serverDeck.error();
      if (err) {
        const status = (err as { status?: number }).status ?? 0;
        const kind: DeckLoadError = status === 401 || status === 403 ? 'private' : status === 404 ? 'notFound' : status === 0 ? 'network' : 'server';
        untracked(() => {
          this.loadError.set(kind);
          this.error.set(loadErrorMessage(kind, status));
        });
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

  /** Copies of the deck's prints of a card (`printKey`, same family and rarity), `except` one print. */
  private keyQuantity(key: string, except?: string): number {
    return this.lines().reduce((n, l) => (l.card.reference !== except && printKey(l.card.reference) === key ? n + l.quantity : n), 0);
  }

  /**
   * Copies `card`'s card (family + rarity, all its prints) can have: the format's caps (`GET /api/formats`), its family
   * sharing `maxCopiesPerName` with its other rarities in the deck.
   */
  familyCap(card: Card): number {
    const rules = this.rules();
    const cap = maxCopiesFor(card, rules);
    const perName = rules?.limits.maxCopiesPerName ?? null;
    const family = familyOf(card.reference);
    if (!cap || perName === null || !family || typeOf(card) === 'HERO') return cap;
    const key = printKey(card.reference);
    const otherRarities = this.lines().reduce(
      (n, l) => (familyOf(l.card.reference) === family && printKey(l.card.reference) !== key ? n + l.quantity : n),
      0,
    );
    return Math.max(0, Math.min(cap, perName - otherRarities));
  }

  /** Copies of this print the editor lets the player have: its card's cap less its other prints, never under its copies. */
  maxFor(card: Card): number {
    const others = this.keyQuantity(printKey(card.reference), card.reference);
    return Math.max(this.quantityOf(card.reference), this.familyCap(card) - others);
  }

  create(input: NewDeckInput): Deck {
    const deck = this.guests.create({
      name: input.name.trim() || $localize`:@@core.deck.defaultName:Nouveau deck`,
      description: input.description?.trim() ?? '',
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
   * `create()` on the decks API when the user is signed in (the deck then shows up in the site's
   * deck list too); a guest deck otherwise. When the API refuses, `DeckCreateFailurePrompt` asks
   * whether to try again or keep the deck in this browser; cancelling completes without a deck.
   */
  createDeck(input: NewDeckInput): Observable<Deck> {
    if (!this.auth.isLoggedIn()) return of(this.create({ ...input, hero: plainHero(input.hero) }));
    const description = input.description?.trim() ?? '';
    const body: DeckWrite = {
      name: input.name.trim() || $localize`:@@core.deck.defaultName:Nouveau deck`,
      format: input.format,
      isPublic: input.isPublic,
      // A new deck is never archived (isDraft: hidden in BGA).
      isDraft: false,
      ...(description ? { description } : {}),
      ...deckWriteCards([{ reference: input.hero.reference, quantity: 1 }], heroPins(input.hero), new Map()),
    };
    this.autosave.setSaving(true);
    return this.decksApi.create(body).pipe(
      map((created) => {
        this.autosave.setSaving(false);
        const deck: Deck = { ...created, hero: created.hero ?? plainHero(input.hero), deckCards: created.deckCards ?? [heroLine(input.hero)], guest: false };
        this.createdIds.update((ids) => new Set([...ids, deck.id]));
        this.serverId.set(null);
        this.apply(deck);
        return deck;
      }),
      catchError((err: unknown) => {
        this.autosave.setSaving(false);
        return this.createFailure.ask(apiErrorMessage(err, createErrorHead)).pipe(
          switchMap((choice) => {
            switch (choice) {
              case 'retry':
                return this.createDeck(input);
              case 'local':
                return of(this.create(input));
              case 'cancel':
                return EMPTY;
            }
          }),
        );
      }),
    );
  }

  /** Loads a guest deck synchronously, or a server deck (public decks need no token). */
  load(id: string): void {
    if (this.deckId() === id && !this.error() && (this.lines().length || this.hero())) return;
    if (this.serverId() === id && this.loading()) return;
    this.flush();
    this.error.set(null);
    this.loadError.set(null);
    if (GuestDeckService.isGuestId(id)) {
      this.serverId.set(null);
      const guest = this.guests.get(id);
      if (!guest) {
        this.reset();
        this.deckId.set(id);
        this.loadError.set('notFound');
        this.error.set($localize`:@@core.deckStore.notOnDevice:Deck introuvable sur cet appareil.`);
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
    const before = this.quantityOf(card.reference);
    if (qty !== before) this.lastChange.set({ card, quantity: qty, delta: qty - before });
    this.lines.update((current) => {
      const i = current.findIndex((l) => l.card.reference === card.reference);
      if (i === -1) return qty > 0 ? [...current, { card, quantity: qty }] : current;
      if (qty === 0) return current.filter((_, idx) => idx !== i);
      const next = current.slice();
      next[i] = { ...next[i], quantity: qty };
      return next;
    });
    const key = printKey(card.reference);
    const heroCopy = this.hero() && printKey(this.hero()!.reference) === key ? 1 : 0;
    this.printModel.learn(card.reference);
    this.printModel.repin(card.reference, before, qty, this.keyQuantity(key) + heroCopy);
    this.autosave.touch();
  }

  /** The prints the deck pins for `card`'s card, 1st copy first. */
  pinsOf(card: Pick<Card, 'reference'>): readonly string[] {
    return this.printModel.pinsOf(card);
  }

  /**
   * « Pour ce deck »: the copies of `card`'s card (lines whose reference is in `members`) take `pinned` first, the other
   * copies the player's preferences (`choice`); `[]`: every copy follows the preferences again. Saved with the deck.
   */
  pinPrints(card: Card, choice: AltArtChoice | null, members: ReadonlySet<string>, pinned: readonly string[]): void {
    if (!this.editable()) return;
    const result = this.printModel.pinPrints(card, this.lines(), choice, members, pinned);
    if (!result) return;
    if (result.nextLines) this.lines.set(result.nextLines);
    this.autosave.touch();
  }

  /**
   * A card's copies as one (a search result, the deck board's pile): the copies the deck pins stay first, the others
   * show the player's preferences (`choice`).
   */
  setFamilyQuantity(card: Card, choice: AltArtChoice, members: ReadonlySet<string>, quantity: number): void {
    if (!this.editable()) return;
    const target = Math.max(0, Math.min(this.familyCap(card), Math.round(quantity)));
    const result = this.printModel.setFamilyQuantity(card, this.lines(), choice, members, target);
    if (!result) return;
    this.lastChange.set(result.lastChange);
    this.lines.set(result.nextLines);
    this.autosave.touch();
  }

  /**
   * The copies the deck does not pin show the player's preferences (`choices`: families by reference), the hero too
   * when it is not pinned. What is shown only: nothing is saved (the decks API keeps the canonical cards and the pins).
   */
  showPreferences(choices: Readonly<Record<string, AltArtChoice>>): void {
    const result = this.printModel.applyPreferences(this.lines(), this.hero(), choices);
    if (result.nextLines) this.lines.set(result.nextLines);
    if (result.nextHero) this.hero.set(result.nextHero);
  }

  /**
   * « Arts par défaut »: the deck pins no print anymore, every card (and the hero) follows the player's global
   * preferences. `false` when the deck pinned none.
   */
  clearPins(): boolean {
    if (!this.editable() || !this.printModel.clearPins()) return false;
    this.autosave.touch();
    return true;
  }

  /** The deck's print of a token family (`family`: its prints), `null` when the deck follows the player's preference. */
  tokenPrintOf(family: readonly string[]): string | null {
    return this.printModel.tokenPrintOf(family);
  }

  /** « Pour ce deck »: a token family takes `reference` in this deck (`null`: the player's preference again). */
  setTokenPrint(family: readonly string[], reference: string | null): void {
    if (!this.editable()) return;
    this.printModel.setTokenPrint(family, reference);
    this.autosave.touch();
  }

  addCard(card: Card): void {
    this.setQuantity(card, this.quantityOf(card.reference) + 1);
  }

  removeCard(reference: string): void {
    const line = this.lines().find((l) => l.card.reference === reference);
    if (line) this.setQuantity(line.card, line.quantity - 1);
  }

  /** A blank `name` keeps the current one. */
  updateSettings(settings: { hero?: DeckHero; format?: DeckFormat; isPublic?: boolean; name?: string; description?: string }): void {
    if (!this.editable()) return;
    const hero = settings.hero;
    if (hero) {
      const before = this.hero();
      this.hero.set(plainHero(hero));
      this.printModel.replaceHero(before, hero);
    }
    if (settings.format) this.format.set(settings.format);
    if (settings.isPublic !== undefined) this.isPublic.set(settings.isPublic);
    if (settings.name?.trim()) this.name.set(settings.name.trim());
    if (settings.description !== undefined) this.description.set(settings.description);
    this.autosave.touch();
  }

  /** A blank name is shown while typing but not saved. */
  rename(name: string): void {
    if (!this.editable()) return;
    this.name.set(name);
    if (name.trim()) this.autosave.touch();
  }

  /** Default name of a copy: « <name> (copie) ». */
  duplicateName(): string {
    return $localize`:@@core.deckStore.copyName:${this.name() || 'Deck'}:name: (copie)`;
  }

  /** Copies the open deck into a new private guest deck (this browser) and returns its id. */
  duplicateToGuest(name: string): string {
    const description = this.description().trim();
    return this.guests.create({ name, description, format: this.format(), isPublic: false, hero: this.hero(), deckCards: this.serializeLines() }).id;
  }

  /**
   * Copies the open deck, private, and emits the copy's id: on the account when the user is signed
   * in (like the site's « Dupliquer »), in this browser otherwise. Fails with a displayable message.
   */
  duplicate(name: string): Observable<string> {
    const deckName = name.trim() || this.duplicateName();
    const description = this.description().trim();
    if (!this.auth.isLoggedIn()) return of(this.duplicateToGuest(deckName));
    // Someone else's deck: the copy pins no print, the user's own preferences show (their own deck keeps its choices).
    const body: DeckWrite = {
      name: deckName,
      format: this.format(),
      isPublic: false,
      isDraft: false,
      ...(description ? { description } : {}),
      ...this.printModel.writeCards(this.shownLines(), this.owned() === true),
    };
    return this.decksApi.create(body).pipe(
      map((created) => {
        this.createdIds.update((ids) => new Set([...ids, created.id]));
        return created.id;
      }),
      catchError((err: unknown) => throwError(() => new Error(apiErrorMessage(err, duplicateErrorHead)))),
    );
  }

  /**
   * « Rendre public & partager »: only `isPublic` is sent (the rest of the deck is untouched), as the site's deck page
   * does; `false` on a refusal, with the reason in `actionError`.
   */
  makePublic(): Observable<boolean> {
    const id = this.deckId();
    if (!id || GuestDeckService.isGuestId(id)) return of(false);
    this.actionError.set(null);
    return this.decksApi.patch(id, { isPublic: true }).pipe(
      map(() => {
        this.isPublic.set(true);
        return true;
      }),
      catchError((err: unknown) => {
        this.actionError.set(apiErrorMessage(err, makePublicErrorHead));
        return of(false);
      }),
    );
  }

  /**
   * « Archiver » / « Désarchiver »: only `isDraft` is sent. An archived deck is hidden in BGA, and stays in « Mes decks »
   * and in the community list when public. `false` on a refusal, with the reason in `actionError`.
   */
  setArchived(archived: boolean): Observable<boolean> {
    const id = this.deckId();
    if (!id || GuestDeckService.isGuestId(id)) return of(false);
    this.actionError.set(null);
    return this.decksApi.patch(id, { isDraft: archived }).pipe(
      map(() => {
        this.isDraft.set(archived);
        return true;
      }),
      catchError((err: unknown) => {
        this.actionError.set(apiErrorMessage(err, archiveErrorHead));
        return of(false);
      }),
    );
  }

  delete(): Observable<boolean> {
    const id = this.deckId();
    if (!id) return of(false);
    if (GuestDeckService.isGuestId(id)) {
      this.guests.delete(id);
      this.clear();
      return of(true);
    }
    this.actionError.set(null);
    return this.decksApi.delete(id).pipe(
      map(() => {
        this.autosave.dropQueued(id);
        this.clear();
        return true;
      }),
      catchError((err: unknown) => {
        this.actionError.set(apiErrorMessage(err, deleteErrorHead));
        return of(false);
      }),
    );
  }

  flush(options: { keepalive?: boolean } = {}): void {
    this.autosave.flush(options);
  }

  leavePage(): boolean {
    return this.autosave.leavePage();
  }

  saveNow(): Observable<boolean> {
    return this.autosave.saveNow();
  }

  /**
   * The open guest deck goes to the signed-in user's account (« Partager » after signing in): it is created there, then
   * removed from this device, and the account deck replaces it in the editor. Emits the new id, or `null` when the decks
   * API refused it (message in `saveError`; the guest deck stays on this device).
   */
  moveToAccount(): Observable<string | null> {
    const id = this.deckId();
    if (!id || !GuestDeckService.isGuestId(id) || !this.auth.isLoggedIn()) return of(null);
    // The guest copy is written first: it is what stays on this device if the account refuses the deck.
    this.flush();
    const description = this.description().trim();
    const lines = this.serializeLines();
    const body: DeckWrite = {
      name: this.name().trim() || $localize`:@@core.deck.defaultName:Nouveau deck`,
      format: this.format(),
      isPublic: this.isPublic(),
      isDraft: false,
      ...(description ? { description } : {}),
      ...this.printModel.writeCards(this.shownLines()),
    };
    this.autosave.setError(null);
    this.autosave.setSaving(true);
    return this.decksApi.create(body).pipe(
      map((created) => {
        this.autosave.setSaving(false);
        // As « Enregistrer sur mon compte » on the decks page: the site builder's copy goes too, or it comes back.
        this.guests.forgetSiteDeck(id);
        this.guests.delete(id);
        this.createdIds.update((ids) => new Set([...ids, created.id]));
        // A change made during the request would be written to the deleted guest deck.
        this.autosave.cancelPending();
        this.serverId.set(null);
        this.apply({ ...created, hero: created.hero ?? this.hero(), deckCards: created.deckCards ?? lines, guest: false });
        return created.id;
      }),
      catchError((err: unknown) => {
        this.autosave.setSaving(false);
        this.autosave.setError(apiErrorMessage(err, moveErrorHead));
        return of(null);
      }),
    );
  }

  /** Sends the deck again after a failed save (« Réessayer »). */
  retrySave(): void {
    this.autosave.retrySave();
  }

  reset(): void {
    this.deckId.set(null);
    this.name.set('');
    this.description.set('');
    this.isDraft.set(null);
    this.apiLegality.set(null);
    this.format.set('standard');
    this.isPublic.set(false);
    this.hero.set(null);
    this.createdAt.set(null);
    this.owner.set(null);
    this.lines.set([]);
    this.printModel.reset();
    this.autosave.resetDeckStatus();
    this.actionError.set(null);
    this.isGuest.set(true);
  }

  /** Forgets the deck and cancels any pending fetch. */
  clear(): void {
    this.serverId.set(null);
    this.reset();
  }

  private serializeLines() {
    const hero = this.hero();
    return [...(hero ? [heroLine(hero)] : []), ...this.lines().map((l) => cardToLine(l.card, l.quantity))];
  }

  /** The prints shown, hero first. */
  private shownLines(): { reference: string; quantity: number }[] {
    const hero = this.hero();
    return [...(hero ? [{ reference: hero.reference, quantity: 1 }] : []), ...this.lines().map((l) => ({ reference: l.card.reference, quantity: l.quantity }))];
  }

  private saveGuestDeck(id: string): void {
    const existing = this.guests.get(id);
    this.guests.save({
      ...(existing ?? { id }),
      id,
      name: this.name() || $localize`:@@core.deck.defaultName:Nouveau deck`,
      description: this.description().trim(),
      format: this.format(),
      isPublic: this.isPublic(),
      hero: this.hero(),
      deckCards: this.serializeLines(),
      guest: true,
    });
  }

  /**
   * The open deck as PATCHed: its canonical cards and its own prints. `isDraft` (archived: hidden in BGA) is never sent,
   * so editing an archived deck keeps it archived; `setArchived()` changes it.
   */
  private payload(): Partial<DeckWrite> {
    return {
      name: this.name().trim() || $localize`:@@core.deck.defaultName:Nouveau deck`,
      description: this.description().trim(),
      format: this.format(),
      isPublic: this.isPublic(),
      ...this.printModel.writeCards(this.shownLines()),
    };
  }

  private apply(deck: Deck): void {
    // Another deck replaces the open one (created, duplicated): its waiting change goes first.
    if (this.deckId() !== deck.id) this.flush();
    const hero = heroOf(deck);
    this.deckId.set(deck.id);
    this.name.set(deck.name || $localize`:@@core.deck.untitled:Sans nom`);
    this.description.set(deck.description ?? '');
    this.isDraft.set(typeof deck.isDraft === 'boolean' ? deck.isDraft : null);
    this.format.set((deck.format as DeckFormat) || 'standard');
    this.isPublic.set(!!deck.isPublic);
    this.hero.set(hero);
    this.createdAt.set(deck.createdAt ?? deck.updatedAt ?? null);
    this.owner.set(authorOf(deck));
    this.isGuest.set(!!deck.guest || GuestDeckService.isGuestId(deck.id));
    this.apiLegality.set(this.isGuest() ? null : legalityFromApi(deck));
    if (!this.isGuest()) this.mineWanted.set(true);
    this.lines.set(
      deckLines(deck)
        .filter((l) => !isHeroLine(l, hero))
        .map((l) => ({ card: lineToCard(l), quantity: l.quantity })),
    );
    this.printModel.load(deck, hero?.reference);
    this.autosave.resetDeckStatus();
    this.actionError.set(null);
    this.fillUniqueFaces(deck.id);
  }

  /**
   * Deck lines from the decks API (and guest lines saved before effects were kept) have costs and
   * powers but not the printed effect. Commons carry that text in their image; a unique is drawn
   * by `ac-unique-card`, so the face is fetched from the cards API.
   */
  private fillUniqueFaces(deckId: string): void {
    this.uniqueFaces?.unsubscribe();
    this.uniqueFaces = this.cardsApi.uniqueFaces(this.lines().map((l) => l.card)).subscribe((faces) => {
      if (this.deckId() !== deckId || !faces.size) return;
      this.lines.update((lines) =>
        lines.map((l) => {
          const full = faces.get(l.card.reference);
          return full && uniqueNeedsPrintedEffect(l.card) ? { ...l, card: mergeUniqueFace(l.card, full) } : l;
        }),
      );
    });
  }
}

function loadErrorMessage(kind: DeckLoadError, status: number): string {
  switch (kind) {
    case 'private':
      return $localize`:@@core.deckStore.private:Ce deck est privé : connexion requise.`;
    case 'notFound':
      return $localize`:@@core.deckStore.notFound:Deck introuvable.`;
    case 'network':
      return $localize`:@@core.deckStore.network:Erreur de connexion.`;
    case 'server':
      return $localize`:@@core.deckStore.loadFailedHttp:Impossible de charger le deck (HTTP ${status}:status:).`;
  }
}

const saveErrorHead = (status: number) =>
  status === 401 || status === 403
    ? $localize`:@@core.deckStore.saveRefused:Enregistrement refusé : reconnectez-vous (HTTP ${status}:status:).`
    : $localize`:@@core.deckStore.saveFailed:Échec de l’enregistrement (HTTP ${status}:status:).`;
const createErrorHead = (status: number) => $localize`:@@core.deckStore.createFailed:Impossible de créer le deck sur votre compte (HTTP ${status}:status:).`;
const archiveErrorHead = (status: number) => $localize`:@@core.deckStore.archiveFailed:Impossible de changer le statut d’archive de ce deck (HTTP ${status}:status:).`;
const makePublicErrorHead = (status: number) => $localize`:@@core.deckStore.makePublicFailed:Impossible de rendre ce deck public (HTTP ${status}:status:).`;
const deleteErrorHead = (status: number) =>
  status === 401 || status === 403
    ? $localize`:@@core.deckStore.deleteRefused:Suppression refusée : connexion requise.`
    : $localize`:@@core.deckStore.deleteFailed:Impossible de supprimer ce deck (HTTP ${status}:status:).`;
const moveErrorHead = (status: number) =>
  $localize`:@@core.deckStore.moveFailed:Impossible d’enregistrer le deck sur votre compte (HTTP ${status}:status:).`;
const duplicateErrorHead = (status: number) => $localize`:@@core.deckStore.duplicateFailed:Impossible de dupliquer ce deck (HTTP ${status}:status:).`;

/**
 * « <head> (HTTP n). », then what the decks API says, as the site's builder shows it: the
 * validation `violations` (one per line, « champ : message »), else the problem / Hydra
 * `detail` / `description` / `title`. Unreachable API: « Erreur de connexion. ».
 */
export function apiErrorMessage(err: unknown, head: (status: number) => string): string {
  if (!(err instanceof HttpErrorResponse) || err.status === 0) return $localize`:@@core.deckStore.network:Erreur de connexion.`;
  const body = (err.error && typeof err.error === 'object' ? err.error : {}) as Record<string, unknown>;
  const violations = Array.isArray(body['violations'])
    ? (body['violations'] as { propertyPath?: string; message?: string }[])
        .map((v) => [v.propertyPath, v.message].filter(Boolean).join(' : '))
        .filter(Boolean)
        .join('\n')
    : '';
  const text = (key: string) => (typeof body[key] === 'string' ? (body[key] as string) : '');
  const extra = violations || text('detail') || text('hydra:description') || text('description') || text('title') || text('hydra:title');
  return extra ? `${head(err.status)}\n${extra}` : head(err.status);
}

export function displayName(card: Card): string {
  return localizedText(card.name, contentLocale()) || card.reference;
}
