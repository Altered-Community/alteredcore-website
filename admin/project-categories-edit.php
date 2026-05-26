<?php
$adminPageTitle = 'Edit Project Category';
$adminSection   = 'projects';
require_once __DIR__ . '/includes/header.php';

$db  = getDB();
$id  = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$cat = ['id'=>0,'name_en'=>'','name_fr'=>'','slug'=>'','is_hidden'=>0];

if ($id) {
    $stmt = $db->prepare(q("SELECT * FROM {project_categories} WHERE id = :id"));
    $stmt->execute([':id' => $id]);
    $row  = $stmt->fetch();
    if ($row) {
        $cat = $row;
        $adminPageTitle = 'Edit: ' . h($cat['name_en']);
    } else {
        flash('Category not found.', 'error');
        redirect(BASE_URL . '/admin/project-categories');
    }
}

function makeProjectCatSlug(string $str): string {
    $str = strtolower(trim($str));
    $str = preg_replace('/[^a-z0-9]+/', '-', $str);
    return trim($str, '-');
}

$errors = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        $errors[] = 'Invalid form token.';
    } else {
        $nameEn   = trim($_POST['name_en'] ?? '');
        $nameFr   = trim($_POST['name_fr'] ?? '');
        $slug     = trim($_POST['slug']    ?? '');
        $isHidden = isset($_POST['is_hidden']) ? 1 : 0;

        if ($nameEn === '') $errors[] = 'English name is required.';
        if ($nameFr === '') $errors[] = 'French name is required.';

        if (empty($slug) && $nameEn) {
            $slug = makeProjectCatSlug($nameEn);
        } else {
            $slug = makeProjectCatSlug($slug);
        }

        if ($slug === '') $errors[] = 'Slug is required.';

        if (empty($errors)) {
            $stmt = $db->prepare(q("SELECT id FROM {project_categories} WHERE slug = :slug AND id != :id"));
            $stmt->execute([':slug' => $slug, ':id' => $id]);
            if ($stmt->fetch()) $errors[] = 'This slug is already in use.';
        }

        if (empty($errors)) {
            if ($id) {
                $db->prepare(q("UPDATE {project_categories} SET name_en=:en, name_fr=:fr, slug=:slug, is_hidden=:h WHERE id=:id"))
                   ->execute([':en'=>$nameEn,':fr'=>$nameFr,':slug'=>$slug,':h'=>$isHidden,':id'=>$id]);
                flash('Category updated.');
            } else {
                $db->prepare(q("INSERT INTO {project_categories} (name_en, name_fr, slug, is_hidden) VALUES (:en,:fr,:slug,:h)"))
                   ->execute([':en'=>$nameEn,':fr'=>$nameFr,':slug'=>$slug,':h'=>$isHidden]);
                flash('Category created.');
            }
            redirect(BASE_URL . '/admin/project-categories');
        }

        $cat = ['id'=>$id,'name_en'=>$nameEn,'name_fr'=>$nameFr,'slug'=>$slug,'is_hidden'=>$isHidden];
    }
}
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-tag me-2"></i><?= $id ? 'Edit project category' : 'Add project category' ?></h1>
    <a href="<?= BASE_URL ?>/admin/project-categories" class="btn btn-outline-secondary btn-sm">← Back</a>
</div>

<?php if ($errors): ?>
    <div class="alert alert-danger">
        <ul class="mb-0">
            <?php foreach ($errors as $e): ?><li><?= h($e) ?></li><?php endforeach; ?>
        </ul>
    </div>
<?php endif; ?>

<div class="card-altered p-4" style="max-width:560px">
    <form method="post" novalidate>
        <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">

        <div class="mb-3">
            <label class="form-label">Name (EN) <span class="text-danger">*</span></label>
            <input type="text" name="name_en" class="form-control" value="<?= h($cat['name_en']) ?>"
                   id="nameEn" required>
        </div>
        <div class="mb-3">
            <label class="form-label">Name (FR) <span class="text-danger">*</span></label>
            <input type="text" name="name_fr" class="form-control" value="<?= h($cat['name_fr']) ?>" required>
        </div>
        <div class="mb-4">
            <label class="form-label">Slug <small class="text-muted">(auto-generated if empty)</small></label>
            <input type="text" name="slug" class="form-control font-monospace" id="slugField"
                   value="<?= h($cat['slug']) ?>" placeholder="e.g. tools">
        </div>

        <div class="mb-4">
            <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" name="is_hidden" id="isHidden"
                       value="1" <?= $cat['is_hidden'] ? 'checked' : '' ?>>
                <label class="form-check-label" for="isHidden">
                    Hide this category <span class="text-muted small">(hidden from the public filter bar)</span>
                </label>
            </div>
        </div>

        <div class="d-flex gap-2">
            <button type="submit" class="btn btn-sm btn-primary-altered">
                <i class="fa-solid fa-floppy-disk me-1"></i> Save
            </button>
            <a href="<?= BASE_URL ?>/admin/project-categories" class="btn btn-sm btn-outline-secondary">Cancel</a>
        </div>
    </form>
</div>

<script>
document.getElementById('nameEn').addEventListener('input', function () {
    const slug = document.getElementById('slugField');
    if (slug.value === '' || slug.dataset.auto === '1') {
        slug.value = this.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        slug.dataset.auto = '1';
    }
});
document.getElementById('slugField').addEventListener('input', function () {
    this.dataset.auto = '';
});
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
