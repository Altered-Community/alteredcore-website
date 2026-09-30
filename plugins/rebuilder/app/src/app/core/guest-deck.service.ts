import { Service, computed, signal } from '@angular/core';
import { contentLocale } from './locale';
import type { Deck, DeckCardLine, DeckFormat, DeckHero } from './models';

export const GUEST_DECKS_KEY = 'arb.guest-decks';
/** The guest deck of the site's deck builder (core-altered-cards `assets/deckbuilder/save.js`). */
export const SITE_GUEST_DECK_KEY = 'alteredcore_guest_deck';
/** `{ id, raw }`: the guest deck made from the site's one, and the site's JSON it was made from. */
export const SITE_GUEST_IMPORT_KEY = 'arb.site-guest-deck';

/** The site builder's guest deck: `cards` keyed by reference, lines with `qty`, `type`, costs and powers. */
interface SiteGuestDeck {
  name?: string;
  format?: string;
  hero?: { cardReference?: string; name?: string | Record<string, string>; factionCode?: string } | null;
  cards?: Record<string, { qty?: number; name?: string | Record<string, string>; type?: string; factionCode?: string | null; mainCost?: number; recallCost?: number; forestPower?: number; mountainPower?: number; oceanPower?: number; isBanned?: boolean; isSuspended?: boolean }>;
}

const FORMATS: readonly DeckFormat[] = ['standard', 'frontier', 'nuc', 'singleton', 'singleton_nuc', 'sandbox'];

/** A guest deck of the site's builder as a Re:Builder guest deck; `null` when it has no hero and no card. */
export function fromSiteGuestDeck(raw: SiteGuestDeck, lang: string): GuestDeckInput | null {
  const text = (v: string | Record<string, string> | undefined, fallback: string) =>
    typeof v === 'string' ? v || fallback : v?.[lang] || v?.['en'] || fallback;
  const cards = Object.entries(raw.cards ?? {}).filter(([, c]) => (c?.qty ?? 0) > 0);
  const heroRef = raw.hero?.cardReference;
  if (!heroRef && !cards.length) return null;
  const format = FORMATS.find((f) => f === (raw.format ?? '').toLowerCase()) ?? 'standard';
  return {
    name: raw.name?.trim() || undefined,
    format,
    hero: heroRef
      ? { reference: heroRef, name: text(raw.hero?.name, heroRef), faction: raw.hero?.factionCode || (/^ALT_[^_]+_[^_]+_([A-Z]{2})_/.exec(heroRef)?.[1] ?? '') }
      : null,
    deckCards: cards.map(([ref, c]) => ({
      cardReference: ref,
      quantity: c.qty ?? 0,
      name: text(c.name, ref),
      factionCode: c.factionCode ?? null,
      cardTypeReference: c.type ?? null,
      mainCost: c.mainCost ?? null,
      recallCost: c.recallCost ?? null,
      forestPower: c.forestPower ?? null,
      mountainPower: c.mountainPower ?? null,
      oceanPower: c.oceanPower ?? null,
      ...(c.isBanned ? { isBanned: true } : {}),
      ...(c.isSuspended ? { isSuspended: true } : {}),
    })),
  };
}

export interface GuestDeckInput {
  name?: string;
  description?: string;
  format?: DeckFormat;
  isPublic?: boolean;
  hero?: DeckHero | null;
  deckCards?: DeckCardLine[];
}

/**
 * Logged-out decks, persisted in localStorage (same idea as the PHP site's guest mode). The guest deck of the site's
 * builder joins them (and follows its changes), so a deck started there is found here.
 */
@Service()
export class GuestDeckService {
  private readonly decksSig = signal<Deck[]>(this.read());
  readonly decks = computed(() => this.decksSig());

  constructor() {
    this.syncSiteDeck();
  }

  static isGuestId(id: string | null | undefined): boolean {
    return !!id && id.startsWith('guest-');
  }

  get(id: string): Deck | undefined {
    return this.decksSig().find((d) => d.id === id);
  }

  create(partial: GuestDeckInput = {}): Deck {
    const now = new Date().toISOString();
    const deck: Deck = {
      id: `guest-${newId()}`,
      name: partial.name || $localize`:@@core.deck.defaultName:Nouveau deck`,
      description: partial.description ?? '',
      format: partial.format ?? 'standard',
      isPublic: partial.isPublic ?? false,
      isDraft: true,
      guest: true,
      hero: partial.hero ?? null,
      deckCards: partial.deckCards ?? [],
      createdAt: now,
      updatedAt: now,
    };
    this.decksSig.update((list) => [deck, ...list]);
    this.persist();
    return deck;
  }

  save(deck: Deck): Deck {
    const next = { ...deck, guest: true, updatedAt: new Date().toISOString() };
    this.decksSig.update((list) => {
      const i = list.findIndex((d) => d.id === deck.id);
      if (i === -1) return [next, ...list];
      const copy = list.slice();
      copy[i] = next;
      return copy;
    });
    this.persist();
    return next;
  }

  delete(id: string): void {
    this.decksSig.update((list) => list.filter((d) => d.id !== id));
    this.persist();
  }

  /** Re-reads storage (another tab, the site's builder, tests). */
  reload(): void {
    this.decksSig.set(this.read());
    this.syncSiteDeck();
  }

  /** The deck is now on the account: the site's builder stops offering its guest copy (as the site's decks page does). */
  forgetSiteDeck(id: string): void {
    if (typeof localStorage === 'undefined' || this.siteImport()?.id !== id) return;
    localStorage.removeItem(SITE_GUEST_DECK_KEY);
    localStorage.removeItem(SITE_GUEST_IMPORT_KEY);
  }

  /** Makes (or updates) the guest deck of the site's builder, when its JSON changed since the last time. */
  private syncSiteDeck(): void {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(SITE_GUEST_DECK_KEY);
    const done = this.siteImport();
    if (!raw || done?.raw === raw) return;
    let input: GuestDeckInput | null;
    try {
      input = fromSiteGuestDeck(JSON.parse(raw) as SiteGuestDeck, contentLocale());
    } catch {
      input = null;
    }
    if (!input) return;
    const previous = done ? this.get(done.id) : undefined;
    const deck = previous ? this.save({ ...previous, ...input, name: input.name || previous.name }) : this.create(input);
    localStorage.setItem(SITE_GUEST_IMPORT_KEY, JSON.stringify({ id: deck.id, raw }));
  }

  private siteImport(): { id: string; raw: string } | null {
    try {
      const v = JSON.parse(localStorage.getItem(SITE_GUEST_IMPORT_KEY) ?? 'null') as { id?: unknown; raw?: unknown } | null;
      return v && typeof v.id === 'string' && typeof v.raw === 'string' ? { id: v.id, raw: v.raw } : null;
    } catch {
      return null;
    }
  }

  private read(): Deck[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(GUEST_DECKS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Deck[];
      return Array.isArray(parsed) ? parsed.filter((d) => d && typeof d.id === 'string') : [];
    } catch {
      return [];
    }
  }

  private persist(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(GUEST_DECKS_KEY, JSON.stringify(this.decksSig()));
  }
}

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
