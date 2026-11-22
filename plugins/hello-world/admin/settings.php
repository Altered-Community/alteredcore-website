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
    <h1><?= ac_icon('settings', 'me-2') ?><?= h($txt['title']) ?></h1>
</div>

<div class="ac-card" style="max-width:480px">
    <form method="post" class="ac-stack">
        <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
        <div class="ac-field">
            <label class="ac-field__label" for="hw-greeting"><?= h($txt['label']) ?></label>
            <input type="text" id="hw-greeting" name="greeting" class="ac-input"
                   value="<?= h($greeting ?: '') ?>"
                   placeholder="<?= h($txt['placeholder']) ?>">
        </div>
        <div>
            <button type="submit" class="ac-button ac-button--sm">
                <?= ac_icon('save') ?><?= h($txt['btn_save']) ?>
            </button>
        </div>
    </form>
</div>
