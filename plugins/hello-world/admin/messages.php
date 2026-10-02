<?php
require_once __DIR__ . '/../inc/functions.php';

// translations
$txt = [
    'title'          => 'Hello World',
    'placeholder'    => 'New message…',
    'btn_add'        => 'Add',
    'btn_delete'     => 'Delete',
    'no_messages'    => 'No messages yet.',
    'flash_added'    => 'Message added.',
    'flash_deleted'  => 'Message deleted.',
    'confirm_delete' => 'Delete this message?',
];

// pOST handler
// Always validate the CSRF token first on any POST action.
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        flash('Invalid token.', 'error');
        redirect(BASE_URL . '/admin/plugin-page?plugin=hello-world&section=hello-messages');
    }

    $action = $_POST['action'] ?? '';

    if ($action === 'add') {
        $text = trim($_POST['text'] ?? '');
        if ($text !== '') {
            hwAddMessage($text);
            flash($txt['flash_added']);
        }
    }

    if ($action === 'delete') {
        $id = (int)($_POST['id'] ?? 0);
        if ($id > 0) {
            hwDeleteMessage($id);
            flash($txt['flash_deleted']);
        }
    }

    redirect(BASE_URL . '/admin/plugin-page?plugin=hello-world&section=hello-messages');
}

// data
$messages = hwGetMessages();
?>

<div class="admin-header-bar">
    <h1><?= ac_icon('earth', 'me-2') ?><?= h($txt['title']) ?></h1>
</div>

<!-- Add message form -->
<form method="post" class="d-flex gap-2 mb-3">
    <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
    <input type="hidden" name="action" value="add">
    <input type="text" name="text" class="ac-input" aria-label="<?= h($txt['placeholder']) ?>"
           placeholder="<?= h($txt['placeholder']) ?>" required>
    <button type="submit" class="ac-button">
        <?= ac_icon('plus') ?><?= h($txt['btn_add']) ?>
    </button>
</form>

<!-- Message list -->
<div class="ac-table-wrap">
    <?php if (empty($messages)): ?>
    <p class="ac-empty"><?= h($txt['no_messages']) ?></p>
    <?php else: ?>
    <table class="ac-table">
        <tbody>
        <?php foreach ($messages as $m): ?>
        <tr>
            <td><?= h($m['text']) ?></td>
            <td class="ac-text-small ac-text-muted text-nowrap"><?= h($m['created_at']) ?></td>
            <td class="ac-table__num text-nowrap">
                <!-- Delete button: inline form so each row is independent -->
                <form method="post" class="d-inline"
                      onsubmit="return confirm('<?= h($txt['confirm_delete']) ?>')">
                    <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                    <input type="hidden" name="action" value="delete">
                    <input type="hidden" name="id" value="<?= (int)$m['id'] ?>">
                    <button type="submit" class="ac-icon-button ac-icon-button--sm" aria-label="<?= h($txt['btn_delete']) ?>">
                        <?= ac_icon('trash-2') ?>
                    </button>
                </form>
            </td>
        </tr>
        <?php endforeach; ?>
        </tbody>
    </table>
    <?php endif; ?>
</div>
