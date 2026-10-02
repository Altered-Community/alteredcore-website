# Tokens

`tokens/tokens.css` holds every raw value of the site: colours, fonts, sizes, radii, shadows,
durations, control heights, layout sizes, z-indexes. Everything else (component CSS, the site's
CSS, PHP plugins, SPA plugins) reads them as `var(--ac-*)`.

The file is loaded once in the document `<head>`. Custom properties inherit through the Shadow
DOM, so SPA plugins mounted in a shadow root get the same values without importing anything.

This page says what each group is for. The values are in `tokens.css` (the reference page
`/pages/design-system` shows them in both themes); they are not repeated here except where the
number matters for layout.

## Rules

1. **No raw value outside `tokens/`.** A colour, radius, shadow, font size, spacing or control
   height in a component or plugin comes from a token. Layout-only values (a grid template, a
   `max-width` in `ch`, a percentage) are fine. `php tests/run.php` fails on hex colours in
   `css/` and in plugins, and on raw font sizes in the design system and Re:Builder.
2. **Every colour has a light and a dark value.** The light value is in `:root`, the dark value
   in `:root[data-theme='dark']`. A token that does not change between themes (faction and terrain colours) is declared
   once, and that is a decision, not an omission.
3. **No theme or density selector in components.** Never write `[data-theme='dark'] .x` or
   `[data-density='touch'] .x` in a component: add or reuse a token that has a dark or touch
   value. Components are injected into shadow roots, where selectors on `<html>` do not match.
4. **Choose by role, not by look.** Use `--ac-color-text-muted` for secondary text, not "the grey
   that looks right". If no role fits, add a token with a name that says what it is for.
5. **Contrast**: text tokens meet WCAG AA (4.5:1) on `--ac-color-surface`, `--ac-color-bg-app`
   and `--ac-color-bg-subtle` in both themes; each `*-soft` background meets 4.5:1 with its strong
   counterpart (`--ac-color-success-soft` with `--ac-color-success`…). Check contrast when adding
   a pair.
6. **Plugin-specific values** (game data, artwork overlays) go in the plugin section of
   `tokens.css`, named `--ac-<plugin>-<role>`, only when no semantic token covers them.

## Modes

Both modes are attributes set on `<html>` by the shell.

| Attribute | Values | Set when | Changes |
|---|---|---|---|
| `data-theme` | absent (light), `dark` | The visitor picks the dark theme (the admin panel is light only). | Every colour, shadow, the select chevron, `color-scheme`. |
| `data-density` | `pointer` (default), `touch` | Coarse pointer, or window under 768 px (script `dsDensityScript()` in `<head>`). | Control heights, hit area, field font sizes, segment sizes, page gutter, app bar height. |

## Colours · neutrals

The neutrals are blue-tinted, from the site's former azure theme: a very light blue page
(`--ac-color-bg-app`) under blue-white surfaces in the light theme, a deep navy in the dark theme.

| Token | Role |
|---|---|
| `--ac-color-text` | Main text, headings, icons that carry meaning. |
| `--ac-color-text-2` | Secondary text: unselected tabs and segments, icon buttons, table values. |
| `--ac-color-text-muted` | Hints, metadata, placeholders, overlines. |
| `--ac-color-text-disabled` | Disabled controls, empty-state icons. Not for readable text. |
| `--ac-color-border-dashed` | Dashed "add" buttons and drop zones. |
| `--ac-color-border-control` | Borders of inputs, selects, chips, secondary buttons. |
| `--ac-color-border` | Borders of cards, panels, menus, tables. |
| `--ac-color-divider` | Lines between rows, `<hr>`. |
| `--ac-color-chart-axis` | Chart axes and grid lines. |
| `--ac-color-track` | Neutral fills: segmented track, neutral badge, progress track, image placeholder. |
| `--ac-color-scrollbar`, `--ac-color-scrollbar-hover` | Scrollbar thumb, at rest and hovered (muted text colour, partly transparent). |
| `--ac-color-bg-app` | Page background. |
| `--ac-color-bg-subtle` | Hovered row, table header, subtle input, disabled field. |
| `--ac-color-surface` | Cards, panels, menus, dialogs, inputs. |
| `--ac-color-inverse` / `--ac-color-on-inverse` | High-emphasis fills and their text: counts, active pill tab, current page in pagination. Dark in the light theme, light in the dark theme. |
| `--ac-color-on-strong` | White text on a strong, theme-independent colour: faction colour, artwork, user-chosen group colour, success count. |

## Colours · brand

| Token | Role |
|---|---|
| `--ac-color-primary` | Primary buttons, selected borders, focus, links. |
| `--ac-color-primary-strong` | Hover of primary; text on `primary-soft`; active tab and segment text. |
| `--ac-color-primary-border` | Border of selected chips, outline primary buttons. |
| `--ac-color-primary-soft` | Selected chip, active menu item, info notice, avatar, text selection. |
| `--ac-color-primary-tint` | Very light selected background (selected radio card). |
| `--ac-color-on-primary` | Text and icons on `--ac-color-primary`. White in light theme, dark in dark theme: never assume white. |
| `--ac-color-link`, `--ac-color-link-hover` | Links (primary, primary-strong). |
| `--ac-color-focus` | Focus outline and rings. |

## Colours · semantic

| Token | Role |
|---|---|
| `--ac-color-success`, `--ac-color-success-soft` | Done, valid, public. |
| `--ac-color-danger`, `--ac-color-danger-soft` | Errors, invalid state. |
| `--ac-color-required` | Required asterisk, error text and border, danger buttons and menu items. |
| `--ac-color-warning`, `--ac-color-warning-soft` | Something to check, pending. |
| `--ac-color-info`, `--ac-color-info-soft` | Information (aliases of primary-strong / primary-soft). |
| `--ac-color-accent`, `--ac-color-accent-soft` | Special categories (Frontier, BGA). |
| `--ac-color-like` | Active "like" heart. |
| `--ac-color-discord` | Discord logo only (via `--ac-button-icon-color`), never text. |

## Colours · game and data

| Group | Tokens | Role |
|---|---|---|
| Data | `--ac-color-chart-main`, `--ac-color-chart-reserve` | Series of the cost histograms (hand, reserve). |
| Factions | `--ac-faction-axiom`, `-bravos`, `-lyra`, `-muna`, `-ordis`, `-yzmir` | Faction colours (chip dots, faction tabs). Same in both themes; text on them uses `--ac-color-on-strong`. |
| Terrains | `--ac-terrain-forest`, `-mountain`, `-ocean` | Terrain statistics. |
| Printed Unique card | `--ac-card-ink`, `-paper`, `-gold`, `--ac-card-font`, `--ac-card-icons`, `--ac-card-circled` | The printed-card rendering of Re:Builder's Unique editor: fixed colours and the Altered fonts, because it reproduces a physical card. |

## Colours · shell and overlays

| Token | Role |
|---|---|
| `--ac-color-hero-from`, `--ac-color-hero-to` | Gradient of the home hero banner. |
| `--ac-color-on-hero`, `--ac-color-on-hero-muted` | Text on the hero (gradient or the admin's banner image). |
| `--ac-color-hero-button`, `--ac-color-hero-button-hover`, `--ac-color-hero-button-border`, `--ac-color-on-hero-button` | Hero call to action (`.btn-hero`): a brighter blue than the gradient, with a light blue border. |
| `--ac-color-hero-scrim` | Veil over the banner image, under the hero text. |
| `--ac-color-placeholder-from`, `--ac-color-placeholder-to` | Gradient of an image placeholder (news card without a picture). |
| `--ac-header-*` | Site header (`themes/azure`): the brand blue bar with white text in both themes (a deeper blue in the dark theme), its menu items, icon buttons and account button. |
| `--ac-footer-bg`, `--ac-footer-border` | Site footer: a shade darker than the page, and its top border. |
| `--ac-shadow-on-image` | Text shadow for text over artwork. |
| `--ac-color-scrim` | Backdrop behind dialogs, drawers, the loader. |
| `--ac-select-chevron` | Chevron image of `.ac-select` (an SVG data URL in the muted colour, one per theme). |
| `--ac-color-overlay-control`, `-chip`, `-label`, `-strong`, `-light` | Controls and labels drawn over card artwork (counters, cost chips, lightbox, quantity badge, light buttons). |

## Typography

Font: `--ac-font-family` (Figtree, self-hosted in `fonts/`, then system fonts). Each style is a
`font` shorthand (weight, size, line height, family): use it as `font: var(--ac-font-body)`.

| Token | Weight / size / line height | Use |
|---|---|---|
| `--ac-font-display` | 800 / 28 px / 1.2 | Page title (with `--ac-letter-spacing-display`, −0.02em). |
| `--ac-font-title` | 800 / 20 px / 1.25 | Large title: standalone card, offline page. Dialogs, sheets and the app bar use it at `--ac-font-size-title-sm` (18 px). |
| `--ac-font-heading` | 800 / 17 px / 1.3 | Section heading. |
| `--ac-font-body-strong` | 700 / 15 px / 1.35 | Item titles. |
| `--ac-font-body` | 600 / 14 px / 1.4 | UI text: controls, lists, cards. |
| `--ac-font-prose` | 400 / 16 px / 1.6 | Long text (news, rules, CMS pages). |
| `--ac-font-small` | 600 / 13 px / 1.4 | Secondary lines, labels. |
| `--ac-font-caption` | 700 / 12 px / 1.3 | Badges, captions. |
| `--ac-font-micro` | 700 / 11 px / 1.2 | Axes, counts, tags. |
| `--ac-font-overline` | 700 / 12 px / 1.3 | Group labels, table headers (with uppercase and `--ac-letter-spacing-overline`, 0.06em). |

Text classes that apply them: [components/layout.md](components/layout.md#text-styles-basecss).

Sizes alone: `--ac-font-size-display` (28), `-title` (20), `-title-sm` (18: dialog, sheet and app-bar titles, key figures), `-heading` (17), `-prose` (16),
`-body-strong` (15), `-body` (14), `-small` (13), `-caption` (12), `-micro` (11). The shorthands above
are built from them. Use a size token when a component keeps its own weight or line height
(`font-size: var(--ac-font-size-small)`); prefer the shorthand otherwise. A size off this scale
needs a reason (artwork, a reproduced printed card) and stays local to its plugin.

## Spacing

A 4 px scale with a few half steps: `--ac-space-0-5` (2), `-1` (4), `-1-5` (6), `-2` (8), `-2-5`
(10), `-3` (12), `-4` (16), `-5` (20), `-6` (24), `-8` (32), `-10` (40), `-12` (48). Use them for
padding, margins and gaps.

## Radii

| Token | Value | Use |
|---|---|---|
| `--ac-radius-xs` | 4 px | Small thumbnails. |
| `--ac-radius-sm` | 6 px | Tags, image previews. |
| `--ac-radius-md` | 8 px | Segments, small buttons, menu items, pagination. |
| `--ac-radius-control` | 10 px | Buttons, fields. |
| `--ac-radius-lg` | 12 px | Segmented track, notices, menus, artwork, radio cards. |
| `--ac-radius-card` | 14 px | Cards, panels, tables. |
| `--ac-radius-dialog` | 16 px | Dialogs. |
| `--ac-radius-sheet` | 20 px | Top corners of a bottom sheet. |
| `--ac-radius-pill` | 999 px | Pills: chips, badges, counts, switches. |

## Elevation

| Token | Use |
|---|---|
| `--ac-shadow-e1` | Active segment, switch knob. |
| `--ac-shadow-card` | Raised card, hovered interactive card. |
| `--ac-shadow-e2` | Menus, dropdowns. |
| `--ac-shadow-e3` | Counter over a card. |
| `--ac-shadow-fab` | Floating action button. |
| `--ac-shadow-sheet`, `--ac-shadow-drawer` | Bottom sheet, side drawer. |
| `--ac-shadow-dialog` | Dialogs, the loader panel. |
| `--ac-ring-selected` | Double ring (surface gap + primary) around a selected tile. |

Shadows have a dark value (stronger, pure black) because a light shadow disappears on a dark
background.

## Motion

`--ac-duration-fast` (0.12 s: hover, colour changes) and `--ac-duration-base` (0.2 s: panels,
transforms). `ac-icon--spin` slows down under `prefers-reduced-motion`; `ac-spinner` does not (it only
runs during a wait).

## Density-dependent tokens

| Token | Pointer | Touch | Use |
|---|---|---|---|
| `--ac-control-sm` | 32 px | 36 px | Small buttons, chips, pill tabs, pagination. |
| `--ac-control-md` | 40 px | 44 px | Buttons, inputs, selects, menu items. |
| `--ac-control-lg` | 48 px | 52 px | Large buttons, list rows. |
| `--ac-hit-min` | 32 px | 44 px | Minimum clickable area (checkbox lines, custom targets). |
| `--ac-field-font-size` | 14 px | 16 px | Inputs (16 px prevents the iOS zoom on focus). |
| `--ac-select-font-size` | 13 px | 15 px | Selects. |
| `--ac-segment-height` | `--ac-control-sm` | `--ac-control-md` | Segmented options. |
| `--ac-segment-font-size` | 13 px | 14 px | Segmented options. |
| `--ac-icon-button-segment` | 32 px | 36 px | Icon-only segments. |
| `--ac-page-padding` | 24 px | 16 px | Horizontal page gutter. |
| `--ac-app-bar-height` | 60 px | 56 px | Re:Builder app bar. |

Heights are always one of these tokens, never a pixel value, so that everything grows together
on touch screens.

## Layout

| Token | Use |
|---|---|
| `--ac-header-height` | Height of the sticky site header, measured at runtime by `js/altered-core-host.js`. |
| `--ac-page-top`, `--ac-sticky-top` | Top of the page content and of sticky panels (under the site header). |
| `--ac-page-max-width`, `--ac-page-max-width-wide` | Content column (1200 px), wide tools (1600 px). |
| `--ac-site-max-width` | Header, footer and tool pages: they follow the screen width up to 2400 px. |
| `--ac-app-bar-height`, `--ac-bottom-nav-height` | Re:Builder app bar and bottom navigation (add `env(safe-area-inset-bottom)` to the latter). |
| `--ac-filter-panel-width`, `--ac-deck-panel-width`, `--ac-drawer-width` | Side panels of the builder screens. |

Breakpoints are not tokens (CSS cannot read variables in `@media`): 768 px and 1200 px, in
`tokens/breakpoints.scss` and `tokens/breakpoints.ts`. Write `@media (min-width: 768px)`,
`(min-width: 1200px)`, or `max-width: 767.98px` / `1199.98px`, nothing else.

## Z-index

| Token | Value | Use |
|---|---|---|
| `--ac-z-sticky` | 100 | Sticky bars and panels inside a page. |
| `--ac-z-header` | 1000 | Site header. |
| `--ac-z-overlay` | 1050 | Scrims, dialogs, drawers. |
| `--ac-z-toast` | 1100 | Toasts and the blocking loader. |

## Plugin-specific tokens

At the end of the `:root` block (and of the dark block for their dark values), grouped by plugin
(`core-altered-cards`, other PHP plugins, `rebuilder`). They cover values that only make sense for
one plugin: playset status colours, heatmap stops, the favourite star over artwork, the card zoom
backdrop. Name: `--ac-<plugin>-<role>`, with a comment saying where it is drawn.

## Deprecated names

`css/bridges/legacy.css` maps the variables used before the design system (`--sand-*`,
`--primary-*`, `--neutral-*`, `--notice-*`, a few plugin variables) to tokens, so old CSS follows
the new palette. Do not use them in new code. When migrating: the old palette had dark text on
the primary colour; the new one needs `var(--ac-color-on-primary)`.
