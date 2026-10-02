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

API Platform. **Unauthenticated `GET /api/decks` returns 401** (probed). Writes always need Bearer.
Anonymous reads (from `config/packages/security.yaml` in altered-core-decks-api): `GET /api/decks/public`
(`page`, `itemsPerPage`, `name`, `faction`, `format`, `hero`, `order[field]`), `GET /api/decks/public/heroes?locale=`
(`[{ reference, name, imagePath }]`, heroes of the community tab's hero filter), `GET /api/decks/{uuid}` for public decks
(lines embed name, faction, type, costs, powers) and `GET /api/formats` (legality limits).

| Method | Path | Content-Type | Body / notes |
|---|---|---|---|
| GET | `/api/decks` | | Filters: `page`, `itemsPerPage`, `format`, `isPublic`, `isDraft`, `user`, `alteredId`, `name`, `order[createdAt\|updatedAt\|name\|viewCount\|upvoteCount]` |
| POST | `/api/decks` | `application/json` | `{ name, description?, format?, isPublic?, isDraft?, deckCards: [{ cardReference, quantity }] }` |
| GET | `/api/decks/{id}` | | Optional `?locale=en\|fr`. Detail includes `cards` **or** `deckCards` (PHP supports both). |
| PATCH | `/api/decks/{id}` | `application/merge-patch+json` | Partial update; deck contents replaced via `deckCards` |
| DELETE | `/api/decks/{id}` | | Owner only |
| POST | `/api/decks/{id}/upvote` | `application/json` | `{}` → `{ upvoteCount, hasUpvoted }` |

Known gaps (author, legality filter, Frontier pool): see [api-limitations/decks-api.md](api-limitations/decks-api.md).

Formats: `standard`, `nuc`, `singleton`, `singleton_nuc`, `sandbox`, `test`, `frontier`, `sealed`.

`cardReference` pattern: `ALT_[A-Z0-9]+_[A-Z0-9]+_[A-Z]+_\d+_[A-Z0-9]+(_\d+)?`

The PHP editor **does not call this API from the browser**. It POSTs to `/pages/deckbuilder?ajax=1` (CSRF + session) and the server proxies with the Keycloak token. This app calls `DECKS_API_URL` **directly**.

## PHP plugin proxies (`https://alteredcore.org/papi/core-altered-cards/...`)

Cookie + CSRF. Not required for the first milestone (this app is a parallel client):

| Endpoint | Purpose |
|---|---|
| `collection-search` | Filter search by physical collection |
| `ownership-search` | Digital ownership scope |
| `favorites-search` / `favorites-toggle` | Per-user favorites (local PHP DB) |
| `deck-add-card` | Incremental add: GET deck + PATCH full `deckCards` |
| `deck-alt-arts` | Alt-art options for a card in a deck |
| `playset` / `playset-cards` | Physical playset dashboard |

Ownership plugin (when enabled): `/papi/ownership/alt-art-search`, `alt-art-set-preference`.

## Local stack

The plugin runs in the site's local stack (`docker-compose.stack.yml`, see `../../README.md`): the shell passes the local service URLs through `window.AlteredCore.services`, so nothing is configured in the app.
