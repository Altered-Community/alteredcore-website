# Segmented control

`css/components/segmented.css`.

One choice among 2 to 5 short options, all visible: grid or list view, main deck or reserve, a
period filter. The selected option is raised on a neutral track.

Do not use it for more than 5 options or long labels (use a [select](field.md)), for switching
between sections of a page with their own content (use [tabs](navigation.md)), or for several
independent filters (use [chips](chips.md)).

## Markup

Buttons, when the choice changes the page in place:

```php
<div class="ac-segmented" role="group" aria-label="<?= h(t('decks.view')) ?>">
  <button type="button" aria-pressed="true"><?= ac_icon('layout-grid') ?> <?= h(t('decks.grid')) ?></button>
  <button type="button" aria-pressed="false"><?= ac_icon('list') ?> <?= h(t('decks.list')) ?></button>
</div>
```

The script that handles the click sets `aria-pressed="true"` on the chosen button and `"false"`
on the others.

Links, when the choice changes the URL (a server-side filter):

```php
<nav class="ac-segmented" aria-label="<?= h(t('decks.view')) ?>">
  <a href="?view=grid" <?= $view === 'grid' ? 'aria-current="page"' : '' ?>><?= ac_icon('layout-grid') ?> Grid</a>
  <a href="?view=list" <?= $view === 'list' ? 'aria-current="page"' : '' ?>><?= ac_icon('list') ?> List</a>
</nav>
```

Icon only:

```php
<div class="ac-segmented" role="group" aria-label="<?= h(t('decks.view')) ?>">
  <button type="button" class="ac-segmented__icon-only" aria-pressed="true" aria-label="<?= h(t('decks.grid')) ?>"><?= ac_icon('layout-grid') ?></button>
  <button type="button" class="ac-segmented__icon-only" aria-pressed="false" aria-label="<?= h(t('decks.list')) ?>"><?= ac_icon('list') ?></button>
</div>
```

## Variants

| Class | Effect |
|---|---|
| `ac-segmented` | Inline track, options as wide as their label. |
| `ac-segmented--full` | Full width, options share it equally (grid columns). |
| `ac-segmented--lg` | Options `--ac-control-md` tall, 14 px text. |
| `ac-segmented__icon-only` (on an option) | Square option of `--ac-icon-button-segment`. |

## States

The selected option is marked by one of: `aria-pressed="true"` (buttons), `aria-current`
(links), `aria-selected="true"` (when the control implements the ARIA tab pattern), or the
`.is-active` class. It gets the surface background, the `--ac-shadow-e1` shadow, primary-strong
text and bold weight. Other options darken their text on hover.

There is no disabled style; hide an option that does not apply rather than disabling it.

## Density

| Token | Pointer | Touch |
|---|---|---|
| `--ac-segment-height` | `--ac-control-sm` (32 px) | `--ac-control-md` (44 px) |
| `--ac-segment-font-size` | 13 px | 14 px |
| `--ac-icon-button-segment` | 32 px | 36 px |

The `--lg` variant uses `--ac-control-md` in both densities (40 / 44 px).

## Accessibility

- The container has a name: `role="group"` + `aria-label` for buttons, `<nav aria-label>` for
  links.
- Each option is a real `<button>` or `<a>`, reachable with Tab. Icon-only options need
  `aria-label`.
- The selected state is exposed by the ARIA attribute, not by the look alone.
- Selected text (primary-strong on surface) and unselected text (text-2 on track) meet 4.5:1 in
  both themes.

## Frameworks

- **Angular**: `<ac-segmented>` (`plugins/rebuilder/app/src/app/ui/fields/segmented/`), inputs
  `options` (`{ value, label?, icon?, ariaLabel? }[]`), `ariaLabel`, `fullWidth`, `size`
  (`sm` | `md` | `lg`), two-way `value`. Options with an icon and no label render icon-only.

```html
<ac-segmented ariaLabel="Affichage" [options]="views" [(value)]="view" />
```

- **React**:

```tsx
export function Segmented<T extends string>({ label, options, value, onChange, full }: SegmentedProps<T>) {
  return (
    <div className={cx('ac-segmented', full && 'ac-segmented--full')} role="group" aria-label={label}>
      {options.map(o => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.icon && <o.icon className="ac-icon" aria-hidden="true" />}
          {o.label}
        </button>
      ))}
    </div>
  );
}
```
