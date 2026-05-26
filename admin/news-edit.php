<?php
$adminPageTitle = 'Edit News';
$adminSection   = 'news';
require_once __DIR__ . '/includes/header.php';
require_once __DIR__ . '/includes/content-sanitize.php';

$db = getDB();
$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($id === 0 && !adminCanCreate()) {
    flash('You do not have permission to create content.', 'error');
    redirect(BASE_URL . '/admin/news');
}
if ($id > 0 && !adminCanEdit()) {
    flash('You do not have permission to edit content.', 'error');
    redirect(BASE_URL . '/admin/news');
}

// Load existing or defaults
$news = ['id'=>0,'category_id'=>null,'title_en'=>'','title_fr'=>'',
         'content_en'=>'','content_fr'=>'','excerpt_en'=>'','excerpt_fr'=>'',
         'image'=>'','youtube_url'=>'','published_at'=>'','is_published'=>0];

if ($id) {
    $stmt = $db->prepare(q("SELECT * FROM {news} WHERE id = :id"));
    $stmt->execute([':id' => $id]);
    $row  = $stmt->fetch();
    if ($row) {
        $news = $row;
        $adminPageTitle = 'Edit: ' . h($news['title_en']);
    } else {
        flash('News not found.', 'error');
        redirect(BASE_URL . '/admin/news');
    }
}

$errors = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        $errors[] = 'Invalid form token. Please try again.';
    } else {
        // Image via picker (uploaded via AJAX to media-library.php)
        $oldImage = $news['image'] ?? null;
        $pickedImage = trim($_POST['image_picker'] ?? '');
        if ($pickedImage !== '' && !preg_match('#^uploads/[a-zA-Z0-9/_.-]+$#', $pickedImage)) {
            $pickedImage = '';
        }
        $newImage = $pickedImage !== '' ? $pickedImage : null;

        $data = [
            'category_id'  => !empty($_POST['category_id'])  ? (int)$_POST['category_id'] : null,
            'title_en'     => trim($_POST['title_en']     ?? ''),
            'title_fr'     => trim($_POST['title_fr']     ?? ''),
            'content_en'   => sanitizeHtmlContent(trim($_POST['content_en'] ?? '')),
            'content_fr'   => sanitizeHtmlContent(trim($_POST['content_fr'] ?? '')),
            'excerpt_en'   => trim($_POST['excerpt_en']   ?? '') ?: null,
            'excerpt_fr'   => trim($_POST['excerpt_fr']   ?? '') ?: null,
            'image'        => $newImage,
            'youtube_url'  => trim($_POST['youtube_url'] ?? '') ?: null,
            'published_at' => !empty($_POST['published_at']) ? $_POST['published_at'] : date('Y-m-d H:i:s'),
            'is_published' => adminCanPublish() ? (isset($_POST['is_published']) ? 1 : 0) : 0,
        ];

        if ($data['title_en'] === '') $errors[] = 'English title is required.';
        if ($data['title_fr'] === '') $errors[] = 'French title is required.';
        if ($data['content_en'] === '') $errors[] = 'English content is required.';
        if ($data['content_fr'] === '') $errors[] = 'French content is required.';

        if (empty($errors)) {
            // Slug: generate if new, or if existing article has no slug yet
            $needSlug = false;
            if ($id) {
                $slugChk = $db->prepare(q("SELECT slug FROM {news} WHERE id = :id"));
                $slugChk->execute([':id' => $id]);
                $curSlug  = $slugChk->fetchColumn();
                $needSlug = ($curSlug === null || $curSlug === false || $curSlug === '');
            } else {
                $needSlug = true;
            }
            if ($needSlug) {
                $baseSlug = slugify($data['title_en']);
                $slug     = $baseSlug;
                $i        = 2;
                // id != :id prevents an existing article from conflicting with its own slug on update
                $chk      = $db->prepare(q("SELECT 1 FROM {news} WHERE slug = :s AND id != :id"));
                while (true) {
                    $chk->execute([':s' => $slug, ':id' => $id]);
                    if (!$chk->fetch()) break;
                    $slug = $baseSlug . '-' . $i++;
                }
                $data['slug'] = $slug;
            }

            if ($id) {
                $slugSql = isset($data['slug']) ? ', slug=:slug' : '';
                $sql  = "UPDATE {news} SET category_id=:category_id, title_en=:title_en, title_fr=:title_fr,
                         content_en=:content_en, content_fr=:content_fr, excerpt_en=:excerpt_en, excerpt_fr=:excerpt_fr,
                         image=:image, youtube_url=:youtube_url, published_at=:published_at, is_published=:is_published{$slugSql}
                         WHERE id=:id";
                $data[':id'] = $id;
                $db->prepare(q($sql))->execute($data);
                flash('News updated successfully.');
            } else {
                $sql = "INSERT INTO {news} (category_id, slug, title_en, title_fr, content_en, content_fr,
                        excerpt_en, excerpt_fr, image, youtube_url, published_at, is_published)
                        VALUES (:category_id,:slug,:title_en,:title_fr,:content_en,:content_fr,
                        :excerpt_en,:excerpt_fr,:image,:youtube_url,:published_at,:is_published)";
                $db->prepare(q($sql))->execute($data);
                flash('News created successfully.');
            }
            redirect(BASE_URL . '/admin/news');
        }

        // Re-populate form on error
        $news = array_merge($news, $data);
    }
}

$categories = $db->query(q("SELECT id, name_en, name_fr FROM {news_categories} ORDER BY name_en"))->fetchAll();
$pubAt      = $news['published_at'] ? date('Y-m-d\TH:i', strtotime($news['published_at'])) : date('Y-m-d\TH:i');
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-pen me-2"></i><?= $id ? 'Edit news' : 'Add news' ?></h1>
    <a href="<?= BASE_URL ?>/admin/news" class="btn btn-outline-secondary btn-sm">← Back</a>
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

    <div class="row g-4">
        <!-- English -->
        <div class="col-lg-6">
            <div class="card-altered p-3">
                <h6 class="fw-bold mb-3"><i class="fi fi-gb me-1"></i> English 🇬🇧</h6>
                <div class="mb-3">
                    <label class="form-label">Title <span class="text-danger">*</span></label>
                    <input type="text" name="title_en" class="form-control" value="<?= h($news['title_en']) ?>" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">Excerpt <small class="text-muted">(optional short description)</small></label>
                    <textarea name="excerpt_en" class="form-control" rows="2"><?= h($news['excerpt_en'] ?? '') ?></textarea>
                </div>
                <div class="mb-3">
                    <label class="form-label d-flex justify-content-between align-items-center">
                        <span>Content <span class="text-danger">*</span></span>
                        <?php if (defined('TRANSLATE_API_KEY') && TRANSLATE_API_KEY !== ''): ?>
                        <button type="button" class="btn btn-outline-secondary btn-sm translate-btn" data-from="en" data-to="fr">
                            <i class="fa-solid fa-language me-1"></i> Translate → FR
                        </button>
                        <?php endif; ?>
                    </label>
                    <textarea name="content_en" class="tinymce-editor" rows="12"><?= h($news['content_en']) ?></textarea>
                </div>
            </div>
        </div>

        <!-- French -->
        <div class="col-lg-6">
            <div class="card-altered p-3">
                <h6 class="fw-bold mb-3">French 🇫🇷</h6>
                <div class="mb-3">
                    <label class="form-label">Title <span class="text-danger">*</span></label>
                    <input type="text" name="title_fr" class="form-control" value="<?= h($news['title_fr']) ?>" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">Excerpt <small class="text-muted">(optional short description)</small></label>
                    <textarea name="excerpt_fr" class="form-control" rows="2"><?= h($news['excerpt_fr'] ?? '') ?></textarea>
                </div>
                <div class="mb-3">
                    <label class="form-label d-flex justify-content-between align-items-center">
                        <span>Content <span class="text-danger">*</span></span>
                        <?php if (defined('TRANSLATE_API_KEY') && TRANSLATE_API_KEY !== ''): ?>
                        <button type="button" class="btn btn-outline-secondary btn-sm translate-btn" data-from="fr" data-to="en">
                            <i class="fa-solid fa-language me-1"></i> Translate → EN
                        </button>
                        <?php endif; ?>
                    </label>
                    <textarea name="content_fr" class="tinymce-editor" rows="12"><?= h($news['content_fr']) ?></textarea>
                </div>
            </div>
        </div>

        <!-- Settings -->
        <div class="col-12">
            <div class="card-altered p-3">
                <h6 class="fw-bold mb-3">Settings</h6>
                <div class="row g-3">
                    <div class="col-md-4">
                        <label class="form-label">Category</label>
                        <select name="category_id" class="form-select">
                            <option value="">— None —</option>
                            <?php foreach ($categories as $cat): ?>
                                <option value="<?= $cat['id'] ?>"
                                    <?= (int)($news['category_id'] ?? 0) === (int)$cat['id'] ? 'selected' : '' ?>>
                                    <?= h($cat['name_en']) ?> / <?= h($cat['name_fr']) ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">YouTube URL <small class="text-muted">(replaces image if set)</small></label>
                        <input type="text" name="youtube_url" class="form-control"
                               placeholder="https://www.youtube.com/watch?v=..."
                               value="<?= h($news['youtube_url'] ?? '') ?>">
                        <div class="form-text">Autoplay, muted, no controls. Overrides the image in cards and detail page.</div>
                    </div>

                    <div class="col-md-4">
                        <label class="form-label">Image <small class="text-muted">(optional, used if no YouTube URL)</small></label>
                        <div class="img-picker-widget"
                             data-input="news_img_input"
                             data-preview="news_img_preview"
                             data-folder="news"
                             data-base-url="<?= BASE_URL ?>"
                             data-csrf="<?= h(csrfToken()) ?>"
                             data-original="<?= h($news['image'] ?? '') ?>"
                             data-can-delete="<?= adminCanDelete() ? '1' : '0' ?>">
                            <div id="news_img_preview" class="mb-2" style="<?= !empty($news['image']) ? '' : 'display:none' ?>">
                                <div style="position:relative;display:inline-block">
                                    <img src="<?= !empty($news['image']) ? h(assetUrl($news['image'])) : '' ?>" alt=""
                                         style="max-height:80px;border-radius:6px;border:1px solid var(--neutral-300)">
                                    <button type="button" class="btn btn-sm btn-danger img-picker-clear"
                                            style="position:absolute;top:-6px;right:-6px;padding:0;width:20px;height:20px;border-radius:50%;font-size:11px;line-height:1">×</button>
                                </div>
                            </div>
                            <input type="hidden" name="image_picker" id="news_img_input" value="<?= h($news['image'] ?? '') ?>">
                            <button type="button" class="btn btn-outline-secondary btn-sm img-picker-btn">
                                <i class="fa-solid fa-images me-1"></i> Choose image
                            </button>
                            <div class="form-text">JPG, PNG, WebP or GIF — max 5 MB</div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Date <small class="text-muted">(displayed on site)</small></label>
                        <input type="datetime-local" name="published_at" class="form-control" value="<?= h($pubAt) ?>">
                    </div>
                    <div class="col-12">
                        <?php $canPub = adminCanPublish(); ?>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" name="is_published" id="is_published"
                                   value="1" <?= ($canPub && $news['is_published']) ? 'checked' : '' ?> <?= $canPub ? '' : 'disabled' ?>>
                            <label class="form-check-label fw-semibold" for="is_published">
                                Published (visible on site)
                            </label>
                            <?php if (!$canPub): ?>
                            <?php if ($id > 0 && $news['is_published']): ?>
                            <div class="form-text text-warning"><i class="fa-solid fa-triangle-exclamation me-1"></i>This article is currently published. Saving will send it back for review.</div>
                            <?php else: ?>
                            <div class="form-text text-warning">Your group does not have the <em>Can publish</em> permission — content will be submitted for review.</div>
                            <?php endif; ?>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="mt-4 d-flex gap-2">
        <button type="submit" class="btn btn-sm btn-primary-altered px-4">
            <i class="fa-solid fa-floppy-disk me-1"></i> Save
        </button>
        <a href="<?= BASE_URL ?>/admin/news" class="btn btn-sm btn-outline-secondary">Cancel</a>
    </div>
</form>

<script>
var _saving = false;
window.addEventListener('beforeunload', function (e) { if (!_saving) e.preventDefault(); });
document.querySelector('form').addEventListener('submit', function () { _saving = true; });

(function () {
    var csrfToken = document.querySelector('[name="csrf_token"]').value;

    document.querySelectorAll('.translate-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var from   = this.dataset.from;
            var to     = this.dataset.to;
            var toLang = to === 'fr' ? 'French' : 'English';

            if (!confirm('This will replace the ' + toLang + ' content with a machine translation. Continue?')) return;

            var sourceEditor = tinymce.get('content_' + from);
            var targetEditor = tinymce.get('content_' + to);
            if (!sourceEditor || !targetEditor) return;

            var content = sourceEditor.getContent();
            if (!content.trim()) {
                alert('The source content is empty.');
                return;
            }

            var originalLabel = this.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i> Translating…';

            var formData = new FormData();
            formData.append('csrf_token', csrfToken);
            formData.append('content', content);
            formData.append('source', from);
            formData.append('target', to);

            fetch('<?= BASE_URL ?>/admin/translate.php', { method: 'POST', body: formData })
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    if (data.error) {
                        alert('Translation error: ' + data.error);
                    } else {
                        targetEditor.setContent(data.translated);
                    }
                })
                .catch(function () {
                    alert('Translation failed. Please check your connection and try again.');
                })
                .finally(function () {
                    btn.disabled = false;
                    btn.innerHTML = originalLabel;
                });
        });
    });
})();
</script>

<?php $__tinymce_editor = true; require_once __DIR__ . '/includes/footer.php'; ?>
