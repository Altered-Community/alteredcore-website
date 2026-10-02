# Working on the interface with Claude

How to design a screen or change a component, and get it into the code, with the tools the
project uses: Claude Code, its design mode (`/design`) and the Anthropic *design* plugin.

## The tools

| Tool | What it is | Use it for |
|---|---|---|
| **Claude Code** in this repo | Reads and edits the code. Loads `CLAUDE.md` and `design-system/CLAUDE.md`, which import the `AGENTS.md` files next to them (the same rules other agents read). | Implementing screens and components, migrating pages. |
| **`/design`** in Claude Code | Built-in command: drafts a design as a design artifact (canvas, editable artboards) from a brief, with the repo in context. | Designing a screen of a plugin: it sees the existing `ac-*` components and the plugin's code, and the same session can implement right after. |
| **Design plugin** (`design:design-handoff`, `design:design-system`, `design:design-critique`, `design:accessibility-review`, `design:ux-copy`) | Skills for Claude Code. | Handoff specs, design system audits, critiques, WCAG checks, UI copy. |

## Source of truth

**This folder is the source of truth**, because the code uses it. `/design` reads it from the repo
on every run, so there is no copy to keep in sync. A design that is not implemented here does not
exist for the code.

## Designing a new screen (most common case)

1. **Brief.** In Claude Code, at the repo root: `/design <the screen, who uses it, what it shows>`.
   Say which plugin it belongs to. The design reuses the `ac-*` components; ask it to flag
   anything the design system does not have yet.
2. **Iterate** on the artboards (edit texts, move elements) until the screen is right. Check both
   themes and a phone width.
3. **Handoff.** Ask for a handoff (`design:design-handoff` skill): layout, components used,
   states, responsive behaviour. New components go through the next section first.
4. **Implement** in the same session: the plugin's page uses `ac-*` classes (PHP) or the
   framework components (Angular, React). No new hex colour, no new pixel height.
5. **Check**: `/pages/design-system` for the components, the page itself in light, dark, and at
   375 px wide; `design:accessibility-review` on the result if the screen is new.

## Adjusting an existing pattern (variants in the real app)

For a change to something that already exists (spacing, order of the buttons, a mobile state, which
action is shown), compare variants on the real screens rather than on artboards: they render with the
real components, data and CSS.

1. **Scenario.** A module in `tests/e2e/variants/` (example: `sheet-secondary-action.mjs`): the scenes
   (URL + steps up to the state to show), the variants (CSS added to the page and to the plugins'
   shadow roots, `''` for the current state), the user and the viewports.
2. **Boards.** With the stack up (`README.md` § Full stack):
   `cd tests/e2e && node preview-variants.mjs variants/<scenario>.mjs` writes one image per scene and
   viewport, the variants side by side, in `tests/e2e/evidence/variants/<scenario>/`.
3. **Choose**, then write the rule where it belongs: the component CSS (`css/components/` or the
   plugin's overlay styles), its doc (`docs/components/`), the reference page, and the
   `AGENTS.md` of the plugin if agents must follow it. Keep the scenario: it shows why the rule is
   what it is, and re-running it checks the screens later.

## Adding or changing a component

1. Design it (`/design`), including every state: hover, focus, disabled, error,
   selected, dark theme, touch density.
2. Update, in this order:
   - `tokens/tokens.css` if a new value is needed (light **and** dark);
   - `css/components/<family>.css`;
   - `docs/components/<family>.md` (markup, variants, accessibility);
   - `pages/design-system.php` (the reference page);
   - the framework components that render it (Angular: `plugins/rebuilder/app/src/app/ui/`).
3. `php tests/run.php` (in Docker: `docker compose exec web php tests/run.php`).

## Changing tokens (colours, radii…)

Only in `tokens/tokens.css`, for both themes. Check contrast (WCAG AA: 4.5:1 for text, 3:1 for
large text and UI parts), then look at `/pages/design-system` in both themes.

## Reviewing a pull request that touches the interface

- No hex colour or pixel height outside `tokens/` (the tests catch colours in `css/` and plugins).
- New components are documented and on the reference page.
- Screenshots in light and dark, desktop and phone, in the PR description: the e2e evidence
  (`E2E_EVIDENCE_DIR`) composed and pushed by `node tests/e2e/pr-screenshots.mjs <pr>`.
