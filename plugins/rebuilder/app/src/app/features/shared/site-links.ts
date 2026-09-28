import { type ArNavLink } from '../../ui/nav';

/** Sections of the app, in the expanded app bar and the ☰ drawer. */
export function siteLinks(): ArNavLink[] {
  return [
    { label: 'Accueil', route: '/', exact: true },
    { label: 'Cartes', route: '/cartes' },
    { label: 'Decks', route: '/decks' },
  ];
}
