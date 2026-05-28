<?php
require_once __DIR__ . '/db.php';


// Legacy: THEME_SETTING_KEYS was removed — all settings now live in site_settings.
// Left as empty const so any third-party code that references it does not fatal.
const THEME_SETTING_KEYS = [
    'theme_color', 'bg_color', 'bg_image', 'bg_image_mode',
    'font_body', 'font_titles', 'font_nav', 'font_user_menu', 'font_footer',
    'navbar_width', 'logo_path',
    'footer_bg_image', 'footer_bg_mode',
    'footer_deco_left', 'footer_deco_right',
    'footer_deco_left_opacity', 'footer_deco_right_opacity',
    'footer_rights_en', 'footer_rights_fr',
    'footer_col1_title_en', 'footer_col1_title_fr', 'footer_col1_content_en', 'footer_col1_content_fr',
    'footer_col2_title_en', 'footer_col2_title_fr', 'footer_col2_content_en', 'footer_col2_content_fr',
    'footer_col3_title_en', 'footer_col3_title_fr', 'footer_col3_content_en', 'footer_col3_content_fr',
    'footer_col4_title_en', 'footer_col4_title_fr', 'footer_col4_content_en', 'footer_col4_content_fr',
];

/**
 * Fetch all cards from CARDS_API, looping through pages when results exceed
 * CARDS_API_MAX_PER_PAGE. Returns the combined array of card objects.
 *
 * @param array $params  Query params (without page/itemsPerPage — added automatically)
 */


// Configure session cookie lifetime before any session_start()
if (session_status() === PHP_SESSION_NONE) {
    $__lifetime = defined('SESSION_LIFETIME_DAYS') ? SESSION_LIFETIME_DAYS * 86400 : 86400;
    $__basePath  = (defined('BASE_URL') && BASE_URL !== '') ? rtrim(BASE_URL, '/') . '/' : '/';
    // Namespace session per installation so two installs on the same domain don't share cookies
    session_name('AC_' . substr(md5((defined('DB_PREFIX') ? DB_PREFIX : '') . $__basePath), 0, 8));
    ini_set('session.gc_maxlifetime', $__lifetime);
    session_set_cookie_params([
        'lifetime' => $__lifetime,
        'path'     => $__basePath,
        'secure'   => !empty($_SERVER['HTTPS']),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

function trackPageView(): void {
    if (strpos($_SERVER['PHP_SELF'] ?? '', '/admin/') !== false) return;
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
    if (preg_match('/bot|crawl|spider|slurp|facebookexternalhit|Googlebot|bingbot/i', $ua)) return;

    // Anonymous visitor ID via cookie (no personal data stored)
    $cookieName = '_acv';
    if (!empty($_COOKIE[$cookieName])) {
        $visitorId = preg_replace('/[^a-f0-9]/', '', $_COOKIE[$cookieName]);
        if (strlen($visitorId) !== 32) $visitorId = '';
    } else {
        $visitorId = '';
    }
    if ($visitorId === '') {
        $visitorId = bin2hex(random_bytes(16));
        $secure    = !empty($_SERVER['HTTPS']);
        setcookie($cookieName, $visitorId, [
            'expires'  => time() + 365 * 86400,
            'path'     => '/',
            'secure'   => $secure,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }

    $page = basename($_SERVER['PHP_SELF'] ?? 'index', '.php') ?: 'index';
    try {
        $db = getDB();
        $db->prepare(q(
            "INSERT INTO {page_views} (page, date, views) VALUES (:p, CURDATE(), 1)
             ON DUPLICATE KEY UPDATE views = views + 1"
        ))->execute([':p' => $page]);
        $db->prepare(q(
            "INSERT IGNORE INTO {visitor_log} (visitor_id, date) VALUES (:v, CURDATE())"
        ))->execute([':v' => $visitorId]);
    } catch (Exception $e) { /* tables may not exist yet */ }
}

function checkMaintenance(): void {
    if (getSetting('maintenance_enabled') !== '1') return;
    if (session_status() === PHP_SESSION_NONE) session_start();
    if (!empty($_SESSION['admin_logged_in'])) return;
    $lang  = getUiLang();
    $title = getSetting('maintenance_title_' . $lang)
          ?: ($lang === 'fr' ? 'Maintenance en cours' : 'Under Maintenance');
    $text  = getSetting('maintenance_text_' . $lang)
          ?: ($lang === 'fr'
              ? 'Le site est temporairement indisponible. Merci de revenir bientôt.'
              : 'The site is temporarily unavailable. Please come back soon.');
    http_response_code(503);
    header('Retry-After: 3600');
    $siteName = getSiteName();
    require dirname(__FILE__) . '/../pages/maintenance.php';
    exit;
}

function validateImageUpload(array $file): ?string {
    if ($file['error'] !== UPLOAD_ERR_OK) {
        return 'Upload error (code ' . (int)$file['error'] . ').';
    }
    $maxSize = defined('UPLOAD_MAX_SIZE') ? UPLOAD_MAX_SIZE : 5 * 1024 * 1024;
    if ($file['size'] > $maxSize) {
        return 'Image too large (max ' . round($maxSize / (1024 * 1024)) . ' MB).';
    }
    $allowed = defined('UPLOAD_ALLOWED_MIME') ? UPLOAD_ALLOWED_MIME : ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime  = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    if (!in_array($mime, $allowed, true)) {
        return 'Unsupported format (JPG, PNG, WebP, GIF).';
    }
    return null;
}

function fontCssFormat(string $filename): string {
    static $map = ['woff2' => 'woff2', 'woff' => 'woff', 'ttf' => 'truetype', 'otf' => 'opentype'];
    $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    return $map[$ext] ?? 'woff2';
}

function imageExtFromMime(string $tmpPath): string {
    static $map = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'];
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime  = finfo_file($finfo, $tmpPath);
    finfo_close($finfo);
    return $map[$mime] ?? 'jpg';
}

function validateSvgUpload(string $svg): bool {
    if (stripos($svg, '<script') !== false) return false;
    if (preg_match('/\bjavascript\s*:/i', $svg)) return false;
    if (preg_match('/\bon\w+\s*=/i', $svg)) return false;
    if (stripos($svg, '<foreignObject') !== false) return false;
    if (stripos($svg, '<iframe') !== false) return false;
    return true;
}

function initLang(): void {
    if (session_status() === PHP_SESSION_NONE) session_start();

    $userId     = (int)($_SESSION['user_id'] ?? 0);
    $isLoggedIn = $userId > 0 && (!empty($_SESSION['kc_logged_in']) || !empty($_SESSION['local_logged_in']));

    // Explicit lang change via ?lang=
    if (isset($_GET['lang']) && in_array($_GET['lang'], ['en', 'fr', 'es', 'it', 'de'], true)) {
        $_SESSION['lang'] = $_GET['lang'];
        if ($isLoggedIn) {
            try {
                getDB()->prepare(q("UPDATE {users} SET lang_pref = :l WHERE id = :id"))
                       ->execute([':l' => $_SESSION['lang'], ':id' => $userId]);
            } catch (Exception $e) { /* ignore — DB may not be ready */ }
        }
        return;
    }

    if (isset($_SESSION['lang'])) return;

    // For logged-in users: load preference from DB (KC and local auth)
    if ($isLoggedIn) {
        try {
            $st = getDB()->prepare(q("SELECT lang_pref FROM {users} WHERE id = :id"));
            $st->execute([':id' => $userId]);
            $pref = $st->fetchColumn();
            if ($pref && in_array($pref, ['en', 'fr', 'es', 'it', 'de'], true)) {
                $_SESSION['lang'] = $pref;
                return;
            }
        } catch (Exception $e) { /* ignore */ }
    }

    // Fall back to browser language header
    $accept   = $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '';
    $detected = DEFAULT_LANG;
    foreach (['fr', 'es', 'it', 'de'] as $_bl) {
        if (stripos($accept, $_bl) !== false) { $detected = $_bl; break; }
    }
    $_SESSION['lang'] = $detected;
}

function getLang(): string {
    if (session_status() === PHP_SESSION_NONE) session_start();
    return $_SESSION['lang'] ?? DEFAULT_LANG;
}

// UI lang : falls back to 'en' for languages without translation files (es, it, de)
function getUiLang(): string {
    $lang = getLang();
    return in_array($lang, ['en', 'fr'], true) ? $lang : 'en';
}

function t(string $key): string {
    return $key;
}

function getLangUrl(string $targetLang): string {
    $params = $_GET;
    $params['lang'] = $targetLang;
    return '?' . http_build_query($params);
}

function resolveUrlLang(string $url): string {
    $lang     = getLang();
    $fullMap  = ['en' => 'en-us', 'fr' => 'fr-fr', 'es' => 'es-es', 'it' => 'it-it', 'de' => 'de-de'];
    $langFull = isset($fullMap[$lang]) ? $fullMap[$lang] : 'en-us';
    $url = str_replace('{lang}',     $lang,                    $url);
    $url = str_replace('{LANG}',     strtoupper($lang),        $url);
    $url = str_replace('{langfull}', $langFull,                $url);
    $url = str_replace('{LANGFULL}', strtoupper($langFull),    $url);
    return $url;
}

function formatDate(string $date): string {
    $lang  = getLang();
    $ts    = strtotime($date);
    if ($lang === 'fr') {
        $months = ['janvier','février','mars','avril','mai','juin',
                   'juillet','août','septembre','octobre','novembre','décembre'];
        return date('j', $ts) . ' ' . $months[(int)date('n', $ts) - 1] . ' ' . date('Y', $ts);
    }
    return date('F j, Y', $ts);
}

function getNewsList(int $limit = 0, ?int $categoryId = null, int $offset = 0): array {
    $db   = getDB();
    $lang = getUiLang();

    $catN = $categoryId !== null ? " AND n.category_id = :cat_id_n" : "";
    $catR = $categoryId !== null ? " AND f.category_id = :cat_id_r" : "";
    $lim  = $limit > 0 ? " LIMIT :lim OFFSET :off" : "";

    $sql = "(SELECT n.id, n.slug, n.category_id,
                    n.title_{$lang} AS title, n.excerpt_{$lang} AS excerpt,
                    n.image, n.youtube_url, n.published_at, n.created_at,
                    c.name_{$lang} AS category_name, c.slug AS category_slug,
                    NULL AS rss_link, NULL AS source_name, 'native' AS source_type,
                    n.is_pinned
             FROM {news} n
             LEFT JOIN {news_categories} c ON n.category_id = c.id
             WHERE n.is_published = 1
               AND (n.published_at IS NULL OR n.published_at <= NOW())
               AND (c.is_hidden = 0 OR c.id IS NULL){$catN})
            UNION ALL
            (SELECT rc.id, NULL AS slug, f.category_id,
                    rc.title, rc.description AS excerpt,
                    rc.image, NULL AS youtube_url, rc.published_at, rc.fetched_at AS created_at,
                    c.name_{$lang} AS category_name, c.slug AS category_slug,
                    rc.link AS rss_link, f.name AS source_name, 'rss' AS source_type,
                    0 AS is_pinned
             FROM {rss_cache} rc
             JOIN {rss_feeds} f ON f.id = rc.feed_id AND f.is_visible = 1
             LEFT JOIN {news_categories} c ON c.id = f.category_id
             WHERE (rc.lang = '' OR rc.lang = :ui_lang)
               AND (c.is_hidden = 0 OR c.id IS NULL){$catR})
            ORDER BY is_pinned DESC, COALESCE(published_at, created_at) DESC{$lim}";

    try {
        $stmt = $db->prepare(q($sql));
        $stmt->bindValue(':ui_lang', $lang, PDO::PARAM_STR);
        if ($limit > 0) {
            $stmt->bindValue(':lim', $limit,  PDO::PARAM_INT);
            $stmt->bindValue(':off', $offset, PDO::PARAM_INT);
        }
        if ($categoryId !== null) {
            $stmt->bindValue(':cat_id_n', $categoryId, PDO::PARAM_INT);
            $stmt->bindValue(':cat_id_r', $categoryId, PDO::PARAM_INT);
        }
        $stmt->execute();
        return $stmt->fetchAll();
    } catch (\Exception $e) {
        // RSS tables may not exist — fall back to native news only
        return _getNewsListNative($lang, $limit, $categoryId, $offset);
    }
}

function _getNewsListNative(string $lang, int $limit, ?int $categoryId, int $offset): array {
    $db  = getDB();
    $sql = "SELECT n.id, n.slug, n.category_id,
                   n.title_{$lang} AS title, n.excerpt_{$lang} AS excerpt,
                   n.image, n.youtube_url, n.published_at, n.created_at,
                   c.name_{$lang} AS category_name, c.slug AS category_slug,
                   NULL AS rss_link, NULL AS source_name, 'native' AS source_type,
                   n.is_pinned
            FROM {news} n
            LEFT JOIN {news_categories} c ON n.category_id = c.id
            WHERE n.is_published = 1
              AND (n.published_at IS NULL OR n.published_at <= NOW())
              AND (c.is_hidden = 0 OR c.id IS NULL)";
    if ($categoryId !== null) $sql .= " AND n.category_id = :cat_id";
    $sql .= " ORDER BY n.is_pinned DESC, COALESCE(n.published_at, n.created_at) DESC";
    if ($limit > 0) $sql .= " LIMIT :lim OFFSET :off";

    $stmt = $db->prepare(q($sql));
    if ($limit > 0) {
        $stmt->bindValue(':lim', $limit,  PDO::PARAM_INT);
        $stmt->bindValue(':off', $offset, PDO::PARAM_INT);
    }
    if ($categoryId !== null) $stmt->bindValue(':cat_id', $categoryId, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll();
}

function countNews(?int $categoryId = null): int {
    $db   = getDB();
    $catN = $categoryId !== null ? " AND n.category_id = :cat_id_n" : "";
    $catR = $categoryId !== null ? " AND f.category_id = :cat_id_r" : "";

    $sql = "SELECT COUNT(*) FROM (
                (SELECT 1 FROM {news} n
                 LEFT JOIN {news_categories} c ON n.category_id = c.id
                 WHERE n.is_published = 1
                   AND (n.published_at IS NULL OR n.published_at <= NOW())
                   AND (c.is_hidden = 0 OR c.id IS NULL){$catN})
                UNION ALL
                (SELECT 1 FROM {rss_cache} rc
                 JOIN {rss_feeds} f ON f.id = rc.feed_id AND f.is_visible = 1
                 LEFT JOIN {news_categories} c ON c.id = f.category_id
                 WHERE (rc.lang = '' OR rc.lang = :ui_lang)
                   AND (c.is_hidden = 0 OR c.id IS NULL){$catR})
            ) AS merged";

    try {
        $stmt = $db->prepare(q($sql));
        $stmt->bindValue(':ui_lang', getUiLang(), PDO::PARAM_STR);
        if ($categoryId !== null) {
            $stmt->bindValue(':cat_id_n', $categoryId, PDO::PARAM_INT);
            $stmt->bindValue(':cat_id_r', $categoryId, PDO::PARAM_INT);
        }
        $stmt->execute();
        return (int)$stmt->fetchColumn();
    } catch (\Exception $e) {
        $sql = "SELECT COUNT(*) FROM {news} n
                LEFT JOIN {news_categories} c ON n.category_id = c.id
                WHERE n.is_published = 1
                  AND (n.published_at IS NULL OR n.published_at <= NOW())
                  AND (c.is_hidden = 0 OR c.id IS NULL)";
        if ($categoryId !== null) $sql .= " AND n.category_id = :cat_id";
        $stmt = $db->prepare(q($sql));
        if ($categoryId !== null) $stmt->bindValue(':cat_id', $categoryId, PDO::PARAM_INT);
        $stmt->execute();
        return (int)$stmt->fetchColumn();
    }
}

function getNewsById(int $id, bool $publishedOnly = true): ?array {
    $db   = getDB();
    $lang = getUiLang();

    $sql  = "SELECT n.*, c.name_{$lang} AS category_name, c.slug AS category_slug
             FROM {news} n
             LEFT JOIN {news_categories} c ON n.category_id = c.id
             WHERE n.id = :id";
    if ($publishedOnly) {
        $sql .= " AND n.is_published = 1 AND (n.published_at IS NULL OR n.published_at <= NOW())"
              . " AND (c.is_hidden = 0 OR c.id IS NULL)";
    }

    $stmt = $db->prepare(q($sql));
    $stmt->execute([':id' => $id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function youtubeVideoId(string $url): ?string {
    $url = trim($url);
    if (preg_match('/[?&]v=([a-zA-Z0-9_-]{11})/', $url, $m)) return $m[1];
    if (preg_match('#youtu\.be/([a-zA-Z0-9_-]{11})#', $url, $m)) return $m[1];
    if (preg_match('#youtube\.com/embed/([a-zA-Z0-9_-]{11})#', $url, $m)) return $m[1];
    return null;
}

function youtubeEmbedUrl(string $url): ?string {
    $id = youtubeVideoId($url);
    if (!$id) return null;
    return 'https://www.youtube.com/embed/' . $id
         . '?autoplay=1&mute=1&controls=0&loop=1&playlist=' . $id . '&rel=0&modestbranding=1';
}

function slugify(string $text): string {
    // TRANSLIT converts accented chars before stripping (é→e, ç→c, œ→oe…)
    $text = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $text);
    $text = strtolower(trim($text));
    $text = preg_replace('/[^a-z0-9]+/', '-', $text);
    $text = trim($text, '-');
    return $text !== '' ? $text : 'article';
}

function newsUrl(array $news): string {
    if (!empty($news['slug'])) {
        return BASE_URL . '/pages/news-detail?slug=' . $news['slug'];
    }
    return BASE_URL . '/pages/news-detail?id=' . (int)$news['id'];
}

function getNewsBySlug(string $slug, bool $publishedOnly = true): ?array {
    $db   = getDB();
    $lang = getUiLang();
    $sql  = "SELECT n.*, c.name_{$lang} AS category_name, c.slug AS category_slug
             FROM {news} n
             LEFT JOIN {news_categories} c ON n.category_id = c.id
             WHERE n.slug = :slug";
    if ($publishedOnly) {
        $sql .= " AND n.is_published = 1 AND (n.published_at IS NULL OR n.published_at <= NOW())"
              . " AND (c.is_hidden = 0 OR c.id IS NULL)";
    }
    $stmt = $db->prepare(q($sql));
    $stmt->execute([':slug' => $slug]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function getCategories(): array {
    $db   = getDB();
    $lang = getUiLang();
    $stmt = $db->query(q("SELECT id, name_{$lang} AS name, slug FROM {news_categories} WHERE is_hidden = 0 ORDER BY name_{$lang}"));
    return $stmt->fetchAll();
}

function getProjectCategories(): array {
    $db   = getDB();
    $lang = getUiLang();
    $stmt = $db->query(q("SELECT id, name_{$lang} AS name, slug FROM {project_categories} WHERE is_hidden = 0 ORDER BY sort_order, name_{$lang}"));
    return $stmt->fetchAll();
}

function h(string $str): string {
    return htmlspecialchars($str, ENT_QUOTES, 'UTF-8', false);
}

function requireAdmin(): void {
    if (session_status() === PHP_SESSION_NONE) session_start();
    if (!empty($_SESSION['admin_logged_in'])) return;
    // Attempt session restore from kc_remember cookie if KC session has expired
    if (empty($_SESSION['kc_logged_in']) && !empty($_COOKIE['kc_remember'])) {
        require_once __DIR__ . '/func.keycloak.php';
        kc_restore_session();
    }
    $authenticated = !empty($_SESSION['kc_logged_in']) || !empty($_SESSION['local_logged_in']);
    if ($authenticated && !empty($_SESSION['user_id'])) {
        $g = adminGetUserGroup();
        if ($g && $g['can_access_admin']) return; // no group = no admin access
    }
    header('Location: ' . BASE_URL . '/admin/login');
    exit;
}

// group / permission helpers

/**
 * Liste toutes les sections admin disponibles pour la gestion des droits (admin/group-edit.php).
 *
 * Pour ajouter une nouvelle section admin :
 *   1. Créer la page  admin/ma-section.php  (avec $adminSection = 'ma-section')
 *   2. Ajouter la clé ici :  'ma-section' => 'Mon Label'
 *   3. Dans admin/includes/header.php, conditionner le lien nav avec adminHasSection('ma-section')
 *   4. Dans admin/group-edit.php, la section apparaît automatiquement dans le formulaire
 *      — aucune modif nécessaire côté formulaire.
 *
 * La clé (ex: 'ma-section') est stockée en base dans group_permissions.section.
 * Ne jamais renommer une clé existante sans migrer les données en base.
 */
function adminSections(): array {
    return [
        'dashboard'   => 'Dashboard',
        'news'        => 'News',
        'categories'  => 'News Categories',
        'rss'         => 'RSS Feeds',
        'banner'      => 'Banner',
        'announcement' => 'Announcement',
        'background'  => 'Background',
        'logo'        => 'Logo',
        'font'        => 'Font',
        'footer'      => 'Footer',
        'privacy'     => 'Privacy',
        'shortcodes'  => 'Shortcodes',
        'nav'         => 'Navigation',
        'sidebar'     => 'Sidebar',
        'user-menu'   => 'User Menu',
        'users'       => 'Users',
        'groups'      => 'Groups',
        'maintenance'  => 'Maintenance',
        'settings'     => 'Settings',
        'projects'           => 'Projects',
        'project-categories' => 'Project Categories',
        'community-builders' => 'Community Builders',
        'homepage'     => 'Homepage',
        'pages'        => 'Pages',
        'media'        => 'Media Library',
        'themes'       => 'Themes',
        'plugins'      => 'Plugins',
    ];
}

function adminSetSection(string $section): void {
    static $s = null;
    $s = $section;
}

function adminCurrentSection(): string {
    static $s = null;
    return $s ?? '';
}

function canPreviewGroups(): bool {
    if (session_status() === PHP_SESSION_NONE) session_start();
    if (!empty($_SESSION['admin_logged_in'])) return true;
    $g = adminGetUserGroup();
    return $g !== null && !empty($g['can_preview']);
}

function saIsPreviewingGroup(): bool {
    if (session_status() === PHP_SESSION_NONE) session_start();
    return canPreviewGroups() && !empty($_SESSION['sa_preview_group_id']);
}

function adminGetUserGroup(): ?array {
    static $result = null, $loaded = false;
    if ($loaded) return $result;
    $loaded = true;
    if (session_status() === PHP_SESSION_NONE) session_start();
    if (saIsPreviewingGroup()) {
        $gid = (int)$_SESSION['sa_preview_group_id'];
        try {
            $stmt = getDB()->prepare(q(
                "SELECT g.id, g.name, g.slug, g.color, g.icon, g.can_access_admin, g.can_delete, g.can_publish, g.can_create, g.can_edit, g.can_readonly_all, g.can_preview,
                        GROUP_CONCAT(p.section SEPARATOR ',') AS sections
                 FROM {user_groups} g
                 LEFT JOIN {group_permissions} p ON p.group_id = g.id
                 WHERE g.id = :gid
                 GROUP BY g.id"
            ));
            $stmt->execute([':gid' => $gid]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($row) {
                $row['sections']         = $row['sections'] ? explode(',', $row['sections']) : [];
                $row['can_access_admin'] = (bool)$row['can_access_admin'];
                $row['can_delete']       = (bool)$row['can_delete'];
                $row['can_publish']      = (bool)($row['can_publish']     ?? false);
                $row['can_create']       = (bool)($row['can_create']      ?? true);
                $row['can_edit']         = (bool)($row['can_edit']        ?? true);
                $row['can_readonly_all'] = (bool)($row['can_readonly_all'] ?? false);
                $row['can_preview']      = (bool)($row['can_preview']     ?? false);
                $result = $row;
                return $result;
            }
        } catch (Exception $e) {}
        return null;
    }
    $userId = (int)($_SESSION['user_id'] ?? 0);
    if (!$userId) return null;
    try {
        $stmt = getDB()->prepare(q(
            "SELECT g.id, g.name, g.slug, g.color, g.icon, g.can_access_admin, g.can_delete, g.can_publish, g.can_create, g.can_edit, g.can_readonly_all, g.can_preview,
                    GROUP_CONCAT(p.section SEPARATOR ',') AS sections
             FROM {users} u
             JOIN {user_groups} g ON g.id = u.group_id
             LEFT JOIN {group_permissions} p ON p.group_id = g.id
             WHERE u.id = :uid
             GROUP BY g.id"
        ));
        $stmt->execute([':uid' => $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) return null;
        $row['sections']         = $row['sections'] ? explode(',', $row['sections']) : [];
        $row['can_access_admin'] = (bool)$row['can_access_admin'];
        $row['can_delete']       = (bool)$row['can_delete'];
        $row['can_publish']      = (bool)($row['can_publish']      ?? false);
        $row['can_create']       = (bool)($row['can_create']       ?? true);
        $row['can_edit']         = (bool)($row['can_edit']         ?? true);
        $row['can_readonly_all'] = (bool)($row['can_readonly_all'] ?? false);
        $row['can_preview']      = (bool)($row['can_preview']      ?? false);
        $result = $row;
        return $result;
    } catch (Exception $e) {
        return null;
    }
}

function adminCanDelete(): bool {
    if (session_status() === PHP_SESSION_NONE) session_start();
    if (!empty($_SESSION['admin_logged_in']) && !saIsPreviewingGroup()) return true;
    $g = adminGetUserGroup();
    if (!$g) return false;
    $sec = adminCurrentSection();
    if ($g['can_readonly_all'] && $sec !== '' && !in_array($sec, $g['sections'], true)) return false;
    return (bool)($g['can_delete'] ?? false);
}

function adminCanPublish(): bool {
    if (session_status() === PHP_SESSION_NONE) session_start();
    if (!empty($_SESSION['admin_logged_in']) && !saIsPreviewingGroup()) return true;
    $g = adminGetUserGroup();
    if (!$g) return false;
    $sec = adminCurrentSection();
    if ($g['can_readonly_all'] && $sec !== '' && !in_array($sec, $g['sections'], true)) return false;
    return (bool)($g['can_publish'] ?? false);
}

function adminCanCreate(): bool {
    if (session_status() === PHP_SESSION_NONE) session_start();
    if (!empty($_SESSION['admin_logged_in']) && !saIsPreviewingGroup()) return true;
    $g = adminGetUserGroup();
    if (!$g) return false;
    $sec = adminCurrentSection();
    if ($g['can_readonly_all'] && $sec !== '' && !in_array($sec, $g['sections'], true)) return false;
    return (bool)($g['can_create'] ?? true);
}

function adminCanEdit(): bool {
    if (session_status() === PHP_SESSION_NONE) session_start();
    if (!empty($_SESSION['admin_logged_in']) && !saIsPreviewingGroup()) return true;
    $g = adminGetUserGroup();
    if (!$g) return false;
    $sec = adminCurrentSection();
    if ($g['can_readonly_all'] && $sec !== '' && !in_array($sec, $g['sections'], true)) return false;
    return (bool)($g['can_edit'] ?? true);
}

function adminHasSection(string $section): bool {
    if (session_status() === PHP_SESSION_NONE) session_start();
    if (!empty($_SESSION['admin_logged_in']) && !saIsPreviewingGroup()) return true;
    $g = adminGetUserGroup();
    if (!$g) return false; // no group assigned = no admin access
    if (!$g['can_access_admin']) return false;
    if ($g['can_readonly_all']) return true;
    return in_array($section, $g['sections'], true);
}

function canViewAdminPanel(): bool {
    if (session_status() === PHP_SESSION_NONE) session_start();
    if (!empty($_SESSION['admin_logged_in'])) return true;
    if (!empty($_SESSION['kc_logged_in']) && !empty($_SESSION['user_id'])) {
        $g = adminGetUserGroup();
        if ($g) return $g['can_access_admin'];
        return false; // no group assigned = no admin access
    }
    return false;
}

function isAdminUser(): bool {
    if (session_status() === PHP_SESSION_NONE) session_start();
    if (!empty($_SESSION['admin_logged_in'])) return true;
    if (!empty($_SESSION['user_id'])) {
        if (isset($_SESSION['kc_is_admin'])) return (bool)$_SESSION['kc_is_admin'];
        try {
            $stmt = getDB()->prepare(q("SELECT is_admin FROM {users} WHERE id = :id"));
            $stmt->execute([':id' => (int)$_SESSION['user_id']]);
            $val = (bool)$stmt->fetchColumn();
            $_SESSION['kc_is_admin'] = $val;
            return $val;
        } catch (Exception $e) {}
    }
    return false;
}

function redirect(string $url): void {
    while (ob_get_level() > 0) ob_end_clean();
    header('Location: ' . $url);
    exit;
}

function flash(string $msg, string $type = 'success'): void {
    if (session_status() === PHP_SESSION_NONE) session_start();
    $_SESSION['flash'] = ['msg' => $msg, 'type' => $type];
}

function getFlash(): ?array {
    if (session_status() === PHP_SESSION_NONE) session_start();
    if (isset($_SESSION['flash'])) {
        $f = $_SESSION['flash'];
        unset($_SESSION['flash']);
        return $f;
    }
    return null;
}

function csrfToken(): string {
    if (session_status() === PHP_SESSION_NONE) session_start();
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function csrfValid(?string $token): bool {
    if (session_status() === PHP_SESSION_NONE) session_start();
    return !empty($_SESSION['csrf_token']) && !empty($token) && hash_equals($_SESSION['csrf_token'], $token);
}

// session helpers

function kcClearSession(): void {
    foreach (['kc_logged_in', 'kc_logged_in_at', 'kc_sub', 'kc_email',
              'kc_username', 'kc_id_token', 'kc_access_token',
              'kc_access_token_exp', 'user_id'] as $key) {
        unset($_SESSION[$key]);
    }
    $secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    setcookie('kc_remember', '', [
        'expires' => time() - 3600, 'path' => '/',
        'secure' => $secure, 'httponly' => true, 'samesite' => 'Lax',
    ]);
}

function clearAuthSession(): void {
    foreach ([
        'admin_logged_in', 'admin_logged_in_at', 'admin_username',
        'local_logged_in', 'local_logged_in_at', 'local_email', 'local_username',
        'kc_logged_in', 'kc_logged_in_at', 'kc_sub', 'kc_email', 'kc_username', 'kc_id_token',
        'user_id',
    ] as $key) {
        unset($_SESSION[$key]);
    }
}

function localClearSession(): void {
    foreach (['local_logged_in', 'local_logged_in_at', 'local_email', 'local_username', 'user_id'] as $key) {
        unset($_SESSION[$key]);
    }
    $secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    setcookie('local_remember', '', [
        'expires' => time() - 3600, 'path' => '/',
        'secure' => $secure, 'httponly' => true, 'samesite' => 'Lax',
    ]);
}

// cross-installation logout
// 'ac_global_logout' is set at path '/' so all installs on the same domain share
// it. Its value is the Unix timestamp of the last logout. Any session whose
// logged_in_at predates that timestamp is immediately invalidated.


function globalLogoutSessionIsValid(): bool {
    if (empty($_COOKIE['ac_global_logout'])) return true;
    $logoutAt   = (int)$_COOKIE['ac_global_logout'];
    $loggedInAt = (int)max(
        $_SESSION['kc_logged_in_at']    ?? 0,
        $_SESSION['local_logged_in_at'] ?? 0
    );
    return $loggedInAt > $logoutAt;
}

// keycloak authentication

function kcIsLoggedIn(): bool {
    if (!defined('KC_URL') || KC_URL === '') {
        return localIsLoggedIn();
    }

    if (session_status() === PHP_SESSION_NONE) session_start();

    if (empty($_SESSION['kc_logged_in'])) {
        static $restoreAttempted = false;
        if (!$restoreAttempted && !empty($_COOKIE['kc_remember'])) {
            $restoreAttempted = true;
            require_once __DIR__ . '/func.keycloak.php';
            return kc_restore_session();
        }
        return false;
    }

    // Verify the refresh token is still in DB — it is nulled on every logout,
    // which invalidates all concurrent sessions for that user immediately.
    $userId = (int)($_SESSION['user_id'] ?? 0);
    if ($userId > 0) {
        try {
            $stmt = getDB()->prepare(q("SELECT kc_refresh_token FROM {users} WHERE id = :id LIMIT 1"));
            $stmt->execute([':id' => $userId]);
            $row = $stmt->fetch();
            if ($row !== false && empty($row['kc_refresh_token'])) {
                kcClearSession();
                return false;
            }
        } catch (Throwable $e) {}
    }

    // Admin-triggered force-logout
    $forceAt = getSetting('kc_force_logout_at');
    if ($forceAt !== '' && (int)($_SESSION['kc_logged_in_at'] ?? 0) <= strtotime($forceAt)) {
        kcClearSession();
        return false;
    }

    if (!globalLogoutSessionIsValid()) {
        kcClearSession();
        return false;
    }

    return true;
}

function kcUser(): array {
    if (!defined('KC_URL') || KC_URL === '') {
        return localGetUser();
    }
    return [
        'sub'      => $_SESSION['kc_sub']      ?? '',
        'email'    => $_SESSION['kc_email']    ?? '',
        'username' => $_SESSION['kc_username'] ?? '',
    ];
}

function loginRequired(): void {
    if (!kcIsLoggedIn()) {
        redirect(BASE_URL . '/pages/login');
    }
}

// local authentication

function localRestoreSession(): bool {
    $token = $_COOKIE['local_remember'] ?? '';
    if (!$token || strlen($token) !== 64) return false;

    try {
        $stmt = getDB()->prepare(q(
            "SELECT id, email, username, local_remember_expiry
             FROM {users}
             WHERE local_remember_token = :tok AND local_remember_expiry > :now
             LIMIT 1"
        ));
        $stmt->execute([':tok' => $token, ':now' => time()]);
        $user = $stmt->fetch();
    } catch (Throwable $e) { return false; }

    if (!$user) return false;

    // Reject tokens issued before the last global logout
    $logoutAt = (int)($_COOKIE['ac_global_logout'] ?? 0);
    if ($logoutAt > 0) {
        $tokenIat = (int)$user['local_remember_expiry'] - SESSION_LIFETIME_DAYS * 86400;
        if ($tokenIat <= $logoutAt) return false;
    }

    session_regenerate_id(true);

    $_SESSION['local_logged_in']    = true;
    $_SESSION['local_logged_in_at'] = time();
    $_SESSION['user_id']            = (int)$user['id'];
    $_SESSION['local_email']        = $user['email']    ?? '';
    $_SESSION['local_username']     = $user['username'] ?? '';

    return true;
}

function localIsLoggedIn(): bool {
    if (session_status() === PHP_SESSION_NONE) session_start();

    if (empty($_SESSION['local_logged_in'])) {
        static $restoreAttempted = false;
        if (!$restoreAttempted && !empty($_COOKIE['local_remember'])) {
            $restoreAttempted = true;
            return localRestoreSession();
        }
        return false;
    }

    $forceAt = getSetting('kc_force_logout_at');
    if ($forceAt !== '' && (int)($_SESSION['local_logged_in_at'] ?? 0) <= strtotime($forceAt)) {
        localClearSession();
        return false;
    }

    if (!globalLogoutSessionIsValid()) {
        localClearSession();
        return false;
    }

    return true;
}

function localGetUser(): array {
    return [
        'sub'      => '',
        'email'    => $_SESSION['local_email']    ?? '',
        'username' => $_SESSION['local_username'] ?? '',
    ];
}

function assetUrl(string $path): string {
    if (empty($path)) return '';
    if (strpos($path, 'http://') === 0 || strpos($path, 'https://') === 0) return $path;
    return BASE_URL . '/' . ltrim($path, '/');
}

// theme helpers

function getActiveTheme(): string {
    static $theme = null;
    if ($theme !== null) return $theme;
    $slug = getSetting('active_theme');
    if ($slug === '') $slug = 'default';
    // Sanitize: only alphanumeric, hyphen, underscore allowed
    $slug = preg_replace('/[^a-zA-Z0-9_-]/', '', $slug);
    if ($slug === '') $slug = 'default';
    // Validate that the theme directory actually exists on disk
    if (!is_dir(dirname(__DIR__) . '/themes/' . $slug)) {
        $slug = 'default';
    }
    $theme = $slug;
    return $theme;
}

function themeFile(string $file): string {
    $root   = dirname(__DIR__) . '/themes/';
    $active = getActiveTheme();
    $path   = $root . $active . '/' . $file;
    if (file_exists($path)) return $path;
    $default = $root . 'default/' . $file;
    if (file_exists($default)) return $default;
    return $path;
}

function themeUrl(string $file): string {
    $active = getActiveTheme();
    $root   = dirname(__DIR__) . '/themes/';
    if (file_exists($root . $active . '/' . $file)) {
        return BASE_URL . '/themes/' . $active . '/' . $file;
    }
    if (file_exists($root . 'default/' . $file)) {
        return BASE_URL . '/themes/default/' . $file;
    }
    return BASE_URL . '/themes/' . $active . '/' . $file;
}

function getThemeConfig(string $slug): array {
    $file = dirname(__DIR__) . '/themes/' . $slug . '/config.json';
    if (!file_exists($file)) return [];
    $raw  = file_get_contents($file);
    if ($raw === false) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function getAvailableThemes(): array {
    $pattern = dirname(__DIR__) . '/themes/*/config.json';
    $files   = glob($pattern) ?: [];
    $active  = getActiveTheme();
    $themes  = [];
    foreach ($files as $file) {
        $slug   = basename(dirname($file));
        $config = getThemeConfig($slug);
        if (empty($config)) continue;
        $themes[] = [
            'slug'        => $slug,
            'name'        => $config['name']        ?? $slug,
            'description' => $config['description'] ?? '',
            'version'     => $config['version']     ?? '',
            'author'      => $config['author']      ?? '',
            'preview'     => $config['preview']     ?? '',
            'is_active'   => $slug === $active,
        ];
    }
    // Default always first, then alphabetically by slug
    usort($themes, function ($a, $b) {
        if ($a['slug'] === 'default') return -1;
        if ($b['slug'] === 'default') return 1;
        return strcmp($a['slug'], $b['slug']);
    });
    return $themes;
}

function getSetting(string $key, string $default = ''): string {
    static $cache = null;
    if ($cache === null) {
        try {
            $rows  = getDB()->query(q("SELECT `key`, `value` FROM {site_settings}"))->fetchAll();
            $cache = array_column($rows, 'value', 'key');
        } catch (Exception $e) {
            $cache = [];
        }
    }
    return isset($cache[$key]) ? (string)$cache[$key] : $default;
}

function saveSetting(string $key, ?string $value): void {
    getDB()->prepare(q(
        "INSERT INTO {site_settings} (`key`, `value`) VALUES (:k, :v)
         ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)"
    ))->execute([':k' => $key, ':v' => $value]);
}

function getFooterLinks(): array {
    $lang = getUiLang();
    try {
        $rows = getDB()->query(q(
            "SELECT id, label_{$lang} AS label, url, icon, column_num FROM {footer_links} ORDER BY sort_order, id"
        ))->fetchAll();
        foreach ($rows as &$row) {
            $row['url'] = resolveUrlLang($row['url']);
            if ($row['url'] !== '' && strpos($row['url'], '//') === false) {
                $row['url'] = BASE_URL . '/' . ltrim($row['url'], '/');
            }
        }
        unset($row);
        return $rows;
    } catch (Exception $e) {
        return [];
    }
}

function getSiteName(): string {
    $name = getSetting('site_name');
    return $name !== '' ? $name : SITE_NAME;
}

function getAnnouncement(string $lang): ?array {
    try {
        $row = getDB()->query(q("SELECT * FROM {announcements} WHERE is_active = 1 LIMIT 1"))->fetch();
    } catch (Exception $e) {
        return null;
    }
    if (!$row) return null;
    $title     = ($row['title_' . $lang] ?? '') ?: ($row['title_en'] ?? '');
    $text      = ($row['text_'  . $lang] ?? '') ?: ($row['text_en']  ?? '');
    $linkLabel = ($row['link_label_' . $lang] ?? '') ?: ($row['link_label_en'] ?? '');
    if ($title === '' && $text === '') return null;
    return [
        'title'       => $title,
        'text'        => $text,
        'color'       => $row['color']       ?: 'info',
        'icon'        => $row['icon']        ?: '',
        'link_url'    => $row['link_url']    ?? '',
        'link_target' => $row['link_target'] ?? '_self',
        'link_label'  => $linkLabel,
    ];
}

function getBanner(): array {
    $lang = getUiLang();
    try {
        $row = getDB()->query(q("SELECT * FROM {banner} WHERE id = 1"))->fetch();
    } catch (Exception $e) {
        $row = null;
    }
    $_heroTitle    = $lang === 'fr' ? 'Explorez l\'inattendu'                                     : 'Explore the Unexpected';
    $_heroSubtitle = $lang === 'fr' ? 'Un jeu de cartes unique où chaque aventure est différente.' : 'A unique trading card game where no two journeys are the same.';
    $_heroCta      = $lang === 'fr' ? 'Découvrir Altered'                                         : 'Discover Altered';
    if (!$row) {
        return [
            'title'           => $_heroTitle,
            'subtitle'        => $_heroSubtitle,
            'btn_label'       => $_heroCta,
            'btn_url'         => BASE_URL . '/pages/news',
            'bg_image'        => null,
            'overlay_color'   => '#000000',
            'overlay_opacity' => 0,
            'raw'             => [],
        ];
    }
    return [
        'title'           => $row['title_'     . $lang] ?: $_heroTitle,
        'subtitle'        => $row['subtitle_'  . $lang] ?: $_heroSubtitle,
        'btn_label'       => $row['btn_label_' . $lang] ?: $_heroCta,
        'btn_url'         => $row['btn_url']
                              ? (strpos($row['btn_url'], '//') !== false
                                    ? resolveUrlLang($row['btn_url'])
                                    : BASE_URL . '/' . ltrim(resolveUrlLang($row['btn_url']), '/'))
                              : BASE_URL . '/pages/news',
        'bg_image'        => $row['bg_image'],
        'overlay_color'   => $row['overlay_color']   ?? '#000000',
        'overlay_opacity' => (int)($row['overlay_opacity'] ?? 0),
        'raw'             => $row,
    ];
}

function getNavItems(): array {
    $lang = getUiLang();
    try {
        $rows = getDB()->query(q(
            "SELECT id, parent_id, label_{$lang} AS label, url, icon, is_iframe, is_blank, is_fullwidth, hide_label, is_sidebar_toggle, is_separator, is_section_header
             FROM {nav_items} WHERE is_visible = 1 ORDER BY sort_order, id"
        ))->fetchAll();
    } catch (Exception $e) {
        // Fallback: some columns may not exist yet on live DB (pending migration)
        try {
            $rows = getDB()->query(q(
                "SELECT id, parent_id, label_{$lang} AS label, url, icon, is_iframe,
                        0 AS is_blank, 0 AS is_fullwidth, 0 AS hide_label, 0 AS is_sidebar_toggle,
                        0 AS is_separator, 0 AS is_section_header
                 FROM {nav_items} WHERE is_visible = 1 ORDER BY sort_order, id"
            ))->fetchAll();
        } catch (Exception $e2) {
            return [];
        }
    }
    $children = [];
    $parents  = [];
    foreach ($rows as $row) {
        if ($row['parent_id']) {
            $children[(int)$row['parent_id']][] = $row;
        } else {
            $parents[] = $row;
        }
    }
    foreach ($parents as &$p) {
        $p['children'] = $children[(int)$p['id']] ?? [];
    }
    return $parents;
}

function getAllNavItems(): array {
    try {
        return getDB()->query(q("SELECT * FROM {nav_items} ORDER BY sort_order, id"))->fetchAll();
    } catch (Exception $e) {
        return [];
    }
}

function getSidebarItems(): array {
    $lang = getUiLang();
    try {
        return getDB()->query(q(
            "SELECT id, label_{$lang} AS label, url, icon, is_separator, is_section_header, is_blank
             FROM {sidebar_items} WHERE is_visible = 1 ORDER BY sort_order, id"
        ))->fetchAll();
    } catch (Exception $e) {
        return [];
    }
}

function getUserMenuItems(): array {
    $lang = getUiLang();
    try {
        $rows = getDB()->query(q(
            "SELECT id, type, system_key, label_{$lang} AS label, url, icon
             FROM {user_menu_items} WHERE is_visible = 1 ORDER BY sort_order, id"
        ))->fetchAll();
    } catch (Exception $e) {
        // Fallback if is_visible column missing on live DB
        try {
            $rows = getDB()->query(q(
                "SELECT id, type, system_key, label_{$lang} AS label, url, icon
                 FROM {user_menu_items} ORDER BY sort_order, id"
            ))->fetchAll();
        } catch (Exception $e2) {
            return [
                ['type' => 'system',    'system_key' => 'email_display', 'label' => null, 'url' => null, 'icon' => null],
                ['type' => 'separator', 'system_key' => null,            'label' => null, 'url' => null, 'icon' => null],
                ['type' => 'system',    'system_key' => 'logout',        'label' => null, 'url' => null, 'icon' => 'fa-solid fa-right-from-bracket'],
            ];
        }
    }
    return $rows;
}
require_once __DIR__ . '/func.keycloak.php';
require_once __DIR__ . '/plugins.php';
