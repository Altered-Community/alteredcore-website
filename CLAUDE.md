# AlteredCore website

PHP 7.4 site (no framework, Bootstrap 5 from a CDN) with a plugin system: PHP plugins
(`plugins/<id>/`, manifest `plugin.json`) and SPA plugins (manifest v2, `"type": "spa"`, mounted in
a Shadow DOM, contract `window.AlteredCore` in `js/altered-core-host.js`). See `README.md`,
`CONTRIBUTING.md` and `plugins/README.html`.

## Interface: always the design system

Every screen — shell, core pages, PHP plugins, SPA plugins, admin — uses the design system in
`design-system/`. Before writing or changing any HTML, CSS or UI component, read
`design-system/README.md`; before changing the design system itself, also read
`design-system/CLAUDE.md`. For designing screens with `/design` and Claude Design, follow
`design-system/WORKFLOW.md`.

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
