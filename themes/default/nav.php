<?php
// default theme navigation
// Variables provided by includes/header.php:
//   $lang, $currentPage, $__navItems, $__iframeNavId
//   $_langFlags, $_langNames, $_langUrls, $_hTxt, $__mobileCompact

$__iframeNavId    = ($currentPage === 'iframe') ? (int)($_GET['nav'] ?? 0) : 0;
$__sidebarBtnPos  = getSetting('sidebar_btn_position', 'nav');
$__sidebarToggle  = null;
foreach ($__navItems as $__n) { if (!empty($__n['is_sidebar_toggle'])) { $__sidebarToggle = $__n; break; } }
if (!function_exists('__nav_href')) {
    function __nav_href(array $item): string {
        if (!empty($item['is_iframe'])) {
            return BASE_URL . '/pages/iframe?nav=' . (int)$item['id'];
        }
        return BASE_URL . resolveUrlLang($item['url']);
    }
}
if (!function_exists('__nav_active')) {
    function __nav_active(array $item, string $currentPage, int $iframeNavId): bool {
        if (!empty($item['is_iframe'])) return $iframeNavId === (int)$item['id'];
        $__parsed = parse_url($item['url'] ?? '');
        if (!empty($__parsed['host'])) return false;
        $__p = basename($__parsed['path'] ?? '', '.php');
        if ($__p === '') $__p = 'index';
        return $currentPage === $__p;
    }
}
?>

<header class="site-header">
    <nav class="altered-navbar navbar navbar-expand-md">
        <div class="container-fluid px-0">

            <!-- Logo + site name (always visible) -->
            <a class="navbar-brand me-2" href="<?= BASE_URL ?>/" title="<?= h(getSiteName()) ?>">
                <?php $__logoPath = getSetting('logo_path'); if ($__logoPath): ?>
                <img src="<?= h(assetUrl($__logoPath)) ?>" alt="<?= h(getSiteName()) ?>" class="navbar-logo-custom">
                <?php else: ?>
                <svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" fill="none">
                    <path fill="#534B40" d="M23.845 24.384c.756-.806 1.266-1.678 1.431-2.774.191-1.29.092-2.67-.12-3.981-.236-1.445-1.063-2.544-2.06-3.567-.207-.215-.471-.395-.623-.639-.641-1.047-1.83-1.28-2.826-1.782l-.921-.591c-1.764-.44-3.515-.131-5.26.073-.257.029-.516.227-.726.4-.67.563-1.316 1.15-1.97 1.728-.063.054-.134.143-.2.143-.709 0-.874.537-1.046 1.021-.191.531-.312 1.084-.448 1.57.131.163.327.306.382.492.176.584.367 1.136.987 1.432.084.04.139.152.194.238.445.696 1.19.856 1.944.427.134-.076.301-.176.437-.157.668.078 1.102-.21 1.222-.856.348-1.856 2.212-2.863 4.154-2.664 1.044.107 1.724.489 2.476.96.554.346 1.248 1.102 1.706 1.6 1.227 1.334 1.766 2.839 1.596 4.425-.068.62-.384 1.813-.33 2.507z"/>
                    <path fill="#534B40" d="m28.26 14.577-.435-.74-.261-1.348-.794-1.759v-.746c0-.371-.122-.33-.33-.91a2 2 0 0 0-.096-.22V5.535c-.024-.036-.07-2.093 0-2.107V.843A.84.84 0 0 0 25.5 0h-2.667a.3.3 0 0 0-.138.037c-.566.311-1.361.3-1.584.023-.028-.034-.065-.06-.11-.06H3.714a.87.87 0 0 0-.872.871v6.575c0 .018.005.039.021.05.115.088.28.887.076 1.083-.042.042-.097.081-.097.15v5.437c.39-1.188.953-2.384 1.641-3.611.134-.236.223-.518.322-.743.332-.752.74-1.079 1.494-1.717 1.22-.812 2.583-1.39 3.905-2.057-1.026-.37-2.164.259-3.025-.163 1.013-.947 2.237-1.292 3.572-1.264.89.021 1.777.168 2.664.244 1.207.102 2.453-.343 3.628.212 1.177.555 2.35 1.122 3.507 1.722.342.178.617.484.923.73l-.086.136c-.34-.107-.68-.22-1.023-.322-2.309-.683-4.68-.667-7.048-.58-.686.025-1.432.065-2.036.342-.96.442-1.832 1.086-2.732 1.654-.116.07-.288.233-.267.306.151.547-.226.832-.558 1.086-1.13.87-1.72 2.055-2.112 3.374-.144.479-.28.968-.497 1.416-.61 1.261-.416 2.557-.2 3.847.064.366.242.706.522.95.803.706 1.384 1.481 1.478 2.599.048.544.456.638.956.416.199-.09.539-.105.743-.03.51.192.979.482 1.484.692.837.348 1.617-.06 2.423-.202.778-.136 1.264-.596 1.701-1.198.322-.443.673-.89 1.094-1.23.393-.314.827-.524 1.042-1.047.086-.21.487-.354.77-.409.881-.175 1.69.233 2.156 1.021.78 1.32.615 2.748.45 4.159-.047.395-.515.761-.508 1.136.016.612-.261.916-.698 1.203a6 6 0 0 0-.859.689c-1.274 1.246-2.876 1.662-4.559 1.646-2.667-.026-4.74-1.413-6.637-3.127-.12-.11-.317-.207-.468-.197-.652.047-1.186-.322-1.432-.968q-.164-.44-.372-.869a11 11 0 0 0-.643-.442c-.197-.118-.474-.532-.717-.984v.063l-.317-.335-.372-.704-.248-.704v-.953s.083-.785.165-1.118c.08-.332-.207-1.033-.291-1.24s-.123-.414-.207-.62-.337-1.026-.337-1.4c0-.375-.118-1.29-.118-1.29s.207-1.118.413-1.78c.207-.663-.206-.414-.206-.414l-.33.29-.372.953-.371 1.034-.123 1.199.083 1.198-.042 1.283-.083.827-.084.91.123.746.207.62c.123.372.123.291.371.746.249.456.165 1.408.165 1.408s.084.249.207.456.123.248.372.62c.248.372.29.785.29.785l.165.953.249.539.371.662s.12.189.317.411v7.192c0 .56.35 1.057.88 1.243l10.588 3.758c.29.102.605.102.895-.005l4.926-1.798a.13.13 0 0 0 .078-.081c.087-.333 1.243-.573 1.356-.526.115.047.125.039.125.039l3.701-1.35c.57-.21.95-.752.95-1.359V26.81a6.3 6.3 0 0 1-1.77 1.85.6.6 0 0 0-.188.26c-.222.551-.675.797-1.222.855-1.102.12-2.02.639-2.91 1.243-.288.196-.568.44-.89.537-.28.083-2.774 1.015-2.986 1.026-1.08.06-2.211.25-3.24.026-1.539-.34-3.017-1.228-4.499-1.79-.39-.147-.717-.49-1.03-.788-.113-.105-.098-.343-.142-.518.18-.045.36-.123.539-.118.141.005.298.089.413.178 1.327 1.044 2.979 1.041 4.518 1.387.117.026.253-.026.379-.05q.699-.14 1.398-.293c.761-.167 1.538-.296 2.282-.523.67-.207 1.436-.215 1.74-1.157.144-.442.798-.801 1.298-1.029.963-.44.987-1.476 1.539-2.167.044-.055.005-.17.018-.256.063-.471.116-.948.197-1.416.112-.644.5-1.28-.006-1.926-.055-.068-.018-.212-.015-.32.083-2.038-1.128-4.723-3.67-4.933-1.373-.112-1.625-.089-2.164 1.24-.419 1.032-1.138 1.728-2.235 2.032-.183.05-.353.214-.481.366-.492.573-1.924.99-2.597.683-1.646-.751-2.577-2.117-3.143-3.768-.17-.495.118-1.139-.502-1.492-.05-.03-.042-.21-.021-.31.387-1.734 1.185-3.252 2.444-4.516.081-.084.23-.1.346-.152.447-.207.897-.408 1.34-.623.678-.327 1.334-.699 2.028-.984 1.5-.618 3.083-.434 4.63-.3 1.083.09 2.177.214 3.093 1.075.641.602 1.466.976 2.327 1.149.774.157 1.107.591 1.465 1.159.212.335.463.667.764.921.464.39.707 1.084.76 1.249.052.164.413.36.622.617.372.456.202.293.45.749.249.455.042.785.123 1.282.084.497.29.414.249.827-.042.414.123.579.372 1.16.248.578.165.826.248 1.324.084.497.123 1.16.29 1.821.168.662.372-.869.372-1.366s.186-1.253.186-1.253.066-2.306-.065-2.74l-.74-2.458z"/>
                </svg>
                <?php endif; ?>
                <span class="navbar-site-name"><?= h(getSiteName()) ?></span>
            </a>
            <?php if ($__sidebarBtnPos === 'brand' && $__sidebarToggle !== null): ?>
            <button type="button" data-sidebar-toggle class="nav-link"
                    <?= !empty($__sidebarToggle['hide_label']) ? 'title="' . h($__sidebarToggle['label']) . '"' : '' ?>>
                <i class="<?= h($__sidebarToggle['icon']) ?>"></i>
                <?php if (empty($__sidebarToggle['hide_label'])): ?>
                <span><?= h($__sidebarToggle['label']) ?></span>
                <?php endif; ?>
            </button>
            <?php endif; ?>

            <!-- Burger (mobile only, shown automatically by navbar-expand-md) -->
            <button class="navbar-toggler" type="button"
                    data-bs-toggle="collapse" data-bs-target="#mainNav"
                    aria-controls="mainNav" aria-expanded="false" aria-label="Menu">
                <i class="fa-solid fa-bars"></i>
            </button>

            <!-- Collapsible content -->
            <div class="collapse navbar-collapse" id="mainNav">
                <ul class="navbar-nav mx-auto gap-1">
                    <?php foreach ($__navItems as $__ni):
                        $__niActive = empty($__ni['is_sidebar_toggle']) && __nav_active($__ni, $currentPage, $__iframeNavId);
                        if (!$__niActive && !empty($__ni['children'])) {
                            foreach ($__ni['children'] as $__nc) {
                                if (__nav_active($__nc, $currentPage, $__iframeNavId)) {
                                    $__niActive = true; break;
                                }
                            }
                        }
                    ?>
                    <?php if (!empty($__ni['is_sidebar_toggle'])): ?>
                        <?php if ($__sidebarBtnPos === 'nav'): ?>
                        <li class="nav-item">
                            <button type="button" data-sidebar-toggle
                                    class="nav-link"
                                    <?= !empty($__ni['hide_label']) ? 'title="' . h($__ni['label']) . '"' : '' ?>>
                                <i class="<?= h($__ni['icon']) ?>"></i>
                                <?php if (empty($__ni['hide_label'])): ?>
                                <span><?= h($__ni['label']) ?></span>
                                <?php endif; ?>
                            </button>
                        </li>
                        <?php endif; ?>
                    <?php elseif (!empty($__ni['children'])): ?>
                        <li class="nav-item dropdown">
                            <a href="#" class="nav-link dropdown-toggle <?= $__niActive ? 'active' : '' ?>"
                               data-bs-toggle="dropdown" aria-expanded="false"
                               <?= !empty($__ni['hide_label']) ? 'title="' . h($__ni['label']) . '"' : '' ?>>
                                <i class="<?= h($__ni['icon']) ?>"></i>
                                <?php if (empty($__ni['hide_label'])): ?>
                                <span><?= h($__ni['label']) ?></span>
                                <?php endif; ?>
                            </a>
                            <ul class="dropdown-menu">
                                <?php foreach ($__ni['children'] as $__nc): ?>
                                <li>
                                    <a class="dropdown-item <?= __nav_active($__nc, $currentPage, $__iframeNavId) ? 'active' : '' ?>"
                                       href="<?= h(__nav_href($__nc)) ?>"
                                       <?= (!empty($__nc['is_blank']) && empty($__nc['is_iframe'])) ? 'target="_blank" rel="noopener noreferrer"' : '' ?>>
                                        <?php if (!empty($__nc['icon'])): ?>
                                            <i class="<?= h($__nc['icon']) ?> me-1"></i>
                                        <?php endif; ?>
                                        <?= h($__nc['label']) ?>
                                    </a>
                                </li>
                                <?php endforeach; ?>
                            </ul>
                        </li>
                    <?php else: ?>
                        <li class="nav-item">
                            <a href="<?= h(__nav_href($__ni)) ?>"
                               class="nav-link <?= $__niActive ? 'active' : '' ?>"
                               <?= (!empty($__ni['is_blank']) && empty($__ni['is_iframe'])) ? 'target="_blank" rel="noopener noreferrer"' : '' ?>
                               <?= !empty($__ni['hide_label']) ? 'title="' . h($__ni['label']) . '"' : '' ?>>
                                <i class="<?= h($__ni['icon']) ?>"></i>
                                <?php if (empty($__ni['hide_label'])): ?>
                                <span><?= h($__ni['label']) ?></span>
                                <?php endif; ?>
                            </a>
                        </li>
                    <?php endif; ?>
                    <?php endforeach; ?>
                </ul>

                <!-- Right side: theme toggle + language + user menu / login button -->
                <div class="d-flex align-items-center gap-2 navbar-right">
                    <button id="header-theme-toggle" class="btn-theme-toggle-ac"
                            data-label-dark="<?= h($_hTxt['dark_mode']) ?>" data-label-light="<?= h($_hTxt['light_mode']) ?>"
                            aria-label="Toggle dark mode">
                        <i class="fa-solid fa-moon"></i>
                    </button>
                    <!-- Language dropdown -->
                    <div class="dropdown dropdown-lang" style="display:flex;align-items:center">
                        <button class="btn-theme-toggle-ac" type="button"
                                data-bs-toggle="dropdown" aria-expanded="false"
                                title="<?= h($_langNames[$lang] ?? 'Language') ?>"
                                style="line-height:1;display:inline-flex;align-items:center">
                            <?= $_langFlags[$lang] ?? '🌐' ?>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end" style="min-width:auto">
                            <?php foreach ($_langFlags as $_l => $_flag): ?>
                            <li>
                                <a class="dropdown-item <?= $lang === $_l ? 'active' : '' ?>"
                                   href="<?= h($_langUrls[$_l]) ?>"
                                   title="<?= h($_langNames[$_l]) ?>">
                                    <?= $_flag ?>
                                </a>
                            </li>
                            <?php endforeach; ?>
                        </ul>
                    </div>
                    <?php if (kcIsLoggedIn()):
                        $kcU = kcUser(); ?>
                        <div class="dropdown">
                            <button class="btn-user-badge dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                <i class="fa-solid fa-user me-1"></i>
                                <span><?= h($kcU['username']) ?></span>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end">
                                <?php foreach (getUserMenuItems() as $__mi): ?>
                                    <?php if ($__mi['type'] === 'separator'): ?>
                                        <li><hr class="dropdown-divider"></li>
                                    <?php elseif ($__mi['type'] === 'system'): ?>
                                        <?php if ($__mi['system_key'] === 'email_display'): ?>
                                            <li><span class="dropdown-item-text small text-muted"><?= h($kcU['email']) ?></span></li>
                                        <?php elseif ($__mi['system_key'] === 'account'): ?>
                                            <li>
                                                <a class="dropdown-item" href="<?= BASE_URL ?>/pages/account">
                                                    <i class="fa-solid fa-user me-1"></i>
                                                    <?= h($__mi['label'] ?: $_hTxt['my_account']) ?>
                                                </a>
                                            </li>
                                        <?php elseif ($__mi['system_key'] === 'logout'): ?>
                                            <?php $_logoutUrl = (defined('KC_URL') && KC_URL !== '') ? BASE_URL . '/auth/keycloak-logout' : BASE_URL . '/auth/local-logout'; ?>
                                            <li>
                                                <a class="dropdown-item text-danger" href="<?= $_logoutUrl ?>">
                                                    <i class="<?= h($__mi['icon'] ?: 'fa-solid fa-right-from-bracket') ?> me-1"></i>
                                                    <?= h($_hTxt['sign_out']) ?>
                                                </a>
                                            </li>
                                        <?php endif; ?>
                                    <?php elseif ($__mi['type'] === 'link' && $__mi['label']): ?>
                                        <li>
                                            <a class="dropdown-item" href="<?= h($__mi['url'] ? BASE_URL . resolveUrlLang($__mi['url']) : '#') ?>">
                                                <?php if (!empty($__mi['icon'])): ?>
                                                    <i class="<?= h($__mi['icon']) ?> me-1"></i>
                                                <?php endif; ?>
                                                <?= h($__mi['label']) ?>
                                            </a>
                                        </li>
                                    <?php endif; ?>
                                <?php endforeach; ?>
                                <?php if (canViewAdminPanel()): ?>
                                    <li>
                                        <a class="dropdown-item" href="<?= BASE_URL ?>/admin/" target="_blank" rel="noopener">
                                            <i class="fa-solid fa-gauge me-1"></i>
                                            Admin
                                        </a>
                                    </li>
                                <?php endif; ?>
                            </ul>
                        </div>
                    <?php else: ?>
                        <a href="<?= BASE_URL ?>/pages/login" class="btn-login">
                            <i class="fa-solid fa-user me-1"></i>
                            <span><?= h($_hTxt['sign_in']) ?></span>
                        </a>
                    <?php endif; ?>
                </div>
            </div>

        </div>
    </nav>
</header>

<?php
$__sidebarItems = getSidebarItems();
$__sidebarSide  = getSetting('sidebar_side', 'left');
$__hasSidebarBtn = false;
foreach ($__navItems as $__sni) { if (!empty($__sni['is_sidebar_toggle'])) { $__hasSidebarBtn = true; break; } }
if ($__hasSidebarBtn || !empty($__sidebarItems)):
?>
<div id="site-sidebar-backdrop" class="sidebar-backdrop"></div>
<aside id="site-sidebar" class="site-sidebar site-sidebar--<?= h($__sidebarSide) ?>" aria-hidden="true">
    <div class="sidebar-header">
        <a href="<?= BASE_URL ?>/" class="sidebar-brand">
            <?php $__sbLogo = getSetting('logo_path'); if ($__sbLogo): ?>
            <img src="<?= h(assetUrl($__sbLogo)) ?>" alt="<?= h(getSiteName()) ?>" class="sidebar-logo">
            <?php endif; ?>
            <span class="sidebar-brand-name"><?= h(getSiteName()) ?></span>
        </a>
        <button class="sidebar-close" data-sidebar-close aria-label="Close">
            <i class="fa-solid fa-xmark"></i>
        </button>
    </div>
    <nav class="sidebar-nav">
        <?php foreach ($__sidebarItems as $__si): ?>
            <?php if (!empty($__si['is_separator'])): ?>
                <hr class="sidebar-separator">
            <?php elseif (!empty($__si['is_section_header'])): ?>
                <div class="sidebar-section-title"><?= h($__si['label']) ?></div>
            <?php else: ?>
                <a href="<?= h(!empty($__si['url']) && $__si['url'] !== '#' ? BASE_URL . resolveUrlLang($__si['url']) : '#') ?>"
                   class="sidebar-link"
                   <?= !empty($__si['is_blank']) ? 'target="_blank" rel="noopener noreferrer"' : '' ?>>
                    <?php if (!empty($__si['icon'])): ?>
                        <i class="<?= h($__si['icon']) ?>"></i>
                    <?php endif; ?>
                    <?= h($__si['label']) ?>
                </a>
            <?php endif; ?>
        <?php endforeach; ?>
    </nav>
</aside>
<script>
(function () {
    var sidebar  = document.getElementById('site-sidebar');
    var backdrop = document.getElementById('site-sidebar-backdrop');
    if (!sidebar) return;
    function openSidebar()  { sidebar.classList.add('is-open'); backdrop.classList.add('is-visible'); sidebar.removeAttribute('aria-hidden'); }
    function closeSidebar() { sidebar.classList.remove('is-open'); backdrop.classList.remove('is-visible'); sidebar.setAttribute('aria-hidden', 'true'); }
    document.addEventListener('click', function (e) {
        if (e.target.closest('[data-sidebar-toggle]')) { sidebar.classList.contains('is-open') ? closeSidebar() : openSidebar(); return; }
        if (e.target.closest('[data-sidebar-close]') || e.target === backdrop) { closeSidebar(); }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSidebar(); });
}());
</script>
<?php endif; ?>

<main>
<script>
(function () {
    var btn  = document.getElementById('header-theme-toggle');
    if (!btn) return;
    var icon = btn.querySelector('i');

    function syncHeaderIcon(dark) {
        icon.className  = dark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        btn.title       = dark ? btn.dataset.labelLight : btn.dataset.labelDark;
    }

    syncHeaderIcon(document.documentElement.getAttribute('data-theme') === 'dark');

    btn.addEventListener('click', function () {
        var dark = document.documentElement.getAttribute('data-theme') !== 'dark';
        if (dark) document.documentElement.setAttribute('data-theme', 'dark');
        else      document.documentElement.removeAttribute('data-theme');
        try { localStorage.setItem('acTheme', dark ? 'dark' : 'light'); } catch (e) {}
        syncHeaderIcon(dark);
        var footerIcon = document.getElementById('theme-icon');
        if (footerIcon) footerIcon.className = dark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    });
}());
</script>
<script>
(function () {
    var navbar  = document.querySelector('.altered-navbar');
    var navList = navbar ? navbar.querySelector('.navbar-nav') : null;
    var navRight= navbar ? navbar.querySelector('.navbar-right') : null;
    if (!navbar || !navList || !navRight) return;

    function checkFit() {
        if (window.innerWidth < 768) { navbar.classList.remove('icons-only'); return; }
        navbar.classList.remove('icons-only');
        var listRect  = navList.getBoundingClientRect();
        var rightRect = navRight.getBoundingClientRect();
        if (listRect.right > rightRect.left - 8) {
            navbar.classList.add('icons-only');
        }
    }

    navbar.querySelectorAll('.navbar-nav .nav-link').forEach(function(a) {
        var span = a.querySelector('span');
        if (span) a.title = span.textContent.trim();
    });

    window.addEventListener('resize', checkFit);
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(checkFit); }
    checkFit();
}());
</script>
