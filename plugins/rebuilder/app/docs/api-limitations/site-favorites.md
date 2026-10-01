# Favoris du site : limitations

`/papi/core-altered-cards/favorites-search` (plugin `core-altered-cards` du site, `api/favorites-search.php`), qui
alimente l'onglet Favoris de la recherche de cartes. Constaté le 2026-09-30.

## Pas de filtre par format

**Constat.** L'endpoint lit la table `{favorites}` en SQL et ne filtre que par `faction[]`, `rarity[]` et `set[]`
(colonnes `faction`, `rarity`, `card_set` enregistrées au clic sur l'étoile). Il complète ensuite les références de
la page par `POST /api/cards/batch`. Il ne sait rien du format du deck : ni Uniques interdites (formats No Unique),
ni liste Frontier, ni cartes bannies ou suspendues.

**Contournement.** Dans l'éditeur, le filtre « Légales en <format> » (par défaut) :

- retire les Uniques dès la requête dans un format No Unique (`rarity[]` sans `UNIQUE`, `favoriteRarities` dans
  `src/app/core/owned-cards.service.ts`) ;
- retire le reste page par page, après la réponse (`allowedInFormat` dans `src/app/core/deck-rules.ts`) : extensions
  absentes de BGA, cartes bannies ou suspendues, et en Frontier les Uniques dont `gameplayFormat` (renvoyé par
  `/api/cards/batch`) ne contient pas `FRONTIER`. Une Unique renvoyée sans ses données est gardée.

Conséquence : le total « N cartes » compte les cartes retirées page par page tant que toutes les pages ne sont pas
chargées, et une page peut contenir moins de cartes que demandé.

Pourquoi pas l'API de recherche des Uniques (`search.altered.re`, qui filtre par `format=frontier`) : elle ne connaît
pas les favoris, stockés sur le site. Il faudrait l'interroger référence par référence, et `reference=<ref>` y a
semblé ignoré (même liste de 30 000 Uniques renvoyée pour trois références différentes, non creusé).

**À faire côté site.** Filtrer par format dans `favorites-search` : un paramètre `format`, et en base de quoi
l'appliquer en SQL (par exemple une colonne `gameplay_format` et les statuts banni / suspendu enregistrés comme
faction, rareté et extension, ou rafraîchis depuis l'API des cartes). Le total serait alors exact et le filtre
client pourrait être retiré.

## Favoris enregistrés sans leurs métadonnées

**Constat.** Une étoile posée sans faction, rareté ou extension (depuis certaines pages du site) enregistre des
colonnes vides, remplies plus tard seulement en vue non filtrée (`cacFavBackfillMeta`). Tant qu'elles sont vides, le
favori est exclu dès qu'un filtre porte sur la colonne.

**Contournement.** Re:Builder n'envoie pas `rarity[]` quand toutes les raretés sont cochées. Le filtre par extension,
lui, est toujours envoyé.

**À faire côté site.** Remplir les colonnes à l'enregistrement de l'étoile (depuis la référence : extension, rareté ;
faction par l'API des cartes).
