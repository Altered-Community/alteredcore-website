<?php
$adminPageTitle = 'Fonts';
$adminSection   = 'font';
require_once __DIR__ . '/includes/header.php';

$fontDir  = dirname(__DIR__) . '/assets/font/';
$fontExts = ['woff2', 'woff'];

$slots = [
    'font_body'      => ['label' => 'Body text',  'selector' => 'body'],
    'font_titles'    => ['label' => 'Titles',      'selector' => 'h1, h2, h3, h4, h5, h6, .section-title span'],
    'font_nav'       => ['label' => 'Navigation',  'selector' => '.site-header, .altered-navbar'],
    'font_user_menu' => ['label' => 'User menu',   'selector' => '.navbar-right .dropdown-menu'],
    'font_footer'    => ['label' => 'Footer',      'selector' => '.site-footer'],
];

$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        $errors[] = 'Invalid form token.';
    } else {
        foreach (array_keys($slots) as $key) {
            $val = $_POST[$key] ?? '';
            if ($val === '') {
                saveSetting($key, null);
            } else {
                $base = basename($val);
                $ext  = strtolower(pathinfo($base, PATHINFO_EXTENSION));
                if (in_array($ext, $fontExts, true) && file_exists($fontDir . $base)) {
                    saveSetting($key, $base);
                }
            }
        }
        flash('Fonts saved.');
        redirect(BASE_URL . '/admin/font');
    }
}

// Available fonts
$fontFiles = [];
if (is_dir($fontDir)) {
    foreach (scandir($fontDir) as $f) {
        if ($f === '.' || $f === '..') continue;
        $ext = strtolower(pathinfo($f, PATHINFO_EXTENSION));
        if (in_array($ext, $fontExts, true)) {
            $fontFiles[] = $f;
        }
    }
    sort($fontFiles);
}

// Current values per slot
$current = [];
foreach (array_keys($slots) as $key) {
    $current[$key] = getSetting($key);
}
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-font me-2"></i>Fonts</h1>
</div>

<?php if ($errors): ?>
    <div class="alert alert-danger">
        <ul class="mb-0"><?php foreach ($errors as $e): ?><li><?= h($e) ?></li><?php endforeach; ?></ul>
    </div>
<?php endif; ?>

<?php if (empty($fontFiles)): ?>
    <div class="alert alert-warning">No font files found in <code>assets/font/</code>. Add <code>.woff2</code> files via FTP to get started.</div>
<?php endif; ?>

<!-- Preload @font-face for all available fonts (used in previews) -->
<?php if (!empty($fontFiles)): ?>
<style>
<?php foreach ($fontFiles as $f):
    $fam = 'Prev_' . preg_replace('/[^a-zA-Z0-9]/', '_', $f); ?>
    @font-face { font-family: '<?= $fam ?>'; src: url('<?= h(BASE_URL . '/assets/font/' . $f) ?>') format('<?= fontCssFormat($f) ?>'); }
<?php endforeach; ?>
</style>
<?php endif; ?>

<form method="post">
    <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">

    <div class="d-flex flex-column gap-3 mb-4">
        <?php foreach ($slots as $key => $slot):
            $label    = $slot['label'];
            $selector = $slot['selector'];
            $selected = $current[$key];
            $previewFam = $selected ? ('Prev_' . preg_replace('/[^a-zA-Z0-9]/', '_', $selected)) : '';
        ?>
        <div class="card-altered p-3">
            <div class="row align-items-center g-3">
                <div class="col-md-3">
                    <div class="fw-bold" style="color:var(--neutral-800)"><?= h($label) ?></div>
                    <div class="text-muted small mt-1"><code><?= h($selector) ?></code></div>
                </div>
                <div class="col-md-4">
                    <select name="<?= h($key) ?>" class="form-select font-select"
                            data-preview="preview-<?= h($key) ?>">
                        <option value="">— Default —</option>
                        <?php foreach ($fontFiles as $f):
                            $fam = 'Prev_' . preg_replace('/[^a-zA-Z0-9]/', '_', $f);
                        ?>
                            <option value="<?= h($f) ?>"
                                    data-family="<?= h($fam) ?>"
                                    <?= $selected === $f ? 'selected' : '' ?>>
                                <?= h(pathinfo($f, PATHINFO_FILENAME)) ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="col-md-5">
                    <div id="preview-<?= h($key) ?>"
                         style="font-family:<?= $previewFam ? "'{$previewFam}',sans-serif" : 'inherit' ?>;font-size:1.15rem;color:var(--neutral-700);padding:.4rem 0">
                        The quick brown fox — 0123456789
                    </div>
                </div>
            </div>
        </div>
        <?php endforeach; ?>
    </div>

    <button type="submit" class="btn btn-sm btn-primary-altered">
        <i class="fa-solid fa-floppy-disk me-1"></i> Save fonts
    </button>
</form>

<script>
document.querySelectorAll('.font-select').forEach(function(sel) {
    sel.addEventListener('change', function() {
        var preview = document.getElementById(this.dataset.preview);
        var opt     = this.options[this.selectedIndex];
        var family  = opt.dataset.family || '';
        preview.style.fontFamily = family ? "'" + family + "',sans-serif" : 'inherit';
    });
});
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
