<?php
$adminPageTitle = 'Project Categories';
$adminSection   = 'projects';
require_once __DIR__ . '/includes/header.php';

$db = getDB();

if ($_SERVER['REQUEST_METHOD'] === 'POST' && csrfValid($_POST['csrf_token'] ?? '')) {
    $action = $_POST['action'] ?? '';
    $cid    = (int)($_POST['cat_id'] ?? 0);

    if (($action === 'move_up' || $action === 'move_down') && $cid) {
        $cats = $db->query(q("SELECT id, sort_order FROM {project_categories} ORDER BY sort_order, name_en"))->fetchAll();
        $ids  = array_column($cats, 'id');
        $pos  = array_search($cid, $ids);
        if ($pos !== false) {
            $swapPos = $action === 'move_up' ? $pos - 1 : $pos + 1;
            if (isset($ids[$swapPos])) {
                $swapId = $ids[$swapPos];
                $sortA  = $cats[$pos]['sort_order'];
                $sortB  = $cats[$swapPos]['sort_order'];
                if ($sortA === $sortB) { $sortA = $pos * 10; $sortB = $swapPos * 10; }
                $db->prepare(q("UPDATE {project_categories} SET sort_order = :s WHERE id = :id"))->execute([':s' => $sortB, ':id' => $cid]);
                $db->prepare(q("UPDATE {project_categories} SET sort_order = :s WHERE id = :id"))->execute([':s' => $sortA, ':id' => $swapId]);
            }
        }
    }
    redirect(BASE_URL . '/admin/project-categories');
}

$rows = $db->query(q(
    "SELECT c.id, c.name_en, c.name_fr, c.slug, c.is_hidden, c.sort_order,
            COUNT(p.id) AS project_count
     FROM {project_categories} c
     LEFT JOIN {projects} p ON p.category_id = c.id
     GROUP BY c.id
     ORDER BY c.sort_order, c.name_en"
))->fetchAll();
$total = count($rows);
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-tags me-2"></i>Project Categories</h1>
    <a href="<?= BASE_URL ?>/admin/project-categories-edit" class="btn btn-sm btn-primary-altered">
        <i class="fa-solid fa-plus me-1"></i> Add category
    </a>
</div>

<div class="card-altered">
    <div class="table-responsive">
        <table class="table table-hover table-altered mb-0">
            <thead>
                <tr>
                    <th>Name (EN)</th>
                    <th>Name (FR)</th>
                    <th>Slug</th>
                    <th>Projects</th>
                    <th class="text-end">Actions</th>
                </tr>
            </thead>
            <tbody>
            <?php if (empty($rows)): ?>
                <tr><td colspan="5" class="text-center text-muted py-4">No categories yet.</td></tr>
            <?php else: ?>
                <?php foreach ($rows as $i => $row): ?>
                <tr>
                    <td>
                        <?= h($row['name_en']) ?>
                        <?php if ($row['is_hidden']): ?>
                            <span class="badge bg-secondary ms-1" title="Hidden from public site">
                                <i class="fa-solid fa-eye-slash"></i>
                            </span>
                        <?php endif; ?>
                    </td>
                    <td><?= h($row['name_fr']) ?></td>
                    <td><code style="font-size:.82rem"><?= h($row['slug']) ?></code></td>
                    <td><?= (int)$row['project_count'] ?></td>
                    <td class="text-end" style="white-space:nowrap">
                        <form method="post" class="d-inline">
                            <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                            <input type="hidden" name="action" value="move_up">
                            <input type="hidden" name="cat_id" value="<?= $row['id'] ?>">
                            <button type="submit" class="btn btn-sm btn-outline-secondary" <?= $i === 0 ? 'disabled' : '' ?> title="Move up">
                                <i class="fa-solid fa-chevron-up"></i>
                            </button>
                        </form>
                        <form method="post" class="d-inline">
                            <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                            <input type="hidden" name="action" value="move_down">
                            <input type="hidden" name="cat_id" value="<?= $row['id'] ?>">
                            <button type="submit" class="btn btn-sm btn-outline-secondary" <?= $i === $total - 1 ? 'disabled' : '' ?> title="Move down">
                                <i class="fa-solid fa-chevron-down"></i>
                            </button>
                        </form>
                        <a href="<?= BASE_URL ?>/admin/project-categories-edit?id=<?= $row['id'] ?>"
                           class="btn btn-sm btn-outline-primary" title="Edit">
                            <i class="fa-solid fa-pen"></i>
                        </a>
                        <?php if (adminCanDelete()): ?>
                        <a href="<?= BASE_URL ?>/admin/project-categories-delete?id=<?= $row['id'] ?>"
                           class="btn btn-sm btn-outline-danger" title="Delete"
                           onclick="return confirm('Delete this category? Projects using it will become uncategorized.')">
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

<?php require_once __DIR__ . '/includes/footer.php'; ?>
