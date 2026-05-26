<?php
require_once dirname(__DIR__) . '/includes/functions.php';
initLang();

// translations
$txt = [
    'en' => [
        'open_new_tab' => 'Open in new tab',
        'loading'      => 'Loading…',
    ],
    'fr' => [
        'open_new_tab' => 'Ouvrir dans un nouvel onglet',
        'loading'      => 'Chargement…',
    ],
][getUiLang()] ?? [];

$navId = (int)($_GET['nav'] ?? 0);
if (!$navId) {
    header('Location: ' . BASE_URL . '/');
    exit;
}

// Load nav item from DB — URL comes from DB, not from the request (security)
try {
    $stmt = getDB()->prepare(q("SELECT * FROM {nav_items} WHERE id = :id AND is_iframe = 1 AND is_visible = 1"));
    $stmt->execute([':id' => $navId]);
    $navItem = $stmt->fetch();
} catch (Exception $e) {
    $navItem = null;
}

if (!$navItem) {
    header('Location: ' . BASE_URL . '/');
    exit;
}

$lang          = getLang();
$iframeUrl     = $navItem['url'];
$pageTitle     = $navItem['label_' . $lang] ?? $navItem['label_en'];
$pageFullwidth = !empty($navItem['is_fullwidth']);

include dirname(__DIR__) . '/includes/header.php';
?>

<div id="iframe-bar">
    <i class="fa-solid fa-arrow-up-right-from-square" style="color:var(--primary-400)"></i>
    <span><?= h($iframeUrl) ?></span>
    <a href="<?= h($iframeUrl) ?>" target="_blank" rel="noopener noreferrer" style="margin-left:auto">
        <i class="fa-solid fa-up-right-from-square"></i>
        <?= h($txt['open_new_tab']) ?>
    </a>
</div>

<div id="iframe-wrap">
    <div id="iframe-loader">
        <div class="spinner-border" style="width:1.5rem;height:1.5rem;border-width:3px;color:var(--primary-400)"></div>
        <span><?= h($txt['loading']) ?></span>
    </div>
    <iframe src="<?= h($iframeUrl) ?>"
            title="<?= h($pageTitle) ?>"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            referrerpolicy="no-referrer-when-downgrade"
            onload="document.getElementById('iframe-loader').style.display='none'">
    </iframe>
</div>

<?php include dirname(__DIR__) . '/includes/footer.php'; ?>
