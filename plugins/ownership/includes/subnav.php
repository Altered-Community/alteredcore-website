<?php
// Shared sub-nav for the "Digital Ownership" area — included by pages/ownership.php,
// pages/boosters.php and pages/history.php. Set $ownActiveTab to 'boosters' or 'history'
// before including (left unset/'' on the hub page, where nothing is active).
//
// Mirrors AlteredOwnership's own 4-link nav (Collection/Boosters/History/Import), but
// "Collection" now points at core-altered-cards' own catalog browser in its already-built
// "Digital Ownership" scope (?tab=ownership) instead of a page this plugin owns, and
// "Import" stays an external link to the AlteredOwnership service (not ported here).
$ownActiveTab = $ownActiveTab ?? '';

$ownSubnavTxt = [
    'en' => ['collection' => 'Collection', 'boosters' => 'Boosters', 'history' => 'History', 'import' => 'Import'],
    'fr' => ['collection' => 'Collection', 'boosters' => 'Boosters', 'history' => 'Historique', 'import' => 'Import'],
][getUiLang()];

$ownBoosterCount = null;
if (kcIsLoggedIn()) {
    $ownBoosterCount = ownGetBoosterCount((int)($_SESSION['user_id'] ?? 0));
}

$ownImportUrl = (defined('OWNERSHIP_WEB_URL') && OWNERSHIP_WEB_URL) ? rtrim(OWNERSHIP_WEB_URL, '/') . '/import.html' : '';
?>
<nav class="own-subnav mb-4">
    <div class="own-subnav-inner">
        <a class="own-subnav-link" href="<?= h(BASE_URL) ?>/pages/cards?tab=ownership">
            <i class="fa-solid fa-layer-group"></i><span><?= h($ownSubnavTxt['collection']) ?></span>
        </a>
        <a class="own-subnav-link<?= $ownActiveTab === 'boosters' ? ' own-subnav-link--active' : '' ?>" href="<?= h(BASE_URL) ?>/pages/boosters">
            <i class="fa-solid fa-gift"></i><span><?= h($ownSubnavTxt['boosters']) ?></span>
            <span id="own-nav-boosters-badge" class="own-subnav-badge"<?= ($ownBoosterCount === null || $ownBoosterCount <= 0) ? ' hidden' : '' ?>><?= $ownBoosterCount !== null ? h((string)($ownBoosterCount > 99 ? '99+' : $ownBoosterCount)) : '0' ?></span>
        </a>
        <a class="own-subnav-link<?= $ownActiveTab === 'history' ? ' own-subnav-link--active' : '' ?>" href="<?= h(BASE_URL) ?>/pages/ownership-history">
            <i class="fa-solid fa-clock-rotate-left"></i><span><?= h($ownSubnavTxt['history']) ?></span>
        </a>
        <?php if ($ownImportUrl): ?>
        <a class="own-subnav-link" href="<?= h($ownImportUrl) ?>" target="_blank" rel="noopener">
            <i class="fa-solid fa-file-import"></i><span><?= h($ownSubnavTxt['import']) ?></span>
        </a>
        <?php endif; ?>
    </div>
</nav>
