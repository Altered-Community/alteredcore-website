import type { Locale } from './models';

/**
 * Interface strings that follow the site language (EN/FR, `AlteredCore.lang`): the editor's main
 * labels and the page titles. The rest of the UI stays in French for now.
 */
const MESSAGES = {
  'title.newDeck': { fr: 'Nouveau deck', en: 'New deck' },
  'title.editor': { fr: 'Modifier le deck', en: 'Edit deck' },
  'title.preview': { fr: 'Aperçu du deck', en: 'Deck preview' },
  'title.myDeck': { fr: 'Mon deck', en: 'My deck' },
  'title.decks': { fr: 'Decks', en: 'Decks' },
  'title.deck': { fr: 'Deck', en: 'Deck' },
  'title.decklist': { fr: 'Deck — Decklist', en: 'Deck — Decklist' },
  'editor.myDecks': { fr: 'Mes decks', en: 'My decks' },
  'editor.edit': { fr: 'Modifier', en: 'Edit' },
  'editor.search': { fr: 'Recherche', en: 'Search' },
  'editor.viewDeck': { fr: 'Voir le deck', en: 'View deck' },
  'editor.preview': { fr: 'Aperçu', en: 'Preview' },
  'editor.deck': { fr: 'Deck', en: 'Deck' },
  'editor.displayMode': { fr: 'Mode d’affichage', en: 'Display mode' },
  'editor.backToDecks': { fr: 'Retour à mes decks', en: 'Back to my decks' },
  'editor.readonly': {
    fr: 'Ce deck appartient à un compte : il est en lecture seule sans connexion.',
    en: 'This deck belongs to an account: it is read-only until you sign in.',
  },
  'editor.duplicate': { fr: 'Dupliquer en local', en: 'Duplicate locally' },
  'editor.signIn': { fr: 'Se connecter', en: 'Sign in' },
  'editor.account': { fr: 'Compte', en: 'Account' },
  'newDeck.hero': { fr: 'Héros', en: 'Hero' },
  'newDeck.heroHint': { fr: 'Détermine la faction et les cartes disponibles', en: 'Sets the faction and the cards you can play' },
  'newDeck.name': { fr: 'Nom du deck', en: 'Deck name' },
  'newDeck.namePlaceholder': { fr: 'ex : Moyo Embrasement', en: 'e.g. Moyo Blaze' },
  'newDeck.visibility': { fr: 'Visibilité', en: 'Visibility' },
  'newDeck.private': { fr: 'Privé', en: 'Private' },
  'newDeck.public': { fr: 'Public', en: 'Public' },
  'newDeck.format': { fr: 'Format', en: 'Format' },
  'newDeck.cancel': { fr: 'Annuler', en: 'Cancel' },
  'newDeck.create': { fr: 'Créer le deck', en: 'Create deck' },
  'newDeck.pickHero': { fr: 'Choisissez un héros pour continuer.', en: 'Pick a hero to continue.' },
  'newDeck.selection': { fr: 'Sélection :', en: 'Selected:' },
  'panel.stats': { fr: 'Stats', en: 'Stats' },
  'panel.empty': { fr: 'Ajoutez des cartes depuis la recherche avec le bouton « + ».', en: 'Add cards from the search with the “+” button.' },
} satisfies Record<string, Record<Locale, string>>;

export type MessageKey = keyof typeof MESSAGES;

let current: Locale = 'fr';

export function t(key: MessageKey): string {
  return MESSAGES[key][current];
}

export function uiLocale(): Locale {
  return current;
}

/** Set once at startup, before the app modules load (`main.embed.ts`). */
export function setUiLocale(locale: Locale): void {
  current = locale;
}
