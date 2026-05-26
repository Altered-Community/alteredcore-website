<?php
$adminPageTitle = 'Sidebar';
$adminSection   = 'sidebar';
require_once __DIR__ . '/includes/header.php';

$db = getDB();

// Auto-seed sidebar nav button if none exists
$hasSidebarBtn = (int)$db->query(q("SELECT COUNT(*) FROM {nav_items} WHERE is_sidebar_toggle = 1"))->fetchColumn();
if (!$hasSidebarBtn) {
    $db->prepare(q(
        "INSERT INTO {nav_items} (label_en, label_fr, url, icon, sort_order, is_visible, is_sidebar_toggle)
         VALUES ('Menu', 'Menu', '#', 'fa-solid fa-bars-staggered', 999, 1, 1)"
    ))->execute();
    flash('Sidebar nav button created in Navigation. You can reposition or rename it from the Navigation admin page.');
}

// pOST actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        flash('Invalid token.', 'error');
        redirect(BASE_URL . '/admin/sidebar');
    }

    $action = $_POST['action'] ?? '';
    $lid    = (int)($_POST['item_id'] ?? 0);

    if ($action === 'save_config') {
        if (!adminCanEdit()) { flash('Permission denied.', 'error'); redirect(BASE_URL . '/admin/sidebar'); }
        $side = in_array($_POST['sidebar_side'] ?? '', ['left', 'right']) ? $_POST['sidebar_side'] : 'left';
        saveSetting('sidebar_side', $side);
        $btnPos = in_array($_POST['sidebar_btn_position'] ?? '', ['nav', 'brand']) ? $_POST['sidebar_btn_position'] : 'nav';
        saveSetting('sidebar_btn_position', $btnPos);
        flash('Configuration saved.');
        redirect(BASE_URL . '/admin/sidebar');
    }

    if ($action === 'delete') {
        if (!adminCanDelete()) { flash('Permission denied.', 'error'); redirect(BASE_URL . '/admin/sidebar'); }
        if ($lid) {
            $db->prepare(q("DELETE FROM {sidebar_items} WHERE id = :id"))->execute([':id' => $lid]);
        }
        flash('Item deleted.');
        redirect(BASE_URL . '/admin/sidebar');
    }

    if ($action === 'toggle') {
        if (!adminCanPublish()) { flash('Permission denied.', 'error'); redirect(BASE_URL . '/admin/sidebar'); }
        if ($lid) {
            $db->prepare(q("UPDATE {sidebar_items} SET is_visible = 1 - is_visible WHERE id = :id"))->execute([':id' => $lid]);
        }
        redirect(BASE_URL . '/admin/sidebar');
    }

    if ($action === 'move_up' || $action === 'move_down') {
        if (!adminCanEdit()) { flash('Permission denied.', 'error'); redirect(BASE_URL . '/admin/sidebar'); }
        if ($lid) {
            $list = $db->query(q("SELECT id, sort_order FROM {sidebar_items} ORDER BY sort_order, id"))->fetchAll();
            $ids  = array_column($list, 'id');
            $pos  = array_search($lid, $ids);
            if ($pos !== false) {
                $swapPos = $action === 'move_up' ? $pos - 1 : $pos + 1;
                if (isset($ids[$swapPos])) {
                    $swapId = $ids[$swapPos];
                    $sortA  = $list[$pos]['sort_order'];
                    $sortB  = $list[$swapPos]['sort_order'];
                    if ($sortA === $sortB) { $sortA = $pos * 10; $sortB = $swapPos * 10; }
                    $db->prepare(q("UPDATE {sidebar_items} SET sort_order = :s WHERE id = :id"))->execute([':s' => $sortB, ':id' => $lid]);
                    $db->prepare(q("UPDATE {sidebar_items} SET sort_order = :s WHERE id = :id"))->execute([':s' => $sortA, ':id' => $swapId]);
                }
            }
        }
        redirect(BASE_URL . '/admin/sidebar');
    }
}

$items          = $db->query(q("SELECT * FROM {sidebar_items} ORDER BY sort_order, id"))->fetchAll();
$total          = count($items);
$sidebarSide    = getSetting('sidebar_side', 'left');
$sidebarBtnPos  = getSetting('sidebar_btn_position', 'nav');
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-table-columns me-2"></i>Sidebar</h1>
    <?php if (adminCanCreate()): ?>
    <a href="<?= BASE_URL ?>/admin/sidebar-edit" class="btn btn-primary-altered btn-sm">
        <i class="fa-solid fa-plus me-1"></i> Add item
    </a>
    <?php endif; ?>
</div>

<!-- Config block -->
<?php if (adminCanEdit()): ?>
<div class="card-altered p-3 mb-4" style="max-width:480px">
    <h2 class="h6 mb-3"><i class="fa-solid fa-gear me-1"></i> Configuration</h2>
    <form method="post">
        <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
        <input type="hidden" name="action" value="save_config">
        <div class="row g-3">
            <div class="col-12">
                <label class="form-label fw-semibold mb-1">Slide in from</label>
                <div class="d-flex gap-3">
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="sidebar_side" id="side_left" value="left"
                               <?= $sidebarSide === 'left' ? 'checked' : '' ?>>
                        <label class="form-check-label" for="side_left">
                            <i class="fa-solid fa-arrow-left me-1"></i> Left
                        </label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="sidebar_side" id="side_right" value="right"
                               <?= $sidebarSide === 'right' ? 'checked' : '' ?>>
                        <label class="form-check-label" for="side_right">
                            <i class="fa-solid fa-arrow-right me-1"></i> Right
                        </label>
                    </div>
                </div>
            </div>
            <div class="col-12">
                <label class="form-label fw-semibold mb-1">Button placement</label>
                <div class="d-flex gap-3">
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="sidebar_btn_position" id="pos_nav" value="nav"
                               <?= $sidebarBtnPos === 'nav' ? 'checked' : '' ?>>
                        <label class="form-check-label" for="pos_nav">
                            <i class="fa-solid fa-bars me-1"></i> Navigation menu
                        </label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="sidebar_btn_position" id="pos_brand" value="brand"
                               <?= $sidebarBtnPos === 'brand' ? 'checked' : '' ?>>
                        <label class="form-check-label" for="pos_brand">
                            <i class="fa-solid fa-house me-1"></i> Next to site name
                        </label>
                    </div>
                </div>
            </div>
            <div class="col-12">
                <button type="submit" class="btn btn-sm btn-primary-altered">
                    <i class="fa-solid fa-floppy-disk me-1"></i> Save
                </button>
            </div>
        </div>
    </form>
    <p class="text-muted small mt-2 mb-0">
        The sidebar nav button is managed in
        <a href="<?= BASE_URL ?>/admin/nav">Navigation</a>
        (icon, label, position, visibility).
    </p>
</div>
<?php endif; ?>

<!-- Item list -->
<?php if (empty($items)): ?>
    <p class="text-muted">No sidebar items. <a href="<?= BASE_URL ?>/admin/sidebar-edit">Add one</a>.</p>
<?php else: ?>
<div class="card-altered">
    <div class="table-responsive">
    <table class="table table-hover table-altered mb-0">
        <thead>
            <tr>
                <th>Icon</th>
                <th>Label EN</th>
                <th>Label FR</th>
                <th>URL</th>
                <th class="text-end">Actions</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($items as $i => $item): ?>
            <tr class="<?= $item['is_visible'] ? '' : 'opacity-50' ?>">
                <td>
                    <?php if (!empty($item['is_separator']) || !empty($item['is_section_header'])): ?>
                        <span class="text-muted">—</span>
                    <?php elseif (!empty($item['icon'])): ?>
                        <i class="<?= h($item['icon']) ?>"></i>
                    <?php endif; ?>
                </td>
                <td>
                    <?php if (!empty($item['is_separator'])): ?>
                        <span class="text-muted fst-italic">— separator —</span>
                    <?php elseif (!empty($item['is_section_header'])): ?>
                        <span class="text-muted fst-italic">— section: </span><?= h($item['label_en']) ?>
                    <?php else: ?>
                        <?= h($item['label_en']) ?>
                    <?php endif; ?>
                </td>
                <td class="text-muted small"><?= (!empty($item['is_separator']) || !empty($item['is_section_header'])) ? '' : h($item['label_fr']) ?></td>
                <td class="text-muted small"><?= (!empty($item['is_separator']) || !empty($item['is_section_header'])) ? '' : h($item['url']) ?></td>
                <td class="text-end" style="white-space:nowrap">
                    <?php if (adminCanPublish() && empty($item['is_separator'])): ?>
                    <form method="post" class="d-inline">
                        <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                        <input type="hidden" name="action" value="toggle">
                        <input type="hidden" name="item_id" value="<?= $item['id'] ?>">
                        <button type="submit" class="btn btn-sm <?= $item['is_visible'] ? 'btn-outline-secondary' : 'btn-outline-warning' ?>"
                                title="<?= $item['is_visible'] ? 'Hide' : 'Show' ?>">
                            <i class="fa-solid <?= $item['is_visible'] ? 'fa-eye' : 'fa-eye-slash' ?>"></i>
                        </button>
                    </form>
                    <?php endif; ?>
                    <?php if (adminCanEdit()): ?>
                    <form method="post" class="d-inline">
                        <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                        <input type="hidden" name="action" value="move_up">
                        <input type="hidden" name="item_id" value="<?= $item['id'] ?>">
                        <button type="submit" class="btn btn-outline-secondary btn-sm" <?= $i === 0 ? 'disabled' : '' ?> title="Move up">
                            <i class="fa-solid fa-chevron-up"></i>
                        </button>
                    </form>
                    <form method="post" class="d-inline">
                        <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                        <input type="hidden" name="action" value="move_down">
                        <input type="hidden" name="item_id" value="<?= $item['id'] ?>">
                        <button type="submit" class="btn btn-outline-secondary btn-sm" <?= $i === $total - 1 ? 'disabled' : '' ?> title="Move down">
                            <i class="fa-solid fa-chevron-down"></i>
                        </button>
                    </form>
                    <a href="<?= BASE_URL ?>/admin/sidebar-edit?id=<?= $item['id'] ?>"
                       class="btn btn-outline-primary btn-sm" title="Edit">
                        <i class="fa-solid fa-pen"></i>
                    </a>
                    <?php endif; ?>
                    <?php if (adminCanDelete()): ?>
                    <form method="post" class="d-inline" onsubmit="return confirm('Delete this item?')">
                        <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                        <input type="hidden" name="action" value="delete">
                        <input type="hidden" name="item_id" value="<?= $item['id'] ?>">
                        <button type="submit" class="btn btn-outline-danger btn-sm">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </form>
                    <?php endif; ?>
                </td>
            </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
    </div>
</div>
<?php endif; ?>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
