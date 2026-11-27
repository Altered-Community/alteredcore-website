# Hero tier list (`hero-tier-list`)

Community tool: rank the Altered heroes in tiers, from their full arts, and export the ranking as a PNG. SPA plugin
(Angular 22, zoneless) on `/pages/hero-tier-list`, mounted in a shadow root like Re:Builder; its menu entry goes in
« Communauté & Aide » (manifest `menu`, `parent_url`). The shell finds that menu by its URL (the HelloAsso form, as
on production in November 2026): if an admin changed it, the entry lands at the top level, to move by hand in the
admin's menu editor. Idea from a community HTML tool, rewritten for the site.

- **Heroes**: `GET {cards}/api/card_groups?cardType=HERO` (`AlteredCore.services.cards`). A hero is its card group
  (`AX-001-C`), its art the standard print of its first set.
- **Arts**: CDN frameless full art `illustrations/{SET}/{REF}_FRAMELESS_T1.webp`, then the HD JPEG, then
  `cards/assets/`. The CDN sends `Access-Control-Allow-Origin: *`, which the PNG export needs.
- **Moving heroes**: own drag and drop on pointer events (`src/app/tier-list/drag/hero-drag.ts`): the art follows the
  pointer, a slot shows the landing place in reading order (the empty end of a tier means « last »), the other heroes
  slide aside, the page and the pool auto-scroll. The Angular CDK was tried first: its wrapping lists insert before the
  nearest hero, so the end of a tier could not be reached. On touch screens a short press starts the drag (carried on
  by the touch events if the browser cancels the pointer), so swiping over the tiles still scrolls; a tap picks a hero
  and the action bar places it (tier, place in the tier, unrank), which also serves the keyboard.
- **State**: the ranking (tiers with their ordered hero ids, title) and the tile size in `localStorage`
  (`ac-hero-tier-list`), undo / redo for the visit. Nothing on the server.
- **Tier colours**: tokens `--ac-tier-*` of the design system (light and dark values).
- **PNG export**: canvas drawn from the ranking (`src/app/core/png-export.ts`), in the site's current theme.

## Develop

```bash
cd app && nvm use && npm ci
npm run lint && npm test && npm run build   # build → ../dist, served by the site
```

E2E (`e2e/`) runs with the site's Playwright against the full stack (`README.md` § Full stack), where the plugin is
active by default.

Code rules: the same as Re:Builder (`plugins/rebuilder/app/AGENTS.md`): signals, standalone components, one folder
per component, French sources with `@@ids` and English in `src/locale/messages.en.json`, `ac-*` classes and
`--ac-*` tokens only.
