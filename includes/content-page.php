<?php
require_once dirname(__DIR__) . '/includes/functions.php';
require_once dirname(__DIR__) . '/includes/shortcodes.php';
initLang();

$_slug = basename($_SERVER['PHP_SELF'], '.php');
$_db   = getDB();
$_stmt = $_db->prepare(q(
    "SELECT title_en, title_fr, content_en, content_fr, is_visible FROM {pages} WHERE slug = :slug AND type = 'content' LIMIT 1"
));
$_stmt->execute([':slug' => $_slug]);
$_cp = $_stmt->fetch();

if (!$_cp) {
    http_response_code(404);
    require_once dirname(__DIR__) . '/pages/404.php';
    exit;
}

$_lang    = getUiLang();
$pageTitle = $_cp['title_' . $_lang] ?: $_cp['title_en'];
$_content  = $_cp['content_' . $_lang] ?: $_cp['content_en'];

require_once dirname(__DIR__) . '/includes/header.php';
?>
<div class="container py-4">
    <div class="d-flex align-items-center justify-content-between mb-4">
        <div class="section-title mb-0"><span><?= h($pageTitle) ?></span></div>
    </div>
    <?= renderShortcodes($_content) ?>
</div>
<?php require_once dirname(__DIR__) . '/includes/footer.php'; ?>
