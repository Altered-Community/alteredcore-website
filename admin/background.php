<?php
$adminPageTitle = 'Background';
$adminSection   = 'background';
require_once __DIR__ . '/includes/header.php';

$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        $errors[] = 'Invalid form token.';
    } else {
        $action = $_POST['action'] ?? '';

        // save all settings
        if ($action === 'save') {

            $validatePicker = fn($v) => (preg_match('#^uploads/[a-zA-Z0-9/_.-]+$#', trim($v)) ? trim($v) : null);

            $newBgImage   = $validatePicker($_POST['bg_image_picker']        ?? '');
            $newFtBgImage = $validatePicker($_POST['footer_bg_image_picker'] ?? '');

            $oldBgImage   = getSetting('bg_image');
            $oldFtBgImage = getSetting('footer_bg_image');

            if (empty($errors)) {
                $color = trim($_POST['bg_color'] ?? '');
                if ($color === '' || preg_match('/^#[0-9a-fA-F]{3,8}$/', $color)) {
                    saveSetting('bg_color', $color !== '' ? $color : null);
                }
                saveSetting('bg_image_mode', in_array($_POST['bg_image_mode'] ?? '', ['cover','repeat'], true) ? $_POST['bg_image_mode'] : 'cover');
                saveSetting('footer_bg_mode', in_array($_POST['footer_bg_mode'] ?? '', ['cover','repeat'], true) ? $_POST['footer_bg_mode'] : 'cover');

                foreach ([
                    [$newBgImage,   'bg_image'],
                    [$newFtBgImage, 'footer_bg_image'],
                ] as [$new, $key]) {
                    saveSetting($key, $new);
                }

                flash('Background saved.');
                redirect(BASE_URL . '/admin/background');
            }
        }

        // delete actions
        $deleteMap = [
            'delete_bg_image'        => 'bg_image',
            'delete_footer_bg_image' => 'footer_bg_image',
        ];
        if (isset($deleteMap[$action])) {
            if (!adminCanDelete()) {
                flash('You do not have permission to delete.', 'error');
                redirect(BASE_URL . '/admin/background');
            }
            $key = $deleteMap[$action];
            $old = getSetting($key);
            if ($old && strpos($old, 'uploads/background/') === 0) {
                $p = dirname(__DIR__) . '/' . $old;
                if (file_exists($p)) unlink($p);
            }
            saveSetting($key, null);
            flash('Image deleted.');
            redirect(BASE_URL . '/admin/background');
        }
    }
}

$currentColor = getSetting('bg_color') ?: '#FAF5E8';
$currentImage = getSetting('bg_image');
$currentMode  = getSetting('bg_image_mode') ?: 'cover';
$ftBgImage    = getSetting('footer_bg_image');
$ftBgMode     = getSetting('footer_bg_mode') ?: 'cover';
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-fill-drip me-2"></i>Background</h1>
</div>

<?php if ($errors): ?>
    <div class="alert alert-danger">
        <ul class="mb-0"><?php foreach ($errors as $e): ?><li><?= h($e) ?></li><?php endforeach; ?></ul>
    </div>
<?php endif; ?>

<form method="post">
    <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
    <input type="hidden" name="action" value="save">

    <!-- ── Page background ── -->
    <h5 class="fw-bold mb-3">Page background</h5>

    <div class="card-altered p-3 mb-4">
        <h6 class="fw-bold mb-3">Background color</h6>
        <div class="d-flex align-items-center gap-3 flex-wrap">
            <input type="color" name="bg_color" class="form-control form-control-color"
                   value="<?= h($currentColor) ?>" style="width:60px;height:38px;padding:2px">
            <input type="text" id="bgColorText" class="form-control" style="max-width:120px"
                   value="<?= h($currentColor) ?>" placeholder="#FAF5E8"
                   pattern="^#[0-9a-fA-F]{3,8}$">
            <button type="button" class="btn btn-sm btn-outline-secondary"
                    onclick="document.querySelector('[name=bg_color]').value='#FAF5E8';document.getElementById('bgColorText').value='#FAF5E8'">
                Reset
            </button>
        </div>
        <div class="mt-3" id="colorPreview"
             style="height:48px;border-radius:.5rem;border:2px solid var(--sand-300);background:<?= h($currentColor) ?>"></div>
    </div>

    <div class="card-altered p-3 mb-4">
        <h6 class="fw-bold mb-3">Background image</h6>
        <div class="mb-3">
            <label class="form-label">Display mode</label>
            <div class="d-flex gap-3">
                <label class="d-flex align-items-center gap-2" style="cursor:pointer">
                    <input type="radio" name="bg_image_mode" value="cover" <?= $currentMode === 'cover' ? 'checked' : '' ?>>
                    <span><i class="fa-solid fa-expand me-1"></i> Cover <span class="text-muted small">(full image)</span></span>
                </label>
                <label class="d-flex align-items-center gap-2" style="cursor:pointer">
                    <input type="radio" name="bg_image_mode" value="repeat" <?= $currentMode === 'repeat' ? 'checked' : '' ?>>
                    <span><i class="fa-solid fa-border-all me-1"></i> Repeat <span class="text-muted small">(texture)</span></span>
                </label>
            </div>
        </div>
        <div class="img-picker-widget"
             data-input="bg_img_input"
             data-preview="bg_img_preview"
             data-folder="background"
             data-base-url="<?= BASE_URL ?>"
             data-csrf="<?= h(csrfToken()) ?>"
             data-original="<?= h($currentImage ?? '') ?>"
             data-can-delete="<?= adminCanDelete() ? '1' : '0' ?>">
            <div id="bg_img_preview" class="mb-2" style="<?= $currentImage ? '' : 'display:none' ?>">
                <div style="position:relative;display:inline-block">
                    <img src="<?= $currentImage ? h(BASE_URL . '/' . $currentImage) : '' ?>" alt=""
                         style="max-height:80px;border-radius:6px;border:1px solid var(--neutral-300)">
                    <button type="button" class="btn btn-sm btn-danger img-picker-clear"
                            style="position:absolute;top:-6px;right:-6px;padding:0;width:20px;height:20px;border-radius:50%;font-size:11px;line-height:1">×</button>
                </div>
            </div>
            <input type="hidden" name="bg_image_picker" id="bg_img_input" value="<?= h($currentImage ?? '') ?>">
            <button type="button" class="btn btn-outline-secondary btn-sm img-picker-btn">
                <i class="fa-solid fa-images me-1"></i> Choose image
            </button>
            <div class="form-text">JPG, PNG, WebP or GIF — max 5 MB</div>
        </div>
    </div>

    <!-- ── Footer ── -->
    <h5 class="fw-bold mb-3 mt-2">Footer background</h5>

    <div class="card-altered p-3 mb-4">
        <h6 class="fw-bold mb-3">Footer background image</h6>
        <div class="mb-3">
            <label class="form-label">Display mode</label>
            <div class="d-flex gap-3">
                <label class="d-flex align-items-center gap-2" style="cursor:pointer">
                    <input type="radio" name="footer_bg_mode" value="cover" <?= $ftBgMode === 'cover' ? 'checked' : '' ?>>
                    <span><i class="fa-solid fa-expand me-1"></i> Cover</span>
                </label>
                <label class="d-flex align-items-center gap-2" style="cursor:pointer">
                    <input type="radio" name="footer_bg_mode" value="repeat" <?= $ftBgMode === 'repeat' ? 'checked' : '' ?>>
                    <span><i class="fa-solid fa-border-all me-1"></i> Repeat <span class="text-muted small">(texture)</span></span>
                </label>
            </div>
        </div>
        <div class="img-picker-widget"
             data-input="ft_bg_img_input"
             data-preview="ft_bg_img_preview"
             data-folder="background"
             data-base-url="<?= BASE_URL ?>"
             data-csrf="<?= h(csrfToken()) ?>"
             data-original="<?= h($ftBgImage ?? '') ?>"
             data-can-delete="<?= adminCanDelete() ? '1' : '0' ?>">
            <div id="ft_bg_img_preview" class="mb-2" style="<?= $ftBgImage ? '' : 'display:none' ?>">
                <div style="position:relative;display:inline-block">
                    <img src="<?= $ftBgImage ? h(BASE_URL . '/' . $ftBgImage) : '' ?>" alt=""
                         style="max-height:80px;border-radius:6px;border:1px solid var(--neutral-300)">
                    <button type="button" class="btn btn-sm btn-danger img-picker-clear"
                            style="position:absolute;top:-6px;right:-6px;padding:0;width:20px;height:20px;border-radius:50%;font-size:11px;line-height:1">×</button>
                </div>
            </div>
            <input type="hidden" name="footer_bg_image_picker" id="ft_bg_img_input" value="<?= h($ftBgImage ?? '') ?>">
            <button type="button" class="btn btn-outline-secondary btn-sm img-picker-btn">
                <i class="fa-solid fa-images me-1"></i> Choose image
            </button>
            <div class="form-text">JPG, PNG, WebP or GIF — max 5 MB</div>
        </div>
    </div>

    <button type="submit" class="btn btn-sm btn-primary-altered">
        <i class="fa-solid fa-floppy-disk me-1"></i> Save
    </button>
</form>

<!-- Delete forms (hidden) -->
<?php foreach (['bg_image', 'footer_bg_image'] as $_dk): ?>
<form id="deleteForm_<?= $_dk ?>" method="post" style="display:none">
    <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
    <input type="hidden" name="action" value="delete_<?= $_dk ?>">
</form>
<?php endforeach; ?>

<script>
(function () {
    var picker  = document.querySelector('[name=bg_color]');
    var text    = document.getElementById('bgColorText');
    var preview = document.getElementById('colorPreview');

    picker.addEventListener('input', function () {
        text.value = this.value;
        preview.style.background = this.value;
    });
    text.addEventListener('input', function () {
        if (/^#[0-9a-fA-F]{3,8}$/.test(this.value)) {
            picker.value = this.value;
            preview.style.background = this.value;
        }
    });
})();
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
