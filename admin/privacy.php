<?php
$adminPageTitle = 'Privacy Policy';
$adminSection   = 'privacy';
require_once __DIR__ . '/includes/header.php';

$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        $errors[] = 'Invalid form token.';
    } else {
        saveSetting('privacy_content_en', trim($_POST['content_en'] ?? ''));
        saveSetting('privacy_content_fr', trim($_POST['content_fr'] ?? ''));
        flash('Privacy policy saved.');
        redirect(BASE_URL . '/admin/privacy');
    }
}

$contentEn = getSetting('privacy_content_en');
$contentFr = getSetting('privacy_content_fr');
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-shield-halved me-2"></i>Privacy Policy / RGPD</h1>
    <a href="<?= BASE_URL ?>/pages/privacy" target="_blank" class="btn btn-outline-secondary btn-sm">
        <i class="fa-solid fa-eye me-1"></i> View page
    </a>
</div>

<?php if ($errors): ?>
    <div class="alert alert-danger">
        <ul class="mb-0"><?php foreach ($errors as $e): ?><li><?= h($e) ?></li><?php endforeach; ?></ul>
    </div>
<?php endif; ?>

<form method="post" novalidate>
    <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">

    <div class="row g-4">
        <div class="col-lg-6">
            <div class="card-altered p-3">
                <h6 class="fw-bold mb-3">English 🇬🇧</h6>
                <textarea name="content_en" class="tinymce-editor" rows="20"><?= h($contentEn) ?></textarea>
            </div>
        </div>
        <div class="col-lg-6">
            <div class="card-altered p-3">
                <h6 class="fw-bold mb-3">French 🇫🇷</h6>
                <textarea name="content_fr" class="tinymce-editor" rows="20"><?= h($contentFr) ?></textarea>
            </div>
        </div>
    </div>

    <div class="mt-4">
        <button type="submit" class="btn btn-sm btn-primary-altered px-4">
            <i class="fa-solid fa-floppy-disk me-1"></i> Save
        </button>
    </div>
</form>

<?php $__tinymce_editor = true; require_once __DIR__ . '/includes/footer.php'; ?>
