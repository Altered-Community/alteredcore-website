import { inject } from '@angular/core';
import { Router, type CanActivateFn, type Routes } from '@angular/router';
import { t } from '../core/i18n';
import { ALTERED_CORE } from './host';

const editor = () => import('../features/editor/editor-page/editor.page').then((m) => m.EditorPage);
const deck = () => import('../features/deck/deck-page/deck.page').then((m) => m.DeckPage);

const signIn: CanActivateFn = () => {
  inject(ALTERED_CORE).login();
  return false;
};

/**
 * Re:Builder's decks section on the site page `/pages/rebuilder/` (the base href): decks list
 * (mine / community), deck page, new deck and editor. Paths are the standalone app's, so the
 * shared screens navigate unchanged. The site's own decks pages and deck builder stay as they are.
 * `?id=` opens a deck in the editor, like the site's deck builder links.
 */
export const embedRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: ({ queryParams }) => {
      const id = queryParams['id'];
      return inject(Router).parseUrl(typeof id === 'string' && id ? `/decks/${encodeURIComponent(id)}/edit` : '/decks');
    },
  },
  {
    path: 'decks',
    title: t('title.decks'),
    loadComponent: () => import('../features/decks/decks-page/decks.page').then((m) => m.DecksPage),
  },
  {
    path: 'decks/new',
    title: t('title.newDeck'),
    loadComponent: () => import('../features/decks/new-deck-page/new-deck.page').then((m) => m.NewDeckPage),
  },
  { path: 'decks/:id/edit', title: t('title.editor'), loadComponent: editor, data: { view: 'search' } },
  { path: 'decks/:id/edit/apercu', title: t('title.preview'), loadComponent: editor, data: { view: 'apercu' } },
  { path: 'decks/:id/edit/deck', title: t('title.myDeck'), loadComponent: editor, data: { view: 'deck' } },
  { path: 'decks/:id/deck', title: t('title.decklist'), loadComponent: deck, data: { tab: 'decklist' } },
  { path: 'decks/:id/cartes', redirectTo: ({ params }) => `/decks/${params['id']}` },
  { path: 'decks/:id', title: t('title.deck'), loadComponent: deck, data: { tab: 'cartes' } },
  { path: 'login', canActivate: [signIn], children: [] },
  { path: '**', redirectTo: 'decks' },
];
