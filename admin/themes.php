<?php
$adminPageTitle = 'Themes';
$adminSection   = 'themes';
require_once __DIR__ . '/includes/header.php';

$PROTECTED_THEMES = ['default', 'azure'];
$themesDir        = dirname(__DIR__) . '/themes/';

// zIP helpers

function themeReadConfigFromZip(ZipArchive $zip): ?array {
    $prefix  = '';
    $cfgIdx  = -1;
    for ($i = 0; $i < $zip->numFiles; $i++) {
        $name = str_replace('\\', '/', $zip->getNameIndex($i));
        if ($name === 'config.json') {
            $cfgIdx = $i;
            $prefix = '';
            break;
        }
        if (preg_match('/^([a-zA-Z0-9_-]+)\/config\.json$/', $name, $mt)) {
            $cfgIdx = $i;
            $prefix = $mt[1] . '/';
            break;
        }
    }
    if ($cfgIdx === -1) return null;
    $content = $zip->getFromIndex($cfgIdx);
    if ($content === false) return null;
    $cfg = json_decode($content, true);
    if (!is_array($cfg)) return null;
    $slug = preg_replace('/[^a-zA-Z0-9_-]/', '', $cfg['id'] ?? ($prefix !== '' ? rtrim($prefix, '/') : ''));
    if ($slug === '') return null;
    $cfg['_slug']       = $slug;
    $cfg['_zip_prefix'] = $prefix;
    return $cfg;
}

function themeValidateZip(ZipArchive $zip, string $prefix): array {
    $errors = [];
    foreach (['config.json'] as $file) {
        if ($zip->locateName($prefix . $file) === false) {
            $errors[] = 'Missing required file: ' . $file;
        }
    }
    return $errors;
}

function themeExtractZip(ZipArchive $zip, string $prefix, string $destDir): bool {
    for ($i = 0; $i < $zip->numFiles; $i++) {
        $name = str_replace('\\', '/', $zip->getNameIndex($i));
        if ($prefix !== '') {
            if (strpos($name, $prefix) !== 0) continue;
            $rel = substr($name, strlen($prefix));
        } else {
            $rel = $name;
        }
        if ($rel === '' || substr($rel, -1) === '/') continue;
        if (strpos($rel, '..') !== false || $rel[0] === '/' || $rel[0] === '\\') return false;
        $dest     = $destDir . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $rel);
        $destDir2 = dirname($dest);
        if (!is_dir($destDir2) && !mkdir($destDir2, 0755, true)) return false;
        $content = $zip->getFromIndex($i);
        if ($content === false) return false;
        file_put_contents($dest, $content);
    }
    return true;
}

function themeDeleteDir(string $dir): bool {
    if (!is_dir($dir)) return true;
    $items = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST
    );
    foreach ($items as $item) {
        $item->isDir() ? rmdir($item->getPathname()) : unlink($item->getPathname());
    }
    return rmdir($dir);
}

// pOST handlers

$errors = [];
$active = getActiveTheme();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        $errors[] = 'Invalid form token.';
    } else {
        $action = $_POST['action'] ?? '';

        // activate
        if ($action === 'activate') {
            $slug = preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST['slug'] ?? '');
            if ($slug === '') {
                $errors[] = 'Invalid theme slug.';
            } elseif (!file_exists($themesDir . $slug . '/config.json')) {
                $errors[] = 'Theme not found: ' . h($slug);
            } else {
                saveSetting('active_theme', $slug);
                $active = $slug;
                flash('Theme "' . $slug . '" activated.');
                redirect(BASE_URL . '/admin/themes');
            }

        // upload (install / update)
        } elseif ($action === 'upload') {
            if (!class_exists('ZipArchive')) {
                $errors[] = 'ZipArchive PHP extension is not available on this server.';
            } elseif (empty($_FILES['theme_zip']) || $_FILES['theme_zip']['error'] !== UPLOAD_ERR_OK) {
                $errors[] = 'No file uploaded or upload error.';
            } else {
                $tmp = $_FILES['theme_zip']['tmp_name'];
                $fh  = fopen($tmp, 'rb');
                $magic = fread($fh, 4);
                fclose($fh);
                if ($magic !== "PK\x03\x04") {
                    $errors[] = 'The uploaded file is not a valid ZIP archive.';
                } else {
                    $zip = new ZipArchive();
                    if ($zip->open($tmp) !== true) {
                        $errors[] = 'Could not open ZIP archive.';
                    } else {
                        $cfg = themeReadConfigFromZip($zip);
                        if ($cfg === null) {
                            $errors[] = 'No valid config.json found in the ZIP. It must be at the archive root or inside a single top-level folder.';
                        } else {
                            $slug      = $cfg['_slug'];
                            $prefix    = $cfg['_zip_prefix'];
                            if (in_array($slug, $PROTECTED_THEMES, true)) {
                                $errors[] = 'The "' . h($slug) . '" theme is built-in and cannot be updated.';
                            } else {
                                $valErrors = themeValidateZip($zip, $prefix);
                                if ($valErrors) {
                                    $errors = array_merge($errors, $valErrors);
                                } else {
                                    $isUpdate = is_dir($themesDir . $slug);
                                    $destDir  = $themesDir . $slug;
                                    if ($isUpdate) {
                                        $wipe = new RecursiveIteratorIterator(
                                            new RecursiveDirectoryIterator($destDir, RecursiveDirectoryIterator::SKIP_DOTS),
                                            RecursiveIteratorIterator::CHILD_FIRST
                                        );
                                        foreach ($wipe as $item) {
                                            $item->isDir() ? rmdir($item->getPathname()) : unlink($item->getPathname());
                                        }
                                    }
                                    if (!themeExtractZip($zip, $prefix, $destDir)) {
                                        $errors[] = 'Failed to extract theme files. Check server write permissions on themes/.';
                                    } else {
                                        $verb = $isUpdate ? 'updated' : 'installed';
                                        flash('Theme "' . ($cfg['name'] ?? $slug) . '" ' . $verb . ' successfully.');
                                        $zip->close();
                                        redirect(BASE_URL . '/admin/themes');
                                    }
                                }
                            }
                        }
                        $zip->close();
                    }
                }
            }

        // delete
        } elseif ($action === 'delete') {
            $slug = preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST['slug'] ?? '');
            if ($slug === '') {
                $errors[] = 'Invalid theme slug.';
            } elseif (in_array($slug, $PROTECTED_THEMES, true)) {
                $errors[] = 'The "' . h($slug) . '" theme is built-in and cannot be deleted.';
            } elseif ($slug === $active) {
                $errors[] = 'Cannot delete the active theme. Activate another theme first.';
            } elseif (!is_dir($themesDir . $slug)) {
                $errors[] = 'Theme not found.';
            } else {
                if (themeDeleteDir($themesDir . $slug)) {
                    flash('Theme "' . $slug . '" deleted.');
                    redirect(BASE_URL . '/admin/themes');
                } else {
                    $errors[] = 'Could not delete theme directory. Check server permissions.';
                }
            }
        }
    }
}

$themes = getAvailableThemes();
foreach ($themes as &$_t) {
    $_t['is_active']    = $_t['slug'] === $active;
    $_t['is_protected'] = in_array($_t['slug'], $PROTECTED_THEMES, true);
}
unset($_t);

$flash = getFlash();
?>

<div class="admin-main">
<div class="admin-header-bar">
    <h1><i class="fa-solid fa-palette me-2"></i>Themes</h1>
    <button class="btn btn-sm btn-primary-altered" data-bs-toggle="modal" data-bs-target="#uploadModal">
        <i class="fa-solid fa-upload me-1"></i> Install theme
    </button>
</div>

<?php if ($errors): ?>
<div class="alert alert-danger"><?= implode('<br>', array_map('h', $errors)) ?></div>
<?php endif; ?>
<?php if ($flash): ?>
<div class="alert alert-<?= h($flash['type']) ?>"><?= h($flash['msg']) ?></div>
<?php endif; ?>

<div class="row g-4">
<?php foreach ($themes as $theme): ?>
    <?php
    $previewUrl  = '';
    $previewFile = $themesDir . $theme['slug'] . '/' . $theme['preview'];
    if ($theme['preview'] !== '' && file_exists($previewFile)) {
        $previewUrl = BASE_URL . '/themes/' . $theme['slug'] . '/' . $theme['preview'];
    }
    ?>
    <div class="col-12 col-md-6 col-xl-4">
        <div class="card h-100 <?= $theme['is_active'] ? 'border-success' : '' ?>"
             style="border-width:<?= $theme['is_active'] ? '2px' : '1px' ?>">
            <?php if ($previewUrl !== ''): ?>
            <img src="<?= h($previewUrl) ?>" class="card-img-top" alt="<?= h($theme['name']) ?> preview"
                 style="height:180px;object-fit:cover">
            <?php else: ?>
            <div class="card-img-top d-flex align-items-center justify-content-center"
                 style="height:180px;background:var(--sand-100,#FAF5E8);color:var(--neutral-400,#8A7D6A)">
                <i class="fa-solid fa-palette" style="font-size:3rem;opacity:.3"></i>
            </div>
            <?php endif; ?>
            <div class="card-body d-flex flex-column">
                <div class="d-flex align-items-start justify-content-between gap-2 mb-1">
                    <h5 class="card-title mb-0"><?= h($theme['name']) ?></h5>
                    <div class="d-flex gap-1 flex-shrink-0">
                        <?php if ($theme['is_active']): ?>
                        <span class="badge bg-success">Active</span>
                        <?php endif; ?>
                        <?php if ($theme['is_protected']): ?>
                        <span class="badge bg-secondary" title="Built-in theme">Built-in</span>
                        <?php endif; ?>
                    </div>
                </div>
                <?php if ($theme['description'] !== ''): ?>
                <p class="card-text text-muted small mb-2"><?= h($theme['description']) ?></p>
                <?php endif; ?>
                <?php if ($theme['version'] !== '' || $theme['author'] !== ''): ?>
                <p class="card-text mb-3" style="font-size:.78rem;color:var(--neutral-400,#8A7D6A)">
                    <?php if ($theme['version'] !== ''): ?>v<?= h($theme['version']) ?><?php endif; ?>
                    <?php if ($theme['version'] !== '' && $theme['author'] !== ''): ?> &mdash; <?php endif; ?>
                    <?php if ($theme['author'] !== ''): ?><?= h($theme['author']) ?><?php endif; ?>
                </p>
                <?php endif; ?>
                <div class="mt-auto d-flex flex-column gap-2">
                    <!-- Activate -->
                    <?php if (!$theme['is_active']): ?>
                    <form method="post">
                        <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                        <input type="hidden" name="action"     value="activate">
                        <input type="hidden" name="slug"       value="<?= h($theme['slug']) ?>">
                        <button type="submit" class="btn btn-primary-altered btn-sm w-100">
                            <i class="fa-solid fa-check me-1"></i> Activate
                        </button>
                    </form>
                    <?php else: ?>
                    <button class="btn btn-outline-secondary btn-sm w-100" disabled>
                        <i class="fa-solid fa-circle-check me-1"></i> Currently active
                    </button>
                    <?php endif; ?>
                    <!-- Update + Delete row (not shown for built-in themes) -->
                    <?php if (!$theme['is_protected']): ?>
                    <div class="d-flex gap-2">
                        <button class="btn btn-outline-secondary btn-sm flex-fill"
                                data-bs-toggle="modal" data-bs-target="#uploadModal"
                                data-theme-name="<?= h($theme['name']) ?>"
                                title="Update this theme by uploading a new ZIP">
                            <i class="fa-solid fa-arrow-up-from-bracket me-1"></i> Update
                        </button>
                        <?php if (!$theme['is_active']): ?>
                        <form method="post" class="flex-fill">
                            <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                            <input type="hidden" name="action"     value="delete">
                            <input type="hidden" name="slug"       value="<?= h($theme['slug']) ?>">
                            <button type="submit" class="btn btn-outline-danger btn-sm w-100"
                                    onclick="return confirm('Delete theme &quot;<?= h(addslashes($theme['name'])) ?>&quot;?\nThis will permanently remove the theme files and its settings. This cannot be undone.')">
                                <i class="fa-solid fa-trash me-1"></i> Delete
                            </button>
                        </form>
                        <?php else: ?>
                        <button class="btn btn-outline-danger btn-sm flex-fill" disabled
                                title="Activate another theme before deleting this one">
                            <i class="fa-solid fa-trash me-1"></i> Delete
                        </button>
                        <?php endif; ?>
                    </div>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>
<?php endforeach; ?>
<?php if (empty($themes)): ?>
<div class="col-12">
    <div class="alert alert-warning">No themes found in the <code>themes/</code> directory.</div>
</div>
<?php endif; ?>
</div>


</div>

<!-- Upload modal ──────────────────────────────────────────────────────────────-->
<div class="modal fade" id="uploadModal" tabindex="-1" aria-labelledby="uploadModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <form method="post" enctype="multipart/form-data">
                <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                <input type="hidden" name="action"     value="upload">
                <div class="modal-header">
                    <h5 class="modal-title" id="uploadModalLabel">
                        <i class="fa-solid fa-upload me-2"></i>Install / Update theme
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p class="text-muted small mb-3">
                        Upload a ZIP file containing a valid theme. The archive must include a
                        <code>config.json</code> (with an <code>id</code> field) and a <code>header.php</code>
                        at its root or inside a single top-level folder.<br>
                        If a theme with the same ID already exists, it will be <strong>updated</strong>
                        (its visual settings are preserved).
                    </p>
                    <div class="mb-3">
                        <label class="form-label fw-semibold" for="themeZipInput">Theme ZIP file</label>
                        <input type="file" name="theme_zip" id="themeZipInput"
                               class="form-control" accept=".zip" required>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="submit" class="btn btn-primary-altered">
                        <i class="fa-solid fa-upload me-1"></i> Upload &amp; install
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>

<script>
// When clicking an "Update" button on a specific theme card, adjust the modal title.
document.addEventListener('DOMContentLoaded', function () {
    var modal = document.getElementById('uploadModal');
    if (!modal) return;
    modal.addEventListener('show.bs.modal', function (e) {
        var btn       = e.relatedTarget;
        var themeName = btn && btn.getAttribute('data-theme-name');
        var title     = modal.querySelector('#uploadModalLabel');
        if (themeName) {
            title.innerHTML = '<i class="fa-solid fa-arrow-up-from-bracket me-2"></i>Update theme: ' +
                              themeName.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        } else {
            title.innerHTML = '<i class="fa-solid fa-upload me-2"></i>Install / Update theme';
        }
        // Reset file input
        var input = modal.querySelector('input[type="file"]');
        if (input) input.value = '';
    });
});
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
