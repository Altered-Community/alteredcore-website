# AlteredCore website

Instructions for coding agents (Codex, Cursor, Copilot, Claude Code…). Claude Code reads them
through `CLAUDE.md`, which imports this file.

PHP 7.4 site (no framework, Bootstrap 5 from a CDN) with a plugin system: PHP plugins
(`plugins/<id>/`, manifest `plugin.json`) and SPA plugins (manifest v2, `"type": "spa"`, mounted in
a Shadow DOM, contract `window.AlteredCore` in `js/altered-core-host.js`). See `README.md`,
`CONTRIBUTING.md` and `plugins/README.html`.

## Interface: always the design system

Every screen — shell, core pages, PHP plugins, SPA plugins, admin — uses the design system in
`design-system/`. Before writing or changing any HTML, CSS or UI component, read
`design-system/README.md`; before changing the design system itself, also read
`design-system/AGENTS.md`. Design → code workflow: `design-system/WORKFLOW.md`.

The rules that matter most:

- Colours, radii, shadows, spacing, font sizes and control heights come from `var(--ac-*)`
  (`design-system/tokens/tokens.css`). No hex colour and no pixel height in page or plugin CSS.
- Use the `ac-*` components (`design-system/css/components/`, documented in
  `design-system/docs/components/`) before writing new CSS. Missing a reusable component? Add it
  to the design system first.
- Light and dark themes, pointer and touch densities: tokens handle them. Never write
  `[data-theme='dark']` rules in page or plugin CSS.
- Icons: Lucide, `ac_icon('name')` in PHP, `acIcon('name')` in site JS, the framework's icon
  component in SPA plugins. No Font Awesome in new code (`fa-*` classes still render, through
  `design-system/icons/fa-shim.css`, for markup not migrated yet).
- Bootstrap stays for the grid, spacing utilities and pages not migrated yet; new code prefers
  `ac-*` classes.

## Checks

- PHP tests: `php tests/run.php` (in Docker: `docker compose exec web php tests/run.php`).
- SPA plugins: `plugins/<id>/plugin.json` → `build` (lint, test, build); e2e with Playwright in
  `tests/e2e` and `plugins/<id>/e2e` against the full stack (`README.md` § Full stack).
- Loading (skeletons, layout shifts): after any change to what a screen shows while it loads (placeholder, skeletons,
  data or images arriving after the first screen, the runtime), in `tests/e2e`:
  - `npm run loading`: every Re:Builder screen on a slow phone network, first and second visit, desktop and mobile
    (`plugins/rebuilder/e2e/loading.spec.ts`, also run by the CI). It fails on an empty frame, the app shown unstyled,
    the skeleton losing the site's font, a « Chargement… » title, or a CLS over the screen's budget
    (`plugins/rebuilder/e2e/loading-budgets.json`: 0.01, or today's value for a known shift; lower a budget when a fix
    lands, never raise one to pass).
  - `npm run loading:timeline -- <screen> [--viewport <size> | --desktop] [--first-visit] [--frames] [--compare <other stack>]`:
    the loading frame by frame (empty frames in red, shifts marked) with its report, for the PR's evidence; `--compare`
    puts the base branch's stack (before) and this one (after) in one image. Header of `tests/e2e/loading-timeline.ts`
    for the options.
  - `npm run loading:matrix [-- --screens a,b --viewports a,b --runs n]`: the CLS of every screen at seven sizes (phones,
    tablet, laptops, desktops: `VIEWPORTS` in `tests/e2e/loading.ts`), on both sides of the breakpoints, in one table
    with what moved. Run it after a layout change that depends on the width (a breakpoint, a container query, a skeleton
    whose size is set for one width).
  - A new screen or a new loading state: add it to `plugins/rebuilder/e2e/screens.ts`; the recorder
    (`tests/e2e/loading.ts`) works for any SPA plugin.
