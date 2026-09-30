# Components

One page per component family. Each page matches one file of `css/components/` (or
`css/base.css` for the text styles); the class names listed are the only ones that exist.

| Page | CSS | Contents |
|---|---|---|
| [layout.md](layout.md) | `layout.css`, `base.css` | Page column, page header, section title, stack, row, grid, divider, text styles, prose, `ac-sr-only`, SPA root |
| [icon.md](icon.md) | `icon.css` | Lucide icons, brand logos, sizes, spin; `ac_icon()`, `acIcon()`, legacy Font Awesome markup, Altered glyphs |
| [button.md](button.md) | `button.css` | Button (primary, secondary, danger, ghost, add), icon button |
| [field.md](field.md) | `field.css` | Field wrapper, label, hint, error, input, textarea, input with icon, select, checkbox / radio, switch |
| [listbox.md](listbox.md) | `listbox.css`, `js/ac.js` | Select drawn by the design system: search, groups, colour dots |
| [segmented.md](segmented.md) | `segmented.css` | Segmented control |
| [chips.md](chips.md) | `chips.css` | Chip, badge, tag, count, avatar |
| [card.md](card.md) | `card.css` | Card, list, empty state |
| [navigation.md](navigation.md) | `navigation.css` | Tabs, breadcrumb, pagination, menu |
| [feedback.md](feedback.md) | `feedback.css` | Notice, scrim, dialog, spinner, blocking loader, progress bar, table |
| [bootstrap-bridge.md](bootstrap-bridge.md) | `bridges/bootstrap.css` | Which Bootstrap classes are restyled, and when to use them |

Tokens (colours, type scale, spacing, radii, shadows, density, layout, z-index):
[../tokens.md](../tokens.md).

## Conventions used on every page

- **Class names**: `ac-<component>`, `ac-<component>__<part>`, `ac-<component>--<variant>`.
- **States** use ARIA attributes or native pseudo-classes when one exists (`aria-pressed`,
  `aria-current`, `aria-selected`, `aria-invalid`, `:disabled`). A few components also accept a
  class (`.is-active`, `.is-on`) for markup that cannot carry the attribute; prefer the attribute.
- **Density**: heights come from `--ac-control-sm | md | lg`, which grow in the touch density
  (`<html data-density="touch">`). A component never tests `data-density` or `data-theme`.
- **Themes**: every colour is a token with a light and a dark value, so the markup is the same in
  both themes.
- **Examples** are PHP (`h()` escapes, `t()` translates, `ac_icon()` draws an icon). The same
  markup works in a SPA plugin's shadow root, where the shell injects the component CSS.

## Frameworks

- **PHP pages and plugins**: write the classes directly, icons with `ac_icon()`.
- **Site scripts** building HTML: the same classes, icons with `acIcon(name)`.
- **Angular** (Re:Builder, `plugins/rebuilder/app/src/app/ui/`): components render the same look;
  the Re:Builder components are being renamed from `ar-*` to `ac-*` (`<button acButton>`,
  `<ac-segmented>`, `<ac-icon>`…). Each page lists the matching component.
- **React** (or another framework): write a thin component that renders the documented markup;
  icons with `lucide-react` and `className="ac-icon"`. Each page has a sketch.
