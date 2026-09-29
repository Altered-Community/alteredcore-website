# Form fields

`css/components/field.css`.

Text inputs, text areas, selects, checkboxes, radios and switches, with their label, hint and
error message. Use them in every form of a new page or plugin.

Do not use a select for 2 to 5 options that the user switches between often: a [segmented
control](segmented.md) shows them all. Do not use a switch inside a form that is saved with a
button: a switch applies at once; use a checkbox.

## Field wrapper — `ac-field`

Column with a 6 px gap: label, control, hint or error.

```php
<div class="ac-field">
  <label class="ac-field__label" for="deck-name">
    <?= h(t('decks.name')) ?> <span class="ac-field__required" aria-hidden="true">*</span>
  </label>
  <input class="ac-input" id="deck-name" name="name" required
         aria-describedby="deck-name-hint" value="<?= h($name) ?>">
  <p class="ac-field__hint" id="deck-name-hint"><?= h(t('decks.name_hint')) ?></p>
</div>
```

| Part | Role |
|---|---|
| `ac-field__label` | `<label for>`; 13 px bold. |
| `ac-field__required` | Asterisk in `--ac-color-required`. Put `required` on the control as well. |
| `ac-field__hint` | Help text, muted. Link it with `aria-describedby`. |
| `ac-field__error` | Error message in `--ac-color-required`. Replaces or follows the hint. |

## Input and textarea — `ac-input`, `ac-textarea`

Height `--ac-control-md`, font size `--ac-field-font-size` (14 px, 16 px in touch density so
that iOS does not zoom on focus). The textarea is 2.5 control heights tall at least and resizes
vertically.

| Class / attribute | Effect |
|---|---|
| `ac-input--subtle` | Subtle background (search field in a toolbar). Input only. |
| `:focus` | Primary border and a 1 px primary ring (replaces the global outline). |
| `aria-invalid="true"` | Border in `--ac-color-required`. |
| `disabled` | Subtle background, disabled text colour. |

Error state:

```php
<div class="ac-field">
  <label class="ac-field__label" for="email"><?= h(t('account.email')) ?></label>
  <input class="ac-input" id="email" name="email" type="email"
         aria-invalid="true" aria-describedby="email-error" value="<?= h($email) ?>">
  <p class="ac-field__error" id="email-error"><?= h(t('account.email_invalid')) ?></p>
</div>
```

### Input with a leading icon — `ac-input-icon`

```php
<div class="ac-input-icon">
  <?= ac_icon('search') ?>
  <input class="ac-input ac-input--subtle" type="search" aria-label="<?= h(t('cards.search')) ?>"
         placeholder="<?= h(t('cards.search_placeholder')) ?>">
</div>
```

The icon (18 px, muted) is placed at the start and ignores clicks; the input gets a 38 px left
padding.

## Select — `ac-select`

Native `<select>` with the chevron drawn as a background image (`--ac-select-chevron`, one per
theme). Height `--ac-control-md`, font size `--ac-select-font-size` (13 px, 15 px touch), bold.

```php
<div class="ac-field">
  <label class="ac-field__label" for="sort"><?= h(t('cards.sort')) ?></label>
  <select class="ac-select" id="sort" name="sort">
    <option value="name"><?= h(t('cards.sort_name')) ?></option>
    <option value="cost" <?= $sort === 'cost' ? 'selected' : '' ?>><?= h(t('cards.sort_cost')) ?></option>
  </select>
</div>
```

Focus: primary border and ring. The select has no invalid or disabled style of its own; the
browser's disabled rendering applies.

## Checkbox and radio — `ac-check`

Native inputs, 18 px, coloured with `accent-color: var(--ac-color-primary)`. The label wraps the
input so the whole line is clickable; it is at least `--ac-hit-min` tall.

```php
<label class="ac-check">
  <input type="checkbox" name="public" value="1" <?= $public ? 'checked' : '' ?>>
  <?= h(t('decks.public')) ?>
</label>

<fieldset>
  <legend class="ac-field__label"><?= h(t('decks.format')) ?></legend>
  <label class="ac-check"><input type="radio" name="format" value="standard" checked> Standard</label>
  <label class="ac-check"><input type="radio" name="format" value="nuc"> NUC</label>
</fieldset>
```

## Switch — `ac-switch`

A checkbox drawn as a 36 × 20 px switch: off in the control border colour, on in primary.

```php
<label class="ac-switch">
  <input type="checkbox" role="switch" name="notify" <?= $notify ? 'checked' : '' ?>>
  <?= h(t('account.notifications')) ?>
</label>
```

Use it for a setting that applies immediately (the page saves it on `change`).

## Density

| Token | Pointer | Touch |
|---|---|---|
| `--ac-control-md` (input, select height) | 40 px | 44 px |
| `--ac-field-font-size` | 14 px | 16 px |
| `--ac-select-font-size` | 13 px | 15 px |
| `--ac-hit-min` (check, switch line) | 32 px | 44 px |

## Accessibility

- Every control has a visible `<label for>` (or wraps in one). A placeholder is not a label. A
  search field without a visible label gets `aria-label`.
- Group radios, and related checkboxes, in a `<fieldset>` with a `<legend>`.
- Mark required fields with `required` on the control; the asterisk is `aria-hidden` and a note
  at the top of the form explains it.
- Errors: `aria-invalid="true"` on the control, the message in `ac-field__error` linked by
  `aria-describedby`, and focus the first invalid field on submit. The error is not shown by
  colour alone: the message text is always there.
- Switches take `role="switch"` so screen readers announce "on / off".
- Contrast: control borders (`--ac-color-border-control`) are decorative; the label identifies
  the field. Focus is shown by the primary border and ring (3:1 against the surface).

## Frameworks

- **Angular**: `<ac-input>` (inputs `label`, `ariaLabel`, `placeholder`, `type`, `icon`,
  `required`, `invalid`, `clearable`, `appearance: 'default' | 'subtle'`, two-way `value`) and
  `<ac-select>` (`options`, `label`, `ariaLabel`, `inlineLabel`, two-way `value`), in
  `plugins/rebuilder/app/src/app/ui/fields/`. Both work with forms through a value accessor.

```html
<ac-input label="Nom du deck" [(value)]="name" [required]="true" />
<ac-input icon="search" appearance="subtle" ariaLabel="Rechercher" [(value)]="query" [clearable]="true" />
<ac-select label="Tri" [options]="sortOptions" [(value)]="sort" />
```

- **React**:

```tsx
export function TextField({ id, label, hint, error, ...rest }: TextFieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="ac-field">
      <label className="ac-field__label" htmlFor={id}>{label}</label>
      <input className="ac-input" id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...rest} />
      {error ? <p className="ac-field__error" id={`${id}-error`}>{error}</p>
             : hint && <p className="ac-field__hint" id={`${id}-hint`}>{hint}</p>}
    </div>
  );
}
```
