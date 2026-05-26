<?php
// translations
$txt = [
    'title'       => 'Hello World — Settings',
    'label'       => 'Greeting message',
    'placeholder' => 'Hello!',
    'btn_save'    => 'Save',
    'flash_saved' => 'Settings saved.',
];

// pOST handler
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        flash('Invalid token.', 'error');
        redirect(BASE_URL . '/admin/plugin-page?plugin=hello-world&section=hello-settings');
    }

    $greeting = trim($_POST['greeting'] ?? '');

    // INSERT ... ON DUPLICATE KEY UPDATE is the cleanest upsert pattern for
    // a key/value settings table: insert on first save, update on subsequent saves.
    $db->prepare(qp(
        "INSERT INTO {settings} (`key`, `value`) VALUES ('greeting', :v)
         ON DUPLICATE KEY UPDATE `value` = :v"
    ))->execute([':v' => $greeting]);

    flash($txt['flash_saved']);
    redirect(BASE_URL . '/admin/plugin-page?plugin=hello-world&section=hello-settings');
}

// data
// fetchColumn() returns false when no row exists; the form placeholder acts as
// the visual default in that case.
$greeting = $db->query(qp("SELECT value FROM {settings} WHERE `key` = 'greeting'"))->fetchColumn();
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-gear me-2"></i><?= h($txt['title']) ?></h1>
</div>

<div class="card-altered p-4" style="max-width:480px">
    <form method="post">
        <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
        <div class="mb-3">
            <label class="form-label fw-semibold"><?= h($txt['label']) ?></label>
            <input type="text" name="greeting" class="form-control"
                   value="<?= h($greeting ?: '') ?>"
                   placeholder="<?= h($txt['placeholder']) ?>">
        </div>
        <button type="submit" class="btn btn-sm btn-primary-altered">
            <i class="fa-solid fa-floppy-disk me-1"></i>
            <?= h($txt['btn_save']) ?>
        </button>
    </form>
</div>
