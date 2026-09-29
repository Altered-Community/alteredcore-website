# Decks API : limitations

Constaté le 2026-09-25 sur la production et dans le code de
[altered-core-decks-api](https://github.com/Altered-Community/altered-core-decks-api) (commit `156d6e8`).

## Auteur du deck absent

**Constat.** `GET /api/decks/public` et `GET /api/decks/{id}` renvoient `"user": []`. L'entité `User` n'a aucun champ
dans le groupe de sérialisation `deck:read` (schéma OpenAPI `User-deck.read` vide).

**Contournement.** `toDeckListItem` (`src/app/core/deck-view.ts`) lit `user.username` s'il existe ;
`ar-deck-card` en variante `community` affiche l'auteur seulement quand il est présent. Aujourd'hui, rien ne s'affiche.

**Correction en cours.** Trois changements, dans l'ordre de déploiement :

1. [AlteredAuth#1](https://github.com/Altered-Community/AlteredAuth/pull/1) : le mapper Keycloak `pseudo` (client
   scope `profile`) passe « Add to access token » à On. Sans ça, le token d'accès ne porte pas `pseudo`.
2. [altered-core-decks-api#63](https://github.com/Altered-Community/altered-core-decks-api/pull/63) : `user.username`
   exposé dans `deck:read`, alimenté uniquement par le claim `pseudo` (jamais `preferred_username`, qui vaut l'email).
   Une migration vide les anciens `username` et `app:users:sync-pseudos` les remplit depuis Keycloak.
3. Côté site : le login Keycloak demande `scope=openid profile`, sinon le token n'a pas `pseudo`.

## Texte imprimé d'une Unique absent de la ligne

**Constat.** `GET /api/decks/{id}` embarque coûts, puissances et un tableau `effects` (déclencheur, condition, effet). Ce tableau n'est pas le texte imprimé (`mainEffect` / `echoEffect` de `/api/cards`) : l'ordre des morceaux et les séparateurs (`  `, `—`) diffèrent. Une commune s'affiche quand même, son image CDN contient le texte. Une Unique est dessinée par `ar-unique-card`, qui n'a alors pas de cartouche.

**Contournement.** `cardToLine` garde `mainEffect` et `echoEffect` sur les lignes invité. À l'ouverture d'un deck dont une Unique n'a pas ce texte, `DeckStore` appelle `POST /api/cards/batch?locale=fr` et complète la face.

**À faire côté backend.** Renvoyer `mainEffect` et `echoEffect` sur la ligne, comme `/api/cards`.

## Pas de filtre de légalité sur la liste publique

**Constat.** `/api/decks/public` ignore `legal=true` : `PublicDeckController` ne lit que `page`, `itemsPerPage`,
`hero`, `cardName`, `cardReference`, `name`, `faction`, `format` et `order[…]`. Environ 4 % des decks publics sont
illégaux.

**Contournement.** L'onglet Communauté (`src/app/features/decks/community-pages.ts`) retire les decks où
`legal` est faux, page par page. Conséquences : une page affiche parfois moins de 24 decks, et le total
« N decks » (`totalItems` moins les decks retirés jusque-là) reste surestimé tant que toutes les pages ne sont pas
chargées.

**À faire côté backend.** Paramètre `legal` dans `PublicDeckController` et condition `AND d.legal = true` dans
`DeckRepository::buildPublicFilters` (utilisée à la fois par `findPublic` et `countPublic`). Retirer ensuite le
filtre client.

## Une seule faction sur la liste publique

**Constat.** `/api/decks/public` prend un seul `faction` : pas de liste de factions.

**Contournement.** Avec deux factions ou plus, l'onglet Communauté (`src/app/features/decks/community-pages.ts`)
n'envoie pas `faction` et garde, page par page, les decks dont le héros est d'une des factions choisies. Le
défilement infini charge les pages suivantes tant que la liste ne remplit pas l'écran. Le total de l'API ne vaut
plus rien : le compteur affiche « N+ decks » (decks trouvés jusque-là) tant que toutes les pages ne sont pas chargées.

**À faire côté backend.** Accepter plusieurs factions (`faction[]`) dans `buildPublicFilters`, puis envoyer
la liste et retirer le filtre client.

## Pool Frontier inconnu, légalité figée à l'enregistrement

**Constat.** Aucune réponse n'indique le pool Frontier (pool 1, pool 2…) d'un deck. `FrontierFormatValidator`
vérifie seulement que chaque Unique porte la clé `gameplayFormat: "frontier"`, synchronisée depuis le manifeste des
formats Altered Reunion : c'est toujours le pool en vigueur. De plus, `legal` et `legalityDetail` sont calculés à
l'enregistrement (`DeckStateProcessor`), pas à la lecture. Un deck construit pour le pool 1 reste « légal » après le
passage au pool 2, sauf si la commande `app:deck:check-set-legality` est relancée.

**Contournement.** Aucun : le front affiche « Frontier » sans pool.

**À faire côté backend.** Exposer un identifiant de pool dans le manifeste des formats et dans `GET /api/formats`,
enregistrer sur le deck le pool contre lequel il a été validé, et relancer la validation des decks Frontier à chaque
changement de pool.

## Liste publique refusée avec un token invalide

**Constat.** `GET /api/decks/public` est anonyme, mais un en-tête `Authorization` expiré ou invalide y renvoie 401 au
lieu d'être ignoré. Le token est pourtant nécessaire pour que `hasUpvoted` reflète les j'aime de l'utilisateur.

**Contournement.** `DecksApiService.listPublic` envoie le token, et refait la requête sans lui après un 401.

**À faire côté backend.** Traiter un token invalide comme une requête anonyme sur `/api/decks/public`.
