# Icon

`css/components/icon.css`, `icons/` (generated), `php/ui.php` (`ac_icon()`), `js/ac.js` (`acIcon()`).

Icons are [Lucide](https://lucide.dev/icons/) stroke icons, drawn as inline SVG in the current
text colour, plus brand logos (filled) named `brand-<slug>` (`brand-github`, `brand-discord`,
`brand-bluesky`…). Use them in buttons, menu items, notices and empty states, next to a text
label in most cases.

Do not use an icon as the only way to convey a state or an action without a text alternative
(see Accessibility). Do not use the Altered game glyphs (`fak fa-…`) for interface actions: they
represent game concepts (factions, card types, collection).

## Markup

PHP:

```php
<?= ac_icon('house') ?>                               <!-- decorative, aria-hidden -->
<?= ac_icon('trash-2', 'ac-icon--16') ?>              <!-- extra classes -->
<?= ac_icon('circle-alert', '', t('form.error')) ?>   <!-- meaningful: role="img" + aria-label -->
<?= ac_icon($item['icon']) ?>                         <!-- a value typed in the admin -->
```

`ac_icon(string $ref, string $class = '', ?string $label = null)` accepts:

| Reference | Example | Result |
|---|---|---|
| Lucide name | `house`, `trophy`, `layout-grid` | Inline SVG |
| Brand | `brand-github` | Inline SVG (filled) |
| Font Awesome class list (legacy, from the menus in the database) | `fa-solid fa-house me-1` | The mapped Lucide icon (`icons/fa-map.json`); other classes (`me-1`) are kept, `fa-spin` becomes `ac-icon--spin` |
| Altered glyph | `fak fa-collection` | `<i class="fak fa-collection">`, drawn by `assets/font/alteredicons.css` |
| Unknown name | `nope` | Empty string |

Site scripts that build HTML:

```js
button.innerHTML = acIcon('trash-2') + ' ' + escapedLabel;
el.innerHTML = acIcon('check', 'ac-icon--16', 'Saved');   // name, extra class, label
```

`acIcon()` uses `icons/sprite.svg` (`<svg><use href="…#name">`). It takes Lucide and brand names
only, not Font Awesome class lists.

Legacy markup `<i class="fa-solid fa-house"></i>` still renders: `icons/fa-shim.css` draws the
mapped Lucide icon as a CSS mask (Font Awesome is no longer loaded). New code uses `ac_icon()`.

## Sizes

The icon is `1.15em` square by default, so it follows the font size of its parent. Fixed sizes:

| Class | Size |
|---|---|
| `ac-icon--14` | 14 px |
| `ac-icon--16` | 16 px |
| `ac-icon--18` | 18 px |
| `ac-icon--20` | 20 px |
| `ac-icon--24` | 24 px |

A component can set `--ac-icon-size` on the icon (the notice, the empty state and the menu do)
and `--ac-icon-stroke` for the stroke width (default 2).

## States

- `ac-icon--spin`: continuous rotation (loading). Slowed down to 3 s per turn when the user asks
  for reduced motion. For a loading state inside a component, prefer `ac-spinner`
  ([feedback.md](feedback.md)).
- Colour: always `currentColor`. Set the colour on the parent (or on the icon with a colour
  token), never a fill in the markup.

## Adding an icon

Every Lucide icon is available. For a Font Awesome name used by legacy markup that Lucide calls
differently, add it to `icons/fa-map.json`, then `cd design-system/icons && npm ci && npm run build`.
The generated files (`icons.php`, `sprite.svg`, `fa-shim.css`) are committed; do not edit them.

## Accessibility

- Decorative by default: `aria-hidden="true"` and `focusable="false"`. This is right when a text
  label sits next to the icon.
- An icon that carries meaning alone (a status icon in a table cell) needs the `$label`
  argument: it becomes `role="img"` with `aria-label`.
- An icon-only button gets its label on the button (`aria-label`), not on the icon: see
  [button.md](button.md).
- Contrast: an icon that conveys information needs 3:1 against its background (WCAG 1.4.11);
  the text colour tokens meet it in both themes.

## Frameworks

- **Angular**: `<ac-icon name="trash-2" [size]="16" />` (`plugins/rebuilder/app/src/app/ui/icon/`),
  inputs `name` (required), `size` (px, default 16), `strokeWidth` (default 2). Buttons take an
  `icon` input instead of a child icon.
- **React**: `lucide-react`, same names in PascalCase, with the class:

```tsx
import { Trash2 } from 'lucide-react';

<Trash2 className="ac-icon" aria-hidden="true" />
<Trash2 className="ac-icon ac-icon--16" aria-hidden="true" />
```

Brand logos are not in `lucide-react`: use the sprite (`<svg className="ac-icon"><use href="/design-system/icons/sprite.svg#brand-github" /></svg>`).
