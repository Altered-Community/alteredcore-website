# Navigation

`css/components/navigation.css`: tabs, breadcrumb, pagination, menu.

| Component | Use | Not for |
|---|---|---|
| Tabs `ac-tabs` | Switch between sections of the same page or between sibling pages (Deck / Stats / Export). | One choice that filters the same content: use a [segmented control](segmented.md). |
| Breadcrumb `ac-breadcrumb` | Show where a detail page sits (Decks › My deck) and go back up. | The only way back on a phone: add a back button too. |
| Pagination `ac-pagination` | Move through pages of a long server-rendered list. | Lists that load more on scroll. |
| Menu `ac-menu` | A floating panel of actions or links (account menu, "more" menu of a card). | Primary navigation of the site (the shell provides it). |

## Tabs — `ac-tabs`

Two appearances, each set with a modifier on the container; the tabs are its direct `<button>`
or `<a>` children.

```php
<nav class="ac-tabs ac-tabs--underline" aria-label="<?= h(t('deck.sections')) ?>">
  <a href="?tab=cards" <?= $tab === 'cards' ? 'aria-current="page"' : '' ?>><?= h(t('deck.cards')) ?> <span class="ac-tabs__count"><?= (int)$count ?></span></a>
  <a href="?tab=stats" <?= $tab === 'stats' ? 'aria-current="page"' : '' ?>><?= h(t('deck.stats')) ?></a>
</nav>
```

In-page tabs (ARIA tab pattern):

```php
<div class="ac-tabs ac-tabs--pill" role="tablist" aria-label="<?= h(t('deck.sections')) ?>">
  <button type="button" role="tab" id="tab-cards" aria-controls="panel-cards" aria-selected="true">Cards</button>
  <button type="button" role="tab" id="tab-stats" aria-controls="panel-stats" aria-selected="false" tabindex="-1">Stats</button>
</div>
<div role="tabpanel" id="panel-cards" aria-labelledby="tab-cards">…</div>
<div role="tabpanel" id="panel-stats" aria-labelledby="tab-stats" hidden>…</div>
```

| Class | Look |
|---|---|
| `ac-tabs--underline` | 44 px tabs on a bottom border; the active tab has a 2 px primary underline, primary-strong bold text. Scrolls horizontally (scrollbar hidden) when it overflows. |
| `ac-tabs--pill` | `--ac-control-sm` pills with a control border; the active pill is inverse (dark in light theme). Scrolls horizontally. Suited to compact screens. |
| `ac-tabs--fill` | With `--underline`: the tabs share the row (centred labels, 8 px side padding) instead of scrolling. On a phone, keep 4 short labels and put the others in a « Plus » tab (`chevron-down` icon) that opens an `ac-menu`; when one of them is active, the « Plus » tab shows its label and the active style. |
| `ac-tabs__count` | Muted number after the label. |

Active tab: `aria-selected="true"` (tab pattern), `aria-current` (links), or `.is-active`.

## Breadcrumb — `ac-breadcrumb`

Wrapping row of links, 13 px muted; the current page in the text colour.

```php
<nav class="ac-breadcrumb" aria-label="<?= h(t('common.breadcrumb')) ?>">
  <a href="<?= BASE_URL ?>/pages/decks"><?= h(t('decks.title')) ?></a>
  <?= ac_icon('chevron-right', 'ac-icon--14') ?>
  <span aria-current="page"><?= h($deck['name']) ?></span>
</nav>
```

## Pagination — `ac-pagination`

Centred list; items are `<a>` (other pages) or `<span>` (current page, ellipsis), each
`--ac-control-sm` square at least. The current page is inverse and bold.

```php
<nav aria-label="<?= h(t('common.pagination')) ?>">
  <ul class="ac-pagination">
    <?php if ($page > 1): ?>
      <li><a href="?page=<?= $page - 1 ?>" aria-label="<?= h(t('common.previous')) ?>"><?= ac_icon('chevron-left') ?></a></li>
    <?php endif; ?>
    <?php for ($i = 1; $i <= $pages; $i++): ?>
      <li><?php if ($i === $page): ?><span aria-current="page"><?= $i ?></span><?php else: ?><a href="?page=<?= $i ?>"><?= $i ?></a><?php endif; ?></li>
    <?php endfor; ?>
    <?php if ($page < $pages): ?>
      <li><a href="?page=<?= $page + 1 ?>" aria-label="<?= h(t('common.next')) ?>"><?= ac_icon('chevron-right') ?></a></li>
    <?php endif; ?>
  </ul>
</nav>
```

Links get the track background on hover.

## Menu — `ac-menu`

Surface panel, border, 12 px radius, `--ac-shadow-e2`, at least 200 px wide. Positioning and
opening are up to the page (a `<details>`, a popover, a script); the class only draws the panel.

```php
<div class="ac-menu" id="account-menu" role="menu" aria-label="<?= h(t('nav.account')) ?>">
  <div class="ac-menu__label"><?= h($user['name']) ?></div>
  <a class="ac-menu__item" role="menuitem" href="…" aria-current="page"><?= ac_icon('user') ?> <?= h(t('nav.profile')) ?></a>
  <a class="ac-menu__item" role="menuitem" href="…"><?= ac_icon('settings') ?> <?= h(t('nav.settings')) ?></a>
  <hr class="ac-menu__divider">
  <button type="button" class="ac-menu__item ac-menu__item--danger" role="menuitem"><?= ac_icon('log-out') ?> <?= h(t('nav.logout')) ?></button>
</div>
```

| Class | Effect |
|---|---|
| `ac-menu__item` | Row `--ac-control-md` tall, 18 px muted icon, 8 px radius. Hover and focus: subtle background. Works on `<a>` and `<button>`. |
| `aria-current` / `.is-active` on an item | Primary-soft background, primary-strong text and icon. |
| `ac-menu__item--danger` | Text and icon in `--ac-color-required`. |
| `ac-menu__label` | Overline heading of a group. |
| `ac-menu__divider` | 1 px divider between groups (`<hr>` or `<div>`). |

The Bootstrap `.dropdown-menu` is restyled to look the same (see
[bootstrap-bridge.md](bootstrap-bridge.md)); new code uses `ac-menu`.

## Density

| Element | Pointer | Touch |
|---|---|---|
| Pill tab, pagination item | 32 px | 36 px |
| Menu item | 40 px | 44 px |
| Underline tab | 44 px | 44 px (fixed) |

## Accessibility

- Wrap navigation in `<nav aria-label>`; mark the current page with `aria-current="page"`.
- In-page tabs follow the ARIA tab pattern: `role="tablist"`, `role="tab"` with
  `aria-selected` and `aria-controls`, `role="tabpanel"`, and arrow keys move between tabs (only
  the selected tab is in the Tab order). Links that change the URL do not use these roles.
- Pagination: previous/next links with an icon only need `aria-label`.
- Menu: the button that opens it has `aria-expanded` and `aria-controls`; Escape closes it and
  returns focus to the button. Use `role="menu"`/`menuitem` only with arrow-key navigation;
  otherwise a plain list of links in the panel is fine.
- The breadcrumb separator icon is decorative (default `aria-hidden`).
- Active pill (on-inverse on inverse) and active underline tab (primary-strong on surface) meet
  4.5:1 in both themes.

## Frameworks

- **Angular** (`plugins/rebuilder/app/src/app/ui/nav/`):

```html
<ac-tabs ariaLabel="Sections" [tabs]="[{ id: 'cards', label: 'Cartes', count: 40 }, { id: 'stats', label: 'Stats' }]" [(active)]="tab" appearance="underline" />
<ac-breadcrumb [items]="[{ label: 'Decks', route: '/decks' }, { label: deck.name }]" />
```

`ac-tabs`: `tabs` (`{ id, label, count? }[]`), two-way `active`, `appearance` (`underline` |
`pill`), `ariaLabel`. Menus are built with the overlay service (`ui/overlay/`) and the
`ac-menu` classes.

- **React**:

```tsx
export function Tabs({ label, tabs, active, onChange, pill }: TabsProps) {
  return (
    <div className={cx('ac-tabs', pill ? 'ac-tabs--pill' : 'ac-tabs--underline')} role="tablist" aria-label={label}>
      {tabs.map(t => (
        <button key={t.id} type="button" role="tab" aria-selected={t.id === active}
                tabIndex={t.id === active ? 0 : -1} onClick={() => onChange(t.id)}>
          {t.label}{t.count != null && <span className="ac-tabs__count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
```
