# AlteredCore design system

One look for the whole site: the shell (header, menu, footer), the PHP pages, the PHP plugins and
the SPA plugins (Angular today, React or others later). The design comes from Altered Re:Builder;
the site has a light and a dark theme and two densities, nothing else to choose.

- **Source of truth**: this folder. The design project in Claude Design is a synchronised copy
  (see [WORKFLOW.md](WORKFLOW.md)).
- **No build**: plain CSS files, served as they are. The site never runs Node. The only generated
  files (icons) are committed.
- **Reference page**: `/pages/design-system` shows every token and component, in both themes and
  both densities.

## Contents

| Path | Role |
|---|---|
| `tokens/tokens.css` | **Every raw value**: colours (light and dark), typography, spacing, radii, shadows, control heights (pointer and touch), layout sizes. The only file with hex colours. |
| `tokens/breakpoints.scss`, `tokens/breakpoints.ts` | The two breakpoints (768, 1200) for media queries and code. CSS cannot read variables in `@media`. |
| `fonts/` | Figtree, self-hosted (OFL). The only site font: the admin has no font setting. |
| `css/base.css` | Document defaults, text styles (`ac-text-*`, `ac-prose`), `ac-sr-only`, root of SPA plugins. |
| `css/components/*.css` | The `ac-*` components, one file per family. |
| `css/bridges/bootstrap.css` | Bootstrap 5 components (`.btn`, `.form-control`, `.card`, `.dropdown-menu`…) drawn with the tokens, for existing pages. |
| `css/bridges/legacy.css` | Deprecated variable names from before the design system (`--sand-*`, `--primary-*`, `--neutral-*`, `--notice-*`) mapped to tokens. |
| `icons/` | Lucide icons and brand logos: `icons.php` (PHP), `sprite.svg` (site JS), `fa-shim.css` (legacy Font Awesome markup), generator `build.mjs`. |
| `php/ui.php` | PHP helpers: `ac_icon()`, stylesheet lists used by the shell. |
| `js/ac.js` | `acIcon()` for HTML built by the site's scripts. |
| `docs/components/*.md` | One page per component family: markup, variants, states, accessibility. |
| `WORKFLOW.md` | How to design and implement with Claude Code, the design mode and Claude Design. |
| `CLAUDE.md` | Rules for Claude Code when touching the design system. |

## How it is loaded

| Where | What | How |
|---|---|---|
| Every page of the site | fonts, tokens, base, components, fa-shim, bridges | `includes/header.php` (`dsDocumentStylesheets()`) |
| Admin panel | same, light theme only | `admin/includes/header.php` |
| SPA plugin shadow root | base + components (tokens inherit from `<html>`) | `js/altered-core-host.js` → `getMount()` injects them before the plugin's CSS |

The shell sets two attributes on `<html>`:

- `data-theme="dark"` when the dark theme is on (absent in light);
- `data-density="pointer" | "touch"`: `touch` when the pointer is coarse or the window is under
  768 px. Control heights, field font sizes and page gutters follow.

Components never read these attributes: every value that changes with a mode is a token, so the
same CSS works in the page and inside a shadow root.

## Rules

1. **No raw values outside `tokens/`.** Colours, radii, shadows, spacing, font sizes and control
   heights come from `var(--ac-*)`. Layout-only values (a grid template, a `max-width` in `ch`)
   are fine.
2. **No theme selectors in components.** Never write `[data-theme='dark'] .x`: add or reuse a
   token that has a dark value.
3. **Heights come from `--ac-control-sm | md | lg`**, never a pixel height: they change with the
   density.
4. **Use an `ac-*` component when one exists.** If a screen needs something new and reusable, add
   it here first (CSS + doc + reference page), then use it. Plugin-specific pieces (a card tile, a
   deck row) stay in the plugin but are built from tokens.
5. **Icons are Lucide**, by name: `ac_icon('trash-2')`, `acIcon('trash-2')`, `<ac-icon name="trash-2" />`.
   The Altered game glyphs (`fak fa-collection`, `assets/font/alteredicons.css`) stay as they are.
6. **Accessibility**: real `<button>` / `<a>` / `<input>`, `aria-label` on icon-only buttons,
   visible focus (global `:focus-visible`), clickable areas ≥ `--ac-hit-min`, WCAG AA contrast in
   both themes.
7. **Breakpoints**: `@media (min-width: 768px)` and `(min-width: 1200px)` (or `max-width: 767.98px`
   / `1199.98px`), nothing else.

## Using it

### PHP page or PHP plugin

Nothing to load: the shell does it. Use the classes and `ac_icon()`:

```php
<div class="ac-page">
  <header class="ac-page-header">
    <div>
      <h1 class="ac-page-header__title"><?= h(t('decks.title')) ?></h1>
      <p class="ac-page-header__subtitle"><?= h(t('decks.subtitle')) ?></p>
    </div>
    <div class="ac-page-header__actions">
      <a class="ac-button" href="<?= BASE_URL ?>/pages/deckbuilder"><?= ac_icon('plus') ?> <?= h(t('decks.new')) ?></a>
    </div>
  </header>

  <div class="ac-segmented" role="group" aria-label="<?= h(t('decks.view')) ?>">
    <a href="?view=grid" <?= $view === 'grid' ? 'aria-current="page"' : '' ?>><?= ac_icon('layout-grid') ?> Grid</a>
    <a href="?view=list" <?= $view === 'list' ? 'aria-current="page"' : '' ?>><?= ac_icon('list') ?> List</a>
  </div>
</div>
```

Plugin CSS (`plugins/<id>/assets/*.css`) only lays things out and uses `var(--ac-*)`.

Scripts that build HTML use `acIcon()`:

```js
button.innerHTML = acIcon('trash-2') + ' ' + label;   // label escaped beforehand
```

### Angular plugin

The shell injects the component CSS into the shadow root; the Angular components only set the
classes. See `plugins/rebuilder/app/src/app/ui/` (`AcButton`, `AcIcon`, `AcSegmented`…):

```html
<button acButton variant="secondary" icon="copy" (click)="duplicate()">Dupliquer</button>
<ac-segmented [options]="views" [(value)]="view" />
```

Component SCSS only holds what the `ac-*` classes do not cover, with tokens. Breakpoints in code:
`import { BREAKPOINTS } from '…/design-system/tokens/breakpoints'` (or the plugin's copy, kept equal
by tests).

### React plugin (or any other framework)

Declare the page as `"type": "spa"`, `"mount": "shadow"` in `plugin.json`: the shell injects the
design system into the shadow root. Write thin components that render the documented markup:

```tsx
export function Button({ variant = 'primary', size = 'md', icon, className, children, ...rest }: ButtonProps) {
  return (
    <button className={cx('ac-button', variant !== 'primary' && `ac-button--${variant}`, size !== 'md' && `ac-button--${size}`, className)} {...rest}>
      {icon && <Icon name={icon} />}
      {children}
    </button>
  );
}
```

Icons: `lucide-react` (same names as `ac_icon()`), with `className="ac-icon"`.

## Changing the design system

See [WORKFLOW.md](WORKFLOW.md). In short: design in Claude Design (or with `/design` in Claude
Code), then update `tokens/` and `css/components/`, the doc in `docs/components/`, the reference
page (`pages/design-system.php`), and the framework components that render it. Run
`php tests/run.php` (checks breakpoints, icons and hard-coded colours).

Icons: to add a Font Awesome name used by legacy markup, add it to `icons/fa-map.json` if Lucide
calls it differently, then `cd design-system/icons && npm ci && npm run build`.
