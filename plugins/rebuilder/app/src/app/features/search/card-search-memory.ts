import { Service } from '@angular/core';
import { defaultEnvironment, type CardSource, type SearchFilters } from '../../core/card-filters';
import type { DeckFormat } from '../../core/models';

/** The editor's search of one deck: the last tab, and the filters of each tab. */
interface RememberedSearch {
  source: CardSource;
  tabs: Partial<Record<CardSource, { filters: SearchFilters; format: DeckFormat | null }>>;
}

const KEY_PREFIX = 'rebuilder.search.';

/**
 * Remembers the editor's card search per deck, so that leaving the search (« Aperçu », « Deck », « Main ») or another
 * tab (Favoris, Toutes les cartes…) and coming back finds the same tab and filters. Kept in `sessionStorage` (this
 * browser tab, survives a reload), in memory when storage is blocked.
 */
@Service()
export class CardSearchMemory {
  private readonly fallback = new Map<string, RememberedSearch>();

  /** The tab last used on this deck, `null` when the deck's search was never used. */
  source(deck: string): CardSource | null {
    return this.read(deck)?.source ?? null;
  }

  /**
   * The filters last used on this tab of this deck. The deck's format changed since: the Uniques tab follows it for
   * Frontier, as `CardSearchStore.configure()` does while the search is open.
   */
  filters(deck: string, source: CardSource, format: DeckFormat | null): SearchFilters | undefined {
    const tab = this.read(deck)?.tabs[source];
    if (!tab) return undefined;
    return tab.format !== format && source === 'uniques' ? { ...tab.filters, environment: defaultEnvironment(source, format) } : tab.filters;
  }

  save(deck: string, source: CardSource, filters: SearchFilters, format: DeckFormat | null): void {
    const prev = this.read(deck);
    const next: RememberedSearch = { source, tabs: { ...prev?.tabs, [source]: { filters, format } } };
    this.fallback.set(deck, next);
    try {
      sessionStorage.setItem(KEY_PREFIX + deck, JSON.stringify(next));
    } catch {
      // Storage full or blocked: remembered in memory for this visit.
    }
  }

  private read(deck: string): RememberedSearch | undefined {
    try {
      const raw = sessionStorage.getItem(KEY_PREFIX + deck);
      if (raw) return JSON.parse(raw) as RememberedSearch;
    } catch {
      // Blocked or unreadable: the copy in memory.
    }
    return this.fallback.get(deck);
  }
}
