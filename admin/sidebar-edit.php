<?php
$adminPageTitle = 'Sidebar item';
$adminSection   = 'sidebar';
require_once __DIR__ . '/includes/header.php';

$db  = getDB();
$id  = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$row = ['id' => 0, 'label_en' => '', 'label_fr' => '', 'url' => '#',
        'icon' => '', 'sort_order' => 0, 'is_visible' => 1,
        'is_separator' => 0, 'is_section_header' => 0, 'is_blank' => 0];
if (!$id) {
    $row['sort_order'] = (int)$db->query(q("SELECT COALESCE(MAX(sort_order), 0) + 1 FROM {sidebar_items}"))->fetchColumn();
}
if ($id) {
    $stmt = $db->prepare(q("SELECT * FROM {sidebar_items} WHERE id = :id"));
    $stmt->execute([':id' => $id]);
    $found = $stmt->fetch();
    if ($found) {
        $row = $found;
    } else {
        flash('Item not found.', 'error');
        redirect(BASE_URL . '/admin/sidebar');
    }
}

$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        $errors[] = 'Invalid form token.';
    } else {
        $isSep = isset($_POST['is_separator'])      ? 1 : 0;
        $isHdr = isset($_POST['is_section_header']) ? 1 : 0;
        if ($isSep) $isHdr = 0; // mutually exclusive — separator wins if both somehow sent

        $data = [
            ':label_en'         => trim($_POST['label_en']   ?? ''),
            ':label_fr'         => trim($_POST['label_fr']   ?? ''),
            ':url'              => trim($_POST['url']        ?? '#'),
            ':icon'             => trim($_POST['icon']       ?? ''),
            ':sort_order'       => (int)($_POST['sort_order'] ?? 0),
            ':is_visible'       => isset($_POST['is_visible'])  ? 1 : 0,
            ':is_separator'     => $isSep,
            ':is_section_header'=> $isHdr,
            ':is_blank'         => isset($_POST['is_blank'])    ? 1 : 0,
        ];

        if (!$isSep && $data[':label_en'] === '') $errors[] = 'English label is required.';
        if (!$isSep && $data[':label_fr'] === '') $errors[] = 'French label is required.';

        if (empty($errors)) {
            if ($id) {
                $data[':id'] = $id;
                $db->prepare(q(
                    "UPDATE {sidebar_items}
                     SET label_en=:label_en, label_fr=:label_fr, url=:url, icon=:icon,
                         sort_order=:sort_order, is_visible=:is_visible,
                         is_separator=:is_separator, is_section_header=:is_section_header,
                         is_blank=:is_blank
                     WHERE id=:id"
                ))->execute($data);
            } else {
                $db->prepare(q(
                    "INSERT INTO {sidebar_items}
                     (label_en, label_fr, url, icon, sort_order, is_visible,
                      is_separator, is_section_header, is_blank)
                     VALUES (:label_en, :label_fr, :url, :icon, :sort_order, :is_visible,
                             :is_separator, :is_section_header, :is_blank)"
                ))->execute($data);
            }
            flash($id ? 'Item updated.' : 'Item added.');
            redirect(BASE_URL . '/admin/sidebar');
        }

        $row = array_merge($row, [
            'label_en'         => $data[':label_en'],
            'label_fr'         => $data[':label_fr'],
            'url'              => $data[':url'],
            'icon'             => $data[':icon'],
            'sort_order'       => $data[':sort_order'],
            'is_visible'       => $data[':is_visible'],
            'is_separator'     => $data[':is_separator'],
            'is_section_header'=> $data[':is_section_header'],
            'is_blank'         => $data[':is_blank'],
        ]);
    }
}
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-table-columns me-2"></i><?= $id ? 'Edit item' : 'Add item' ?></h1>
    <a href="<?= BASE_URL ?>/admin/sidebar" class="btn btn-outline-secondary btn-sm">← Back</a>
</div>

<?php if ($errors): ?>
    <div class="alert alert-danger">
        <ul class="mb-0"><?php foreach ($errors as $e): ?><li><?= h($e) ?></li><?php endforeach; ?></ul>
    </div>
<?php endif; ?>

<div class="card-altered p-3" style="max-width:640px">
    <form method="post" novalidate>
        <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">

        <div class="row g-3 mb-3">

            <!-- Item type -->
            <div class="col-12">
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" name="is_separator" id="is_separator"
                           value="1" <?= !empty($row['is_separator']) ? 'checked' : '' ?>>
                    <label class="form-check-label fw-semibold" for="is_separator">
                        Separator <small class="text-muted fw-normal">(horizontal divider line — no label or URL needed)</small>
                    </label>
                </div>
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" name="is_section_header" id="is_section_header"
                           value="1" <?= !empty($row['is_section_header']) ? 'checked' : '' ?>>
                    <label class="form-check-label fw-semibold" for="is_section_header">
                        Section header <small class="text-muted fw-normal">(titled group label — label required, no URL or icon)</small>
                    </label>
                </div>
            </div>

            <!-- Labels (visible for links and section headers) -->
            <div id="labelFields" class="col-12">
                <div class="row g-3">
                    <div class="col-md-6">
                        <label class="form-label">Label English 🇬🇧 <span class="text-danger">*</span></label>
                        <input type="text" name="label_en" class="form-control" value="<?= h($row['label_en']) ?>">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Label French 🇫🇷 <span class="text-danger">*</span></label>
                        <input type="text" name="label_fr" class="form-control" value="<?= h($row['label_fr']) ?>">
                    </div>
                </div>
            </div>

            <!-- URL, icon, new-tab (visible for links only) -->
            <div id="urlIconFields" class="col-12">
                <div class="row g-3">
                    <div class="col-md-8">
                        <label class="form-label">URL</label>
                        <input type="text" name="url" class="form-control"
                               placeholder="/pages/cards or https://..."
                               value="<?= h($row['url']) ?>">
                    </div>
                    <div class="col-12">
                        <label class="form-label">Font Awesome icon</label>
                        <div class="input-group">
                            <span class="input-group-text"><i id="icon-preview" class="<?= h($row['icon']) ?>"></i></span>
                            <input type="text" name="icon" id="icon-input" class="form-control"
                                   value="<?= h($row['icon']) ?>"
                                   placeholder="fa-solid fa-house">
                        </div>
                        <div class="form-text">e.g. <code>fa-solid fa-house</code>, <code>fa-solid fa-newspaper</code> — or Altered icons: <code>fak fa-collection</code>, <code>fak fa-booster-pack</code></div>
                    </div>
                    <div class="col-12">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" name="is_blank" id="is_blank"
                                   value="1" <?= !empty($row['is_blank']) ? 'checked' : '' ?>>
                            <label class="form-check-label" for="is_blank">Open in new tab</label>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-md-4">
                <label class="form-label">Order <small class="text-muted">(lower = first)</small></label>
                <input type="number" name="sort_order" class="form-control" value="<?= (int)$row['sort_order'] ?>">
            </div>
            <div class="col-12">
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" name="is_visible" id="is_visible"
                           value="1" <?= $row['is_visible'] ? 'checked' : '' ?>>
                    <label class="form-check-label" for="is_visible">Visible</label>
                </div>
            </div>
        </div>

        <div class="d-flex gap-2">
            <button type="submit" class="btn btn-sm btn-primary-altered">
                <i class="fa-solid fa-floppy-disk me-1"></i> Save
            </button>
            <a href="<?= BASE_URL ?>/admin/sidebar" class="btn btn-sm btn-outline-secondary">Cancel</a>
        </div>
    </form>
</div>

<script>
(function () {
    var sepCheck    = document.getElementById('is_separator');
    var hdrCheck    = document.getElementById('is_section_header');
    var labelFields = document.getElementById('labelFields');
    var urlFields   = document.getElementById('urlIconFields');

    function toggle() {
        var isSep = sepCheck.checked;
        var isHdr = hdrCheck.checked;
        labelFields.style.display = isSep ? 'none' : '';
        urlFields.style.display   = (isSep || isHdr) ? 'none' : '';
    }

    sepCheck.addEventListener('change', function () {
        if (this.checked) hdrCheck.checked = false;
        toggle();
    });
    hdrCheck.addEventListener('change', function () {
        if (this.checked) sepCheck.checked = false;
        toggle();
    });
    toggle();

    document.getElementById('icon-input').addEventListener('input', function () {
        document.getElementById('icon-preview').className = this.value;
    });
}());
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
