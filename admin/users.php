<?php
$adminPageTitle = 'Users';
$adminSection   = 'users';
require_once __DIR__ . '/includes/header.php';

$db = getDB();

// actions POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        flash('Invalid token.', 'error');
        redirect(BASE_URL . '/admin/users');
    }

    $action = $_POST['action'] ?? '';
    $uid    = (int)($_POST['user_id'] ?? 0);

    if ($action === 'delete' && $uid) {
        if (!adminCanDelete()) {
            flash('You do not have permission to delete.', 'error');
            redirect(BASE_URL . '/admin/users');
        }
        if ($uid === (int)($_SESSION['admin_id'] ?? 0)) {
            flash('You cannot delete your own account.', 'error');
        } else {
            $db->prepare(q("DELETE FROM {users} WHERE id = :id"))->execute([':id' => $uid]);
            flash('User deleted.');
        }
        redirect(BASE_URL . '/admin/users' . ($_SERVER['QUERY_STRING'] ? '?' . $_SERVER['QUERY_STRING'] : ''));
    }

    if ($action === 'set_group' && $uid) {
        $newGroup = ($_POST['group_id'] ?? '') !== '' ? (int)$_POST['group_id'] : null;
        $stmt = $db->prepare(q("UPDATE {users} SET group_id = :gid WHERE id = :id"));
        $stmt->execute([':gid' => $newGroup, ':id' => $uid]);
        flash('Group updated.');
        redirect(BASE_URL . '/admin/users');
    }

    if ($action === 'force_logout_all') {
        // Invalidate all KC sessions: clear refresh tokens + set force_logout timestamp
        $db->exec(q("UPDATE {users} SET kc_refresh_token = NULL, kc_token_expiry = 0"));
        saveSetting('kc_force_logout_at', date('Y-m-d H:i:s'));
        flash('All user sessions have been invalidated.');
        redirect(BASE_URL . '/admin/users');
    }
}

// search & pagination
$perPage     = 25;
$page        = max(1, (int)($_GET['page'] ?? 1));
$search      = trim($_GET['q'] ?? '');
$filterGroup = $_GET['group'] ?? '';

$where  = [];
$params = [];

if ($search !== '') {
    $where[]       = "(u.email LIKE :q1 OR u.username LIKE :q2 OR u.admin_username LIKE :q3 OR u.kc_sub LIKE :q4)";
    $qVal          = '%' . $search . '%';
    $params[':q1'] = $qVal;
    $params[':q2'] = $qVal;
    $params[':q3'] = $qVal;
    $params[':q4'] = $qVal;
}

if ($filterGroup === 'none') {
    $where[] = "u.group_id IS NULL";
} elseif ($filterGroup !== '') {
    $where[]           = "u.group_id = :gf";
    $params[':gf']     = (int)$filterGroup;
}

$whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

$countStmt = $db->prepare(q("SELECT COUNT(*) FROM {users} u $whereSql"));
$countStmt->execute($params);
$total  = (int)$countStmt->fetchColumn();
$pages  = max(1, (int)ceil($total / $perPage));
$page   = min($page, $pages);
$offset = ($page - 1) * $perPage;

$stmt = $db->prepare(q(
    "SELECT u.id, u.kc_sub, u.email, u.username, u.admin_username, u.lang_pref, u.created_at,
            g.id AS group_id, g.name AS group_name, g.color AS group_color
     FROM {users} u
     LEFT JOIN {user_groups} g ON g.id = u.group_id
     $whereSql
     ORDER BY u.created_at ASC
     LIMIT :limit OFFSET :offset"
));
foreach ($params as $k => $v) $stmt->bindValue($k, $v);
$stmt->bindValue(':limit',  $perPage, PDO::PARAM_INT);
$stmt->bindValue(':offset', $offset,  PDO::PARAM_INT);
$stmt->execute();
$users = $stmt->fetchAll();

// Load groups for inline assignment dropdown (table may not exist if migration not run)
try {
    $allGroups = $db->query(q("SELECT id, name, color FROM {user_groups} ORDER BY name ASC"))->fetchAll();
} catch (\PDOException $e) {
    $allGroups = [];
}

function usersPageUrl(int $p): string {
    $q = array_filter(['q' => $_GET['q'] ?? '', 'group' => $_GET['group'] ?? '']);
    $q['page'] = $p;
    return '?' . http_build_query($q);
}
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-users me-2"></i>Users <span class="badge bg-secondary ms-1" style="font-size:.75rem"><?= $total ?></span></h1>
    <div class="d-flex gap-2">
        <button type="button" class="btn btn-outline-danger btn-sm" data-bs-toggle="modal" data-bs-target="#forceLogoutModal">
            <i class="fa-solid fa-power-off me-1"></i> Force logout all
        </button>
    </div>
</div>

<!-- Force logout confirmation modal -->
<div class="modal fade" id="forceLogoutModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content" style="border:none;border-radius:1rem;overflow:hidden">
            <div class="modal-header" style="border-bottom:1px solid var(--sand-300)">
                <h5 class="modal-title"><i class="fa-solid fa-power-off text-danger me-2"></i>Force logout — all users</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body" style="background:var(--sand-50)">
                <p>This will <strong>immediately invalidate all active user sessions</strong> and clear stored refresh tokens.</p>
                <p class="mb-0 text-muted small">Users will be redirected to the login page on their next request. Their accounts are <strong>not</strong> deleted.</p>
            </div>
            <div class="modal-footer" style="border-top:1px solid var(--sand-300);background:var(--sand-50)">
                <button type="button" class="btn btn-sm btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                <form method="post" class="d-inline">
                    <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                    <input type="hidden" name="action" value="force_logout_all">
                    <button type="submit" class="btn btn-sm btn-danger">
                        <i class="fa-solid fa-power-off me-1"></i> Yes, log everyone out
                    </button>
                </form>
            </div>
        </div>
    </div>
</div>

<!-- Search bar -->
<form method="get" class="d-flex gap-2 mb-3 flex-wrap">
    <input type="text" name="q" class="form-control" style="max-width:260px"
           placeholder="Email, username or KC sub…" value="<?= h($search) ?>">
    <select name="group" class="form-select form-select-sm" style="max-width:180px">
        <option value="">All groups</option>
        <option value="none" <?= $filterGroup === 'none' ? 'selected' : '' ?>>— No group</option>
        <?php foreach ($allGroups as $grp): ?>
        <option value="<?= $grp['id'] ?>" <?= (string)$filterGroup === (string)$grp['id'] ? 'selected' : '' ?>>
            <?= h($grp['name']) ?>
        </option>
        <?php endforeach; ?>
    </select>
    <button type="submit" class="btn btn-sm btn-outline-secondary">
        <i class="fa-solid fa-magnifying-glass me-1"></i> Search
    </button>
    <?php if ($search !== '' || $filterGroup !== ''): ?>
        <a href="<?= BASE_URL ?>/admin/users" class="btn btn-sm btn-outline-secondary">✕ Reset</a>
    <?php endif; ?>
</form>

<div class="card-altered p-3">
    <?php if (empty($users)): ?>
        <p class="text-muted">No users found.</p>
    <?php else: ?>
    <div class="table-responsive">
    <table class="table table-sm mb-0">
        <thead>
            <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Group</th>
                <th>KC</th>
                <th>Lang</th>
                <th>Created</th>
                <th></th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($users as $u):
                $isSelf = ((int)$u['id'] === (int)($_SESSION['admin_id'] ?? 0));
            ?>
            <tr>
                <td class="fw-semibold">
                    <?php if ($u['username'] !== null && $u['username'] !== ''): ?>
                        <?= h($u['username']) ?>
                    <?php elseif ($u['kc_sub']): ?>
                        <span class="text-muted" title="<?= h($u['kc_sub']) ?>">KC:<?= h(substr($u['kc_sub'], 0, 8)) ?>…</span>
                    <?php else: ?>
                        <span class="text-muted">—</span>
                    <?php endif; ?>
                </td>
                <td class="text-muted small"><?= $u['email'] !== null && $u['email'] !== '' ? h($u['email']) : '—' ?></td>
                <td>
                    <?php if ($u['group_name']): ?>
                        <span class="badge" style="background:<?= h($u['group_color'] ?? '') ?>;color:#fff;font-size:.72rem;padding:2px 8px;border-radius:20px">
                            <?= h($u['group_name']) ?>
                        </span>
                    <?php else: ?>
                        <span class="text-muted small">—</span>
                    <?php endif; ?>
                    <button type="button" class="btn btn-link btn-sm p-0 ms-1 text-muted" style="font-size:.7rem"
                            title="Change group"
                            onclick="toggleGroupForm(this, <?= $u['id'] ?>, <?= $u['group_id'] ?? 'null' ?>)">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <div id="gf-<?= $u['id'] ?>" class="mt-1" style="display:none">
                        <form method="post" class="d-flex gap-1 align-items-center">
                            <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                            <input type="hidden" name="action" value="set_group">
                            <input type="hidden" name="user_id" value="<?= $u['id'] ?>">
                            <select name="group_id" class="form-select form-select-sm" style="max-width:130px">
                                <option value="">— none —</option>
                                <?php foreach ($allGroups as $grp): ?>
                                <option value="<?= $grp['id'] ?>"
                                    <?= (int)$u['group_id'] === (int)$grp['id'] ? 'selected' : '' ?>>
                                    <?= h($grp['name']) ?>
                                </option>
                                <?php endforeach; ?>
                            </select>
                            <button type="submit" class="btn btn-sm btn-primary-altered">OK</button>
                        </form>
                    </div>
                </td>
                <td class="small text-muted"><?= $u['kc_sub'] ? '<i class="fa-solid fa-check text-success"></i>' : '—' ?></td>
                <td class="small text-muted"><?= $u['lang_pref'] ? h(strtoupper($u['lang_pref'])) : 'auto' ?></td>
                <td class="small text-muted"><?= $u['created_at'] ? h(date('d/m/Y', strtotime($u['created_at']))) : '—' ?></td>
                <td class="text-end">
                    <a href="<?= BASE_URL ?>/admin/user-edit?id=<?= $u['id'] ?>"
                       class="btn btn-outline-primary btn-sm me-1" title="Edit">
                        <i class="fa-solid fa-pen"></i>
                    </a>
                    <?php if (!$isSelf): ?>
                    <?php if (adminCanDelete()): ?>
                    <form method="post" class="d-inline"
                          onsubmit="return confirm('Delete this user?')">
                        <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                        <input type="hidden" name="action" value="delete">
                        <input type="hidden" name="user_id" value="<?= $u['id'] ?>">
                        <button type="submit" class="btn btn-outline-danger btn-sm">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </form>
                    <?php endif; ?>
                    <?php else: ?>
                    <span class="text-muted small">(you)</span>
                    <?php endif; ?>
                </td>
            </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
    </div>
    <?php endif; ?>
</div>

<!-- Pagination -->
<?php if ($pages > 1): ?>
<nav class="mt-3 d-flex align-items-center gap-2 flex-wrap">
    <span class="text-muted small"><?= $total ?> user<?= $total > 1 ? 's' : '' ?> — page <?= $page ?>/<?= $pages ?></span>
    <ul class="pagination pagination-sm mb-0 ms-2">
        <li class="page-item <?= $page <= 1 ? 'disabled' : '' ?>">
            <a class="page-link" href="<?= h(usersPageUrl($page - 1)) ?>">‹</a>
        </li>
        <?php for ($p = max(1, $page - 3); $p <= min($pages, $page + 3); $p++): ?>
        <li class="page-item <?= $p === $page ? 'active' : '' ?>">
            <a class="page-link" href="<?= h(usersPageUrl($p)) ?>"><?= $p ?></a>
        </li>
        <?php endfor; ?>
        <li class="page-item <?= $page >= $pages ? 'disabled' : '' ?>">
            <a class="page-link" href="<?= h(usersPageUrl($page + 1)) ?>">›</a>
        </li>
    </ul>
</nav>
<?php endif; ?>

<script>
function toggleGroupForm(btn, uid, currentGroupId) {
    var el = document.getElementById('gf-' + uid);
    el.style.display = el.style.display === 'none' ? '' : 'none';
}
</script>
<?php require_once __DIR__ . '/includes/footer.php'; ?>
