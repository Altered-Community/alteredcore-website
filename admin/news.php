<?php
$adminPageTitle = 'News';
$adminSection   = 'news';
require_once __DIR__ . '/includes/header.php';

$db = getDB();

// search & pagination
$perPage = 20;
$page    = max(1, (int)($_GET['page'] ?? 1));
$search  = trim($_GET['q']    ?? '');
$dateQ   = trim($_GET['date'] ?? '');

$where  = [];
$params = [];

if ($search !== '') {
    $where[]       = "(n.title_en LIKE :q1 OR n.title_fr LIKE :q2)";
    $params[':q1'] = '%' . $search . '%';
    $params[':q2'] = '%' . $search . '%';
}
if ($dateQ !== '') {
    $where[]            = "(n.published_at LIKE :date1 OR n.created_at LIKE :date2)";
    $params[':date1']   = '%' . $dateQ . '%';
    $params[':date2']   = '%' . $dateQ . '%';
}

$whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

$total = (int)$db->prepare(q("SELECT COUNT(*) FROM {news} n $whereSql"))->execute($params) ? 0 : 0;
$countStmt = $db->prepare(q("SELECT COUNT(*) FROM {news} n $whereSql"));
$countStmt->execute($params);
$total  = (int)$countStmt->fetchColumn();
$pages  = max(1, (int)ceil($total / $perPage));
$page   = min($page, $pages);
$offset = ($page - 1) * $perPage;

$stmt = $db->prepare(q(
    "SELECT n.id, n.title_en, n.title_fr, n.is_published, n.published_at, n.created_at,
            c.name_en AS cat_en
     FROM {news} n
     LEFT JOIN {news_categories} c ON n.category_id = c.id
     $whereSql
     ORDER BY COALESCE(n.published_at, n.created_at) DESC
     LIMIT :limit OFFSET :offset"
));
foreach ($params as $k => $v) $stmt->bindValue($k, $v);
$stmt->bindValue(':limit',  $perPage, PDO::PARAM_INT);
$stmt->bindValue(':offset', $offset,  PDO::PARAM_INT);
$stmt->execute();
$rows = $stmt->fetchAll();

// Build pagination URL helper
function newsPageUrl(int $p): string {
    $q = array_filter(['q' => $_GET['q'] ?? '', 'date' => $_GET['date'] ?? '']);
    $q['page'] = $p;
    return '?' . http_build_query($q);
}
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-newspaper me-2"></i>News</h1>
    <?php if (adminCanCreate()): ?>
    <a href="<?= BASE_URL ?>/admin/news-edit" class="btn btn-sm btn-primary-altered">
        <i class="fa-solid fa-plus me-1"></i> Add news
    </a>
    <?php endif; ?>
</div>

<!-- Search bar -->
<form method="get" class="d-flex gap-2 mb-3 flex-wrap">
    <input type="text" name="q" class="form-control" style="max-width:280px"
           placeholder="Title EN or FR…" value="<?= h($search) ?>">
    <input type="text" name="date" class="form-control" style="max-width:160px"
           placeholder="Date (e.g. 2025-12)" value="<?= h($dateQ) ?>">
    <button type="submit" class="btn btn-sm btn-outline-secondary">
        <i class="fa-solid fa-magnifying-glass me-1"></i> Search
    </button>
    <?php if ($search !== '' || $dateQ !== ''): ?>
        <a href="<?= BASE_URL ?>/admin/news" class="btn btn-sm btn-outline-secondary">✕ Reset</a>
    <?php endif; ?>
</form>

<div class="card-altered">
    <div class="table-responsive">
        <table class="table table-hover table-altered mb-0">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Title (EN)</th>
                    <th>Title (FR)</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th class="text-end">Actions</th>
                </tr>
            </thead>
            <tbody>
            <?php if (empty($rows)): ?>
                <tr><td colspan="7" class="text-center text-muted py-4">No news found.</td></tr>
            <?php else: ?>
                <?php foreach ($rows as $row):
                    $date = $row['published_at'] ?? $row['created_at'];
                ?>
                <tr>
                    <td style="width:50px;color:var(--neutral-500);font-size:.85rem"><?= $row['id'] ?></td>
                    <td><?= h($row['title_en']) ?></td>
                    <td><?= h($row['title_fr']) ?></td>
                    <td><?= h($row['cat_en'] ?? '—') ?></td>
                    <td>
                        <?php if ($row['is_published']): ?>
                            <span class="badge bg-success">Published</span>
                        <?php else: ?>
                            <span class="badge bg-secondary">Draft</span>
                        <?php endif; ?>
                    </td>
                    <td style="white-space:nowrap;font-size:.85rem"><?= date('d/m/Y', strtotime($date)) ?></td>
                    <td class="text-end" style="white-space:nowrap">
                        <a href="<?= BASE_URL ?>/pages/news-detail?id=<?= $row['id'] ?>&preview=1"
                           target="_blank" class="btn btn-sm btn-outline-secondary me-1" title="Preview">
                            <i class="fa-solid fa-eye"></i>
                        </a>
                        <?php if (adminCanEdit()): ?>
                        <a href="<?= BASE_URL ?>/admin/news-edit?id=<?= $row['id'] ?>"
                           class="btn btn-sm btn-outline-primary me-1" title="Edit">
                            <i class="fa-solid fa-pen"></i>
                        </a>
                        <?php endif; ?>
                        <?php if (adminCanDelete()): ?>
                        <a href="<?= BASE_URL ?>/admin/news-delete?id=<?= $row['id'] ?>"
                           class="btn btn-sm btn-outline-danger" title="Delete"
                           onclick="return confirm('Delete this news?')">
                            <i class="fa-solid fa-trash"></i>
                        </a>
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
            <a class="page-link" href="<?= h(newsPageUrl($page - 1)) ?>">‹</a>
        </li>
        <?php for ($p = max(1, $page - 3); $p <= min($pages, $page + 3); $p++): ?>
        <li class="page-item <?= $p === $page ? 'active' : '' ?>">
            <a class="page-link" href="<?= h(newsPageUrl($p)) ?>"><?= $p ?></a>
        </li>
        <?php endfor; ?>
        <li class="page-item <?= $page >= $pages ? 'disabled' : '' ?>">
            <a class="page-link" href="<?= h(newsPageUrl($page + 1)) ?>">›</a>
        </li>
    </ul>
</nav>
<?php endif; ?>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
