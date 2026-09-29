# rebuilder — Altered Re:Builder as an SPA plugin

The decks section of [Altered Re:Builder](https://github.com/Yutsa/altered-re-builder) (Angular 22),
mounted by the shell on `/pages/rebuilder` (manifest v2, `"type": "spa"`, Shadow DOM). It sits next to
the site's own pages: `/pages/decks` and `/pages/deckbuilder` (plugin `core-altered-cards`) are
unchanged, and the plugin adds a **Re:Builder (beta)** entry to the site's **Decks** menu
(`/pages/rebuilder/decks`, manifest `parent_url`); new decks are created from that list.

| Path | Content |
|---|---|
| `plugin.json` | Manifest v2: SPA page, menu entry, build and e2e declarations |
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

The base href is `/pages/rebuilder/`:

| URL | Screen |
|---|---|
| `/pages/rebuilder/decks` | Decks: *Mes decks* (account and guest decks) and *Communauté* (`?tab=community`, public decks) |
| `/pages/rebuilder/decks/{id}` | Deck page (cards / decklist), actions |
| `/pages/rebuilder/decks/new` | New deck (hero, format, visibility) |
| `/pages/rebuilder/decks/{id}/edit` | Editor (card search and filters, deck list, validation, statistics, settings), preview |
| `/pages/rebuilder?id={id}` | Redirects to the editor (same link format as the site's deck builder) |

Signed in, decks are listed, created and saved on the decks API through the site's relay
(`/api/v1/services/decks`), which adds the Keycloak token of the PHP session server-side: the browser
never holds a token. They are the same decks as the site's (`/pages/decks` lists them too). As a guest
they stay in `localStorage` (`arb.guest-decks`). Sign-in is the site's (`AlteredCore.login()`), and the
site draws the navigation: the app's own menu button is hidden. The page keeps the site's content
width (`"fullwidth": false`), and each route tells the shell which menu entry is current
(route data `nav`, `AlteredCore.setActiveNav()`).

On the local / CI stack, `docker/stack/seed-decks.php` creates 16 public decks (copies of legal
production decks, `docker/stack/community-decks.json`) so the *Communauté* tab has content.

The *Concours deck de démarrage* tab lists the Starter Deck Contest entries (winners by default, or every
entry) from a snapshot bundled with the plugin (`app/src/app/features/decks/contest/starter-deck-contest.json`,
copy of `core-altered-cards/data/starter-deck-contest-collection.json`); each entry is a public deck of the
decks API, opened by id. The local stack's decks API does not have them: their page is empty locally.

« Importer » › *Export altered.gg* imports the decks of an altered.gg personal-data export (the Equinox
ZIP) into the account, like the site's `equinox-deck-import` plugin: the ZIP is read in the browser
(`decks.csv`, `DecompressionStream`), each deck is created private with `POST /api/decks` through the
relay (one per second), and a deck already in the account (same name, same cards) is skipped. Not done:
the alt-art « Global » preference of the ownership API, which is not behind the relay.

## Languages

The interface and the card data (names, effects, images) follow the site language (`AlteredCore.lang`,
`en` or `fr`; a change reloads the page). Sources are in French, marked with `@angular/localize`
(`i18n="@@area.key"` in templates, `` $localize`:@@area.key:Texte` `` in TypeScript); the English
translations are in `app/src/locale/messages.en.json`, loaded before the app modules when the site is in
English. `npm run lint` runs `npm run i18n:check`, which fails on a message without a custom id or an
English translation, and on a translation left over. Vocabulary: the site's deck builder
(`plugins/core-altered-cards/includes/deckbuilder/i18n.php`, `data/search_settings.json`).

## Known gaps

- Not ported from the site's decks page: the community deckbuilders window. « Importer » › *Liste de
  cartes* creates a guest deck.
- The site's deck page and deck builder link to themselves, not to Re:Builder.
- Guest decks of the site's builder (`localStorage` key of core-altered-cards) are not read.
- Theme: neutrals and brand colour follow the site (`--ac-*`); faction, rarity and printed-card colours
  keep ReBuilder's values.
