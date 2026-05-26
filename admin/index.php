<?php
$adminPageTitle = 'Dashboard';
require_once __DIR__ . '/includes/header.php';

$db = getDB();

// News
$totalNews = (int)$db->query(q("SELECT COUNT(*) FROM {news}"))->fetchColumn();
$pubNews   = (int)$db->query(q("SELECT COUNT(*) FROM {news} WHERE is_published=1"))->fetchColumn();
$cats      = (int)$db->query(q("SELECT COUNT(*) FROM {news_categories}"))->fetchColumn();

// Users
$totalUsers = (int)$db->query(q("SELECT COUNT(*) FROM {users}"))->fetchColumn();
$kcUsers    = (int)$db->query(q("SELECT COUNT(*) FROM {users} WHERE kc_sub IS NOT NULL"))->fetchColumn();
$adminUsers = (int)$db->query(q("SELECT COUNT(*) FROM {users} WHERE is_admin=1"))->fetchColumn();

// Visit stats
$viewsToday   = 0; $views7d   = 0; $views30d   = 0;
$uniqueToday  = 0; $unique7d  = 0; $unique30d  = 0;
$topPages     = [];
$chartRows    = [];
try {
    $viewsToday  = (int)$db->query(q("SELECT COALESCE(SUM(views),0) FROM {page_views} WHERE date = CURDATE()"))->fetchColumn();
    $views7d     = (int)$db->query(q("SELECT COALESCE(SUM(views),0) FROM {page_views} WHERE date >= CURDATE() - INTERVAL 6 DAY"))->fetchColumn();
    $views30d    = (int)$db->query(q("SELECT COALESCE(SUM(views),0) FROM {page_views} WHERE date >= CURDATE() - INTERVAL 29 DAY"))->fetchColumn();
    $uniqueToday = (int)$db->query(q("SELECT COUNT(*) FROM {visitor_log} WHERE date = CURDATE()"))->fetchColumn();
    $unique7d    = (int)$db->query(q("SELECT COUNT(DISTINCT visitor_id) FROM {visitor_log} WHERE date >= CURDATE() - INTERVAL 6 DAY"))->fetchColumn();
    $unique30d   = (int)$db->query(q("SELECT COUNT(DISTINCT visitor_id) FROM {visitor_log} WHERE date >= CURDATE() - INTERVAL 29 DAY"))->fetchColumn();
    $topPages    = $db->query(q(
        "SELECT page, SUM(views) AS total
         FROM {page_views} WHERE date >= CURDATE() - INTERVAL 29 DAY
         GROUP BY page ORDER BY total DESC LIMIT 8"
    ))->fetchAll();
    $chartRows   = $db->query(q(
        "SELECT p.date,
                COALESCE(SUM(p.views), 0)          AS views,
                COALESCE(COUNT(DISTINCT v.visitor_id), 0) AS uniques
         FROM {page_views} p
         LEFT JOIN {visitor_log} v ON v.date = p.date
         WHERE p.date >= CURDATE() - INTERVAL 29 DAY
         GROUP BY p.date ORDER BY p.date ASC"
    ))->fetchAll();
} catch (Exception $e) { /* tables may not exist yet */ }

// Pending review — only for users with publish permission
$pending = ['news' => [], 'projects' => [], 'builders' => []];
if (adminCanPublish()) try {
    if (adminHasSection('news')) {
        $pending['news'] = $db->query(q(
            "SELECT n.id, COALESCE(n.title_en, n.title_fr, '(no title)') AS title,
                    c.name_en AS category, n.created_at
             FROM {news} n LEFT JOIN {news_categories} c ON c.id = n.category_id
             WHERE n.is_published = 0 ORDER BY n.created_at DESC LIMIT 10"
        ))->fetchAll();
    }
    if (adminHasSection('projects')) {
        $pending['projects'] = $db->query(q(
            "SELECT p.id, p.title, pc.name_en AS category, p.submitted_by, p.created_at
             FROM {projects} p LEFT JOIN {project_categories} pc ON pc.id = p.category_id
             WHERE p.is_approved = 0 ORDER BY p.created_at DESC LIMIT 10"
        ))->fetchAll();
    }
    if (adminHasSection('community-builders')) {
        $pending['builders'] = $db->query(q(
            "SELECT id, title, created_at FROM {community_builders}
             WHERE is_visible = 0 ORDER BY created_at DESC LIMIT 10"
        ))->fetchAll();
    }
} catch (Exception $e) { /* tables may not exist yet */ }
$hasPending = !empty($pending['news']) || !empty($pending['projects']) || !empty($pending['builders']);

// Build chart arrays (fill missing days with 0)
$chartLabels  = [];
$chartViews   = [];
$chartUniques = [];
$chartMap     = [];
foreach ($chartRows as $r) {
    $chartMap[$r['date']] = ['views' => (int)$r['views'], 'uniques' => (int)$r['uniques']];
}
for ($i = 29; $i >= 0; $i--) {
    $d = date('Y-m-d', strtotime("-{$i} days"));
    $chartLabels[]  = date('d/m', strtotime($d));
    $chartViews[]   = $chartMap[$d]['views']   ?? 0;
    $chartUniques[] = $chartMap[$d]['uniques'] ?? 0;
}
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-gauge me-2"></i>Dashboard</h1>
</div>

<!-- News & Users -->
<div class="row g-3 mb-4">
    <div class="col-6 col-md-3">
        <div class="card-altered p-3 text-center">
            <div style="font-size:2rem;font-weight:800;color:var(--primary-400)"><?= $totalNews ?></div>
            <div style="font-size:.85rem;color:var(--neutral-600)">Total news</div>
        </div>
    </div>
    <div class="col-6 col-md-3">
        <div class="card-altered p-3 text-center">
            <div style="font-size:2rem;font-weight:800;color:var(--primary-400)"><?= $pubNews ?></div>
            <div style="font-size:.85rem;color:var(--neutral-600)">Published</div>
        </div>
    </div>
    <div class="col-6 col-md-3">
        <div class="card-altered p-3 text-center">
            <div style="font-size:2rem;font-weight:800;color:var(--primary-400)"><?= $cats ?></div>
            <div style="font-size:.85rem;color:var(--neutral-600)">Categories</div>
        </div>
    </div>
    <div class="col-6 col-md-3">
        <div class="card-altered p-3 text-center">
            <div style="font-size:2rem;font-weight:800;color:var(--primary-400)"><?= $totalUsers ?></div>
            <div style="font-size:.85rem;color:var(--neutral-600)">
                Users
                <span class="text-muted" style="font-size:.75rem">(<?= $kcUsers ?> KC · <?= $adminUsers ?> admin)</span>
            </div>
        </div>
    </div>
</div>

<?php if ($hasPending): ?>
<!-- Pending review -->
<h6 class="fw-bold mb-3" style="color:var(--neutral-700)">
    <i class="fa-solid fa-clock-rotate-left me-1"></i> Pending review
</h6>
<div class="card-altered p-3 mb-4">
    <?php if (!empty($pending['news'])): ?>
    <div class="mb-3">
        <div class="fw-semibold mb-2" style="font-size:.85rem;color:var(--neutral-600);text-transform:uppercase;letter-spacing:.05em">
            <i class="fa-solid fa-newspaper me-1"></i> News (<?= count($pending['news']) ?>)
        </div>
        <div class="d-flex flex-column gap-1">
        <?php foreach ($pending['news'] as $row): ?>
            <div class="d-flex align-items-center justify-content-between gap-2" style="font-size:.875rem;border-bottom:1px solid var(--sand-200);padding-bottom:.4rem">
                <span class="text-truncate" style="max-width:60%"><?= h($row['title']) ?></span>
                <span class="text-muted" style="font-size:.78rem;white-space:nowrap"><?= h($row['category'] ?? '—') ?> · <?= date('d/m/Y', strtotime($row['created_at'])) ?></span>
                <?php if (adminCanPublish()): ?>
                <a href="<?= BASE_URL ?>/admin/news-edit?id=<?= (int)$row['id'] ?>" class="btn btn-xs btn-outline-primary" style="font-size:.75rem;padding:2px 8px;white-space:nowrap">Review</a>
                <?php endif; ?>
            </div>
        <?php endforeach; ?>
        </div>
    </div>
    <?php endif; ?>

    <?php if (!empty($pending['projects'])): ?>
    <div class="mb-3">
        <div class="fw-semibold mb-2" style="font-size:.85rem;color:var(--neutral-600);text-transform:uppercase;letter-spacing:.05em">
            <i class="fa-solid fa-rocket me-1"></i> Projects (<?= count($pending['projects']) ?>)
        </div>
        <div class="d-flex flex-column gap-1">
        <?php foreach ($pending['projects'] as $row): ?>
            <div class="d-flex align-items-center justify-content-between gap-2" style="font-size:.875rem;border-bottom:1px solid var(--sand-200);padding-bottom:.4rem">
                <span class="text-truncate" style="max-width:55%"><?= h($row['title']) ?></span>
                <span class="text-muted" style="font-size:.78rem;white-space:nowrap"><?= $row['submitted_by'] ? h($row['submitted_by']) . ' · ' : '' ?><?= date('d/m/Y', strtotime($row['created_at'])) ?></span>
                <?php if (adminCanPublish()): ?>
                <a href="<?= BASE_URL ?>/admin/projects-edit?id=<?= (int)$row['id'] ?>" class="btn btn-xs btn-outline-primary" style="font-size:.75rem;padding:2px 8px;white-space:nowrap">Review</a>
                <?php endif; ?>
            </div>
        <?php endforeach; ?>
        </div>
    </div>
    <?php endif; ?>

    <?php if (!empty($pending['builders'])): ?>
    <div>
        <div class="fw-semibold mb-2" style="font-size:.85rem;color:var(--neutral-600);text-transform:uppercase;letter-spacing:.05em">
            <i class="fa-solid fa-hammer me-1"></i> Community Builders (<?= count($pending['builders']) ?>)
        </div>
        <div class="d-flex flex-column gap-1">
        <?php foreach ($pending['builders'] as $row): ?>
            <div class="d-flex align-items-center justify-content-between gap-2" style="font-size:.875rem;border-bottom:1px solid var(--sand-200);padding-bottom:.4rem">
                <span class="text-truncate" style="max-width:65%"><?= h($row['title']) ?></span>
                <span class="text-muted" style="font-size:.78rem;white-space:nowrap"><?= date('d/m/Y', strtotime($row['created_at'])) ?></span>
                <?php if (adminCanPublish()): ?>
                <a href="<?= BASE_URL ?>/admin/community-builders-edit?id=<?= (int)$row['id'] ?>" class="btn btn-xs btn-outline-primary" style="font-size:.75rem;padding:2px 8px;white-space:nowrap">Review</a>
                <?php endif; ?>
            </div>
        <?php endforeach; ?>
        </div>
    </div>
    <?php endif; ?>
</div>
<?php endif; ?>

<!-- Visits -->
<h6 class="fw-bold mb-3" style="color:var(--neutral-700)">
    <i class="fa-solid fa-chart-line me-1"></i> Visits
</h6>
<div class="row g-3 mb-4">
    <div class="col-6 col-md-2">
        <div class="card-altered p-3 text-center">
            <div style="font-size:1.75rem;font-weight:800;color:var(--primary-400)"><?= number_format($viewsToday) ?></div>
            <div style="font-size:.8rem;color:var(--neutral-600)">Views today</div>
        </div>
    </div>
    <div class="col-6 col-md-2">
        <div class="card-altered p-3 text-center">
            <div style="font-size:1.75rem;font-weight:800;color:var(--gold-600)"><?= number_format($uniqueToday) ?></div>
            <div style="font-size:.8rem;color:var(--neutral-600)">Visitors today</div>
        </div>
    </div>
    <div class="col-6 col-md-2">
        <div class="card-altered p-3 text-center">
            <div style="font-size:1.75rem;font-weight:800;color:var(--primary-400)"><?= number_format($views7d) ?></div>
            <div style="font-size:.8rem;color:var(--neutral-600)">Views 7 days</div>
        </div>
    </div>
    <div class="col-6 col-md-2">
        <div class="card-altered p-3 text-center">
            <div style="font-size:1.75rem;font-weight:800;color:var(--gold-600)"><?= number_format($unique7d) ?></div>
            <div style="font-size:.8rem;color:var(--neutral-600)">Visitors 7 days</div>
        </div>
    </div>
    <div class="col-6 col-md-2">
        <div class="card-altered p-3 text-center">
            <div style="font-size:1.75rem;font-weight:800;color:var(--primary-400)"><?= number_format($views30d) ?></div>
            <div style="font-size:.8rem;color:var(--neutral-600)">Views 30 days</div>
        </div>
    </div>
    <div class="col-6 col-md-2">
        <div class="card-altered p-3 text-center">
            <div style="font-size:1.75rem;font-weight:800;color:var(--gold-600)"><?= number_format($unique30d) ?></div>
            <div style="font-size:.8rem;color:var(--neutral-600)">Visitors 30 days</div>
        </div>
    </div>
</div>

<!-- Chart + top pages -->
<div class="row g-3 mb-4">
    <div class="col-lg-8">
        <div class="card-altered p-3">
            <div class="fw-bold mb-3" style="font-size:.9rem;color:var(--neutral-700)">Views per day — last 30 days</div>
            <canvas id="visitsChart" height="100"></canvas>
        </div>
    </div>
    <div class="col-lg-4">
        <div class="card-altered p-3 h-100">
            <div class="fw-bold mb-3" style="font-size:.9rem;color:var(--neutral-700)">Top pages — last 30 days</div>
            <?php if (empty($topPages)): ?>
                <p class="text-muted small mb-0">No data yet.</p>
            <?php else: ?>
                <?php
                $maxViews = max(array_column($topPages, 'total')) ?: 1;
                foreach ($topPages as $p):
                    $pct = round((int)$p['total'] / $maxViews * 100);
                ?>
                <div class="mb-2">
                    <div class="d-flex justify-content-between" style="font-size:.82rem">
                        <span style="color:var(--neutral-700)"><?= h($p['page']) ?></span>
                        <span class="fw-bold" style="color:var(--primary-400)"><?= number_format((int)$p['total']) ?></span>
                    </div>
                    <div style="height:4px;background:var(--sand-300);border-radius:2px;margin-top:2px">
                        <div style="height:4px;width:<?= $pct ?>%;background:var(--primary-400);border-radius:2px"></div>
                    </div>
                </div>
                <?php endforeach; ?>
            <?php endif; ?>
        </div>
    </div>
</div>


<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.min.js"></script>
<script>
new Chart(document.getElementById('visitsChart'), {
    type: 'bar',
    data: {
        labels: <?= json_encode($chartLabels) ?>,
        datasets: [
            {
                label: 'Views',
                data: <?= json_encode($chartViews) ?>,
                backgroundColor: 'rgba(201,168,76,.5)',
                borderColor: 'rgba(201,168,76,1)',
                borderWidth: 1,
                borderRadius: 3,
            },
            {
                label: 'Visitors',
                data: <?= json_encode($chartUniques) ?>,
                backgroundColor: 'rgba(83,75,64,.35)',
                borderColor: 'rgba(83,75,64,.8)',
                borderWidth: 1,
                borderRadius: 3,
            }
        ]
    },
    options: {
        plugins: {
            legend: { display: true, position: 'top', labels: { font: { size: 11 } } }
        },
        scales: {
            x: { grid: { display: false }, ticks: { font: { size: 10 }, maxTicksLimit: 10 } },
            y: { beginAtZero: true, ticks: { precision: 0 } }
        }
    }
});
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
