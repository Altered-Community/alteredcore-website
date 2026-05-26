<?php
$adminPageTitle = 'Edit Community Builder';
$adminSection   = 'community-builders';
require_once __DIR__ . '/includes/header.php';

$db = getDB();
$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($id === 0 && !adminCanCreate()) {
    flash('You do not have permission to create content.', 'error');
    redirect(BASE_URL . '/admin/community-builders');
}
if ($id > 0 && !adminCanEdit()) {
    flash('You do not have permission to edit content.', 'error');
    redirect(BASE_URL . '/admin/community-builders');
}

$entry = [
    'id'                  => 0,
    'title'               => '',
    'desc_en'             => '',
    'desc_fr'             => '',
    'url'                 => '',
    'image'               => '',
    'deckbuilder_url'     => '',
    'deckbuilder_logo'    => '',
    'deckbuilder_enabled' => 0,
    'is_visible'          => 1,
    'sort_order'          => 0,
];
if (!$id) {
    $entry['sort_order'] = (int)$db->query(q("SELECT COALESCE(MAX(sort_order), 0) + 1 FROM {community_builders}"))->fetchColumn();
}
if ($id) {
    $stmt = $db->prepare(q("SELECT * FROM {community_builders} WHERE id = :id"));
    $stmt->execute([':id' => $id]);
    $row  = $stmt->fetch();
    if ($row) {
        $entry          = $row;
        $adminPageTitle = 'Edit: ' . h($entry['title']);
    } else {
        flash('Entry not found.', 'error');
        redirect(BASE_URL . '/admin/community-builders');
    }
}

$errors = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        $errors[] = 'Invalid form token. Please try again.';
    } else {
        // Card image via picker
        $oldImage    = $entry['image'] ?? null;
        $pickedImage = trim($_POST['image_picker'] ?? '');
        if ($pickedImage !== '' && !preg_match('#^uploads/[a-zA-Z0-9/_.-]+$#', $pickedImage)) {
            $pickedImage = '';
        }
        $newImage = $pickedImage !== '' ? $pickedImage : null;
        if ($oldImage && $newImage !== $oldImage && strpos($oldImage, 'uploads/') === 0) {
            if ($newImage === null && !adminCanDelete()) {
                $errors[] = 'You do not have permission to delete images.';
            } else {
                $fp = dirname(__DIR__) . '/' . $oldImage;
                if (file_exists($fp)) unlink($fp);
            }
        }

        // Deckbuilder logo via picker
        $oldLogo    = $entry['deckbuilder_logo'] ?? null;
        $pickedLogo = trim($_POST['deckbuilder_logo_picker'] ?? '');
        if ($pickedLogo !== '' && !preg_match('#^uploads/[a-zA-Z0-9/_.-]+$#', $pickedLogo)) {
            $pickedLogo = '';
        }
        $newLogo = $pickedLogo !== '' ? $pickedLogo : null;
        if ($oldLogo && $newLogo !== $oldLogo && strpos($oldLogo, 'uploads/') === 0) {
            if ($newLogo === null && !adminCanDelete()) {
                $errors[] = 'You do not have permission to delete images.';
            } else {
                $fp = dirname(__DIR__) . '/' . $oldLogo;
                if (file_exists($fp)) unlink($fp);
            }
        }

        $data = [
            'title'               => trim($_POST['title']   ?? ''),
            'desc_en'             => trim($_POST['desc_en']  ?? '') ?: null,
            'desc_fr'             => trim($_POST['desc_fr']  ?? '') ?: null,
            'url'                 => trim($_POST['url']      ?? ''),
            'image'               => $newImage,
            'deckbuilder_url'     => trim($_POST['deckbuilder_url'] ?? '') ?: null,
            'deckbuilder_logo'    => $newLogo,
            'deckbuilder_enabled' => isset($_POST['deckbuilder_enabled']) ? 1 : 0,
            'is_visible'          => adminCanPublish() ? (isset($_POST['is_visible']) ? 1 : 0) : 0,
            'sort_order'          => (int)($_POST['sort_order'] ?? 0),
        ];

        if ($data['title'] === '') $errors[] = 'Title is required.';
        if ($data['url']   === '' || !filter_var($data['url'], FILTER_VALIDATE_URL)) $errors[] = 'A valid URL is required.';

        if (empty($errors)) {
            if ($id) {
                $db->prepare(q(
                    "UPDATE {community_builders}
                     SET title=:title, desc_en=:desc_en, desc_fr=:desc_fr,
                         url=:url, image=:image,
                         deckbuilder_url=:deckbuilder_url, deckbuilder_logo=:deckbuilder_logo,
                         deckbuilder_enabled=:deckbuilder_enabled,
                         is_visible=:is_visible, sort_order=:sort_order
                     WHERE id=:id"
                ))->execute(array_merge($data, [':id' => $id]));
                flash('Entry updated successfully.');
            } else {
                $db->prepare(q(
                    "INSERT INTO {community_builders}
                         (title, desc_en, desc_fr, url, image,
                          deckbuilder_url, deckbuilder_logo, deckbuilder_enabled,
                          is_visible, sort_order)
                     VALUES
                         (:title, :desc_en, :desc_fr, :url, :image,
                          :deckbuilder_url, :deckbuilder_logo, :deckbuilder_enabled,
                          :is_visible, :sort_order)"
                ))->execute($data);
                flash('Entry created successfully.');
            }
            redirect(BASE_URL . '/admin/community-builders');
        }

        $entry = array_merge($entry, $data);
    }
}
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-pen me-2"></i><?= $id ? 'Edit entry' : 'Add entry' ?></h1>
    <a href="<?= BASE_URL ?>/admin/community-builders" class="btn btn-outline-secondary btn-sm">← Back</a>
</div>

<?php if ($errors): ?>
    <div class="alert alert-danger">
        <ul class="mb-0">
            <?php foreach ($errors as $e): ?>
                <li><?= h($e) ?></li>
            <?php endforeach; ?>
        </ul>
    </div>
<?php endif; ?>

<form method="post" novalidate>
    <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">

    <div class="card-altered p-3 mb-4">
        <h6 class="fw-bold mb-3">Tool info</h6>
        <div class="row g-3">
            <div class="col-md-8">
                <label class="form-label">Title <span class="text-danger">*</span></label>
                <input type="text" name="title" class="form-control"
                       value="<?= h($entry['title']) ?>" maxlength="255" required>
                <div class="form-text">Name of the tool (e.g. "Altered-DB"). Not bilingual.</div>
            </div>
            <div class="col-md-4">
                <label class="form-label">Sort order</label>
                <input type="number" name="sort_order" class="form-control"
                       value="<?= (int)$entry['sort_order'] ?>">
                <div class="form-text">Lower = displayed first.</div>
            </div>
            <div class="col-12">
                <label class="form-label">URL <span class="text-danger">*</span></label>
                <input type="url" name="url" class="form-control"
                       value="<?= h($entry['url']) ?>" maxlength="500" placeholder="https://…" required>
            </div>
        </div>
    </div>

    <div class="card-altered p-3 mb-4">
        <h6 class="fw-bold mb-3">Description</h6>
        <div class="row g-3">
            <div class="col-md-6">
                <label class="form-label"><i class="fi fi-gb me-1"></i> English</label>
                <textarea name="desc_en" class="form-control" rows="3"
                          maxlength="500"><?= h($entry['desc_en'] ?? '') ?></textarea>
            </div>
            <div class="col-md-6">
                <label class="form-label"><i class="fi fi-fr me-1"></i> Français</label>
                <textarea name="desc_fr" class="form-control" rows="3"
                          maxlength="500"><?= h($entry['desc_fr'] ?? '') ?></textarea>
            </div>
        </div>
    </div>

    <div class="card-altered p-3 mb-4">
        <h6 class="fw-bold mb-3">Image</h6>
        <div class="img-picker-widget"
             data-input="cb_img_input"
             data-preview="cb_img_preview"
             data-folder="community-builders"
             data-base-url="<?= BASE_URL ?>"
             data-csrf="<?= h(csrfToken()) ?>"
             data-original="<?= h($entry['image'] ?? '') ?>"
             data-can-delete="<?= adminCanDelete() ? '1' : '0' ?>">
            <div id="cb_img_preview" class="mb-2" style="<?= !empty($entry['image']) ? '' : 'display:none' ?>">
                <div style="position:relative;display:inline-block">
                    <img src="<?= !empty($entry['image']) ? h(assetUrl($entry['image'])) : '' ?>" alt=""
                         style="max-height:80px;border-radius:6px;border:1px solid var(--neutral-300)">
                    <button type="button" class="btn btn-sm btn-danger img-picker-clear"
                            style="position:absolute;top:-6px;right:-6px;padding:0;width:20px;height:20px;border-radius:50%;font-size:11px;line-height:1">×</button>
                </div>
            </div>
            <input type="hidden" name="image_picker" id="cb_img_input" value="<?= h($entry['image'] ?? '') ?>">
            <button type="button" class="btn btn-outline-secondary btn-sm img-picker-btn">
                <i class="fa-solid fa-images me-1"></i> Choose image
            </button>
            <div class="form-text">JPG, PNG, WebP or GIF — max 5 MB. Recommended: square thumbnail or screenshot.</div>
        </div>
    </div>

    <div class="card-altered p-3 mb-4">
        <h6 class="fw-bold mb-3">Deck editor integration</h6>
        <div class="mb-3">
            <label class="form-label">Deck editor URL</label>
            <input type="text" name="deckbuilder_url" class="form-control"
                   value="<?= h($entry['deckbuilder_url'] ?? '') ?>" maxlength="500"
                   placeholder="https://example.com/deckbuilder?deck={deck_id}">
            <div class="form-text">URL to open a deck in this tool's editor. Use <code>{deck_id}</code> as a placeholder for the deck UUID. Leave blank if not applicable.</div>
        </div>
        <div class="mb-3">
            <label class="form-label">Edit dropdown logo</label>
            <div class="img-picker-widget"
                 data-input="cb_logo_input"
                 data-preview="cb_logo_preview"
                 data-folder="community-builders"
                 data-base-url="<?= BASE_URL ?>"
                 data-csrf="<?= h(csrfToken()) ?>"
                 data-original="<?= h($entry['deckbuilder_logo'] ?? '') ?>"
                 data-can-delete="<?= adminCanDelete() ? '1' : '0' ?>">
                <div id="cb_logo_preview" class="mb-2" style="<?= !empty($entry['deckbuilder_logo']) ? '' : 'display:none' ?>">
                    <div style="position:relative;display:inline-block">
                        <img src="<?= !empty($entry['deckbuilder_logo']) ? h(assetUrl($entry['deckbuilder_logo'])) : '' ?>" alt=""
                             style="max-height:40px;border-radius:4px;border:1px solid var(--neutral-300)">
                        <button type="button" class="btn btn-sm btn-danger img-picker-clear"
                                style="position:absolute;top:-6px;right:-6px;padding:0;width:20px;height:20px;border-radius:50%;font-size:11px;line-height:1">×</button>
                    </div>
                </div>
                <input type="hidden" name="deckbuilder_logo_picker" id="cb_logo_input" value="<?= h($entry['deckbuilder_logo'] ?? '') ?>">
                <button type="button" class="btn btn-outline-secondary btn-sm img-picker-btn">
                    <i class="fa-solid fa-images me-1"></i> Choose logo
                </button>
                <div class="form-text">Small logo shown next to the tool name in the Edit dropdown (e.g. 32×32 px icon). Falls back to an external-link icon if not set.</div>
            </div>
        </div>
        <div class="form-check">
            <input class="form-check-input" type="checkbox" name="deckbuilder_enabled" id="deckbuilder_enabled"
                   value="1" <?= !empty($entry['deckbuilder_enabled']) ? 'checked' : '' ?>>
            <label class="form-check-label fw-semibold" for="deckbuilder_enabled">Show in Edit dropdown</label>
            <div class="form-text">When enabled (and a deck editor URL is set), this tool appears in the Edit dropdown on the Decks page.</div>
        </div>
    </div>

    <?php $canPub = adminCanPublish(); ?>
    <div class="card-altered p-3 mb-4">
        <h6 class="fw-bold mb-3">Settings</h6>
        <div class="form-check">
            <input class="form-check-input" type="checkbox" name="is_visible" id="is_visible"
                   value="1" <?= ($canPub && $entry['is_visible']) ? 'checked' : '' ?> <?= $canPub ? '' : 'disabled' ?>>
            <label class="form-check-label fw-semibold" for="is_visible">Visible</label>
            <?php if ($canPub): ?>
            <div class="form-text">Hidden entries are not shown in the Decks page modal.</div>
            <?php elseif ($id > 0 && $entry['is_visible']): ?>
            <div class="form-text text-warning"><i class="fa-solid fa-triangle-exclamation me-1"></i>This entry is currently visible. Saving will send it back for review.</div>
            <?php else: ?>
            <div class="form-text text-warning">Requires the <em>Can publish</em> permission — submissions will be pending review.</div>
            <?php endif; ?>
        </div>
    </div>

    <div class="d-flex gap-2">
        <button type="submit" class="btn btn-sm btn-primary-altered px-4">
            <i class="fa-solid fa-floppy-disk me-1"></i> Save
        </button>
        <a href="<?= BASE_URL ?>/admin/community-builders" class="btn btn-sm btn-outline-secondary">Cancel</a>
    </div>
</form>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
