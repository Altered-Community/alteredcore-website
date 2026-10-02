# Button and icon button

`css/components/button.css`.

A button runs an action (save, delete, open a dialog). A link styled as a button navigates
(`<a class="ac-button">`). Use one primary button per area (form, dialog, page header); the other
actions are secondary or ghost.

Do not use a button for navigation inside a set of views (use [tabs or a segmented
control](navigation.md)), or for a filter that toggles on and off (use a [chip](chips.md)).

## Button — `ac-button`

```php
<button type="submit" class="ac-button"><?= ac_icon('save') ?> <?= h(t('common.save')) ?></button>
<button type="button" class="ac-button ac-button--secondary"><?= ac_icon('copy') ?> <?= h(t('decks.duplicate')) ?></button>
<a class="ac-button ac-button--ghost" href="<?= BASE_URL ?>/pages/decks"><?= h(t('common.cancel')) ?></a>
```

### Variants

| Class | Look | Use |
|---|---|---|
| `ac-button` | Primary colour, `--ac-color-on-primary` text, bold | The main action of the area. |
| `ac-button--secondary` | Surface, control border, text colour | Other actions. |
| `ac-button--danger` | Like secondary, text in `--ac-color-required`; danger-soft background on hover | Destructive actions (delete, leave). Confirm before acting. |
| `ac-button--ghost` | No background, primary text; primary-soft on hover | Low-emphasis actions, "Cancel" next to a primary button. |
| `ac-button--add` | Dashed border, surface, primary text | "Add a …" placeholder at the end of a list or grid. |

### Sizes

| Class | Height |
|---|---|
| `ac-button--sm` | `--ac-control-sm` (32 px, 36 px touch), 13 px text, 12 px padding |
| (default) | `--ac-control-md` (40 px, 44 px touch) |
| `ac-button--lg` | `--ac-control-lg` (48 px, 52 px touch) |
| `ac-button--full` | Full width (add to any size) |

Heights follow the density: nothing to do in the markup.

### States

| State | How |
|---|---|
| Hover, keyboard focus | Automatic (`:hover`, `:focus-visible`): darker primary, subtle background for secondary. The global focus outline is drawn as well. Hover applies only on devices that can hover (`@media (hover: hover)`): on touch screens `:hover` sticks after a tap, so the control drawn next at the same spot would look hovered. |
| Disabled | `disabled` on a `<button>`; `aria-disabled="true"` on an `<a>` (and remove its `href` or prevent the click). Drawn at 45 % opacity with a `not-allowed` cursor; hover styles are off. |
| Loading | Disable the button and replace its icon with `<span class="ac-spinner" aria-hidden="true"></span>` or `ac_icon('loader-circle', 'ac-icon--spin')`; keep the label. |

### Brand icon colour

A button with a brand logo (Discord login) keeps the button's text colour and colours only the
icon: set `--ac-button-icon-color` on the button.

```php
<a class="ac-button ac-button--secondary" style="--ac-button-icon-color: var(--ac-color-discord)" href="…">
  <?= ac_icon('brand-discord') ?> <?= h(t('auth.discord')) ?>
</a>
```

## Icon button — `ac-icon-button`

Square button with an icon only: toolbars, card actions, close buttons.

```php
<button type="button" class="ac-icon-button" aria-label="<?= h(t('common.close')) ?>"><?= ac_icon('x') ?></button>
<button type="button" class="ac-icon-button ac-icon-button--ghost ac-icon-button--sm" aria-label="<?= h(t('decks.more')) ?>">
  <?= ac_icon('ellipsis-vertical') ?>
</button>
<button type="button" class="ac-icon-button" aria-label="<?= h(t('notifications.title')) ?>">
  <?= ac_icon('bell') ?><span class="ac-icon-button__dot"></span>
</button>
```

| Class | Effect |
|---|---|
| `ac-icon-button` | Surface, border, `--ac-color-text-2` icon, `--ac-control-md` square. |
| `ac-icon-button--ghost` | No border, no background (toolbars, inside cards). |
| `ac-icon-button--primary` | Primary background, `--ac-color-on-primary` icon. |
| `ac-icon-button--sm` / `--lg` | `--ac-control-sm` / `--ac-control-lg` square. |
| `ac-icon-button__dot` | 8 px primary dot in the top-right corner (unread, filter active). Describe it in the label ("Notifications, 3 unread"). |

Disabled: `disabled` (45 % opacity).

## Accessibility

- Use `<button type="button">` (or `type="submit"` in a form) for actions and `<a href>` for
  navigation. Never a `<div>` or `<span>` with a click handler.
- An icon-only button needs `aria-label` (and a `title` if a tooltip helps sighted users). The
  icon itself stays `aria-hidden` (the default of `ac_icon()`).
- A button that toggles something (show filters, mute) takes `aria-pressed="true|false"` or
  `aria-expanded` when it opens a panel.
- The small size (32 px) meets the pointer target minimum (`--ac-hit-min`); in touch density
  every size grows to at least 36 px, and `--ac-hit-min` becomes 44 px: do not force pixel heights.
- Contrast: primary text on primary is ≥ 4.5:1 in both themes. The disabled look (45 % opacity)
  is exempt from contrast rules but must not be the only sign of a disabled action when the
  reason matters: explain it next to the button.

## Frameworks

- **Angular**: attribute components on native elements, so the element stays a real button or link.

```html
<button acButton (click)="save()">Enregistrer</button>
<button acButton variant="secondary" icon="copy" (click)="duplicate()">Dupliquer</button>
<a acButton variant="ghost" size="sm" routerLink="/decks">Annuler</a>
<button acIconButton="x" ariaLabel="Fermer" variant="ghost" (click)="close()"></button>
```

`acButton` inputs: `variant` (`primary` | `secondary` | `ghost` | `add` | `danger`), `size`
(`sm` | `md` | `lg`), `icon`, `fullWidth`. `acIconButton` takes the icon name as its value, plus
`ariaLabel` (required), `variant` (`secondary` | `ghost` | `primary`), `size`, `iconSize`.

- **React**:

```tsx
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'add';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
};

export function Button({ variant = 'primary', size = 'md', icon: Icon, className, children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={cx('ac-button', variant !== 'primary' && `ac-button--${variant}`, size !== 'md' && `ac-button--${size}`, className)}
      {...rest}
    >
      {Icon && <Icon className="ac-icon" aria-hidden="true" />}
      {children}
    </button>
  );
}
```
