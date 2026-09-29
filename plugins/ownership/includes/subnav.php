<?php
// Shared sub-nav for the "Digital Ownership" area — included by pages/ownership.php,
// pages/collection.php, pages/boosters.php and pages/history.php. Set $ownActiveTab to
// 'collection', 'boosters', 'history' or 'alt-arts' before including (left unset/''
// on the hub page, where nothing is active).
//
// Mirrors AlteredOwnership's own 4-link nav (Collection/Boosters/History/Import), but
// "Collection" now points at pages/collection.php, which embeds core-altered-cards' own
// catalog browser forced to its already-built "Digital Ownership" scope, and "Import"
// stays an external link to the AlteredOwnership service (not ported here).
$ownActiveTab = $ownActiveTab ?? '';

// "Collection" is deliberately not just "Collection" — that's already the label of the
// physical-collection tab elsewhere on the site (core-altered-cards/pages/collection.php);
// keeping "Digital Ownership"/"Propriété numérique" here avoids the two being confused.
$ownSubnavTxt = [
    'en' => ['collection' => 'Digital Ownership', 'boosters' => 'Boosters', 'history' => 'History', 'altArts' => 'Alt Arts BGA', 'import' => 'Equinox Import'],
    'fr' => ['collection' => 'Propriété numérique', 'boosters' => 'Boosters', 'history' => 'Historique', 'altArts' => 'Alt Arts BGA', 'import' => 'Import Equinox'],
][getUiLang()];

$ownBoosterCount = null;
if (kcIsLoggedIn()) {
    $ownBoosterCount = ownGetBoosterCount((int)($_SESSION['user_id'] ?? 0));
}

// AlteredOwnership's own site now only has the import form at its root (the
// collection/boosters/history pages it used to serve moved here).
$ownImportUrl = (defined('OWNERSHIP_WEB_URL') && OWNERSHIP_WEB_URL) ? rtrim(OWNERSHIP_WEB_URL, '/') . '/' : '';
?>
<?php
$ownTab = function (string $tab) use ($ownActiveTab): string {
    return $ownActiveTab === $tab ? ' aria-current="page"' : '';
};
?>
<nav class="own-subnav ac-tabs ac-tabs--underline" aria-label="<?= h($ownSubnavTxt['collection']) ?>">
    <a href="<?= h(BASE_URL) ?>/pages/ownership-collection?tab=ownership"<?= $ownTab('collection') ?>>
        <?= ac_icon('layers') ?><span><?= h($ownSubnavTxt['collection']) ?></span>
    </a>
    <a href="<?= h(BASE_URL) ?>/pages/boosters"<?= $ownTab('boosters') ?>>
        <?= ac_icon('gift') ?><span><?= h($ownSubnavTxt['boosters']) ?></span>
        <span id="own-nav-boosters-badge" class="ac-count"<?= ($ownBoosterCount === null || $ownBoosterCount <= 0) ? ' hidden' : '' ?>><?= $ownBoosterCount !== null ? h((string)($ownBoosterCount > 99 ? '99+' : $ownBoosterCount)) : '0' ?></span>
    </a>
    <a href="<?= h(BASE_URL) ?>/pages/ownership-history"<?= $ownTab('history') ?>>
        <?= ac_icon('history') ?><span><?= h($ownSubnavTxt['history']) ?></span>
    </a>
    <a href="<?= h(BASE_URL) ?>/pages/ownership-alt-arts"<?= $ownTab('alt-arts') ?>>
        <?= ac_icon('palette') ?><span><?= h($ownSubnavTxt['altArts']) ?></span>
    </a>
    <?php if ($ownImportUrl): ?>
    <a href="<?= h($ownImportUrl) ?>" target="_blank" rel="noopener">
        <?= ac_icon('file-input') ?><span><?= h($ownSubnavTxt['import']) ?></span>
    </a>
    <?php endif; ?>
</nav>
