<?php
// Manifest `placeholder` of the Re:Builder page, included by spaRenderPage() inside the mount point with $slug and $subPath
// in scope: a skeleton of the screen the URL opens (decks list, deck page, editor and its views, new deck), from 768 px
// and on phones, shown while the scripts load. The runtime removes it once the app draws its first screen, whose loading
// state (deck bar, deck panel, board, preview… in skeleton) has the same layout: blocks here sit where the app's are
// (sizes measured on the app at 1440 and 390 px wide). Shapes only (ac-skeleton, aria-hidden): spaRenderPlaceholder()
// announces the loading.

$id   = (string)($_GET['id'] ?? '');
$view = (string)($_GET['view'] ?? '');
$tab  = (string)($_GET['tab'] ?? '');
if ($slug === 'deck' && $id !== '')            $screen = 'deck';
elseif ($slug === 'deckbuilder' && $id !== '') $screen = 'editor';
elseif ($slug === 'deckbuilder')               $screen = 'new';
else                                           $screen = 'decks';
if ($screen === 'editor' && !in_array($view, ['apercu', 'deck', 'main'], true)) $view = 'search';
if ($screen === 'deck') $view = ['deck' => 'decklist', 'description' => 'description', 'main' => 'main'][$tab] ?? 'cartes';

/** `$n` skeletons with `$class` (variants and layout classes) and an optional `--ac-skeleton-width`. */
$sk = function (string $class = '', int $n = 1, string $width = ''): string {
    $style = $width !== '' ? ' style="--ac-skeleton-width: ' . $width . '"' : '';
    return str_repeat('<span class="ac-skeleton ' . $class . '"' . $style . '></span>', $n);
};
/** Grid of card illustrations (5:7). */
$cards = function (string $class, int $n) use ($sk): string {
    return '<div class="' . $class . '">' . $sk('ac-skeleton--card', $n) . '</div>';
};
/** Deck bar (from 768 px): hero art, name, curve, rarity limits, terrain totals, actions (six in two columns of 170 px,
 * or the reduced bar's « Partager », « Copier en image », « ⋯ » at their width); `reduced` in the editor. */
$deckBar = function (bool $reduced) use ($sk): string {
    return '<div class="rbph-bar' . ($reduced ? ' rbph-bar--reduced' : '') . '">'
        . '<span class="ac-skeleton rbph-bar__art"></span>'
        . '<div class="rbph-bar__text">' . $sk('ac-skeleton--text', 1, '70px') . '<div class="rbph-bar__name">' . $sk('ac-skeleton--title', 1, '70%') . '</div>' . $sk('ac-skeleton--text', 1, '60%')
        . ($reduced ? '' : '<div class="rbph-bar__badges">' . $sk('ac-skeleton--badge', 1, '90px') . $sk('ac-skeleton--badge', 1, '64px') . '</div>' . $sk('ac-skeleton--text', 1, '50%'))
        . '</div>'
        . '<span class="rbph-bar__sep rbph-bar__sep--curve"></span><span class="ac-skeleton rbph-bar__curve"></span>'
        . ($reduced ? '<span class="rbph-bar__sep"></span><span class="ac-skeleton rbph-bar__limits"></span>' : '')
        . '<span class="rbph-bar__sep rbph-bar__sep--terrain"></span><span class="ac-skeleton rbph-bar__terrain"></span>'
        . '<div class="rbph-bar__actions">' . ($reduced ? $sk('ac-skeleton--control-sm', 1, '95px') . $sk('ac-skeleton--control-sm', 1, '141px') . $sk('ac-skeleton--control-sm', 1, 'var(--ac-control-sm)') : $sk('ac-skeleton--control-sm', 6)) . '</div>'
        . '</div>';
};
/**
 * Phones: app bar as the app draws it while the page opens (ui/nav/app-bar, editor and deck pages): the back button,
 * the hero in skeleton (editor, search and « Aperçu »), `$titles`, the editor's save status (an empty slot while idle),
 * `$icons` actions in skeleton.
 */
$appBar = function (string $titles, int $icons, bool $back = true, bool $hero = false, bool $save = false) use ($sk): string {
    return '<div class="rbph-appbar">'
        . ($back ? '<span class="ac-icon-button ac-icon-button--ghost rbph-back">' . ac_icon('chevron-left') . '</span>' : '')
        . ($hero ? '<span class="rbph-hero"><span class="ac-skeleton rbph-hero__art"></span></span>' : '')
        . '<div class="rbph-appbar__titles">' . $titles . '</div>'
        . '<div class="rbph-appbar__actions">' . ($save ? '<span class="rbph-save"></span>' : '') . $sk('ac-skeleton--circle rbph-icon', $icons) . '</div></div>';
};
/** App bar titles: a known title, or the deck's name over its rarities (three badges) or over a line of text. */
$barTitle = fn(string $text): string => '<span class="rbph-appbar__title">' . h($text) . '</span>';
$barDeck = fn(bool $rarities): string => $sk('ac-skeleton--title', 1, '70%')
    . ($rarities ? '<span class="rbph-limits">' . $sk('ac-skeleton--badge', 3, '52px') . '</span>' : $sk('ac-skeleton--text', 1, '50%'));
/** Phones: bottom navigation with `$n` entries. */
$bottomNav = function (int $n) use ($sk): string {
    return '<div class="rbph-nav">' . str_repeat('<span class="rbph-nav__item">' . $sk('ac-skeleton--circle') . $sk('ac-skeleton--text') . '</span>', $n) . '</div>';
};
/** A row of tabs on a divider. */
$tabs = function (array $widths, string $class = '') use ($sk): string {
    $out = '<div class="rbph-tabs' . ($class !== '' ? ' ' . $class : '') . '">';
    foreach ($widths as $w) $out .= $sk('ac-skeleton--text', 1, $w);
    return $out . '</div>';
};
/** Deck panel (editor, from 768 px): a type and its rows. */
$deckPanel = function () use ($sk): string {
    $rows = str_repeat('<div class="rbph-row36">' . $sk('ac-skeleton--text', 1, '60%') . $sk('ac-skeleton--text', 1, '56px') . '</div>', 5);
    return '<div class="rbph-panel rbph-deckpanel"><div class="rbph-row34">' . $sk('ac-skeleton--text', 1, '35%') . '</div>' . $rows . '</div>';
};
/** « Main de départ »: toolbar, summary, hand, stats panels (features/shared/hand-skeleton). */
$hand = function (bool $compact) use ($sk): string {
    return '<div class="rbph-hand"><div class="rbph-col12"><div class="rbph-row rbph-wrap">' . $sk('ac-skeleton--control', 1, '150px') . $sk('ac-skeleton--control', 1, '170px') . ($compact ? '' : $sk('ac-skeleton--control', 1, '120px')) . '</div>'
        . $sk('ac-skeleton--text', 1, 'min(320px, 80%)') . '<div class="rbph-hand__cards">' . $sk('ac-skeleton--card', 6) . '</div></div>'
        . '<div class="rbph-col12">' . $sk('ac-skeleton--text', 1, '200px') . '<div class="rbph-hand__panels">' . $sk('ac-skeleton--panel rbph-h200', 3) . '</div></div></div>';
};
/** Phones: a type and its card rows (« Deck » / « Decklist »). */
$listSection = function () use ($sk): string {
    return '<div class="rbph-panel rbph-msection">' . $sk('ac-skeleton--text', 1, '35%') . '<div>'
        . str_repeat('<div class="rbph-row51">' . $sk('ac-skeleton--text', 1, '55%') . $sk('ac-skeleton--text', 1, '80px') . '</div>', 4) . '</div></div>';
};
/** Board (« Aperçu » from 768 px): one group of four piles. */
$board = function () use ($sk): string {
    return '<div class="rbph-panel rbph-board"><div class="rbph-board__group">' . $sk('ac-skeleton--text', 1, '140px') . '<div class="rbph-board__cards">' . $sk('ac-skeleton--card', 4) . '</div></div></div>';
};
?>
<?php // Inline (~2 KB gzipped): a <link> here holds the paint of everything after it until it downloads, the site header
      // alone on screen meanwhile on a first visit. ?>
<style><?php readfile(__DIR__ . '/placeholder.css'); ?></style>
<div class="rbph" aria-hidden="true">
<?php if ($screen === 'decks'):
    // The community deckbuilders' banner (from 768 px), with its text: the app reads the list from the script below and
    // draws the banner on its first screen, where it would otherwise push the page down when the list arrives. Its texts
    // are the app's (decks.builders.info and decks.builders.show in app/src/locale).
    require_once __DIR__ . '/includes/community-builders.php';
    try {
        $builders = rebuilderCommunityBuilders(getUiLang());
    } catch (Throwable $e) {
        $builders = [];
    }
    $fr = getUiLang() === 'fr';
?>
  <div class="rbph-desktop rbph-decks">
    <div class="rbph-decks__head"><?= $sk('ac-skeleton--title', 1, '120px') ?><span class="rbph-grow"></span><?= $sk('ac-skeleton--control', 1, '110px') . $sk('ac-skeleton--control', 1, '150px') ?></div>
<?php if ($builders): ?>
    <div class="rbph-builders">
      <p><?= ac_icon('info') ?><span><?= h($fr ? 'D’autres deck builders partagent la même base de données. Créez, modifiez ou importez vos decks dans l’un d’eux et continuez sur un autre. Tous les decks apparaissent sur BGA.' : 'Other deck builders share the same database. Create, edit, or import decks in any of them and continue anywhere. All decks appear on BGA.') ?></span></p>
      <span class="ac-button ac-button--secondary ac-button--sm"><?= ac_icon('external-link') ?><?= h($fr ? 'Voir les deckbuilders' : 'View deckbuilders') ?></span>
    </div>
    <script type="application/json" id="rebuilder-community-builders"><?= json_encode($builders, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?></script>
<?php endif; ?>
    <?= $tabs(['110px', '100px', '180px']) ?>
    <div class="rbph-decks__filters"><?= $sk('ac-skeleton--control', 1, '300px') . $sk('ac-skeleton--control', 2, '140px') . $sk('ac-skeleton--control', 1, '200px') ?><span class="rbph-grow"></span><?= $sk('ac-skeleton--control', 1, '220px') ?></div>
    <div class="rbph-decks__factions"><?= $sk('ac-skeleton--text', 1, '56px') . $sk('rbph-chip', 7, '76px') ?></div>
    <div class="rbph-decks__grid"><?= $sk('ac-skeleton--panel', 10) ?></div>
  </div>
  <div class="rbph-compact">
    <?= $appBar($sk('ac-skeleton--title', 1, '65%'), 1, false) ?>
    <div class="rbph-mpage rbph-mpage--decks">
      <div class="rbph-row"><?= $sk('rbph-h44 rbph-grow') . $sk('rbph-h44', 1, '44px') ?></div>
      <div class="rbph-row rbph-row44"><?= $sk('ac-skeleton--text', 1, '110px') ?><span class="rbph-grow"></span><?= $sk('rbph-h44', 1, '186px') ?></div>
      <div class="rbph-mlist"><?= $sk('ac-skeleton--panel', 5) ?></div>
    </div>
    <?= $bottomNav(3) ?>
  </div>
<?php elseif ($screen === 'new'): ?>
  <?php // In the page, what the app draws there (features/decks/new-deck-page): a block of the window's height, its
        // backdrop skeleton from 768 px. Over it, where the app's overlay opens (ui/overlay: a 1080 px window, full
        // screen on phones), the form in skeleton. ?>
  <div class="rbph-new">
    <div class="rbph-desktop rbph-new__backdrop"><span class="rbph-new__bar"></span><span class="rbph-new__bar rbph-new__bar--wide"></span><div class="rbph-new__cols"><span></span><span></span><span></span></div></div>
    <div class="rbph-new__scrim"></div>
    <div class="rbph-new__window">
      <div class="rbph-new__head"><?= $sk('ac-skeleton--circle rbph-compact-only', 1, '24px') . $sk('ac-skeleton--title', 1, '140px') ?></div>
      <div class="rbph-new__body">
        <div class="rbph-new__heroes"><?= $sk('ac-skeleton--text', 1, '60px') . '<div class="rbph-new__chips">' . $sk('rbph-chip', 6, '84px') . '</div>' . $sk('rbph-chip', 1, '72px') ?><div class="rbph-new__cards"><?= $sk('ac-skeleton--card', 4) ?></div></div>
        <div class="rbph-new__side"><?= $sk('ac-skeleton--text', 1, '110px') . $sk('ac-skeleton--control') . $sk('ac-skeleton--text', 1, '80px') . $sk('ac-skeleton--control') . $sk('ac-skeleton--text', 1, '70px') . $sk('ac-skeleton--control rbph-h56', 3) ?></div>
      </div>
      <div class="rbph-new__foot"><span class="rbph-grow"></span><?= $sk('ac-skeleton--control', 1, '96px') . $sk('ac-skeleton--control', 1, '120px') ?></div>
    </div>
  </div>
<?php elseif ($screen === 'deck'): ?>
  <div class="rbph-desktop rbph-deckpage">
    <?= $deckBar(false) ?>
    <?= $tabs(['70px', '70px', '90px', '120px']) ?>
<?php if ($view === 'main'): ?>
    <?= $hand(false) ?>
<?php elseif ($view === 'cartes'): ?>
    <?= $board() ?>
<?php else: ?>
    <div class="rbph-panel rbph-h320"></div>
<?php endif; ?>
  </div>
  <div class="rbph-compact">
    <?= $appBar($barTitle('Deck'), 3) ?>
    <div class="rbph-mpage rbph-gap3">
<?php if ($view === 'main'): ?>
      <?= $hand(true) ?>
<?php elseif ($view === 'cartes'): ?>
      <div class="rbph-panel rbph-msection rbph-summary"><div class="rbph-row"><?= $sk('rbph-h44', 1, '44px') ?><div class="rbph-col12 rbph-summary__meta"><?= $sk('ac-skeleton--title', 1, '70%') . $sk('ac-skeleton--text', 1, '40%') ?></div></div><?= $sk('rbph-chip', 1, '60%') . $sk('ac-skeleton--text', 1, '60%') ?></div>
      <?= $sk('ac-skeleton--panel rbph-h190', 1) ?>
      <div class="rbph-row rbph-row36"><?= $sk('ac-skeleton--text', 1, '150px') ?><span class="rbph-grow"></span><?= $sk('ac-skeleton--control-sm', 1, '96px') ?></div>
      <div class="rbph-panel rbph-msection"><div class="rbph-mhead"><?= $sk('ac-skeleton--title', 1, '150px') ?></div><div class="rbph-dense"><?= $sk('ac-skeleton--card', 3) ?></div></div>
<?php else: ?>
      <?= $sk('ac-skeleton--panel rbph-h190', 1) ?>
      <?= $listSection() ?>
<?php endif; ?>
    </div>
    <?= $bottomNav(4) ?>
  </div>
<?php else: /* editor */ ?>
  <div class="rbph-desktop rbph-editor">
    <div class="rbph-editor__top">
      <?= $deckBar($view !== 'apercu') ?>
      <div class="rbph-modes"><span class="ac-skeleton rbph-modes__segmented"></span><?= $sk('ac-skeleton--control-sm', 1, '136px') /* « Arts des jetons » */ ?></div>
    </div>
<?php if ($view === 'apercu'): ?>
    <?= $board() ?>
    <span class="ac-skeleton rbph-decktab"></span>
<?php else: ?>
    <div class="rbph-editor__main">
<?php if ($view === 'main'): ?>
      <?= $hand(false) ?>
<?php else: ?>
      <?= $tabs(['110px', '70px', '60px', '140px', '150px']) ?>
      <div class="rbph-search">
        <div class="rbph-panel rbph-filters"><?= $sk('ac-skeleton--control') . $sk('ac-skeleton--text', 1, '30%') . '<div class="rbph-row">' . $sk('ac-skeleton--control rbph-grow') . $sk('ac-skeleton--control rbph-grow') . '</div>' . $sk('ac-skeleton--text', 1, '30%') . '<div class="rbph-row">' . $sk('ac-skeleton--control rbph-grow', 3) . '</div>' . $sk('ac-skeleton--text', 1, '30%') . $sk('rbph-h200') ?></div>
        <div class="rbph-results">
          <div class="rbph-row rbph-toolbar"><?= $sk('ac-skeleton--text', 1, '80px') . $sk('rbph-chip', 1, '110px') . $sk('rbph-chip', 1, '70px') . $sk('rbph-chip', 1, '80px') ?><span class="rbph-grow"></span><?= $sk('ac-skeleton--control', 1, '110px') . $sk('ac-skeleton--control', 1, '72px') ?></div>
          <div class="rbph-results__cards"><?= $sk('ac-skeleton--card', 6) ?></div>
        </div>
      </div>
<?php endif; ?>
    </div>
    <?= $deckPanel() ?>
<?php endif; ?>
  </div>
  <div class="rbph-compact">
    <?php if ($view === 'search' || $view === 'apercu'): ?>
    <?= $appBar($barDeck(true), 1, true, true, true) ?>
<?php else: ?>
    <?= $appBar($view === 'deck' ? $barTitle(getUiLang() === 'fr' ? 'Mon deck' : 'My deck') : $barDeck(false), 2, true, false, true) ?>
<?php endif; ?>
    <div class="rbph-mpage">
<?php if ($view === 'search'): ?>
      <div class="rbph-row"><?= $sk('rbph-h44 rbph-grow') . $sk('rbph-h44', 1, '44px') ?></div>
      <?= $tabs(['56px', '62px', '58px', '78px', '46px'], 'rbph-bleed rbph-mt12') ?>
      <div class="rbph-mchips rbph-bleed rbph-mt12"><?= $sk('', 1, '116px') . $sk('', 1, '86px') . $sk('', 1, '80px') ?></div>
      <div class="rbph-row rbph-row44"><?= $sk('ac-skeleton--text', 1, '80px') ?><span class="rbph-grow"></span><?= $sk('rbph-h44', 1, '150px') . $sk('rbph-icon24') ?></div>
      <?= $cards('rbph-mcards', 4) ?>
<?php elseif ($view === 'apercu'): ?>
      <div class="rbph-row rbph-row36 rbph-mb16"><?= $sk('ac-skeleton--text', 1, '150px') ?><span class="rbph-grow"></span><?= $sk('ac-skeleton--control-sm', 1, '96px') ?></div>
      <div class="rbph-panel rbph-msection"><div class="rbph-mhead"><?= $sk('ac-skeleton--title', 1, '150px') ?></div><?= $cards('rbph-mcards', 4) ?></div>
<?php elseif ($view === 'deck'): ?>
      <div class="rbph-col12 rbph-gap4">
        <?= $sk('ac-skeleton--panel rbph-h159') ?>
        <?= $sk('ac-skeleton--panel rbph-h190') ?>
        <?= isset(spaProxyServices()['ownership']) ? $sk('ac-skeleton--control') : '' /* « Choisir les arts des jetons » */ ?>
        <?= $listSection() ?>
      </div>
<?php else: ?>
      <?= $hand(true) ?>
<?php endif; ?>
    </div>
    <?= $bottomNav(4) ?>
  </div>
<?php endif; ?>
</div>
