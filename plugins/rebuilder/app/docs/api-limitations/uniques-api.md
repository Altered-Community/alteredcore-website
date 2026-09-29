# API de recherche des Uniques : mesures et limites

`https://search.altered.re` (`UNIQUES_API_URL`), utilisée par l’onglet Uniques depuis le 2026-09-29, comme par la page
cartes et le deckbuilder du site en production.

## Comparaison avec la Cards API (2026-09-29)

Première page de 36 Uniques, 5 essais par requête, depuis un poste en France. Cards API : `/api/cards?rarity[]=UNIQUE`
(sans `locale`, comme l’ancien onglet Uniques). Uniques : `/api/v2/cards`.

| Requête | Cards API, 1er appel | Cards API, médiane | Uniques, médiane |
|---|---|---|---|
| Toutes les Uniques | 366 ms | 266 ms | 221 ms |
| Faction Axiom | 324 ms | 273 ms | 223 ms |
| Nom « kelon » | 368 ms | 265 ms | 224 ms |
| Frontier | 1 724 ms | 373 ms | 230 ms |
| Axiom + Frontier + {H} | 1 420 ms | 391 ms | 232 ms |
| Quand {H} ou {J} | 342 ms | 278 ms | 232 ms |
| Axiom, page 200 (Cards API) / page 50 par curseur (Uniques) | 312 ms | — | 237 ms |

L’écart de vitesse est faible sur les requêtes simples. Le gain est sur Frontier et sur le sens des effets :
« (Joué depuis la Main ou Joué de partout) et Piochez une carte » est une seule requête
(`effect[0][t]=22,24&effect[1][o]=90&effectMode=and`), impossible avec `effectSlot[N]`.

## Couverture

Totaux identiques pour CORE, COREKS, CYCLONE, DUSTER et EOLE. BISE : 1 029 202 Uniques contre 1 037 519 dans la Cards
API (8 317 de moins), ALIZE : une de moins. FUGUE n’a d’Uniques dans aucune des deux ; `set[]=FUGUE` est une 400 ici.

## Ce que l’API ne fait pas

- Pas de tri : l’ordre est celui de l’index (COREKS d’abord). L’onglet masque « Trier par ».
- Pas de « Sans effet » ni d’« Effet d’écho » dans la recherche (déjà masqués sur les Uniques). `support[t|c|o]`
  existe pour l’effet de soutien, pas encore proposé dans l’éditeur.
- Pas de `rarity`, `cardType`, `collectorNumberFormatedId`, `imagePath` ni `transfuge` dans les cartes : ce sont des
  Personnages Uniques (`toCard`), le numéro de collection est déduit de la référence (`collectorNumber`), l’illustration
  vient du CDN comme avant.
- Le total Frontier est celui de la liste du format (30 000 sans faction).
