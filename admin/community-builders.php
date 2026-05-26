<?php
$adminPageTitle = 'Community Builders';
$adminSection   = 'community-builders';
require_once __DIR__ . '/includes/header.php';

$db = getDB();

// quick-action handlers
if ($_SERVER['REQUEST_METHOD'] === 'POST' && csrfValid($_POST['csrf_token'] ?? '')) {
    $aid = (int)($_POST['id'] ?? 0);
    if ($aid) {
        if (isset($_POST['toggle_visible'])) {
            if (!adminCanPublish()) { flash('You do not have permission.', 'error'); redirect(BASE_URL . '/admin/community-builders'); }
            $db->prepare(q("UPDATE {community_builders} SET is_visible = 1 - is_visible WHERE id = :id"))->execute([':id' => $aid]);
        } elseif (isset($_POST['move_up']) || isset($_POST['move_down'])) {
            if (!adminCanEdit()) { flash('You do not have permission.', 'error'); redirect(BASE_URL . '/admin/community-builders'); }
            $dir  = isset($_POST['move_up']) ? 'move_up' : 'move_down';
            $rows = $db->query(q("SELECT id FROM {community_builders} ORDER BY sort_order, created_at"))->fetchAll();
            $ids  = array_column($rows, 'id');
            $pos  = array_search($aid, $ids);
            if ($pos !== false) {
                $swapPos = $dir === 'move_up' ? $pos - 1 : $pos + 1;
                if (isset($ids[$swapPos])) {
                    [$ids[$pos], $ids[$swapPos]] = [$ids[$swapPos], $ids[$pos]];
                    $stmt = $db->prepare(q("UPDATE {community_builders} SET sort_order = :s WHERE id = :id"));
                    foreach ($ids as $i => $pid) {
                        $stmt->execute([':s' => ($i + 1) * 10, ':id' => $pid]);
                    }
                }
            }
        } elseif (isset($_POST['delete'])) {
            if (!adminCanDelete()) {
                flash('You do not have permission to delete.', 'error');
                redirect(BASE_URL . '/admin/community-builders');
            }
            $row = $db->prepare(q("SELECT image FROM {community_builders} WHERE id = :id"));
            $row->execute([':id' => $aid]);
            $img = $row->fetchColumn();
            if ($img && strpos($img, 'uploads/') === 0) {
                $fp = dirname(__DIR__) . '/' . $img;
                if (file_exists($fp)) unlink($fp);
            }
            $db->prepare(q("DELETE FROM {community_builders} WHERE id = :id"))->execute([':id' => $aid]);
            flash('Entry deleted.');
        }
    }
    redirect(BASE_URL . '/admin/community-builders' . ($_GET ? '?' . http_build_query($_GET) : ''));
}

// filters & pagination
$perPage = 20;
$page    = max(1, (int)($_GET['page'] ?? 1));
$search  = trim($_GET['q'] ?? '');

$where  = [];
$params = [];
if ($search !== '') {
    $where[]       = "(title LIKE :q1 OR url LIKE :q2)";
    $params[':q1'] = '%' . $search . '%';
    $params[':q2'] = '%' . $search . '%';
}
$whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

$countStmt = $db->prepare(q("SELECT COUNT(*) FROM {community_builders} $whereSql"));
$countStmt->execute($params);
$total  = (int)$countStmt->fetchColumn();
$pages  = max(1, (int)ceil($total / $perPage));
$page   = min($page, $pages);
$offset = ($page - 1) * $perPage;

$stmt = $db->prepare(q(
    "SELECT id, title, url, image, is_visible, sort_order, created_at
     FROM {community_builders} $whereSql
     ORDER BY sort_order ASC, created_at DESC
     LIMIT :limit OFFSET :offset"
));
foreach ($params as $k => $v) $stmt->bindValue($k, $v);
$stmt->bindValue(':limit',  $perPage, PDO::PARAM_INT);
$stmt->bindValue(':offset', $offset,  PDO::PARAM_INT);
$stmt->execute();
$rows = $stmt->fetchAll();

function cbPageUrl(int $p): string {
    $q = array_filter(['q' => $_GET['q'] ?? '']);
    $q['page'] = $p;
    return '?' . http_build_query($q);
}
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-screwdriver-wrench me-2"></i>Community Builders</h1>
    <?php if (adminCanCreate()): ?>
    <a href="<?= BASE_URL ?>/admin/community-builders-edit" class="btn btn-sm btn-primary-altered">
        <i class="fa-solid fa-plus me-1"></i> Add entry
    </a>
    <?php endif; ?>
</div>

<form method="get" class="d-flex gap-2 mb-3 flex-wrap align-items-center">
    <input type="text" name="q" class="form-control" style="max-width:280px"
           placeholder="Title or URL…" value="<?= h($search) ?>">
    <button type="submit" class="btn btn-sm btn-outline-secondary">
        <i class="fa-solid fa-magnifying-glass me-1"></i> Search
    </button>
    <?php if ($search !== ''): ?>
        <a href="<?= BASE_URL ?>/admin/community-builders" class="btn btn-sm btn-outline-secondary">✕ Reset</a>
    <?php endif; ?>
</form>

<div class="card-altered">
    <div class="table-responsive">
        <table class="table table-hover table-altered mb-0">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Image</th>
                    <th>Title</th>
                    <th>URL</th>
                    <th>Status</th>
                    <th>Order</th>
                    <th>Date</th>
                    <th class="text-end">Actions</th>
                </tr>
            </thead>
            <tbody>
            <?php if (empty($rows)): ?>
                <tr><td colspan="8" class="text-center text-muted py-4">No entries found.</td></tr>
            <?php else: ?>
                <?php foreach ($rows as $i => $row): ?>
                <tr>
                    <td style="width:44px;color:var(--neutral-500);font-size:.85rem"><?= $row['id'] ?></td>
                    <td style="width:60px">
                        <?php if ($row['image']): ?>
                        <img src="<?= h(assetUrl($row['image'])) ?>" alt=""
                             style="height:36px;width:36px;object-fit:cover;border-radius:4px;border:1px solid var(--neutral-200)">
                        <?php else: ?>
                        <span class="text-muted small">—</span>
                        <?php endif; ?>
                    </td>
                    <td><?= h($row['title']) ?></td>
                    <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.85rem">
                        <a href="<?= h($row['url']) ?>" target="_blank" rel="noopener" class="text-muted"><?= h($row['url']) ?></a>
                    </td>
                    <td>
                        <?php if ($row['is_visible']): ?>
                            <span class="badge bg-success">Visible</span>
                        <?php else: ?>
                            <span class="badge bg-secondary">Hidden</span>
                        <?php endif; ?>
                    </td>
                    <td style="font-size:.85rem;text-align:center"><?= (int)$row['sort_order'] ?></td>
                    <td style="white-space:nowrap;font-size:.85rem"><?= date('d/m/Y', strtotime($row['created_at'])) ?></td>
                    <td class="text-end" style="white-space:nowrap">
                        <!-- Toggle visible -->
                        <?php if (adminCanPublish()): ?>
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
                        <!-- Move up -->
                        <?php if (adminCanEdit()): ?>
                        <form method="post" class="d-inline">
                            <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                            <input type="hidden" name="id" value="<?= $row['id'] ?>">
                            <button type="submit" name="move_up" class="btn btn-sm btn-outline-secondary"
                                    <?= $i === 0 ? 'disabled' : '' ?> title="Move up">
                                <i class="fa-solid fa-chevron-up"></i>
                            </button>
                        </form>
                        <!-- Move down -->
                        <form method="post" class="d-inline">
                            <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                            <input type="hidden" name="id" value="<?= $row['id'] ?>">
                            <button type="submit" name="move_down" class="btn btn-sm btn-outline-secondary"
                                    <?= $i === count($rows) - 1 ? 'disabled' : '' ?> title="Move down">
                                <i class="fa-solid fa-chevron-down"></i>
                            </button>
                        </form>
                        <?php endif; ?>
                        <!-- Edit -->
                        <?php if (adminCanEdit()): ?>
                        <a href="<?= BASE_URL ?>/admin/community-builders-edit?id=<?= $row['id'] ?>"
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
                                    onclick="return confirm('Delete this entry?')">
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

<?php if ($pages > 1): ?>
<nav class="mt-3 d-flex align-items-center gap-2 flex-wrap">
    <span class="text-muted small"><?= $total ?> result<?= $total > 1 ? 's' : '' ?> — page <?= $page ?>/<?= $pages ?></span>
    <ul class="pagination pagination-sm mb-0 ms-2">
        <li class="page-item <?= $page <= 1 ? 'disabled' : '' ?>">
            <a class="page-link" href="<?= h(cbPageUrl($page - 1)) ?>">‹</a>
        </li>
        <?php for ($p = max(1, $page - 3); $p <= min($pages, $page + 3); $p++): ?>
        <li class="page-item <?= $p === $page ? 'active' : '' ?>">
            <a class="page-link" href="<?= h(cbPageUrl($p)) ?>"><?= $p ?></a>
        </li>
        <?php endfor; ?>
        <li class="page-item <?= $page >= $pages ? 'disabled' : '' ?>">
            <a class="page-link" href="<?= h(cbPageUrl($page + 1)) ?>">›</a>
        </li>
    </ul>
</nav>
<?php endif; ?>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
