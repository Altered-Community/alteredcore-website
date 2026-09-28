# AlteredCore backend contract

This SPA talks to the **same HTTP APIs** the community PHP deckbuilder uses. It does **not** vendor or fork [Yutsa/alteredcore-website](https://github.com/Yutsa/alteredcore-website). Endpoints below were read from that repo (`plugins/core-altered-cards/`, `auth/`, `config.local.php.example`) plus the live OpenAPI docs.

Configure bases in `src/environments/environment.ts` (production build) and `environment.development.ts` (`ng serve`). See `.env.example`.

## Hosts (production / preprod)

From `config.local.php.example` in the PHP site:

| Constant | Production host | Role |
|---|---|---|
| `CARDS_API_URL` | https://cards.alteredcore.org | Public card catalogue (API Platform / hydra-style JSON) |
| `DECKS_API_URL` | https://decks.alteredcore.org | Deck CRUD (Bearer Keycloak access token) |
| `CDN_URL` | https://cdn.alteredcore.org | Card art (`/cards/{lang}/{SET}/{REF}.webp`) |
| `UNIQUES_API_URL` | *(empty in prod example; local `http://localhost:8005`)* | rust-cards-api Uniques search |
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

This Angular app **does not** reuse the PHP session cookie (different origin, HttpOnly). Deck writes need a **Keycloak access token** for client `deckbuilder.yutsa.fr` on realm `players` (`https://auth.altered.re`).

The client is confidential (the token endpoint rejects a code exchange without client authentication) and requires PKCE S256. An SPA cannot hold the secret, so:

1. The browser starts **authorization code + PKCE** (`scope=openid profile`) and returns to `{origin}/login`. Username/password and Discord are the Keycloak login page, not a form in this app.
2. `server/auth-bff` (`npm run auth-bff`, proxied at `/auth`) exchanges the code. It reads **`KEYCLOAK_CLIENT_SECRET`** from the environment. That value must never be committed or bundled. The refresh token is an HttpOnly cookie on `Path=/auth` (`arb_refresh`, `SameSite=Lax`, `Secure` on https, `Max-Age` from Keycloak). The BFF does not keep a session in memory, so a process restart does not log the user out. The SPA stores the access token in `sessionStorage` (`arb.access_token`) for the open tab and a non-secret flag in `localStorage` (`arb.can_refresh`) so a new document after a deploy calls `POST /auth/refresh` and sends that cookie. The access token is sent as `Authorization: Bearer`.
3. Display name is the `pseudo` claim (access token, else id token). Email and `preferred_username` are not shown.

`/login` still accepts a pasted access token for local experiments. Guest decks stay in `localStorage` (`arb.guest-decks`) across login, logout, and an expired session. Copying them onto the account is optional and does not delete the local copies.

Redirect URIs Keycloak must allow: `https://deckbuilder.yutsa.fr/login`, `http://localhost:4200/login`, and any preview origin. Today only `https://deckbuilder.yutsa.fr/*` is accepted.

## CORS (probed 2026-09-23)

Both `cards.alteredcore.org` and `decks.alteredcore.org` answer CORS preflight with:

- `Access-Control-Allow-Origin: <request Origin>` (including `http://localhost:4200`)
- `Access-Control-Allow-Headers: content-type, authorization`
- `Access-Control-Allow-Methods: GET, OPTIONS, POST, PUT, PATCH, DELETE`

Native Capacitor WebViews often send a `capacitor://` / `http://localhost` origin — if a host is missing from the API CORS allow-list, use the Angular `proxy.conf.json` during `ng serve`, or a small BFF. `cdn.alteredcore.org` returns `Access-Control-Allow-Origin: *`.

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
| GET | `/api/ability_triggers` · `/api/ability_conditions` · `/api/ability_effects` | Effect vocabularies (`alteredId`, `text{fr,en…}`) for `effectSlot[N][trigger|condition|effect]` |
| GET | `/api/card_sub_types` | |
| GET | `/api/card_groups` | Used for hero grouping in the PHP editor |
| POST | `/api/auth/login` | Cards API login — **not** used by the PHP deckbuilder for decks |

Notes from production probing: `faction.code` (scalar) is the reliable single-faction filter; costs need explicit
`mainCost[]` / `recallCost[]` values (`1-3` returns 500); `order[setDate]` alone is not a stable sort (add
`order[cardNumber]`).

Uniques (probed 2026-09-26): a query answers from Meilisearch in ~0.2–1 s only if every parameter is a mapped
filter. `locale` is not, so `locale=fr` sends broad uniques queries to SQL (6–45 s, sometimes 504). The Uniques tab
leaves `locale` out and reads the locale maps (`name.fr`…). On that path `effectSlot[N][condition]=0` is matched
literally (0 results): send only the non-zero parts. Frontier: first request ~8–9 s, then ~1 s. Details and backend
fixes: [api-limitations/cards-api.md](api-limitations/cards-api.md).

Default deckbuilder filters (from `plugins/core-altered-cards/data/search_settings.json`): rarities `COMMON,RARE,EXALTED`, variation `standard`, sets `CORE,ALIZE,BISE,CYCLONE,DUSTER,EOLE`.

CDN art URL used by `card-search.js`:

```
{CDN_URL}/cards/{lang}/{SET}/{REFERENCE}.webp
```

`SET` is the second `_` segment of the reference (`ALT_CORE_B_AX_03_C` → `CORE`).

Uniques have no image of their own: `cards/{lang}/{SET}/ALT_…_U_374.webp` is 404 and the API `imagePath` (Equinox S3)
is 403. Every unique of a printed card shares one unique illustration, `{CDN_URL}/cards/assets/{SET}/{CARD}_U.webp`
(`CARD` = reference without `_U_n`), or `{CDN_URL}/illustrations/{SET}/{CARD}_U_FRAMELESS_T1.webp`. The PHP site draws
the card (frame, costs, powers, text) in a canvas with Altered-Card-Renderer; this app draws it with `ar-unique-card`.

## Uniques API (`UNIQUES_API_URL`)

When set, the Uniques tab uses rust-cards-api instead of `/api/cards`:

- `GET /api/v2/cards?limit=&cursor=&faction[]=&set[]=&name=&format=`
- `GET /api/v2/card/{ref}`
- `GET /api/v2/effects`
- `GET /api/v2/effects/filtered`

Leave empty to keep Uniques on the cards API (`rarity[]=UNIQUE`). The PHP site does the same in production: this
service is only wired in the local Aspire stack (`uniques-search-api`), with no public host.

## Decks API (`DECKS_API_URL`)

API Platform. **Unauthenticated `GET /api/decks` returns 401** (probed). Writes always need Bearer.
Anonymous reads (from `config/packages/security.yaml` in altered-core-decks-api): `GET /api/decks/public`
(`page`, `itemsPerPage`, `name`, `faction`, `format`, `hero`, `order[field]`), `GET /api/decks/{uuid}` for public decks
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

## Local Aspire / docker

The PHP example comments describe a local Aspire stack: website in Docker (`docker compose up` → http://localhost:8080), cards/decks/ownership as `*.local.gd` hosts, uniques API on port **8005**.

Point this app at that stack by editing `environment.development.ts`, or by using `proxy.conf.json` and setting the environment URLs to `/cards-api` and `/decks-api`.

This repository does not vendor those services.

## Blockers for a first run

1. **Deck list / save** — 401 without a Keycloak access token. Guest decks still work locally.
2. **Card search / detail** — works against production with CORS from `http://localhost:4200`.
3. **Keycloak** — client `deckbuilder.yutsa.fr` is confidential and PKCE S256. Run the auth BFF with `KEYCLOAK_CLIENT_SECRET` in the environment. Do not put that secret in this repo or in the Angular bundle.
4. **Capacitor** — confirm API CORS includes the WebView origin, or proxy through a backend.
