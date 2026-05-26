<?php
$adminPageTitle = 'Maintenance';
$adminSection   = 'maintenance';
require_once __DIR__ . '/includes/header.php';

$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        $errors[] = 'Invalid form token.';
    } else {
        $enabled = isset($_POST['maintenance_enabled']) ? '1' : '0';
        saveSetting('maintenance_enabled',   $enabled);
        saveSetting('maintenance_title_en',  trim($_POST['maintenance_title_en']  ?? '') ?: null);
        saveSetting('maintenance_title_fr',  trim($_POST['maintenance_title_fr']  ?? '') ?: null);
        saveSetting('maintenance_text_en',   trim($_POST['maintenance_text_en']   ?? '') ?: null);
        saveSetting('maintenance_text_fr',   trim($_POST['maintenance_text_fr']   ?? '') ?: null);
        flash('Maintenance settings saved.');
        redirect(BASE_URL . '/admin/maintenance');
    }
}

$enabled    = getSetting('maintenance_enabled') === '1';
$titleEn    = getSetting('maintenance_title_en');
$titleFr    = getSetting('maintenance_title_fr');
$textEn     = getSetting('maintenance_text_en');
$textFr     = getSetting('maintenance_text_fr');
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-triangle-exclamation me-2"></i>Maintenance</h1>
    <?php if ($enabled): ?>
        <span class="badge bg-danger fs-6">MAINTENANCE ON</span>
    <?php else: ?>
        <span class="badge bg-success fs-6">Site live</span>
    <?php endif; ?>
</div>

<?php if ($errors): ?>
    <div class="alert alert-danger">
        <ul class="mb-0"><?php foreach ($errors as $e): ?><li><?= h($e) ?></li><?php endforeach; ?></ul>
    </div>
<?php endif; ?>

<form method="post" novalidate>
    <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">

    <!-- Toggle -->
    <div class="card-altered p-3 mb-4">
        <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" name="maintenance_enabled" id="maint_toggle"
                   role="switch" value="1" <?= $enabled ? 'checked' : '' ?>>
            <label class="form-check-label fw-semibold" for="maint_toggle">
                Enable maintenance mode
            </label>
        </div>
        <p class="text-muted small mt-2 mb-0">
            When enabled, all public pages show the maintenance screen. Logged-in admins still see the normal site.
        </p>
    </div>

    <!-- Content -->
    <div class="card-altered p-3 mb-4">
        <h6 class="fw-bold mb-3">Page content</h6>
        <p class="text-muted small mb-3">Leave blank to use the built-in default texts.</p>

        <div class="row g-3">
            <div class="col-md-6">
                <label class="form-label">Title English 🇬🇧</label>
                <input type="text" name="maintenance_title_en" class="form-control"
                       placeholder="Under Maintenance"
                       value="<?= h($titleEn) ?>">
            </div>
            <div class="col-md-6">
                <label class="form-label">Title French 🇫🇷</label>
                <input type="text" name="maintenance_title_fr" class="form-control"
                       placeholder="Under Maintenance"
                       value="<?= h($titleFr) ?>">
            </div>
            <div class="col-md-6">
                <label class="form-label">Message English 🇬🇧</label>
                <textarea name="maintenance_text_en" class="form-control" rows="4"
                          placeholder="The site is temporarily unavailable. Please come back soon."><?= h($textEn) ?></textarea>
            </div>
            <div class="col-md-6">
                <label class="form-label">Message French 🇫🇷</label>
                <textarea name="maintenance_text_fr" class="form-control" rows="4"
                          placeholder="The site is temporarily unavailable. Please check back soon."><?= h($textFr) ?></textarea>
            </div>
        </div>
    </div>

    <button type="submit" class="btn btn-sm btn-primary-altered">
        <i class="fa-solid fa-floppy-disk me-1"></i> Save
    </button>
</form>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
