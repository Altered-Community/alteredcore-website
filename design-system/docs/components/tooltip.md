# Tooltip and masked value

`css/components/tooltip.css`.

A tooltip shows a short text next to an element when the pointer is over it or when it has focus.
A masked value shows an e-mail address partly hidden (`c•••@gmail.com`), the full address in a
tooltip: anyone watching the screen (a stream, a video) cannot read it, the user can by pointing at
it.

Do not put anything the user needs to act on in a tooltip (it cannot be reached on every device);
do not use a tooltip to label an icon-only button: use `aria-label` (and `title`, see
[button.md](button.md)).

## Masked e-mail — `ac_masked_email()`

Every e-mail address of the signed-in user shown on a page goes through it (account menu, account
page, newsletter).

```php
<p>Vous recevez la newsletter à l'adresse <?= ac_masked_email($email) ?>.</p>
<span class="az-am-sub"><?= ac_masked_email($user['email'], 'ac-tooltip--start ac-tooltip--below') ?></span>
```

It renders:

```html
<span class="ac-masked ac-tooltip-host" tabindex="0" aria-describedby="ac-masked-1">c•••@gmail.com<span class="ac-tooltip" role="tooltip" id="ac-masked-1">camille.durand@gmail.com</span></span>
```

`dsMaskEmail($email)` returns the masked text alone: the first character of the local part, `•••`,
then `@` and the domain; anything that is not an address gives `•••`.

## Tooltip — `ac-tooltip`

Put the tooltip inside its host. The host gets `ac-tooltip-host` and, when it is not a control
already, `tabindex="0"` so that the keyboard and a tap on a touch screen can show it.

```php
<span class="ac-tooltip-host" tabindex="0" aria-describedby="tip-cost">
  3 <?= ac_icon('info', 'ac-icon--16') ?>
  <span class="ac-tooltip" role="tooltip" id="tip-cost">Main cost, reserve cost in brackets</span>
</span>
```

| Class | Effect |
|---|---|
| `ac-tooltip-host` | `position: relative`; shows its `ac-tooltip` on hover (devices that can hover) and on focus (`:focus`, `:focus-within`). |
| `ac-tooltip` | Inverse bubble, small text on one line, centred above the host, with an arrow. Hidden otherwise. |
| `ac-tooltip--start` | Aligned on the host's start edge instead of centred (a host near the edge of a narrow box). |
| `ac-tooltip--below` | Under the host (a host at the top of a box that clips or scrolls, like a menu). |
| `ac-masked` | Dashed underline and a help cursor: says that there is more to see. Used with `ac-tooltip-host`. |

## Accessibility

- `role="tooltip"` on the bubble, `aria-describedby` from the host to it: screen readers read the
  full value as the host's description.
- The host is focusable (`tabindex="0"`), so the tooltip shows on keyboard focus, and on touch
  screens after a tap (no hover there). It hides when focus leaves.
- Contrast: `--ac-color-on-inverse` on `--ac-color-inverse` is ≥ 4.5:1 in both themes.

## Frameworks

- **Angular / React**: render the same markup; give each bubble a unique id for
  `aria-describedby`.
