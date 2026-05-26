<?php
$adminPageTitle = 'Edit Project';
$adminSection   = 'projects';
require_once __DIR__ . '/includes/header.php';

$db = getDB();
$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($id === 0 && !adminCanCreate()) {
    flash('You do not have permission to create content.', 'error');
    redirect(BASE_URL . '/admin/projects');
}
if ($id > 0 && !adminCanEdit()) {
    flash('You do not have permission to edit content.', 'error');
    redirect(BASE_URL . '/admin/projects');
}

$project = [
    'id'           => 0,
    'category_id'  => null,
    'title'        => '',
    'description'  => '',
    'url'          => '',
    'image'        => '',
    'submitted_by' => '',
    'source'       => 'admin',
    'is_approved'  => 1,
    'is_visible'   => 1,
    'sort_order'   => 0,
];

$allProjectCats = $db->query(q("SELECT id, name_en FROM {project_categories} ORDER BY sort_order, name_en"))->fetchAll();
if (!$id) {
    $project['sort_order'] = (int)$db->query(q("SELECT COALESCE(MAX(sort_order), 0) + 1 FROM {projects}"))->fetchColumn();
}
if ($id) {
    $stmt = $db->prepare(q("SELECT * FROM {projects} WHERE id = :id"));
    $stmt->execute([':id' => $id]);
    $row  = $stmt->fetch();
    if ($row) {
        $project        = $row;
        $adminPageTitle = 'Edit: ' . h($project['title']);
    } else {
        flash('Project not found.', 'error');
        redirect(BASE_URL . '/admin/projects');
    }
}

$errors = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        $errors[] = 'Invalid form token. Please try again.';
    } else {
        // Image via picker
        $oldImage = $project['image'] ?? null;
        $pickedImage = trim($_POST['image_picker'] ?? '');
        if ($pickedImage !== '' && !preg_match('#^uploads/[a-zA-Z0-9/_.-]+$#', $pickedImage)) {
            $pickedImage = '';
        }
        $newImage = $pickedImage !== '' ? $pickedImage : null;
        if ($oldImage && $newImage !== $oldImage && strpos($oldImage, 'uploads/') === 0) {
            if ($newImage === null && !adminCanDelete()) {
                $errors[] = 'You do not have permission to delete images.';
            } else {
                $fp = dirname(__DIR__) . '/' . $oldImage;
                if (file_exists($fp)) unlink($fp);
            }
        }

        $catId = isset($_POST['category_id']) && $_POST['category_id'] !== '' ? (int)$_POST['category_id'] : null;
        $data = [
            'category_id'  => $catId,
            'title'        => trim($_POST['title']        ?? ''),
            'description'  => trim($_POST['description']  ?? '') ?: null,
            'url'          => trim($_POST['url']           ?? ''),
            'image'        => $newImage,
            'submitted_by' => trim($_POST['submitted_by'] ?? '') ?: null,
            'source'       => in_array($_POST['source'] ?? '', ['admin','user']) ? $_POST['source'] : 'admin',
            'is_approved'  => adminCanPublish() ? (isset($_POST['is_approved']) ? 1 : 0) : 0,
            'is_visible'   => isset($_POST['is_visible'])  ? 1 : 0,
            'sort_order'   => (int)($_POST['sort_order']  ?? 0),
        ];

        if ($data['title'] === '') $errors[] = 'Title is required.';
        if ($data['url']   === '' || !filter_var($data['url'], FILTER_VALIDATE_URL)) $errors[] = 'A valid URL is required.';

        if (empty($errors)) {
            if ($id) {
                $db->prepare(q(
                    "UPDATE {projects} SET category_id=:category_id, title=:title, description=:description, url=:url, image=:image,
                     submitted_by=:submitted_by, source=:source, is_approved=:is_approved,
                     is_visible=:is_visible, sort_order=:sort_order WHERE id=:id"
                ))->execute(array_merge($data, [':id' => $id]));
                flash('Project updated successfully.');
            } else {
                $db->prepare(q(
                    "INSERT INTO {projects} (category_id, title, description, url, image, submitted_by, source, is_approved, is_visible, sort_order)
                     VALUES (:category_id, :title, :description, :url, :image, :submitted_by, :source, :is_approved, :is_visible, :sort_order)"
                ))->execute($data);
                flash('Project created successfully.');
            }
            redirect(BASE_URL . '/admin/projects');
        }

        // Re-populate on error
        $project = array_merge($project, $data);
    }
}
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-pen me-2"></i><?= $id ? 'Edit project' : 'Add project' ?></h1>
    <a href="<?= BASE_URL ?>/admin/projects" class="btn btn-outline-secondary btn-sm">← Back</a>
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

    <div class="card-altered p-3 mb-4">
        <h6 class="fw-bold mb-3">Project info</h6>
        <div class="row g-3">
            <div class="col-md-8">
                <label class="form-label">Title <span class="text-danger">*</span></label>
                <input type="text" name="title" class="form-control" value="<?= h($project['title']) ?>" maxlength="255" required>
            </div>
            <div class="col-md-4">
                <label class="form-label">Sort order</label>
                <input type="number" name="sort_order" class="form-control" value="<?= (int)$project['sort_order'] ?>">
                <div class="form-text">Lower = displayed first.</div>
            </div>
            <div class="col-12">
                <label class="form-label">URL <span class="text-danger">*</span></label>
                <input type="url" name="url" class="form-control" value="<?= h($project['url']) ?>" maxlength="500" placeholder="https://…" required>
            </div>
            <div class="col-12">
                <label class="form-label">Description</label>
                <textarea name="description" class="form-control" rows="3" maxlength="1000"><?= h($project['description'] ?? '') ?></textarea>
            </div>
        </div>
    </div>

    <div class="card-altered p-3 mb-4">
        <h6 class="fw-bold mb-3">Image</h6>
        <div class="img-picker-widget"
             data-input="proj_img_input"
             data-preview="proj_img_preview"
             data-folder="projects"
             data-base-url="<?= BASE_URL ?>"
             data-csrf="<?= h(csrfToken()) ?>"
             data-original="<?= h($project['image'] ?? '') ?>"
             data-can-delete="<?= adminCanDelete() ? '1' : '0' ?>">
            <div id="proj_img_preview" class="mb-2" style="<?= !empty($project['image']) ? '' : 'display:none' ?>">
                <div style="position:relative;display:inline-block">
                    <img src="<?= !empty($project['image']) ? h(assetUrl($project['image'])) : '' ?>" alt=""
                         style="max-height:80px;border-radius:6px;border:1px solid var(--neutral-300)">
                    <button type="button" class="btn btn-sm btn-danger img-picker-clear"
                            style="position:absolute;top:-6px;right:-6px;padding:0;width:20px;height:20px;border-radius:50%;font-size:11px;line-height:1">×</button>
                </div>
            </div>
            <input type="hidden" name="image_picker" id="proj_img_input" value="<?= h($project['image'] ?? '') ?>">
            <button type="button" class="btn btn-outline-secondary btn-sm img-picker-btn">
                <i class="fa-solid fa-images me-1"></i> Choose image
            </button>
            <div class="form-text">JPG, PNG, WebP or GIF — max 5 MB</div>
        </div>
    </div>

    <div class="card-altered p-3 mb-4">
        <h6 class="fw-bold mb-3">Settings</h6>
        <div class="row g-3">
            <div class="col-md-4">
                <label class="form-label">Category</label>
                <select name="category_id" class="form-select">
                    <option value="">— None —</option>
                    <?php foreach ($allProjectCats as $pc): ?>
                    <option value="<?= $pc['id'] ?>" <?= (int)$project['category_id'] === (int)$pc['id'] ? 'selected' : '' ?>><?= h($pc['name_en']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-4">
                <label class="form-label">Source</label>
                <select name="source" class="form-select">
                    <option value="admin" <?= $project['source'] === 'admin' ? 'selected' : '' ?>>Admin</option>
                    <option value="user"  <?= $project['source'] === 'user'  ? 'selected' : '' ?>>User submission</option>
                </select>
            </div>
            <div class="col-md-4">
                <label class="form-label">Submitter (name / email / Discord)</label>
                <input type="text" name="submitted_by" class="form-control"
                       value="<?= h($project['submitted_by'] ?? '') ?>" maxlength="255">
            </div>
            <?php $canPub = adminCanPublish(); ?>
            <div class="col-12 d-flex gap-4 pt-1">
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" name="is_approved" id="is_approved"
                           value="1" <?= ($canPub && $project['is_approved']) ? 'checked' : '' ?> <?= $canPub ? '' : 'disabled' ?>>
                    <label class="form-check-label fw-semibold" for="is_approved">Approved</label>
                    <?php if ($canPub): ?>
                    <div class="form-text">Unapproved projects are not shown on the public page.</div>
                    <?php elseif ($id > 0 && $project['is_approved']): ?>
                    <div class="form-text text-warning"><i class="fa-solid fa-triangle-exclamation me-1"></i>This project is currently approved. Saving will send it back for review.</div>
                    <?php else: ?>
                    <div class="form-text text-warning">Requires the <em>Can publish</em> permission — submissions will be pending review.</div>
                    <?php endif; ?>
                </div>
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" name="is_visible" id="is_visible"
                           value="1" <?= $project['is_visible'] ? 'checked' : '' ?>>
                    <label class="form-check-label fw-semibold" for="is_visible">Visible</label>
                    <div class="form-text">Hidden projects are approved but not displayed.</div>
                </div>
            </div>
        </div>
    </div>

    <div class="d-flex gap-2">
        <button type="submit" class="btn btn-sm btn-primary-altered px-4">
            <i class="fa-solid fa-floppy-disk me-1"></i> Save
        </button>
        <a href="<?= BASE_URL ?>/admin/projects" class="btn btn-sm btn-outline-secondary">Cancel</a>
    </div>
</form>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
