<?php
$adminPageTitle = 'Projects';
$adminSection   = 'projects';
require_once __DIR__ . '/includes/header.php';

$db = getDB();

// quick-action handlers (toggle visible / toggle approved / delete)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && csrfValid($_POST['csrf_token'] ?? '')) {
    $aid = (int)($_POST['id'] ?? 0);
    if ($aid) {
        if (isset($_POST['toggle_visible'])) {
            if (!adminCanPublish()) { flash('You do not have permission.', 'error'); redirect(BASE_URL . '/admin/projects'); }
            $db->prepare(q("UPDATE {projects} SET is_visible = 1 - is_visible WHERE id = :id"))->execute([':id' => $aid]);
        } elseif (isset($_POST['toggle_approved'])) {
            if (!adminCanPublish()) { flash('You do not have permission.', 'error'); redirect(BASE_URL . '/admin/projects'); }
            $db->prepare(q("UPDATE {projects} SET is_approved = 1 - is_approved, is_visible = CASE WHEN is_approved = 0 THEN 1 ELSE is_visible END WHERE id = :id"))->execute([':id' => $aid]);
        } elseif (isset($_POST['move_up']) || isset($_POST['move_down'])) {
            if (!adminCanEdit()) { flash('You do not have permission.', 'error'); redirect(BASE_URL . '/admin/projects'); }
            $dir  = isset($_POST['move_up']) ? 'move_up' : 'move_down';
            $proj = $db->query(q("SELECT id FROM {projects} ORDER BY sort_order, created_at"))->fetchAll();
            $ids  = array_column($proj, 'id');
            $pos  = array_search($aid, $ids);
            if ($pos !== false) {
                $swapPos = $dir === 'move_up' ? $pos - 1 : $pos + 1;
                if (isset($ids[$swapPos])) {
                    // Swap positions in the array then renumber everything 10, 20, 30…
                    [$ids[$pos], $ids[$swapPos]] = [$ids[$swapPos], $ids[$pos]];
                    $stmt = $db->prepare(q("UPDATE {projects} SET sort_order = :s WHERE id = :id"));
                    foreach ($ids as $i => $pid) {
                        $stmt->execute([':s' => ($i + 1) * 10, ':id' => $pid]);
                    }
                }
            }
        } elseif (isset($_POST['delete'])) {
            if (!adminCanDelete()) {
                flash('You do not have permission to delete.', 'error');
                redirect(BASE_URL . '/admin/projects');
            }
            // Delete image file if stored locally
            $row = $db->prepare(q("SELECT image FROM {projects} WHERE id = :id"));
            $row->execute([':id' => $aid]);
            $img = $row->fetchColumn();
            if ($img && strpos($img, 'uploads/') === 0) {
                $fp = dirname(__DIR__) . '/' . $img;
                if (file_exists($fp)) unlink($fp);
            }
            $db->prepare(q("DELETE FROM {projects} WHERE id = :id"))->execute([':id' => $aid]);
            flash('Project deleted.');
        }
    }
    redirect(BASE_URL . '/admin/projects' . ($_GET ? '?' . http_build_query($_GET) : ''));
}

// filters & pagination
$perPage   = 20;
$page      = max(1, (int)($_GET['page']   ?? 1));
$search    = trim($_GET['q']              ?? '');
$source    = $_GET['source']              ?? '';
$status    = $_GET['status']             ?? '';
$catFilter = $_GET['cat']               ?? '';

$allProjectCats = $db->query(q("SELECT id, name_en FROM {project_categories} ORDER BY sort_order, name_en"))->fetchAll();

$where  = [];
$params = [];

if ($search !== '') {
    $where[]       = "(p.title LIKE :q1 OR p.url LIKE :q2 OR p.submitted_by LIKE :q3)";
    $params[':q1'] = '%' . $search . '%';
    $params[':q2'] = '%' . $search . '%';
    $params[':q3'] = '%' . $search . '%';
}
if ($source === 'user' || $source === 'admin') {
    $where[]           = "p.source = :source";
    $params[':source'] = $source;
}
if ($status === 'pending') {
    $where[] = "p.is_approved = 0";
} elseif ($status === 'hidden') {
    $where[] = "p.is_visible = 0";
}
if ($catFilter === 'none') {
    $where[] = "p.category_id IS NULL";
} elseif ($catFilter !== '') {
    $where[]          = "p.category_id = :cat";
    $params[':cat']   = (int)$catFilter;
}

$whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

$countStmt = $db->prepare(q("SELECT COUNT(*) FROM {projects} p $whereSql"));
$countStmt->execute($params);
$total  = (int)$countStmt->fetchColumn();
$pages  = max(1, (int)ceil($total / $perPage));
$page   = min($page, $pages);
$offset = ($page - 1) * $perPage;

$stmt = $db->prepare(q(
    "SELECT p.id, p.title, p.url, p.source, p.is_approved, p.is_visible,
            p.submitted_by, p.sort_order, p.created_at,
            c.name_en AS category_name
     FROM {projects} p
     LEFT JOIN {project_categories} c ON c.id = p.category_id
     $whereSql
     ORDER BY p.sort_order ASC, p.created_at DESC
     LIMIT :limit OFFSET :offset"
));
foreach ($params as $k => $v) $stmt->bindValue($k, $v);
$stmt->bindValue(':limit',  $perPage, PDO::PARAM_INT);
$stmt->bindValue(':offset', $offset,  PDO::PARAM_INT);
$stmt->execute();
$rows = $stmt->fetchAll();

// Count pending submissions
$pending = (int)$db->query(q("SELECT COUNT(*) FROM {projects} WHERE is_approved = 0"))->fetchColumn();

function projectsPageUrl(int $p): string {
    $q = array_filter(['q' => $_GET['q'] ?? '', 'source' => $_GET['source'] ?? '', 'status' => $_GET['status'] ?? '', 'cat' => $_GET['cat'] ?? '']);
    $q['page'] = $p;
    return '?' . http_build_query($q);
}
?>

<div class="admin-header-bar">
    <h1>
        <i class="fa-solid fa-rocket me-2"></i>Projects
        <?php if ($pending > 0): ?>
            <span class="badge bg-warning text-dark ms-2" style="font-size:.65rem"><?= $pending ?> pending</span>
        <?php endif; ?>
    </h1>
    <?php if (adminCanCreate()): ?>
    <a href="<?= BASE_URL ?>/admin/projects-edit" class="btn btn-sm btn-primary-altered">
        <i class="fa-solid fa-plus me-1"></i> Add project
    </a>
    <?php endif; ?>
</div>

<!-- Filters -->
<form method="get" class="d-flex gap-2 mb-3 flex-wrap align-items-center">
    <input type="text" name="q" class="form-control" style="max-width:260px"
           placeholder="Title, URL, submitter…" value="<?= h($search) ?>">
    <select name="source" class="form-select" style="max-width:150px">
        <option value="">All sources</option>
        <option value="admin" <?= $source === 'admin' ? 'selected' : '' ?>>Admin</option>
        <option value="user"  <?= $source === 'user'  ? 'selected' : '' ?>>User submission</option>
    </select>
    <select name="status" class="form-select" style="max-width:150px">
        <option value="">All statuses</option>
        <option value="pending" <?= $status === 'pending' ? 'selected' : '' ?>>Pending approval</option>
        <option value="hidden"  <?= $status === 'hidden'  ? 'selected' : '' ?>>Hidden</option>
    </select>
    <select name="cat" class="form-select" style="max-width:160px">
        <option value="">All categories</option>
        <option value="none" <?= $catFilter === 'none' ? 'selected' : '' ?>>— Uncategorized</option>
        <?php foreach ($allProjectCats as $pc): ?>
        <option value="<?= $pc['id'] ?>" <?= $catFilter === (string)$pc['id'] ? 'selected' : '' ?>><?= h($pc['name_en']) ?></option>
        <?php endforeach; ?>
    </select>
    <button type="submit" class="btn btn-sm btn-outline-secondary">
        <i class="fa-solid fa-magnifying-glass me-1"></i> Search
    </button>
    <?php if ($search !== '' || $source !== '' || $status !== '' || $catFilter !== ''): ?>
        <a href="<?= BASE_URL ?>/admin/projects" class="btn btn-sm btn-outline-secondary">✕ Reset</a>
    <?php endif; ?>
</form>

<div class="card-altered">
    <div class="table-responsive">
        <table class="table table-hover table-altered mb-0">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Title</th>
                    <th>URL</th>
                    <th>Category</th>
                    <th>Source</th>
                    <th>Submitter</th>
                    <th>Status</th>
                    <th>Order</th>
                    <th>Date</th>
                    <th class="text-end">Actions</th>
                </tr>
            </thead>
            <tbody>
            <?php if (empty($rows)): ?>
                <tr><td colspan="10" class="text-center text-muted py-4">No projects found.</td></tr>
            <?php else: ?>
                <?php foreach ($rows as $i => $row): ?>
                <tr>
                    <td style="width:44px;color:var(--neutral-500);font-size:.85rem"><?= $row['id'] ?></td>
                    <td><?= h($row['title']) ?></td>
                    <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.85rem">
                        <a href="<?= h($row['url']) ?>" target="_blank" rel="noopener noreferrer" class="text-muted">
                            <?= h($row['url']) ?>
                        </a>
                    </td>
                    <td style="font-size:.85rem;color:var(--neutral-500)"><?= $row['category_name'] ? h($row['category_name']) : '—' ?></td>
                    <td>
                        <?php if ($row['source'] === 'user'): ?>
                            <span class="badge bg-info text-dark">User</span>
                        <?php else: ?>
                            <span class="badge bg-secondary">Admin</span>
                        <?php endif; ?>
                    </td>
                    <td style="font-size:.85rem;color:var(--neutral-500)"><?= h($row['submitted_by'] ?? '—') ?></td>
                    <td>
                        <?php if (!$row['is_approved']): ?>
                            <span class="badge bg-warning text-dark">Pending</span>
                        <?php elseif (!$row['is_visible']): ?>
                            <span class="badge bg-secondary">Hidden</span>
                        <?php else: ?>
                            <span class="badge bg-success">Visible</span>
                        <?php endif; ?>
                    </td>
                    <td style="font-size:.85rem;text-align:center"><?= (int)$row['sort_order'] ?></td>
                    <td style="white-space:nowrap;font-size:.85rem"><?= date('d/m/Y', strtotime($row['created_at'])) ?></td>
                    <td class="text-end" style="white-space:nowrap">
                        <!-- Approve / toggle visible -->
                        <?php if (adminCanPublish()): ?>
                        <?php if (!$row['is_approved']): ?>
                        <form method="post" class="d-inline">
                            <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                            <input type="hidden" name="id" value="<?= $row['id'] ?>">
                            <button type="submit" name="toggle_approved" class="btn btn-sm btn-success" title="Approve">
                                <i class="fa-solid fa-check"></i>
                            </button>
                        </form>
                        <?php else: ?>
                        <form method="post" class="d-inline">
                            <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                            <input type="hidden" name="id" value="<?= $row['id'] ?>">
                            <button type="submit" name="toggle_visible"
                                    class="btn btn-sm <?= $row['is_visible'] ? 'btn-outline-secondary' : 'btn-outline-warning' ?>"
                                    title="<?= $row['is_visible'] ? 'Hide' : 'Show' ?>">
                                <i class="fa-solid <?= $row['is_visible'] ? 'fa-eye' : 'fa-eye-slash' ?>"></i>
                            </button>
                        </form>
                        <?php endif; ?>
                        <?php endif; ?>
                        <!-- Move up -->
                        <?php if (adminCanEdit()): ?>
                        <form method="post" class="d-inline">
                            <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                            <input type="hidden" name="id" value="<?= $row['id'] ?>">
                            <button type="submit" name="move_up" class="btn btn-sm btn-outline-secondary" <?= $i === 0 ? 'disabled' : '' ?> title="Move up">
                                <i class="fa-solid fa-chevron-up"></i>
                            </button>
                        </form>
                        <!-- Move down -->
                        <form method="post" class="d-inline">
                            <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                            <input type="hidden" name="id" value="<?= $row['id'] ?>">
                            <button type="submit" name="move_down" class="btn btn-sm btn-outline-secondary" <?= $i === count($rows) - 1 ? 'disabled' : '' ?> title="Move down">
                                <i class="fa-solid fa-chevron-down"></i>
                            </button>
                        </form>
                        <?php endif; ?>
                        <!-- Edit -->
                        <?php if (adminCanEdit()): ?>
                        <a href="<?= BASE_URL ?>/admin/projects-edit?id=<?= $row['id'] ?>"
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
                                    onclick="return confirm('Delete this project?')">
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

<!-- Pagination -->
<?php if ($pages > 1): ?>
<nav class="mt-3 d-flex align-items-center gap-2 flex-wrap">
    <span class="text-muted small"><?= $total ?> result<?= $total > 1 ? 's' : '' ?> — page <?= $page ?>/<?= $pages ?></span>
    <ul class="pagination pagination-sm mb-0 ms-2">
        <li class="page-item <?= $page <= 1 ? 'disabled' : '' ?>">
            <a class="page-link" href="<?= h(projectsPageUrl($page - 1)) ?>">‹</a>
        </li>
        <?php for ($p = max(1, $page - 3); $p <= min($pages, $page + 3); $p++): ?>
        <li class="page-item <?= $p === $page ? 'active' : '' ?>">
            <a class="page-link" href="<?= h(projectsPageUrl($p)) ?>"><?= $p ?></a>
        </li>
        <?php endfor; ?>
        <li class="page-item <?= $page >= $pages ? 'disabled' : '' ?>">
            <a class="page-link" href="<?= h(projectsPageUrl($page + 1)) ?>">›</a>
        </li>
    </ul>
</nav>
<?php endif; ?>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
