<?php
$adminSection = 'groups';
$isNew        = !isset($_GET['id']);
$adminPageTitle = $isNew ? 'New group' : 'Edit group';
require_once __DIR__ . '/includes/header.php';

$db       = getDB();
$sections = adminSections();

// Plugin sections — grouped by plugin for display, flat for POST validation
initPlugins();
$pluginSectionsGrouped = [];
$_allPluginManifests   = pluginsGetAll();
foreach (pluginsGetAdminSections() as $_ps) {
    $_pid = $_ps['plugin_id'];
    if (!isset($pluginSectionsGrouped[$_pid])) {
        $pluginSectionsGrouped[$_pid] = [
            'name'     => $_allPluginManifests[$_pid]['name'] ?? $_pid,
            'icon'     => $_allPluginManifests[$_pid]['icon'] ?? 'fa-solid fa-puzzle-piece',
            'sections' => [],
        ];
    }
    $pluginSectionsGrouped[$_pid]['sections'][] = $_ps;
}

// Combined key list used for POST validation and section_hidden persistence
$allSectionKeys = array_keys($sections);
foreach ($pluginSectionsGrouped as $_pg) {
    foreach ($_pg['sections'] as $_ps) {
        $allSectionKeys[] = $_ps['section'];
    }
}
$allSectionKeys = array_unique($allSectionKeys);

$gid = $isNew ? 0 : (int)$_GET['id'];

$visibleSections = $sections;

// load existing group
$group = null;
$groupSections = [];

if (!$isNew) {
    $stmt = $db->prepare(q("SELECT * FROM {user_groups} WHERE id = :id"));
    $stmt->execute([':id' => $gid]);
    $group = $stmt->fetch();
    if (!$group) {
        flash('Group not found.', 'error');
        redirect(BASE_URL . '/admin/groups');
    }

    $ps = $db->prepare(q("SELECT section FROM {group_permissions} WHERE group_id = :id"));
    $ps->execute([':id' => $gid]);
    $groupSections = $ps->fetchAll(PDO::FETCH_COLUMN);
}

// pOST handler
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        flash('Invalid token.', 'error');
        redirect(BASE_URL . '/admin/group-edit' . ($isNew ? '' : "?id={$gid}"));
    }

    $name         = trim($_POST['name']  ?? '');
    $color        = trim($_POST['color'] ?? '#6b7280');
    $icon         = trim($_POST['icon']  ?? '');
    $canAccessAdmin = !empty($_POST['can_access_admin']) ? 1 : 0;
    $canDelete      = !empty($_POST['can_delete'])       ? 1 : 0;
    $canPublish     = !empty($_POST['can_publish'])      ? 1 : 0;
    $canCreate      = !empty($_POST['can_create'])       ? 1 : 0;
    $canEdit        = !empty($_POST['can_edit'])         ? 1 : 0;
    $canReadonlyAll = !empty($_POST['can_readonly_all']) ? 1 : 0;
    $canPreview     = !empty($_POST['can_preview'])      ? 1 : 0;
    $postedPerms = array_intersect($allSectionKeys, (array)($_POST['sections'] ?? []));
    $perms = $postedPerms;

    if ($name === '') {
        flash('Name is required.', 'error');
        redirect(BASE_URL . '/admin/group-edit' . ($isNew ? '' : "?id={$gid}"));
    }

    // Auto-generate slug from name
    $slug = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $name));
    $slug = trim($slug, '-');

    if ($isNew) {
        $stmt = $db->prepare(q(
            "INSERT INTO {user_groups} (name, slug, color, icon, can_access_admin, can_delete, can_publish, can_create, can_edit, can_readonly_all, can_preview) VALUES (:name, :slug, :color, :icon, :adm, :del, :pub, :cre, :edt, :roa, :prv)"
        ));
        $stmt->execute([':name' => $name, ':slug' => $slug, ':color' => $color, ':icon' => $icon, ':adm' => $canAccessAdmin, ':del' => $canDelete, ':pub' => $canPublish, ':cre' => $canCreate, ':edt' => $canEdit, ':roa' => $canReadonlyAll, ':prv' => $canPreview]);
        $gid = (int)$db->lastInsertId();
    } else {
        // Check slug uniqueness (excluding self)
        $ck = $db->prepare(q("SELECT id FROM {user_groups} WHERE slug = :slug AND id != :id"));
        $ck->execute([':slug' => $slug, ':id' => $gid]);
        if ($ck->fetchColumn()) {
            $slug .= '-' . $gid;
        }
        $stmt = $db->prepare(q(
            "UPDATE {user_groups} SET name=:name, slug=:slug, color=:color, icon=:icon, can_access_admin=:adm, can_delete=:del, can_publish=:pub, can_create=:cre, can_edit=:edt, can_readonly_all=:roa, can_preview=:prv WHERE id=:id"
        ));
        $stmt->execute([':name' => $name, ':slug' => $slug, ':color' => $color, ':icon' => $icon, ':adm' => $canAccessAdmin, ':del' => $canDelete, ':pub' => $canPublish, ':cre' => $canCreate, ':edt' => $canEdit, ':roa' => $canReadonlyAll, ':prv' => $canPreview, ':id' => $gid]);
    }

    // Rebuild permissions
    $db->prepare(q("DELETE FROM {group_permissions} WHERE group_id = :id"))->execute([':id' => $gid]);
    if (!empty($perms)) {
        $ins = $db->prepare(q("INSERT INTO {group_permissions} (group_id, section) VALUES (:gid, :sec)"));
        foreach ($perms as $sec) {
            $ins->execute([':gid' => $gid, ':sec' => $sec]);
        }
    }

    flash($isNew ? 'Group created.' : 'Group updated.');
    redirect(BASE_URL . '/admin/groups');
}

// form defaults
$fName        = $group['name']         ?? '';
$fColor       = $group['color']        ?? '#6b7280';
$fIcon        = $group['icon']         ?? '';
$fCanAccessAdmin = (bool)($group['can_access_admin'] ?? 0);
$fCanDelete     = (bool)($group['can_delete']        ?? 1);
$fCanPublish    = (bool)($group['can_publish']       ?? 0);
$fCanCreate     = (bool)($group['can_create']        ?? 1);
$fCanEdit         = (bool)($group['can_edit']          ?? 1);
$fCanReadonlyAll  = (bool)($group['can_readonly_all']  ?? 0);
$fCanPreview      = (bool)($group['can_preview']       ?? 0);
$fSections    = $groupSections;
?>

<div class="admin-header-bar">
    <h1>
        <i class="fa-solid fa-layer-group me-2"></i>
        <?= $isNew ? 'New group' : 'Edit group: <strong>' . h($fName) . '</strong>' ?>
    </h1>
    <a href="<?= BASE_URL ?>/admin/groups" class="btn btn-outline-secondary btn-sm">
        <i class="fa-solid fa-arrow-left me-1"></i> Back
    </a>
</div>

<div class="card-altered p-4" style="max-width:600px">
    <form method="post">
        <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">

        <div class="mb-3">
            <label class="form-label fw-semibold">Name</label>
            <input type="text" name="name" class="form-control" required
                   value="<?= h($fName) ?>" maxlength="100" placeholder="e.g. Editors">
        </div>

        <div class="mb-3">
            <label class="form-label fw-semibold">Badge color</label>
            <div class="d-flex align-items-center gap-3">
                <input type="color" name="color" class="form-control form-control-color"
                       value="<?= h($fColor) ?>" style="width:60px;height:36px" id="groupColor">
                <span id="groupColorPreview" class="badge" style="background:<?= h($fColor) ?>;color:#fff;font-size:.85rem;padding:4px 14px;border-radius:20px">
                    <?php if ($fIcon !== ''): ?>
                    <i class="<?= h($fIcon) ?>"></i>
                    <?php else: ?>
                    <?= $fName !== '' ? h($fName) : 'Preview' ?>
                    <?php endif; ?>
                </span>
            </div>
        </div>

        <div class="mb-3">
            <label class="form-label fw-semibold">Icon <small class="text-muted fw-normal ms-1">— classe Font Awesome (ex: <code>fa-solid fa-crown</code>)</small></label>
            <div class="input-group">
                <span class="input-group-text"><i id="groupIconPreview" class="<?= h($fIcon) ?>"></i></span>
                <input type="text" name="icon" id="groupIcon" class="form-control"
                       value="<?= h($fIcon) ?>" placeholder="fa-solid fa-crown" maxlength="100">
            </div>
            <div class="form-text">Laissez vide pour afficher le nom dans la pillule.</div>
        </div>

        <div id="adminAccessBlock" class="mb-1">
            <div class="form-check">
                <input type="checkbox" name="can_access_admin" id="canAccessAdmin" class="form-check-input"
                       value="1" <?= $fCanAccessAdmin ? 'checked' : '' ?>>
                <label for="canAccessAdmin" class="form-check-label fw-semibold">
                    Can access admin
                    <small class="text-muted fw-normal ms-1">— allow this group to log in to the admin panel</small>
                </label>
            </div>
        </div>

        <div id="canDeleteBlock" class="mb-1 ms-3" <?= !$fCanAccessAdmin ? 'style="display:none"' : '' ?>>
            <div class="form-check">
                <input type="checkbox" name="can_delete" id="canDelete" class="form-check-input"
                       value="1" <?= $fCanDelete ? 'checked' : '' ?>>
                <label for="canDelete" class="form-check-label fw-semibold">
                    Can delete
                    <small class="text-muted fw-normal ms-1">— allow this group to delete records across all admin sections</small>
                </label>
            </div>
        </div>

        <div id="canPublishBlock" class="mb-1 ms-3" <?= !$fCanAccessAdmin ? 'style="display:none"' : '' ?>>
            <div class="form-check">
                <input type="checkbox" name="can_publish" id="canPublish" class="form-check-input"
                       value="1" <?= $fCanPublish ? 'checked' : '' ?>>
                <label for="canPublish" class="form-check-label fw-semibold">
                    Can publish
                    <small class="text-muted fw-normal ms-1">— content created by this group is published immediately; without this, new news/projects/community builders/pages require approval</small>
                </label>
            </div>
        </div>

        <div id="canCreateBlock" class="mb-1 ms-3" <?= !$fCanAccessAdmin ? 'style="display:none"' : '' ?>>
            <div class="form-check">
                <input type="checkbox" name="can_create" id="canCreate" class="form-check-input"
                       value="1" <?= $fCanCreate ? 'checked' : '' ?>>
                <label for="canCreate" class="form-check-label fw-semibold">
                    Can create
                    <small class="text-muted fw-normal ms-1">— allow this group to add new content (news, projects, pages, etc.)</small>
                </label>
            </div>
        </div>

        <div id="canEditBlock" class="mb-1 ms-3" <?= !$fCanAccessAdmin ? 'style="display:none"' : '' ?>>
            <div class="form-check">
                <input type="checkbox" name="can_edit" id="canEdit" class="form-check-input"
                       value="1" <?= $fCanEdit ? 'checked' : '' ?>>
                <label for="canEdit" class="form-check-label fw-semibold">
                    Can edit
                    <small class="text-muted fw-normal ms-1">— allow this group to modify existing content</small>
                </label>
            </div>
        </div>

        <div id="canReadonlyAllBlock" class="mb-1 ms-3" <?= !$fCanAccessAdmin ? 'style="display:none"' : '' ?>>
            <div class="form-check">
                <input type="checkbox" name="can_readonly_all" id="canReadonlyAll" class="form-check-input"
                       value="1" <?= $fCanReadonlyAll ? 'checked' : '' ?>>
                <label for="canReadonlyAll" class="form-check-label fw-semibold">
                    Can view all
                    <small class="text-muted fw-normal ms-1">— read-only access to all sections not explicitly granted</small>
                </label>
            </div>
        </div>

        <div id="canPreviewBlock" class="mb-3 ms-3" <?= !$fCanAccessAdmin ? 'style="display:none"' : '' ?>>
            <div class="form-check">
                <input type="checkbox" name="can_preview" id="canPreview" class="form-check-input"
                       value="1" <?= $fCanPreview ? 'checked' : '' ?>>
                <label for="canPreview" class="form-check-label fw-semibold">
                    Can preview groups
                    <small class="text-muted fw-normal ms-1">— allows using the "View as" dropdown to preview the admin panel as another group</small>
                </label>
            </div>
        </div>

        <div id="sectionsBlock" class="mb-4">
            <label class="form-label fw-semibold">Admin sections</label>
            <div class="d-flex flex-column gap-1">
                <?php foreach ($visibleSections as $key => $label): ?>
                <div class="form-check mb-0">
                    <input type="checkbox" name="sections[]" id="sec_<?= h($key) ?>"
                           class="form-check-input" value="<?= h($key) ?>"
                           <?= in_array($key, $fSections, true) ? 'checked' : '' ?>>
                    <label for="sec_<?= h($key) ?>" class="form-check-label"><?= h($label) ?></label>
                </div>
                <?php endforeach; ?>
            </div>
        </div>

        <?php if (!empty($pluginSectionsGrouped)): ?>
        <div id="pluginSectionsBlock" class="mb-4" <?= !$fCanAccessAdmin ? 'style="display:none"' : '' ?>>
            <label class="form-label fw-semibold">Plugin admin sections</label>
            <?php foreach ($pluginSectionsGrouped as $_pid => $_pg): ?>
            <div class="mb-2">
                <div class="small text-muted mb-1" style="font-size:.8rem;letter-spacing:.02em">
                    <i class="<?= h($_pg['icon']) ?> me-1"></i>
                    <strong><?= h($_pg['name']) ?></strong>
                </div>
                <div class="d-flex flex-column gap-1 ms-3">
                    <?php foreach ($_pg['sections'] as $_ps): ?>
                    <div class="form-check mb-0">
                        <input type="checkbox" name="sections[]" id="sec_<?= h($_ps['section']) ?>"
                               class="form-check-input" value="<?= h($_ps['section']) ?>"
                               <?= in_array($_ps['section'], $fSections, true) ? 'checked' : '' ?>>
                        <label for="sec_<?= h($_ps['section']) ?>" class="form-check-label">
                            <?= h($_ps['label_en'] ?? $_ps['section']) ?>
                        </label>
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
        <?php endif; ?>

        <div class="d-flex gap-2">
            <button type="submit" class="btn btn-sm btn-primary-altered">
                <i class="fa-solid fa-floppy-disk me-1"></i>
                <?= $isNew ? 'Create group' : 'Save changes' ?>
            </button>
            <a href="<?= BASE_URL ?>/admin/groups" class="btn btn-sm btn-outline-secondary">Cancel</a>
        </div>
    </form>
</div>

<script>
(function () {
    var colorInput    = document.getElementById('groupColor');
    var nameInput     = document.querySelector('input[name="name"]');
    var iconInput     = document.getElementById('groupIcon');
    var preview       = document.getElementById('groupColorPreview');
    var iconPreview   = document.getElementById('groupIconPreview');
    var sectionsBlock = document.getElementById('sectionsBlock');

    function updatePreview() {
        var ic = iconInput.value.trim();
        preview.style.background = colorInput.value;
        if (ic) {
            preview.innerHTML = '<i class="' + ic + '"></i>';
            iconPreview.className = ic;
        } else {
            preview.textContent = nameInput.value.trim() || 'Preview';
            iconPreview.className = '';
        }
    }

    colorInput.addEventListener('input', updatePreview);
    nameInput.addEventListener('input', updatePreview);
    iconInput.addEventListener('input', updatePreview);

    var adminAccessBlock    = document.getElementById('adminAccessBlock');
    var canDeleteBlock      = document.getElementById('canDeleteBlock');
    var canPublishBlock     = document.getElementById('canPublishBlock');
    var canCreateBlock      = document.getElementById('canCreateBlock');
    var canEditBlock        = document.getElementById('canEditBlock');
    var canReadonlyAllBlock = document.getElementById('canReadonlyAllBlock');
    var canPreviewBlock     = document.getElementById('canPreviewBlock');
    var pluginSectionsBlock = document.getElementById('pluginSectionsBlock');
    var canAccessCheck      = document.getElementById('canAccessAdmin');

    function updateBlocks() {
        var hide = !canAccessCheck.checked ? 'none' : '';
        canDeleteBlock.style.display        = hide;
        canPublishBlock.style.display       = hide;
        canCreateBlock.style.display        = hide;
        canEditBlock.style.display          = hide;
        canReadonlyAllBlock.style.display   = hide;
        canPreviewBlock.style.display       = hide;
        sectionsBlock.style.display         = hide;
        if (pluginSectionsBlock) pluginSectionsBlock.style.display = hide;
    }

    canAccessCheck.addEventListener('change', updateBlocks);

})();
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
