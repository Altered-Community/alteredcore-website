# Chips, badges, tags, counts, avatars

`css/components/chips.css`.

Small inline elements. Only the chip is interactive; the others are labels.

| Component | Interactive | Use |
|---|---|---|
| Chip `ac-chip` | yes | A filter the user turns on and off; an active filter with a remove button. |
| Badge `ac-badge` | no | Status or category of an item: Public, Draft, Frontier. |
| Tag `ac-tag` | no | Smaller, square label on a tile (card rarity, format). |
| Count `ac-count` | no | A number: items in a group, unread messages. |
| Avatar `ac-avatar` | no | A user's initials or picture. |

Do not use a badge or a tag as a button or link; do not use a chip for a single yes/no setting
(use a [switch](field.md)) or for one choice among a few options (use a [segmented
control](segmented.md)).

## Chip — `ac-chip`

Pill, `--ac-control-sm` tall, surface with a control border, 13 px text.

```php
<div class="ac-row" role="group" aria-label="<?= h(t('cards.factions')) ?>">
  <?php foreach ($factions as $f): ?>
    <button type="button" class="ac-chip" aria-pressed="<?= in_array($f, $selected, true) ? 'true' : 'false' ?>">
      <span class="ac-chip__dot" style="--ac-chip-dot: var(--ac-faction-<?= h($f) ?>)"></span>
      <?= h(t('factions.' . $f)) ?>
    </button>
  <?php endforeach; ?>
</div>
```

Active filter with a remove button (the whole chip removes the filter):

```php
<button type="button" class="ac-chip is-on" aria-label="<?= h(t('filters.remove', ['name' => $label])) ?>">
  <?= h($label) ?> <span class="ac-chip__remove"><?= ac_icon('x', 'ac-icon--14') ?></span>
</button>
```

| Class / attribute | Effect |
|---|---|
| `aria-pressed="true"` | Selected: primary-soft background, primary border, primary-strong text. |
| `aria-current` | Same look, for a chip that is a link to the current filter. |
| `.is-on` | Same look, for a chip that is not a toggle (a removable active filter). |
| `ac-chip--square` | 8 px radius instead of a pill; selected border in primary. |
| `ac-chip__dot` | 10 px dot, colour from `--ac-chip-dot` (a faction or terrain token), `currentColor` by default. |
| `ac-chip__remove` | Muted remove icon at the end. |

## Badge — `ac-badge`

Pill, 24 px tall (`ac-badge--lg`: 28 px), 12 px bold text, soft background with the matching
text colour.

```php
<span class="ac-badge ac-badge--green"><?= ac_icon('globe', 'ac-icon--14') ?> <?= h(t('decks.public')) ?></span>
<span class="ac-badge"><?= h(t('decks.draft')) ?></span>
```

| Class | Colours | Typical meaning |
|---|---|---|
| (default) | track / text-2 | Neutral |
| `ac-badge--blue` | primary-soft / primary-strong | Information, new |
| `ac-badge--green` | success-soft / success | Public, valid, done |
| `ac-badge--violet` | accent-soft / accent | Frontier, BGA |
| `ac-badge--orange` | warning-soft / warning | Pending, incomplete |
| `ac-badge--red` | danger-soft / danger | Invalid, banned |

## Tag — `ac-tag`

Square (6 px radius), 22 px tall, 11 px bold text. Default neutral; `ac-tag--green`,
`ac-tag--violet`, `ac-tag--orange`, `ac-tag--red` with the same colours as the badges (there is
no blue tag).

```php
<span class="ac-tag ac-tag--violet">Frontier</span>
```

## Count — `ac-count`

Number bubble, 20 px tall, at least 20 px wide, 11 px extra-bold.

| Class | Colours |
|---|---|
| (default) | inverse / on-inverse (dark bubble in light theme, light in dark) |
| `ac-count--success` | success / on-strong |
| `ac-count--soft` | track / text-2 |

```php
<a class="ac-menu__item" href="…"><?= ac_icon('bell') ?> <?= h(t('nav.notifications')) ?>
  <span class="ac-count" aria-label="<?= h(t('nav.unread', ['n' => $unread])) ?>"><?= (int)$unread ?></span></a>
```

## Avatar — `ac-avatar`

28 px circle (`ac-avatar--lg`: 32 px), initials in primary-strong on primary-soft, or a picture.

```php
<span class="ac-avatar" aria-hidden="true"><?= h(mb_strtoupper(mb_substr($user['name'], 0, 2))) ?></span>
<span class="ac-avatar ac-avatar--lg"><img src="<?= h($user['avatar']) ?>" alt=""></span>
```

## Density

Only the chip follows the density (`--ac-control-sm`: 32 px pointer, 36 px touch). Badges, tags,
counts and avatars have fixed sizes: they are labels, not targets.

## Accessibility

- Chips are `<button type="button">` with `aria-pressed`, grouped in an element with
  `role="group"` and `aria-label`. A chip that is a link uses `<a>` and `aria-current`.
- A remove-only chip needs a label that says what it removes ("Remove filter Axiom").
- Badges and tags are text; do not rely on their colour alone to convey the status — the word
  is the status.
- A count next to a label should be read with it: give the count an `aria-label` ("3 unread")
  or put the full sentence in `ac-sr-only`.
- An avatar next to the user's name is decorative (`aria-hidden="true"`, `alt=""` on the image);
  alone, it needs the name as `alt` or `aria-label`.
- Every soft/strong colour pair meets 4.5:1 in both themes.

## Frameworks

- **Angular** (`plugins/rebuilder/app/src/app/ui/chips/`, `nav/avatar/`):

```html
<ac-chip label="Axiom" [dot]="'var(--ac-faction-axiom)'" [(selected)]="axiom" />
<ac-chip label="Coût 3" [removable]="true" (remove)="clearCost()" />
<ac-badge tone="green" icon="globe">Public</ac-badge>
<ac-tag tone="violet">Frontier</ac-tag>
<ac-count [value]="unread" tone="dark" />
<ac-avatar name="Yutsa" [size]="32" />
```

`ac-chip`: `label` (required), `dot`, `removable`, `shape` (`pill` | `square`), two-way
`selected`, `remove` output. `ac-badge`: `tone` (`blue` | `green` | `violet` | `red` | `orange` |
`neutral`), `icon`, `size` (24 | 28). `ac-tag`: `tone`. `ac-count`: `value`, `tone` (`dark` |
`success` | `soft`). `ac-avatar`: `name`, `size` (28 | 32).

- **React**:

```tsx
export function Chip({ selected, onToggle, dot, children }: ChipProps) {
  return (
    <button type="button" className="ac-chip" aria-pressed={selected} onClick={onToggle}>
      {dot && <span className="ac-chip__dot" style={{ '--ac-chip-dot': dot } as CSSProperties} />}
      {children}
    </button>
  );
}

export const Badge = ({ tone, children }: { tone?: 'blue' | 'green' | 'violet' | 'orange' | 'red'; children: ReactNode }) =>
  <span className={cx('ac-badge', tone && `ac-badge--${tone}`)}>{children}</span>;
```
