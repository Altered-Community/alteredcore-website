<?php
$adminPageTitle = 'Announcements';
$adminSection   = 'announcement';
require_once __DIR__ . '/includes/header.php';

$db = getDB();

// quick-action handlers
if ($_SERVER['REQUEST_METHOD'] === 'POST' && csrfValid($_POST['csrf_token'] ?? '')) {
    $aid = (int)($_POST['id'] ?? 0);
    if ($aid) {
        if (isset($_POST['toggle_active'])) {
            if (!adminCanPublish()) { flash('You do not have permission.', 'error'); redirect(BASE_URL . '/admin/announcements'); }
            $row = $db->prepare(q("SELECT is_active FROM {announcements} WHERE id = :id"));
            $row->execute([':id' => $aid]);
            $current = (int)($row->fetchColumn());
            if ($current) {
                // Deactivate this one
                $db->prepare(q("UPDATE {announcements} SET is_active = 0 WHERE id = :id"))
                   ->execute([':id' => $aid]);
            } else {
                // Deactivate all, then activate this one
                $db->exec(q("UPDATE {announcements} SET is_active = 0"));
                $db->prepare(q("UPDATE {announcements} SET is_active = 1 WHERE id = :id"))
                   ->execute([':id' => $aid]);
            }
        } elseif (isset($_POST['delete'])) {
            if (!adminCanDelete()) {
                flash('You do not have permission to delete.', 'error');
                redirect(BASE_URL . '/admin/announcements');
            }
            $db->prepare(q("DELETE FROM {announcements} WHERE id = :id"))->execute([':id' => $aid]);
            flash('Announcement deleted.');
        }
    }
    redirect(BASE_URL . '/admin/announcements');
}

$rows = $db->query(q(
    "SELECT id, title_en, title_fr, color, icon, is_active, sort_order, created_at
     FROM {announcements}
     ORDER BY sort_order ASC, created_at DESC"
))->fetchAll();
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-bullhorn me-2"></i>Announcements</h1>
    <?php if (adminCanCreate()): ?>
    <a href="<?= BASE_URL ?>/admin/announcement-edit" class="btn btn-sm btn-primary-altered">
        <i class="fa-solid fa-plus me-1"></i> Add announcement
    </a>
    <?php endif; ?>
</div>

<p class="text-muted small mb-3">Only one announcement can be active at a time. Activating one will automatically hide all others.</p>

<div class="card-altered">
    <div class="table-responsive">
        <table class="table table-hover table-altered mb-0">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Title (EN)</th>
                    <th>Color</th>
                    <th>Icon</th>
                    <th>Status</th>
                    <th>Order</th>
                    <th>Date</th>
                    <th class="text-end">Actions</th>
                </tr>
            </thead>
            <tbody>
            <?php if (empty($rows)): ?>
                <tr><td colspan="8" class="text-center text-muted py-4">No announcements yet.</td></tr>
            <?php else: ?>
                <?php foreach ($rows as $row): ?>
                <tr>
                    <td style="width:44px;color:var(--neutral-500);font-size:.85rem"><?= $row['id'] ?></td>
                    <td>
                        <?php $t = h($row['title_en'] ?: $row['title_fr'] ?: '—'); ?>
                        <span><?= $t ?></span>
                    </td>
                    <td>
                        <span class="badge" style="background:var(--bs-<?= h($row['color']) ?>-bg-subtle,#eee);color:var(--bs-<?= h($row['color']) ?>-text-emphasis,#333);border:1px solid var(--bs-<?= h($row['color']) ?>-border-subtle,#ccc)">
                            <?= h($row['color']) ?>
                        </span>
                    </td>
                    <td style="font-size:.9rem"><i class="<?= h($row['icon']) ?>"></i></td>
                    <td>
                        <?php if ($row['is_active']): ?>
                            <span class="badge bg-success">Active</span>
                        <?php else: ?>
                            <span class="badge bg-secondary">Inactive</span>
                        <?php endif; ?>
                    </td>
                    <td style="font-size:.85rem;text-align:center"><?= (int)$row['sort_order'] ?></td>
                    <td style="white-space:nowrap;font-size:.85rem"><?= date('d/m/Y', strtotime($row['created_at'])) ?></td>
                    <td class="text-end" style="white-space:nowrap">
                        <!-- Toggle active -->
                        <?php if (adminCanPublish()): ?>
                        <form method="post" class="d-inline">
                            <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                            <input type="hidden" name="id" value="<?= $row['id'] ?>">
                            <button type="submit" name="toggle_active"
                                    class="btn btn-sm <?= $row['is_active'] ? 'btn-warning' : 'btn-outline-success' ?>"
                                    title="<?= $row['is_active'] ? 'Deactivate' : 'Activate' ?>">
                                <i class="fa-solid <?= $row['is_active'] ? 'fa-eye-slash' : 'fa-eye' ?>"></i>
                                <?= $row['is_active'] ? 'Deactivate' : 'Activate' ?>
                            </button>
                        </form>
                        <?php endif; ?>
                        <!-- Edit -->
                        <?php if (adminCanEdit()): ?>
                        <a href="<?= BASE_URL ?>/admin/announcement-edit?id=<?= $row['id'] ?>"
                           class="btn btn-sm btn-outline-primary" title="Edit">
                            <i class="fa-solid fa-pen"></i>
                        </a>
                        <?php endif; ?>
                        <!-- Delete -->
                        <?php if (adminCanDelete()): ?>
                        <form method="post" class="d-inline">
                            <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                            <input type="hidden" name="id" value="<?= $row['id'] ?>">
                            <button type="submit" name="delete" class="btn btn-sm btn-outline-danger" title="Delete"
                                    onclick="return confirm('Delete this announcement?')">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </form>
                        <?php endif; ?>
                    </td>
                </tr>
                <?php endforeach; ?>
            <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
