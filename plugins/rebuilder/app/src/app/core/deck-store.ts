import { Service, computed, effect, inject, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, Subject, Subscription, of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, filter, map, switchMap, take } from 'rxjs/operators';
import { AuthSession } from './auth-session';
import { CardCatalogService } from './card-catalog.service';
import { DeckCreateFailurePrompt } from './deck-create-failure';
import { UNKNOWN_LEGALITY, legalityFromApi, type DeckLegality } from './deck-legality';
import { typeOf } from './deck-rules';
import { canonicalFromAnswer, deckWriteCards, familyOf, guessCanonical, isPinnedPrint, printKey, readDeckPrints } from './deck-prints';
import { maxCopiesFor } from './format-rules';
import { FormatsService } from './formats.service';
import { authorOf, cardToLine, deckStats, groupLines, heroOf, isHeroLine, lineToCard, mergeUniqueFace, uniqueNeedsPrintedEffect } from './deck-view';
import { DecksApiService } from './decks-api.service';
import { GuestDeckService } from './guest-deck.service';
import type { AltArtChoice } from './ownership-api.service';
import { basePrint, counts, defaultPrints, familyPrints, linesWithPins, sameCopies, slotDefaults, withFamilyPrints } from './alt-art-defaults';
import {
  type Card,
  type Deck,
  type DeckFormat,
  type DeckHero,
  type DeckWrite,
  type HydratedLine,
  type PrintQuantity,
  deckLines,
  localizedText,
} from './models';
import { contentLocale } from './locale';
import { uiLocale } from './i18n';
import { heroArtSources } from './card-art';

export interface NewDeckInput {
  name: string;
  hero: DeckHero;
  format: DeckFormat;
  isPublic: boolean;
  description?: string;
}

const SAVE_DELAY_MS = 400;

/** Why a deck could not be opened: private (401/403), unknown id (404), unreachable API, other HTTP error. */
export type DeckLoadError = 'private' | 'notFound' | 'network' | 'server';

/**
 * Autosave of the open deck: nothing changed yet (`idle`), a change waits for the save delay
 * (`pending`), a request is running (`saving`), everything is written (`saved`), or the last
 * save failed (`error`, message in `saveError`).
 */
export type DeckSaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

/**
 * Editor state for one deck. Guests (no Keycloak token) autosave to localStorage;
 * with a token, changes are PATCHed to the decks API, which validates each save: the legality shown is its answer.
 * `lines` are the prints shown; `pins` the prints the deck itself chooses (its `altArtOverrides`, `deck-prints.ts`),
 * the other copies show the player's global preferences (`EditorAltArts`).
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
  readonly saving = signal(false);
  /** Why the deck could not be opened; a failed save goes to `saveError`, a failed delete or « Rendre public » to `actionError`. */
  readonly error = signal<string | null>(null);
  /** Last `delete()` / `makePublic()` refused or unreachable: displayable message; the deck stays open. */
  readonly actionError = signal<string | null>(null);
  /** Set with `error` when the deck could not be opened. */
  readonly loadError = signal<DeckLoadError | null>(null);
  /** Last save refused or unreachable: displayable message, with the API's violations. `null` after a save succeeds. */
  readonly saveError = signal<string | null>(null);
  /** Changes not written yet (waiting for the save delay, being sent, or refused). */
  readonly dirty = signal(false);
  /** At least one save of this deck succeeded since it was opened. */
  private readonly saved = signal(false);
  readonly saveState = computed<DeckSaveState>(() => {
    if (this.saving()) return 'saving';
    if (this.saveError()) return 'error';
    if (this.dirty()) return 'pending';
    return this.saved() ? 'saved' : 'idle';
  });

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
  /**
   * The prints the deck chooses itself, 1st copy first, by card (`printKey`, family + rarity): its `altArtOverrides`.
   * The other copies of a card follow the player's global preferences.
   */
  readonly pins = signal<ReadonlyMap<string, readonly string[]>>(new Map());
  /** The deck's token prints (`altArtOverrides.tokens`). */
  readonly tokenPrints = signal<readonly PrintQuantity[]>([]);
  /** Canonical reference of each card the decks API told (`canonicalCards`, override keys), by `printKey`. */
  private canonical = new Map<string, string>();

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
  /**
   * Ids of the signed-in user's decks, to tell whether the open deck is theirs: the decks API
   * does not say who owns a deck (`user` is `[]`), but `GET /api/decks` only lists the caller's
   * (DecksApiService.mineIds). Fetched when the first server deck is opened and when the account
   * changes, not for every deck opened. Decks created from this tab meanwhile are in `createdIds`.
   */
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
  /**
   * The editor draws the quantity steppers unless the deck is known not to be the user's: its owner (the account's deck
   * ids) often comes after the deck, and a read-only « ×1 » replaced by the steppers a moment later looks broken. A
   * change waits for `editable()` all the same (setQuantity…).
   */
  readonly steppersShown = computed(() => this.owned() !== false);

  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  /** Bumped by each change; a save only marks the deck clean when no change came after what it sent. */
  private revision = 0;
  /** Revision carried by the running request, `null` when none runs. */
  private inFlight: number | null = null;
  /** The running request is a `keepalive` one (it survives the page). */
  private inFlightKeepalive = false;
  /**
   * Saves that waited for the running request, by deck: the payload is built when queued, so it
   * still writes that deck after another one is opened meanwhile.
   */
  private readonly queued = new Map<string, { revision: number; payload: Partial<DeckWrite> }>();
  /**
   * Newest revision the decks API confirmed. A `keepalive` save runs next to a plain one: when the
   * older one answers last, it may have been written last too, so the current state is sent again.
   */
  private acked: { id: string; revision: number } | null = null;
  /** A save request answered (and the next queued one, if any, was sent): `saveNow()` checks whether it is done. */
  private readonly settled = new Subject<void>();

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
    this.saving.set(true);
    return this.decksApi.create(body).pipe(
      map((created) => {
        this.saving.set(false);
        const deck: Deck = { ...created, hero: created.hero ?? plainHero(input.hero), deckCards: created.deckCards ?? [heroLine(input.hero)], guest: false };
        this.createdIds.update((ids) => new Set([...ids, deck.id]));
        this.serverId.set(null);
        this.apply(deck);
        return deck;
      }),
      catchError((err: unknown) => {
        this.saving.set(false);
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

  /** Last copy count changed from the editor (`delta` > 0: added), for the « Annuler » toast. */
  readonly lastChange = signal<{ card: Card; quantity: number; delta: number } | null>(null);

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
    this.learn(card.reference);
    this.repin(card.reference, before, qty);
    this.touch();
  }

  /**
   * The pins of `reference`'s card after its line went from `before` to `after` copies. An added copy of a print that is
   * not its card's canonical one is pinned to it (an alt art or a promo picked from the search), unless the line's
   * copies show the player's preference (not pinned); a removed copy is a free one first.
   */
  private repin(reference: string, before: number, after: number): void {
    const key = printKey(reference);
    const pinned = [...(this.pins().get(key) ?? [])];
    const own = pinned.filter((r) => r === reference).length;
    if (after > before && isPinnedPrint(reference, this.canonical.get(key)) && (before === 0 || own >= before)) {
      pinned.push(...Array<string>(after - before).fill(reference));
    } else if (after < before) {
      let drop = Math.max(0, before - after - (before - own));
      for (let i = pinned.length - 1; i >= 0 && drop > 0; i--) {
        if (pinned[i] !== reference) continue;
        pinned.splice(i, 1);
        drop--;
      }
    }
    const heroCopy = this.hero() && printKey(this.hero()!.reference) === key ? 1 : 0;
    this.setPinsOf(key, pinned.slice(0, this.keyQuantity(key) + heroCopy));
  }

  private setPinsOf(key: string, pinned: readonly string[]): void {
    const current = this.pins().get(key) ?? [];
    if (current.length === pinned.length && current.every((r, i) => r === pinned[i])) return;
    this.pins.update((m) => {
      const next = new Map(m);
      if (pinned.length) next.set(key, [...pinned]);
      else next.delete(key);
      return next;
    });
  }

  /** Remembers a print's canonical reference when its reference tells it (a booster print added from the search). */
  private learn(reference: string): void {
    const key = printKey(reference);
    if (reference && guessCanonical(reference) === reference && !this.canonical.has(key)) this.canonical.set(key, reference);
  }

  /** The prints the deck pins for `card`'s card, 1st copy first. */
  pinsOf(card: Pick<Card, 'reference'>): readonly string[] {
    return this.pins().get(printKey(card.reference)) ?? [];
  }

  /**
   * « Pour ce deck »: the copies of `card`'s card (lines whose reference is in `members`) take `pinned` first, the other
   * copies the player's preferences (`choice`); `[]`: every copy follows the preferences again. Saved with the deck.
   */
  pinPrints(card: Card, choice: AltArtChoice | null, members: ReadonlySet<string>, pinned: readonly string[]): void {
    if (!this.editable()) return;
    const key = printKey(card.reference);
    const prints = familyPrints(this.lines(), members);
    const kept = pinned.slice(0, prints.length);
    const before = this.pinsOf(card);
    if (before.length === kept.length && before.every((r, i) => r === kept[i])) return;
    if (choice) this.learn(basePrint(choice));
    this.setPinsOf(key, kept);
    if (choice && prints.length) {
      const shown = slotDefaults(choice, [...kept, ...Array<null>(prints.length - kept.length).fill(null)]);
      if (!sameCopies(prints, shown)) this.lines.set(withFamilyPrints(this.lines(), members, card, shown));
    }
    this.touch();
  }

  /**
   * A card's copies as one (a search result, the deck board's pile): the copies the deck pins stay first, the others
   * show the player's preferences (`choice`).
   */
  setFamilyQuantity(card: Card, choice: AltArtChoice, members: ReadonlySet<string>, quantity: number): void {
    if (!this.editable()) return;
    const prints = familyPrints(this.lines(), members);
    const target = Math.max(0, Math.min(this.familyCap(card), Math.round(quantity)));
    if (target === prints.length) return;
    const key = printKey(card.reference);
    const pinned = (this.pins().get(key) ?? []).slice(0, target);
    const next = slotDefaults(choice, [...pinned, ...Array<null>(target - pinned.length).fill(null)]);
    const delta = target > prints.length ? 1 : -1;
    const was = counts(prints);
    const now = counts(next);
    const grew = (r: string) => (now.get(r) ?? 0) > (was.get(r) ?? 0);
    const shrank = (r: string) => (now.get(r) ?? 0) < (was.get(r) ?? 0);
    const reference = (delta > 0 ? [...now.keys()].find(grew) : [...was.keys()].find(shrank)) ?? card.reference;
    this.lastChange.set({ card: printOf(card, reference), quantity: now.get(reference) ?? 0, delta });
    this.learn(card.reference);
    this.learn(basePrint(choice));
    this.setPinsOf(key, pinned);
    this.lines.set(withFamilyPrints(this.lines(), members, card, next));
    this.touch();
  }

  /**
   * The copies the deck does not pin show the player's preferences (`choices`: families by reference), the hero too
   * when it is not pinned. What is shown only: nothing is saved (the decks API keeps the canonical cards and the pins).
   */
  showPreferences(choices: Readonly<Record<string, AltArtChoice>>): void {
    for (const choice of new Set(Object.values(choices))) this.learn(basePrint(choice));
    const lines = linesWithPins(this.lines(), choices, this.pins());
    if (lines) this.lines.set(lines);
    const hero = this.hero();
    const heroChoice = hero ? choices[hero.reference] : undefined;
    if (!hero || !heroChoice || this.pinsOf(hero).length) return;
    const shown = defaultPrints(heroChoice, 1)[0];
    if (shown && shown !== hero.reference) this.hero.set({ ...hero, reference: shown });
  }

  /**
   * « Arts par défaut »: the deck pins no print anymore, every card (and the hero) follows the player's global
   * preferences. `false` when the deck pinned none.
   */
  clearPins(): boolean {
    if (!this.editable() || !this.pins().size) return false;
    this.pins.set(new Map());
    this.touch();
    return true;
  }

  /** The deck's print of a token family (`family`: its prints), `null` when the deck follows the player's preference. */
  tokenPrintOf(family: readonly string[]): string | null {
    return this.tokenPrints().find((t) => family.includes(t.reference))?.reference ?? null;
  }

  /** « Pour ce deck »: a token family takes `reference` in this deck (`null`: the player's preference again). */
  setTokenPrint(family: readonly string[], reference: string | null): void {
    if (!this.editable()) return;
    const others = this.tokenPrints().filter((t) => !family.includes(t.reference));
    this.tokenPrints.set(reference ? [...others, { reference, quantity: 1 }] : others);
    this.touch();
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
      if (before) this.setPinsOf(printKey(before.reference), []);
      this.hero.set(plainHero(hero));
      // A print picked with « Alt arts » is the deck's; otherwise the player's preference shows (`showPreferences`).
      for (const [key, prints] of heroPins(hero)) this.setPinsOf(key, prints);
      this.learn(hero.reference);
    }
    if (settings.format) this.format.set(settings.format);
    if (settings.isPublic !== undefined) this.isPublic.set(settings.isPublic);
    if (settings.name?.trim()) this.name.set(settings.name.trim());
    if (settings.description !== undefined) this.description.set(settings.description);
    this.touch();
  }

  /** A blank name is shown while typing but not saved. */
  rename(name: string): void {
    if (!this.editable()) return;
    this.name.set(name);
    if (name.trim()) this.touch();
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
      ...(this.owned() === true ? this.writeCards() : deckWriteCards(this.shownLines(), new Map(), this.canonical)),
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
   * does; `false` on a refusal, with the reason in `error`.
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
        this.queued.delete(id);
        this.clear();
        return true;
      }),
      catchError((err: unknown) => {
        this.actionError.set(apiErrorMessage(err, deleteErrorHead));
        return of(false);
      }),
    );
  }

  /**
   * Writes pending changes immediately (navigation away, tests). `keepalive` when the page is
   * being left: whatever is not saved yet (waiting, queued behind a running request, refused, or
   * sent by a plain request the browser would cancel) is sent again as a `keepalive` request,
   * which the browser completes after the page is gone.
   */
  flush(options: { keepalive?: boolean } = {}): void {
    const keepalive = !!options.keepalive;
    if (keepalive) {
      for (const [id, q] of [...this.queued]) {
        if (id === this.deckId()) continue;
        this.queued.delete(id);
        this.send(id, q.revision, q.payload, true);
      }
    }
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
      this.save(keepalive);
    } else if (keepalive && this.dirty()) {
      this.save(true);
    }
  }

  /**
   * The page is being unloaded: flushes with `keepalive`, then tells whether changes may still be
   * lost, so the browser asks before leaving: the last save failed (sending it again may fail too),
   * or the changes could not be sent at all.
   */
  leavePage(): boolean {
    const failed = !!this.saveError();
    this.flush({ keepalive: true });
    return failed || (this.dirty() && !this.saving());
  }

  /**
   * Writes the open deck now, without waiting for the save delay, and emits once: `true` when every change is saved,
   * `false` when the save fails (message in `saveError`). « Partager » and « Terminer » wait for it, so the shared link
   * and the deck page show the latest changes. A failed save is sent again.
   */
  saveNow(): Observable<boolean> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (this.dirty() || this.saveError()) this.save();
    const id = this.deckId();
    // Signed out meanwhile (session expired): the changes cannot be sent, say so instead of failing silently.
    if (this.dirty() && id && !GuestDeckService.isGuestId(id) && !this.auth.isLoggedIn()) this.saveError.set(saveErrorHead(401));
    const done = () => !this.saveTimer && this.inFlight === null;
    const saved = () => !this.saveError() && !this.dirty();
    if (done()) return of(saved());
    return this.settled.pipe(filter(done), take(1), map(saved));
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
      ...this.writeCards(),
    };
    this.saveError.set(null);
    this.saving.set(true);
    return this.decksApi.create(body).pipe(
      map((created) => {
        this.saving.set(false);
        // As « Enregistrer sur mon compte » on the decks page: the site builder's copy goes too, or it comes back.
        this.guests.forgetSiteDeck(id);
        this.guests.delete(id);
        this.createdIds.update((ids) => new Set([...ids, created.id]));
        // A change made during the request would be written to the deleted guest deck.
        if (this.saveTimer) clearTimeout(this.saveTimer);
        this.saveTimer = null;
        this.dirty.set(false);
        this.serverId.set(null);
        this.apply({ ...created, hero: created.hero ?? this.hero(), deckCards: created.deckCards ?? lines, guest: false });
        return created.id;
      }),
      catchError((err: unknown) => {
        this.saving.set(false);
        this.saveError.set(apiErrorMessage(err, moveErrorHead));
        return of(null);
      }),
    );
  }

  /** Sends the deck again after a failed save (« Réessayer »). */
  retrySave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = null;
    this.save();
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
    this.pins.set(new Map());
    this.tokenPrints.set([]);
    this.canonical = new Map();
    this.dirty.set(false);
    this.saveError.set(null);
    this.saved.set(false);
    this.actionError.set(null);
    this.isGuest.set(true);
  }

  /** Forgets the deck and cancels any pending fetch. */
  clear(): void {
    this.serverId.set(null);
    this.reset();
  }

  private touch(): void {
    this.revision++;
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

  /** The prints shown, hero first. */
  private shownLines(): { reference: string; quantity: number }[] {
    const hero = this.hero();
    return [...(hero ? [{ reference: hero.reference, quantity: 1 }] : []), ...this.lines().map((l) => ({ reference: l.card.reference, quantity: l.quantity }))];
  }

  /** `deckCards` (canonical references) and `altArtOverrides` (the pins, the token prints) as written. */
  private writeCards(): Pick<DeckWrite, 'deckCards' | 'altArtOverrides'> {
    return deckWriteCards(this.shownLines(), this.pins(), this.canonical, this.tokenPrints());
  }

  private save(keepalive = false): void {
    const id = this.deckId();
    if (!id) return;
    if (GuestDeckService.isGuestId(id)) {
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
      this.dirty.set(false);
      this.saved.set(true);
      // Written on this device: a refused move to the account (`moveToAccount`) is no longer the last word.
      this.saveError.set(null);
      return;
    }
    if (!this.auth.isLoggedIn()) return;
    const revision = this.revision;
    if (keepalive && this.inFlight === revision && this.inFlightKeepalive) return;
    const payload = this.payload();
    if (this.inFlight !== null && !keepalive) {
      // One request at a time, so an older state never lands after a newer one.
      this.queued.set(id, { revision, payload });
      return;
    }
    // This request carries the newest state of the deck.
    this.queued.delete(id);
    this.send(id, revision, payload, keepalive);
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
      ...this.writeCards(),
    };
  }

  private send(id: string, revision: number, payload: Partial<DeckWrite>, keepalive: boolean): void {
    this.inFlight = revision;
    this.inFlightKeepalive = keepalive;
    this.saving.set(true);
    if (this.deckId() === id) this.saveError.set(null);
    this.decksApi.patch(id, payload, { keepalive }).subscribe({
      next: (saved) => {
        const overtaken = this.acked?.id === id && this.acked.revision > revision;
        if (!overtaken) this.acked = { id, revision };
        if (this.settle(id, revision)) {
          if (overtaken) {
            // A newer save answered first: this older state may have been written last.
            this.queued.set(id, { revision: this.revision, payload: this.payload() });
          } else {
            this.saved.set(true);
            if (saved) {
              for (const [key, ref] of canonicalFromAnswer(saved)) this.canonical.set(key, ref);
              // The verdict on what was sent: the newest the API gave, until the next answer.
              this.apiLegality.set(legalityFromApi(saved));
            }
            if (revision === this.revision) this.dirty.set(false);
          }
        }
        // Also when the deck was left meanwhile: a queued save may be another deck's.
        this.sendQueued();
        this.settled.next();
      },
      error: (err: unknown) => {
        if (this.settle(id, revision)) {
          // Changes made meanwhile stay dirty: they go with « Réessayer » or the next change.
          this.queued.delete(id);
          this.saveError.set(apiErrorMessage(err, saveErrorHead));
        }
        this.sendQueued();
        this.settled.next();
      },
    });
  }

  /**
   * Sends a save that waited for the running request, once none runs: the open deck's current
   * state (unless a change is about to be saved anyway), or the payload queued for a deck left since.
   */
  private sendQueued(): void {
    if (this.inFlight !== null) return;
    const next = this.queued.entries().next();
    if (next.done) return;
    const [id, q] = next.value;
    this.queued.delete(id);
    if (id !== this.deckId()) this.send(id, q.revision, q.payload, false);
    else if (!this.saveTimer) this.save();
    else this.sendQueued();
  }

  /** Ends the running request; `false` when the deck was left meanwhile (its answer is ignored). */
  private settle(id: string, revision: number): boolean {
    if (this.inFlight === revision) {
      this.inFlight = null;
      this.saving.set(false);
    }
    return this.deckId() === id;
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
    const prints = readDeckPrints(deck, hero?.reference);
    this.pins.set(prints.pins);
    this.canonical = prints.canonical;
    this.tokenPrints.set(prints.tokens);
    this.dirty.set(false);
    this.saveError.set(null);
    this.saved.set(false);
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

function heroLine(hero: DeckHero) {
  return {
    cardReference: hero.reference,
    quantity: 1,
    name: hero.name,
    factionCode: hero.faction,
    cardTypeReference: 'HERO',
  };
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

/** The hero as the deck stores it (without how it was picked). */
function plainHero(hero: DeckHero): DeckHero {
  return { reference: hero.reference, name: hero.name, faction: hero.faction };
}

/** The hero's pin: the print picked with « Alt arts » when it is not the canonical one; none for its preference. */
function heroPins(hero: DeckHero): Map<string, string[]> {
  return !hero.defaultArt && isPinnedPrint(hero.reference) ? new Map([[printKey(hero.reference), [hero.reference]]]) : new Map();
}

/** `card` as another print of the same card (`reference`). */
function printOf(card: Card, reference: string): Card {
  return reference === card.reference ? card : { ...card, reference, imagePath: undefined };
}
