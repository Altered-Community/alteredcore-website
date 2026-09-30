# Parité avec le deckbuilder du site (core-altered-cards)

État au 2026-09-29, relevé sur `plugins/core-altered-cards` (pages `decks.php`, `deck.php`, `deckbuilder.php`, `assets/deckbuilder/*`,
`assets/card-search.js`, `assets/hand-tester.js`). Le plugin n'a pas encore la parité : les bases (héros, format, visibilité,
ajout/retrait, sauvegarde auto, Uniques, page deck, main de départ) y sont, les fonctions « avancées » du site non.

Légende : ✅ fait · 🟡 partiel · ❌ manquant. « Fait dans #106 » = corrigé dans la PR du plugin après l'audit.

## Liste des decks

| Fonction du site | Plugin |
|---|---|
| Onglets Mes decks / Communauté / Concours | ✅ |
| Recherche, format, visibilité, likes, tuile cliquable, nouveau deck | ✅ |
| Tri « Récemment créé » | ✅ fait dans #106 (triait par date de modification) |
| Tous les decks du compte (le plugin s'arrêtait à 60) | ✅ fait dans #106 |
| Filtre plusieurs factions en Communauté (ignoré en silence) | ✅ fait dans #106 |
| Import d'une liste texte : deck du compte si connecté, choix du format | ✅ fait dans #106 |
| Filtre héros en Communauté, héros groupés par faction | ✅ |
| Tris ascendants (modifié ↑, créé ↑, nom Z→A) | ✅ |
| Filtres et tri dans l’URL, onglet Communauté par défaut pour un invité | ✅ (liens du site compris : `tab=my` ou `public`, `sort=champ:sens`, `visibility=1` ou `0`, héros par référence) |
| Badge Brouillon ; badge Illégal avec la fenêtre des règles | ✅ (Mes decks ; « Non légal » comme sur la page deck) |
| Nombre de vues, cartes et raretés sur les tuiles Communauté | ✅ |
| Decks illégaux affichés (et signalés) en Communauté | ✅ badge « Non légal » et fenêtre des règles |
| Import depuis une URL ou un ID altered.gg | — abandonné : api.altered.gg n’existe plus |
| Deck invité du site (`alteredcore_guest_deck`) repris ; « Enregistrer sur mon compte » une fois connecté | ✅ (aussi pour les decks invités de Re:Builder) |
| Bandeau des deckbuilders communautaires | ✅ (endpoint du plugin `papi/community-builders.php`) |
| Format caché `test` (bgatester) | ✅ (création, réglages, import, filtre) |

## Page deck

| Fonction du site | Plugin |
|---|---|
| Deck privé, 404, erreur, retour, modifier, supprimer, dupliquer, copier la liste | ✅ |
| Grille par type, decklist, description, courbes, main de test, stats de main, calculateurs | ✅ |
| URL `/pages/deck?id=` (liens partagés, QR codes, `card.php`, tournament-reports) | 🟡 `/pages/rebuilder/deck?id=` redirige vers la page deck ; `/pages/deck` reste la page du site |
| Nom du deck dans `<title>` / og:title (aperçu des liens partagés) | ✅ (`meta.php`, champ `meta` du manifeste) |
| Zoom d'une carte (grille, decklist, héros) avec lien vers la fiche | ❌ |
| Partage : fenêtre avec QR code ; deck privé : avertissement « Rendre public et partager » | ❌ |
| Badge Brouillon, icône de faction dans l'en-tête | ❌ |
| Stats : répartition par type, puissances moyennes (le plugin affiche des totaux) | 🟡 |
| Main de test en mode jeu (mana, plateau, défausse, glisser-déposer) | ❌ |
| Calculateurs : vignettes et groupes par type dans le choix des cartes | 🟡 |
| Duplication avec les illustrations préférées (mode Global) | ❌ |
| Étoile favori sur les cartes, widget possession / tilt dans le zoom | ❌ |
| Groupes fins (Repères, Permanents d'expédition, Jetons) ; faction et puissances de toutes les cartes dans la decklist | 🟡 |

## Éditeur

| Fonction du site | Plugin |
|---|---|
| Création (héros, nom, format, visibilité), choix du héros, recherche par nom et référence, Uniques et effets, ajout/retrait | ✅ |
| Échec de sauvegarde : l'éditeur reste utilisable, état de sauvegarde, réessai, erreurs de l'API | ✅ fait dans #106 |
| Description modifiable ; renommer sur mobile | ✅ fait dans #106 |
| `isDraft` envoyé à la sauvegarde | ✅ fait dans #106 |
| Garde avant de quitter avec des changements non sauvegardés | ✅ fait dans #106 |
| Échec de création sur le compte : erreur affichée au lieu d'un deck local silencieux | ✅ fait dans #106 |
| Règles : même faction, limite d'Uniques par héros, formats sans Uniques, bannies/suspendues | ✅ fait dans #106 (limites Singleton par héros tirées d’`altered.json`) |
| Détail des règles depuis l'éditeur, marqueur de violation par ligne | ✅ fait dans #106 |
| Liste blanche Frontier des Uniques, sets absents de BGA | ❌ |
| Filtres : puissances, mot-clé, sous-type, relation de coût, syntaxe `<`/`>` des coûts, alt-arts et éditions promo, changer de faction | ❌ |
| Tris (17 sur le site, 3 dans le plugin) | 🟡 |
| Onglets Collection physique, Possession numérique, Favoris | ❌ (les deux derniers sont des emplacements vides) |
| Zoom d'une carte avec quantité et lien vers la fiche | ❌ |
| Illustrations : choix par carte, préférence Global, illustrations des jetons, avertissements de possession ; héros alt-art / sérialisés | ❌ |
| Toast « Annuler » après un ajout, bandeau d'état avec progression vers le minimum | ❌ |
| Main de départ dans l'éditeur | ❌ (sur la page deck seulement) |
| Pastilles BGA qui dépendent du héros à la création, formats lus depuis `altered.json` | 🟡 statiques |

Fonctions propres au plugin : plusieurs decks invités, chips de filtres retirables, filtres « Sans effet » / « Écho », vue grille
ou liste, défilement infini virtualisé, bouton « Dupliquer en local » sur le deck d'un autre, URLs des onglets de la page deck,
Web Share, import Equinox intégré, retour à la même position dans la liste.
