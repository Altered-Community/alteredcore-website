<?php
$adminPageTitle = 'Plugins';
$adminSection   = 'plugins';
require_once __DIR__ . '/includes/header.php';

$db = getDB();

// actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        flash('Invalid token.', 'error');
        redirect(BASE_URL . '/admin/plugins');
    }

    $action   = $_POST['action']    ?? '';
    $pluginId = preg_replace('/[^a-z0-9_-]/', '', $_POST['plugin_id'] ?? '');

    // upload ZIP (install or update)
    if ($action === 'upload') {
        if (empty($_FILES['plugin_zip']['tmp_name'])) {
            flash('No file uploaded.', 'error');
            redirect(BASE_URL . '/admin/plugins');
        }
        $fh    = fopen($_FILES['plugin_zip']['tmp_name'], 'rb');
        $magic = fread($fh, 4);
        fclose($fh);
        if ($magic !== "PK\x03\x04") {
            flash('The uploaded file is not a valid ZIP archive.', 'error');
            redirect(BASE_URL . '/admin/plugins');
        }
        if (!class_exists('ZipArchive')) {
            flash('ZipArchive extension not available on this server.', 'error');
            redirect(BASE_URL . '/admin/plugins');
        }
        $zip = new ZipArchive();
        if ($zip->open($_FILES['plugin_zip']['tmp_name']) !== true) {
            flash('Could not open ZIP file.', 'error');
            redirect(BASE_URL . '/admin/plugins');
        }
        $manifest = pluginReadManifestFromZip($zip);
        if (!$manifest) {
            $zip->close();
            flash('Invalid plugin: plugin.json manifest not found or contains invalid id/name.', 'error');
            redirect(BASE_URL . '/admin/plugins');
        }
        $pid        = $manifest['id'];
        $prefix     = $manifest['_zip_prefix'];
        $newVersion = $manifest['version'] ?? '0.0.0';
        $validationErrors = pluginValidateZip($zip, $manifest, $prefix);
        if (!empty($validationErrors)) {
            $zip->close();
            flash('Plugin validation failed: ' . implode(' · ', $validationErrors), 'error');
            redirect(BASE_URL . '/admin/plugins');
        }
        $destDir = pluginsDir() . DIRECTORY_SEPARATOR . $pid;

        if (is_dir($destDir)) {
            // update existing plugin
            $dbRow = $db->prepare(q("SELECT version, is_active FROM {plugins} WHERE id = :id"));
            $dbRow->execute([':id' => $pid]);
            $existing        = $dbRow->fetch();
            $installedVersion = ($existing && $existing['version']) ? $existing['version'] : '0.0.0';

            if (version_compare($newVersion, $installedVersion, '<=')) {
                $zip->close();
                flash(
                    'Plugin "' . h($pid) . '" is already at v' . h($installedVersion) .
                    '. The uploaded version (v' . h($newVersion) . ') is not newer.',
                    'error'
                );
                redirect(BASE_URL . '/admin/plugins');
            }

            $conflictErrors = pluginCheckConflicts($manifest, $pid);
            if (!empty($conflictErrors)) {
                $zip->close();
                flash('Plugin cannot be updated — slug conflict(s): ' . implode(' · ', $conflictErrors), 'error');
                redirect(BASE_URL . '/admin/plugins');
            }

            // Wipe existing files
            $it = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($destDir, RecursiveDirectoryIterator::SKIP_DOTS),
                RecursiveIteratorIterator::CHILD_FIRST
            );
            foreach ($it as $item) {
                $item->isDir() ? rmdir($item->getPathname()) : unlink($item->getPathname());
            }

            if (!pluginExtractZip($zip, $prefix, $destDir)) {
                $zip->close();
                flash('Extraction failed — possible path traversal attempt in ZIP.', 'error');
                redirect(BASE_URL . '/admin/plugins');
            }
            $zip->close();

            // Run applicable migration files: update_{version}.sql
            // where installedVersion < version <= newVersion
            $migrationsRun = 0;
            $sqlDir = $destDir . DIRECTORY_SEPARATOR . 'sql';
            if (is_dir($sqlDir)) {
                $migrations = [];
                foreach (scandir($sqlDir) as $f) {
                    if (!preg_match('/^update_(.+)\.sql$/', $f, $mt)) continue;
                    $migVer = $mt[1];
                    if (version_compare($migVer, $installedVersion, '>') &&
                        version_compare($migVer, $newVersion, '<=')) {
                        $migrations[$migVer] = $sqlDir . DIRECTORY_SEPARATOR . $f;
                    }
                }
                uksort($migrations, 'version_compare');
                $GLOBALS['_ac_current_plugin_prefix'] = $manifest['_table_prefix'] ?? '';
                foreach ($migrations as $migVer => $file) {
                    try {
                        $db->exec(qp(file_get_contents($file)));
                        $migrationsRun++;
                    } catch (Exception $e) {
                        unset($GLOBALS['_ac_current_plugin_prefix']);
                        flash('Migration error (v' . $migVer . '): ' . $e->getMessage(), 'error');
                        redirect(BASE_URL . '/admin/plugins');
                    }
                }
                unset($GLOBALS['_ac_current_plugin_prefix']);
            }

            $db->prepare(q("INSERT IGNORE INTO {plugins} (id, version) VALUES (:id, :v)"))
               ->execute([':id' => $pid, ':v' => $newVersion]);
            $db->prepare(q("UPDATE {plugins} SET version = :v WHERE id = :id"))
               ->execute([':v' => $newVersion, ':id' => $pid]);

            $msg = 'Plugin "' . h($manifest['name']) . '" updated to v' . h($newVersion) . '.';
            if ($migrationsRun > 0) $msg .= ' ' . $migrationsRun . ' migration(s) applied.';
            flash($msg);
            redirect(BASE_URL . '/admin/plugins');
        }

        // fresh install
        $conflictErrors = pluginCheckConflicts($manifest);
        if (!empty($conflictErrors)) {
            $zip->close();
            flash('Plugin cannot be installed — slug conflict(s): ' . implode(' · ', $conflictErrors), 'error');
            redirect(BASE_URL . '/admin/plugins');
        }

        if (!mkdir($destDir, 0755, true)) {
            $zip->close();
            flash('Could not create plugin directory.', 'error');
            redirect(BASE_URL . '/admin/plugins');
        }
        if (!pluginExtractZip($zip, $prefix, $destDir)) {
            $zip->close();
            flash('Extraction failed — possible path traversal attempt in ZIP.', 'error');
            redirect(BASE_URL . '/admin/plugins');
        }
        $zip->close();
        $db->prepare(q("INSERT IGNORE INTO {plugins} (id, version) VALUES (:id, :v)"))
           ->execute([':id' => $pid, ':v' => $newVersion]);
        flash('Plugin "' . h($manifest['name']) . '" installed (v' . h($newVersion) . '). Activate it to enable it.');
        redirect(BASE_URL . '/admin/plugins');
    }

    // activate
    if ($action === 'activate' && $pluginId) {
        $all = pluginsGetAll();
        if (!isset($all[$pluginId])) {
            flash('Plugin not found.', 'error');
            redirect(BASE_URL . '/admin/plugins');
        }
        $m = $all[$pluginId];
        $conflictErrors = pluginCheckConflicts($m, $pluginId);
        if (!empty($conflictErrors)) {
            flash('Plugin cannot be activated — slug conflict(s): ' . implode(' · ', $conflictErrors), 'error');
            redirect(BASE_URL . '/admin/plugins');
        }
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
                    flash('SQL install error: ' . $e->getMessage(), 'error');
                    redirect(BASE_URL . '/admin/plugins');
                }
            }
        }
        $db->prepare(q("UPDATE {plugins} SET is_active = 1, version = :v, activated_at = NOW() WHERE id = :id"))
           ->execute([':v' => $m['version'] ?? null, ':id' => $pluginId]);
        flash('Plugin activated.');
        redirect(BASE_URL . '/admin/plugins');
    }

    // deactivate
    if ($action === 'deactivate' && $pluginId) {
        $db->prepare(q("UPDATE {plugins} SET is_active = 0 WHERE id = :id"))->execute([':id' => $pluginId]);
        flash('Plugin deactivated.');
        redirect(BASE_URL . '/admin/plugins');
    }

    // delete
    if ($action === 'delete' && $pluginId) {
        // Load manifest before deleting files (needed for table names)
        $allForDelete = pluginsGetAll();
        $manifestForDelete = $allForDelete[$pluginId] ?? null;
        // Ensure deactivated first
        $stmt = $db->prepare(q("DELETE FROM {plugins} WHERE id = :id AND is_active = 0"));
        $stmt->execute([':id' => $pluginId]);
        if ($stmt->rowCount() === 0) {
            flash('Deactivate the plugin before deleting it.', 'error');
            redirect(BASE_URL . '/admin/plugins');
        }
        // Optionally drop plugin tables
        if (!empty($_POST['drop_tables']) && $manifestForDelete && !empty($manifestForDelete['tables'])) {
            $GLOBALS['_ac_current_plugin_prefix'] = $manifestForDelete['_table_prefix'] ?? '';
            foreach ($manifestForDelete['tables'] as $table) {
                $safeName = preg_replace('/[^a-z0-9_]/', '', $table);
                if ($safeName === '') continue;
                try {
                    $db->exec(qp("DROP TABLE IF EXISTS {" . $safeName . "}"));
                } catch (Exception $e) {}
            }
            unset($GLOBALS['_ac_current_plugin_prefix']);
        }
        $dir = pluginsDir() . DIRECTORY_SEPARATOR . $pluginId;
        if (is_dir($dir)) {
            $it = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
                RecursiveIteratorIterator::CHILD_FIRST
            );
            foreach ($it as $item) {
                $item->isDir() ? rmdir($item->getPathname()) : unlink($item->getPathname());
            }
            rmdir($dir);
        }
        flash('Plugin deleted.');
        redirect(BASE_URL . '/admin/plugins');
    }
}

// load data
$allPlugins = pluginsGetAll();

// DB state per plugin
$dbRows = [];
try {
    $rows = $db->query(q("SELECT * FROM {plugins}"))->fetchAll();
    foreach ($rows as $r) $dbRows[$r['id']] = $r;
} catch (Exception $e) {}
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-puzzle-piece me-2"></i>Plugins</h1>
    <div class="d-flex gap-2">
        <a href="<?= BASE_URL ?>/plugins/README.html" target="_blank" class="btn btn-outline-secondary btn-sm">
            <i class="fa-solid fa-book me-1"></i> Dev docs
        </a>
        <button type="button" class="btn btn-primary-altered btn-sm" data-bs-toggle="modal" data-bs-target="#uploadModal">
            <i class="fa-solid fa-upload me-1"></i> Install plugin
        </button>
    </div>
</div>

<!-- Upload modal -->
<div class="modal fade" id="uploadModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content" style="border:none;border-radius:1rem;overflow:hidden">
            <div class="modal-header" style="border-bottom:1px solid var(--sand-300)">
                <h5 class="modal-title"><i class="fa-solid fa-upload me-2"></i>Install plugin from ZIP</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <form method="post" enctype="multipart/form-data">
                <div class="modal-body" style="background:var(--sand-50)">
                    <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                    <input type="hidden" name="action" value="upload">
                    <p class="text-muted small mb-3">The ZIP must contain a <code>plugin.json</code> manifest at its root (or inside a single top-level folder). If the plugin is already installed and the ZIP has a higher version number, it will be updated automatically.</p>
                    <input type="file" name="plugin_zip" accept=".zip" class="form-control" required>
                </div>
                <div class="modal-footer" style="border-top:1px solid var(--sand-300);background:var(--sand-50)">
                    <button type="button" class="btn btn-sm btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="submit" class="btn btn-sm btn-primary-altered">
                        <i class="fa-solid fa-upload me-1"></i> Install
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>

<!-- Delete modal -->
<div class="modal fade" id="deleteModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content" style="border:none;border-radius:1rem;overflow:hidden">
            <div class="modal-header" style="border-bottom:1px solid var(--sand-300)">
                <h5 class="modal-title"><i class="fa-solid fa-trash me-2"></i>Delete plugin</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <form method="post">
                <div class="modal-body" style="background:var(--sand-50)">
                    <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                    <input type="hidden" name="action" value="delete">
                    <input type="hidden" name="plugin_id" id="deletePluginId">
                    <p class="mb-3">Delete plugin <strong id="deletePluginName"></strong>?
                        This will permanently remove all plugin files from disk.</p>
                    <div id="deleteTablesBlock" style="display:none">
                        <div class="form-check">
                            <input type="checkbox" name="drop_tables" id="dropTables"
                                   class="form-check-input" value="1">
                            <label for="dropTables" class="form-check-label fw-semibold">
                                Also drop plugin database tables
                            </label>
                        </div>
                        <p id="deleteTablesList" class="small text-muted mt-1 mb-0 ms-4"></p>
                        <p class="small text-danger mt-1 ms-4 mb-0">This is irreversible — all data in these tables will be lost.</p>
                    </div>
                </div>
                <div class="modal-footer" style="border-top:1px solid var(--sand-300);background:var(--sand-50)">
                    <button type="button" class="btn btn-sm btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="submit" class="btn btn-sm btn-danger">
                        <i class="fa-solid fa-trash me-1"></i> Delete
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>

<script>
document.getElementById('deleteModal').addEventListener('show.bs.modal', function (e) {
    var btn    = e.relatedTarget;
    var tables = (btn.dataset.pluginTables || '').split(',').filter(Boolean);
    document.getElementById('deletePluginId').value        = btn.dataset.pluginId;
    document.getElementById('deletePluginName').textContent = btn.dataset.pluginName;
    document.getElementById('dropTables').checked          = false;
    var block = document.getElementById('deleteTablesBlock');
    if (tables.length) {
        block.style.display = '';
        document.getElementById('deleteTablesList').textContent =
            'Tables: ' + tables.map(function(t){ return 'plugin_' + t; }).join(', ');
    } else {
        block.style.display = 'none';
    }
});
</script>

<?php if (empty($allPlugins)): ?>
<div class="card-altered p-4 text-center text-muted">
    <i class="fa-solid fa-puzzle-piece fa-2x mb-3 d-block" style="opacity:.3"></i>
    No plugins installed yet. Upload a ZIP to get started.
</div>
<?php else: ?>
<div class="card-altered p-0" style="overflow:hidden">
    <div class="table-responsive">
    <table class="table table-sm mb-0">
        <thead>
            <tr>
                <th style="width:36px"></th>
                <th>Plugin</th>
                <th>Version</th>
                <th>Author</th>
                <th>Status</th>
                <th></th>
            </tr>
        </thead>
        <tbody>
        <?php foreach ($allPlugins as $pid => $plugin):
            $dbRow    = $dbRows[$pid] ?? null;
            $isActive = $dbRow && (int)$dbRow['is_active'] === 1;
        ?>
        <tr>
            <td class="text-center">
                <i class="<?= h($plugin['icon'] ?? 'fa-solid fa-puzzle-piece') ?> text-muted"></i>
            </td>
            <td>
                <div class="fw-semibold"><?= h($plugin['name']) ?></div>
                <?php if (!empty($plugin['description'])): ?>
                <div class="text-muted small"><?= h($plugin['description']) ?></div>
                <?php endif; ?>
            </td>
            <td class="small text-muted"><?= h($plugin['version'] ?? '—') ?></td>
            <td class="small text-muted"><?= h($plugin['author'] ?? '—') ?></td>
            <td>
                <?php if ($isActive): ?>
                <span class="badge bg-success">Active</span>
                <?php elseif ($dbRow): ?>
                <span class="badge bg-secondary">Inactive</span>
                <?php else: ?>
                <span class="badge bg-warning text-dark">Not registered</span>
                <?php endif; ?>
            </td>
            <td class="text-end">
                <form method="post" class="d-inline">
                    <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                    <input type="hidden" name="plugin_id" value="<?= h($pid) ?>">
                    <?php if ($isActive): ?>
                    <input type="hidden" name="action" value="deactivate">
                    <button type="submit" class="btn btn-sm btn-outline-secondary">Deactivate</button>
                    <?php else: ?>
                    <input type="hidden" name="action" value="activate">
                    <button type="submit" class="btn btn-sm btn-primary-altered">Activate</button>
                    <?php endif; ?>
                </form>
                <?php if (!$isActive): ?>
                <button type="button" class="btn btn-sm btn-outline-danger ms-1"
                        data-bs-toggle="modal" data-bs-target="#deleteModal"
                        data-plugin-id="<?= h($pid) ?>"
                        data-plugin-name="<?= h($plugin['name']) ?>"
                        data-plugin-tables="<?= h(implode(',', $plugin['tables'] ?? [])) ?>">
                    <i class="fa-solid fa-trash"></i>
                </button>
                <?php endif; ?>
            </td>
        </tr>
        <?php endforeach; ?>
        </tbody>
    </table>
    </div>
</div>
<?php endif; ?>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
