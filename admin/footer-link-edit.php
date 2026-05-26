<?php
$adminPageTitle = 'Footer link';
$adminSection   = 'footer';
require_once __DIR__ . '/includes/header.php';

$db  = getDB();
$id         = isset($_GET['id'])  ? (int)$_GET['id']  : 0;
$defaultCol = isset($_GET['col']) ? max(1, min(4, (int)$_GET['col'])) : 2;
$row = ['id' => 0, 'label_en' => '', 'label_fr' => '', 'url' => '', 'icon' => '', 'column_num' => $defaultCol, 'sort_order' => 0];
if (!$id) {
    $row['sort_order'] = (int)$db->query(q("SELECT COALESCE(MAX(sort_order), 0) + 1 FROM {footer_links}"))->fetchColumn();
}
if ($id) {
    $stmt = $db->prepare(q("SELECT * FROM {footer_links} WHERE id = :id"));
    $stmt->execute([':id' => $id]);
    $found = $stmt->fetch();
    if ($found) {
        $row = $found;
    } else {
        flash('Link not found.', 'error');
        redirect(BASE_URL . '/admin/footer');
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
            ':icon'       => trim($_POST['icon']       ?? '') ?: null,
            ':column_num' => max(1, min(4, (int)($_POST['column_num'] ?? 2))),
            ':sort_order' => (int)($_POST['sort_order'] ?? 0),
        ];

        if ($data[':label_en'] === '') $errors[] = 'English label is required.';
        if ($data[':label_fr'] === '') $errors[] = 'French label is required.';
        if ($data[':url']      === '') $errors[] = 'URL is required.';

        if (empty($errors)) {
            if ($id) {
                $data[':id'] = $id;
                $db->prepare(q(
                    "UPDATE {footer_links} SET label_en=:label_en, label_fr=:label_fr,
                     url=:url, icon=:icon, column_num=:column_num, sort_order=:sort_order WHERE id=:id"
                ))->execute($data);
            } else {
                $db->prepare(q(
                    "INSERT INTO {footer_links} (label_en, label_fr, url, icon, column_num, sort_order)
                     VALUES (:label_en, :label_fr, :url, :icon, :column_num, :sort_order)"
                ))->execute($data);
            }
            flash($id ? 'Link updated.' : 'Link added.');
            redirect(BASE_URL . '/admin/footer');
        }

        $row = array_merge($row, [
            'label_en'   => $data[':label_en'],
            'label_fr'   => $data[':label_fr'],
            'url'        => $data[':url'],
            'icon'       => $data[':icon'] ?? '',
            'column_num' => $data[':column_num'],
            'sort_order' => $data[':sort_order'],
        ]);
    }
}
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-link me-2"></i><?= $id ? 'Edit link' : 'Add link' ?></h1>
    <a href="<?= BASE_URL ?>/admin/footer" class="btn btn-outline-secondary btn-sm">← Back</a>
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
                <label class="form-label">Label French 🇫🇷 <span class="text-danger">*</span></label>
                <input type="text" name="label_fr" class="form-control" value="<?= h($row['label_fr']) ?>">
            </div>
            <div class="col-md-8">
                <label class="form-label">URL <span class="text-danger">*</span></label>
                <input type="text" name="url" class="form-control"
                       placeholder="/pages/news.php or https://..." value="<?= h($row['url']) ?>">
            </div>
            <div class="col-md-2">
                <label class="form-label">Column</label>
                <select name="column_num" class="form-select">
                    <?php for ($__c = 1; $__c <= 4; $__c++): ?>
                    <option value="<?= $__c ?>" <?= (int)($row['column_num'] ?? 2) === $__c ? 'selected' : '' ?>>
                        <?= $__c ?>
                    </option>
                    <?php endfor; ?>
                </select>
            </div>
            <div class="col-md-2">
                <label class="form-label">Order <small class="text-muted">(↑ = first)</small></label>
                <input type="number" name="sort_order" class="form-control" value="<?= (int)$row['sort_order'] ?>">
            </div>
            <div class="col-12">
                <label class="form-label">Font Awesome icon <small class="text-muted">(optional)</small></label>
                <div class="input-group">
                    <span class="input-group-text"><i id="icon-preview" class="<?= h($row['icon'] ?: 'fa-solid fa-link') ?>"></i></span>
                    <input type="text" name="icon" id="icon-input" class="form-control"
                           value="<?= h($row['icon'] ?? '') ?>"
                           placeholder="fa-solid fa-link">
                    <button type="button" class="btn btn-sm btn-outline-secondary" id="icon-clear" title="No icon">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div class="form-text">Leave blank for no icon. e.g. <code>fa-solid fa-newspaper</code></div>
            </div>
        </div>

        <div class="d-flex gap-2">
            <button type="submit" class="btn btn-sm btn-primary-altered">
                <i class="fa-solid fa-floppy-disk me-1"></i> Save
            </button>
            <a href="<?= BASE_URL ?>/admin/footer" class="btn btn-sm btn-outline-secondary">Cancel</a>
        </div>
    </form>
</div>

<script>
(function() {
    var input   = document.getElementById('icon-input');
    var preview = document.getElementById('icon-preview');
    var clear   = document.getElementById('icon-clear');
    input.addEventListener('input', function() {
        preview.className = this.value.trim() || 'fa-solid fa-link';
    });
    clear.addEventListener('click', function() {
        input.value = '';
        preview.className = 'fa-solid fa-link';
    });
})();
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
