<?php
$adminPageTitle = 'RSS Feed';
$adminSection   = 'rss';
require_once __DIR__ . '/includes/header.php';

$db = getDB();
$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

$entry = [
    'id'              => 0,
    'name'            => '',
    'url'             => '',
    'url_fr'          => '',
    'category_id'     => null,
    'refresh_minutes' => 60,
    'map_title'       => 'title',
    'map_link'        => 'link',
    'map_description' => 'description',
    'map_image'       => '',
    'map_date'        => 'pubDate',
    'is_visible'      => 1,
    'sort_order'      => 0,
];
if (!$id) {
    $entry['sort_order'] = (int)$db->query(q("SELECT COALESCE(MAX(sort_order), 0) + 1 FROM {rss_feeds}"))->fetchColumn();
}
if ($id) {
    $stmt = $db->prepare(q("SELECT * FROM {rss_feeds} WHERE id = :id"));
    $stmt->execute([':id' => $id]);
    $row = $stmt->fetch();
    if ($row) {
        $entry          = $row;
        $adminPageTitle = 'Edit: ' . $entry['name'];
    } else {
        flash('Feed not found.', 'error');
        redirect(BASE_URL . '/admin/rss');
    }
}

$categories = $db->query(q(
    "SELECT id, name_en FROM {news_categories} ORDER BY sort_order ASC, name_en ASC"
))->fetchAll();

$errors = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        $errors[] = 'Invalid form token. Please try again.';
    } else {
        $data = [
            'name'            => trim($_POST['name']            ?? ''),
            'url'             => trim($_POST['url']             ?? ''),
            'url_fr'          => trim($_POST['url_fr']          ?? '') ?: null,
            'category_id'     => ($_POST['category_id'] ?? '') !== '' ? (int)$_POST['category_id'] : null,
            'refresh_minutes' => max(5, min(1440, (int)($_POST['refresh_minutes'] ?? 60))),
            'map_title'       => trim($_POST['map_title']       ?? '') ?: 'title',
            'map_link'        => trim($_POST['map_link']        ?? '') ?: 'link',
            'map_description' => trim($_POST['map_description'] ?? '') ?: 'description',
            'map_image'       => trim($_POST['map_image']       ?? ''),
            'map_date'        => trim($_POST['map_date']        ?? '') ?: 'pubDate',
            'is_visible'      => isset($_POST['is_visible']) ? 1 : 0,
            'sort_order'      => (int)($_POST['sort_order'] ?? 0),
        ];

        if ($data['name'] === '') $errors[] = 'Name is required.';
        if ($data['url']  === '' || !filter_var($data['url'], FILTER_VALIDATE_URL)) {
            $errors[] = 'A valid URL is required.';
        }
        if ($data['url_fr'] !== null && !filter_var($data['url_fr'], FILTER_VALIDATE_URL)) {
            $errors[] = 'French feed URL is not a valid URL.';
        }

        if (empty($errors)) {
            if ($id) {
                $db->prepare(q(
                    "UPDATE {rss_feeds}
                     SET name=:name, url=:url, url_fr=:url_fr, category_id=:category_id,
                         refresh_minutes=:refresh_minutes, map_title=:map_title, map_link=:map_link,
                         map_description=:map_description, map_image=:map_image, map_date=:map_date,
                         is_visible=:is_visible, sort_order=:sort_order
                     WHERE id=:id"
                ))->execute(array_merge($data, [':id' => $id]));
                flash('Feed updated.');
            } else {
                $db->prepare(q(
                    "INSERT INTO {rss_feeds}
                         (name, url, url_fr, category_id, refresh_minutes,
                          map_title, map_link, map_description, map_image, map_date,
                          is_visible, sort_order)
                     VALUES
                         (:name, :url, :url_fr, :category_id, :refresh_minutes,
                          :map_title, :map_link, :map_description, :map_image, :map_date,
                          :is_visible, :sort_order)"
                ))->execute($data);
                flash('Feed created. Use "Fetch now" on the list to import items immediately.');
            }
            redirect(BASE_URL . '/admin/rss');
        }

        $entry = array_merge($entry, $data);
    }
}
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-rss me-2"></i><?= $id ? 'Edit feed' : 'Add RSS feed' ?></h1>
    <a href="<?= BASE_URL ?>/admin/rss" class="btn btn-outline-secondary btn-sm">← Back</a>
</div>

<?php if ($errors): ?>
    <div class="alert alert-danger">
        <ul class="mb-0">
            <?php foreach ($errors as $e): ?><li><?= h($e) ?></li><?php endforeach; ?>
        </ul>
    </div>
<?php endif; ?>

<form method="post" novalidate>
    <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">

    <div class="card-altered p-3 mb-4">
        <h6 class="fw-bold mb-3">Feed info</h6>
        <div class="row g-3">
            <div class="col-md-8">
                <label class="form-label">Name <span class="text-danger">*</span></label>
                <input type="text" name="name" class="form-control"
                       value="<?= h($entry['name']) ?>" maxlength="255" required>
                <div class="form-text">Shown on news cards after the date (e.g. "Altered Official Blog").</div>
            </div>
            <div class="col-md-4">
                <label class="form-label">Sort order</label>
                <input type="number" name="sort_order" class="form-control"
                       value="<?= (int)$entry['sort_order'] ?>">
                <div class="form-text">Lower = listed first.</div>
            </div>
            <div class="col-md-6">
                <label class="form-label">Feed URL <span class="text-danger">*</span></label>
                <input type="url" name="url" class="form-control"
                       value="<?= h($entry['url']) ?>" maxlength="1000"
                       placeholder="https://example.com/feed.xml" required>
                <div class="form-text">Default / English feed.</div>
            </div>
            <div class="col-md-6">
                <label class="form-label">Feed URL <span class="badge ms-1" style="font-size:.7rem;background:#1d4ed8">FR</span></label>
                <input type="url" name="url_fr" class="form-control"
                       value="<?= h($entry['url_fr'] ?? '') ?>" maxlength="1000"
                       placeholder="https://example.com/feed-fr.xml">
                <div class="form-text">Optional. If set, French visitors see items from this URL.</div>
            </div>
            <div class="col-md-6">
                <label class="form-label">News category</label>
                <select name="category_id" class="form-select">
                    <option value="">— None —</option>
                    <?php foreach ($categories as $cat): ?>
                        <option value="<?= (int)$cat['id'] ?>"
                                <?= (int)($entry['category_id'] ?? 0) === (int)$cat['id'] ? 'selected' : '' ?>>
                            <?= h($cat['name_en']) ?>
                        </option>
                    <?php endforeach; ?>
                </select>
                <div class="form-text">Items from this feed appear under this category in news listings.</div>
            </div>
            <div class="col-md-6">
                <label class="form-label">Refresh interval (minutes)</label>
                <input type="number" name="refresh_minutes" class="form-control"
                       value="<?= (int)$entry['refresh_minutes'] ?>" min="5" max="1440">
                <div class="form-text">How often items are re-fetched in the background. Minimum: 5 min.</div>
            </div>
        </div>
    </div>

    <div class="card-altered p-3 mb-4">
        <h6 class="fw-bold mb-3">Field mapping</h6>
        <p class="text-muted small mb-3">
            Enter the XML element name from the feed that maps to each field.
            For media namespace images use <code>media:content</code> or <code>media:thumbnail</code>.
            For standard podcast/attachment enclosures use <code>enclosure</code>.
            For WordPress feeds (image embedded in HTML) use <code>content:encoded</code> — extracts the first <code>&lt;img&gt;</code> found in the article body.
            Leave Image empty if the feed has no images.
        </p>
        <div class="row g-3">
            <div class="col-md-4">
                <label class="form-label">Title field</label>
                <input type="text" name="map_title" class="form-control"
                       value="<?= h($entry['map_title']) ?>" placeholder="title">
                <div class="form-text">RSS: <code>title</code> — Atom: <code>title</code></div>
            </div>
            <div class="col-md-4">
                <label class="form-label">Link field</label>
                <input type="text" name="map_link" class="form-control"
                       value="<?= h($entry['map_link']) ?>" placeholder="link">
                <div class="form-text">RSS: <code>link</code> — Atom: <code>link</code> (href attr)</div>
            </div>
            <div class="col-md-4">
                <label class="form-label">Date field</label>
                <input type="text" name="map_date" class="form-control"
                       value="<?= h($entry['map_date']) ?>" placeholder="pubDate">
                <div class="form-text">RSS: <code>pubDate</code> — Atom: <code>published</code></div>
            </div>
            <div class="col-md-6">
                <label class="form-label">Description field</label>
                <input type="text" name="map_description" class="form-control"
                       value="<?= h($entry['map_description']) ?>" placeholder="description">
                <div class="form-text">RSS: <code>description</code> — Atom: <code>summary</code> or <code>content</code></div>
            </div>
            <div class="col-md-6">
                <label class="form-label">Image field <span class="text-muted fw-normal">(optional)</span></label>
                <input type="text" name="map_image" class="form-control"
                       value="<?= h($entry['map_image']) ?>" placeholder="enclosure">
                <div class="form-text">Leave empty for no images. Options: <code>enclosure</code>, <code>media:content</code>, <code>media:thumbnail</code>, <code>content:encoded</code> (WordPress)</div>
            </div>
        </div>
    </div>

    <div class="card-altered p-3 mb-4">
        <h6 class="fw-bold mb-3">Settings</h6>
        <div class="form-check">
            <input class="form-check-input" type="checkbox" name="is_visible" id="is_visible"
                   value="1" <?= $entry['is_visible'] ? 'checked' : '' ?>>
            <label class="form-check-label fw-semibold" for="is_visible">Visible</label>
            <div class="form-text">Hidden feeds are not merged into public news listings.</div>
        </div>
    </div>

    <div class="d-flex gap-2">
        <button type="submit" class="btn btn-sm btn-primary-altered px-4">
            <i class="fa-solid fa-floppy-disk me-1"></i> Save
        </button>
        <a href="<?= BASE_URL ?>/admin/rss" class="btn btn-sm btn-outline-secondary">Cancel</a>
    </div>
</form>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
