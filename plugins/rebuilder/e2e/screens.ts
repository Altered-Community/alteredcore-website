// Re:Builder screens for the loading checks (loading.spec.ts) and tests/e2e/loading-timeline.ts (Node runs this file
// with type stripping: type-only imports, explicit extensions). `path` takes the id of a deck of the signed-in account.
export interface Screen {
  key: string;
  name: string;
  path: (deckId: string) => string;
  /** Needs a deck of the signed-in account (`deckId`). */
  deck: boolean;
}

export const SCREENS: Screen[] = [
  { key: 'decks', name: 'Mes decks', path: () => '/pages/decks', deck: false },
  { key: 'deck', name: 'deck page', path: (id) => `/pages/deck?id=${id}`, deck: true },
  { key: 'search', name: 'editor, Recherche', path: (id) => `/pages/deckbuilder?id=${id}`, deck: true },
  { key: 'apercu', name: 'editor, Aperçu', path: (id) => `/pages/deckbuilder?id=${id}&view=apercu`, deck: true },
  { key: 'mon-deck', name: 'editor, Mon deck', path: (id) => `/pages/deckbuilder?id=${id}&view=deck`, deck: true },
  { key: 'main', name: 'editor, Main', path: (id) => `/pages/deckbuilder?id=${id}&view=main`, deck: true },
  { key: 'new', name: 'new deck', path: () => '/pages/deckbuilder', deck: false },
];

/** The skeleton of a title replaces these texts: they must never show. */
export const FORBIDDEN_TEXTS = [{ selector: 'ac-app-bar', text: 'Chargement' }];
