# Keys

`css/components/key.css`.

A row of toggle buttons drawn as keys. A key that is off is raised (thick bottom edge) and faded;
a key that is on is pressed down and filled in primary. Several keys of a row can be on at once.

Used for alt arts: above each illustration of a card, its 1st, 2nd and 3rd card. A key on is a
card that takes this illustration; pressing another key gives it that card. A token has a single
key (« Choisir » / « Choisie »).

Use a [segmented control](segmented.md) instead for one choice among a few options, and a
[switch](field.md) for a setting that is on or off.

## Markup

```php
<div class="ac-keys" role="group" aria-label="<?= h(sprintf(t('altarts.cards_of'), $label)) ?>">
  <button type="button" class="ac-key" aria-pressed="true" aria-label="1ère carte">
    <span class="ac-key__num">1<sup>ère</sup></span><span class="ac-key__word">carte</span>
  </button>
  <button type="button" class="ac-key" aria-pressed="false" aria-label="2ème carte">
    <span class="ac-key__num">2<sup>ème</sup></span><span class="ac-key__word">carte</span>
  </button>
  <button type="button" class="ac-key" aria-pressed="false" aria-label="3ème carte" disabled>
    <span class="ac-key__num">3<sup>ème</sup></span><span class="ac-key__word">carte</span>
  </button>
</div>

<div class="ac-keys" style="--ac-keys-count: 1" role="group" aria-label="…">
  <button type="button" class="ac-key" aria-pressed="false"><span class="ac-key__label">Choisir</span></button>
</div>
```

| Class / attribute | Role |
|---|---|
| `ac-keys` | Grid of equal keys, `--ac-space-1-5` apart. `--ac-keys-count` sets the number of columns (3 by default). |
| `ac-key` | A key, `--ac-control-lg` tall (52 px in touch density), raised by a 4 px bottom edge, at 60 % opacity. |
| `ac-key--sm` | Key at `--ac-control-md` (lists with many rows). |
| `aria-pressed="true"` | Pressed down by its edge, `--ac-color-primary` with an inner shadow, full opacity. |
| `:disabled` | 30 % opacity, not clickable. |
| `ac-key__num` | Number, `--ac-font-size-body-strong`, its `<sup>` (ordinal suffix) at 0.62 em. |
| `ac-key__word` | Word under the number (« carte »), `--ac-font-micro`. |
| `ac-key__label` | Single word instead of number and word (« Choisir »), `--ac-font-body-strong`. |

Hover (pointer devices only): border and text in primary, full opacity, the key rises by 1 px.
A pressed key goes down by 2 px while the button is held.

## Accessibility

- Real `<button type="button">` with `aria-pressed`, in a `role="group"` named after what the
  keys belong to (« Cartes de Illustration 2 »).
- `aria-label` gives the full name (« 1ère carte »): the number and its `<sup>` are read as one
  word otherwise.
- Keys are at least `--ac-control-md` tall; use the default size where touch matters.
- The pressed state is not shown by colour alone: the key is also lower and has no edge.
