# Feedback and data

`css/components/feedback.css`: notice, toast, scrim, dialog, spinner, skeleton, blocking loader,
progress bar, table.

| Component | Use | Not for |
|---|---|---|
| Notice `ac-notice` | A message inside the page: result of a form, a warning about the current item, an explanation. | Messages that must interrupt the user (use a dialog). |
| Toast `ac-toast` | A short confirmation of an action that just happened, optionally with "Undo". Disappears by itself. | Errors or anything the user must read (use a notice or a dialog). |
| Dialog `ac-dialog` | A task or a confirmation that needs an answer before going on. | Long content or navigation (use a page). |
| Scrim `ac-scrim` | The dimmed layer behind a dialog, drawer or loader. | — |
| Spinner `ac-spinner` | A short wait inside a component (button, panel). | Waits the user should not interrupt (use the loader). |
| Skeleton `ac-skeleton` | Content that is loading, in the place and shape it will take: the page stays readable and nothing jumps when it arrives. | An empty state or a « 0 »: never show them before the data is there. |
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

## Toast — `ac-toast`

Dark pill-shaped bar (`--ac-color-inverse`) centred at the bottom of the screen, 14 px semibold
text, an optional primary action. It sits at `--ac-z-toast`, above dialogs. One at a time.

From a site script, `acToast()` builds it, removes it after 5 s and replaces the previous one:

```js
acToast('Deck deleted.', { actionLabel: 'Undo', onAction: restoreDeck });
acToast('Link copied.', { duration: 3000 });
```

Markup, for reference or for a SPA:

```php
<div class="ac-toast" role="status" aria-live="polite">
  <span class="ac-toast__message"><?= ac_icon('circle-check') ?> <?= h(t('deck.deleted')) ?></span>
  <button type="button" class="ac-toast__action"><?= h(t('common.undo')) ?></button>
</div>
```

| Class | Role |
|---|---|
| `ac-toast__message` | Text, with an optional icon before it. |
| `ac-toast__action` | Primary button, `--ac-control-sm` tall. |
| `--ac-toast-offset` | Set it (on the toast or an ancestor) to lift the toast above a fixed bottom bar, e.g. `var(--ac-bottom-nav-height)`. |

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
| `ac-dialog__title` | `--ac-font-title` at `--ac-font-size-title-sm` (18 px extra-bold). |
| `ac-dialog__body` | Content. |
| `ac-dialog__footer` | Actions aligned right; the primary one last. |
| `ac-scrim` | Fixed full-screen layer in `--ac-color-scrim`, `z-index: var(--ac-z-overlay)`. For panels that are not a native `<dialog>` (drawer, loader). |

Under 768 px the dialog becomes a bottom sheet: full width, stuck to the bottom, only the top
corners rounded (`--ac-radius-sheet`), `--ac-shadow-sheet`. Its actions stack full width at
`--ac-control-lg`, the primary one on top and « Cancel » (or « Reset »…) under it: the secondary
action stays visible, the close button is not its only replacement.

Confirm with this dialog, never with the browser's `confirm()` / `alert()` / `prompt()`: they
ignore the theme, the fonts and the bottom sheet.

### In an Angular plugin

Re:Builder does not render `ac-dialog` itself: its windows go through `AcOverlayService`
(`plugins/rebuilder/app/src/app/ui/overlay/`, CDK Dialog in the shadow root), which gives the same
centered window, bottom sheet under 768 px, Escape, backdrop and browser Back. Content puts its
actions in `ac-overlay-footer`, primary last, the secondary one with the `secondary-action` class
(stacked under the primary one in compact). For a yes / no question, use `openConfirm()`
(`features/shared/confirm/`):

```ts
openConfirm(this.overlay, {
  title: $localize`:@@deck.page.deleteTitle:Supprimer le deck ?`,
  message: $localize`:@@deck.page.deleteConfirm:« ${name}:name: » sera supprimé. Cette action est irréversible.`,
  confirmLabel: $localize`:@@deck.page.deleteAction:Supprimer`,
  icon: 'trash-2',
  danger: true,
}).subscribe((confirmed) => { if (confirmed) this.delete(); });
```

## Spinner — `ac-spinner`

20 px ring, track colour with a primary arc, one turn every 0.8 s.

```php
<span class="ac-spinner" aria-hidden="true"></span>
<span class="ac-sr-only" role="status"><?= h(t('common.loading')) ?></span>
```

## Skeleton — `ac-skeleton`

A track-coloured shape that pulses (still with `prefers-reduced-motion`). It takes the size the
layout gives it: width 100 % by default (or `--ac-skeleton-width`), height from the variant, the
layout or the content it replaces. Mark the loading region `aria-busy="true"` and give it a text
for screen readers; the shapes themselves are `aria-hidden`.

```php
<div class="ac-stack" aria-busy="true">
  <span class="ac-sr-only" role="status"><?= h(t('common.loading')) ?></span>
  <span class="ac-skeleton ac-skeleton--title" style="--ac-skeleton-width: 40%" aria-hidden="true"></span>
  <span class="ac-skeleton ac-skeleton--text" aria-hidden="true"></span>
  <span class="ac-skeleton ac-skeleton--text" style="--ac-skeleton-width: 70%" aria-hidden="true"></span>
  <div class="ac-grid" style="--ac-grid-min: 120px">
    <span class="ac-skeleton ac-skeleton--card" aria-hidden="true"></span>
    <span class="ac-skeleton ac-skeleton--card" aria-hidden="true"></span>
  </div>
</div>
```

| Variant | Shape |
|---|---|
| (none) | A block, 8 px radius; the layout sets its height. |
| `ac-skeleton--text` | A line of body text (0.8 em, pill). |
| `ac-skeleton--title` | A heading line (1.1 em, pill). |
| `ac-skeleton--control` | A field or a button (`--ac-control-md`). |
| `ac-skeleton--control-sm` | A small button (`--ac-control-sm`). |
| `ac-skeleton--badge` | A badge (`ac-badge`: `--ac-badge-height`, pill); `--ac-skeleton-width` sets its width. |
| `ac-skeleton--circle` | An avatar or an icon button (`--ac-control-md` square, round). |
| `ac-skeleton--card` | A card illustration (5 : 7, 12 px radius). |
| `ac-skeleton--panel` | A card or panel (14 px radius); the layout sets its height. |

SPA pages: the plugin's manifest `placeholder` renders a skeleton of the page from the server,
shown until the plugin draws its first screen (see `plugins/README.html`).

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

A bar measured against a cap (cards of a rarity against the format's maximum) takes a tone:
`ac-progress--success` when the cap is reached, `ac-progress--danger` when it is exceeded.

| Class | Use |
|---|---|
| `ac-progress--success` | Green bar: the cap is reached. |
| `ac-progress--danger` | Red bar: the cap is exceeded. |

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
16 px padding, divider between rows, subtle background on hover (devices that can hover). `ac-table__num` right-aligns a
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

- **Angular**: `<ac-toast actionLabel="Annuler" (action)="undo()">Deck supprimé.</ac-toast>`
  (`plugins/rebuilder/app/src/app/ui/containers/toast/`): the host is the `ac-toast`; Re:Builder
  sets `--ac-toast-offset` to its bottom navigation on phones.
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
