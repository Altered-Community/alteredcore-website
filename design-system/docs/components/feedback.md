# Feedback and data

`css/components/feedback.css`: notice, scrim, dialog, spinner, blocking loader, progress bar,
table.

| Component | Use | Not for |
|---|---|---|
| Notice `ac-notice` | A message inside the page: result of a form, a warning about the current item, an explanation. | Messages that must interrupt the user (use a dialog). |
| Dialog `ac-dialog` | A task or a confirmation that needs an answer before going on. | Long content or navigation (use a page). |
| Scrim `ac-scrim` | The dimmed layer behind a dialog, drawer or loader. | — |
| Spinner `ac-spinner` | A short wait inside a component (button, panel). | Waits the user should not interrupt (use the loader). |
| Loader `ac-loader` | A blocking wait with a message (import, generation), optionally with progress. | Background loading of part of a page. |
| Progress `ac-progress` | Known progress of a task (0–100 %). | Unknown duration (use the spinner). |
| Table `ac-table` | Tabular data with columns to compare. | Layout; lists of items with one or two values (use a [list](card.md)). |

## Notice — `ac-notice`

Row with an optional icon (18 px) and a content block, 12 px radius, soft background and strong
text of the same colour. Default is information (primary-soft / primary-strong).

```php
<div class="ac-notice ac-notice--success" role="status">
  <?= ac_icon('circle-check') ?>
  <div>
    <p class="ac-notice__title"><?= h(t('deck.saved')) ?></p>
    <p><?= h(t('deck.saved_text')) ?> <a href="<?= h($deckUrl) ?>"><?= h(t('deck.open')) ?></a></p>
  </div>
</div>
```

| Class | Colours | Use |
|---|---|---|
| (default) | info-soft / info | Information |
| `ac-notice--success` | success-soft / success | Done |
| `ac-notice--warning` | warning-soft / warning | Something to check |
| `ac-notice--danger` | danger-soft / danger | Error, action failed |
| `ac-notice--neutral` | track / text-2 | Note without a tone |

`ac-notice__title` is extra-bold. Links inside take the notice colour and are underlined; the
last paragraph or list has no bottom margin.

Roles: `role="status"` for a message that appears after an action; `role="alert"` only for an
error that needs immediate attention; no role for a message present on page load.

## Dialog — `ac-dialog`, `ac-scrim`

Use the native `<dialog>`: `showModal()` gives the backdrop (drawn with `--ac-color-scrim`),
focus trapping and Escape.

```php
<dialog class="ac-dialog" id="delete-deck" aria-labelledby="delete-deck-title">
  <form method="post">
    <div class="ac-dialog__header">
      <h2 class="ac-dialog__title" id="delete-deck-title"><?= h(t('deck.delete_title')) ?></h2>
      <button type="button" class="ac-icon-button ac-icon-button--ghost" aria-label="<?= h(t('common.close')) ?>"
              onclick="this.closest('dialog').close()"><?= ac_icon('x') ?></button>
    </div>
    <div class="ac-dialog__body"><p><?= h(t('deck.delete_text')) ?></p></div>
    <div class="ac-dialog__footer">
      <button type="button" class="ac-button ac-button--ghost" onclick="this.closest('dialog').close()"><?= h(t('common.cancel')) ?></button>
      <button type="submit" class="ac-button ac-button--danger"><?= ac_icon('trash-2') ?> <?= h(t('common.delete')) ?></button>
    </div>
  </form>
</dialog>
```

| Part | Role |
|---|---|
| `ac-dialog` | Surface, 16 px radius, `--ac-shadow-dialog`, width up to 560 px, scrolls when taller than the viewport. |
| `ac-dialog__header` | Title and close button on one row. |
| `ac-dialog__title` | 18 px extra-bold. |
| `ac-dialog__body` | Content. |
| `ac-dialog__footer` | Actions aligned right; the primary one last. |
| `ac-scrim` | Fixed full-screen layer in `--ac-color-scrim`, `z-index: var(--ac-z-overlay)`. For panels that are not a native `<dialog>` (drawer, loader). |

Under 768 px the dialog becomes a bottom sheet: full width, stuck to the bottom, only the top
corners rounded (`--ac-radius-sheet`), `--ac-shadow-sheet`.

## Spinner — `ac-spinner`

20 px ring, track colour with a primary arc, one turn every 0.8 s.

```php
<span class="ac-spinner" aria-hidden="true"></span>
<span class="ac-sr-only" role="status"><?= h(t('common.loading')) ?></span>
```

## Blocking loader — `ac-loader`

A scrim with a centred panel: spinner, label and an optional progress bar. Put `ac-loader` on
the same element as `ac-scrim`; it sits at `--ac-z-toast`, above dialogs.

The shell provides one on every page (`includes/footer.php`, `#ac-spinner`); use its API rather
than adding another:

```js
window.acSpinner.show('Importing the collection…');
window.acSpinner.progress(40, 'Importing the collection… 40 %');
window.acSpinner.hide();
```

Markup, for reference or for a SPA that needs its own:

```php
<div class="ac-scrim ac-loader" role="status" aria-live="polite">
  <div class="ac-loader__panel">
    <div class="ac-loader__row">
      <span class="ac-spinner" aria-hidden="true"></span>
      <span class="ac-loader__label"><?= h(t('collection.importing')) ?></span>
    </div>
    <div class="ac-progress"><div class="ac-progress__bar" style="width: 40%"></div></div>
  </div>
</div>
```

| Part | Role |
|---|---|
| `ac-loader__panel` | Surface, 14 px radius, dialog shadow, at least 240 px wide. |
| `ac-loader__row` | Spinner and label side by side. |
| `ac-loader__label` | Body text. |

## Progress bar — `ac-progress`

6 px track, primary bar with rounded ends. Set the bar's width inline in percent; it animates
over 0.3 s.

```php
<div class="ac-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="<?= (int)$pct ?>"
     aria-label="<?= h(t('collection.progress')) ?>">
  <div class="ac-progress__bar" style="width: <?= (int)$pct ?>%"></div>
</div>
```

## Table — `ac-table`

Wrap the table in `ac-table-wrap` (border, 14 px radius, surface, horizontal scroll on narrow
screens).

```php
<div class="ac-table-wrap">
  <table class="ac-table">
    <thead>
      <tr><th scope="col"><?= h(t('cards.name')) ?></th><th scope="col" class="ac-table__num"><?= h(t('cards.copies')) ?></th></tr>
    </thead>
    <tbody>
      <?php foreach ($rows as $r): ?>
        <tr><td><?= h($r['name']) ?></td><td class="ac-table__num"><?= (int)$r['copies'] ?></td></tr>
      <?php endforeach; ?>
    </tbody>
  </table>
</div>
```

Header cells: overline style (12 px, uppercase, muted) on the subtle background. Rows: 10 px ×
16 px padding, divider between rows, subtle background on hover. `ac-table__num` right-aligns a
column with tabular figures.

## Density

None of these components change with the density, except the controls inside them (buttons in a
dialog footer follow `--ac-control-*`).

## Accessibility

- Notices convey their tone with colour and with the text (and the icon); the title or first
  words say what happened.
- Dialogs: `aria-labelledby` pointing to the title; opened with `showModal()` so focus moves in
  and returns to the opener on close; Escape closes; a destructive action is never the default
  focused button.
- Spinner: decorative; announce the wait with a visible label or `ac-sr-only` text in a
  `role="status"` element.
- Loader: `role="status"` with `aria-live="polite"` announces the label; it blocks the page, so
  always hide it on error as well as on success.
- Progress: `role="progressbar"` with `aria-valuenow` when the value is known.
- Tables: `<th scope="col">` (and `scope="row"` for row headers), a `<caption>` or a heading
  that names the table. Do not use a table for layout.
- All soft/strong pairs of the notices meet 4.5:1 in both themes.

## Frameworks

- **Angular**: Re:Builder opens dialogs and sheets with its overlay service
  (`plugins/rebuilder/app/src/app/ui/overlay/`, `<ac-overlay-container>`, `AcOverlayService`), which draws the
  panel (dialog on wide screens, bottom sheet on compact ones) with the same tokens. Notices, spinners and tables are written with the classes.
- **React**:

```tsx
export function Notice({ tone, title, icon: Icon = Info, children }: NoticeProps) {
  return (
    <div className={cx('ac-notice', tone && `ac-notice--${tone}`)} role="status">
      <Icon className="ac-icon" aria-hidden="true" />
      <div>
        {title && <p className="ac-notice__title">{title}</p>}
        {children}
      </div>
    </div>
  );
}
```

For dialogs, render a native `<dialog className="ac-dialog">` and call `showModal()` in an effect.
