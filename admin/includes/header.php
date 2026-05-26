<?php
ob_start();
// Admin header — included at top of every admin page
// Expects $adminPageTitle (string) and optionally $adminSection (string) to be set by the including page
require_once dirname(__DIR__, 2) . '/config.php';
require_once dirname(__DIR__, 2) . '/includes/functions.php';
requireAdmin();

// SA group preview handler
if (canPreviewGroups() && $_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['_sa_preview'])) {
    if (csrfValid($_POST['csrf_token'] ?? '')) {
        $_saGid = (int)($_POST['_sa_preview_gid'] ?? 0);
        if ($_saGid > 0) {
            $_SESSION['sa_preview_group_id'] = $_saGid;
        } else {
            unset($_SESSION['sa_preview_group_id']);
        }
    }
    $back = $_POST['_back'] ?? '';
    // Only allow same-site redirects (must start with BASE_URL/)
    if ($back === '' || strpos($back, BASE_URL . '/') !== 0 || preg_match('#^[a-z][a-z+\-.]*://#i', $back)) {
        $back = BASE_URL . '/admin/';
    }
    redirect($back);
}

// Section-level access check
if (isset($adminSection) && !adminHasSection($adminSection)) {
    flash('Access denied — you do not have permission to access this section.', 'error');
    header('Location: ' . BASE_URL . '/admin/');
    exit;
}
if (isset($adminSection) && $adminSection !== '') {
    adminSetSection($adminSection);
}

$adminUser    = $_SESSION['admin_username'] ?? ($_SESSION['kc_username'] ?? 'Admin');
$currentAdmin = basename($_SERVER['PHP_SELF'], '.php');
$flash        = getFlash();
$_saBack      = BASE_URL . '/admin/' . basename($_SERVER['PHP_SELF']);

// Group badge for KC users in the topbar
$_adminGroup = (!empty($_SESSION['admin_logged_in'])) ? null : adminGetUserGroup();

// SA preview — load groups for dropdown
$_saGroups     = [];
$_saPreviewId  = (int)($_SESSION['sa_preview_group_id'] ?? 0);
$_saPreviewName = '';
if (canPreviewGroups()) {
    try {
        $_saGroups = getDB()->query(q("SELECT id, name, color FROM {user_groups} ORDER BY name ASC"))->fetchAll();
    } catch (Exception $e) {}
    if ($_saPreviewId) {
        foreach ($_saGroups as $_sg) {
            if ((int)$_sg['id'] === $_saPreviewId) { $_saPreviewName = $_sg['name']; break; }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= isset($adminPageTitle) ? h($adminPageTitle) . ' — ' : '' ?>Admin – <?= h(getSiteName()) ?></title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="stylesheet" href="<?= BASE_URL ?>/assets/font/alteredicons.css">
    <link rel="stylesheet" href="<?= BASE_URL ?>/css/style.css">
</head>
<body>
<div class="admin-wrapper">

    <!-- Sidebar -->
    <aside class="admin-sidebar">
        <div class="sidebar-brand">
            <a href="<?= BASE_URL ?>/admin/"><?= h(getSiteName()) ?></a>
            <small>Administration</small>
        </div>
        <div class="sidebar-user">
            <i class="fa-solid fa-user-shield" style="font-size:.75rem"></i>
            <span><?= h($adminUser) ?></span>
            <?php if ($_adminGroup): ?>
                <span class="badge" style="background:<?= h($_adminGroup['color']) ?>;color:#fff;font-size:.68rem;font-weight:700;padding:2px 8px;border-radius:20px"
                      title="<?= h($_adminGroup['name']) ?>">
                    <?php if (!empty($_adminGroup['icon'])): ?>
                    <i class="<?= h($_adminGroup['icon']) ?>"></i>
                    <?php else: ?>
                    <?= h($_adminGroup['name']) ?>
                    <?php endif; ?>
                </span>
            <?php elseif (!empty($_SESSION['admin_logged_in'])): ?>
                <span class="badge" style="background:#f59e0b;color:#fff;font-size:.68rem;font-weight:700;padding:2px 8px;border-radius:20px"
                      title="Super Admin">
                    <i class="fa-solid fa-shield-halved"></i>
                </span>
            <?php endif; ?>
        </div>
        <?php if (canPreviewGroups()): ?>
        <div style="margin:.5rem 1rem .75rem;padding:.55rem .7rem;background:var(--neutral-800);border-radius:6px;border:1px solid var(--neutral-600)">
            <?php if ($_saPreviewId): ?>
            <div style="font-size:.68rem;color:var(--neutral-400);margin-bottom:.35rem">
                <i class="fa-solid fa-eye me-1"></i>Viewing as <strong style="color:#fff"><?= h($_saPreviewName) ?></strong>
            </div>
            <form method="post" action="<?= h($_saBack) ?>">
                <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                <input type="hidden" name="_sa_preview" value="1">
                <input type="hidden" name="_sa_preview_gid" value="0">
                <input type="hidden" name="_back" value="<?= h($_saBack) ?>">
                <button type="submit" class="btn btn-sm btn-outline-secondary w-100" style="font-size:.68rem">
                    <i class="fa-solid fa-xmark me-1"></i>Exit preview
                </button>
            </form>
            <?php else: ?>
            <form method="post" action="<?= h($_saBack) ?>" class="d-flex gap-1">
                <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                <input type="hidden" name="_sa_preview" value="1">
                <input type="hidden" name="_back" value="<?= h($_saBack) ?>">
                <select name="_sa_preview_gid" class="form-select form-select-sm" style="font-size:.68rem">
                    <option value="">View as…</option>
                    <?php foreach ($_saGroups as $_sg): ?>
                    <option value="<?= (int)$_sg['id'] ?>"><?= h($_sg['name']) ?></option>
                    <?php endforeach; ?>
                </select>
                <button type="submit" class="btn btn-sm btn-outline-secondary flex-shrink-0" title="Preview as group">
                    <i class="fa-solid fa-eye"></i>
                </button>
            </form>
            <?php endif; ?>
        </div>
        <?php endif; ?>
        <nav>
            <?php if (adminHasSection('dashboard')): ?>
            <a href="<?= BASE_URL ?>/admin/"
               class="nav-link <?= $currentAdmin === 'index' ? 'active' : '' ?>">
                <i class="fa-solid fa-gauge"></i> Dashboard
            </a>
            <?php endif; ?>

            <?php if (adminHasSection('news') || adminHasSection('projects') || adminHasSection('project-categories') || adminHasSection('homepage') || adminHasSection('pages')): ?>
            <hr style="border-color:var(--neutral-600);margin:0.75rem 1rem">
            <?php endif; ?>

            <?php if (adminHasSection('news')): ?>
            <a href="<?= BASE_URL ?>/admin/news"
               class="nav-link <?= in_array($currentAdmin, ['news','news-edit','news-delete']) ? 'active' : '' ?>">
                <i class="fa-solid fa-newspaper"></i> News
            </a>
            <?php if (adminHasSection('categories')): ?>
            <a href="<?= BASE_URL ?>/admin/categories"
               class="nav-link <?= in_array($currentAdmin, ['categories','categories-edit','categories-delete']) ? 'active' : '' ?>"
               style="padding-left:2rem;font-size:.9em">
                <i class="fa-solid fa-tags"></i> Categories
            </a>
            <?php endif; ?>
            <?php if (adminHasSection('rss')): ?>
            <a href="<?= BASE_URL ?>/admin/rss"
               class="nav-link <?= in_array($currentAdmin, ['rss','rss-edit']) ? 'active' : '' ?>"
               style="padding-left:2rem;font-size:.9em">
                <i class="fa-solid fa-rss"></i> RSS Feeds
            </a>
            <?php endif; ?>
            <?php endif; ?>

            <?php if (adminHasSection('projects')): ?>
            <a href="<?= BASE_URL ?>/admin/projects"
               class="nav-link <?= in_array($currentAdmin, ['projects','projects-edit']) ? 'active' : '' ?>">
                <i class="fa-solid fa-rocket"></i> Projects
            </a>
            <?php endif; ?>
            <?php if (adminHasSection('project-categories')): ?>
            <a href="<?= BASE_URL ?>/admin/project-categories"
               class="nav-link <?= in_array($currentAdmin, ['project-categories','project-categories-edit','project-categories-delete']) ? 'active' : '' ?>"
               style="padding-left:2rem;font-size:.9em">
                <i class="fa-solid fa-tags"></i> Categories
            </a>
            <?php endif; ?>
            <?php if (adminHasSection('community-builders')): ?>
            <a href="<?= BASE_URL ?>/admin/community-builders"
               class="nav-link <?= in_array($currentAdmin, ['community-builders','community-builders-edit']) ? 'active' : '' ?>">
                <i class="fa-solid fa-screwdriver-wrench"></i> Community Builders
            </a>
            <?php endif; ?>

            <?php if (adminHasSection('homepage')): ?>
            <a href="<?= BASE_URL ?>/admin/homepage"
               class="nav-link <?= $currentAdmin === 'homepage' ? 'active' : '' ?>">
                <i class="fa-solid fa-house"></i> Homepage
            </a>
            <?php endif; ?>
            <?php if (adminHasSection('pages')): ?>
            <a href="<?= BASE_URL ?>/admin/pages"
               class="nav-link <?= in_array($currentAdmin, ['pages','page-edit']) ? 'active' : '' ?>">
                <i class="fa-solid fa-file-code"></i> Pages
            </a>
            <?php endif; ?>
            <?php if (adminHasSection('media')): ?>
            <a href="<?= BASE_URL ?>/admin/media"
               class="nav-link <?= $currentAdmin === 'media' ? 'active' : '' ?>">
                <i class="fa-solid fa-images"></i> Media Library
            </a>
            <?php endif; ?>

            <?php $__showSettings = (bool) array_filter(['settings','themes','banner','announcement','background','logo','font','nav','sidebar','user-menu','footer','privacy','shortcodes'], 'adminHasSection'); ?>
            <?php if ($__showSettings): ?>
            <hr style="border-color:var(--neutral-600);margin:0.75rem 1rem">
            <?php endif; ?>

            <?php if ($__showSettings): ?>
            <a href="<?= BASE_URL ?>/admin/settings"
               class="nav-link <?= in_array($currentAdmin, ['settings','banner','announcements','announcement-edit','background','logo','font','nav','user-menu','footer','footer-link-edit','privacy','shortcodes','shortcode-edit','themes']) ? 'active' : '' ?>">
                <i class="fa-solid fa-gear"></i> Settings
            </a>
            <?php if (adminHasSection('themes')): ?>
            <a href="<?= BASE_URL ?>/admin/themes"
               class="nav-link <?= $currentAdmin === 'themes' ? 'active' : '' ?>"
               style="padding-left:2rem;font-size:.9em">
                <i class="fa-solid fa-palette"></i> Themes
            </a>
            <?php endif; ?>
            <?php if (adminHasSection('banner')): ?>
            <a href="<?= BASE_URL ?>/admin/banner"
               class="nav-link <?= $currentAdmin === 'banner' ? 'active' : '' ?>"
               style="padding-left:2rem;font-size:.9em">
                <i class="fa-solid fa-image"></i> Banner
            </a>
            <?php endif; ?>
            <?php if (adminHasSection('announcement')): ?>
            <a href="<?= BASE_URL ?>/admin/announcements"
               class="nav-link <?= in_array($currentAdmin, ['announcements','announcement-edit']) ? 'active' : '' ?>"
               style="padding-left:2rem;font-size:.9em">
                <i class="fa-solid fa-bullhorn"></i> Announcements
            </a>
            <?php endif; ?>
            <?php if (adminHasSection('background')): ?>
            <a href="<?= BASE_URL ?>/admin/background"
               class="nav-link <?= $currentAdmin === 'background' ? 'active' : '' ?>"
               style="padding-left:2rem;font-size:.9em">
                <i class="fa-solid fa-fill-drip"></i> Background
            </a>
            <?php endif; ?>
            <?php if (adminHasSection('logo')): ?>
            <a href="<?= BASE_URL ?>/admin/logo"
               class="nav-link <?= $currentAdmin === 'logo' ? 'active' : '' ?>"
               style="padding-left:2rem;font-size:.9em">
                <i class="fa-solid fa-circle-half-stroke"></i> Logo
            </a>
            <?php endif; ?>
            <?php if (adminHasSection('font')): ?>
            <a href="<?= BASE_URL ?>/admin/font"
               class="nav-link <?= $currentAdmin === 'font' ? 'active' : '' ?>"
               style="padding-left:2rem;font-size:.9em">
                <i class="fa-solid fa-font"></i> Font
            </a>
            <?php endif; ?>
            <?php if (adminHasSection('nav')): ?>
            <a href="<?= BASE_URL ?>/admin/nav"
               class="nav-link <?= in_array($currentAdmin, ['nav','nav-edit']) ? 'active' : '' ?>"
               style="padding-left:2rem;font-size:.9em">
                <i class="fa-solid fa-bars"></i> Navigation
            </a>
            <?php endif; ?>
            <?php if (adminHasSection('sidebar')): ?>
            <a href="<?= BASE_URL ?>/admin/sidebar"
               class="nav-link <?= in_array($currentAdmin, ['sidebar','sidebar-edit']) ? 'active' : '' ?>"
               style="padding-left:2rem;font-size:.9em">
                <i class="fa-solid fa-table-columns"></i> Sidebar
            </a>
            <?php endif; ?>
            <?php if (adminHasSection('user-menu')): ?>
            <a href="<?= BASE_URL ?>/admin/user-menu"
               class="nav-link <?= in_array($currentAdmin, ['user-menu','user-menu-edit']) ? 'active' : '' ?>"
               style="padding-left:2rem;font-size:.9em">
                <i class="fa-solid fa-user-gear"></i> User Menu
            </a>
            <?php endif; ?>
            <?php if (adminHasSection('footer')): ?>
            <a href="<?= BASE_URL ?>/admin/footer"
               class="nav-link <?= in_array($currentAdmin, ['footer','footer-link-edit']) ? 'active' : '' ?>"
               style="padding-left:2rem;font-size:.9em">
                <i class="fa-solid fa-shoe-prints"></i> Footer
            </a>
            <?php endif; ?>
            <?php if (adminHasSection('privacy')): ?>
            <a href="<?= BASE_URL ?>/admin/privacy"
               class="nav-link <?= $currentAdmin === 'privacy' ? 'active' : '' ?>"
               style="padding-left:2rem;font-size:.9em">
                <i class="fa-solid fa-shield-halved"></i> Privacy / GDPR
            </a>
            <?php endif; ?>
            <?php if (adminHasSection('shortcodes')): ?>
            <a href="<?= BASE_URL ?>/admin/shortcodes"
               class="nav-link <?= in_array($currentAdmin, ['shortcodes','shortcode-edit']) ? 'active' : '' ?>"
               style="padding-left:2rem;font-size:.9em">
                <i class="fa-solid fa-code"></i> Shortcodes
            </a>
            <?php endif; ?>
            <?php endif; ?>

            <?php if (adminHasSection('users') || adminHasSection('groups') || adminHasSection('maintenance') || adminHasSection('altered-json')): ?>
            <hr style="border-color:var(--neutral-600);margin:0.75rem 1rem">
            <?php endif; ?>

            <?php if (adminHasSection('users')): ?>
            <a href="<?= BASE_URL ?>/admin/users"
               class="nav-link <?= in_array($currentAdmin, ['users','user-edit']) ? 'active' : '' ?>">
                <i class="fa-solid fa-users"></i> Users
            </a>
            <?php if (adminHasSection('groups')): ?>
            <a href="<?= BASE_URL ?>/admin/groups"
               class="nav-link <?= in_array($currentAdmin, ['groups','group-edit']) ? 'active' : '' ?>"
               style="padding-left:2rem;font-size:.9em">
                <i class="fa-solid fa-layer-group"></i> Groups
            </a>
            <?php endif; ?>
            <?php endif; ?>
            <?php if (adminHasSection('maintenance')): ?>
            <a href="<?= BASE_URL ?>/admin/maintenance"
               class="nav-link <?= $currentAdmin === 'maintenance' ? 'active' : '' ?>"
               <?= getSetting('maintenance_enabled') === '1' ? 'style="color:#f87171"' : '' ?>>
                <i class="fa-solid fa-triangle-exclamation"></i> Maintenance
            </a>
            <?php endif; ?>

            <?php
            // Plugin admin sections
            initPlugins();
            $_pluginSections   = pluginsGetAdminSections();
            $_hasPluginSection = false;
            foreach ($_pluginSections as $_ps) {
                if (adminHasSection($_ps['section'])) { $_hasPluginSection = true; break; }
            }
            if ($_hasPluginSection): ?>
            <hr style="border-color:var(--neutral-600);margin:0.75rem 1rem">
            <?php foreach ($_pluginSections as $_ps):
                if (!adminHasSection($_ps['section'])) continue;
                $_pluginUrl    = BASE_URL . '/admin/plugin-page?plugin=' . urlencode($_ps['plugin_id']) . '&section=' . urlencode($_ps['section']);
                $_pluginActive = ($currentAdmin === 'plugin-page' && ($_GET['section'] ?? '') === $_ps['section'] && ($_GET['plugin'] ?? '') === $_ps['plugin_id']);
            ?>
            <a href="<?= h($_pluginUrl) ?>" class="nav-link <?= $_pluginActive ? 'active' : '' ?>">
                <i class="<?= h($_ps['icon'] ?? 'fa-solid fa-puzzle-piece') ?>"></i>
                <?= h($_ps['label_en'] ?? $_ps['section']) ?>
            </a>
            <?php endforeach; ?>
            <?php endif; ?>

            <?php if (!empty($_SESSION['admin_logged_in'])): ?>
            <hr style="border-color:var(--neutral-600);margin:0.75rem 1rem">
            <a href="<?= BASE_URL ?>/admin/plugins"
               class="nav-link <?= $currentAdmin === 'plugins' ? 'active' : '' ?>">
                <i class="fa-solid fa-puzzle-piece"></i> Plugins
            </a>
            <?php endif; ?>

            <hr style="border-color:var(--neutral-600);margin:0.75rem 1rem">
            <a href="<?= BASE_URL ?>/" target="_blank" class="nav-link">
                <i class="fa-solid fa-arrow-up-right-from-square"></i> View site
            </a>
            <a href="<?= BASE_URL ?>/admin/logout" class="nav-link" style="color:#f87171">
                <i class="fa-solid fa-right-from-bracket"></i> Log out
            </a>
        </nav>
    </aside>
    <div class="admin-sidebar-overlay" id="adminSidebarOverlay"></div>

    <!-- Main content -->
    <div class="admin-main">
        <!-- Topbar (mobile only) -->
        <div class="admin-topbar">
            <div class="admin-topbar-left">
                <button class="admin-menu-toggle" id="adminMenuToggle" aria-label="Menu">
                    <i class="fa-solid fa-bars"></i>
                </button>
                <a href="<?= BASE_URL ?>/admin/" class="admin-topbar-brand">
                    <?= h(getSiteName()) ?> <span class="admin-topbar-brand-suffix">— Admin</span>
                </a>
            </div>
        </div>
        <?php if ($_saPreviewId): ?>
        <div class="alert mb-3 d-flex align-items-center justify-content-between" style="background:#78350f;color:#fef3c7;border:none;border-radius:8px;font-size:.85rem" role="alert">
            <span><i class="fa-solid fa-eye me-2"></i>Preview mode — viewing as <strong><?= h($_saPreviewName) ?></strong></span>
            <form method="post" action="<?= h($_saBack) ?>" class="ms-3 mb-0">
                <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                <input type="hidden" name="_sa_preview" value="1">
                <input type="hidden" name="_sa_preview_gid" value="0">
                <input type="hidden" name="_back" value="<?= h($_saBack) ?>">
                <button type="submit" class="btn btn-sm" style="background:#92400e;color:#fef3c7;border:none;font-size:.8rem">
                    <i class="fa-solid fa-xmark me-1"></i>Exit
                </button>
            </form>
        </div>
        <?php endif; ?>
        <?php if ($flash): ?>
            <div class="alert alert-<?= $flash['type'] === 'success' ? 'success' : 'danger' ?> alert-dismissible fade show mb-3" role="alert">
                <?= h($flash['msg']) ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        <?php endif; ?>
