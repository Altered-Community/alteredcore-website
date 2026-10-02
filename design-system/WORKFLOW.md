# Working on the interface with Claude

How to design a screen or change a component, and get it into the code, with the tools the
project uses: Claude Code, its design mode (`/design`), Claude Design (claude.ai/design) and the
Anthropic *design* plugin.

## The tools

| Tool | What it is | Use it for |
|---|---|---|
| **Claude Code** in this repo | Reads and edits the code. Loads `CLAUDE.md` and `design-system/CLAUDE.md`, which import the `AGENTS.md` files next to them (the same rules other agents read). | Implementing screens and components, migrating pages. |
| **`/design`** in Claude Code | Built-in command: drafts a design as a Claude Design artifact (canvas, editable artboards) from a brief, with the repo in context. | Designing a screen of a plugin: it sees the existing `ac-*` components and the plugin's code, and the same session can implement right after. |
| **Claude Design** (claude.ai/design) | Standalone design tool with *design system projects*, prototypes and exports. | Free exploration, sharing designs with other contributors, keeping the visual reference of the design system. |
| **`/design-login`, `/design-sync`** in Claude Code | Log Claude Code into claude.ai, then sync a local component library with a Claude Design design-system project, component by component, in both directions. | Keeping the Claude Design project equal to this folder. |
| **Design plugin** (`design:design-handoff`, `design:design-system`, `design:design-critique`, `design:accessibility-review`, `design:ux-copy`) | Skills for Claude Code. | Handoff specs, design system audits, critiques, WCAG checks, UI copy. |

## Source of truth

**This folder is the source of truth**, because the code uses it. The Claude Design project
"AlteredCore" is a copy that `/design-sync` keeps up to date. A design made in Claude Design that
is not synced back here does not exist for the code.

## One-time setup

1. In Claude Code, run `/design-login` (once per machine).
2. Run `/design-sync` from the repo root and pick (or create) the design-system project
   "AlteredCore". The first sync pushes the tokens, the component files and the reference
   previews. Review the plan it shows before it writes anything.

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

## Adding or changing a component

1. Design it (Claude Design or `/design`), including every state: hover, focus, disabled, error,
   selected, dark theme, touch density.
2. Update, in this order:
   - `tokens/tokens.css` if a new value is needed (light **and** dark);
   - `css/components/<family>.css`;
   - `docs/components/<family>.md` (markup, variants, accessibility);
   - `pages/design-system.php` (the reference page);
   - the framework components that render it (Angular: `plugins/rebuilder/app/src/app/ui/`).
3. `php tests/run.php` (in Docker: `docker compose exec web php tests/run.php`).
4. `/design-sync` to push the component to the Claude Design project.

## Changing tokens (colours, radii…)

Only in `tokens/tokens.css`, for both themes. Check contrast (WCAG AA: 4.5:1 for text, 3:1 for
large text and UI parts), then look at `/pages/design-system` in both themes, then `/design-sync`.

## Reviewing a pull request that touches the interface

- No hex colour or pixel height outside `tokens/` (the tests catch colours in `css/` and plugins).
- New components are documented and on the reference page.
- Screenshots in light and dark, desktop and phone, in the PR description.
