import { inject } from '@angular/core';
import type { CanActivateFn, Routes } from '@angular/router';
import { ALTERED_CORE } from './host';

const editor = () => import('../features/editor/editor-page/editor.page').then((m) => m.EditorPage);
const deck = () => import('../features/deck/deck-page/deck.page').then((m) => m.DeckPage);

/** Site menu entry of the decks pages (`/pages/decks`), relative to the base href: route data `nav`. */
const NAV_DECKS = 'decks';

const signIn: CanActivateFn = () => {
  inject(ALTERED_CORE).login();
  return false;
};

/**
 * Re:Builder's decks section. With « Beta Deckbuilder » on, the shell serves it on the site's decks pages, base href
 * `/pages/`: its page URLs are the site's (`decks`, `deck?id=…`, `deckbuilder?id=…`, see LegacyUrlSerializer), the
 * routes below stay `decks/:id/…`.
 */
export const embedRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'decks' },
  {
    path: 'decks',
    title: $localize`:@@title.decks:Decks`,
    data: { nav: NAV_DECKS },
    loadComponent: () => import('../features/decks/decks-page/decks.page').then((m) => m.DecksPage),
  },
  {
    path: 'decks/new',
    title: $localize`:@@title.newDeck:Nouveau deck`,
    data: { nav: NAV_DECKS },
    loadComponent: () => import('../features/decks/new-deck-page/new-deck.page').then((m) => m.NewDeckPage),
  },
  { path: 'decks/:id/edit', title: $localize`:@@title.editor:Modifier le deck`, loadComponent: editor, data: { view: 'search', nav: NAV_DECKS } },
  { path: 'decks/:id/edit/apercu', title: $localize`:@@title.preview:Aperçu du deck`, loadComponent: editor, data: { view: 'apercu', nav: NAV_DECKS } },
  { path: 'decks/:id/edit/deck', title: $localize`:@@title.myDeck:Mon deck`, loadComponent: editor, data: { view: 'deck', nav: NAV_DECKS } },
  { path: 'decks/:id/edit/main', title: $localize`:@@title.editorHand:Main de départ`, loadComponent: editor, data: { view: 'main', nav: NAV_DECKS } },
  { path: 'decks/:id/deck', title: $localize`:@@title.decklist:Deck — Decklist`, loadComponent: deck, data: { tab: 'decklist', nav: NAV_DECKS } },
  { path: 'decks/:id/description', title: $localize`:@@title.deckDescription:Deck — Description`, loadComponent: deck, data: { tab: 'description', nav: NAV_DECKS } },
  { path: 'decks/:id/main', title: $localize`:@@title.deckHand:Deck — Main de départ`, loadComponent: deck, data: { tab: 'main', nav: NAV_DECKS } },
  { path: 'decks/:id/cartes', redirectTo: ({ params }) => `/decks/${params['id']}` },
  { path: 'decks/:id', title: $localize`:@@title.deck:Deck`, loadComponent: deck, data: { tab: 'cartes', nav: NAV_DECKS } },
  { path: 'login', canActivate: [signIn], children: [] },
  { path: '**', redirectTo: 'decks' },
];
