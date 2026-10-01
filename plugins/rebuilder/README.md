# rebuilder — Altered Re:Builder as an SPA plugin

The decks section of [Altered Re:Builder](https://github.com/Yutsa/altered-re-builder) (Angular 22), an
SPA page of the shell (manifest v2, `"type": "spa"`, Shadow DOM). It replaces the site's decks pages for the
visitors who turn on **Beta Deckbuilder** in the account menu (cookie `ac_beta`, this browser only), at the
same URLs: `/pages/decks`, `/pages/deck?id=…` and `/pages/deckbuilder?id=…` (manifest `beta_slugs`). Without
it, those URLs stay the pages of `core-altered-cards`. Shared links, QR codes and the site's own links
(`card.php`, tournament-reports) therefore open one or the other deckbuilder, and the site's Decks menu keeps
its single **Decks** entry. The pages it replaces keep answering their own calls (`?ajax=…`, form posts).

| Path | Content |
|---|---|
| `plugin.json` | Manifest v2: SPA page and its `beta_slugs`, API endpoints, build and e2e declarations |
| `meta.php` | Manifest `meta`: the deck's name as page title and link preview (`og:title`) on `deck?id=` and `deckbuilder?id=` |
| `papi/` | PHP endpoints of the plugin (`/papi/rebuilder/…`, `AlteredCore.page.apiUrl`): `community-builders` (the site's community deckbuilders) |
| `app/` | Angular sources, from Yutsa/altered-re-builder@8677b37 (see `app/CLAUDE.md` for the code rules) |
| `app/src/main.ts`, `app/src/app/embed/` | Start-up: reads `window.AlteredCore`, routes of the decks section, host session, shadow-root overlays and styles |
| `app/src/embed/` | Styles (shadow root, and `<head>` for fonts) |
| `e2e/` | Playwright scenarios run by CI against the full stack |
| `dist/` | Build output (`npm run build`), not committed |

## Build

```bash
cd plugins/rebuilder/app
nvm use            # Node 22.22.3
npm ci
npm run build   # → ../dist/browser + ../dist/embed-manifest.json
npm run lint && npm test
```


## What is embedded

The base href is `/pages/`. The app's routes are `decks/:id/…`; `LegacyUrlSerializer`
(`app/src/app/embed/legacy-url.serializer.ts`) writes them as the site's URLs:

| URL | Screen |
|---|---|
| `/pages/decks` | Decks: *Mes decks* (account and guest decks) and *Communauté* (`?tab=community`, public decks) |
| `/pages/deck?id={id}` | Deck page (cards; `&tab=deck`, `description`, `main`), actions |
| `/pages/deckbuilder` | New deck (hero, format, visibility) |
| `/pages/deckbuilder?id={id}` | Editor (card search and filters, deck list, validation, statistics, settings; `&view=apercu`, `deck`, `main`) |
| `/pages/rebuilder/…` | The plugin's own page: its former links (`decks/{id}`, `?id={id}`, `deck?id={id}`) land on the URLs above |

Signed in, decks are listed, created and saved on the decks API through the site's relay
(`/api/v1/services/decks`), which adds the Keycloak token of the PHP session server-side: the browser
never holds a token. They are the same decks as the site's (`/pages/decks` lists them too). As a guest
they stay in `localStorage` (`arb.guest-decks`). Sign-in is the site's (`AlteredCore.login()`), and the
site draws the navigation: the app's own menu button is hidden. The page keeps the site's content
width (`"fullwidth": false`), and each route tells the shell which menu entry is current
(route data `nav`, `AlteredCore.setActiveNav()`): the site's **Decks** entry.

On the local / CI stack, `docker/stack/seed-decks.php` creates 16 public decks (copies of legal
production decks, `docker/stack/community-decks.json`) so the *Communauté* tab has content.

The *Concours deck de démarrage* tab lists the Starter Deck Contest entries (winners by default, or every
entry) from a snapshot bundled with the plugin (`app/src/app/features/decks/contest/starter-deck-contest.json`,
copy of `core-altered-cards/data/starter-deck-contest-collection.json`); each entry is a public deck of the
decks API, opened by id. The local stack's decks API does not have them: their page is empty locally.

« Importer » › *Export altered.gg* imports the decks of an altered.gg personal-data export (the Equinox
ZIP) into the account, with the behaviour of the site's `equinox-deck-import` plugin: the ZIP is read
in the browser (`decks.csv`, `DecompressionStream`); with the « Global » alt-art preference of the
ownership API (relay `services.ownership`), the user's alt arts replace the exported cards; each deck is
created private with `POST /api/decks` through the relay, one per second, and a deck already in the
account (same name, same cards) is skipped. A failed deck stops the queue until « Réessayer » (3
attempts, then it is given up); the import can be paused or cancelled.

## Languages

The interface and the card data (names, effects, images) follow the site language (`AlteredCore.lang`,
`en` or `fr`; a change reloads the page). Sources are in French, marked with `@angular/localize`
(`i18n="@@area.key"` in templates, `` $localize`:@@area.key:Texte` `` in TypeScript); the English
translations are in `app/src/locale/messages.en.json`, loaded before the app modules when the site is in
English. `npm run lint` runs `npm run i18n:check`, which fails on a message without a custom id or an
English translation, and on a translation left over. Vocabulary: the site's deck builder
(`plugins/core-altered-cards/includes/deckbuilder/i18n.php`, `data/search_settings.json`).

## Known gaps

- « Importer » › *Liste de cartes* creates a guest deck when signed out.
- Theme: neutrals and brand colour follow the site (`--ac-*`); faction, rarity and printed-card colours
  keep ReBuilder's values.
