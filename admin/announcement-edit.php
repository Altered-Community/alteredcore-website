<?php
$adminPageTitle = 'Edit Announcement';
$adminSection   = 'announcement';
require_once __DIR__ . '/includes/header.php';

$db = getDB();
$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($id === 0 && !adminCanCreate()) {
    flash('You do not have permission to create content.', 'error');
    redirect(BASE_URL . '/admin/announcements');
}
if ($id > 0 && !adminCanEdit()) {
    flash('You do not have permission to edit content.', 'error');
    redirect(BASE_URL . '/admin/announcements');
}

$bsColors = [
    'primary'   => 'Primary (blue)',
    'secondary' => 'Secondary (grey)',
    'success'   => 'Success (green)',
    'danger'    => 'Danger (red)',
    'warning'   => 'Warning (yellow)',
    'info'      => 'Info (cyan)',
    'light'     => 'Light',
    'dark'      => 'Dark',
];

$entry = [
    'id'           => 0,
    'title_en'     => '',
    'title_fr'     => '',
    'text_en'      => '',
    'text_fr'      => '',
    'color'        => 'info',
    'icon'         => 'fa-solid fa-circle-info',
    'sort_order'   => 0,
    'link_url'     => '',
    'link_target'  => '_self',
    'link_label_en' => '',
    'link_label_fr' => '',
];
if (!$id) {
    $entry['sort_order'] = (int)$db->query(q("SELECT COALESCE(MAX(sort_order), 0) + 1 FROM {announcements}"))->fetchColumn();
}
if ($id) {
    $stmt = $db->prepare(q("SELECT * FROM {announcements} WHERE id = :id"));
    $stmt->execute([':id' => $id]);
    $row = $stmt->fetch();
    if ($row) {
        $entry          = $row;
        $adminPageTitle = 'Edit announcement';
    } else {
        flash('Announcement not found.', 'error');
        redirect(BASE_URL . '/admin/announcements');
    }
}

$errors = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        $errors[] = 'Invalid form token. Please try again.';
    } else {
        $color = $_POST['color'] ?? 'info';
        if (!isset($bsColors[$color])) $color = 'info';

        $icon = trim($_POST['icon'] ?? '');
        if ($icon !== '' && !preg_match('#^[\w\s-]+$#', $icon)) $icon = 'fa-solid fa-circle-info';

        $linkUrl    = trim($_POST['link_url'] ?? '');
        $linkTarget = ($_POST['link_target'] ?? '_self') === '_blank' ? '_blank' : '_self';

        $data = [
            'title_en'      => trim($_POST['title_en']      ?? ''),
            'title_fr'      => trim($_POST['title_fr']      ?? ''),
            'text_en'       => trim($_POST['text_en']       ?? ''),
            'text_fr'       => trim($_POST['text_fr']       ?? ''),
            'color'         => $color,
            'icon'          => $icon,
            'sort_order'    => (int)($_POST['sort_order']   ?? 0),
            'link_url'      => $linkUrl ?: null,
            'link_target'   => $linkTarget,
            'link_label_en' => trim($_POST['link_label_en'] ?? '') ?: null,
            'link_label_fr' => trim($_POST['link_label_fr'] ?? '') ?: null,
        ];

        if ($data['title_en'] === '' && $data['title_fr'] === '' && $data['text_en'] === '' && $data['text_fr'] === '') {
            $errors[] = 'At least one title or text field must be filled in.';
        }

        if (empty($errors)) {
            if ($id) {
                $db->prepare(q(
                    "UPDATE {announcements}
                     SET title_en=:title_en, title_fr=:title_fr,
                         text_en=:text_en, text_fr=:text_fr,
                         color=:color, icon=:icon, sort_order=:sort_order,
                         link_url=:link_url, link_target=:link_target,
                         link_label_en=:link_label_en, link_label_fr=:link_label_fr
                     WHERE id=:id"
                ))->execute(array_merge($data, [':id' => $id]));
                flash('Announcement updated.');
            } else {
                $db->prepare(q(
                    "INSERT INTO {announcements}
                         (title_en, title_fr, text_en, text_fr, color, icon, sort_order,
                          link_url, link_target, link_label_en, link_label_fr)
                     VALUES
                         (:title_en, :title_fr, :text_en, :text_fr, :color, :icon, :sort_order,
                          :link_url, :link_target, :link_label_en, :link_label_fr)"
                ))->execute($data);
                flash('Announcement created.');
            }
            redirect(BASE_URL . '/admin/announcements');
        }

        $entry = array_merge($entry, $data);
    }
}
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-bullhorn me-2"></i><?= $id ? 'Edit announcement' : 'Add announcement' ?></h1>
    <a href="<?= BASE_URL ?>/admin/announcements" class="btn btn-outline-secondary btn-sm">← Back</a>
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

    <div class="row g-4 mb-4">
        <!-- English -->
        <div class="col-lg-6">
            <div class="card-altered p-3">
                <h6 class="fw-bold mb-3"><i class="fi fi-gb me-1"></i> English</h6>
                <div class="mb-3">
                    <label class="form-label">Title</label>
                    <input type="text" name="title_en" class="form-control"
                           value="<?= h($entry['title_en']) ?>" maxlength="200">
                    <div class="form-text">Short headline. Leave blank to show no title.</div>
                </div>
                <div>
                    <label class="form-label">Text</label>
                    <textarea name="text_en" class="form-control" rows="3"
                              maxlength="1000"><?= h($entry['text_en']) ?></textarea>
                </div>
            </div>
        </div>

        <!-- French -->
        <div class="col-lg-6">
            <div class="card-altered p-3">
                <h6 class="fw-bold mb-3"><i class="fi fi-fr me-1"></i> Français</h6>
                <div class="mb-3">
                    <label class="form-label">Titre</label>
                    <input type="text" name="title_fr" class="form-control"
                           value="<?= h($entry['title_fr']) ?>" maxlength="200">
                    <div class="form-text">Titre court. Laisser vide pour ne pas afficher de titre.</div>
                </div>
                <div>
                    <label class="form-label">Texte</label>
                    <textarea name="text_fr" class="form-control" rows="3"
                              maxlength="1000"><?= h($entry['text_fr']) ?></textarea>
                </div>
            </div>
        </div>
    </div>

    <div class="card-altered p-3 mb-4">
        <h6 class="fw-bold mb-3">Appearance</h6>
        <div class="row g-3">
            <div class="col-md-4">
                <label class="form-label">Color</label>
                <select name="color" id="ann_color" class="form-select">
                    <?php foreach ($bsColors as $val => $label): ?>
                    <option value="<?= h($val) ?>" <?= $entry['color'] === $val ? 'selected' : '' ?>><?= h($label) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-4">
                <label class="form-label">Icon <span class="text-muted small">(Font Awesome class)</span></label>
                <div class="input-group">
                    <span class="input-group-text">
                        <i id="ann_icon_i" class="<?= h($entry['icon']) ?>"></i>
                    </span>
                    <input type="text" name="icon" id="ann_icon" class="form-control"
                           value="<?= h($entry['icon']) ?>" maxlength="100"
                           placeholder="fa-solid fa-circle-info">
                </div>
                <div class="form-text">e.g. <code>fa-solid fa-circle-info</code>, <code>fa-solid fa-triangle-exclamation</code>. Leave blank to hide.</div>
            </div>
            <div class="col-md-4">
                <label class="form-label">Sort order</label>
                <input type="number" name="sort_order" class="form-control"
                       value="<?= (int)$entry['sort_order'] ?>">
                <div class="form-text">Lower = displayed first in the list.</div>
            </div>
        </div>

        <!-- Live preview -->
        <div class="mt-4">
            <label class="form-label fw-semibold small text-muted text-uppercase">Preview</label>
            <div id="ann_preview" class="alert alert-<?= h($entry['color']) ?> d-flex align-items-start gap-2 mb-0" role="alert">
                <i id="ann_prev_icon" class="<?= h($entry['icon']) ?> mt-1 flex-shrink-0"
                   <?= $entry['icon'] === '' ? 'style="display:none"' : '' ?>></i>
                <div>
                    <div id="ann_prev_title" class="fw-bold"
                         <?= ($entry['title_en'] === '') ? 'style="display:none"' : '' ?>><?= h($entry['title_en'] ?: 'Announcement title') ?></div>
                    <div id="ann_prev_text"><?= h($entry['text_en'] ?: 'Announcement text preview.') ?></div>
                </div>
            </div>
        </div>
    </div>

    <div class="card-altered p-3 mb-4">
        <h6 class="fw-bold mb-3">Link <span class="text-muted fw-normal small">(optional)</span></h6>
        <div class="row g-3">
            <div class="col-md-8">
                <label class="form-label">URL</label>
                <input type="url" name="link_url" class="form-control"
                       value="<?= h($entry['link_url'] ?? '') ?>" maxlength="500"
                       placeholder="https://…">
                <div class="form-text">Leave blank if no link. Use <code>{link}</code> in the text to insert the link inline.</div>
            </div>
            <div class="col-md-4">
                <label class="form-label">Open in</label>
                <select name="link_target" class="form-select">
                    <option value="_self"  <?= ($entry['link_target'] ?? '_self') === '_self'  ? 'selected' : '' ?>>Same tab</option>
                    <option value="_blank" <?= ($entry['link_target'] ?? '_self') === '_blank' ? 'selected' : '' ?>>New tab</option>
                </select>
            </div>
            <div class="col-md-6">
                <label class="form-label"><i class="fi fi-gb me-1"></i> Link label (EN)</label>
                <input type="text" name="link_label_en" class="form-control"
                       value="<?= h($entry['link_label_en'] ?? '') ?>" maxlength="200"
                       placeholder="Click here">
                <div class="form-text">Text shown for the link. Falls back to FR if EN is empty.</div>
            </div>
            <div class="col-md-6">
                <label class="form-label"><i class="fi fi-fr me-1"></i> Libellé du lien (FR)</label>
                <input type="text" name="link_label_fr" class="form-control"
                       value="<?= h($entry['link_label_fr'] ?? '') ?>" maxlength="200"
                       placeholder="Cliquez ici">
            </div>
        </div>
    </div>

    <div class="d-flex gap-2">
        <button type="submit" class="btn btn-sm btn-primary-altered px-4">
            <i class="fa-solid fa-floppy-disk me-1"></i> Save
        </button>
        <a href="<?= BASE_URL ?>/admin/announcements" class="btn btn-sm btn-outline-secondary">Cancel</a>
    </div>
</form>

<script>
(function () {
    var colorSel  = document.getElementById('ann_color');
    var iconInput = document.getElementById('ann_icon');
    var preview   = document.getElementById('ann_preview');
    var prevIcon  = document.getElementById('ann_prev_icon');
    var inpIcon   = document.getElementById('ann_icon_i');
    var titleIn   = document.querySelector('[name="title_en"]');
    var textIn    = document.querySelector('[name="text_en"]');
    var prevTitle = document.getElementById('ann_prev_title');
    var prevText  = document.getElementById('ann_prev_text');

    var bsAlertClasses = ['alert-primary','alert-secondary','alert-success','alert-danger',
                          'alert-warning','alert-info','alert-light','alert-dark'];

    function applyColor() {
        bsAlertClasses.forEach(function (c) { preview.classList.remove(c); });
        preview.classList.add('alert-' + colorSel.value);
    }

    function applyIcon() {
        var cls = iconInput.value.trim();
        prevIcon.className = cls + ' mt-1 flex-shrink-0';
        inpIcon.className  = cls;
        prevIcon.style.display = cls ? '' : 'none';
    }

    colorSel.addEventListener('change', applyColor);
    iconInput.addEventListener('input', applyIcon);

    titleIn.addEventListener('input', function () {
        var v = titleIn.value.trim();
        prevTitle.textContent  = v || 'Announcement title';
        prevTitle.style.display = v ? '' : 'none';
    });
    textIn.addEventListener('input', function () {
        prevText.textContent = textIn.value || 'Announcement text preview.';
    });
})();
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
