# Cards API : limitations (Uniques)

Constaté le 2026-09-26 sur la production et dans le code de
[altered-core-cards-api](https://github.com/Altered-Community/altered-core-cards-api) (commit `94d44e4`).

`GET /api/cards` passe par Meilisearch (`SearchAwareCollectionProvider`) seulement si tous les paramètres sont des
filtres connus (`MeilisearchFilterBuilderService::hasUnmappedFilters`). Sinon, la requête part en SQL, avec un
`OFFSET` et un `COUNT` sur 5,4 millions d’Uniques.

## `locale` envoie les Uniques en SQL

**Constat.** `locale` n’est ni dans `FILTER_MAP`, ni dans la liste ignorée (`name`, `page`, `itemsPerPage`,
`pagination`, `order`). Mesures sur la requête par défaut de l’onglet Uniques (7 extensions, 36 cartes, tri par date) :

| Requête | Avec `locale=fr` | Sans `locale` |
|---|---|---|
| Page 1, toutes factions (cache serveur froid) | 6 à 21 s | 0,4 s |
| Pages 50, 500, 5 000 (Muna) | — | 0,7 à 0,8 s |
| Un déclencheur d’effet (Muna) | 28 s, ou 504 | 0,9 s |

Mêmes références dans le même ordre ; sans `locale`, les textes arrivent en tables de langues (`name.fr`, …).

**Contournement.** `toSearchParams` (`src/app/core/card-filters.ts`) n’envoie pas `locale` pour les Uniques ;
l’affichage lit déjà `localizedText(…, 'fr')`.

**À faire côté backend.** Ajouter `locale` aux paramètres ignorés de `hasUnmappedFilters` (il ne filtre rien), puis
remettre `locale=fr` côté front si on veut des réponses plus légères (≈ 30 Ko au lieu de 90 Ko par page).

## `effectSlot` : `0` veut dire « n’importe lequel » en SQL, « aucun » en Meilisearch

**Constat.** `EffectSlotFilter` (SQL) documente `0 = any`. `buildEffectSlotFilter` (Meilisearch) écrit
`slot1_condition = 0`, qui ne correspond à aucune carte : 0 résultat pour `effectSlot[0][trigger]=24&…[condition]=0&…[effect]=0`.

**Contournement.** `buildCardsSearchParams` (`src/app/core/cards-api.service.ts`) n’envoie que les parties non nulles
d’un bloc d’effet. Les deux chemins les lisent comme « n’importe lequel ».

**À faire côté backend.** Ignorer les valeurs `0` dans `buildEffectSlotFilter` et `buildEchoSlotFilter`.

## Pas d’image par Unique

**Constat.** `imagePath` pointe sur `altered-dev.s3.eu-west-3.amazonaws.com` (403). Le CDN n’a pas
`cards/{lang}/{SET}/ALT_…_U_n.webp` (404). Il a l’illustration Unique propre à chaque carte imprimée, partagée par toutes
ses Uniques : `cards/assets/{SET}/{CARTE}_U.webp` (toutes les extensions) et
`illustrations/{SET}/{CARTE}_U_FRAMELESS_T1.webp` (manque pour une partie de COREKS). Le site PHP dessine la carte
dans un canvas avec [Altered-Card-Renderer](https://github.com/PolluxTroy0/Altered-Card-Renderer) (licence
propriétaire aujourd’hui, alors que le fork Altered-Community d’août 2026 était en GPL-3.0 ; 200 cartes par page au
maximum, trop peu pour un défilement infini).

**Contournement.** `ar-unique-card` dessine la face à partir des données de l’Unique (coûts, puissances, texte,
numéro de collection) sur l’illustration Unique du CDN.

**À faire côté backend.** Soit publier une image rendue par Unique sur le CDN, soit renvoyer dans `imagePath` l’URL
CDN de l’illustration au lieu du lien S3 mort.

## Frontier

**Constat.** La première requête Frontier d’une faction prend 8 à 9 s, les suivantes environ 1 s (avec ou sans
`locale`). Le total annoncé plafonne (5 000 par faction, 30 000 sans faction).

**Contournement.** Squelettes, puis message « La première recherche Frontier prend une dizaine de secondes » après
3 s (`CardSearchStore.slow`).

## Faction des Uniques transfuges

Pas un défaut : une Unique `transfuge` a une autre faction que sa carte imprimée (`ALT_EOLE_B_AX_106_U_1086` est
Lyra). `faction.code` filtre sur la faction de l’Unique, celle qui compte pour le deck. La face affiche l’emblème de
cette faction.
