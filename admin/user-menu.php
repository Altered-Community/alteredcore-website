<?php
$adminPageTitle = 'User Menu';
$adminSection   = 'user-menu';
require_once __DIR__ . '/includes/header.php';

$db = getDB();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        flash('Invalid token.', 'error');
        redirect(BASE_URL . '/admin/user-menu');
    }

    $action = $_POST['action'] ?? '';
    $mid    = (int)($_POST['item_id'] ?? 0);

    if ($action === 'delete' && $mid) {
        if (!adminCanDelete()) {
            flash('You do not have permission to delete.', 'error');
            redirect(BASE_URL . '/admin/user-menu');
        }
        // Only delete non-system items
        $db->prepare(q("DELETE FROM {user_menu_items} WHERE id = :id AND type != 'system'"))->execute([':id' => $mid]);
        flash('Item deleted.');
        redirect(BASE_URL . '/admin/user-menu');
    }

    if (($action === 'move_up' || $action === 'move_down') && $mid) {
        $items = $db->query(q("SELECT id, sort_order FROM {user_menu_items} ORDER BY sort_order, id"))->fetchAll();
        $ids   = array_column($items, 'id');
        $pos   = array_search($mid, $ids);
        if ($pos !== false) {
            $swapPos = $action === 'move_up' ? $pos - 1 : $pos + 1;
            if (isset($ids[$swapPos])) {
                $swapId  = $ids[$swapPos];
                $sortA   = $items[$pos]['sort_order'];
                $sortB   = $items[$swapPos]['sort_order'];
                if ($sortA === $sortB) { $sortA = $pos * 10; $sortB = $swapPos * 10; }
                $db->prepare(q("UPDATE {user_menu_items} SET sort_order = :s WHERE id = :id"))->execute([':s' => $sortB, ':id' => $mid]);
                $db->prepare(q("UPDATE {user_menu_items} SET sort_order = :s WHERE id = :id"))->execute([':s' => $sortA, ':id' => $swapId]);
            }
        }
        redirect(BASE_URL . '/admin/user-menu');
    }

    if ($action === 'add_separator') {
        $max = (int)$db->query(q("SELECT MAX(sort_order) FROM {user_menu_items}"))->fetchColumn();
        $db->prepare(q("INSERT INTO {user_menu_items} (type, sort_order) VALUES ('separator', :s)"))->execute([':s' => $max + 10]);
        flash('Separator added.');
        redirect(BASE_URL . '/admin/user-menu');
    }

    if ($action === 'toggle_visible' && $mid) {
        $db->prepare(q("UPDATE {user_menu_items} SET is_visible = 1 - is_visible WHERE id = :id"))->execute([':id' => $mid]);
        redirect(BASE_URL . '/admin/user-menu');
    }
}

$items = $db->query(q("SELECT * FROM {user_menu_items} ORDER BY sort_order, id"))->fetchAll();
// Graceful fallback if is_visible column not yet migrated on live DB
foreach ($items as &$_it) { if (!array_key_exists('is_visible', $_it)) $_it['is_visible'] = 1; }
unset($_it);
$total = count($items);
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-user-gear me-2"></i>User Menu</h1>
    <div class="d-flex gap-2">
        <form method="post" class="d-inline">
            <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
            <input type="hidden" name="action" value="add_separator">
            <button type="submit" class="btn btn-outline-secondary btn-sm">
                <i class="fa-solid fa-minus me-1"></i> Add separator
            </button>
        </form>
        <a href="<?= BASE_URL ?>/admin/user-menu-edit" class="btn btn-primary-altered btn-sm">
            <i class="fa-solid fa-plus me-1"></i> Add link
        </a>
    </div>
</div>

<p class="text-muted small mb-3">
    <i class="fa-solid fa-lock me-1"></i> System items <span class="badge bg-secondary">system</span> can be reordered and hidden, but not deleted or renamed.
</p>

<div class="card-altered">
    <?php if (empty($items)): ?>
        <p class="text-muted p-3 mb-0">No items.</p>
    <?php else: ?>
    <div class="table-responsive">
    <table class="table table-hover table-altered mb-0">
        <thead>
            <tr>
                <th style="width:40px">Order</th>
                <th>Type</th>
                <th>Preview</th>
                <th class="text-end">Actions</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($items as $i => $item): ?>
            <tr<?= !$item['is_visible'] ? ' style="opacity:.45"' : '' ?>>
                <td class="text-muted small"><?= (int)$item['sort_order'] ?></td>
                <td>
                    <?php if ($item['type'] === 'system'): ?>
                        <span class="badge bg-secondary">system</span>
                        <code class="small ms-1"><?= h($item['system_key']) ?></code>
                    <?php elseif ($item['type'] === 'separator'): ?>
                        <span class="badge bg-light text-dark border">separator</span>
                    <?php else: ?>
                        <span class="badge bg-primary-subtle text-primary-emphasis">link</span>
                    <?php endif; ?>
                </td>
                <td style="font-size:.85rem">
                    <?php if ($item['type'] === 'system' && $item['system_key'] === 'email_display'): ?>
                        <span class="text-muted fst-italic">user@email.com</span>
                    <?php elseif ($item['type'] === 'separator'): ?>
                        <hr class="my-0" style="border-color:var(--neutral-300)">
                    <?php else: ?>
                        <?php if ($item['icon']): ?><i class="<?= h($item['icon']) ?> me-1"></i><?php endif; ?>
                        <?= h($item['label_en'] ?: '—') ?>
                        <?php if ($item['url']): ?>
                            <span class="text-muted ms-1">(<?= h($item['url']) ?>)</span>
                        <?php endif; ?>
                    <?php endif; ?>
                </td>
                <td class="text-end" style="white-space:nowrap">
                    <!-- Toggle -->
                    <form method="post" class="d-inline">
                        <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                        <input type="hidden" name="action" value="toggle_visible">
                        <input type="hidden" name="item_id" value="<?= $item['id'] ?>">
                        <button type="submit" class="btn btn-sm <?= $item['is_visible'] ? 'btn-outline-secondary' : 'btn-outline-warning' ?>"
                                title="<?= $item['is_visible'] ? 'Hide' : 'Show' ?>">
                            <i class="fa-solid <?= $item['is_visible'] ? 'fa-eye' : 'fa-eye-slash' ?>"></i>
                        </button>
                    </form>
                    <!-- Move up -->
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
                    <!-- Edit — link type only, invisible placeholder for others -->
                    <?php if ($item['type'] === 'link'): ?>
                        <a href="<?= BASE_URL ?>/admin/user-menu-edit?id=<?= $item['id'] ?>"
                           class="btn btn-outline-primary btn-sm" title="Edit">
                            <i class="fa-solid fa-pen"></i>
                        </a>
                    <?php else: ?>
                        <span class="btn btn-outline-primary btn-sm invisible" aria-hidden="true"><i class="fa-solid fa-pen"></i></span>
                    <?php endif; ?>
                    <!-- Delete — link + separator only, invisible placeholder for system -->
                    <?php if ($item['type'] !== 'system' && adminCanDelete()): ?>
                        <form method="post" class="d-inline" onsubmit="return confirm('Delete this item?')">
                            <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                            <input type="hidden" name="action" value="delete">
                            <input type="hidden" name="item_id" value="<?= $item['id'] ?>">
                            <button type="submit" class="btn btn-outline-danger btn-sm" title="Delete">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </form>
                    <?php elseif (adminCanDelete()): ?>
                        <span class="btn btn-outline-danger btn-sm invisible" aria-hidden="true"><i class="fa-solid fa-trash"></i></span>
                    <?php endif; ?>
                </td>
            </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
    </div>
    <?php endif; ?>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
