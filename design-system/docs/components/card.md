# Card, list, empty state

`css/components/card.css`.

A card groups the content about one thing (a deck, a news item, a settings section) on a surface
with a border. A list shows rows separated by dividers, alone or inside a card. The empty state
replaces a list or a grid that has nothing to show.

Do not nest cards; inside a card, separate parts with a list, a [divider](layout.md) or spacing.
Do not use a card only to add a border around a form field.

## Card — `ac-card`

Surface, `--ac-color-border`, 14 px radius, padding 12 px (16 px from 768 px wide).

```php
<section class="ac-card">
  <h2 class="ac-section-title"><?= h(t('account.profile')) ?></h2>
  …
</section>
```

Card with a picture, as a link:

```php
<a class="ac-card ac-card--flush ac-card--interactive" href="<?= h($newsUrl) ?>">
  <img class="ac-card__media" src="<?= h($item['image']) ?>" alt="">
  <div class="ac-card__body">
    <h3 class="ac-card__title"><?= h($item['title']) ?></h3>
    <p class="ac-card__meta"><?= h($date) ?> · <?= h($item['category']) ?></p>
    <div class="ac-card__footer">
      <span class="ac-badge ac-badge--blue"><?= h(t('news.new')) ?></span>
    </div>
  </div>
</a>
```

| Class | Effect |
|---|---|
| `ac-card--sm` | 12 px padding at every width. |
| `ac-card--flush` | No padding, content clipped to the radius (media cards, lists, tables). |
| `ac-card--raised` | No border, `--ac-shadow-card` (a card that floats over the page). |
| `ac-card--interactive` | The whole card is a link or button: pointer cursor; on hover (devices that can hover) and keyboard focus the border darkens and the card shadow appears. |

| Part | Role |
|---|---|
| `ac-card__media` | Full-width image, 16:9, `object-fit: cover`, track colour while loading. |
| `ac-card__body` | Padding for the text under a media (use with `--flush`). |
| `ac-card__title` | 15 px bold title. |
| `ac-card__meta` | 13 px muted line (date, author, counts). |
| `ac-card__footer` | Wrapping row of badges or actions, 12 px above. |

## List — `ac-list`

`<ul class="ac-list">` with `<li>` rows, or any container with `ac-list__item` children. Rows are
at least `--ac-control-lg` tall, 16 px horizontal padding, divider between rows (not above the
first).

```php
<div class="ac-card ac-card--flush">
  <ul class="ac-list">
    <?php foreach ($decks as $deck): ?>
      <li><?= ac_icon('layers') ?> <?= h($deck['name']) ?></li>
    <?php endforeach; ?>
  </ul>
</div>

<nav class="ac-card ac-card--flush" aria-label="<?= h(t('account.menu')) ?>">
  <div class="ac-list">
    <a class="ac-list__item" href="…"><?= ac_icon('user') ?> <?= h(t('account.profile')) ?></a>
    <a class="ac-list__item" href="…" aria-current="page"><?= ac_icon('settings') ?> <?= h(t('account.settings')) ?></a>
  </div>
</nav>
```

`a.ac-list__item` gets the subtle background on hover (devices that can hover) and focus. There is no selected style: mark
the current row with `aria-current="page"` and, if it must be visible, a badge or bold text.

## Empty state — `ac-empty`

Centred column, 40 px vertical padding, muted text; a leading icon is drawn at 32 px in the
disabled colour.

```php
<div class="ac-empty">
  <?= ac_icon('inbox') ?>
  <p class="ac-empty__title"><?= h(t('decks.empty_title')) ?></p>
  <p><?= h(t('decks.empty_text')) ?></p>
  <a class="ac-button" href="<?= BASE_URL ?>/pages/deckbuilder"><?= ac_icon('plus') ?> <?= h(t('decks.new')) ?></a>
</div>
```

Say what is missing and, when there is one, the action that fills it.

## Collapsible — `ac-collapsible`

A section that folds: a full-width header button with a chevron, and a body shown when open.
Bordered card by default; `ac-collapsible--bare` drops the border and background (inside a panel
that already has one). Closed by default.

```php
<div class="ac-collapsible">
  <button type="button" class="ac-collapsible__head" aria-expanded="false" aria-controls="stats-detail">
    <span class="ac-collapsible__chevron"><?= ac_icon('chevron-down') ?></span>
    <span class="ac-collapsible__title"><?= h(t('stats.detail')) ?></span>
  </button>
  <div class="ac-collapsible__body" id="stats-detail" hidden>…</div>
</div>
```

| Class | Effect |
|---|---|
| `ac-collapsible__head` | Header button, `--ac-control-md` + 4 px tall. Its `aria-expanded` is the state: the chevron points right when closed, down when open. Extra content after the title (a summary, a count) goes inside the button. |
| `ac-collapsible__title` | Field-size text (14 / 16 px touch), extra-bold. |
| `ac-collapsible__body` | Column, 10 px gap, `hidden` when closed. |
| `ac-collapsible--bare` | No border, no background, 16 px side padding. |

`js/ac.js` toggles `aria-expanded` and `hidden` on click: PHP pages only write the markup (closed:
`aria-expanded="false"` + `hidden`; open: `"true"` and no `hidden`).

## Density

Cards and empty states do not change with the density. List rows follow `--ac-control-lg`
(48 px pointer, 52 px touch).

## Accessibility

- Give a card that is a section a heading (`<h2>`/`<h3>`), and the section a name if it is a
  landmark (`<section aria-labelledby>`).
- An interactive card is a single `<a>` or `<button>`: do not put other links or buttons inside it.
  If the card needs several actions, make only its title a link and keep the actions as buttons.
- `ac-card__media` inside a link card is decorative (`alt=""`): the title names the link.
- The interactive hover style also applies on `:focus-visible`, on top of the global focus
  outline.

## Frameworks

- **Angular**: `<ac-card [padding]="'sm'">` (`padding`: `md` | `sm` | `none`) in
  `plugins/rebuilder/app/src/app/ui/containers/card-surface/`.
  `<ac-collapsible title="Stats" [(open)]="statsOpen" [bare]="true">` in `containers/collapsible/`
  (the host is the `ac-collapsible`; the body is rendered only when open). Lists and empty states
  are written with the classes.
- **React**:

```tsx
export function Card({ as: Tag = 'div', flush, interactive, raised, className, ...rest }: CardProps) {
  return <Tag className={cx('ac-card', flush && 'ac-card--flush', interactive && 'ac-card--interactive', raised && 'ac-card--raised', className)} {...rest} />;
}

export function EmptyState({ icon: Icon, title, children }: EmptyStateProps) {
  return (
    <div className="ac-empty">
      {Icon && <Icon className="ac-icon" aria-hidden="true" />}
      <p className="ac-empty__title">{title}</p>
      {children}
    </div>
  );
}
```
