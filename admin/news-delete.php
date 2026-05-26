<?php
require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/includes/functions.php';
requireAdmin();
$adminSection = 'news';
adminSetSection('news');

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if (!$id) {
    redirect(BASE_URL . '/admin/news');
}

$db   = getDB();
$stmt = $db->prepare(q("SELECT id, title_en FROM {news} WHERE id = :id"));
$stmt->execute([':id' => $id]);
$news = $stmt->fetch();

if (!$news) {
    flash('News not found.', 'error');
    redirect(BASE_URL . '/admin/news');
}

// POST = confirmed delete
if ($_SERVER['REQUEST_METHOD'] === 'POST' && csrfValid($_POST['csrf_token'] ?? '')) {
    if (!adminCanDelete()) {
        flash('You do not have permission to delete.', 'error');
        redirect(BASE_URL . '/admin/news');
    }
    $db->prepare(q("DELETE FROM {news} WHERE id = :id"))->execute([':id' => $id]);
    flash('News deleted.');
    redirect(BASE_URL . '/admin/news');
}

$adminPageTitle = 'Delete news';
require_once __DIR__ . '/includes/header.php';
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-trash me-2 text-danger"></i>Delete news</h1>
</div>

<div class="card-altered p-4" style="max-width:500px">
    <?php if (!adminCanDelete()): ?>
        <div class="alert alert-danger">You do not have permission to delete.</div>
        <a href="<?= BASE_URL ?>/admin/news" class="btn btn-sm btn-outline-secondary">← Back</a>
    <?php else: ?>
    <p>Are you sure you want to delete <strong><?= h($news['title_en']) ?></strong>?</p>
    <p class="text-danger small">This action cannot be undone.</p>
    <form method="post" class="d-flex gap-2">
        <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
        <button type="submit" class="btn btn-sm btn-danger">
            <i class="fa-solid fa-trash me-1"></i> Yes, delete
        </button>
        <a href="<?= BASE_URL ?>/admin/news" class="btn btn-sm btn-outline-secondary">Cancel</a>
    </form>
    <?php endif; ?>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
