<?php
$adminSection   = 'shortcodes';
$isNew          = !isset($_GET['tag']);
$adminPageTitle = $isNew ? 'New shortcode' : 'Edit shortcode';
require_once __DIR__ . '/includes/header.php';

$scFile = dirname(__DIR__) . '/data/tinymce_shortcodes.json';
$scDefs = [];
if (file_exists($scFile)) {
    $parsed = json_decode(file_get_contents($scFile), true);
    $scDefs = $parsed['shortcodes'] ?? [];
}

// Find existing shortcode by tag
$scIndex   = null;
$sc        = null;
$tagLookup = $_GET['tag'] ?? '';
foreach ($scDefs as $i => $item) {
    if (($item['tag'] ?? '') === $tagLookup) {
        $scIndex = $i;
        $sc      = $item;
        break;
    }
}
if (!$isNew && $sc === null) {
    flash('Shortcode not found.', 'error');
    redirect(BASE_URL . '/admin/shortcodes');
}

// POST handler
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        flash('Invalid token.', 'error');
        redirect(BASE_URL . '/admin/shortcode-edit' . ($isNew ? '' : '?tag=' . urlencode($tagLookup)));
    }

    $tag       = trim($_POST['tag']         ?? '');
    $buttonId  = trim($_POST['button_id']   ?? '');
    $label     = trim($_POST['label']       ?? '');
    $desc      = trim($_POST['description'] ?? '');
    $mceIcon   = trim($_POST['mce_icon']    ?? '');
    $paramsRaw = trim($_POST['params']      ?? '[]');

    if (!preg_match('/^[a-z][a-z0-9_-]*$/', $tag)) {
        flash('Tag must start with a letter and contain only lowercase letters, digits, hyphens, underscores.', 'error');
        redirect(BASE_URL . '/admin/shortcode-edit' . ($isNew ? '' : '?tag=' . urlencode($tagLookup)));
    }
    if ($label === '') {
        flash('Label is required.', 'error');
        redirect(BASE_URL . '/admin/shortcode-edit' . ($isNew ? '' : '?tag=' . urlencode($tagLookup)));
    }
    if ($buttonId === '') {
        $buttonId = 'altered_' . $tag;
    }

    $params = json_decode($paramsRaw, true);
    if (!is_array($params)) {
        flash('Params must be a valid JSON array.', 'error');
        redirect(BASE_URL . '/admin/shortcode-edit' . ($isNew ? '' : '?tag=' . urlencode($tagLookup)));
    }

    // Check tag uniqueness (excluding self on edit)
    foreach ($scDefs as $i => $item) {
        if (($item['tag'] ?? '') === $tag && $i !== $scIndex) {
            flash('A shortcode with this tag already exists.', 'error');
            redirect(BASE_URL . '/admin/shortcode-edit' . ($isNew ? '' : '?tag=' . urlencode($tagLookup)));
        }
    }

    $newSc = [
        'tag'         => $tag,
        'button_id'   => $buttonId,
        'label'       => $label,
        'description' => $desc,
        'mce_icon'    => $mceIcon,
        'params'      => $params,
    ];

    if ($isNew) {
        $scDefs[] = $newSc;
    } else {
        $scDefs[$scIndex] = $newSc;
    }

    file_put_contents($scFile, json_encode(
        ['shortcodes' => array_values($scDefs)],
        JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    ));

    flash($isNew ? 'Shortcode created.' : 'Shortcode updated.');
    redirect(BASE_URL . '/admin/shortcodes');
}

// Form defaults
$fTag     = $sc['tag']         ?? '';
$fBtnId   = $sc['button_id']   ?? '';
$fLabel   = $sc['label']       ?? '';
$fDesc    = $sc['description'] ?? '';
$fMceIcon = $sc['mce_icon']    ?? '';
$fParams  = json_encode($sc['params'] ?? [], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

$__codemirror_editor = true;
?>

<div class="admin-header-bar">
    <h1>
        <i class="fa-solid fa-code me-2"></i>
        <?= $isNew ? 'New shortcode' : 'Edit shortcode: <strong>[' . h($fTag) . ']</strong>' ?>
    </h1>
    <a href="<?= BASE_URL ?>/admin/shortcodes" class="btn btn-outline-secondary btn-sm">
        <i class="fa-solid fa-arrow-left me-1"></i> Back
    </a>
</div>

<div class="card-altered p-4" style="max-width:720px">
    <form method="post">
        <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">

        <div class="row g-3 mb-3">
            <div class="col-sm-4">
                <label class="form-label fw-semibold">Tag <span class="text-danger">*</span></label>
                <div class="input-group">
                    <span class="input-group-text">[</span>
                    <input type="text" name="tag" class="form-control font-monospace" required
                           value="<?= h($fTag) ?>" placeholder="btn"
                           pattern="[a-z][a-z0-9_\-]*" maxlength="40"
                           <?= !$isNew ? 'readonly' : '' ?>>
                    <span class="input-group-text">]</span>
                </div>
                <div class="form-text">Lowercase letters/digits/hyphens. Cannot be changed after creation.</div>
            </div>
            <div class="col-sm-4">
                <label class="form-label fw-semibold">Button ID</label>
                <input type="text" name="button_id" class="form-control font-monospace"
                       value="<?= h($fBtnId) ?>" placeholder="altered_btn" maxlength="60">
                <div class="form-text">TinyMCE button identifier. Auto-generated if empty.</div>
            </div>
            <div class="col-sm-4">
                <label class="form-label fw-semibold">MCE icon</label>
                <input type="text" name="mce_icon" class="form-control"
                       value="<?= h($fMceIcon) ?>" placeholder="link" maxlength="60">
                <div class="form-text">TinyMCE 7 built-in icon (<code>link</code>, <code>image</code>, <code>warning</code>…). Avoid <code>template</code>.</div>
            </div>
        </div>

        <div class="mb-3">
            <label class="form-label fw-semibold">Label <span class="text-danger">*</span></label>
            <input type="text" name="label" class="form-control" required
                   value="<?= h($fLabel) ?>" placeholder="Styled button / link" maxlength="100">
            <div class="form-text">Displayed in the TinyMCE dropdown menu and dialog title.</div>
        </div>

        <div class="mb-3">
            <label class="form-label fw-semibold">Description</label>
            <input type="text" name="description" class="form-control"
                   value="<?= h($fDesc) ?>" placeholder="Insert a styled link or button" maxlength="200">
            <div class="form-text">Tooltip shown on the individual toolbar button.</div>
        </div>

        <div class="mb-4">
            <label class="form-label fw-semibold">Params <span class="text-muted fw-normal">(JSON array)</span></label>
            <textarea id="sc-params-editor" name="params"
                      style="width:100%;height:380px;font-family:monospace;font-size:.85rem"><?= h($fParams) ?></textarea>
            <div class="form-text">
                Each param: <code>{"name","type","label","required","default","placeholder","items"}</code>.
                Types: <code>input</code>, <code>selectbox</code>, <code>checkbox</code>.
                Items (selectbox only): <code>[{"value":"…","text":"…"}]</code>.
            </div>
        </div>

        <div class="d-flex gap-2">
            <button type="submit" class="btn btn-sm btn-primary-altered">
                <i class="fa-solid fa-floppy-disk me-1"></i>
                <?= $isNew ? 'Create shortcode' : 'Save changes' ?>
            </button>
            <a href="<?= BASE_URL ?>/admin/shortcodes" class="btn btn-sm btn-outline-secondary">Cancel</a>
        </div>
    </form>
</div>

<script>
document.addEventListener('DOMContentLoaded', function () {
    var ta = document.getElementById('sc-params-editor');
    if (!ta || typeof CodeMirror === 'undefined') return;
    var cm = CodeMirror.fromTextArea(ta, {
        mode:            { name: 'javascript', json: true },
        theme:           'dracula',
        lineNumbers:     true,
        matchBrackets:   true,
        styleActiveLine: true,
        indentUnit:      2,
        tabSize:         2,
        indentWithTabs:  false,
        lineWrapping:    true,
    });
    cm.setSize(null, '380px');
    ta.form.addEventListener('submit', function () { cm.save(); });
});
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
