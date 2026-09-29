import { Service, computed, effect, inject, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, Subscription, of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AuthSession } from './auth-session';
import { CardsApiService } from './cards-api.service';
import { DeckCreateFailurePrompt } from './deck-create-failure';
import { legalityFromApi, legalityFromStatus, type DeckLegality } from './deck-legality';
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
 * with a token, changes are PATCHed to decks.alteredcore.org.
 */
@Service()
export class DeckStore {
  private readonly decksApi = inject(DecksApiService);
  private readonly cardsApi = inject(CardsApiService);
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
    stream: ({ params: id }) => this.decksApi.get(id, contentLocale()),
  });

  readonly loading = computed(() => this.serverDeck.isLoading());
  /** A save request to the decks API is running. */
  readonly saving = signal(false);
  /** Why the deck could not be opened (or deleted); a failed save goes to `saveError` instead. */
  readonly error = signal<string | null>(null);
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
  readonly createdAt = signal<string | null>(null);
  readonly isGuest = signal(true);
  /** Non-hero lines. */
  readonly lines = signal<HydratedLine[]>([]);

  readonly status = computed<DeckStatus>(() => computeDeckStatus(this.lines(), this.format(), this.hero()));
  /** `legal` / `legalityDetail` / `formatErrors` of the decks API, until the deck is changed here. */
  private readonly apiLegality = signal<DeckLegality | null>(null);
  /** The decks API's verdict for a server deck; the editor's own checks for a guest or edited deck. */
  readonly legality = computed<DeckLegality>(() => this.apiLegality() ?? legalityFromStatus(this.status(), !!this.hero()));
  readonly groups = computed(() => groupLines(this.lines()));
  readonly stats = computed(() => deckStats(this.lines()));
  readonly total = computed(() => this.status().total);
  readonly distinct = computed(() => this.lines().filter((l) => l.quantity > 0).length);
  readonly quantities = computed(() => new Map(this.lines().map((l) => [l.card.reference, l.quantity])));
  /**
   * Account decks of the signed-in user, to tell whether the open deck is theirs: the decks API
   * does not say who owns a deck (`user` is `[]`), but `GET /api/decks` only lists the caller's.
   * Refetched when the open server deck or the account changes.
   */
  private readonly mineIds = rxResource({
    params: () => {
      const id = this.deckId();
      return id && !this.isGuest() && this.auth.isLoggedIn() ? { id, user: this.auth.username(), token: this.auth.token() } : undefined;
    },
    stream: () =>
      this.decksApi.listMine(1, 1000).pipe(map((body) => new Set((Array.isArray(body) ? body : (body.member ?? [])).map((d) => d.id)))),
  });
  /** Decks created on the account from this tab: theirs before the account list is refetched. */
  private readonly createdIds = signal<ReadonlySet<string>>(new Set());
  /** The open deck belongs to the user: `true` for guest decks, `null` while the account list loads. */
  readonly owned = computed<boolean | null>(() => {
    if (this.isGuest()) return true;
    const id = this.deckId();
    if (!id || !this.auth.isLoggedIn()) return false;
    if (this.createdIds().has(id)) return true;
    if (this.mineIds.error()) return false;
    return this.mineIds.hasValue() ? this.mineIds.value().has(id) : null;
  });
  readonly editable = computed(() => this.owned() === true);

  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  /** Bumped by each change; a save only marks the deck clean when no change came after what it sent. */
  private revision = 0;
  /** Revision carried by the running request, `null` when none runs. */
  private inFlight: number | null = null;
  /** The running request is a `keepalive` one (it survives the page). */
  private inFlightKeepalive = false;
  /** A change was saved while a request was running: send again once it answers. */
  private saveQueued = false;

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

  maxFor(card: Card): number {
    return maxCopiesFor(card, this.format());
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
    if (!this.auth.isLoggedIn()) return of(this.create(input));
    const description = input.description?.trim() ?? '';
    const body: DeckWrite = {
      name: input.name.trim() || $localize`:@@core.deck.defaultName:Nouveau deck`,
      format: input.format,
      isPublic: input.isPublic,
      // Hero only: a draft until the deck is legal, as the site's builder does on save.
      isDraft: legalityFromStatus(computeDeckStatus([], input.format), true).state !== 'legal',
      ...(description ? { description } : {}),
      deckCards: [{ cardReference: input.hero.reference, quantity: 1 }],
    };
    this.saving.set(true);
    return this.decksApi.create(body).pipe(
      map((created) => {
        this.saving.set(false);
        const deck: Deck = { ...created, hero: created.hero ?? input.hero, deckCards: created.deckCards ?? [heroLine(input.hero)], guest: false };
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

  /** A blank `name` keeps the current one. */
  updateSettings(settings: { hero?: DeckHero; format?: DeckFormat; isPublic?: boolean; name?: string; description?: string }): void {
    if (settings.hero) this.hero.set(settings.hero);
    if (settings.format) this.format.set(settings.format);
    if (settings.isPublic !== undefined) this.isPublic.set(settings.isPublic);
    if (settings.name?.trim()) this.name.set(settings.name.trim());
    if (settings.description !== undefined) this.description.set(settings.description);
    this.touch();
  }

  rename(name: string): void {
    this.name.set(name);
    this.touch();
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
    const body: DeckWrite = {
      name: deckName,
      format: this.format(),
      isPublic: false,
      isDraft: this.isDraft() ?? this.format() === 'sandbox',
      ...(description ? { description } : {}),
      deckCards: this.serializeLines().map((l) => ({ cardReference: l.cardReference, quantity: l.quantity })),
    };
    return this.decksApi.create(body).pipe(
      map((created) => {
        this.createdIds.update((ids) => new Set([...ids, created.id]));
        return created.id;
      }),
      catchError((err: unknown) => throwError(() => new Error(apiErrorMessage(err, duplicateErrorHead)))),
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
    return this.decksApi.delete(id).pipe(
      map(() => {
        this.clear();
        return true;
      }),
      catchError(() => {
        this.error.set($localize`:@@core.deckStore.deleteRefused:Suppression refusée : connexion requise.`);
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
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
      this.save(keepalive);
    } else if (keepalive && this.dirty()) {
      this.saveQueued = false;
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
    this.lines.set([]);
    this.dirty.set(false);
    this.saveError.set(null);
    this.saved.set(false);
    this.saveQueued = false;
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
    this.apiLegality.set(null);
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
        legal: this.status().legal && !!this.hero(),
        deckCards: this.serializeLines(),
        guest: true,
      });
      this.dirty.set(false);
      this.saved.set(true);
      return;
    }
    if (!this.auth.isLoggedIn()) return;
    const revision = this.revision;
    if (this.inFlight !== null && !keepalive) {
      // One request at a time, so an older state never lands after a newer one.
      this.saveQueued = true;
      return;
    }
    if (keepalive && this.inFlight === revision && this.inFlightKeepalive) return;
    // As the site's builder: a deck is saved as a draft while it is not legal.
    const isDraft = this.legality().state !== 'legal';
    const payload: Partial<DeckWrite> = {
      name: this.name(),
      description: this.description().trim(),
      format: this.format(),
      isPublic: this.isPublic(),
      isDraft,
      deckCards: this.serializeLines().map((l) => ({ cardReference: l.cardReference, quantity: l.quantity })),
    };
    this.inFlight = revision;
    this.inFlightKeepalive = keepalive;
    this.saving.set(true);
    this.saveError.set(null);
    this.decksApi.patch(id, payload, { keepalive }).subscribe({
      next: (saved) => {
        if (!this.settle(id, revision)) return;
        this.isDraft.set(isDraft);
        this.saved.set(true);
        if (revision === this.revision) {
          this.dirty.set(false);
          if (!this.saveTimer) this.apiLegality.set(saved ? legalityFromApi(saved) : null);
        }
        if (this.saveQueued) {
          this.saveQueued = false;
          if (!this.saveTimer) this.save();
        }
      },
      error: (err: unknown) => {
        if (!this.settle(id, revision)) return;
        // Changes made meanwhile stay dirty: they go with « Réessayer » or the next change.
        this.saveQueued = false;
        this.saveError.set(apiErrorMessage(err, saveErrorHead));
      },
    });
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
    const hero = heroOf(deck);
    this.deckId.set(deck.id);
    this.name.set(deck.name || $localize`:@@core.deck.untitled:Sans nom`);
    this.description.set(deck.description ?? '');
    this.isDraft.set(typeof deck.isDraft === 'boolean' ? deck.isDraft : null);
    this.format.set((deck.format as DeckFormat) || 'standard');
    this.isPublic.set(!!deck.isPublic);
    this.hero.set(hero);
    this.createdAt.set(deck.createdAt ?? deck.updatedAt ?? null);
    this.isGuest.set(!!deck.guest || GuestDeckService.isGuestId(deck.id));
    this.apiLegality.set(this.isGuest() ? null : legalityFromApi(deck));
    this.lines.set(
      deckLines(deck)
        .filter((l) => !isHeroLine(l, hero))
        .map((l) => ({ card: lineToCard(l), quantity: l.quantity })),
    );
    this.dirty.set(false);
    this.saveError.set(null);
    this.saved.set(false);
    this.saveQueued = false;
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
