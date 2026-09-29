# rebuilder — Altered Re:Builder as an SPA plugin

The decks section of Altered Re:Builder (Angular 22), mounted by the shell on `/pages/rebuilder`
(manifest v2, `"type": "spa"`, Shadow DOM). Re:Builder only exists as this plugin: there is no standalone
app any more (no `index.html`, no Capacitor build, no auth BFF); it uses the site's session, header, menu
and design system. It sits next to
the site's own pages: `/pages/decks` and `/pages/deckbuilder` (plugin `core-altered-cards`) are
unchanged, and the plugin adds a **Re:Builder (beta)** entry to the site's **Decks** menu
(`/pages/rebuilder/decks`, manifest `parent_url`); new decks are created from that list.

| Path | Content |
|---|---|
| `plugin.json` | Manifest v2: SPA page, menu entry, build and e2e declarations |
| `app/` | Angular sources (see `app/CLAUDE.md` for the code rules, `app/design/COMPONENTS.md` for the components) |
| `app/src/main.embed.ts`, `app/src/app/embed/` | Entry point: reads `window.AlteredCore`, routes of the decks section, host session, shadow-root overlays and styles |
| `app/src/embed/` | Global styles: `embed.scss` (shadow root, after the design system), `document.scss` (`<head>`: printed-card fonts) |
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

`build:embed` is the only build (`ng build`, production configuration, then `scripts/embed-manifest.mjs`).
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
site draws the navigation. The page keeps the site's content
width (`"fullwidth": false`), and each route tells the shell which menu entry is current
(route data `nav`, `AlteredCore.setActiveNav()`).

On the local / CI stack, `docker/stack/seed-decks.php` creates 16 public decks (copies of legal
production decks, `docker/stack/community-decks.json`) so the *Communauté* tab has content.

## Known gaps

- Only the editor's main labels and the page titles follow `AlteredCore.lang`; the decks list, filters,
  formats and messages are French. Card data (names, effects, images) follows the site language.
- Not ported from the site's decks page: the Starter Deck Contest tab, the community deckbuilders
  window, the Equinox ZIP import. « Importer » (decklist) creates a guest deck.
- The site's deck page and deck builder link to themselves, not to Re:Builder.
- Guest decks of the site's builder (`localStorage` key of core-altered-cards) are not read.
- Theme: every colour comes from the site's tokens (`--ac-*`), including factions, terrains and the printed
  Unique card.
