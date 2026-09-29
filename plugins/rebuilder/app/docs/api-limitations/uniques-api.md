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

## Une même capacité répond à plusieurs effets

**Constat.** En `effectMode=and`, chaque bloc `effect[N]` devient l’ensemble des cartes qui ont *une* capacité qui lui
correspond, puis les ensembles sont intersectés : rien n’oblige deux blocs à être satisfaits par deux capacités
différentes. Axiom, Frontier : « Quand {H} ou {J} · Sans condition · Alors Piochez une carte » donne 10 cartes, et 10
aussi avec en plus un bloc « Alors Piochez une carte » (la même capacité répond aux deux).

**Contournement.** `effectMatchCounts` (`src/app/core/uniques-api.service.ts`) : un bloc qui en couvre `k` autres
(toute capacité qui répond à l’un répond à lui) est envoyé avec `effect[N][matchCount]=k+1` (au plus 3). Exact quand
les blocs couverts sont emboîtés (blocs identiques, « Piochez » après « {J} · Piochez ») : 2 cartes au lieu de 10
ci-dessus. Deux blocs qui se recoupent sans que l’un couvre l’autre (« Quand {J} · Alors Piochez » et
« Si Y · Alors Piochez ») restent approximatifs.

**À faire côté API.** Un mode qui exige des capacités distinctes pour les blocs (issue à ouvrir sur
Altered-Re-Union/uniques-search-api).

## Ce que l’API ne fait pas

- Pas de tri : l’ordre est celui de l’index (COREKS d’abord). L’onglet masque « Trier par ».
- Pas de « Sans effet » ni d’« Effet d’écho » dans la recherche (déjà masqués sur les Uniques). `support[t|c|o]`
  existe pour l’effet de soutien, pas encore proposé dans l’éditeur.
- Pas de `rarity`, `cardType`, `collectorNumberFormatedId`, `imagePath` ni `transfuge` dans les cartes : ce sont des
  Personnages Uniques (`toCard`), le numéro de collection est déduit de la référence (`collectorNumber`), l’illustration
  vient du CDN comme avant.
- Le total Frontier est celui de la liste du format (30 000 sans faction).
