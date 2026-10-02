# Drawer handle and tab

`css/components/drawer.css`.

Lets the user hide a side panel (filters, deck) to give the main column more room, and bring it
back. While the panel is open, a round **handle** sits on its inner edge. Once it is closed, a
vertical **tab** on the page edge replaces it and shows the panel's name and a short summary
(active filter count, card count).

Use it for panels next to a main column on wide screens. On compact screens, panels are sheets or
tabs instead.

## Handle — `ac-drawer-handle`

A 32 px round button (`--ac-control-sm`, larger in the touch density), centred on the panel's
border at mid-height. The panel needs `position: relative` and must not clip it
(`overflow: hidden` goes on an inner element).

```php
<aside class="filters" id="filters" style="position: relative">
  …
  <button type="button" class="ac-drawer-handle ac-drawer-handle--end"
          aria-expanded="true" aria-controls="filters" aria-label="<?= h(t('search.hideFilters')) ?>">
    <?= ac_icon('chevron-left', 'ac-icon--16') ?>
  </button>
</aside>
```

| Class | Effect |
|---|---|
| `ac-drawer-handle--end` | On the right edge: a panel at the start of the page. Chevron pointing left. |
| `ac-drawer-handle--start` | On the left edge: a panel at the end of the page. Chevron pointing right. |

## Tab — `ac-drawer-tab`

A vertical button as wide as the handle, rounded on its inner side, flat against the page edge.
It takes the panel's place in the layout; the page makes it sticky under its header. Content, top
to bottom: a chevron toward the content, the label (`ac-drawer-tab__label`, read bottom to top),
then a summary (an [`ac-count`](chips.md), a status icon).

```php
<button type="button" class="ac-drawer-tab ac-drawer-tab--start" aria-expanded="false" aria-controls="filters"
        aria-label="<?= h(t('search.showFilters')) ?>">
  <?= ac_icon('chevron-right', 'ac-icon--16') ?>
  <span class="ac-drawer-tab__label"><?= h(t('search.filters')) ?></span>
  <span class="ac-count">3</span>
</button>
```

| Class | Effect |
|---|---|
| `ac-drawer-tab--start` | Against the left page edge, rounded on the right. |
| `ac-drawer-tab--end` | Against the right page edge, rounded on the left. |
| `ac-drawer-tab__label` | The panel's name, vertical. |

## Accessibility

- Both are real `<button>`s with `aria-expanded` and `aria-controls` pointing at the panel.
- The handle has no text: give it an `aria-label` (« Masquer les filtres »). Give the tab an
  `aria-label` too when its summary is only a number or an icon (« Afficher les filtres, 3 actifs »).
- Remember the choice per user (local storage) so the panel stays closed on the next visit.

## Angular

`<button acDrawerHandle="end">` and `<button acDrawerTab="start">` (`ui/containers/drawer`),
content projected into the tab.
