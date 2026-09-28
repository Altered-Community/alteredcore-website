import { Injectable, computed, signal } from '@angular/core';
import type { Deck, DeckCardLine, DeckFormat, DeckHero } from './models';

export const GUEST_DECKS_KEY = 'arb.guest-decks';

export interface GuestDeckInput {
  name?: string;
  format?: DeckFormat;
  isPublic?: boolean;
  hero?: DeckHero | null;
  deckCards?: DeckCardLine[];
}

/** Logged-out decks, persisted in localStorage (same idea as the PHP site's guest mode). */
@Injectable({ providedIn: 'root' })
export class GuestDeckService {
  private readonly decksSig = signal<Deck[]>(this.read());
  readonly decks = computed(() => this.decksSig());

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
      name: partial.name || 'Nouveau deck',
      description: '',
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

  /** Re-reads storage (another tab, tests). */
  reload(): void {
    this.decksSig.set(this.read());
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
