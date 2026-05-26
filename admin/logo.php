<?php
$adminPageTitle = 'Logo';
$adminSection   = 'logo';
require_once __DIR__ . '/includes/header.php';

$errors   = [];
$logoPath = getSetting('logo_path');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        $errors[] = 'Invalid form token.';
    } else {
        if (!empty($_POST['delete_logo']) && $logoPath) {
            if (!adminCanDelete()) {
                flash('You do not have permission to delete.', 'error');
                redirect(BASE_URL . '/admin/logo');
            }
            $fp = dirname(__DIR__) . '/' . $logoPath;
            if (file_exists($fp)) unlink($fp);
            saveSetting('logo_path', null);
            flash('Logo deleted.');
            redirect(BASE_URL . '/admin/logo');
        }

        $pickedLogo = trim($_POST['logo_picker'] ?? '');
        if ($pickedLogo !== '' && !preg_match('#^uploads/[a-zA-Z0-9/_.-]+$#', $pickedLogo)) {
            $pickedLogo = '';
        }
        if ($pickedLogo !== '') {
            saveSetting('logo_path', $pickedLogo);
            flash('Logo updated.');
            redirect(BASE_URL . '/admin/logo');
        }
    }
}

$logoPath = getSetting('logo_path');
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-image me-2"></i>Logo</h1>
</div>

<?php if ($errors): ?>
    <div class="alert alert-danger">
        <ul class="mb-0"><?php foreach ($errors as $e): ?><li><?= h($e) ?></li><?php endforeach; ?></ul>
    </div>
<?php endif; ?>

<div class="card-altered p-4" style="max-width:500px">
    <?php if ($logoPath): ?>
        <div class="mb-4">
            <div class="fw-bold mb-2">Current logo</div>
            <div style="background:var(--sand-200);padding:1rem;border-radius:.75rem;display:inline-block">
                <img src="<?= h(assetUrl($logoPath)) ?>" alt="Current logo"
                     style="max-height:60px;max-width:200px;display:block">
            </div>
        </div>
        <?php if (adminCanDelete()): ?>
        <form method="post" class="mb-4">
            <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
            <input type="hidden" name="delete_logo" value="1">
            <button type="submit" class="btn btn-outline-danger btn-sm"
                    onclick="return confirm('Delete the logo and revert to the default SVG?')">
                <i class="fa-solid fa-trash me-1"></i> Delete logo
            </button>
        </form>
        <?php endif; ?>
    <?php else: ?>
        <p class="text-muted mb-3">No custom logo — the default SVG logo is used.</p>
    <?php endif; ?>

    <form method="post" novalidate>
        <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
        <div class="mb-3">
            <label class="form-label fw-semibold">
                <?= $logoPath ? 'Replace logo' : 'Upload a logo' ?>
            </label>
            <div class="img-picker-widget"
                 data-input="logo_img_input"
                 data-preview="logo_img_preview"
                 data-folder="logo"
                 data-base-url="<?= BASE_URL ?>"
                 data-csrf="<?= h(csrfToken()) ?>"
                 data-original="<?= h($logoPath ?? '') ?>"
                 data-can-delete="<?= adminCanDelete() ? '1' : '0' ?>">
                <div id="logo_img_preview" class="mb-2" style="<?= $logoPath ? '' : 'display:none' ?>">
                    <div style="position:relative;display:inline-block;background:var(--sand-200);padding:.5rem;border-radius:.5rem">
                        <img src="<?= $logoPath ? h(assetUrl($logoPath)) : '' ?>" alt=""
                             style="max-height:60px;max-width:200px;display:block">
                        <button type="button" class="btn btn-sm btn-danger img-picker-clear"
                                style="position:absolute;top:-6px;right:-6px;padding:0;width:20px;height:20px;border-radius:50%;font-size:11px;line-height:1">×</button>
                    </div>
                </div>
                <input type="hidden" name="logo_picker" id="logo_img_input" value="<?= h($logoPath ?? '') ?>">
                <button type="button" class="btn btn-outline-secondary btn-sm img-picker-btn">
                    <i class="fa-solid fa-images me-1"></i> Choose logo
                </button>
                <div class="form-text">JPG, PNG, WebP, GIF or SVG — max 2 MB</div>
            </div>
        </div>
        <button type="submit" class="btn btn-sm btn-primary-altered">
            <i class="fa-solid fa-floppy-disk me-1"></i> Save
        </button>
    </form>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
