import { Routes } from '@angular/router';

const editor = () => import('./features/editor/editor-page/editor.page').then((m) => m.EditorPage);
const deck = () => import('./features/deck/deck-page/deck.page').then((m) => m.DeckPage);

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'decks' },
  {
    path: 'cartes',
    title: 'Cartes — Altered Re:Builder',
    loadComponent: () => import('./features/cards/cards-page/cards.page').then((m) => m.CardsPage),
  },
  {
    path: 'decks',
    title: 'Decks — Altered Re:Builder',
    loadComponent: () => import('./features/decks/decks-page/decks.page').then((m) => m.DecksPage),
  },
  {
    path: 'decks/new',
    title: 'Nouveau deck — Altered Re:Builder',
    loadComponent: () => import('./features/decks/new-deck-page/new-deck.page').then((m) => m.NewDeckPage),
  },
  { path: 'decks/:id/edit', title: 'Modifier le deck', loadComponent: editor, data: { view: 'search' } },
  { path: 'decks/:id/edit/apercu', title: 'Aperçu du deck', loadComponent: editor, data: { view: 'apercu' } },
  { path: 'decks/:id/edit/deck', title: 'Mon deck', loadComponent: editor, data: { view: 'deck' } },
  { path: 'decks/:id/deck', title: 'Deck — Decklist', loadComponent: deck, data: { tab: 'decklist' } },
  { path: 'decks/:id/cartes', redirectTo: ({ params }) => `/decks/${params['id']}` },
  { path: 'decks/:id', title: 'Deck — Aperçu', loadComponent: deck, data: { tab: 'cartes' } },
  { path: '**', redirectTo: 'decks' },
];
