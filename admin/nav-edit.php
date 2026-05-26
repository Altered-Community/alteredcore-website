<?php
$adminPageTitle = 'Navigation item';
$adminSection   = 'nav';
require_once __DIR__ . '/includes/header.php';

$db  = getDB();
$id  = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$row = ['id' => 0, 'parent_id' => null, 'label_en' => '', 'label_fr' => '', 'url' => '#',
        'icon' => 'fa-solid fa-link', 'sort_order' => 0, 'is_visible' => 1, 'is_iframe' => 0, 'is_blank' => 0, 'is_fullwidth' => 0, 'hide_label' => 0];
$topLevelItems = $db->query(q("SELECT id, label_en FROM {nav_items} WHERE parent_id IS NULL ORDER BY sort_order, id"))->fetchAll();
if (!$id) {
    $row['sort_order'] = (int)$db->query(q("SELECT COALESCE(MAX(sort_order), 0) + 1 FROM {nav_items}"))->fetchColumn();
}
if ($id) {
    $stmt = $db->prepare(q("SELECT * FROM {nav_items} WHERE id = :id"));
    $stmt->execute([':id' => $id]);
    $found = $stmt->fetch();
    if ($found) {
        $row = $found;
    } else {
        flash('Item not found.', 'error');
        redirect(BASE_URL . '/admin/nav');
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
            ':icon'       => trim($_POST['icon']       ?? 'fa-solid fa-link'),
            ':sort_order' => (int)($_POST['sort_order'] ?? 0),
            ':is_visible'  => isset($_POST['is_visible'])  ? 1 : 0,
            ':is_iframe'   => isset($_POST['is_iframe'])   ? 1 : 0,
            ':is_blank'    => isset($_POST['is_blank'])    ? 1 : 0,
            ':is_fullwidth'=> isset($_POST['is_fullwidth'])? 1 : 0,
            ':hide_label'  => isset($_POST['hide_label'])  ? 1 : 0,
        ];

        $parentId = !empty($_POST['parent_id']) ? (int)$_POST['parent_id'] : null;
        if ($parentId === $id) $parentId = null;
        $data[':parent_id'] = $parentId;

        if (!empty($row['is_sidebar_toggle'])) $data[':url'] = '#';

        if ($data[':label_en'] === '') $errors[] = 'English label is required.';
        if ($data[':label_fr'] === '') $errors[] = 'French label is required.';

        if (empty($errors)) {
            if ($id) {
                $data[':id'] = $id;
                $db->prepare(q(
                    "UPDATE {nav_items} SET parent_id=:parent_id, label_en=:label_en, label_fr=:label_fr,
                     url=:url, icon=:icon, sort_order=:sort_order, is_visible=:is_visible,
                     is_iframe=:is_iframe, is_blank=:is_blank, is_fullwidth=:is_fullwidth,
                     hide_label=:hide_label WHERE id=:id"
                ))->execute($data);
            } else {
                $db->prepare(q(
                    "INSERT INTO {nav_items} (parent_id, label_en, label_fr, url, icon, sort_order, is_visible, is_iframe, is_blank, is_fullwidth, hide_label)
                     VALUES (:parent_id, :label_en, :label_fr, :url, :icon, :sort_order, :is_visible, :is_iframe, :is_blank, :is_fullwidth, :hide_label)"
                ))->execute($data);
            }
            flash($id ? 'Item updated.' : 'Item added.');
            redirect(BASE_URL . '/admin/nav');
        }

        $row = array_merge($row, [
            'label_en'   => $data[':label_en'],
            'label_fr'   => $data[':label_fr'],
            'url'        => $data[':url'],
            'icon'       => $data[':icon'],
            'sort_order' => $data[':sort_order'],
            'parent_id'  => $data[':parent_id'],
            'is_visible'   => $data[':is_visible'],
            'is_iframe'    => $data[':is_iframe'],
            'is_blank'     => $data[':is_blank'],
            'is_fullwidth' => $data[':is_fullwidth'],
            'hide_label'   => $data[':hide_label'],
        ]);
    }
}
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-bars me-2"></i><?= $id ? 'Edit item' : 'Add item' ?></h1>
    <a href="<?= BASE_URL ?>/admin/nav" class="btn btn-outline-secondary btn-sm">← Back</a>
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
            <div class="col-12">
                <label class="form-label">Parent item <small class="text-muted">(makes this a dropdown child)</small></label>
                <select name="parent_id" class="form-select" style="max-width:320px">
                    <option value="">— None (top-level) —</option>
                    <?php foreach ($topLevelItems as $tl):
                        if ($tl['id'] === $id) continue; ?>
                        <option value="<?= $tl['id'] ?>" <?= (int)($row['parent_id'] ?? 0) === (int)$tl['id'] ? 'selected' : '' ?>>
                            <?= h($tl['label_en']) ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-6">
                <label class="form-label">Label English 🇬🇧 <span class="text-danger">*</span></label>
                <input type="text" name="label_en" class="form-control" value="<?= h($row['label_en']) ?>">
            </div>
            <div class="col-md-6">
                <label class="form-label">Label French 🇫🇷 <span class="text-danger">*</span></label>
                <input type="text" name="label_fr" class="form-control" value="<?= h($row['label_fr']) ?>">
            </div>
            <div class="col-md-8">
                <label class="form-label">URL</label>
                <input type="text" name="url" class="form-control"
                       placeholder="/pages/cards.php or https://... (use # for dropdown parent)"
                       value="<?= h($row['url']) ?>"
                       <?= !empty($row['is_sidebar_toggle']) ? 'disabled title="The sidebar toggle button always uses #"' : '' ?>>
                <?php if (!empty($row['is_sidebar_toggle'])): ?>
                <div class="form-text text-muted">Fixed to <code>#</code> — this button opens the sidebar, not a URL.</div>
                <?php endif; ?>
            </div>
            <div class="col-md-4">
                <label class="form-label">Order <small class="text-muted">(lower = first)</small></label>
                <input type="number" name="sort_order" class="form-control" value="<?= (int)$row['sort_order'] ?>">
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
                <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" name="is_visible" id="is_visible"
                           value="1" <?= $row['is_visible'] ? 'checked' : '' ?>>
                    <label class="form-check-label" for="is_visible">Visible in menu</label>
                </div>
                <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" name="is_iframe" id="is_iframe"
                           value="1" <?= !empty($row['is_iframe']) ? 'checked' : '' ?>>
                    <label class="form-check-label" for="is_iframe">
                        Open in iframe <small class="text-muted">(displays the URL within the site layout instead of navigating directly)</small>
                    </label>
                </div>
                <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" name="is_blank" id="is_blank"
                           value="1" <?= !empty($row['is_blank']) ? 'checked' : '' ?>>
                    <label class="form-check-label" for="is_blank">
                        Open in new tab <small class="text-muted">(target="_blank", ignored when iframe is checked)</small>
                    </label>
                </div>
                <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" name="is_fullwidth" id="is_fullwidth"
                           value="1" <?= !empty($row['is_fullwidth']) ? 'checked' : '' ?>>
                    <label class="form-check-label" for="is_fullwidth">
                        Full width <small class="text-muted">(removes max-width constraint — for pages that need the full browser width)</small>
                    </label>
                </div>
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" name="hide_label" id="hide_label"
                           value="1" <?= !empty($row['hide_label']) ? 'checked' : '' ?>>
                    <label class="form-check-label" for="hide_label">
                        Hide label <small class="text-muted">(show icon only — the label is still used for accessibility)</small>
                    </label>
                </div>
            </div>
        </div>

        <div class="d-flex gap-2">
            <button type="submit" class="btn btn-sm btn-primary-altered">
                <i class="fa-solid fa-floppy-disk me-1"></i> Save
            </button>
            <a href="<?= BASE_URL ?>/admin/nav" class="btn btn-sm btn-outline-secondary">Cancel</a>
        </div>
    </form>
</div>

<script>
document.getElementById('icon-input').addEventListener('input', function() {
    document.getElementById('icon-preview').className = this.value;
});
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
