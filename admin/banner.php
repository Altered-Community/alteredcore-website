<?php
$adminPageTitle = 'Banner';
$adminSection   = 'banner';
require_once __DIR__ . '/includes/header.php';

$db  = getDB();
$row = $db->query(q("SELECT * FROM {banner} WHERE id = 1"))->fetch();
if (!$row) {
    $db->exec(q("INSERT INTO {banner} (id) VALUES (1)"));
    $row = $db->query(q("SELECT * FROM {banner} WHERE id = 1"))->fetch();
}

$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        $errors[] = 'Invalid form token. Please try again.';
    } else {
        $oldBgImage = $row['bg_image'];
        $pickedBg   = trim($_POST['bg_image_picker'] ?? '');
        if ($pickedBg !== '' && !preg_match('#^uploads/[a-zA-Z0-9/_.-]+$#', $pickedBg)) {
            $pickedBg = '';
        }
        $bgImage = $pickedBg !== '' ? $pickedBg : null;
        if ($oldBgImage && $bgImage !== $oldBgImage && strpos($oldBgImage, 'uploads/') === 0) {
            if ($bgImage === null && !adminCanDelete()) {
                $errors[] = 'You do not have permission to delete images.';
            } else {
                $fp = dirname(__DIR__) . '/' . $oldBgImage;
                if (file_exists($fp)) unlink($fp);
            }
        }

        if (empty($errors)) {
            $db->prepare(q(
                "UPDATE {banner} SET
                    title_en        = :title_en,
                    title_fr        = :title_fr,
                    subtitle_en     = :subtitle_en,
                    subtitle_fr     = :subtitle_fr,
                    btn_label_en    = :btn_label_en,
                    btn_label_fr    = :btn_label_fr,
                    btn_url         = :btn_url,
                    bg_image        = :bg_image,
                    overlay_color   = :overlay_color,
                    overlay_opacity = :overlay_opacity
                 WHERE id = 1"
            ))->execute([
                ':title_en'        => trim($_POST['title_en']     ?? ''),
                ':title_fr'        => trim($_POST['title_fr']     ?? ''),
                ':subtitle_en'     => trim($_POST['subtitle_en']  ?? ''),
                ':subtitle_fr'     => trim($_POST['subtitle_fr']  ?? ''),
                ':btn_label_en'    => trim($_POST['btn_label_en'] ?? ''),
                ':btn_label_fr'    => trim($_POST['btn_label_fr'] ?? ''),
                ':btn_url'         => trim($_POST['btn_url']      ?? ''),
                ':bg_image'        => $bgImage,
                ':overlay_color'   => trim($_POST['overlay_color']   ?? '#000000') ?: '#000000',
                ':overlay_opacity' => max(0, min(100, (int)($_POST['overlay_opacity'] ?? 0))),
            ]);
            flash('Banner updated.');
            redirect(BASE_URL . '/admin/banner');
        }

        $row = array_merge($row, [
            'title_en'        => trim($_POST['title_en']     ?? ''),
            'title_fr'        => trim($_POST['title_fr']     ?? ''),
            'subtitle_en'     => trim($_POST['subtitle_en']  ?? ''),
            'subtitle_fr'     => trim($_POST['subtitle_fr']  ?? ''),
            'btn_label_en'    => trim($_POST['btn_label_en'] ?? ''),
            'btn_label_fr'    => trim($_POST['btn_label_fr'] ?? ''),
            'btn_url'         => trim($_POST['btn_url']      ?? ''),
            'bg_image'        => $bgImage,
            'overlay_color'   => trim($_POST['overlay_color']   ?? '#000000'),
            'overlay_opacity' => max(0, min(100, (int)($_POST['overlay_opacity'] ?? 0))),
        ]);
    }
}
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-image me-2"></i>Banner</h1>
    <a href="<?= BASE_URL ?>/" target="_blank" class="btn btn-outline-secondary btn-sm">
        <i class="fa-solid fa-eye me-1"></i> View site
    </a>
</div>

<?php if ($errors): ?>
    <div class="alert alert-danger">
        <ul class="mb-0">
            <?php foreach ($errors as $e): ?>
                <li><?= h($e) ?></li>
            <?php endforeach; ?>
        </ul>
    </div>
<?php endif; ?>

<form method="post" novalidate>
    <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">

    <div class="row g-4">

        <!-- English -->
        <div class="col-lg-6">
            <div class="card-altered p-3">
                <h6 class="fw-bold mb-3">English 🇬🇧</h6>
                <div class="mb-3">
                    <label class="form-label">Title</label>
                    <input type="text" name="title_en" class="form-control" value="<?= h($row['title_en']) ?>">
                </div>
                <div class="mb-3">
                    <label class="form-label">Subtitle</label>
                    <textarea name="subtitle_en" class="form-control" rows="2"><?= h($row['subtitle_en']) ?></textarea>
                </div>
                <div class="mb-3">
                    <label class="form-label">Button label</label>
                    <input type="text" name="btn_label_en" class="form-control" value="<?= h($row['btn_label_en']) ?>">
                </div>
            </div>
        </div>

        <!-- French -->
        <div class="col-lg-6">
            <div class="card-altered p-3">
                <h6 class="fw-bold mb-3">French 🇫🇷</h6>
                <div class="mb-3">
                    <label class="form-label">Title</label>
                    <input type="text" name="title_fr" class="form-control" value="<?= h($row['title_fr']) ?>">
                </div>
                <div class="mb-3">
                    <label class="form-label">Subtitle</label>
                    <textarea name="subtitle_fr" class="form-control" rows="2"><?= h($row['subtitle_fr']) ?></textarea>
                </div>
                <div class="mb-3">
                    <label class="form-label">Button label</label>
                    <input type="text" name="btn_label_fr" class="form-control" value="<?= h($row['btn_label_fr']) ?>">
                </div>
            </div>
        </div>

        <!-- Common settings -->
        <div class="col-12">
            <div class="card-altered p-3">
                <h6 class="fw-bold mb-3">Settings</h6>
                <div class="row g-3">

                    <div class="col-md-6">
                        <label class="form-label">Button URL</label>
                        <input type="text" name="btn_url" class="form-control"
                               placeholder="/pages/news.php"
                               value="<?= h($row['btn_url']) ?>">
                        <div class="form-text">Relative or absolute URL.</div>
                    </div>

                    <div class="col-md-6">
                        <label class="form-label">Text overlay (veil over the full banner)</label>
                        <div class="d-flex align-items-center gap-3 flex-wrap">
                            <div>
                                <label class="form-label small mb-1">Color</label>
                                <input type="color" name="overlay_color" class="form-control form-control-color"
                                       value="<?= h($row['overlay_color'] ?? '#000000') ?>"
                                       style="width:56px;height:38px;padding:2px">
                            </div>
                            <div style="flex:1;min-width:160px">
                                <label class="form-label small mb-1">
                                    Opacity: <span id="overlay-pct"><?= (int)($row['overlay_opacity'] ?? 0) ?></span>%
                                </label>
                                <input type="range" name="overlay_opacity" id="overlay-range"
                                       class="form-range" min="0" max="100" step="1"
                                       value="<?= (int)($row['overlay_opacity'] ?? 0) ?>">
                            </div>
                        </div>
                        <div class="form-text">Set opacity to 0 to disable the overlay.</div>
                    </div>

                    <div class="col-md-6">
                        <label class="form-label">Background image</label>
                        <div class="img-picker-widget"
                             data-input="banner_img_input"
                             data-preview="banner_img_preview"
                             data-folder="banner"
                             data-base-url="<?= BASE_URL ?>"
                             data-csrf="<?= h(csrfToken()) ?>"
                             data-original="<?= h($row['bg_image'] ?? '') ?>"
                             data-can-delete="<?= adminCanDelete() ? '1' : '0' ?>">
                            <div id="banner_img_preview" class="mb-2" style="<?= !empty($row['bg_image']) ? '' : 'display:none' ?>">
                                <div style="position:relative;display:inline-block">
                                    <img src="<?= !empty($row['bg_image']) ? h(BASE_URL . '/' . $row['bg_image']) : '' ?>" alt=""
                                         style="max-height:80px;border-radius:6px;border:1px solid var(--neutral-300)">
                                    <button type="button" class="btn btn-sm btn-danger img-picker-clear"
                                            style="position:absolute;top:-6px;right:-6px;padding:0;width:20px;height:20px;border-radius:50%;font-size:11px;line-height:1">×</button>
                                </div>
                            </div>
                            <input type="hidden" name="bg_image_picker" id="banner_img_input" value="<?= h($row['bg_image'] ?? '') ?>">
                            <button type="button" class="btn btn-outline-secondary btn-sm img-picker-btn">
                                <i class="fa-solid fa-images me-1"></i> Choose image
                            </button>
                            <div class="form-text">JPG, PNG, WebP or GIF — max 5 MB</div>
                        </div>
                    </div>

                </div>
            </div>
        </div>

    </div>

    <div class="mt-4">
        <button type="submit" class="btn btn-sm btn-primary-altered px-4">
            <i class="fa-solid fa-floppy-disk me-1"></i> Save
        </button>
    </div>
</form>

<script>
document.getElementById('overlay-range').addEventListener('input', function() {
    document.getElementById('overlay-pct').textContent = this.value;
});
</script>
<?php require_once __DIR__ . '/includes/footer.php'; ?>
