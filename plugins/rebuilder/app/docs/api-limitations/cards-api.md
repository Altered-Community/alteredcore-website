# Cards API : limitations (Uniques)

Constaté le 2026-09-26 sur la production et dans le code de
[altered-core-cards-api](https://github.com/Altered-Community/altered-core-cards-api) (commit `94d44e4`).

Depuis le 2026-09-29, l’onglet Uniques passe par l’API de recherche des Uniques (`UNIQUES_API_URL`, voir
[uniques-api.md](uniques-api.md)), comme le site en production. Celle-ci ne savait pas combiner « (A ou B) et C »
entre plusieurs blocs d’effet (`effectSlot[N]` : une valeur par partie, un seul mode pour tous les slots), et ses
requêtes avec `locale` ou Frontier étaient lentes (6 à 45 s en SQL, 8 à 9 s pour la première requête Frontier). Les
decks lisent toujours leurs Uniques avec `/api/cards/batch`.

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

## Faction des Uniques transfuges

Pas un défaut : une Unique `transfuge` a une autre faction que sa carte imprimée (`ALT_EOLE_B_AX_106_U_1086` est
Lyra). `faction.code` filtre sur la faction de l’Unique, celle qui compte pour le deck. La face affiche l’emblème de
cette faction.
