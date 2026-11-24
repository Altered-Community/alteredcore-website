# AlteredCore backend contract

This SPA talks to the **same HTTP APIs** the community PHP deckbuilder uses. It does **not** vendor or fork [Yutsa/alteredcore-website](https://github.com/Yutsa/alteredcore-website). Endpoints below were read from that repo (`plugins/core-altered-cards/`, `auth/`, `config.local.php.example`) plus the live OpenAPI docs.

The app runs only as the site's `rebuilder` plugin: `main.embed.ts` takes the service URLs from `window.AlteredCore.services` (cards, CDN, and the site's decks relay); `src/environments/environment.ts` only holds fallbacks.

## Hosts (production / preprod)

From `config.local.php.example` in the PHP site:

| Constant | Production host | Role |
|---|---|---|
| `CARDS_API_URL` | https://cards.alteredcore.org | Public card catalogue (API Platform / hydra-style JSON) |
| `DECKS_API_URL` | https://decks.alteredcore.org | Deck CRUD (Bearer Keycloak access token) |
| `CDN_URL` | https://cdn.alteredcore.org | Card art (`/cards/{lang}/{SET}/{REF}.webp`) |
| `UNIQUES_API_URL` | https://search.altered.re | Uniques search (rust-cards-api `/api/v2`): the Uniques tab |
| `COLLECTION_API_URL` | https://collection.alteredcore.org | Physical collection |
| `OWNERSHIP_API_URL` | https://ownership.altered.re | Digital ownership / alt-arts |
| Website | https://alteredcore.org | PHP UI + `/papi/...` proxies |
| Legacy deckbuilder UI | https://deckbuilder.alteredcore.org | Linked from plugin `config.php` |

OpenAPI (no auth):

- Cards: https://cards.alteredcore.org/api/docs
- Decks: https://decks.alteredcore.org/api/docs

## Auth

The PHP site supports:

1. **Keycloak SSO** — `GET /auth/keycloak-login.php` → authorization code → `/auth/keycloak-callback.php`. Access token is stored server-side (encrypted in session). `deckApiToken()` returns `kc_get_access_token($userId)` and is sent as `Authorization: Bearer` to `DECKS_API_URL`.
2. **Local email/password** — `/auth/local-login.php` when `KC_URL` is empty. That path **does not** produce a decks-API JWT; deck save then fails unless Keycloak is configured.

The plugin holds no token. Deck calls go to the site's relay (`AlteredCore.services.decks`, `/api/v1/services/decks`), which adds the Keycloak access token of the PHP session server-side and renews it; writes carry the session's `X-CSRF-Token` (`siteCsrfInterceptor`). Signing in is the site's (`AlteredCore.login()`). Guest decks stay in `localStorage` (`arb.guest-decks`).

## CORS (probed 2026-09-23)

Both `cards.alteredcore.org` and `decks.alteredcore.org` answer CORS preflight with:

- `Access-Control-Allow-Origin: <request Origin>` (including `http://localhost:4200`)
- `Access-Control-Allow-Headers: content-type, authorization`
- `Access-Control-Allow-Methods: GET, OPTIONS, POST, PUT, PATCH, DELETE`

The plugin calls the cards API and the CDN directly from the site's origin; decks go through the same-origin relay. `cdn.alteredcore.org` returns `Access-Control-Allow-Origin: *`.

## Cards API (`CARDS_API_URL`)

Public, no auth. Collection JSON uses `{ member, totalItems, currentPage, itemsPerPage, lastPage }`.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/cards` | Search. Query: `page`, `itemsPerPage`, `name`, `reference`, `faction.code[]`, `cardType[]`, `rarity[]`, `set.reference[]`, `subTypes[]`, `variation[]`, `effectKeyword[]`, `effectKeywordMode`, `mainCost`, `recallCost`, `forest`, `mountain`, `ocean` (range syntax like `3` or `1-3`), `costRelation`, `isBanned`, `isSuspended`, `isErrated`, `hasNoEffect`, `order[field]=asc\|desc`, `random=true`, `locale` |
| GET | `/api/cards/reference/{reference}` | Single card |
| POST | `/api/cards/batch?locale=` | Body `{ "references": string[] }` (max 200). Hydrate a decklist. |
| GET | `/api/factions` | `{ id, name, code, position }` |
| GET | `/api/card_types` | `{ reference, name: {en,fr,…} }` |
| GET | `/api/sets` | `{ code, name, reference }` |
| GET | `/api/card_sub_types` | |
| GET | `/api/card_groups` | Used for hero grouping in the PHP editor |
| POST | `/api/auth/login` | Cards API login — **not** used by the PHP deckbuilder for decks |

Notes from production probing: `faction.code` (scalar) is the reliable single-faction filter; costs need explicit
`mainCost[]` / `recallCost[]` values (`1-3` returns 500); `order[setDate]` alone is not a stable sort (add
`order[cardNumber]`).

The Uniques tab does not use `/api/cards` (see *Uniques API* below); the decks still hydrate their uniques with
`/api/cards/batch`. Known limits: [api-limitations/cards-api.md](api-limitations/cards-api.md).

Default deckbuilder filters (from `plugins/core-altered-cards/data/search_settings.json`): rarities `COMMON,RARE,EXALTED`, variation `standard`, sets `CORE,ALIZE,BISE,CYCLONE,DUSTER,EOLE`.

CDN art URL used by `card-search.js`:

```
{CDN_URL}/cards/{lang}/{SET}/{REFERENCE}.webp
```

`SET` is the second `_` segment of the reference (`ALT_CORE_B_AX_03_C` → `CORE`).

Uniques have no image of their own: `cards/{lang}/{SET}/ALT_…_U_374.webp` is 404 and the API `imagePath` (Equinox S3)
is 403. Every unique of a printed card shares one unique illustration, `{CDN_URL}/cards/assets/{SET}/{CARD}_U.webp`
(`CARD` = reference without `_U_n`), or `{CDN_URL}/illustrations/{SET}/{CARD}_U_FRAMELESS_T1.webp`. The PHP site draws
the card (frame, costs, powers, text) in a canvas with Altered-Card-Renderer; this app draws it with `ac-unique-card`.

## Uniques API (`UNIQUES_API_URL`, `AlteredCore.services.uniques`)

The Uniques tab (`src/app/core/uniques-api.service.ts`), like the site's own cards page and deck builder in production
(`uniquesApiBase: "https://search.altered.re"`). Rust in-memory index of the Unique characters,
[Altered-Re-Union/uniques-search-api](https://github.com/Altered-Re-Union/uniques-search-api) (fork of
[Taum/rust-cards-api](https://github.com/Taum/rust-cards-api), contract in its `docs/api-spec.md`). Public,
`Access-Control-Allow-Origin: *`.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v2/cards` | `limit` (≤ 200), `cursor` (from `iter.cursor`, absent on the last page), `name`, `faction[]`, `set[]`, `mainCost[]`, `recallCost[]`, `format=frontier`, `effect[N][t\|c\|o]=id,id…` (OR list per part), `effectMode=and\|or` between blocks. Response `{ iter: { total, cursor? }, cards: CardV2[] }`, text fields as locale maps `fr_FR`, `en_US`… |
| GET | `/api/v2/card/{reference}` | One `CardV2`; 400 / 404 for an unknown reference |
| GET | `/api/v2/effects` | `{ triggers, conditions, output }`, items `{ idGd, text, isMain, isEcho, duplicatedIdGd }`: the effect editor keeps the `isMain` ones. `idGd` are the cards API `alteredId`, with duplicates of the same text merged |
| GET | `/api/v2/effects/filtered` | The `/api/v2/cards` filters plus `editing=<trigger\|condition\|output>:<slot>`; `{ editing, idGds }`, the ids of that box that still give a card. The effect editor narrows its three lists to them (`buildEffectsFilteredParams`): the edited block is sent last, so `slot` is its position among the blocks actually sent |

No sort parameter (the tab hides « Trier par »), no « Sans effet » / « Effet d’écho » (hidden on Uniques already),
an unknown set is a 400 (`FUGUE` has no uniques and is not offered). Measures and gaps:
[api-limitations/uniques-api.md](api-limitations/uniques-api.md).

## Decks API (`DECKS_API_URL`)

The C# DeckApi (drop-in replacement of the PHP `altered-core-decks-api`: same routes and shapes, additive fields; contract
in its `README.md`). Reached through the site's relay. Anonymous reads: `GET /api/decks/public` (`page`, `itemsPerPage`,
`name`, `faction`, `format`, `hero`, `family`, `legal`, `cardReference`, `cardName`, `source`, `order[field]`), `GET /api/decks/public/heroes?locale=`,
`GET /api/decks/{uuid}` for public decks and `GET /api/formats`. The rest needs the session's token
(`read-decks` / `write-deck` scopes).

| Method | Path | Content-Type | Body / notes |
|---|---|---|---|
| GET | `/api/decks` | | The caller's decks (plain array). Filters: `format`, `legal`, `isDraft`, `cardReference`, `family`, `order[…]`, `locale` |
| POST | `/api/decks?locale=` | `application/json` | `{ name, description?, format?, isPublic?, isDraft: false, deckCards: [{ cardReference, quantity }], altArtOverrides? }` |
| GET | `/api/decks/{id}?locale=` | | Detail: `cards` (concrete prints, overrides applied) or `deckCards: []`, plus `canonicalCards` |
| PATCH | `/api/decks/{id}?locale=` | `application/merge-patch+json` | What the editor autosaves: the whole deck (`deckCards` + `altArtOverrides`), `isDraft: false` |
| DELETE | `/api/decks/{id}` | | Owner only |
| POST | `/api/decks/{id}/upvote` | `application/json` | `{}` → `{ upvoteCount, hasUpvoted }` |
| GET | `/api/formats?hiddenFormats=true` | | Per format: `code`, `label`, `minCards`, `maxCards`, `allowBanned`, `allowSuspended`, `limits{unique, rare, exalted, maxCopiesPerName, maxCopiesPerRarity}`, `uniqueLimitsByHero`, `maxFactions`, `sets{allowed, forbidden}`, `bannedCards`, `suspendedCards` (references, families `BR_06`, family + rarity `OR_27_R1`), `uniqueAllowlist` (`FormatsService`, fetched once) |

**Legality comes from the API only.** Every save is validated (not a deck saved with `isDraft: true`: the editor always
sends `false`). A deck carries `legal`, `errors: [{code, reference, message}]` (translated with `?locale=`, the interface
language is sent), `formatErrors` (their messages) and `legalityDetail` (`{rule: bool, global}`). The editor shows the
answer to its last save or to the GET (`core/deck-legality.ts`); a problem with a `reference` is shown on every line of the
same card (family + rarity). Without `errors` (former API) it falls back on `formatErrors` / `legalityDetail`. A guest
deck, or a deck not validated yet, has an unknown legality (no badge). The formats' rules are read for UI affordances
only: copy caps (per family `{FACTION}_{NUM}`, across rarities and prints), « légales » filtering of the account tabs,
rarity caps (`core/format-rules.ts`).

**Cards and prints.** The API stores one canonical reference per gameplay card (family + rarity; booster print of the
card's first set, a Unique keeps its own) and the prints the deck chooses in `altArtOverrides`:
`{ cards: { "<canonical>": [{reference, quantity}] }, tokens: [{reference, quantity}] }` (copy order = list order). An
override may name the canonical print itself: the base art forced in this deck over the player's global preferences
(the brush's « Pour ce deck » on the plain illustration); a canonical line in `deckCards` without an override is never
a pin. The
editor reads `canonicalCards` + `altArtOverrides` (falling back on `cards` / `deckCards`, alt arts and promos pinned,
with the former API) and writes canonical references + overrides (`core/deck-prints.ts`; a card whose canonical
reference it cannot tell is sent by its print, which the API resolves). A deck's own prints win; its other copies
follow the player's global preferences (ownership `PUT /api/alt-arts/preferences`), and Board Game Arena checks
ownership. Public decks carry `owner: { pseudo }` (shown on the deck page and the community cards).

**Tournaments.** DeckApi syncs the BGA tournament lists (GameApi): a deck imported that way has `source: "tournament"`
(`"user"` otherwise), and every deck carries `tournaments: [{ tournamentParentId, name, mode, games, wins, losses,
lastPlayedAt }]`, its record in each tournament it was played in. `GET /api/decks/public` lists the `user` decks only unless
`source` says otherwise (`tournament`, or `all` for both): the community tab sends `source=all`, and `source=tournament`
with its « Joués en tournoi » filter. It shows the sum of `wins` / `losses` and the share of games won on each card
(`tournamentRecordOf`, `core/deck-view.ts`). Its « Contient la carte » filter sends `cardReference`: an exact match on the
canonical references the deck stores (`ALT_ALIZE_B_LY_02_C` does not find a deck holding `ALT_CORE_B_LY_02_C`; `cardName`
is a prefix match on the card names). The suggestions come from the search API (`UniquesApiService.suggestCards`: a full
reference looked up with `ref[]` first, otherwise `name` on the non-Unique booster prints), one per gameplay card on its
canonical reference (`core/card-suggestions.ts`).

Known gaps: see [api-limitations/decks-api.md](api-limitations/decks-api.md).

Formats: `standard`, `nuc`, `singleton`, `singleton_nuc`, `sandbox`, `test`, `frontier`, `sealed`.

`cardReference` pattern: `ALT_[A-Z0-9]+_[A-Z0-9]+_[A-Z]+_\d+_[A-Z0-9]+(_\d+)?`

## PHP plugin proxies (`https://alteredcore.org/papi/core-altered-cards/...`)

Cookie + CSRF. Not required for the first milestone (this app is a parallel client):

| Endpoint | Purpose |
|---|---|
| `collection-search` | Filter search by physical collection |
| `ownership-search` | Digital ownership scope |
| `favorites-search` / `favorites-toggle` | Per-user favorites (local PHP DB) |
| `deck-add-card` | Incremental add: GET deck + PATCH full `deckCards` |
| `deck-alt-arts` | Families of illustrations of deck and search references: prints, copies owned, the player's default alt arts (`core/alt-art-defaults.ts`) |
| `playset` / `playset-cards` | Physical playset dashboard |

Ownership plugin (when enabled): `/papi/ownership/alt-art-search` (token illustrations). The player's default alt arts (« partout » in the brush and in « Illustrations des jetons ») are saved through the relay (`PUT /api/alt-arts/preferences`); a deck's own choices (« pour ce deck ») go to the deck's `altArtOverrides`. The former Global / PerDeck mode (`/api/alt-arts/preference-mode`) is no longer read.

The former `/papi/rebuilder/deck-alt-arts` endpoint (brush order per deck) is gone: the order is the deck's `altArtOverrides`. Its table `{rebuilder_deck_alt_arts}` (`sql/migration_009`) is unused and can be dropped.

## Local stack

The plugin runs in the site's local stack (`docker-compose.stack.yml`, see `../../README.md`): the shell passes the local service URLs through `window.AlteredCore.services`, so nothing is configured in the app.
