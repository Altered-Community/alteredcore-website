<?php
$adminSection   = 'shortcodes';
$adminPageTitle = 'Shortcodes';
require_once __DIR__ . '/includes/header.php';

$scFile = dirname(__DIR__) . '/data/tinymce_shortcodes.json';
$scDefs = [];
if (file_exists($scFile)) {
    $parsed = json_decode(file_get_contents($scFile), true);
    $scDefs = $parsed['shortcodes'] ?? [];
}

// DELETE handler
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        flash('Invalid token.', 'error');
        redirect(BASE_URL . '/admin/shortcodes');
    }
    if (($_POST['action'] ?? '') === 'delete') {
        if (!adminCanDelete()) { flash('You do not have permission to delete.', 'error'); redirect(BASE_URL . '/admin/shortcodes'); }
        $tagToDelete = $_POST['tag'] ?? '';
        $scDefs = array_values(array_filter($scDefs, function ($sc) use ($tagToDelete) {
            return ($sc['tag'] ?? '') !== $tagToDelete;
        }));
        file_put_contents($scFile, json_encode(
            ['shortcodes' => $scDefs],
            JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        ));
        flash('Shortcode deleted.');
        redirect(BASE_URL . '/admin/shortcodes');
    }
}
?>

<div class="admin-header-bar">
    <h1>
        <i class="fa-solid fa-code me-2"></i>Shortcodes
        <span class="badge bg-secondary ms-1" style="font-size:.75rem"><?= count($scDefs) ?></span>
    </h1>
    <?php if (adminCanCreate()): ?>
    <a href="<?= BASE_URL ?>/admin/shortcode-edit" class="btn btn-primary-altered btn-sm">
        <i class="fa-solid fa-plus me-1"></i> New shortcode
    </a>
    <?php endif; ?>
</div>

<div class="card-altered p-3">
    <?php if (empty($scDefs)): ?>
        <p class="text-muted">No shortcodes defined yet.</p>
    <?php else: ?>
    <table class="table table-sm mb-0">
        <thead>
            <tr>
                <th>Tag</th>
                <th>Label</th>
                <th>Description</th>
                <th>MCE icon</th>
                <th>Params</th>
                <th></th>
            </tr>
        </thead>
        <tbody>
        <?php foreach ($scDefs as $sc): ?>
            <tr>
                <td><code>[<?= h($sc['tag'] ?? '') ?>]</code></td>
                <td><?= h($sc['label'] ?? '') ?></td>
                <td class="small text-muted"><?= h($sc['description'] ?? '') ?></td>
                <td class="small text-muted">
                    <?php if (!empty($sc['mce_icon'])): ?>
                        <code><?= h($sc['mce_icon']) ?></code>
                    <?php else: ?>
                        <span class="text-muted">—</span>
                    <?php endif; ?>
                </td>
                <td class="small text-muted"><?= count($sc['params'] ?? []) ?></td>
                <td class="text-end">
                    <?php if (adminCanEdit()): ?>
                    <a href="<?= BASE_URL ?>/admin/shortcode-edit?tag=<?= urlencode($sc['tag'] ?? '') ?>"
                       class="btn btn-outline-primary btn-sm me-1" title="Edit">
                        <i class="fa-solid fa-pen"></i>
                    </a>
                    <?php endif; ?>
                    <?php if (adminCanDelete()): ?>
                    <form method="post" class="d-inline"
                          onsubmit="return confirm('Delete shortcode [<?= h(addslashes($sc['tag'] ?? '')) ?>]?\nExisting content using this shortcode will show the raw tag.')">
                        <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                        <input type="hidden" name="action"     value="delete">
                        <input type="hidden" name="tag"        value="<?= h($sc['tag'] ?? '') ?>">
                        <button type="submit" class="btn btn-outline-danger btn-sm">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </form>
                    <?php endif; ?>
                </td>
            </tr>
        <?php endforeach; ?>
        </tbody>
    </table>
    <?php endif; ?>
</div>

<div class="mt-3 text-muted small">
    <i class="fa-solid fa-circle-info me-1"></i>
    Shortcodes are stored in <code>data/tinymce_shortcodes.json</code>.
    The TinyMCE dropdown updates automatically on next page load.
    Deleting a shortcode does <strong>not</strong> affect existing content — the raw tag will remain unrendered.
    To render a new shortcode tag, add a PHP function in <code>includes/shortcodes.php</code>.
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
