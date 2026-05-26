<?php
// Admin editor for the plugin's data JSON files (altered.json, search_settings.json).
$dataDir  = dirname(__DIR__) . '/data/';
$excluded = [];

$availableFiles = [];
foreach (glob($dataDir . '*.json') as $path) {
    $name = basename($path);
    if (!in_array($name, $excluded, true)) {
        $availableFiles[] = $name;
    }
}
sort($availableFiles);

$selectedFile = trim($_GET['file'] ?? ($availableFiles[0] ?? ''));
if (!in_array($selectedFile, $availableFiles, true)) {
    $selectedFile = $availableFiles[0] ?? '';
}

$jsonFile = $selectedFile !== '' ? $dataDir . $selectedFile : '';
$errors   = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        $errors[] = 'Invalid form token.';
    } else {
        $postedFile = trim($_POST['selected_file'] ?? '');
        if (!in_array($postedFile, $availableFiles, true)) {
            $errors[] = 'Invalid file selection.';
        } else {
            $selectedFile = $postedFile;
            $jsonFile     = $dataDir . $selectedFile;
            $raw          = $_POST['json_content'] ?? '';
            json_decode($raw);
            if (json_last_error() !== JSON_ERROR_NONE) {
                $errors[] = 'Invalid JSON: ' . json_last_error_msg();
            } else {
                if (file_put_contents($jsonFile, $raw) !== false) {
                    flash(h($selectedFile) . ' saved successfully.');
                    $redirectUrl = BASE_URL . '/admin/plugin-page?plugin=core-altered-cards&section=altered-json&file=' . urlencode($selectedFile);
                    redirect($redirectUrl);
                } else {
                    $errors[] = 'Could not write file. Check server permissions on ' . h($selectedFile) . '.';
                }
            }
        }
    }
}

$currentContent = '';
if ($jsonFile !== '' && file_exists($jsonFile)) {
    $currentContent = file_get_contents($jsonFile);
    if (strncmp($currentContent, "\xEF\xBB\xBF", 3) === 0) {
        $currentContent = substr($currentContent, 3);
    }
}

$fileSize  = ($jsonFile !== '' && file_exists($jsonFile)) ? number_format(filesize($jsonFile)) . ' bytes' : 'file not found';
$fileMtime = ($jsonFile !== '' && file_exists($jsonFile)) ? date('Y-m-d H:i:s', filemtime($jsonFile)) : '—';
$selfUrl   = BASE_URL . '/admin/plugin-page?plugin=core-altered-cards&section=altered-json';
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-code me-2"></i>Altered JSON</h1>
    <span class="text-muted small"><?= h($fileSize) ?> — last modified <?= h($fileMtime) ?></span>
</div>

<?php if ($errors): ?>
<div class="alert alert-danger">
    <ul class="mb-0"><?php foreach ($errors as $e): ?><li><?= h($e) ?></li><?php endforeach; ?></ul>
</div>
<?php endif; ?>

<?php if (count($availableFiles) > 1): ?>
<div class="mb-3 d-flex align-items-center gap-2 flex-wrap">
    <span class="text-muted small fw-semibold">File:</span>
    <?php foreach ($availableFiles as $fn): ?>
    <a href="<?= h($selfUrl . '&file=' . urlencode($fn)) ?>"
       class="btn btn-sm <?= $fn === $selectedFile ? 'btn-primary-altered' : 'btn-outline-secondary' ?>">
        <?= h($fn) ?>
    </a>
    <?php endforeach; ?>
</div>
<?php endif; ?>

<?php if ($selectedFile === ''): ?>
<div class="alert alert-warning">No JSON files found in the plugin data folder.</div>
<?php else: ?>

<form method="post" action="<?= h($selfUrl) ?>" novalidate>
    <input type="hidden" name="csrf_token"    value="<?= h(csrfToken()) ?>">
    <input type="hidden" name="selected_file" value="<?= h($selectedFile) ?>">

    <div class="card-altered p-3 mb-3">
        <div class="d-flex justify-content-between align-items-center mb-2">
            <label class="fw-bold mb-0" style="font-size:.9rem">data/<?= h($selectedFile) ?></label>
            <div class="d-flex gap-2">
                <button type="button" id="btn-format" class="btn btn-sm btn-outline-secondary">
                    <i class="fa-solid fa-indent me-1"></i>Format JSON
                </button>
                <button type="button" id="btn-validate" class="btn btn-sm btn-outline-secondary">
                    <i class="fa-solid fa-check me-1"></i>Validate
                </button>
            </div>
        </div>
        <div id="json-status" class="mb-2" style="display:none;font-size:.82rem"></div>
        <textarea id="json-editor" name="json_content"
                  spellcheck="false"><?= h($currentContent) ?></textarea>
    </div>

    <div class="d-flex gap-2">
        <button type="submit" class="btn btn-sm btn-primary-altered">
            <i class="fa-solid fa-floppy-disk me-1"></i>Save
        </button>
        <a href="<?= h($selfUrl . '&file=' . urlencode($selectedFile)) ?>" class="btn btn-sm btn-outline-secondary">
            <i class="fa-solid fa-rotate-left me-1"></i>Reset
        </a>
    </div>
</form>

<?php endif; ?>

<script>
document.addEventListener('DOMContentLoaded', function () {
    var ta     = document.getElementById('json-editor');
    var status = document.getElementById('json-status');
    if (!ta || typeof CodeMirror === 'undefined') return;

    var cm = CodeMirror.fromTextArea(ta, {
        mode:            { name: 'javascript', json: true },
        theme:           'dracula',
        lineNumbers:     true,
        matchBrackets:   true,
        styleActiveLine: true,
        indentUnit:      4,
        tabSize:         4,
        indentWithTabs:  false,
        lineWrapping:    false,
    });
    cm.setSize(null, '70vh');

    function getVal() { return cm.getValue(); }

    function setStatus(msg, ok) {
        status.style.display = '';
        status.style.color   = ok ? 'var(--bs-success)' : 'var(--bs-danger)';
        status.textContent   = msg;
    }

    document.getElementById('btn-validate').addEventListener('click', function () {
        try { JSON.parse(getVal()); setStatus('Valid JSON ✓', true); }
        catch (e) { setStatus('Invalid JSON: ' + e.message, false); }
    });

    document.getElementById('btn-format').addEventListener('click', function () {
        try {
            var pretty = JSON.stringify(JSON.parse(getVal()), null, 4);
            cm.setValue(pretty);
            setStatus('Formatted ✓', true);
        } catch (e) { setStatus('Cannot format — invalid JSON: ' + e.message, false); }
    });

    ta.form.addEventListener('submit', function (e) {
        cm.save();
        try { JSON.parse(getVal()); }
        catch (err) {
            if (!confirm('The JSON appears invalid (' + err.message + '). Save anyway?')) {
                e.preventDefault();
            }
        }
    });
});
</script>
<?php $__codemirror_editor = true; ?>
