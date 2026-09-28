# rebuilder — ReBuilder deck editor as an SPA plugin

The deck editor of [Altered Re:Builder](https://github.com/Yutsa/altered-re-builder) (Angular 22),
mounted by the shell on `/pages/deckbuilder` (manifest v2, `"type": "spa"`, Shadow DOM). It takes
the `deckbuilder` slug; the builder of `core-altered-cards` stays reachable on
`/pages/deckbuilder-legacy`, and the site's “New deck” / “Edit” buttons lead here
(`/pages/deckbuilder?id=…` is redirected to `/pages/deckbuilder/decks/{id}/edit`).

| Path | Content |
|---|---|
| `plugin.json` | Manifest v2: SPA page, menu entry, build and e2e declarations |
| `app/` | Angular sources, imported from Yutsa/altered-re-builder@4e613c6 (see `app/CLAUDE.md` for the code rules) |
| `app/src/main.embed.ts`, `app/src/app/embed/` | Embedded mode: reads `window.AlteredCore`, editor routes only, host session, shadow-root overlays and styles |
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

New deck (hero, format, visibility), editor (card search and filters, deck list, validation,
statistics, deck settings), preview, and the mobile deck view. Signed in, decks are created and
saved on the decks API with the site's Keycloak session (`AlteredCore.getAccessToken()`); as a
guest they stay in `localStorage` (`arb.guest-decks`). Deck lists, deck pages and sign-in are the
site's: the editor links to them.

## Known gaps

- Only the editor's main labels follow `AlteredCore.lang`; filters, formats and messages are French.
  Card data (names, effects, images) follows the site language.
- Guest decks of the legacy builder (`localStorage` key of core-altered-cards) are not read.
- Theme: neutrals and brand colour follow the site (`--ac-*`); faction, rarity and printed-card colours
  keep ReBuilder's values.
