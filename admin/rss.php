<?php
$adminPageTitle = 'RSS Feeds';
$adminSection   = 'rss';
require_once __DIR__ . '/includes/header.php';

$db     = getDB();
$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        $errors[] = 'Invalid form token.';
    } else {
        $action = $_POST['action'] ?? '';
        $id     = (int)($_POST['id'] ?? 0);

        if ($action === 'delete') {
            if (!adminCanDelete()) {
                flash('You do not have permission to delete.', 'error');
            } else {
                $db->prepare(q("DELETE FROM {rss_feeds} WHERE id = :id"))->execute([':id' => $id]);
                flash('Feed deleted.');
            }
            redirect(BASE_URL . '/admin/rss');
        }

        if ($action === 'toggle') {
            $db->prepare(q("UPDATE {rss_feeds} SET is_visible = NOT is_visible WHERE id = :id"))
               ->execute([':id' => $id]);
            flash('Visibility updated.');
            redirect(BASE_URL . '/admin/rss');
        }

        if ($action === 'move_up' || $action === 'move_down') {
            $feeds = $db->query(q("SELECT id, sort_order FROM {rss_feeds} ORDER BY sort_order, id"))->fetchAll();
            $ids   = array_column($feeds, 'id');
            $pos   = array_search($id, $ids);
            if ($pos !== false) {
                $swapPos = $action === 'move_up' ? $pos - 1 : $pos + 1;
                if (isset($ids[$swapPos])) {
                    $swapId = $ids[$swapPos];
                    $sortA  = $feeds[$pos]['sort_order'];
                    $sortB  = $feeds[$swapPos]['sort_order'];
                    if ($sortA === $sortB) { $sortA = $pos * 10; $sortB = $swapPos * 10; }
                    $db->prepare(q("UPDATE {rss_feeds} SET sort_order = :s WHERE id = :id"))->execute([':s' => $sortB, ':id' => $id]);
                    $db->prepare(q("UPDATE {rss_feeds} SET sort_order = :s WHERE id = :id"))->execute([':s' => $sortA, ':id' => $swapId]);
                }
            }
            redirect(BASE_URL . '/admin/rss');
        }

        if ($action === 'refresh') {
            require_once dirname(__DIR__) . '/includes/rss.php';
            $ok = fetchRssFeed($id);
            flash($ok ? 'Feed refreshed successfully.' : 'Failed to fetch feed — check the URL.', $ok ? 'success' : 'error');
            redirect(BASE_URL . '/admin/rss');
        }
    }
}

$feeds = $db->query(q(
    "SELECT f.*, c.name_en AS category_name
     FROM {rss_feeds} f
     LEFT JOIN {news_categories} c ON c.id = f.category_id
     ORDER BY f.sort_order ASC, f.id ASC"
))->fetchAll();
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-rss me-2"></i>RSS Feeds</h1>
    <a href="<?= BASE_URL ?>/admin/rss-edit" class="btn btn-primary-altered btn-sm">
        <i class="fa-solid fa-plus me-1"></i> Add feed
    </a>
</div>

<?php if ($errors): ?>
    <div class="alert alert-danger">
        <ul class="mb-0"><?php foreach ($errors as $e): ?><li><?= h($e) ?></li><?php endforeach; ?></ul>
    </div>
<?php endif; ?>

<?php if (empty($feeds)): ?>
    <p class="text-muted">No RSS feeds configured yet. <a href="<?= BASE_URL ?>/admin/rss-edit">Add the first one.</a></p>
<?php else: ?>
<?php $total = count($feeds); $i = 0; ?>
<div class="table-responsive">
    <table class="table table-hover align-middle">
        <thead class="table-light">
            <tr>
                <th style="width:72px"></th>
                <th>Name / URL</th>
                <th>Category</th>
                <th style="width:100px">Refresh</th>
                <th>Last fetched</th>
                <th style="width:60px">Vis.</th>
                <th></th>
            </tr>
        </thead>
        <tbody>
        <?php foreach ($feeds as $f): ?>
            <tr>
                <td style="white-space:nowrap">
                    <form method="post" class="d-inline">
                        <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                        <input type="hidden" name="action" value="move_up">
                        <input type="hidden" name="id" value="<?= (int)$f['id'] ?>">
                        <button type="submit" class="btn btn-sm btn-outline-secondary" <?= $i === 0 ? 'disabled' : '' ?> title="Move up">
                            <i class="fa-solid fa-chevron-up"></i>
                        </button>
                    </form>
                    <form method="post" class="d-inline">
                        <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                        <input type="hidden" name="action" value="move_down">
                        <input type="hidden" name="id" value="<?= (int)$f['id'] ?>">
                        <button type="submit" class="btn btn-sm btn-outline-secondary" <?= $i === $total - 1 ? 'disabled' : '' ?> title="Move down">
                            <i class="fa-solid fa-chevron-down"></i>
                        </button>
                    </form>
                </td>
                <td>
                    <a href="<?= BASE_URL ?>/admin/rss-edit?id=<?= (int)$f['id'] ?>" class="fw-semibold">
                        <?= h($f['name']) ?>
                    </a>
                    <div class="text-muted small text-truncate" style="max-width:320px"
                         title="<?= h($f['url']) ?>"><?= h($f['url']) ?></div>
                </td>
                <td>
                    <?= $f['category_name'] ? h($f['category_name']) : '<span class="text-muted">—</span>' ?>
                </td>
                <td><?= (int)$f['refresh_minutes'] ?> min</td>
                <td class="small">
                    <?= $f['last_fetched_at']
                        ? h($f['last_fetched_at'])
                        : '<span class="text-muted">Never</span>' ?>
                </td>
                <td>
                    <form method="post" class="d-inline">
                        <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                        <input type="hidden" name="action" value="toggle">
                        <input type="hidden" name="id" value="<?= (int)$f['id'] ?>">
                        <button type="submit"
                                class="btn btn-sm <?= $f['is_visible'] ? 'btn-success' : 'btn-outline-secondary' ?>"
                                title="<?= $f['is_visible'] ? 'Visible — click to hide' : 'Hidden — click to show' ?>">
                            <i class="fa-solid <?= $f['is_visible'] ? 'fa-eye' : 'fa-eye-slash' ?>"></i>
                        </button>
                    </form>
                </td>
                <td>
                    <div class="d-flex gap-1 justify-content-end">
                        <form method="post" class="d-inline">
                            <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                            <input type="hidden" name="action" value="refresh">
                            <input type="hidden" name="id" value="<?= (int)$f['id'] ?>">
                            <button type="submit" class="btn btn-outline-secondary btn-sm" title="Fetch now">
                                <i class="fa-solid fa-rotate"></i>
                            </button>
                        </form>
                        <a href="<?= BASE_URL ?>/admin/rss-edit?id=<?= (int)$f['id'] ?>"
                           class="btn btn-outline-primary btn-sm" title="Edit">
                            <i class="fa-solid fa-pen"></i>
                        </a>
                        <?php if (adminCanDelete()): ?>
                        <form method="post" class="d-inline"
                              onsubmit="return confirm('Delete this RSS feed and all its cached items?')">
                            <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                            <input type="hidden" name="action" value="delete">
                            <input type="hidden" name="id" value="<?= (int)$f['id'] ?>">
                            <button type="submit" class="btn btn-outline-danger btn-sm" title="Delete">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </form>
                        <?php endif; ?>
                    </div>
                </td>
            </tr>
        <?php $i++; endforeach; ?>
        </tbody>
    </table>
</div>
<?php endif; ?>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
