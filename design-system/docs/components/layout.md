# Layout and text

`css/components/layout.css` (page structure) and `css/base.css` (document defaults, text styles,
utilities).

Use these to place content on a page: a centred column, a header with the title and the page's
actions, vertical stacks and horizontal rows with standard gaps, a responsive grid of cards. They
carry no colour except the text colours of the text styles.

Do not use them for a component's internal layout (a card's footer, a toolbar inside a panel):
that belongs to the component, or to a few lines of plugin CSS with `gap: var(--ac-space-*)`.

## Page column — `ac-page`

Centred column, `max-width` from `--ac-page-max-width` (1200 px) plus the gutter on each side,
horizontal padding `--ac-page-padding` (24 px, 16 px in touch density), vertical padding 24 px
top, 40 px bottom.

| Class | Effect |
|---|---|
| `ac-page` | Regular page (news, account, lists). |
| `ac-page--wide` | `--ac-page-max-width-wide` (1600 px): tools with side panels. |
| `ac-page--full` | No max width. |

```php
<main class="ac-page">
  …
</main>
```

The site shell already puts most pages in a column; use `ac-page` in a PHP plugin page or a page
that opts out of the shell's column.

## Page header — `ac-page-header`

Title (display style), optional subtitle, optional actions aligned to the right. Wraps under the
title on narrow screens.

```php
<header class="ac-page-header">
  <div>
    <h1 class="ac-page-header__title"><?= h(t('decks.title')) ?></h1>
    <p class="ac-page-header__subtitle"><?= h(t('decks.subtitle')) ?></p>
  </div>
  <div class="ac-page-header__actions">
    <a class="ac-button ac-button--secondary" href="…"><?= ac_icon('upload') ?> <?= h(t('decks.import')) ?></a>
    <a class="ac-button" href="…"><?= ac_icon('plus') ?> <?= h(t('decks.new')) ?></a>
  </div>
</header>
```

| Part | Role |
|---|---|
| `ac-page-header__title` | The page's `<h1>`. One per page. |
| `ac-page-header__subtitle` | One sentence, muted, small. |
| `ac-page-header__actions` | Buttons; the primary action last. |

## Section title — `ac-section-title`

Heading style (17 px, 800) with a 12 px bottom margin. Put it on the `<h2>` of each section.

## Stack, row, grid, divider

| Class | Effect |
|---|---|
| `ac-stack` | Column, gap 16 px. `ac-stack--sm` 8 px, `ac-stack--lg` 24 px. |
| `ac-row` | Wrapping row, items centred vertically, gap 8 px. `ac-row--lg` 16 px, `ac-row--between` spreads items (label left, actions right). |
| `ac-grid` | Responsive grid: as many columns as fit, each at least `--ac-grid-min` (default 260 px), gap 16 px. |
| `ac-divider` | `<hr>` with the divider colour and 16 px vertical margin. |

```php
<div class="ac-grid" style="--ac-grid-min: 200px">
  <?php foreach ($decks as $deck): ?>
    <a class="ac-card ac-card--interactive" href="…">…</a>
  <?php endforeach; ?>
</div>
```

`--ac-grid-min` is the one inline value these classes read.

## Text styles (`base.css`)

| Class | Token | Use |
|---|---|---|
| `ac-text-display` | `--ac-font-display` (28 px, 800) + tight letter spacing | Page titles outside `ac-page-header`. |
| `ac-text-title` | `--ac-font-title` (20 px, 800) | Dialog or sheet title. |
| `ac-text-heading` | `--ac-font-heading` (17 px, 800) | Section heading. |
| `ac-text-strong` | `--ac-font-body-strong` (15 px, 700) | Item titles. |
| `ac-text-body` | `--ac-font-body` (14 px, 600) | UI text: controls, lists, cards. |
| `ac-text-small` | `--ac-font-small` (13 px, 600) | Secondary lines. |
| `ac-text-caption` | `--ac-font-caption` (12 px, 700) | Captions, metadata. |
| `ac-text-overline` | `--ac-font-overline`, uppercase, spaced, muted | Group labels above lists. |
| `ac-text-muted` | colour only (`--ac-color-text-muted`) | Combine with any of the above. |
| `ac-prose` | `--ac-font-prose` (16 px, 400, line height 1.6), max 72ch | Long text: news, rules, CMS pages. Headings, paragraphs, lists and images inside get spacing. |

The document defaults (body background and text, link colours, heading colour) are set on `body`
and on `.ac-plugin-root`, so they apply both in the page and inside a SPA shadow root.

## Utilities

- `ac-sr-only`: visually hidden, still read by screen readers. Use it for a heading a sighted user
  does not need, or a label next to an icon.
- `:focus-visible` draws a 2 px outline in `--ac-color-focus` on every focusable element. Do not
  remove it; a component that needs a different focus style (inputs) replaces it with a visible one.

## SPA root — `ac-plugin-root`

The element the shell mounts a SPA plugin into (inside its shadow root). It gets the document
defaults (background, text colour, font, `box-sizing: border-box`, inherited font on controls) and
`min-height: calc(100dvh - var(--ac-page-top))`. Plugins do not add it themselves.

## Density

`ac-page` follows `--ac-page-padding` (24 px pointer, 16 px touch). The gaps do not change with
the density.

## Accessibility

- One `<h1>` per page (`ac-page-header__title`), then `<h2>` per section in document order.
  Choose the heading level for the structure and the class for the look.
- `ac-row--between` and `ac-grid` change the visual order only by wrapping; keep the source order
  equal to the reading order.

## Frameworks

- **Angular**: Re:Builder lays its screens out with its own shell (`ac-app-bar`,
  `ac-bottom-nav`) and SCSS with tokens; the `ac-page*`, `ac-stack`, `ac-row` and `ac-grid`
  classes can be used directly in templates.
- **React**: use the classes directly (`<div className="ac-stack">`); a component is only worth
  it for `PageHeader`:

```tsx
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="ac-page-header">
      <div>
        <h1 className="ac-page-header__title">{title}</h1>
        {subtitle && <p className="ac-page-header__subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="ac-page-header__actions">{actions}</div>}
    </header>
  );
}
```
