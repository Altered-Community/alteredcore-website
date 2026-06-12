<?php
$adminPageTitle = 'Groups';
$adminSection   = 'groups';
require_once __DIR__ . '/includes/header.php';

$db = getDB();

// actions POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        flash('Invalid token.', 'error');
        redirect(BASE_URL . '/admin/groups');
    }

    $action = $_POST['action'] ?? '';
    $gid    = (int)($_POST['group_id'] ?? 0);

    if ($action === 'delete' && $gid) {
        if (!adminCanDelete()) {
            flash('You do not have permission to delete.', 'error');
            redirect(BASE_URL . '/admin/groups');
        }
        $s = $db->prepare(q("SELECT COUNT(*) FROM {users} WHERE group_id = :id"));
        $s->execute([':id' => $gid]);
        $cnt = (int)$s->fetchColumn();

        if ($cnt > 0) {
            flash("Cannot delete — {$cnt} user(s) still assigned to this group.", 'error');
        } else {
            $db->prepare(q("DELETE FROM {user_groups} WHERE id = :id"))->execute([':id' => $gid]);
            flash('Group deleted.');
        }
        redirect(BASE_URL . '/admin/groups');
    }
}

// fetch groups with section count and user count
$groups = $db->query(q(
    "SELECT g.id, g.name, g.slug, g.color, g.icon, g.can_access_admin, g.can_delete, g.can_readonly_all,
            COUNT(DISTINCT gp.id) AS section_count,
            COUNT(DISTINCT u.id)  AS user_count
     FROM {user_groups} g
     LEFT JOIN {group_permissions} gp ON gp.group_id = g.id
     LEFT JOIN {users} u ON u.group_id = g.id
     GROUP BY g.id
     ORDER BY g.name ASC"
))->fetchAll();
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-layer-group me-2"></i>Groups
        <span class="badge bg-secondary ms-1" style="font-size:.75rem"><?= count($groups) ?></span>
    </h1>
    <a href="<?= BASE_URL ?>/admin/group-edit" class="btn btn-primary-altered btn-sm">
        <i class="fa-solid fa-plus me-1"></i> New group
    </a>
</div>

<div class="card-altered p-3">
    <?php if (empty($groups)): ?>
        <p class="text-muted">No groups yet.</p>
    <?php else: ?>
    <div class="table-responsive">
    <table class="table table-sm mb-0">
        <thead>
            <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Admin access</th>
                <th>Can delete</th>
                <th>Sections</th>
                <th>Users</th>
                <th></th>
            </tr>
        </thead>
        <tbody>
        <?php foreach ($groups as $g): ?>
            <tr>
                <td>
                    <span class="badge" style="background:<?= h($g['color']) ?>;color:#fff;font-size:.78rem;padding:3px 10px;border-radius:20px">
                        <?php if (!empty($g['icon'])): ?>
                        <i class="<?= h($g['icon']) ?> me-1"></i>
                        <?php endif; ?>
                        <?= h($g['name']) ?>
                    </span>
                </td>
                <td class="small text-muted"><?= h($g['slug']) ?></td>
                <td>
                    <?php if ($g['can_access_admin']): ?>
                        <i class="fa-solid fa-check text-success" title="Can access admin"></i>
                    <?php else: ?>
                        <i class="fa-solid fa-xmark text-danger" title="No admin access"></i>
                    <?php endif; ?>
                </td>
                <td>
                    <?php if ($g['can_delete']): ?>
                        <i class="fa-solid fa-check text-success" title="Can delete"></i>
                    <?php else: ?>
                        <i class="fa-solid fa-xmark text-danger" title="Cannot delete"></i>
                    <?php endif; ?>
                </td>
                <td class="small text-muted">
                    <?= (int)$g['section_count'] ?>
                    <?php if ($g['can_readonly_all'] && !empty($_SESSION['admin_logged_in'])): ?>
                        <i class="fa-solid fa-eye ms-1 text-info" title="Can view all (read-only)"></i>
                    <?php endif; ?>
                </td>
                <td class="small text-muted"><?= (int)$g['user_count'] ?></td>
                <td class="text-end">
                    <a href="<?= BASE_URL ?>/admin/group-edit?id=<?= $g['id'] ?>"
                       class="btn btn-outline-primary btn-sm me-1" title="Edit">
                        <i class="fa-solid fa-pen"></i>
                    </a>
                    <?php if (adminCanDelete()): ?>
                    <form method="post" class="d-inline"
                          onsubmit="return confirm('Delete group «<?= h(addslashes($g['name'])) ?>»?\nUsers in this group will have no group assigned.')">
                        <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                        <input type="hidden" name="action" value="delete">
                        <input type="hidden" name="group_id" value="<?= $g['id'] ?>">
                        <button type="submit" class="btn btn-outline-danger btn-sm"
                                <?= (int)$g['user_count'] > 0 ? 'disabled title="Has users — reassign first"' : '' ?>>
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
    <?php endif; ?>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
