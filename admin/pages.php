<?php
$adminPageTitle = 'Pages';
$adminSection   = 'pages';
require_once __DIR__ . '/includes/header.php';
require_once dirname(__DIR__) . '/includes/core-pages.php';

$db       = getDB();
$pagesDir = dirname(__DIR__) . '/pages/';

// quick-action handlers
if ($_SERVER['REQUEST_METHOD'] === 'POST' && csrfValid($_POST['csrf_token'] ?? '')) {
    $pid = (int)($_POST['id'] ?? 0);
    if (isset($_POST['toggle_plugin_page'])) {
        if (!adminCanPublish()) { flash('You do not have permission.', 'error'); redirect(BASE_URL . '/admin/pages'); }
        $__pslug = trim($_POST['plugin_slug'] ?? '');
        if ($__pslug !== '') {
            $__hidden = json_decode(getSetting('plugin_pages_hidden', '[]'), true);
            if (!is_array($__hidden)) $__hidden = [];
            $__idx = array_search($__pslug, $__hidden, true);
            if ($__idx !== false) {
                array_splice($__hidden, $__idx, 1);
            } else {
                $__hidden[] = $__pslug;
            }
            saveSetting('plugin_pages_hidden', json_encode(array_values($__hidden)));
            flash('Visibility updated.');
        }
    } elseif ($pid) {
        $__slugRow = $db->prepare(q("SELECT slug FROM {pages} WHERE id = :id LIMIT 1"));
        $__slugRow->execute([':id' => $pid]);
        $__slug = $__slugRow->fetchColumn() ?: '';
        if ((empty($_SESSION['admin_logged_in']) || saIsPreviewingGroup()) && isset($__corePages[$__slug])) {
            flash('This page is protected and cannot be modified.', 'error');
            redirect(BASE_URL . '/admin/pages');
        }
        if (isset($_POST['toggle_visible'])) {
            if (!adminCanPublish()) { flash('You do not have permission.', 'error'); redirect(BASE_URL . '/admin/pages'); }
            $db->prepare(q("UPDATE {pages} SET is_visible = 1 - is_visible WHERE id = :id"))->execute([':id' => $pid]);
            flash('Visibility updated.');
        } elseif (isset($_POST['delete'])) {
            if (!adminCanDelete()) {
                flash('You do not have permission to delete.', 'error');
                redirect(BASE_URL . '/admin/pages');
            }
            $row = $db->prepare(q("SELECT slug, file_path FROM {pages} WHERE id = :id"));
            $row->execute([':id' => $pid]);
            $pg = $row->fetch();
            if ($pg) {
                $absPath = realpath($pagesDir . $pg['slug'] . '.php');
                $realDir = realpath($pagesDir);
                if ($absPath && $realDir && strpos($absPath, $realDir) === 0) {
                    unlink($absPath);
                }
                $db->prepare(q("DELETE FROM {pages} WHERE id = :id"))->execute([':id' => $pid]);
                flash('Page deleted.');
            }
        }
    }
    redirect(BASE_URL . '/admin/pages' . (!empty($_GET) ? '?' . http_build_query($_GET) : ''));
}

// filters
$search = trim($_GET['q']      ?? '');
$status = $_GET['status']      ?? '';

$where  = [];
$params = [];

if ($search !== '') {
    // Three distinct parameter names because EMULATE_PREPARES=false (native prepared statements)
    // does not allow the same named parameter to appear more than once in a query.
    $where[]       = "(slug LIKE :q1 OR title_en LIKE :q2 OR title_fr LIKE :q3)";
    $params[':q1'] = '%' . $search . '%';
    $params[':q2'] = '%' . $search . '%';
    $params[':q3'] = '%' . $search . '%';
}
if ($status === 'hidden') {
    $where[] = "is_visible = 0";
} elseif ($status === 'visible') {
    $where[] = "is_visible = 1";
}

$whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

$stmt = $db->prepare(q("SELECT * FROM {pages} $whereSql ORDER BY sort_order ASC, slug ASC"));
$stmt->execute($params);
$allRows    = $stmt->fetchAll();
$customRows = array_values(array_filter($allRows, function ($r) use ($__corePages) {
    return !isset($__corePages[$r['slug']]);
}));
$coreRows   = array_values(array_filter($allRows, function ($r) use ($__corePages) {
    return isset($__corePages[$r['slug']]);
}));
$total = count($customRows);

// plugin pages (built here so the search filter can apply to them too)
$__hiddenPluginSlugs = json_decode(getSetting('plugin_pages_hidden', '[]'), true);
if (!is_array($__hiddenPluginSlugs)) $__hiddenPluginSlugs = [];
$__activePluginIds = pluginsGetActiveIds();
$__pluginPages     = [];
foreach (pluginsGetAll() as $__pid => $__pm) {
    if (!in_array($__pid, $__activePluginIds, true)) continue;
    foreach ($__pm['pages'] ?? [] as $__pp) {
        if (empty($__pp['slug'])) continue;
        $__pluginPages[] = [
            'plugin_id'   => $__pid,
            'plugin_name' => $__pm['name'],
            'plugin_icon' => $__pm['icon'] ?? 'fa-solid fa-puzzle-piece',
            'slug'        => $__pp['slug'],
            'title_en'    => $__pp['title_en'] ?? '',
            'title_fr'    => $__pp['title_fr'] ?? '',
        ];
    }
}
// Apply search filter
if ($search !== '') {
    $__sq = strtolower($search);
    $__pluginPages = array_values(array_filter($__pluginPages, function ($pp) use ($__sq) {
        return strpos(strtolower($pp['slug']),     $__sq) !== false
            || strpos(strtolower($pp['title_en']), $__sq) !== false
            || strpos(strtolower($pp['title_fr']), $__sq) !== false;
    }));
}
// Apply status filter
if ($status === 'hidden') {
    $__pluginPages = array_values(array_filter($__pluginPages, function ($pp) use ($__hiddenPluginSlugs) {
        return in_array($pp['slug'], $__hiddenPluginSlugs, true);
    }));
} elseif ($status === 'visible') {
    $__pluginPages = array_values(array_filter($__pluginPages, function ($pp) use ($__hiddenPluginSlugs) {
        return !in_array($pp['slug'], $__hiddenPluginSlugs, true);
    }));
}
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-file-code me-2"></i>Pages</h1>
    <?php if (adminCanCreate()): ?>
    <div class="d-flex gap-2">
        <a href="<?= BASE_URL ?>/admin/page-edit?type=content" class="btn btn-sm btn-primary-altered">
            <i class="fa-solid fa-file-lines me-1"></i> New content page
        </a>
        <a href="<?= BASE_URL ?>/admin/page-edit?type=code" class="btn btn-sm btn-outline-secondary">
            <i class="fa-solid fa-code me-1"></i> New code page
        </a>
    </div>
    <?php endif; ?>
</div>

<!-- Filters -->
<form method="get" class="d-flex gap-2 mb-3 flex-wrap align-items-center">
    <input type="text" name="q" class="form-control" style="max-width:260px"
           placeholder="Slug, title…" value="<?= h($search) ?>">
    <select name="status" class="form-select" style="max-width:160px">
        <option value="">All statuses</option>
        <option value="visible" <?= $status === 'visible' ? 'selected' : '' ?>>Visible</option>
        <option value="hidden"  <?= $status === 'hidden'  ? 'selected' : '' ?>>Hidden</option>
    </select>
    <button type="submit" class="btn btn-sm btn-outline-secondary">
        <i class="fa-solid fa-magnifying-glass me-1"></i> Search
    </button>
    <?php if ($search !== '' || $status !== ''): ?>
        <a href="<?= BASE_URL ?>/admin/pages" class="btn btn-sm btn-outline-secondary">✕ Reset</a>
    <?php endif; ?>
</form>

<div class="card-altered">
    <div class="table-responsive">
        <table class="table table-hover table-altered mb-0">
            <thead>
                <tr>
                    <th style="width:44px">#</th>
                    <th>Slug</th>
                    <th>Title EN</th>
                    <th>Title FR</th>
                    <th>File</th>
                    <th>Status</th>
                    <th class="text-end">Actions</th>
                </tr>
            </thead>
            <tbody>
            <?php if (empty($customRows)): ?>
                <tr><td colspan="7" class="text-center text-muted py-4">No pages found.</td></tr>
            <?php else: ?>
                <?php foreach ($customRows as $row): ?>
                <?php $fileExists = file_exists($pagesDir . $row['slug'] . '.php'); ?>
                <tr>
                    <td style="color:var(--neutral-500);font-size:.85rem"><?= $row['id'] ?></td>
                    <td>
                        <code><?= h($row['slug']) ?></code>
                        <?php if (($row['type'] ?? 'code') === 'content'): ?>
                        <span class="badge ms-1" style="font-size:.65rem;background:#0891b2;color:#fff;border-radius:20px;padding:2px 7px">Content</span>
                        <?php endif; ?>
                    </td>
                    <td><?= h($row['title_en']) ?: '<span class="text-muted">—</span>' ?></td>
                    <td><?= h($row['title_fr']) ?: '<span class="text-muted">—</span>' ?></td>
                    <td style="font-size:.8rem;color:var(--neutral-500)">
                        <?php if ($fileExists): ?>
                            <i class="fa-solid fa-circle-check text-success me-1" title="File exists"></i>
                        <?php else: ?>
                            <i class="fa-solid fa-circle-xmark text-danger me-1" title="File missing"></i>
                        <?php endif; ?>
                        pages/<?= h($row['slug']) ?>.php
                    </td>
                    <td>
                        <?php if ($row['is_visible']): ?>
                            <span class="badge bg-success">Visible</span>
                        <?php else: ?>
                            <span class="badge bg-secondary">Hidden</span>
                        <?php endif; ?>
                    </td>
                    <td class="text-end" style="white-space:nowrap">
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
                        <?php if ($fileExists): ?>
                        <a href="<?= BASE_URL ?>/pages/<?= h($row['slug']) ?>" target="_blank"
                           class="btn btn-sm btn-outline-secondary" title="View page">
                            <i class="fa-solid fa-arrow-up-right-from-square"></i>
                        </a>
                        <?php endif; ?>
                        <?php if (adminCanEdit()): ?>
                        <a href="<?= BASE_URL ?>/admin/page-edit?id=<?= $row['id'] ?>"
                           class="btn btn-sm btn-outline-primary" title="Edit">
                            <i class="fa-solid fa-pen"></i>
                        </a>
                        <?php endif; ?>
                        <?php if (adminCanDelete()): ?>
                        <form method="post" class="d-inline">
                            <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                            <input type="hidden" name="id" value="<?= $row['id'] ?>">
                            <button type="submit" name="delete" class="btn btn-sm btn-outline-danger" title="Delete"
                                    onclick="return confirm('Delete page &quot;<?= h(addslashes($row['slug'])) ?>&quot; and its PHP file?\nThis cannot be undone.')">
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

<p class="text-muted small mt-2"><?= $total ?> page<?= $total !== 1 ? 's' : '' ?></p>

<?php
$__noResults = ($search !== '' || $status !== '')
    && empty($customRows) && empty($__pluginPages)
    && (empty($coreRows) || empty($_SESSION['admin_logged_in']) || saIsPreviewingGroup());
?>
<?php if ($__noResults): ?>
<p class="text-muted text-center py-4">No pages match your search.</p>
<?php endif; ?>

<?php if (!empty($__pluginPages)): ?>
<div class="mt-4">
    <h6 class="text-muted mb-2" style="font-size:.8rem;letter-spacing:.05em;text-transform:uppercase">
        <i class="fa-solid fa-puzzle-piece me-1"></i> Plugin pages
    </h6>
    <div class="card-altered">
        <div class="table-responsive">
            <table class="table table-hover table-altered mb-0">
                <thead>
                    <tr>
                        <th>Plugin</th>
                        <th>Slug</th>
                        <th>Title EN</th>
                        <th>Title FR</th>
                        <th>Status</th>
                        <th class="text-end">Actions</th>
                    </tr>
                </thead>
                <tbody>
                <?php foreach ($__pluginPages as $__pp):
                    $__ppHidden = in_array($__pp['slug'], $__hiddenPluginSlugs, true);
                ?>
                <tr>
                    <td style="white-space:nowrap">
                        <i class="<?= h($__pp['plugin_icon']) ?> me-1 text-muted"></i>
                        <?= h($__pp['plugin_name']) ?>
                    </td>
                    <td><code><?= h($__pp['slug']) ?></code></td>
                    <td><?= h($__pp['title_en']) ?: '<span class="text-muted">—</span>' ?></td>
                    <td><?= h($__pp['title_fr']) ?: '<span class="text-muted">—</span>' ?></td>
                    <td>
                        <?php if ($__ppHidden): ?>
                            <span class="badge bg-secondary">Hidden</span>
                        <?php else: ?>
                            <span class="badge bg-success">Visible</span>
                        <?php endif; ?>
                    </td>
                    <td class="text-end" style="white-space:nowrap">
                        <?php if (adminCanPublish()): ?>
                        <form method="post" class="d-inline">
                            <input type="hidden" name="csrf_token"   value="<?= h(csrfToken()) ?>">
                            <input type="hidden" name="plugin_slug"  value="<?= h($__pp['slug']) ?>">
                            <button type="submit" name="toggle_plugin_page"
                                    class="btn btn-sm <?= $__ppHidden ? 'btn-outline-warning' : 'btn-outline-secondary' ?>"
                                    title="<?= $__ppHidden ? 'Show' : 'Hide' ?>">
                                <i class="fa-solid <?= $__ppHidden ? 'fa-eye-slash' : 'fa-eye' ?>"></i>
                            </button>
                        </form>
                        <?php endif; ?>
                        <a href="<?= BASE_URL ?>/pages/<?= h($__pp['slug']) ?>" target="_blank"
                           class="btn btn-sm btn-outline-secondary" title="View page">
                            <i class="fa-solid fa-arrow-up-right-from-square"></i>
                        </a>
                    </td>
                </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>
<?php endif; ?>

<?php if (!empty($_SESSION['admin_logged_in']) && !saIsPreviewingGroup() && !empty($coreRows)): ?>
<div class="mt-4">
    <h6 class="text-muted mb-2" style="font-size:.8rem;letter-spacing:.05em;text-transform:uppercase">
        <i class="fa-solid fa-lock me-1"></i> Core pages
    </h6>
    <div class="card-altered">
        <div class="table-responsive">
            <table class="table table-hover table-altered mb-0">
                <thead>
                    <tr>
                        <th style="width:44px">#</th>
                        <th>Slug</th>
                        <th>Title EN</th>
                        <th>Title FR</th>
                        <th>File</th>
                        <th>Status</th>
                        <th class="text-end">Actions</th>
                    </tr>
                </thead>
                <tbody>
                <?php foreach ($coreRows as $row):
                    $fileExists = file_exists($pagesDir . $row['slug'] . '.php');
                ?>
                <tr>
                    <td style="color:var(--neutral-500);font-size:.85rem"><?= $row['id'] ?></td>
                    <td><code><?= h($row['slug']) ?></code></td>
                    <td><?= h($row['title_en']) ?: '<span class="text-muted">—</span>' ?></td>
                    <td><?= h($row['title_fr']) ?: '<span class="text-muted">—</span>' ?></td>
                    <td style="font-size:.8rem;color:var(--neutral-500)">
                        <?php if ($fileExists): ?>
                            <i class="fa-solid fa-circle-check text-success me-1" title="File exists"></i>
                        <?php else: ?>
                            <i class="fa-solid fa-circle-xmark text-danger me-1" title="File missing"></i>
                        <?php endif; ?>
                        pages/<?= h($row['slug']) ?>.php
                    </td>
                    <td>
                        <?php if ($row['is_visible']): ?>
                            <span class="badge bg-success">Visible</span>
                        <?php else: ?>
                            <span class="badge bg-secondary">Hidden</span>
                        <?php endif; ?>
                    </td>
                    <td class="text-end" style="white-space:nowrap">
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
                        <?php if ($fileExists): ?>
                        <a href="<?= BASE_URL ?>/pages/<?= h($row['slug']) ?>" target="_blank"
                           class="btn btn-sm btn-outline-secondary" title="View page">
                            <i class="fa-solid fa-arrow-up-right-from-square"></i>
                        </a>
                        <?php endif; ?>
                        <a href="<?= BASE_URL ?>/admin/page-edit?id=<?= $row['id'] ?>"
                           class="btn btn-sm btn-outline-primary" title="Edit">
                            <i class="fa-solid fa-pen"></i>
                        </a>
                    </td>
                </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>
<?php endif; ?>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
