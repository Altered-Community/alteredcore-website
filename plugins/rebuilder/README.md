# rebuilder — Altered Re:Builder as an SPA plugin

The decks section of Altered Re:Builder (Angular 22), an SPA page of the shell (manifest v2, `"type": "spa"`,
Shadow DOM). Re:Builder only exists as this plugin: there is no standalone app any more (no `index.html`, no
Capacitor build, no auth BFF); it uses the site's session, header, menu and design system. It replaces the
site's decks pages for the
visitors who turn on **Beta Deckbuilder** in the account menu (cookie `ac_beta`, this browser only), at the
same URLs: `/pages/decks`, `/pages/deck?id=…` and `/pages/deckbuilder?id=…` (manifest `beta_slugs`). Without
it, those URLs stay the pages of `core-altered-cards`. Shared links, QR codes and the site's own links
(`card.php`, tournament-reports) therefore open one or the other deckbuilder, and the site's Decks menu keeps
its single **Decks** entry. The pages it replaces keep answering their own calls (`?ajax=…`, form posts).

| Path | Content |
|---|---|
| `plugin.json` | Manifest v2: SPA page and its `beta_slugs`, API endpoints, build and e2e declarations |
| `meta.php` | Manifest `meta`: the deck's name as page title and its link preview (title, hero · format, decklist image, faction colour: core-altered-cards `includes/deck-preview/preview.php`, shared with the site's deck page) on `deck?id=` and `deckbuilder?id=` |
| `papi/` | PHP endpoints of the plugin (`/papi/rebuilder/…`, `AlteredCore.page.apiUrl`): `community-builders` (the site's community deckbuilders), `my-deck-ids` (ids of the user's decks, for the editor's ownership check, without downloading every deck) |
| `app/` | Angular sources (see `app/AGENTS.md` for the code rules, `app/design/COMPONENTS.md` for the components) |
| `app/src/main.ts`, `app/src/app/embed/` | Start-up: reads `window.AlteredCore`, requests the page's deck while the modules download (`prefetch.ts`), routes of the decks section, host session, shadow-root overlays and styles |
| `app/src/embed/` | Global styles: `embed.scss` (shadow root, after the design system), `document.scss` (`<head>`: printed-card fonts) |
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

`build` is the only build (`ng build --stats-json`, production configuration, then `scripts/embed-manifest.mjs`,
which also lists in the manifest's `preload` the chunks each page imports before it can draw, read from esbuild's
metafile: the shell announces them in `<head>`).
The app is not served on its own: run it in the site's stack (`docker-compose.stack.yml`).

## Design system

The look comes from the site's design system, `design-system/` at the repository root
([README](../../design-system/README.md), [WORKFLOW](../../design-system/WORKFLOW.md)):

- Tokens are the site's `--ac-*` custom properties (`design-system/tokens/tokens.css`), defined on `:root`
  with the dark theme (`data-theme`) and the touch density (`data-density`, set on `<html>` by the shell).
  They inherit into the shadow root; the plugin defines none. A value no token covers goes in the
  `/* rebuilder */` slots of `tokens.css`.
- The shell injects `design-system/css/base.css` and `design-system/css/components/*.css` into the shadow
  root before the plugin's CSS. The container it creates (`.ac-plugin-root`) is the plugin root.
- Everything uses the `ac-` prefix (selectors, CSS classes, `Ac*` classes). Generic components (button, icon
  button, chip, badge, tag, count, avatar, card, input, select, segmented control, tabs, breadcrumb, icon)
  only set the design system's classes; their styles live in `design-system/css/components/`. To change one
  or add one, change the design system first (CSS, `design-system/docs/components/`, the
  `/pages/design-system` reference page), then the Angular component. Domain components (card tiles, deck
  rows, overlays…) keep their own SCSS, written with tokens only.
- Icons use Lucide names (`trash-2`, `ellipsis`, `sliders-horizontal`, `brand-discord`…), the same as
  `ac_icon()` on the site. `AcIcon` inlines the markup it needs and renders `<svg class="ac-icon">`.
- `app/src/app/core/breakpoints.ts` imports `BREAKPOINTS` from `design-system/tokens/breakpoints.ts`.
- `php tests/run.php` (repository root) fails on hex / `rgb()` / `hsl()` colours in the plugin's SCSS.

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
site draws the navigation. The page keeps the site's content
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

## Load performance

On a slow network the pages are bound by bytes and round trips. What keeps them fast:

- The shell requests every module a page needs from `<head>` (manifest `preload`, see Build), once the page's
  stylesheets have loaded; nothing is discovered one import at a time.
- `main.ts` requests the page's deck while the modules download (`src/app/embed/prefetch.ts`).
- The editor learns whether the deck is the user's from `papi/my-deck-ids` (ids only), not from the account's full
  deck list.
- JSON of the relay and of the plugin endpoints is gzipped (`includes/json-gzip.php`); the hashed build files are
  cached for a year (`.htaccess`, with `mod_headers`).
- Card art loads half a screen ahead on 3G or with the data saver (`AcViewportLoader`), and the test hand's code
  (with the CDK's drag and drop) only with its view (`@defer`).
- The runtime draws the first screen in the server skeleton's grid cell: no layout shift (CLS) when it replaces it.

`tests/e2e/perf-ab.mjs` measures two versions of the site side by side on an emulated 3G / slow 4G phone (FCP,
LCP, app drawn, page ready, images on screen, TTI, CLS, bytes; cold, warm and just-deployed cache): see its header.
Run it before and after a change that touches the load path.

## Known gaps

- « Importer » › *Liste de cartes* creates a guest deck when signed out.
- Theme: every colour comes from the site's tokens (`--ac-*`), including factions, terrains and the printed
  Unique card.
