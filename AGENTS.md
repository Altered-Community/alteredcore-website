# AlteredCore website

Instructions for coding agents (Codex, Cursor, Copilot, Claude Code, opencode…). Claude Code reads
them through `CLAUDE.md`, which imports this file.

Unofficial community website for the [Altered TCG](https://www.altered.gg/): **plain PHP 7.4, no
framework, no Composer, no build step for the core**, Bootstrap 5 from a CDN, MariaDB. It must run
on any standard shared hosting with Apache + `mod_rewrite` + PHP 7.4. That simplicity is a product
decision: **do not add framework/library/build dependencies to the core**.

## What is in the repo

| Path | Role |
|---|---|
| `pages/` | Core front-end pages, one `.php` file per slug, served through `pages/_router.php`. Also `design-system.php` (reference page). |
| `admin/` | Core admin panel, one `.php` file per section. `admin/plugins.php` installs/updates/activates plugins. |
| `includes/` | Shared runtime: `functions.php` (helpers), `db.php`, `header.php`/`footer.php`, `plugins.php`, `spa.php`, `_plugin_router.php`, `shortcodes.php`, `func.keycloak.php`, newsletter/RSS. |
| `plugins/` | **Plugin system — main development area.** See `plugins/AGENTS.md` and `plugins/README.html`. |
| `design-system/` | Tokens, `ac-*` components, Lucide icons, Bootstrap bridge — the look of every screen. |
| `themes/azure/` | Header, menu and footer templates + their CSS. |
| `css/style.css` | Shell and not-yet-migrated core page CSS. |
| `js/` | `altered-core-host.js` (SPA host contract), `pwa.js`, TinyMCE. |
| `auth/`, `api/v1/services/` | Authentication callbacks; authenticated service relay for SPA plugins. |
| `sql/` | Core schema. `data/altered.json` — game reference data. |
| `tests/` | `run.php` (plain-PHP checks) + Playwright `e2e/`. |
| `bin/plugins.php` | Plugin test/build/activate CLI (dev + CI, not deployed). |
| `docker/`, `docker-compose*.yml` | Local dev and full-stack environment. |
| `config.php` | Tracked constants. `config.local.php` (gitignored) holds secrets/instance config. |

## How a request is routed

`.htaccess` sends extensionless URLs to `.php` files, and rewrites three families:

- `/pages/{slug}` and `/pages/{slug}/{client/route}` → `pages/_router.php`. It serves a core page in
  `pages/` when the file exists, else tries the plugin pages.
- `/papi/{plugin-id}/{endpoint}` → `includes/_plugin_router.php` (JSON plugin API).
- `/api/v1/services/{service}/{path}` → `api/v1/services/proxy.php` (adds the user's Keycloak token
  server-side; the browser never holds a token).

`pages/_router.php` returns the full page: it buffers plugin output, injects boilerplate, then
`includes/header.php` + body + `includes/footer.php`. **Plugin pages therefore must not include the
header/footer themselves.**

## The plugin system

Two kinds, both declared by `plugins/<id>/plugin.json` (`plugins/plugin.schema.json`):

- **PHP plugins** — server-rendered pages, admin sections, JSON API endpoints, SQL, assets.
- **SPA plugins** (manifest v2, `"type": "spa"`, e.g. `plugins/rebuilder`) — a prebuilt front-end
  (Angular today) mounted by the shell in a Shadow DOM; contract `window.AlteredCore` in
  `js/altered-core-host.js`. Built by CI/`bin/plugins.php`, never committed.

Full plugin reference: **`plugins/AGENTS.md`** (working guide) and `plugins/README.html` (exhaustive
reference; open in a browser). Minimal example: `plugins/hello-world/`.

## Core building blocks (available everywhere)

- `getDB(): PDO`, `qp(string $sql)`, `q(string $sql)` — see Database below.
- `h(string): string` — HTML-escape output (`ENT_QUOTES`). **Always escape DB/user data.**
- `ac_icon('lucide-name')` — inline SVG icon; `BASE_URL` — site root without trailing slash.
- `getUiLang(): 'en'|'fr'`, `getLang(): 'en'|'fr'|'es'|'it'|'de'`.
- Auth: `kcIsLoggedIn()`, `kcUser()` (`sub`, `email`, `username`), `loginRequired()`. Works with
  local accounts and Keycloak transparently.
- `csrfToken()` / `csrfValid($t)`, `flash($msg, $type)`, `redirect($url)`.
- `getSetting()` / `saveSetting()`, `loadAlteredData('factions'|'sets'|…)`, `deckApiToken()`,
  `collApiRequest()`.
- JS: `window.acSpinner.show(msg)` / `.hide()` (global overlay), `bootstrap` (Bootstrap 5).

## Database

Two placeholder styles, always backtick-quoted and prefix-aware:

- Core tables: `q("SELECT … FROM {users}")` → `` `DB_PREFIXusers` ``.
- Plugin tables: `qp("SELECT … FROM {items}")` → `` `DB_PREFIXplugin_<table_prefix>_items` ``.
  `qp()` reads `$GLOBALS['_ac_current_plugin_prefix']`, set automatically by the router/dispatcher.

Plugins own their schema via `"sql": "sql/install.sql"` (full schema, runs once on first activation)
and `sql/update_{version}.sql` deltas (run in order when a higher-version ZIP is uploaded). Use
`CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` to stay re-runnable. Declare `"tables"` so
the delete dialog can offer to drop them.

## Interface: always the design system

Every screen — shell, core pages, PHP plugins, SPA plugins, admin — uses the design system in
`design-system/`. Before writing or changing any HTML, CSS or UI component, read
`design-system/README.md`; before changing the design system itself, also read
`design-system/AGENTS.md`. Design → code workflow: `design-system/WORKFLOW.md`.

The rules that matter most:

- Colours, radii, shadows, spacing, font sizes and control heights come from `var(--ac-*)`
  (`design-system/tokens/tokens.css`, the only file with raw values). No hex colour and no pixel
  height in page or plugin CSS.
- Use the `ac-*` components (`design-system/css/components/`, documented in
  `design-system/docs/components/`) before writing new CSS. Missing a reusable component? Add it
  to the design system first.
- Light and dark themes, pointer and touch densities: tokens handle them. Never write
  `[data-theme='dark']` rules or `px` control heights in page or plugin CSS.
- Icons: Lucide, `ac_icon('name')` in PHP, `acIcon('name')` in site JS, the framework's icon
  component in SPA plugins. No Font Awesome in new code (`fa-*` classes still render, through
  `design-system/icons/fa-shim.css`, for markup not migrated yet).
- Bootstrap stays for the grid, spacing utilities and pages not migrated yet; new code prefers
  `ac-*` classes.

## Conventions

- **PHP 7.4 only.** No framework, no Composer in the core. Comments in English.
- **Prefer plugins over core changes.** New features go in `plugins/`; only touch core files
  (`includes/`, `pages/`, `admin/`, `css/`) for genuinely site-wide infrastructure (routing, auth,
  theming). A plugin PR must not modify core files.
- Prefix every plugin function/global with its `table_prefix` (e.g. `hwGetMessages()`) to avoid
  collisions.
- Plugin API endpoints and service relay check CSRF on every write; **keep `GET` handlers
  read-only**. Escape all output with `h()`; use prepared statements for user input.
- List required new config in `config.local.php.example`, never in tracked files with secrets.
- Target the `dev` branch in PRs (see `CONTRIBUTING.md`); deploy is FTP via git-ftp.

## Checks

- PHP tests: `php tests/run.php` (in Docker: `docker compose exec web php tests/run.php`). It
  enforces breakpoints, icon coverage, documented components and **no hard-coded colours / raw font
  sizes**.
- Plugin plan/run: `php bin/plugins.php plan` and `php bin/plugins.php run <php-tests|node-tests|install|lint|test|build> [id…]`.
- SPA plugins: `plugins/<id>/plugin.json` → `build` (lint, test, build); e2e with Playwright in
  `tests/e2e` and `plugins/<id>/e2e` against the full stack (`README.md` § Full stack).
- Loading (skeletons, layout shifts): after any change to what a screen shows while it loads (placeholder, skeletons,
  data or images arriving after the first screen, the runtime), in `tests/e2e`:
  - `npm run loading`: every Re:Builder screen on a slow phone network, first and second visit, desktop and mobile
    (`plugins/rebuilder/e2e/loading.spec.ts`, also run by the CI). It fails on an empty frame, the app shown unstyled,
    the skeleton losing the site's font or a « Chargement… » title. A CLS over the screen's budget
    (`plugins/rebuilder/e2e/loading-budgets.json`: 0.01, or today's value for a known shift; lower a budget when a fix
    lands, never raise one to pass) is a warning, not a failure: on the CI, a pull request comment with a screenshot of
    the boxes that moved (job « CLS warnings »).
  - `npm run loading:timeline -- <screen> [--viewport <size> | --desktop] [--first-visit] [--frames] [--compare <other stack>]`:
    the loading frame by frame (empty frames in red, shifts marked) with its report, for the PR's evidence; `--compare`
    puts the base branch's stack (before) and this one (after) in one image. Header of `tests/e2e/loading-timeline.ts`
    for the options.
  - `npm run loading:matrix [-- --screens a,b --viewports a,b --runs n]`: the CLS of every screen at eight sizes (phones,
    tablet, laptops, desktops: `VIEWPORTS` in `tests/e2e/loading.ts`), on both sides of the breakpoints, in one table
    with what moved. Run it after a layout change that depends on the width (a breakpoint, a container query, a skeleton
    whose size is set for one width).
  - A new screen or a new loading state: add it to `plugins/rebuilder/e2e/screens.ts`; the recorder
    (`tests/e2e/loading.ts`) works for any SPA plugin.
