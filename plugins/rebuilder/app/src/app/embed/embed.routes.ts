import { inject } from '@angular/core';
import { Router, type ActivatedRouteSnapshot, type CanActivateFn, type Routes } from '@angular/router';
import { t } from '../core/i18n';
import { ALTERED_CORE } from './host';

const editor = () => import('../features/editor/editor-page/editor.page').then((m) => m.EditorPage);

/** Screens that belong to the site, not to the embedded editor: leave the SPA for the site page. */
function leaveTo(path: (route: ActivatedRouteSnapshot) => string): CanActivateFn {
  return (route) => {
    const host = inject(ALTERED_CORE);
    location.assign(host.baseUrl + path(route));
    return false;
  };
}

const signIn: CanActivateFn = () => {
  inject(ALTERED_CORE).login();
  return false;
};

/**
 * Only the editor is embedded (new deck, edit, preview, deck list on mobile). Paths stay the
 * standalone ones so the shared screens navigate unchanged; the base href is the site page
 * (`/pages/deckbuilder/`). `?id=` is the old deckbuilder's link format, still used by the site.
 */
export const embedRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: ({ queryParams }) => {
      const id = queryParams['id'];
      return inject(Router).parseUrl(typeof id === 'string' && id ? `/decks/${encodeURIComponent(id)}/edit` : '/decks/new');
    },
  },
  {
    path: 'decks/new',
    title: t('title.newDeck'),
    loadComponent: () => import('../features/decks/new-deck-page/new-deck.page').then((m) => m.NewDeckPage),
  },
  { path: 'decks/:id/edit', title: t('title.editor'), loadComponent: editor, data: { view: 'search' } },
  { path: 'decks/:id/edit/apercu', title: t('title.preview'), loadComponent: editor, data: { view: 'apercu' } },
  { path: 'decks/:id/edit/deck', title: t('title.myDeck'), loadComponent: editor, data: { view: 'deck' } },
  { path: 'decks/:id', canActivate: [leaveTo((r) => `/pages/deck?id=${encodeURIComponent(r.params['id'])}`)], children: [] },
  { path: 'decks/:id/deck', canActivate: [leaveTo((r) => `/pages/deck?id=${encodeURIComponent(r.params['id'])}`)], children: [] },
  { path: 'decks', canActivate: [leaveTo(() => '/pages/decks')], children: [] },
  { path: 'login', canActivate: [signIn], children: [] },
  { path: '**', redirectTo: '' },
];
