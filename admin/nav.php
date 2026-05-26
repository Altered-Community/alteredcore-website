<?php
$adminPageTitle = 'Navigation';
$adminSection   = 'nav';
require_once __DIR__ . '/includes/header.php';

$db = getDB();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        // ignore invalid token
    } else {
        $action = $_POST['action'] ?? '';
        $lid    = (int)($_POST['item_id'] ?? 0);

        if ($action === 'delete') {
            if (!adminCanDelete()) {
                flash('You do not have permission to delete.', 'error');
                redirect(BASE_URL . '/admin/nav');
            }
            if ($lid) {
                $check = $db->prepare(q("SELECT is_sidebar_toggle FROM {nav_items} WHERE id = :id"));
                $check->execute([':id' => $lid]);
                $chRow = $check->fetch();
                if ($chRow && !empty($chRow['is_sidebar_toggle'])) {
                    flash('The sidebar button cannot be deleted. Manage it from the Sidebar admin page.', 'error');
                    redirect(BASE_URL . '/admin/nav');
                }
                $db->prepare(q("DELETE FROM {nav_items} WHERE id = :id"))->execute([':id' => $lid]);
            }
            flash('Item deleted.');
            redirect(BASE_URL . '/admin/nav');
        }

        if ($action === 'toggle') {
            if (!adminCanPublish()) { flash('You do not have permission.', 'error'); redirect(BASE_URL . '/admin/nav'); }
            if ($lid) {
                $db->prepare(q("UPDATE {nav_items} SET is_visible = 1 - is_visible WHERE id = :id"))->execute([':id' => $lid]);
            }
            redirect(BASE_URL . '/admin/nav');
        }

        if ($action === 'move_up' || $action === 'move_down') {
            if (!adminCanEdit()) { flash('You do not have permission.', 'error'); redirect(BASE_URL . '/admin/nav'); }
            if ($lid) {
                $navList = $db->query(q("SELECT id, sort_order FROM {nav_items} ORDER BY sort_order, id"))->fetchAll();
                $ids     = array_column($navList, 'id');
                $pos     = array_search($lid, $ids);
                if ($pos !== false) {
                    $swapPos = $action === 'move_up' ? $pos - 1 : $pos + 1;
                    if (isset($ids[$swapPos])) {
                        $swapId = $ids[$swapPos];
                        $sortA  = $navList[$pos]['sort_order'];
                        $sortB  = $navList[$swapPos]['sort_order'];
                        if ($sortA === $sortB) { $sortA = $pos * 10; $sortB = $swapPos * 10; }
                        $db->prepare(q("UPDATE {nav_items} SET sort_order = :s WHERE id = :id"))->execute([':s' => $sortB, ':id' => $lid]);
                        $db->prepare(q("UPDATE {nav_items} SET sort_order = :s WHERE id = :id"))->execute([':s' => $sortA, ':id' => $swapId]);
                    }
                }
            }
            redirect(BASE_URL . '/admin/nav');
        }
    }
}

$items = $db->query(q("SELECT * FROM {nav_items} ORDER BY sort_order, id"))->fetchAll();
$total = count($items);
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-bars me-2"></i>Navigation</h1>
    <?php if (adminCanCreate()): ?>
    <a href="<?= BASE_URL ?>/admin/nav-edit" class="btn btn-primary-altered btn-sm">
        <i class="fa-solid fa-plus me-1"></i> Add item
    </a>
    <?php endif; ?>
</div>

<?php if (empty($items)): ?>
    <p class="text-muted">No navigation items.</p>
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
                <td><i class="<?= h($item['icon']) ?>"></i></td>
                <td>
                    <?= h($item['label_en']) ?>
                    <?php if (!empty($item['is_sidebar_toggle'])): ?>
                        <span class="badge bg-secondary ms-1" style="font-size:.7rem">Sidebar</span>
                    <?php endif; ?>
                </td>
                <td><?= h($item['label_fr']) ?></td>
                <td class="text-muted small"><?= h($item['url']) ?></td>
                <td class="text-end" style="white-space:nowrap">
                    <!-- Toggle visible -->
                    <?php if (adminCanPublish()): ?>
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
                    <!-- Move up -->
                    <?php if (adminCanEdit()): ?>
                    <form method="post" class="d-inline">
                        <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                        <input type="hidden" name="action" value="move_up">
                        <input type="hidden" name="item_id" value="<?= $item['id'] ?>">
                        <button type="submit" class="btn btn-outline-secondary btn-sm" <?= $i === 0 ? 'disabled' : '' ?> title="Move up">
                            <i class="fa-solid fa-chevron-up"></i>
                        </button>
                    </form>
                    <!-- Move down -->
                    <form method="post" class="d-inline">
                        <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                        <input type="hidden" name="action" value="move_down">
                        <input type="hidden" name="item_id" value="<?= $item['id'] ?>">
                        <button type="submit" class="btn btn-outline-secondary btn-sm" <?= $i === $total - 1 ? 'disabled' : '' ?> title="Move down">
                            <i class="fa-solid fa-chevron-down"></i>
                        </button>
                    </form>
                    <!-- Edit -->
                    <a href="<?= BASE_URL ?>/admin/nav-edit?id=<?= $item['id'] ?>"
                       class="btn btn-outline-primary btn-sm" title="Edit">
                        <i class="fa-solid fa-pen"></i>
                    </a>
                    <?php endif; ?>
                    <!-- Delete (not allowed for sidebar toggle button) -->
                    <?php if (adminCanDelete() && empty($item['is_sidebar_toggle'])): ?>
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
