import { inject } from '@angular/core';
import { Router, type CanActivateFn, type Routes } from '@angular/router';
import { t } from '../core/i18n';
import { ALTERED_CORE } from './host';

const editor = () => import('../features/editor/editor-page/editor.page').then((m) => m.EditorPage);
const deck = () => import('../features/deck/deck-page/deck.page').then((m) => m.DeckPage);

/** Site menu entries of the plugin (plugin.json "menu"), relative to the base href: route data `nav`. */
const NAV_DECKS = 'decks';
const NAV_BUILDER = 'decks/new';

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
    data: { nav: NAV_DECKS },
    loadComponent: () => import('../features/decks/decks-page/decks.page').then((m) => m.DecksPage),
  },
  {
    path: 'decks/new',
    title: t('title.newDeck'),
    data: { nav: NAV_BUILDER },
    loadComponent: () => import('../features/decks/new-deck-page/new-deck.page').then((m) => m.NewDeckPage),
  },
  { path: 'decks/:id/edit', title: t('title.editor'), loadComponent: editor, data: { view: 'search', nav: NAV_BUILDER } },
  { path: 'decks/:id/edit/apercu', title: t('title.preview'), loadComponent: editor, data: { view: 'apercu', nav: NAV_BUILDER } },
  { path: 'decks/:id/edit/deck', title: t('title.myDeck'), loadComponent: editor, data: { view: 'deck', nav: NAV_BUILDER } },
  { path: 'decks/:id/deck', title: t('title.decklist'), loadComponent: deck, data: { tab: 'decklist', nav: NAV_DECKS } },
  { path: 'decks/:id/cartes', redirectTo: ({ params }) => `/decks/${params['id']}` },
  { path: 'decks/:id', title: t('title.deck'), loadComponent: deck, data: { tab: 'cartes', nav: NAV_DECKS } },
  { path: 'login', canActivate: [signIn], children: [] },
  { path: '**', redirectTo: 'decks' },
];
