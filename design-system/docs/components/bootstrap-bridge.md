# Bootstrap bridge

`css/bridges/bootstrap.css`.

The site loads Bootstrap 5.3 for its grid, its spacing utilities and the pages written before the
design system. The bridge redraws Bootstrap's components with the design system tokens, so that
those pages look like the rest of the site, in both themes and both densities, without changing
their markup.

**Rule: new code uses the `ac-*` classes.** The bridge exists for pages not migrated yet (and the
admin panel). When you touch a page, you may keep its Bootstrap markup; when you write a new page,
a new plugin screen or a new component, use `ac-*` components and `--ac-*` tokens. Bootstrap's
grid (`row`, `col-*`), flex and spacing utilities (`d-flex`, `gap-2`, `mb-3`…) stay fine
everywhere in PHP pages.

The bridge is loaded by the shell after `bootstrap.min.css` (page and admin). It is **not**
injected into SPA shadow roots: SPA plugins use the `ac-*` classes only.

## What is restyled

| Bootstrap | Drawn as | `ac-*` equivalent for new code |
|---|---|---|
| Root variables (`--bs-body-*`, `--bs-border-*`, `--bs-link-*`, focus ring, shadows) | Tokens: Figtree, text and background colours, radii, shadows | — |
| `a`, headings, `hr` | Link colours, heavy headings, divider colour | base styles |
| `.btn`, `.btn-sm`, `.btn-lg` | Control heights (`--ac-control-*`), control radius, bold, icon gap | `ac-button`, `--sm`, `--lg` |
| `.btn-primary` | Primary | `ac-button` |
| `.btn-secondary`, `.btn-light`, `.btn-outline-secondary`, `.btn-outline-dark`, `.btn-outline-light` | Secondary (surface + control border) | `ac-button--secondary` |
| `.btn-outline-primary` | Surface with primary text and border | `ac-button--ghost` or `--secondary` |
| `.btn-danger`, `.btn-outline-danger` | Danger | `ac-button--danger` |
| `.btn-success`, `.btn-outline-success` | Success colours | (no equivalent; use primary) |
| `.btn-warning`, `.btn-outline-warning` / `.btn-info`, `.btn-outline-info` | Soft warning / info backgrounds | — |
| `.btn-dark` | Inverse | — |
| `.btn-link`, `.btn-close` | Link colour; close icon inverted in the dark theme | `ac-icon-button` with `ac_icon('x')` |
| `.form-label`, `.col-form-label`, `.form-text` | Field label, hint | `ac-field__label`, `ac-field__hint` |
| `.form-control`, `.form-select` (+ `-sm`, `-lg`), `.form-control-color` | Control heights, field font size (16 px in touch), control border, primary focus ring, disabled/readonly subtle | `ac-input`, `ac-textarea`, `ac-select` |
| `.form-check-input`, `.form-switch`, `.form-range` | Primary when checked, focus ring | `ac-check`, `ac-switch` |
| `.input-group-text` | Subtle add-on | `ac-input-icon` |
| `.card` | Surface, border, card radius; header/footer on the subtle background | `ac-card` |
| `.list-group` | Surface, dividers, primary-soft active item | `ac-list` |
| `.accordion` | Surface, bold buttons, chevron inverted in dark | — |
| `.modal`, `.modal-backdrop`, `.offcanvas` | Surface, dialog radius and shadow, scrim | `ac-dialog`, `ac-scrim` |
| `.toast`, `.popover`, `.tooltip` | Surface and border | — |
| `.dropdown-menu`, `.dropdown-item`, `.dropdown-header` | Same look as `ac-menu` | `ac-menu`, `ac-menu__item`, `ac-menu__label` |
| `.nav-tabs`, `.nav-pills` | Underline tabs, pills | `ac-tabs--underline`, `ac-tabs--pill` |
| `.pagination` | Inverse current page, `--ac-radius-md` | `ac-pagination` |
| `.breadcrumb` | Muted, 13 px | `ac-breadcrumb` |
| `.badge` | Pill, 12 px bold | `ac-badge` |
| `.alert` (`-primary`, `-info`, `-success`, `-warning`, `-danger`, `-secondary`, `-light`, `-dark`) | Soft backgrounds with strong text, no border | `ac-notice` and its tones |
| `.table` (`-striped`, `-hover`, `-light`, `-dark`) | Dividers, overline header cells | `ac-table` in `ac-table-wrap` |
| `.progress` | Track and primary bar | `ac-progress` |
| `.spinner-border`, `.spinner-grow`, `.placeholder` | Primary, track | `ac-spinner` |

Utilities that Bootstrap computes from fixed RGB values are redefined with tokens so they follow
the theme: `.text-primary | secondary | muted | body | dark | success | danger | warning | info |
white`, `.link-primary | secondary`, `.bg-primary | secondary | success | danger | warning | info |
light | white | body | dark` (with a matching text colour), `.text-bg-*`, `.border*`,
`.border-primary`, `.shadow-sm | shadow | shadow-lg`, `.rounded`, `.rounded-3`, `.rounded-4`.

## What is not covered

- Bootstrap's colour utilities not listed above (`.bg-*-subtle`, `.text-*-emphasis`,
  `.border-*-subtle`) use Bootstrap's own palette: do not use them.
- Site classes defined in `css/style.css` (`btn-primary-altered`, `card-altered`,
  `table-altered`, admin layout) are not part of the bridge.
- Inline colours in old markup (`style="background:#…"`) are not overridden: replace them with
  tokens when you touch the page.

## Migrating a page

1. Replace inline colours and legacy variables (`--sand-*`, `--primary-*`, `--neutral-*`, see
   `css/bridges/legacy.css`) with `--ac-*` tokens. Text on a primary background is
   `var(--ac-color-on-primary)`.
2. Replace components with their `ac-*` equivalent (table above), keeping Bootstrap's grid and
   spacing utilities if convenient.
3. Replace Font Awesome markup with `ac_icon()` ([icon.md](icon.md)).
4. Check the page in both themes and at 375 px wide.

## Accessibility

The bridge keeps Bootstrap's markup and behaviour (modals, dropdowns, collapses from
`bootstrap.bundle.js`), so the accessibility of those pages is Bootstrap's: keep the ARIA
attributes Bootstrap documents (`aria-labelledby` on modals, `aria-expanded` on toggles,
`aria-label` on `.btn-close`). Focus rings are redrawn with `--ac-color-focus`.

## Frameworks

SPA plugins never see the bridge (it is not injected into shadow roots): Angular and React code
uses the `ac-*` components documented on the other pages.
