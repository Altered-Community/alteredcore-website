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

## Motion

The panel and the tab slide and fade, one after the other: the element on screen leaves toward
its page edge (`--ac-duration-fast`, 0.12 s), then, on its `animationend`, it is removed and the
other one comes in from that edge (`--ac-duration-base`, 0.2 s). They are never in the layout
together, so the content next to them reflows once. Do not animate the panel's width: the content
would reflow on every frame.

| Class | Effect |
|---|---|
| `ac-drawer-enter--start` | Comes in from the left edge (filters panel, its tab). |
| `ac-drawer-enter--end` | Comes in from the right edge (deck panel, its tab). |
| `ac-drawer-leave--start` | Leaves toward the left edge. |
| `ac-drawer-leave--end` | Leaves toward the right edge. |

With `prefers-reduced-motion: reduce`, nothing moves. Do not play the enter motion on page load,
only after the user opens or closes a panel.

## Accessibility

- Both are real `<button>`s with `aria-expanded` and `aria-controls` pointing at the panel.
- The handle has no text: give it an `aria-label` (« Masquer les filtres »). Give the tab an
  `aria-label` too when its summary is only a number or an icon (« Afficher les filtres, 3 actifs »).
- Remember the choice per user (local storage) so the panel stays closed on the next visit.

## Angular

`<button acDrawerHandle="end">` and `<button acDrawerTab="start">` (`ui/containers/drawer`),
content projected into the tab. `AcDrawerState` runs the motion in sequence: it wraps the open flag,
sets the leave class, waits for `animationend` (with a fallback timeout), then flips the flag; the
entering element gets the enter class through `[animate.enter]`, only after a user toggle.
