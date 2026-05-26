<?php
$adminPageTitle = 'New Page';
$adminSection   = 'pages';
require_once __DIR__ . '/includes/header.php';
require_once dirname(__DIR__) . '/includes/core-pages.php';

$db       = getDB();
$id       = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($id === 0 && !adminCanCreate()) {
    flash('You do not have permission to create content.', 'error');
    redirect(BASE_URL . '/admin/pages');
}
if ($id > 0 && !adminCanEdit()) {
    flash('You do not have permission to edit content.', 'error');
    redirect(BASE_URL . '/admin/pages');
}

$pagesDir = dirname(__DIR__) . '/pages/';
$realDir  = realpath($pagesDir);

$page = [
    'id'         => 0,
    'type'       => in_array($_GET['type'] ?? '', ['code', 'content']) ? $_GET['type'] : 'code',
    'slug'       => '',
    'title_en'   => '',
    'title_fr'   => '',
    'file_path'  => '',
    'content_en' => '',
    'content_fr' => '',
    'is_visible' => 1,
    'sort_order' => 0,
];
if (!$id) {
    $page['sort_order'] = (int)$db->query(q("SELECT COALESCE(MAX(sort_order), 0) + 1 FROM {pages}"))->fetchColumn();
}
$fileContent = file_get_contents(dirname(__DIR__) . '/pages/template_code.php');
$fileExists  = false;
$errors      = [];

if ($id) {
    $stmt = $db->prepare(q("SELECT * FROM {pages} WHERE id = :id"));
    $stmt->execute([':id' => $id]);
    $row = $stmt->fetch();
    if ($row) {
        $page           = $row;
        $adminPageTitle = 'Edit: ' . $page['slug'];
        $absPath        = $realDir ? realpath($pagesDir . $page['slug'] . '.php') : false;
        $fileExists     = $absPath && strpos($absPath, $realDir) === 0 && file_exists($absPath);
        if ($fileExists && $page['type'] === 'code') {
            $fileContent = file_get_contents($absPath);
        }
        if ((empty($_SESSION['admin_logged_in']) || saIsPreviewingGroup()) && isset($__corePages[$page['slug']])) {
            flash('This page is protected and cannot be edited.', 'error');
            redirect(BASE_URL . '/admin/pages');
        }
    } else {
        flash('Page not found.', 'error');
        redirect(BASE_URL . '/admin/pages');
    }
}

$type     = $page['type'];
$origSlug = $page['slug'];

// save
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        $errors[] = 'Invalid form token. Please try again.';
    } else {
        $type      = in_array($_POST['type'] ?? '', ['code', 'content']) ? $_POST['type'] : 'code';
        $slug      = strtolower(trim($_POST['slug'] ?? ''));
        $titleEn   = trim($_POST['title_en'] ?? '');
        $titleFr   = trim($_POST['title_fr'] ?? '');
        $isVisible = adminCanPublish() ? (isset($_POST['is_visible']) ? 1 : 0) : 0;
        $sortOrder = (int)($_POST['sort_order'] ?? 0);
        $code      = $_POST['code'] ?? '';
        $contentEn = $_POST['content_en'] ?? '';
        $contentFr = $_POST['content_fr'] ?? '';

        if (!preg_match('/^[a-z0-9][a-z0-9\-]*$/', $slug)) {
            $errors[] = 'Slug must start with a letter or digit and contain only lowercase letters, numbers, and hyphens.';
        }
        if ($titleEn === '') {
            $errors[] = 'English title is required.';
        }

        if (!$errors) {
            $check = $db->prepare(q("SELECT id FROM {pages} WHERE slug = :slug AND id != :id"));
            $check->execute([':slug' => $slug, ':id' => $page['id']]);
            if ($check->fetch()) {
                $errors[] = 'A page with this slug already exists.';
            }
        }

        if (!$errors) {
            // Security: derive file path from slug only, validate it stays within pages/
            $absTarget = $realDir . DIRECTORY_SEPARATOR . $slug . '.php';
            if (!$realDir || strpos($absTarget, $realDir . DIRECTORY_SEPARATOR) !== 0) {
                $errors[] = 'Invalid slug — path traversal detected.';
            } elseif (file_exists($absTarget) && !($page['id'] > 0 && $slug === $origSlug)) {
                $errors[] = 'File pages/' . $slug . '.php already exists on disk. Choose a different slug.';
            }
        }

        if (!$errors) {
            $fileBody = ($type === 'content')
                ? "<?php require_once dirname(__DIR__) . '/includes/content-page.php';\n"
                : $code;
            if (file_put_contents($absTarget, $fileBody) === false) {
                $errors[] = 'Could not write to pages/' . $slug . '.php — check server write permissions.';
            }
        }

        if (!$errors) {
            $newFilePath = 'pages/' . $slug . '.php';

            if ($page['id']) {
                $db->prepare(q(
                    "UPDATE {pages} SET slug = :slug, type = :type, title_en = :ten, title_fr = :tfr,
                     file_path = :fp, content_en = :cen, content_fr = :cfr,
                     is_visible = :vis, sort_order = :so, updated_at = NOW()
                     WHERE id = :id"
                ))->execute([
                    ':slug' => $slug, ':type' => $type, ':ten' => $titleEn, ':tfr' => $titleFr,
                    ':fp'   => $newFilePath, ':cen' => $contentEn, ':cfr' => $contentFr,
                    ':vis'  => $isVisible, ':so'  => $sortOrder, ':id'  => $page['id'],
                ]);
            } else {
                $db->prepare(q(
                    "INSERT INTO {pages} (slug, type, title_en, title_fr, file_path, content_en, content_fr, is_visible, sort_order)
                     VALUES (:slug, :type, :ten, :tfr, :fp, :cen, :cfr, :vis, :so)"
                ))->execute([
                    ':slug' => $slug, ':type' => $type, ':ten' => $titleEn, ':tfr' => $titleFr,
                    ':fp'   => $newFilePath, ':cen' => $contentEn, ':cfr' => $contentFr,
                    ':vis'  => $isVisible, ':so'  => $sortOrder,
                ]);
                $page['id'] = (int)$db->lastInsertId();
            }
            flash('Page saved.');
            redirect(BASE_URL . '/admin/page-edit?id=' . $page['id']);
        }

        // Re-populate on error
        $page['slug']       = $slug;
        $page['type']       = $type;
        $page['title_en']   = $titleEn;
        $page['title_fr']   = $titleFr;
        $page['is_visible'] = $isVisible;
        $page['sort_order'] = $sortOrder;
        $page['content_en'] = $contentEn;
        $page['content_fr'] = $contentFr;
        $fileContent        = $code;
    }
}
?>

<div class="admin-header-bar">
    <h1>
        <i class="fa-solid <?= $type === 'content' ? 'fa-file-lines' : 'fa-file-code' ?> me-2"></i>
        <?php if ($page['id']): ?>
            Edit: <code><?= h($page['slug']) ?></code>
            <span class="badge ms-2" style="font-size:.65rem;background:<?= $type === 'content' ? '#0891b2' : '#6366f1' ?>;color:#fff;border-radius:20px;padding:2px 8px">
                <?= $type === 'content' ? 'Content' : 'Code' ?>
            </span>
        <?php else: ?>
            New <?= $type === 'content' ? 'content' : 'code' ?> page
        <?php endif; ?>
    </h1>
    <div class="d-flex gap-2">
        <?php if ($page['id'] && $fileExists): ?>
        <a href="<?= BASE_URL ?>/pages/<?= h($page['slug']) ?>" target="_blank"
           class="btn btn-sm btn-outline-secondary">
            <i class="fa-solid fa-arrow-up-right-from-square me-1"></i> View
        </a>
        <?php endif; ?>
        <a href="<?= BASE_URL ?>/admin/pages" class="btn btn-sm btn-outline-secondary">
            <i class="fa-solid fa-arrow-left me-1"></i> Back
        </a>
    </div>
</div>

<?php if ($errors): ?>
<div class="alert alert-danger">
    <ul class="mb-0"><?php foreach ($errors as $e): ?><li><?= h($e) ?></li><?php endforeach; ?></ul>
</div>
<?php endif; ?>

<?php if ($page['id'] && !$fileExists): ?>
<div class="alert alert-warning">
    <i class="fa-solid fa-triangle-exclamation me-1"></i>
    File <code>pages/<?= h($page['slug']) ?>.php</code> does not exist on disk yet.
    Saving will create it.
</div>
<?php endif; ?>

<form method="post" novalidate>
    <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
    <input type="hidden" name="type" value="<?= h($type) ?>">

    <!-- Metadata row -->
    <div class="row g-3 mb-3">
        <div class="col-md-3">
            <label class="form-label fw-semibold">Slug <span class="text-danger">*</span></label>
            <div class="input-group">
                <span class="input-group-text text-muted" style="font-size:.85rem">pages/</span>
                <input type="text" name="slug" class="form-control font-monospace"
                       value="<?= h($page['slug']) ?>" placeholder="my-page" required
                       pattern="[a-z0-9][a-z0-9\-]*">
                <span class="input-group-text text-muted" style="font-size:.85rem">.php</span>
            </div>
            <div class="form-text">Lowercase letters, digits, hyphens.</div>
        </div>
        <div class="col-md-3">
            <label class="form-label fw-semibold">Title EN <span class="text-danger">*</span></label>
            <input type="text" name="title_en" class="form-control"
                   value="<?= h($page['title_en']) ?>" required>
        </div>
        <div class="col-md-3">
            <label class="form-label fw-semibold">Title FR</label>
            <input type="text" name="title_fr" class="form-control"
                   value="<?= h($page['title_fr']) ?>">
        </div>
        <div class="col-md-1">
            <label class="form-label fw-semibold">Order</label>
            <input type="number" name="sort_order" class="form-control"
                   value="<?= (int)$page['sort_order'] ?>" min="0" step="10">
        </div>
        <div class="col-md-2 d-flex align-items-end pb-1">
            <?php $canPub = adminCanPublish(); ?>
            <div class="form-check form-switch ms-2">
                <input class="form-check-input" type="checkbox" name="is_visible" id="isVisible"
                       <?= ($canPub && $page['is_visible']) ? 'checked' : '' ?> <?= $canPub ? '' : 'disabled' ?>>
                <label class="form-check-label" for="isVisible">Visible</label>
                <?php if (!$canPub): ?>
                <?php if ($id > 0 && $page['is_visible']): ?>
                <div class="form-text text-warning" style="font-size:.75rem"><i class="fa-solid fa-triangle-exclamation me-1"></i>Currently visible — saving will send for review.</div>
                <?php else: ?>
                <div class="form-text text-warning" style="font-size:.75rem">Requires <em>Can publish</em></div>
                <?php endif; ?>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <?php if ($type === 'content'): ?>

    <!-- Content editors (EN + FR) -->
    <div class="mb-2 d-flex align-items-center gap-2">
        <span class="fw-semibold" style="font-size:.9rem"><i class="fa-solid fa-globe me-1"></i>Content</span>
        <span class="text-muted small">— both languages are optional, the English version is used as fallback</span>
    </div>

    <div class="card-altered p-3 mb-3">
        <label class="form-label fw-semibold mb-1">
            <span class="badge bg-primary me-1" style="font-size:.7rem">EN</span> English content
        </label>
        <textarea name="content_en" class="tinymce-editor"><?= h($page['content_en'] ?? '') ?></textarea>
    </div>

    <div class="card-altered p-3 mb-3">
        <label class="form-label fw-semibold mb-1">
            <span class="badge me-1" style="font-size:.7rem;background:#1d4ed8">FR</span> French content
        </label>
        <textarea name="content_fr" class="tinymce-editor"><?= h($page['content_fr'] ?? '') ?></textarea>
    </div>

    <?php else: ?>

    <!-- Code editor -->
    <div class="card-altered p-0 mb-3" style="border-radius:8px;overflow:hidden">
        <div class="d-flex align-items-center justify-content-between px-3 py-2"
             style="background:var(--neutral-800,#1e1e2e);border-bottom:1px solid var(--neutral-700,#313244)">
            <span style="font-size:.8rem;color:var(--neutral-400,#a6adc8)">
                <i class="fa-solid fa-code me-1"></i>
                pages/<?= h($page['slug'] ?: '…') ?>.php
            </span>
            <span style="font-size:.75rem;color:var(--neutral-500,#6c7086)">PHP · CodeMirror · Ctrl+/ to toggle comment</span>
        </div>
        <textarea id="page-code-editor" name="code"><?= h($fileContent) ?></textarea>
    </div>

    <?php endif; ?>

    <div class="d-flex gap-2">
        <button type="submit" class="btn btn-sm btn-primary-altered px-4">
            <i class="fa-solid fa-floppy-disk me-1"></i> Save
        </button>
        <a href="<?= BASE_URL ?>/admin/pages" class="btn btn-sm btn-outline-secondary">Cancel</a>
    </div>
</form>

<?php
if ($type === 'content') {
    $__tinymce_editor = true;
} else {
    $__codemirror_editor = true;
}
require_once __DIR__ . '/includes/footer.php';
?>
