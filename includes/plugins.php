<?php
// Plugin system — loaded by functions.php

// Files and directories that are never extracted during plugin install/update,
// even if they are present in the ZIP.
// Rules:
//   'name'     — skip any file whose basename matches (any depth)
//   'dir/'     — skip any file whose relative path starts with this prefix
//   'path/file'— skip this exact relative path only
const PLUGIN_INSTALL_EXCLUDE = [
    '.DS_Store',
    'Thumbs.db',
    '__MACOSX/',
    '.git/',
    '.svn/',
    '.env/',
];

function pluginsDir(): string {
    return dirname(__DIR__) . '/plugins';
}

function pluginsReadManifest(string $dir): ?array {
    $file = $dir . '/plugin.json';
    if (!is_file($file)) return null;
    $m = json_decode(file_get_contents($file), true);
    if (!is_array($m)) return null;
    if (empty($m['id']) || !preg_match('/^[a-z0-9][a-z0-9_-]*$/', $m['id'])) return null;
    if (empty($m['name'])) return null;
    $m['_dir']          = $dir;
    $m['_table_prefix'] = preg_replace('/[^a-z0-9_]/', '_', strtolower($m['table_prefix'] ?? str_replace('-', '_', $m['id'])));
    return $m;
}

function pluginsGetAll(): array {
    static $all = null;
    if ($all !== null) return $all;
    $all = [];
    $base = pluginsDir();
    if (!is_dir($base)) return $all;
    foreach (scandir($base) as $entry) {
        if ($entry === '.' || $entry === '..') continue;
        $path = $base . DIRECTORY_SEPARATOR . $entry;
        if (!is_dir($path)) continue;
        $m = pluginsReadManifest($path);
        if ($m === null) continue;
        $all[$m['id']] = $m;
    }
    return $all;
}

function pluginsGetActiveIds(): array {
    static $ids = null;
    if ($ids !== null) return $ids;
    try {
        $rows = getDB()->query(q("SELECT id FROM {plugins} WHERE is_active = 1"))->fetchAll(PDO::FETCH_COLUMN);
        $ids = $rows ?: [];
    } catch (Exception $e) {
        $ids = [];
    }
    return $ids;
}

function initPlugins(): void {
    static $done = false;
    if ($done) return;
    $done = true;
    if (!isset($GLOBALS['_ac_active_plugins'])) $GLOBALS['_ac_active_plugins'] = [];
    $activeIds = pluginsGetActiveIds();
    if (empty($activeIds)) return;
    $all = pluginsGetAll();
    foreach ($activeIds as $id) {
        if (isset($all[$id])) $GLOBALS['_ac_active_plugins'][$id] = $all[$id];
    }
}

// True only when the digital-ownership integration is both configured (OWNERSHIP_API_URL,
// used already throughout plugins/ownership and plugins/core-altered-cards' alt-art papi
// proxies) AND the "ownership" plugin is actually active in this installation's plugin
// registry. Uses the already-populated $GLOBALS['_ac_active_plugins'] (see initPlugins())
// rather than calling pluginsGetActiveIds() again, avoiding a redundant DB query.
function ownershipIsActive(): bool {
    return defined('OWNERSHIP_API_URL') && OWNERSHIP_API_URL
        && isset($GLOBALS['_ac_active_plugins']['ownership']);
}

/** Cookie of « Beta Deckbuilder » (account menu of the theme): '1' when the visitor turned it on, in this browser. */
const AC_BETA_COOKIE = 'ac_beta';

function betaModeOn(): bool {
    return ($_COOKIE[AC_BETA_COOKIE] ?? '') === '1';
}

/**
 * SPA pages of active plugins with `beta_slugs` (manifest), as [plugin, page] pairs: the theme shows the
 * « Beta Deckbuilder » toggle when there is one.
 */
function pluginBetaPages(): array {
    $out = [];
    foreach ($GLOBALS['_ac_active_plugins'] ?? [] as $plugin) {
        foreach ($plugin['pages'] ?? [] as $page) {
            if (($page['type'] ?? 'php') === 'spa' && !empty($page['beta_slugs'])) $out[] = [$plugin, $page];
        }
    }
    return $out;
}

/**
 * The SPA page that serves $slug in beta mode (e.g. the site's decks pages), at the same URL, with its own slug
 * (`own_slug`); null when none does. pluginFindPage() keeps serving the slug otherwise.
 */
function pluginFindBetaPage(string $slug): ?array {
    foreach (pluginBetaPages() as [$plugin, $page]) {
        if (in_array($slug, (array)$page['beta_slugs'], true)) {
            return ['slug' => $slug, 'own_slug' => $page['slug'], 'base_path' => BASE_URL . '/pages/'] + spaResolvePage($plugin, $page);
        }
    }
    return null;
}

function pluginFindPage(string $slug): ?array {
    foreach ($GLOBALS['_ac_active_plugins'] ?? [] as $id => $plugin) {
        foreach ($plugin['pages'] ?? [] as $page) {
            if (($page['slug'] ?? '') !== $slug) continue;
            // Manifest v2: a prebuilt front-end mounted by the shell (see includes/spa.php).
            if (($page['type'] ?? 'php') === 'spa') {
                return spaResolvePage($plugin, $page);
            }
            $abs = $plugin['_dir'] . DIRECTORY_SEPARATOR . ltrim(str_replace('/', DIRECTORY_SEPARATOR, $page['file'] ?? ''), DIRECTORY_SEPARATOR);
            if (!is_file($abs)) continue;
            $css = [];
            $js  = [];
            foreach ($plugin['assets']['css'] ?? [] as $f) {
                $css[] = BASE_URL . '/plugins/' . $id . '/' . ltrim($f, '/');
            }
            foreach ($plugin['assets']['js'] ?? [] as $f) {
                $js[] = BASE_URL . '/plugins/' . $id . '/' . ltrim($f, '/');
            }
            return ['slug' => $slug, 'type' => 'php', 'plugin_id' => $id, 'abs_file' => $abs, 'plugin_css' => $css, 'plugin_js' => $js, '_table_prefix' => $plugin['_table_prefix'] ?? '', 'title_en' => $page['title_en'] ?? '', 'title_fr' => $page['title_fr'] ?? '', 'fullwidth' => !empty($page['fullwidth'])];
        }
    }
    return null;
}

function pluginsGetGlobalAssets(): array {
    $css = [];
    $js  = [];
    $php = [];
    foreach ($GLOBALS['_ac_active_plugins'] ?? [] as $id => $plugin) {
        foreach ($plugin['assets']['global_css'] ?? [] as $f) {
            $css[] = BASE_URL . '/plugins/' . $id . '/' . ltrim($f, '/');
        }
        foreach ($plugin['assets']['global_js'] ?? [] as $f) {
            $js[] = BASE_URL . '/plugins/' . $id . '/' . ltrim($f, '/');
        }
        foreach ($plugin['assets']['global_php'] ?? [] as $f) {
            $abs = $plugin['_dir'] . DIRECTORY_SEPARATOR . ltrim(str_replace('/', DIRECTORY_SEPARATOR, $f), DIRECTORY_SEPARATOR);
            if (file_exists($abs)) $php[] = $abs;
        }
    }
    return ['css' => $css, 'js' => $js, 'php' => $php];
}

function pluginsGetAdminSections(): array {
    $sections = [];
    foreach ($GLOBALS['_ac_active_plugins'] ?? [] as $id => $plugin) {
        foreach ($plugin['admin'] ?? [] as $section) {
            if (empty($section['section']) || empty($section['file'])) continue;
            $abs = $plugin['_dir'] . DIRECTORY_SEPARATOR . ltrim(str_replace('/', DIRECTORY_SEPARATOR, $section['file']), DIRECTORY_SEPARATOR);
            if (!file_exists($abs)) continue;
            $sections[] = array_merge($section, ['plugin_id' => $id, 'abs_file' => $abs, '_table_prefix' => $plugin['_table_prefix'] ?? '']);
        }
    }
    return $sections;
}

function pluginFindApi(string $pluginId, string $endpoint): ?array {
    $plugins = $GLOBALS['_ac_active_plugins'] ?? [];
    if (!isset($plugins[$pluginId])) return null;
    $plugin = $plugins[$pluginId];
    foreach ($plugin['api'] ?? [] as $entry) {
        if (($entry['endpoint'] ?? '') !== $endpoint) continue;
        $abs = $plugin['_dir'] . DIRECTORY_SEPARATOR . ltrim(str_replace('/', DIRECTORY_SEPARATOR, $entry['file']), DIRECTORY_SEPARATOR);
        if (!file_exists($abs)) continue;
        return [
            'plugin_id' => $pluginId, 'endpoint' => $endpoint, 'abs_file' => $abs, '_table_prefix' => $plugin['_table_prefix'] ?? '',
            'methods'   => isset($entry['methods']) ? array_map('strtoupper', (array)$entry['methods']) : null,
            'auth'      => in_array($entry['auth'] ?? null, ['user', 'admin'], true) ? $entry['auth'] : null,
            'csrf'      => ($entry['csrf'] ?? true) !== false,
        ];
    }
    return null;
}

/**
 * Decoded JSON body of the current plugin API request ([] when absent or not JSON). Read once:
 * the router uses it for the CSRF check, endpoints call it instead of reading php://input.
 */
function pluginApiBody(): array {
    static $body = null;
    if ($body === null) {
        $type = strtolower((string)($_SERVER['CONTENT_TYPE'] ?? ''));
        $data = strpos($type, 'json') !== false ? json_decode((string)file_get_contents('php://input'), true) : null;
        $body = is_array($data) ? $data : [];
    }
    return $body;
}

/**
 * Checks the router applies before a plugin API endpoint runs, from its manifest entry:
 *   "methods": ["GET", "POST"]   other methods → 405 (default: any method)
 *   "auth": "user" | "admin"     signed-in user → else 401; site admin → else 403 (default: public)
 *   "csrf": false                opt out of the CSRF check (e.g. a webhook with its own signature)
 * Every request other than GET / HEAD / OPTIONS needs the session's CSRF token, sent as the
 * X-CSRF-Token header or as a csrf_token field (form or JSON body) → else 403.
 * Returns null when the request may proceed, else [status, error code, extra headers].
 */
function pluginApiGuard(array $api): ?array {
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    if ($api['methods'] !== null && !in_array($method, $api['methods'], true)) {
        return [405, 'method_not_allowed', ['Allow: ' . implode(', ', $api['methods'])]];
    }
    if (!in_array($method, ['GET', 'HEAD', 'OPTIONS'], true) && $api['csrf']) {
        $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_POST['csrf_token'] ?? pluginApiBody()['csrf_token'] ?? null;
        if (!csrfValid(is_string($token) ? $token : null)) return [403, 'csrf', []];
    }
    if ($api['auth'] === 'user' && !kcIsLoggedIn()) return [401, 'unauthenticated', []];
    if ($api['auth'] === 'admin' && !isAdminUser()) return [kcIsLoggedIn() ? 403 : 401, kcIsLoggedIn() ? 'forbidden' : 'unauthenticated', []];
    return null;
}

// Suggested menu entries (manifest v2 "menu"). Adds each entry to {nav_items} unless an
// item with the same URL already exists, so admins keep control of labels, order and
// visibility after the first activation. An entry with `children` becomes a dropdown
// (URL "#", matched on its English label); its missing children are added under it. An entry
// with `parent_url` goes inside the existing top-level menu that has this URL.
// Returns the number of items inserted.
function pluginMenuEntryUrl(array $entry): string {
    if (empty($entry['page'])) return (string)($entry['url'] ?? '');
    $url  = '/pages/' . preg_replace('/[^a-z0-9_-]/', '', $entry['page']);
    $path = trim(preg_replace('#[^a-z0-9_/-]#', '', (string)($entry['path'] ?? '')), '/');
    return $path !== '' ? $url . '/' . $path : $url;
}

function pluginApplyMenuSuggestions(array $manifest): int {
    $added  = 0;
    $db     = getDB();
    $insert = $db->prepare(q("INSERT INTO {nav_items} (parent_id, label_en, label_fr, url, icon, sort_order, is_visible) VALUES (:parent, :en, :fr, :url, :icon, :sort, 1)"));
    $exists = $db->prepare(q("SELECT COUNT(*) FROM {nav_items} WHERE url = :url"));
    foreach ($manifest['menu'] ?? [] as $entry) {
        if (!is_array($entry) || empty($entry['label_en']) || empty($entry['label_fr'])) continue;
        $children = array_values(array_filter((array)($entry['children'] ?? []), 'is_array'));
        $sort = isset($entry['sort_order']) ? (int)$entry['sort_order']
              : (int)$db->query(q("SELECT COALESCE(MAX(sort_order), 0) FROM {nav_items} WHERE parent_id IS NULL AND sort_order < 900"))->fetchColumn() + 5;

        if ($children === []) {
            $url = pluginMenuEntryUrl($entry);
            if ($url === '' || $url === '/pages/') continue;
            $exists->execute([':url' => $url]);
            if ((int)$exists->fetchColumn() > 0) continue;
            // "parent_url": inside an existing top-level menu (last, unless sort_order says
            // otherwise); top level when the site has no such menu.
            $parentId = null;
            if (!empty($entry['parent_url'])) {
                $find = $db->prepare(q("SELECT id FROM {nav_items} WHERE parent_id IS NULL AND url = :url ORDER BY id LIMIT 1"));
                $find->execute([':url' => (string)$entry['parent_url']]);
                $parentId = $find->fetchColumn() ?: null;
            }
            if ($parentId !== null && !isset($entry['sort_order'])) {
                $last = $db->prepare(q("SELECT COALESCE(MAX(sort_order), 0) FROM {nav_items} WHERE parent_id = :p"));
                $last->execute([':p' => (int)$parentId]);
                $sort = (int)$last->fetchColumn() + 10;
            }
            $insert->execute([':parent' => $parentId !== null ? (int)$parentId : null, ':en' => $entry['label_en'], ':fr' => $entry['label_fr'], ':url' => $url, ':icon' => $entry['icon'] ?? null, ':sort' => $sort]);
            $added++;
            continue;
        }

        $find = $db->prepare(q("SELECT id FROM {nav_items} WHERE parent_id IS NULL AND url = '#' AND label_en = :en ORDER BY id LIMIT 1"));
        $find->execute([':en' => $entry['label_en']]);
        $parentId = $find->fetchColumn();
        if ($parentId === false) {
            $insert->execute([':parent' => null, ':en' => $entry['label_en'], ':fr' => $entry['label_fr'], ':url' => '#', ':icon' => $entry['icon'] ?? null, ':sort' => $sort]);
            $parentId = $db->lastInsertId();
            $added++;
        }
        foreach ($children as $i => $child) {
            $url = pluginMenuEntryUrl($child);
            if (empty($child['label_en']) || empty($child['label_fr']) || $url === '' || $url === '/pages/') continue;
            $exists->execute([':url' => $url]);
            if ((int)$exists->fetchColumn() > 0) continue;
            $insert->execute([':parent' => (int)$parentId, ':en' => $child['label_en'], ':fr' => $child['label_fr'], ':url' => $url, ':icon' => $child['icon'] ?? null, ':sort' => isset($child['sort_order']) ? (int)$child['sort_order'] : ($i + 1) * 10]);
            $added++;
        }
    }
    return $added;
}

// Activation shared by admin/plugins.php and bin/plugins.php: conflict check, DB row,
// install SQL on first activation, menu suggestions. Returns a list of error strings.
function pluginActivate(string $pluginId): array {
    $all = pluginsGetAll();
    if (!isset($all[$pluginId])) return ['Plugin not found.'];
    $m = $all[$pluginId];
    $conflictErrors = pluginCheckConflicts($m, $pluginId);
    if (!empty($conflictErrors)) return array_map(fn($e) => 'Slug conflict: ' . $e, $conflictErrors);

    $db = getDB();
    // Ensure a DB row exists (covers plugins present on disk but not uploaded via ZIP)
    $db->prepare(q("INSERT IGNORE INTO {plugins} (id, version) VALUES (:id, :v)"))
       ->execute([':id' => $pluginId, ':v' => $m['version'] ?? null]);
    // Run SQL on first activation
    $row = $db->prepare(q("SELECT sql_installed_at FROM {plugins} WHERE id = :id"));
    $row->execute([':id' => $pluginId]);
    $existing = $row->fetch();
    if ($existing && $existing['sql_installed_at'] === null && !empty($m['sql'])) {
        $sqlFile = $m['_dir'] . DIRECTORY_SEPARATOR . ltrim(str_replace('/', DIRECTORY_SEPARATOR, $m['sql']), DIRECTORY_SEPARATOR);
        if (file_exists($sqlFile)) {
            try {
                $GLOBALS['_ac_current_plugin_prefix'] = $m['_table_prefix'] ?? '';
                $db->exec(qp(file_get_contents($sqlFile)));
                unset($GLOBALS['_ac_current_plugin_prefix']);
                $db->prepare(q("UPDATE {plugins} SET sql_installed_at = NOW() WHERE id = :id"))->execute([':id' => $pluginId]);
            } catch (Exception $e) {
                return ['SQL install error: ' . $e->getMessage()];
            }
        }
    }
    $db->prepare(q("UPDATE {plugins} SET is_active = 1, version = :v, activated_at = NOW() WHERE id = :id"))
       ->execute([':v' => $m['version'] ?? null, ':id' => $pluginId]);
    try { pluginApplyMenuSuggestions($m); } catch (Exception $e) { /* menu is a convenience */ }
    return [];
}

// conflict detection
// Returns an array of human-readable error strings (empty = no conflicts).
// Pass $skipPluginId to ignore conflicts with the plugin being updated/activated.
function pluginCheckConflicts(array $manifest, string $skipPluginId = ''): array {
    $errors = [];

    // Core page slugs — every .php file in pages/
    $corePageSlugs = [];
    foreach (glob(dirname(__DIR__) . '/pages/*.php') ?: [] as $f) {
        $corePageSlugs[basename($f, '.php')] = true;
    }

    // Admin-created page slugs from the DB
    $dbPageSlugs = [];
    try {
        $rows = getDB()->query(q("SELECT slug FROM {pages}"))->fetchAll(PDO::FETCH_COLUMN);
        foreach ($rows as $s) $dbPageSlugs[$s] = true;
    } catch (Exception $e) {}

    // Core admin section slugs — every .php file in admin/ except dispatchers
    $coreAdminSlugs = [];
    $skipAdminFiles = ['index', 'plugin-page'];
    foreach (glob(dirname(__DIR__) . '/admin/*.php') ?: [] as $f) {
        $s = basename($f, '.php');
        if (!in_array($s, $skipAdminFiles, true)) $coreAdminSlugs[$s] = true;
    }

    // Other installed plugins' page slugs and admin section slugs
    $otherPageSlugs    = [];
    $otherSectionSlugs = [];
    foreach (pluginsGetAll() as $pid => $plugin) {
        if ($pid === $skipPluginId) continue;
        foreach ($plugin['pages'] ?? [] as $page) {
            if (!empty($page['slug'])) $otherPageSlugs[$page['slug']] = $pid;
        }
        foreach ($plugin['admin'] ?? [] as $section) {
            if (!empty($section['section'])) $otherSectionSlugs[$section['section']] = $pid;
        }
    }

    // Check the manifest's front-end pages
    foreach ($manifest['pages'] ?? [] as $page) {
        $slug = $page['slug'] ?? '';
        if ($slug === '') continue;
        if (isset($corePageSlugs[$slug])) {
            $errors[] = "Page slug \"{$slug}\" conflicts with a core page (pages/{$slug}.php).";
        } elseif (isset($dbPageSlugs[$slug])) {
            $errors[] = "Page slug \"{$slug}\" conflicts with an admin-created page in the database.";
        } elseif (isset($otherPageSlugs[$slug])) {
            $errors[] = "Page slug \"{$slug}\" conflicts with plugin \"{$otherPageSlugs[$slug]}\".";
        }
    }

    // Check the manifest's admin sections
    foreach ($manifest['admin'] ?? [] as $section) {
        $s = $section['section'] ?? '';
        if ($s === '') continue;
        if (isset($coreAdminSlugs[$s])) {
            $errors[] = "Admin section \"{$s}\" conflicts with a core admin section (admin/{$s}.php).";
        } elseif (isset($otherSectionSlugs[$s])) {
            $errors[] = "Admin section \"{$s}\" conflicts with plugin \"{$otherSectionSlugs[$s]}\".";
        }
    }

    return $errors;
}

// zIP helpers (used by admin/plugins.php)

function pluginValidateZip(ZipArchive $zip, array $manifest, string $prefix): array {
    $errors = [];

    if (!preg_match('/^[a-z0-9][a-z0-9_-]*$/', $manifest['id'] ?? '')) {
        $errors[] = 'Invalid id format — use lowercase letters, digits, hyphens and underscores only.';
    }
    if (empty($manifest['name'])) {
        $errors[] = 'Missing required field: name.';
    }

    $zipHasFile = function (string $relPath) use ($zip, $prefix): bool {
        $fwd = str_replace('\\', '/', $relPath);
        $bwd = str_replace('/', '\\', $relPath);
        return $zip->locateName($prefix . $fwd) !== false
            || $zip->locateName($prefix . $bwd) !== false;
    };

    if (isset($manifest['pages'])) {
        if (!is_array($manifest['pages'])) {
            $errors[] = '"pages" must be an array.';
        } else {
            foreach ($manifest['pages'] as $i => $page) {
                $n = $i + 1;
                if (empty($page['slug'])) {
                    $errors[] = "pages[$n]: missing required field 'slug'.";
                } elseif (!preg_match('/^[a-z0-9][a-z0-9_-]*$/', $page['slug'])) {
                    $errors[] = "pages[$n]: invalid slug '{$page['slug']}'.";
                }
                if (($page['type'] ?? 'php') === 'spa') {
                    // The build output must be inside the ZIP: the shell never builds plugins.
                    if (empty($page['entry'])) {
                        $errors[] = "pages[$n]: SPA page needs an 'entry' (build manifest).";
                    } elseif (!$zipHasFile($page['entry'])) {
                        $errors[] = "pages[$n]: build manifest '{$page['entry']}' not found in ZIP (build the plugin before zipping it).";
                    }
                } elseif (empty($page['file'])) {
                    $errors[] = "pages[$n]: missing required field 'file'.";
                } elseif (!$zipHasFile($page['file'])) {
                    $errors[] = "pages[$n]: file '{$page['file']}' not found in ZIP.";
                }
            }
        }
    }

    if (isset($manifest['admin'])) {
        if (!is_array($manifest['admin'])) {
            $errors[] = '"admin" must be an array.';
        } else {
            foreach ($manifest['admin'] as $i => $section) {
                $n = $i + 1;
                if (empty($section['section'])) {
                    $errors[] = "admin[$n]: missing required field 'section'.";
                } elseif (!preg_match('/^[a-z0-9][a-z0-9_-]*$/', $section['section'])) {
                    $errors[] = "admin[$n]: invalid section slug '{$section['section']}'.";
                }
                if (empty($section['file'])) {
                    $errors[] = "admin[$n]: missing required field 'file'.";
                } elseif (!$zipHasFile($section['file'])) {
                    $errors[] = "admin[$n]: file '{$section['file']}' not found in ZIP.";
                }
            }
        }
    }

    if (isset($manifest['api'])) {
        if (!is_array($manifest['api'])) {
            $errors[] = '"api" must be an array.';
        } else {
            foreach ($manifest['api'] as $i => $entry) {
                $n = $i + 1;
                if (empty($entry['endpoint'])) {
                    $errors[] = "api[$n]: missing required field 'endpoint'.";
                } elseif (!preg_match('/^[a-z0-9][a-z0-9_-]*$/', $entry['endpoint'])) {
                    $errors[] = "api[$n]: invalid endpoint '{$entry['endpoint']}'.";
                }
                if (empty($entry['file'])) {
                    $errors[] = "api[$n]: missing required field 'file'.";
                } elseif (!$zipHasFile($entry['file'])) {
                    $errors[] = "api[$n]: file '{$entry['file']}' not found in ZIP.";
                }
            }
        }
    }

    if (!empty($manifest['sql']) && !$zipHasFile($manifest['sql'])) {
        $errors[] = "SQL file '{$manifest['sql']}' declared in manifest but not found in ZIP.";
    }

    if (isset($manifest['assets']['css']) && is_array($manifest['assets']['css'])) {
        foreach ($manifest['assets']['css'] as $f) {
            if (!$zipHasFile($f)) {
                $errors[] = "CSS asset '$f' declared in manifest but not found in ZIP.";
            }
        }
    }
    if (isset($manifest['assets']['js']) && is_array($manifest['assets']['js'])) {
        foreach ($manifest['assets']['js'] as $f) {
            if (!$zipHasFile($f)) {
                $errors[] = "JS asset '$f' declared in manifest but not found in ZIP.";
            }
        }
    }
    if (isset($manifest['assets']['global_css']) && is_array($manifest['assets']['global_css'])) {
        foreach ($manifest['assets']['global_css'] as $f) {
            if (!$zipHasFile($f)) {
                $errors[] = "Global CSS asset '$f' declared in manifest but not found in ZIP.";
            }
        }
    }
    if (isset($manifest['assets']['global_js']) && is_array($manifest['assets']['global_js'])) {
        foreach ($manifest['assets']['global_js'] as $f) {
            if (!$zipHasFile($f)) {
                $errors[] = "Global JS asset '$f' declared in manifest but not found in ZIP.";
            }
        }
    }
    if (isset($manifest['assets']['global_php']) && is_array($manifest['assets']['global_php'])) {
        foreach ($manifest['assets']['global_php'] as $f) {
            if (!$zipHasFile($f)) {
                $errors[] = "Global PHP asset '$f' declared in manifest but not found in ZIP.";
            }
        }
    }

    return $errors;
}

function pluginReadManifestFromZip(ZipArchive $zip): ?array {
    $prefix      = '';
    $manifestIdx = -1;
    for ($i = 0; $i < $zip->numFiles; $i++) {
        $name = str_replace('\\', '/', $zip->getNameIndex($i));
        if ($name === 'plugin.json') {
            $manifestIdx = $i;
            $prefix      = '';
            break;
        }
        if (preg_match('/^([a-z0-9_-]+)\/plugin\.json$/', $name, $mt)) {
            $manifestIdx = $i;
            $prefix      = $mt[1] . '/';
            break;
        }
    }
    if ($manifestIdx === -1) return null;
    $content = $zip->getFromIndex($manifestIdx);
    if ($content === false) return null;
    $m = json_decode($content, true);
    if (!is_array($m)) return null;
    if (empty($m['id']) || !preg_match('/^[a-z0-9][a-z0-9_-]*$/', $m['id'])) return null;
    if (empty($m['name'])) return null;
    $m['_zip_prefix']   = $prefix;
    $m['_table_prefix'] = preg_replace('/[^a-z0-9_]/', '_', strtolower($m['table_prefix'] ?? str_replace('-', '_', $m['id'])));
    return $m;
}

function pluginExtractZip(ZipArchive $zip, string $prefix, string $destDir): bool {
    for ($i = 0; $i < $zip->numFiles; $i++) {
        $name = str_replace('\\', '/', $zip->getNameIndex($i));
        if ($prefix !== '') {
            if (strpos($name, $prefix) !== 0) continue;
            $rel = substr($name, strlen($prefix));
        } else {
            $rel = $name;
        }
        if ($rel === '' || substr($rel, -1) === '/') continue;
        if (strpos($rel, '..') !== false || $rel[0] === '/' || $rel[0] === '\\') return false;

        // Skip excluded files and directories.
        $skip = false;
        foreach (PLUGIN_INSTALL_EXCLUDE as $excl) {
            if (substr($excl, -1) === '/') {
                // Directory prefix rule: skip anything inside this folder.
                if (strpos($rel, $excl) === 0) { $skip = true; break; }
            } elseif (strpos($excl, '/') !== false) {
                // Exact relative path rule.
                if ($rel === $excl) { $skip = true; break; }
            } else {
                // Basename rule: skip wherever the file appears in the tree.
                if (basename($rel) === $excl) { $skip = true; break; }
            }
        }
        if ($skip) continue;

        $dest     = $destDir . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $rel);
        $destDir2 = dirname($dest);
        if (!is_dir($destDir2) && !mkdir($destDir2, 0755, true)) return false;
        $content = $zip->getFromIndex($i);
        if ($content === false) return false;
        file_put_contents($dest, $content);
    }
    return true;
}
