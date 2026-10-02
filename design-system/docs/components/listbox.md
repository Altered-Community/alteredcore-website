# Listbox

`css/components/listbox.css`, behaviour in `js/ac.js` (PHP pages) and `<ac-select>` (Angular).

A select whose list is drawn by the design system instead of the browser. It is how every
single-choice select of the site looks: the closed field is the `ac-select` box, the open list is
a panel like [`ac-menu`](navigation.md), with:

- a search field when there are 8 options or more (accents ignored, it also matches group names:
  "yz" finds every Yzmir hero);
- groups (`<optgroup>`) with a header that stays visible while scrolling, and the number of options
  in it;
- an optional colour dot per option or group (faction, user-chosen colour), repeated on the
  trigger for the selected option;
- the selected option in primary with a check; the option under the pointer or the keyboard in
  `--ac-color-bg-subtle`.

Use a [segmented control](segmented.md) instead for 2 to 5 options that the user switches between
often. Multiple selection is not covered: the card filters keep TomSelect.

## PHP pages: write a `<select>`

Nothing to call. `js/ac.js` draws every `select.ac-select` and `select.form-select` of the page,
including those added later by scripts. The `<select>` stays in the form, invisible:

- its value is submitted with the form, `required` still blocks the submit;
- picking an option sets it and dispatches `input` and `change`, so existing listeners run;
- what other scripts do to it is shown on the trigger: `sel.value = …`, `selectedIndex`, options
  rebuilt, `disabled`, `aria-invalid`, form reset;
- `<label for>` and `aria-label` name the trigger.

```php
<div class="ac-field">
  <label class="ac-field__label" for="hero"><?= h(t('decks.hero')) ?></label>
  <select class="ac-select" id="hero" name="hero">
    <option value=""><?= h(t('decks.hero_all')) ?></option>
    <?php foreach ($factions as $f): ?>
      <optgroup label="<?= h($f['name']) ?>" data-faction="<?= h($f['id']) ?>">
        <?php foreach ($f['heroes'] as $hero): ?>
          <option value="<?= h($hero['ref']) ?>" <?= $hero['ref'] === $current ? 'selected' : '' ?>><?= h($hero['name']) ?></option>
        <?php endforeach; ?>
      </optgroup>
    <?php endforeach; ?>
  </select>
</div>
```

| Attribute | On | Effect |
|---|---|---|
| `data-faction="axiom"` | `<optgroup>`, `<option>` | Dot in `--ac-faction-axiom`. |
| `data-color="…"` | `<optgroup>`, `<option>` | Dot in any CSS colour (a token, or a colour chosen by a user). |
| `data-ac-search="true" \| "false"` | `<select>` | Force the search field on or off (default: from 8 options). |
| `data-ac-search-placeholder` | `<select>` | Placeholder of the search field (default "Rechercher…" / "Search…"). |
| `data-ac-native` | `<select>` or an ancestor | Keep the browser's select. |
| `class="form-select-sm"` / `ac-select--sm` | `<select>` | Trigger at `--ac-control-sm`. |

An inline `style` of the `<select>` (a `max-width`) moves to the wrapper. CSS that sized the
`<select>` by its class must target the wrapper: `.bar .ac-listbox:has(> .my-select)`.

Scripts that build a select in a container that is not in the page yet can call
`acListbox(container)` once it is inserted; the page observer does it otherwise.

## Angular: `<ac-select>`

`plugins/rebuilder/app/src/app/ui/fields/select/`. Same markup and CSS, panel in the CDK overlay.

```html
<ac-select ariaLabel="Héros" [options]="heroes()" [value]="filters().hero" (valueChange)="patch({ hero: $event })" />
```

| Input | Type | Default | |
|---|---|---|---|
| `options` | `AcOption[]` | `[]` | `{ value, label, group?, color?, disabled? }`. Consecutive options with the same `group` are listed under it. |
| `value` | `string` (two-way) | `''` | Also a form control (`ControlValueAccessor`). |
| `label` / `ariaLabel` | `string` | `''` | Visible label, or the accessible name when there is none. |
| `inlineLabel` | `boolean` | `false` | Label on the left of the field, muted. |
| `searchable` | `'auto' \| boolean` | `'auto'` | Search field from 8 options. |
| `searchPlaceholder` | `string` | "Rechercher…" | |
| `disabled` | `boolean` | `false` | Also set by a disabled form control. |

`color` is any CSS colour, usually `var(--ac-faction-<id>)`. When all the options of a group have
the same colour, the dot is on the group header only.

## Markup

```html
<div class="ac-listbox">
  <button type="button" class="ac-listbox__trigger" role="combobox" aria-haspopup="listbox"
          aria-expanded="true" aria-controls="lb-list" aria-labelledby="lb-label lb-value">
    <span class="ac-listbox__value" id="lb-value">
      <span class="ac-listbox__dot" style="--ac-listbox-dot: var(--ac-faction-muna)"></span><span>Teija &amp; Nauraa</span>
    </span>
    {chevron-down}
  </button>
</div>
<div class="ac-listbox__panel">
  <div class="ac-listbox__search">{search}<input type="search" aria-controls="lb-list" aria-activedescendant="lb-o3"></div>
  <div class="ac-listbox__list" id="lb-list" role="listbox" aria-labelledby="lb-label">
    <div class="ac-listbox__option" role="option" id="lb-o0" aria-selected="false"><span class="ac-listbox__label">All heroes</span>{check}</div>
    <div class="ac-listbox__divider" role="presentation"></div>
    <div class="ac-listbox__group" role="group" aria-labelledby="lb-g0">
      <div class="ac-listbox__group-label" id="lb-g0">{dot}<span>Muna</span><span class="ac-listbox__count">1</span></div>
      <div class="ac-listbox__option is-active" role="option" id="lb-o3" aria-selected="true">…</div>
    </div>
  </div>
</div>
```

| Class / attribute | Role |
|---|---|
| `ac-listbox--sm` | Trigger at `--ac-control-sm`. |
| `ac-listbox__value--empty` | Trigger text in `--ac-color-text-2` when the empty-value option ("All …") is selected. |
| `aria-invalid="true"` on the trigger | Border in `--ac-color-required`. |
| `ac-listbox__panel` | Positioned by the script (`position: fixed`, in the top layer via `popover` on PHP pages). Below the trigger, above it when there is more room there; 360 px high at most. |
| `aria-selected="true"` | Selected option: primary text, check. |
| `is-active` | Option under the pointer or the keyboard (`aria-activedescendant`). |
| `aria-disabled="true"` | Disabled option, skipped by the keyboard. |
| `ac-listbox__label mark` | Letters that match the search. |
| `ac-listbox__empty` | "No match for …". |

## Keyboard

| Key | Closed | Open |
|---|---|---|
| <kbd>↓</kbd> <kbd>↑</kbd> <kbd>Enter</kbd> <kbd>Space</kbd> | Opens | Moves / picks (<kbd>Space</kbd> picks when there is no search field) |
| Letter | Opens and types in the search field, or jumps to the next option starting with it | Same |
| <kbd>Home</kbd> <kbd>End</kbd> | | First / last option (no search field) |
| <kbd>Esc</kbd> | | Closes, focus back on the trigger |
| <kbd>Tab</kbd> | | Closes and moves on |

Opening the list does not focus the search field, so touch keyboards stay closed until the user
taps it; a letter typed on the trigger moves into it (as in the Re:Builder `combobox`).

## Accessibility

- WAI-ARIA combobox with a listbox popup: `role="combobox"` on the trigger, `aria-expanded`,
  `aria-controls`; focus stays on the trigger or the search field, and `aria-activedescendant`
  points at the active option. Groups are `role="group"` named by their header.
- The trigger is named by the field's label plus its value (`aria-labelledby`), so screen readers
  say "Hero, Teija & Nauraa".
- Colour dots are decorative (`aria-hidden`); the group name carries the information.
- Rows are at least `--ac-hit-min` high (44 px in touch density); the search field uses
  `--ac-field-font-size` (16 px in touch density, no iOS zoom).
