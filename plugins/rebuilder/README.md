# rebuilder — Altered Re:Builder as an SPA plugin

The decks section of [Altered Re:Builder](https://github.com/Yutsa/altered-re-builder) (Angular 22),
mounted by the shell on `/pages/rebuilder` (manifest v2, `"type": "spa"`, Shadow DOM). It sits next to
the site's own pages: `/pages/decks` and `/pages/deckbuilder` (plugin `core-altered-cards`) are
unchanged, and the plugin adds a **Re:Builder (beta)** entry to the site's **Decks** menu
(`/pages/rebuilder/decks`, manifest `parent_url`); new decks are created from that list.

| Path | Content |
|---|---|
| `plugin.json` | Manifest v2: SPA page, menu entry, build and e2e declarations |
| `app/` | Angular sources, imported from Yutsa/altered-re-builder@8677b37 (see `app/CLAUDE.md` for the code rules) |
| `app/src/main.embed.ts`, `app/src/app/embed/` | Embedded mode: reads `window.AlteredCore`, routes of the decks section, host session, shadow-root overlays and styles |
| `app/src/embed/` | Styles of the embedded build (shadow root, and `<head>` for fonts) |
| `e2e/` | Playwright scenarios run by CI against the full stack |
| `dist/` | Build output (`npm run build:embed`), not committed |

## Build

```bash
cd plugins/rebuilder/app
nvm use            # Node 22.22.3
npm ci
npm run build:embed   # → ../dist/browser + ../dist/embed-manifest.json
npm run lint && npm test
```

The standalone app still builds from the same sources (`npm run build`, `npm start`): the embedded
mode is a build configuration, not a fork. Android, the auth BFF, the standalone e2e and the design
mockups stayed in the ReBuilder repository.

## What is embedded

The base href is `/pages/rebuilder/` and the routes are the standalone app's, so the shared screens
navigate unchanged:

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

## Known gaps

- Only the editor's main labels and the page titles follow `AlteredCore.lang`; the decks list, filters,
  formats and messages are French. Card data (names, effects, images) follows the site language.
- Not ported from the site's decks page: the Starter Deck Contest tab, the community deckbuilders
  window, the Equinox ZIP import. « Importer » (decklist) creates a guest deck, as in the standalone app.
- The site's deck page and deck builder link to themselves, not to Re:Builder.
- Guest decks of the site's builder (`localStorage` key of core-altered-cards) are not read.
- Theme: neutrals and brand colour follow the site (`--ac-*`); faction, rarity and printed-card colours
  keep ReBuilder's values.
