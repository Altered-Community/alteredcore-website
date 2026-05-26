<?php
require_once __DIR__ . '/../inc/functions.php';

// translations
$txt = [
    'title'          => 'Hello World',
    'placeholder'    => 'New message…',
    'btn_add'        => 'Add',
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
    <h1><i class="fa-solid fa-earth-europe me-2"></i><?= h($txt['title']) ?></h1>
</div>

<!-- Add message form -->
<form method="post" class="d-flex gap-2 mb-3">
    <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
    <input type="hidden" name="action" value="add">
    <input type="text" name="text" class="form-control"
           placeholder="<?= h($txt['placeholder']) ?>" required>
    <button type="submit" class="btn btn-primary-altered btn-sm">
        <?= h($txt['btn_add']) ?>
    </button>
</form>

<!-- Message list -->
<div class="card-altered p-0" style="overflow:hidden">
    <?php if (empty($messages)): ?>
    <p class="text-muted p-3 mb-0"><?= h($txt['no_messages']) ?></p>
    <?php else: ?>
    <table class="table table-sm mb-0">
        <tbody>
        <?php foreach ($messages as $m): ?>
        <tr>
            <td><?= h($m['text']) ?></td>
            <td class="text-muted small" style="white-space:nowrap"><?= h($m['created_at']) ?></td>
            <td class="text-end" style="white-space:nowrap">
                <!-- Delete button: inline form so each row is independent -->
                <form method="post" class="d-inline"
                      onsubmit="return confirm('<?= h($txt['confirm_delete']) ?>')">
                    <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                    <input type="hidden" name="action" value="delete">
                    <input type="hidden" name="id" value="<?= (int)$m['id'] ?>">
                    <button type="submit" class="btn btn-sm btn-outline-danger">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </form>
            </td>
        </tr>
        <?php endforeach; ?>
        </tbody>
    </table>
    <?php endif; ?>
</div>
