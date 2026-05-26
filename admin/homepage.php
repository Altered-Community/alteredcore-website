<?php
$adminPageTitle = 'Homepage';
$adminSection   = 'homepage';
require_once __DIR__ . '/includes/header.php';

if (!adminCanEdit()) {
    flash('You do not have permission to edit the homepage.', 'error');
    redirect(BASE_URL . '/admin/');
}

$contentEn = getSetting('homepage_content_en') ?: '';
$contentFr = getSetting('homepage_content_fr') ?: '';
$errors    = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        $errors[] = 'Invalid form token. Please try again.';
    } else {
        $contentEn = $_POST['content_en'] ?? '';
        $contentFr = $_POST['content_fr'] ?? '';
        saveSetting('homepage_content_en', $contentEn);
        saveSetting('homepage_content_fr', $contentFr);
        flash('Homepage saved.');
        redirect(BASE_URL . '/admin/homepage');
    }
}
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-house me-2"></i>Homepage</h1>
    <a href="<?= BASE_URL ?>/" target="_blank" class="btn btn-outline-secondary btn-sm">
        <i class="fa-solid fa-arrow-up-right-from-square me-1"></i> View
    </a>
</div>

<p class="text-muted small mb-3">
    Content injected below the news section on the homepage. Both languages are optional — English is used as fallback.
</p>

<?php if ($errors): ?>
<div class="alert alert-danger">
    <ul class="mb-0"><?php foreach ($errors as $e): ?><li><?= h($e) ?></li><?php endforeach; ?></ul>
</div>
<?php endif; ?>

<form method="post" novalidate>
    <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">

    <div class="card-altered p-3 mb-3">
        <label class="form-label fw-semibold mb-1">
            <span class="badge bg-primary me-1" style="font-size:.7rem">EN</span> English content
        </label>
        <textarea name="content_en" class="tinymce-editor"><?= h($contentEn) ?></textarea>
    </div>

    <div class="card-altered p-3 mb-3">
        <label class="form-label fw-semibold mb-1">
            <span class="badge me-1" style="font-size:.7rem;background:#1d4ed8">FR</span> French content
        </label>
        <textarea name="content_fr" class="tinymce-editor"><?= h($contentFr) ?></textarea>
    </div>

    <button type="submit" class="btn btn-sm btn-primary-altered px-4">
        <i class="fa-solid fa-floppy-disk me-1"></i> Save
    </button>
</form>

<?php
$__tinymce_editor = true;
require_once __DIR__ . '/includes/footer.php';
?>
