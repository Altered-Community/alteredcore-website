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

function pluginFindPage(string $slug): ?array {
    foreach ($GLOBALS['_ac_active_plugins'] ?? [] as $id => $plugin) {
        foreach ($plugin['pages'] ?? [] as $page) {
            if (($page['slug'] ?? '') !== $slug) continue;
            $abs = $plugin['_dir'] . DIRECTORY_SEPARATOR . ltrim(str_replace('/', DIRECTORY_SEPARATOR, $page['file']), DIRECTORY_SEPARATOR);
            if (!file_exists($abs)) continue;
            $css = [];
            $js  = [];
            foreach ($plugin['assets']['css'] ?? [] as $f) {
                $css[] = BASE_URL . '/plugins/' . $id . '/' . ltrim($f, '/');
            }
            foreach ($plugin['assets']['js'] ?? [] as $f) {
                $js[] = BASE_URL . '/plugins/' . $id . '/' . ltrim($f, '/');
            }
            return ['slug' => $slug, 'plugin_id' => $id, 'abs_file' => $abs, 'plugin_css' => $css, 'plugin_js' => $js, '_table_prefix' => $plugin['_table_prefix'] ?? '', 'title_en' => $page['title_en'] ?? '', 'title_fr' => $page['title_fr'] ?? ''];
        }
    }
    return null;
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
        return ['plugin_id' => $pluginId, 'endpoint' => $endpoint, 'abs_file' => $abs, '_table_prefix' => $plugin['_table_prefix'] ?? ''];
    }
    return null;
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
                if (empty($page['file'])) {
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
