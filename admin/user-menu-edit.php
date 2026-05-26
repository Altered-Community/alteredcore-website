<?php
$adminPageTitle = 'User menu link';
$adminSection   = 'user-menu';
require_once __DIR__ . '/includes/header.php';

$db  = getDB();
$id  = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$row = ['id' => 0, 'label_en' => '', 'label_fr' => '', 'url' => '', 'icon' => '', 'sort_order' => 0];
if (!$id) {
    $row['sort_order'] = (int)$db->query(q("SELECT COALESCE(MAX(sort_order), 0) + 1 FROM {user_menu_items}"))->fetchColumn();
}
if ($id) {
    $stmt = $db->prepare(q("SELECT * FROM {user_menu_items} WHERE id = :id AND type = 'link'"));
    $stmt->execute([':id' => $id]);
    $found = $stmt->fetch();
    if ($found) {
        $row = $found;
    } else {
        flash('Item not found.', 'error');
        redirect(BASE_URL . '/admin/user-menu');
    }
}

$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        $errors[] = 'Invalid form token.';
    } else {
        $data = [
            ':label_en'   => trim($_POST['label_en']   ?? ''),
            ':label_fr'   => trim($_POST['label_fr']   ?? ''),
            ':url'        => trim($_POST['url']        ?? ''),
            ':icon'       => trim($_POST['icon']       ?? ''),
            ':sort_order' => (int)($_POST['sort_order'] ?? 0),
        ];

        if ($data[':label_en'] === '') $errors[] = 'English label is required.';

        if (empty($errors)) {
            if ($id) {
                $data[':id'] = $id;
                $db->prepare(q(
                    "UPDATE {user_menu_items} SET label_en=:label_en, label_fr=:label_fr,
                     url=:url, icon=:icon, sort_order=:sort_order WHERE id=:id"
                ))->execute($data);
            } else {
                $db->prepare(q(
                    "INSERT INTO {user_menu_items} (type, label_en, label_fr, url, icon, sort_order)
                     VALUES ('link', :label_en, :label_fr, :url, :icon, :sort_order)"
                ))->execute($data);
            }
            flash($id ? 'Link updated.' : 'Link added.');
            redirect(BASE_URL . '/admin/user-menu');
        }

        $row = array_merge($row, [
            'label_en'   => $data[':label_en'],
            'label_fr'   => $data[':label_fr'],
            'url'        => $data[':url'],
            'icon'       => $data[':icon'],
            'sort_order' => $data[':sort_order'],
        ]);
    }
}
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-user-gear me-2"></i><?= $id ? 'Edit link' : 'Add link' ?></h1>
    <a href="<?= BASE_URL ?>/admin/user-menu" class="btn btn-outline-secondary btn-sm">← Back</a>
</div>

<?php if ($errors): ?>
    <div class="alert alert-danger">
        <ul class="mb-0"><?php foreach ($errors as $e): ?><li><?= h($e) ?></li><?php endforeach; ?></ul>
    </div>
<?php endif; ?>

<div class="card-altered p-3" style="max-width:600px">
    <form method="post" novalidate>
        <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
        <div class="row g-3 mb-3">
            <div class="col-md-6">
                <label class="form-label">Label English 🇬🇧 <span class="text-danger">*</span></label>
                <input type="text" name="label_en" class="form-control" value="<?= h($row['label_en']) ?>">
            </div>
            <div class="col-md-6">
                <label class="form-label">Label French 🇫🇷</label>
                <input type="text" name="label_fr" class="form-control" value="<?= h($row['label_fr']) ?>">
                <div class="form-text">Leave blank to use English label.</div>
            </div>
            <div class="col-md-8">
                <label class="form-label">URL</label>
                <input type="text" name="url" class="form-control"
                       placeholder="/pages/account.php or https://..."
                       value="<?= h($row['url']) ?>">
            </div>
            <div class="col-md-4">
                <label class="form-label">Order</label>
                <input type="number" name="sort_order" class="form-control" value="<?= (int)$row['sort_order'] ?>">
            </div>
            <div class="col-12">
                <label class="form-label">Font Awesome icon</label>
                <div class="input-group">
                    <span class="input-group-text"><i id="icon-preview" class="<?= h($row['icon'] ?: 'fa-solid fa-link') ?>"></i></span>
                    <input type="text" name="icon" id="icon-input" class="form-control"
                           value="<?= h($row['icon']) ?>" placeholder="fa-solid fa-link">
                </div>
            </div>
        </div>
        <div class="d-flex gap-2">
            <button type="submit" class="btn btn-sm btn-primary-altered">
                <i class="fa-solid fa-floppy-disk me-1"></i> Save
            </button>
            <a href="<?= BASE_URL ?>/admin/user-menu" class="btn btn-sm btn-outline-secondary">Cancel</a>
        </div>
    </form>
</div>

<script>
document.getElementById('icon-input').addEventListener('input', function() {
    document.getElementById('icon-preview').className = this.value || 'fa-solid fa-link';
});
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
