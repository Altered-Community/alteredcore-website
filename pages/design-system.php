<?php
// Design system reference page: every token and ac-* component, in the current theme and
// density. Linked from design-system/README.md; not in the menu, not indexed.
require_once dirname(__DIR__) . '/includes/functions.php';
initLang();

$pageTitle  = 'Design system';
$pageRobots = 'noindex, nofollow';

$colourGroups = [
    'Neutrals' => ['text', 'text-2', 'text-muted', 'text-disabled', 'border-dashed', 'border-control', 'border', 'divider', 'track', 'scrollbar', 'scrollbar-hover', 'bg-app', 'bg-subtle', 'surface', 'inverse', 'on-inverse', 'on-strong'],
    'Brand'    => ['primary', 'primary-strong', 'primary-border', 'primary-soft', 'primary-tint', 'on-primary', 'link', 'link-hover', 'focus'],
    'Semantic' => ['success', 'success-soft', 'danger', 'danger-soft', 'required', 'warning', 'warning-soft', 'accent', 'accent-soft', 'info', 'info-soft', 'like', 'discord'],
    'Charts'   => ['chart-main', 'chart-reserve', 'chart-axis'],
    'Hero banner and overlays' => ['hero-from', 'hero-to', 'on-hero', 'on-hero-muted', 'hero-scrim', 'scrim', 'overlay-control', 'overlay-chip', 'overlay-label', 'overlay-strong', 'overlay-light'],
];
$factions = ['axiom', 'bravos', 'lyra', 'muna', 'ordis', 'yzmir'];
$fonts    = ['display' => 'Page title', 'title' => 'Large title', 'heading' => 'Section heading', 'body-strong' => 'Strong body', 'body' => 'Body — controls, lists, cards', 'prose' => 'Prose — news and rules, for long reading', 'small' => 'Small', 'caption' => 'Caption', 'micro' => 'Micro', 'overline' => 'Overline'];
$spaces   = ['0-5', '1', '1-5', '2', '2-5', '3', '4', '5', '6', '8', '10', '12'];
$radii    = ['xs', 'sm', 'md', 'control', 'lg', 'card', 'dialog', 'sheet', 'pill'];
$shadows  = ['e1', 'card', 'e2', 'e3', 'fab', 'sheet', 'drawer', 'dialog'];
$fontSizes = ['display', 'title', 'title-sm', 'heading', 'prose', 'body-strong', 'body', 'small', 'caption', 'micro'];
$textClasses = ['ac-text-display' => 'Page title', 'ac-text-title' => 'Large title', 'ac-text-heading' => 'Section heading', 'ac-text-strong' => 'Item title', 'ac-text-body' => 'Body text', 'ac-text-small' => 'Secondary line', 'ac-text-caption' => 'Caption', 'ac-text-overline' => 'Group label', 'ac-text-muted' => 'Muted (colour only)'];
$icons    = ['house', 'search', 'plus', 'pencil', 'trash-2', 'copy', 'external-link', 'heart', 'star', 'eye', 'lock', 'user', 'settings', 'log-out', 'layers', 'layout-grid', 'list', 'funnel', 'calendar', 'map-pin', 'trophy', 'newspaper', 'info', 'triangle-alert', 'circle-check', 'brand-discord', 'brand-github'];

include dirname(__DIR__) . '/includes/header.php';
?>
<style>
/* Page-only layout for the reference sheets (values from tokens). */
.ds-section { margin-bottom: var(--ac-space-10); }
.ds-sheet { display: grid; gap: var(--ac-space-4); }
.ds-swatches { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: var(--ac-space-3); }
.ds-swatch { border: 1px solid var(--ac-color-border); border-radius: var(--ac-radius-lg); overflow: hidden; background: var(--ac-color-surface); }
.ds-swatch__chip { height: 56px; border-bottom: 1px solid var(--ac-color-divider); }
.ds-swatch__name { padding: var(--ac-space-2) var(--ac-space-2-5); font: var(--ac-font-caption); color: var(--ac-color-text-2); word-break: break-all; }
.ds-demo { display: flex; flex-wrap: wrap; align-items: center; gap: var(--ac-space-3); }
.ds-label { font: var(--ac-font-overline); text-transform: uppercase; letter-spacing: var(--ac-letter-spacing-overline); color: var(--ac-color-text-muted); margin: var(--ac-space-4) 0 var(--ac-space-2); }
.ds-type-row { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--ac-space-4); padding: var(--ac-space-2) 0; border-top: 1px solid var(--ac-color-divider); }
.ds-type-row code { width: 150px; flex-shrink: 0; color: var(--ac-color-text-muted); }
.ds-box { background: var(--ac-color-primary-soft); height: 24px; border-radius: var(--ac-radius-xs); }
.ds-radius { width: 72px; height: 56px; background: var(--ac-color-primary-soft); border: 1px solid var(--ac-color-primary-border); }
.ds-shadow { width: 120px; height: 72px; background: var(--ac-color-surface); border-radius: var(--ac-radius-card); display: flex; align-items: center; justify-content: center; font: var(--ac-font-caption); color: var(--ac-color-text-muted); }
.ds-icons { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: var(--ac-space-2); }
.ds-icons > div { display: flex; flex-direction: column; align-items: center; gap: var(--ac-space-1-5); padding: var(--ac-space-3) var(--ac-space-1); border-radius: var(--ac-radius-md); background: var(--ac-color-surface); border: 1px solid var(--ac-color-border); font: var(--ac-font-micro); color: var(--ac-color-text-muted); }
.ds-icons .ac-icon { --ac-icon-size: 22px; color: var(--ac-color-text); }
.ds-dialog-preview { position: static; display: block; width: 100%; max-height: none; }
.ds-shadow--image { background: linear-gradient(135deg, var(--ac-color-hero-from), var(--ac-color-hero-to)); color: var(--ac-color-on-hero); }
.ds-toast-preview { position: static; transform: none; align-self: flex-start; }
.ds-loader-preview { position: relative; min-height: 180px; border-radius: var(--ac-radius-card); overflow: hidden; }
.ds-loader-preview .ac-scrim { position: absolute; z-index: 0; }
.ds-layout-box { padding: var(--ac-space-2) var(--ac-space-3); border-radius: var(--ac-radius-md); background: var(--ac-color-primary-soft); color: var(--ac-color-primary-strong); font: var(--ac-font-caption); }
.ds-toolbar { position: sticky; top: calc(var(--ac-header-height) + var(--ac-space-2)); z-index: var(--ac-z-sticky); padding: var(--ac-space-2); background: var(--ac-color-surface); border: 1px solid var(--ac-color-border); border-radius: var(--ac-radius-lg); box-shadow: var(--ac-shadow-e2); }
</style>

<div class="ac-page ac-page--wide" id="design-system">

    <header class="ac-page-header">
        <div>
            <p class="ac-text-overline">AlteredCore</p>
            <h1 class="ac-page-header__title">Design system</h1>
            <p class="ac-page-header__subtitle">Tokens and <code>ac-*</code> components — source: <code>design-system/</code> (README, WORKFLOW). Switch the theme and the density to check both.</p>
        </div>
        <div class="ac-page-header__actions ds-toolbar">
            <button type="button" class="ac-button ac-button--secondary ac-button--sm" data-theme-toggle data-label-dark="Dark theme" data-label-light="Light theme">
                <?= ac_icon('moon', 'theme-icon-moon') ?><?= str_replace('<svg ', '<svg hidden ', ac_icon('sun', 'theme-icon-sun')) ?> Theme
            </button>
            <div class="ac-segmented" role="group" aria-label="Density" id="ds-density">
                <button type="button" data-density="pointer">Pointer</button>
                <button type="button" data-density="touch">Touch</button>
            </div>
        </div>
    </header>

    <!-- ================= Tokens ================= -->
    <section class="ds-section" aria-labelledby="ds-colours">
        <h2 class="ac-section-title" id="ds-colours">Colours</h2>
        <?php foreach ($colourGroups as $group => $names): ?>
            <p class="ds-label"><?= h($group) ?></p>
            <div class="ds-swatches">
                <?php foreach ($names as $n): ?>
                <div class="ds-swatch"><div class="ds-swatch__chip" style="background: var(--ac-color-<?= h($n) ?>)"></div><div class="ds-swatch__name">--ac-color-<?= h($n) ?></div></div>
                <?php endforeach; ?>
            </div>
        <?php endforeach; ?>
        <p class="ds-label">Factions</p>
        <div class="ds-swatches">
            <?php foreach ($factions as $f): ?>
            <div class="ds-swatch"><div class="ds-swatch__chip" style="background: var(--ac-faction-<?= h($f) ?>)"></div><div class="ds-swatch__name">--ac-faction-<?= h($f) ?></div></div>
            <?php endforeach; ?>
        </div>
    </section>

    <section class="ds-section" aria-labelledby="ds-type">
        <h2 class="ac-section-title" id="ds-type">Typography — Figtree</h2>
        <div class="ac-card">
            <div class="ds-type-row"><code>--ac-font-family</code><span>Figtree, then the system UI font</span></div>
            <?php foreach ($fonts as $token => $sample): ?>
            <div class="ds-type-row"><code>--ac-font-<?= h($token) ?></code><span style="font: var(--ac-font-<?= h($token) ?>)"><?= h($sample) ?></span></div>
            <?php endforeach; ?>
        </div>
        <p class="ds-label">Sizes alone</p>
        <div class="ac-card">
            <?php foreach ($fontSizes as $fs): ?>
            <div class="ds-type-row"><code>--ac-font-size-<?= h($fs) ?></code><span style="font-size: var(--ac-font-size-<?= h($fs) ?>)">Aa — <?= h($fs) ?></span></div>
            <?php endforeach; ?>
        </div>
        <p class="ds-label">Text classes</p>
        <div class="ac-card">
            <?php foreach ($textClasses as $cls => $sample): ?>
            <div class="ds-type-row"><code>.<?= h($cls) ?></code><span class="<?= h($cls) ?>"><?= h($sample) ?></span></div>
            <?php endforeach; ?>
            <div class="ds-type-row"><code>.ac-prose</code><div class="ac-prose"><p>Prose for news and rules: <a href="#design-system">links</a>, <strong>bold</strong>, lists and headings get comfortable spacing for long reading.</p></div></div>
            <div class="ds-type-row"><code>.ac-sr-only</code><span>Hidden visually, read by screen readers: <span class="ac-sr-only">this text</span>(nothing shows here).</span></div>
        </div>
    </section>

    <section class="ds-section" aria-labelledby="ds-shape">
        <h2 class="ac-section-title" id="ds-shape">Spacing, radii, elevation</h2>
        <div class="ac-grid" style="--ac-grid-min: 300px">
            <div class="ac-card">
                <p class="ds-label">Spacing</p>
                <div class="ac-stack ac-stack--sm">
                    <?php foreach ($spaces as $sp): ?>
                    <div class="ac-row"><code style="width: 110px">--ac-space-<?= h($sp) ?></code><div class="ds-box" style="width: var(--ac-space-<?= h($sp) ?>)"></div></div>
                    <?php endforeach; ?>
                </div>
            </div>
            <div class="ac-card">
                <p class="ds-label">Radii</p>
                <div class="ds-demo">
                    <?php foreach ($radii as $r): ?>
                    <div class="ac-stack ac-stack--sm"><div class="ds-radius" style="border-radius: var(--ac-radius-<?= h($r) ?>)"></div><code><?= h($r) ?></code></div>
                    <?php endforeach; ?>
                </div>
            </div>
            <div class="ac-card" style="background: var(--ac-color-bg-app)">
                <p class="ds-label">Elevation</p>
                <div class="ds-demo">
                    <?php foreach ($shadows as $sh): ?>
                    <div class="ds-shadow" style="box-shadow: var(--ac-shadow-<?= h($sh) ?>)"><?= h($sh) ?></div>
                    <?php endforeach; ?>
                    <div class="ds-shadow ds-shadow--image"><span style="text-shadow: var(--ac-shadow-on-image)">on-image (text)</span></div>
                </div>
            </div>
        </div>
    </section>

    <!-- ================= Components ================= -->
    <section class="ds-section" aria-labelledby="ds-layout">
        <h2 class="ac-section-title" id="ds-layout">Layout</h2>
        <div class="ac-card ac-stack ac-stack--lg">
            <p class="ac-text-muted">This page is an <code>ac-page ac-page--wide</code> column; <code>ac-page--full</code> removes the max width.</p>
            <div class="ac-row ac-row--between">
                <span class="ds-layout-box">ac-row--between: label</span>
                <span class="ac-row"><span class="ds-layout-box">actions</span><span class="ds-layout-box">on the right</span></span>
            </div>
            <hr class="ac-divider">
            <div class="ac-row ac-row--lg">
                <span class="ds-layout-box">ac-row--lg</span><span class="ds-layout-box">16 px gap</span><span class="ds-layout-box">wraps</span>
            </div>
            <div class="ac-stack ac-stack--lg" style="align-items: flex-start">
                <span class="ds-layout-box">ac-stack--lg</span><span class="ds-layout-box">24 px gap</span>
            </div>
        </div>
    </section>

    <section class="ds-section" aria-labelledby="ds-buttons">
        <h2 class="ac-section-title" id="ds-buttons">Buttons</h2>
        <div class="ac-card ds-sheet">
            <div class="ds-demo">
                <button type="button" class="ac-button"><?= ac_icon('plus') ?> Primary</button>
                <button type="button" class="ac-button ac-button--secondary"><?= ac_icon('copy') ?> Secondary</button>
                <button type="button" class="ac-button ac-button--ghost">Ghost</button>
                <button type="button" class="ac-button ac-button--add"><?= ac_icon('plus') ?> Add</button>
                <button type="button" class="ac-button ac-button--danger"><?= ac_icon('trash-2') ?> Danger</button>
                <button type="button" class="ac-button" disabled>Disabled</button>
                <a class="ac-button ac-button--secondary" href="#design-system" style="--ac-button-icon-color: var(--ac-color-discord)"><?= ac_icon('brand-discord') ?> Discord</a>
            </div>
            <div class="ds-demo">
                <button type="button" class="ac-button ac-button--sm">Small</button>
                <button type="button" class="ac-button">Medium</button>
                <button type="button" class="ac-button ac-button--lg">Large</button>
            </div>
            <button type="button" class="ac-button ac-button--secondary ac-button--full">Full width</button>
            <div class="ds-demo">
                <button type="button" class="ac-icon-button" aria-label="Settings"><?= ac_icon('settings') ?></button>
                <button type="button" class="ac-icon-button ac-icon-button--ghost" aria-label="More"><?= ac_icon('ellipsis') ?></button>
                <button type="button" class="ac-icon-button ac-icon-button--primary" aria-label="Add"><?= ac_icon('plus') ?></button>
                <button type="button" class="ac-icon-button ac-icon-button--sm" aria-label="Close"><?= ac_icon('x') ?></button>
                <button type="button" class="ac-icon-button ac-icon-button--lg" aria-label="Share"><?= ac_icon('share-2') ?></button>
                <button type="button" class="ac-icon-button" aria-label="Filters"><?= ac_icon('sliders-horizontal') ?><span class="ac-icon-button__dot"></span></button>
            </div>
        </div>
    </section>

    <section class="ds-section" aria-labelledby="ds-fields">
        <h2 class="ac-section-title" id="ds-fields">Fields</h2>
        <div class="ac-card">
            <div class="ac-grid" style="--ac-grid-min: 240px">
                <div class="ac-field">
                    <label class="ac-field__label" for="ds-name">Deck name <span class="ac-field__required">*</span></label>
                    <input class="ac-input" id="ds-name" placeholder="My Axiom deck">
                    <p class="ac-field__hint">40 characters at most.</p>
                </div>
                <div class="ac-field">
                    <label class="ac-field__label" for="ds-search">Search</label>
                    <div class="ac-input-icon"><?= ac_icon('search') ?><input class="ac-input" id="ds-search" type="search" placeholder="Card name, effect…"></div>
                </div>
                <div class="ac-field">
                    <label class="ac-field__label" for="ds-subtle">Toolbar search (subtle)</label>
                    <div class="ac-input-icon"><?= ac_icon('search') ?><input class="ac-input ac-input--subtle" id="ds-subtle" type="search" placeholder="Search"></div>
                </div>
                <div class="ac-field">
                    <label class="ac-field__label" for="ds-format">Format</label>
                    <select class="ac-select" id="ds-format"><option>Standard</option><option>Frontier</option><option>Singleton</option></select>
                </div>
                <div class="ac-field">
                    <label class="ac-field__label" for="ds-hero">Hero (listbox: search, groups, dots)</label>
                    <select class="ac-select" id="ds-hero">
                        <option value="">All heroes</option>
                        <optgroup label="Axiom" data-faction="axiom"><option>Della &amp; Bolt</option><option>Isaree &amp; Pebble</option><option>Sierra &amp; Oddball</option><option>Treyst &amp; Rossum</option></optgroup>
                        <optgroup label="Bravos" data-faction="bravos"><option>Kojo &amp; Booda</option></optgroup>
                        <optgroup label="Muna" data-faction="muna"><option selected>Teija &amp; Nauraa</option></optgroup>
                        <optgroup label="Yzmir" data-faction="yzmir"><option>Akesha &amp; Taru</option><option>Moyo &amp; Silk</option></optgroup>
                    </select>
                </div>
                <div class="ac-field">
                    <label class="ac-field__label" for="ds-bad">Cost</label>
                    <input class="ac-input" id="ds-bad" value="3-" aria-invalid="true" aria-describedby="ds-bad-err">
                    <p class="ac-field__error" id="ds-bad-err">Use a number or a range: 3, 1-3, 4+.</p>
                </div>
                <div class="ac-field">
                    <label class="ac-field__label" for="ds-notes">Notes</label>
                    <textarea class="ac-textarea" id="ds-notes" placeholder="Mulligan, key cards…"></textarea>
                </div>
                <div class="ac-file-input">
                    <label class="ac-field__label" for="ds-file">Collection export (.zip)</label>
                    <span class="ac-file-input__control">
                        <?= ac_icon('upload', 'ac-icon--18') ?>
                        <span class="ac-file-input__name ac-file-input__name--empty">Choose a file…</span>
                        <input type="file" id="ds-file" accept=".zip,application/zip">
                    </span>
                </div>
                <div class="ac-stack ac-stack--sm">
                    <label class="ac-check"><input type="checkbox" checked> Show unique cards</label>
                    <label class="ac-check"><input type="radio" name="ds-r" checked> Hand</label>
                    <label class="ac-check"><input type="radio" name="ds-r"> Reserve</label>
                    <label class="ac-switch"><input type="checkbox" role="switch" checked> Public deck</label>
                </div>
            </div>
        </div>
    </section>

    <section class="ds-section" aria-labelledby="ds-radio-cards">
        <h2 class="ac-section-title" id="ds-radio-cards">Radio cards</h2>
        <div class="ac-card ds-sheet">
            <?php foreach (['' => 'Default', 'ac-radio-card--stacked' => 'Stacked', 'ac-radio-card--compact' => 'Compact'] as $mod => $layout): ?>
            <p class="ds-label"><?= h($layout) ?></p>
            <div class="ac-grid" role="radiogroup" aria-label="Format (<?= h(strtolower($layout)) ?>)" style="--ac-grid-min: 220px">
                <?php foreach ([['Standard', 'The official format, ranked play.', 'green', 'Ranked'], ['Frontier', 'Recent sets only.', 'violet', 'New'], ['Singleton', 'One copy of each card.', 'red', 'Banned list']] as $i => $f): ?>
                <?php $tag = '<span class="ac-tag ac-tag--' . h($f[2]) . '">' . h($f[3]) . '</span>'; ?>
                <label class="ac-radio-card <?= h($mod) ?>">
                    <input type="radio" name="ds-format-<?= h($layout) ?>" <?= $i === 0 ? 'checked' : '' ?>>
                    <span class="ac-radio-card__body">
                        <span class="ac-radio-card__head"><span class="ac-radio-card__title"><?= h($f[0]) ?></span><?= $mod === '' ? $tag : '' ?></span>
                        <span class="ac-radio-card__desc"<?= $mod === 'ac-radio-card--compact' ? ' title="' . h($f[1]) . '"' : '' ?>><?= h($f[1]) ?></span>
                        <?= $mod === 'ac-radio-card--stacked' ? $tag : '' ?>
                    </span>
                    <?= $mod === 'ac-radio-card--compact' ? $tag : '' ?>
                </label>
                <?php endforeach; ?>
            </div>
            <?php endforeach; ?>
        </div>
    </section>

    <section class="ds-section" aria-labelledby="ds-choice">
        <h2 class="ac-section-title" id="ds-choice">Segmented control, chips, badges</h2>
        <div class="ac-card ds-sheet">
            <div class="ds-demo">
                <div class="ac-segmented" role="group" aria-label="View">
                    <button type="button" aria-pressed="true"><?= ac_icon('layout-grid') ?> Grid</button>
                    <button type="button" aria-pressed="false"><?= ac_icon('list') ?> List</button>
                </div>
                <div class="ac-segmented" role="group" aria-label="Visibility">
                    <button type="button" aria-pressed="false">Private</button>
                    <button type="button" aria-pressed="true">Public</button>
                </div>
                <div class="ac-segmented" role="group" aria-label="Sort">
                    <button type="button" class="ac-segmented__icon-only" aria-pressed="true" aria-label="By type"><?= ac_icon('layers') ?></button>
                    <button type="button" class="ac-segmented__icon-only" aria-pressed="false" aria-label="By cost"><?= ac_icon('chart-column') ?></button>
                </div>
                <div class="ac-segmented ac-segmented--lg" role="group" aria-label="Zone (large)">
                    <button type="button" aria-pressed="true">Hand</button>
                    <button type="button" aria-pressed="false">Reserve</button>
                </div>
            </div>
            <div class="ac-segmented ac-segmented--full" role="group" aria-label="Format (full width)">
                <button type="button" aria-pressed="true">Standard</button>
                <button type="button" aria-pressed="false">Frontier</button>
                <button type="button" aria-pressed="false">Singleton</button>
            </div>
            <div class="ds-demo">
                <?php foreach ($factions as $i => $f): ?>
                <button type="button" class="ac-chip" aria-pressed="<?= $i === 0 ? 'true' : 'false' ?>" style="--ac-chip-dot: var(--ac-faction-<?= h($f) ?>)"><span class="ac-chip__dot"></span><?= h(ucfirst($f)) ?></button>
                <?php endforeach; ?>
                <button type="button" class="ac-chip ac-chip--square" aria-pressed="true">1–3</button>
                <button type="button" class="ac-chip">Rare <span class="ac-chip__remove"><?= ac_icon('x', 'ac-icon--14') ?></span></button>
            </div>
            <div class="ds-demo">
                <span class="ac-badge ac-badge--blue">Standard</span>
                <span class="ac-badge ac-badge--violet">Frontier</span>
                <span class="ac-badge ac-badge--green"><?= ac_icon('globe', 'ac-icon--14') ?> Public</span>
                <span class="ac-badge ac-badge--orange">Draft</span>
                <span class="ac-badge ac-badge--red">Invalid</span>
                <span class="ac-badge">Neutral</span>
                <span class="ac-badge ac-badge--lg ac-badge--blue">Large</span>
                <span class="ac-tag ac-tag--green">NEW</span>
                <span class="ac-tag ac-tag--violet">UNIQUE</span>
                <span class="ac-tag ac-tag--red">BANNED</span>
                <span class="ac-tag ac-tag--orange">PROMO</span>
                <span class="ac-tag">RARE</span>
                <span class="ac-count">3</span>
                <span class="ac-count ac-count--success">40</span>
                <span class="ac-count ac-count--soft">12</span>
                <span class="ac-avatar">Y</span>
                <span class="ac-avatar ac-avatar--lg">KH</span>
            </div>
        </div>
    </section>

    <section class="ds-section" aria-labelledby="ds-cards">
        <h2 class="ac-section-title" id="ds-cards">Cards, lists, empty state</h2>
        <div class="ac-grid">
            <a class="ac-card ac-card--interactive ac-card--flush" href="#design-system">
                <div class="ac-card__media" style="background: linear-gradient(135deg, var(--ac-faction-axiom), var(--ac-faction-ordis))"></div>
                <div class="ac-card__body">
                    <p class="ac-card__title">Sierra & Oddball</p>
                    <p class="ac-card__meta">Axiom · 40 cards · updated 2 days ago</p>
                    <div class="ac-card__footer"><span class="ac-badge ac-badge--blue">Standard</span><span class="ac-badge ac-badge--green">Public</span></div>
                </div>
            </a>
            <div class="ac-card ac-card--flush">
                <ul class="ac-list">
                    <li><?= ac_icon('user') ?> Account</li>
                    <li><?= ac_icon('layers') ?> My decks <span class="ac-count ac-count--soft" style="margin-left: auto">12</span></li>
                    <li><?= ac_icon('heart') ?> Favourites</li>
                </ul>
            </div>
            <div class="ac-card ac-card--flush">
                <nav class="ac-list" aria-label="Account">
                    <a class="ac-list__item" href="#design-system"><?= ac_icon('user') ?> Profile</a>
                    <a class="ac-list__item" href="#design-system" aria-current="page"><?= ac_icon('settings') ?> Settings</a>
                </nav>
            </div>
            <div class="ac-card ac-card--raised">
                <p class="ac-card__title">Raised card</p>
                <p class="ac-card__meta">No border, card shadow: floats over the page.</p>
            </div>
            <div class="ac-card ac-card--sm">
                <p class="ac-card__title">Small card</p>
                <p class="ac-card__meta">12 px padding at every width.</p>
            </div>
            <div class="ac-card">
                <div class="ac-empty">
                    <?= ac_icon('layers') ?>
                    <p class="ac-empty__title">No deck yet</p>
                    <p>Create your first deck from the card list.</p>
                    <button type="button" class="ac-button ac-button--sm"><?= ac_icon('plus') ?> New deck</button>
                </div>
            </div>
        </div>
        <div class="ac-grid" style="margin-top: var(--ac-space-4)">
            <div class="ac-collapsible">
                <button type="button" class="ac-collapsible__head" aria-expanded="true" aria-controls="ds-col-1">
                    <span class="ac-collapsible__chevron"><?= ac_icon('chevron-down', 'ac-icon--16') ?></span>
                    <span class="ac-collapsible__title">Stats</span>
                </button>
                <div class="ac-collapsible__body" id="ds-col-1"><p>Open collapsible: click the header to fold it.</p></div>
            </div>
            <div class="ac-card ac-card--flush">
                <div class="ac-collapsible ac-collapsible--bare">
                    <button type="button" class="ac-collapsible__head" aria-expanded="false" aria-controls="ds-col-2">
                        <span class="ac-collapsible__chevron"><?= ac_icon('chevron-down', 'ac-icon--16') ?></span>
                        <span class="ac-collapsible__title">Details (bare, closed)</span>
                    </button>
                    <div class="ac-collapsible__body" id="ds-col-2" hidden><p>Inside a panel that already has a border.</p></div>
                </div>
            </div>
        </div>
    </section>

    <section class="ds-section" aria-labelledby="ds-nav">
        <h2 class="ac-section-title" id="ds-nav">Navigation</h2>
        <div class="ac-card ds-sheet">
            <nav class="ac-breadcrumb" aria-label="Breadcrumb"><a href="#design-system">Decks</a> <?= ac_icon('chevron-right', 'ac-icon--14') ?> <span aria-current="page">Sierra & Oddball</span></nav>
            <div class="ac-tabs ac-tabs--underline" role="tablist">
                <button type="button" role="tab" aria-selected="true">My decks <span class="ac-tabs__count">· 12</span></button>
                <button type="button" role="tab" aria-selected="false">Community</button>
                <button type="button" role="tab" aria-selected="false">Favourites</button>
            </div>
            <div class="ac-tabs ac-tabs--pill" role="tablist">
                <button type="button" role="tab" aria-selected="true">All</button>
                <button type="button" role="tab" aria-selected="false">Public</button>
                <button type="button" role="tab" aria-selected="false">Private</button>
            </div>
            <div class="ds-demo" style="align-items: flex-start">
                <ul class="ac-menu" role="menu">
                    <li class="ac-menu__label">Deck</li>
                    <li><a class="ac-menu__item" role="menuitem" href="#design-system"><?= ac_icon('pencil') ?> Edit</a></li>
                    <li><button type="button" class="ac-menu__item is-active" role="menuitem"><?= ac_icon('copy') ?> Duplicate</button></li>
                    <li><hr class="ac-menu__divider"></li>
                    <li><button type="button" class="ac-menu__item ac-menu__item--danger" role="menuitem"><?= ac_icon('trash-2') ?> Delete</button></li>
                </ul>
                <nav aria-label="Pagination"><ul class="ac-pagination">
                    <li><a href="#design-system" aria-label="Previous"><?= ac_icon('chevron-left') ?></a></li>
                    <li><a href="#design-system">1</a></li>
                    <li><span aria-current="page">2</span></li>
                    <li><a href="#design-system">3</a></li>
                    <li><a href="#design-system" aria-label="Next"><?= ac_icon('chevron-right') ?></a></li>
                </ul></nav>
            </div>
        </div>
    </section>

    <section class="ds-section" aria-labelledby="ds-feedback">
        <h2 class="ac-section-title" id="ds-feedback">Feedback</h2>
        <div class="ac-stack">
            <div class="ac-notice" role="status"><?= ac_icon('info') ?><div><p class="ac-notice__title">Beta</p><p>Re:Builder decks are saved to your account.</p></div></div>
            <div class="ac-row ac-row--lg">
                <div class="ac-toast ds-toast-preview" role="status"><span class="ac-toast__message"><?= ac_icon('circle-check', 'ac-icon--16') ?> Deck deleted.</span><button type="button" class="ac-toast__action">Undo</button></div>
                <button type="button" class="ac-button ac-button--secondary ac-button--sm" id="ds-toast-demo">Show a toast</button>
            </div>
            <div class="ac-notice ac-notice--neutral" role="status"><?= ac_icon('info') ?><div>Neutral note, without a tone.</div></div>
            <div class="ac-notice ac-notice--success" role="status"><?= ac_icon('circle-check') ?><div>Deck saved.</div></div>
            <div class="ac-notice ac-notice--warning" role="status"><?= ac_icon('triangle-alert') ?><div>This deck has 38 cards: a deck needs at least 40.</div></div>
            <div class="ac-notice ac-notice--danger" role="alert"><?= ac_icon('circle-alert') ?><div>The deck could not be saved. Try again.</div></div>
            <div class="ac-grid" style="--ac-grid-min: 320px">
                <div class="ac-dialog ds-dialog-preview" role="dialog" aria-labelledby="ds-dlg-title">
                    <div class="ac-dialog__header"><h3 class="ac-dialog__title" id="ds-dlg-title">Delete this deck?</h3><button type="button" class="ac-icon-button ac-icon-button--ghost ac-icon-button--sm" aria-label="Close"><?= ac_icon('x') ?></button></div>
                    <div class="ac-dialog__body">“Sierra & Oddball” will be deleted for good.</div>
                    <div class="ac-dialog__footer"><button type="button" class="ac-button ac-button--secondary">Cancel</button><button type="button" class="ac-button ac-button--danger"><?= ac_icon('trash-2') ?> Delete</button></div>
                </div>
                <div class="ac-card ac-stack">
                    <div class="ac-row"><span class="ac-spinner" aria-hidden="true"></span> Loading…</div>
                    <div class="ac-progress" role="progressbar" aria-valuenow="60" aria-valuemin="0" aria-valuemax="100"><div class="ac-progress__bar" style="width: 60%"></div></div>
                </div>
                <div class="ds-loader-preview">
                    <div class="ac-scrim ac-loader" role="status" aria-live="polite">
                        <div class="ac-loader__panel">
                            <div class="ac-loader__row"><span class="ac-spinner" aria-hidden="true"></span><span class="ac-loader__label">Importing the collection…</span></div>
                            <div class="ac-progress"><div class="ac-progress__bar" style="width: 40%"></div></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="ac-table-wrap">
                <table class="ac-table">
                    <thead><tr><th>Card</th><th>Faction</th><th class="ac-table__num">Cost</th><th class="ac-table__num">Qty</th></tr></thead>
                    <tbody>
                        <tr><td>Sierra</td><td>Axiom</td><td class="ac-table__num">3</td><td class="ac-table__num">1</td></tr>
                        <tr><td>Oddball</td><td>Axiom</td><td class="ac-table__num">2</td><td class="ac-table__num">3</td></tr>
                        <tr><td>Mechanical Menagerie</td><td>Axiom</td><td class="ac-table__num">4</td><td class="ac-table__num">2</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </section>

    <section class="ds-section" aria-labelledby="ds-icons">
        <h2 class="ac-section-title" id="ds-icons">Icons — Lucide</h2>
        <p class="ac-text-muted">PHP <code>ac_icon('name')</code>, site JS <code>acIcon('name')</code>, Angular <code>&lt;ac-icon name="…"&gt;</code>. All names: <a href="https://lucide.dev/icons/" target="_blank" rel="noopener">lucide.dev/icons</a>.</p>
        <div class="ac-card ds-demo" style="margin-bottom: var(--ac-space-3)">
            <?php foreach (['14', '16', '18', '20', '24'] as $sz): ?>
            <span class="ac-row"><?= ac_icon('star', 'ac-icon--' . $sz) ?><code>ac-icon--<?= h($sz) ?></code></span>
            <?php endforeach; ?>
            <span class="ac-row"><?= ac_icon('loader-circle', 'ac-icon--spin') ?><code>ac-icon--spin</code></span>
        </div>
        <div class="ds-icons">
            <?php foreach ($icons as $ic): ?>
            <div><?= ac_icon($ic) ?><?= h($ic) ?></div>
            <?php endforeach; ?>
        </div>
    </section>

    <section class="ds-section" aria-labelledby="ds-bootstrap">
        <h2 class="ac-section-title" id="ds-bootstrap">Bootstrap bridge (existing pages)</h2>
        <p class="ac-text-muted">Bootstrap markup is drawn with the tokens. New code uses the <code>ac-*</code> classes above.</p>
        <div class="card"><div class="card-body ac-stack">
            <div class="ds-demo">
                <button type="button" class="btn btn-primary">.btn-primary</button>
                <button type="button" class="btn btn-outline-secondary">.btn-outline-secondary</button>
                <button type="button" class="btn btn-outline-danger btn-sm">.btn-outline-danger</button>
                <span class="badge text-bg-secondary">.badge</span>
            </div>
            <div class="row g-3">
                <div class="col-md-6"><label class="form-label" for="ds-bs-input">.form-control</label><input class="form-control" id="ds-bs-input" placeholder="Placeholder"></div>
                <div class="col-md-6"><label class="form-label" for="ds-bs-select">.form-select</label><select class="form-select" id="ds-bs-select"><option>Option</option></select></div>
            </div>
            <div class="alert alert-warning mb-0">.alert-warning</div>
        </div></div>
    </section>
</div>

<script>
document.getElementById('ds-toast-demo').addEventListener('click', function () {
    acToast('Deck deleted.', { actionLabel: 'Undo', onAction: function () { acToast('Deck restored.'); } });
});
(function () {
    var group = document.getElementById('ds-density');
    if (!group) return;
    function sync() {
        var d = document.documentElement.getAttribute('data-density') || 'pointer';
        group.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.density === d ? 'true' : 'false'); });
    }
    group.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-density]');
        if (!b) return;
        document.documentElement.setAttribute('data-density', b.dataset.density);
        sync();
    });
    sync();
}());
</script>

<?php include dirname(__DIR__) . '/includes/footer.php'; ?>
