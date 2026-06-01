<?php
require_once dirname(__DIR__) . '/includes/functions.php';
require_once dirname(__DIR__) . '/includes/shortcodes.php';
initLang();

// translations
$txt = [
    'en' => [
        'news_not_found' => 'News article not found.',
        'news_back'      => 'Back to news',
        'news_published' => 'Published on',
    ],
    'fr' => [
        'news_not_found' => 'Article introuvable.',
        'news_back'      => 'Retour aux actualités',
        'news_published' => 'Publié le',
    ],
][getUiLang()] ?? [];

$slug        = isset($_GET['slug']) ? trim($_GET['slug']) : '';
$id          = isset($_GET['id'])   ? (int)$_GET['id'] : 0;
$isPreview   = !empty($_GET['preview']) && adminHasSection('news');
$news        = null;
if ($slug !== '') {
    $news = getNewsBySlug($slug, !$isPreview);
} elseif ($id) {
    $news = getNewsById($id, !$isPreview);
}

if (!$news) {
    http_response_code(404);
    header('Location: ' . BASE_URL . '/pages/404');
    exit;
}

$lang            = getLang();
$title           = ($news['title_' . $lang]   ?? '') ?: ($news['title_en']   ?? '');
$content         = ($news['content_' . $lang] ?? '') ?: ($news['content_en'] ?? '');
$date            = $news['published_at'] ?? $news['created_at'];
$pageTitle       = $title;
$pageDescription = ($news['excerpt_' . $lang] ?? '') ?: ($news['excerpt_en'] ?? '');
$pageImage       = !empty($news['image']) ? assetUrl($news['image']) : '';

include dirname(__DIR__) . '/includes/header.php';
?>

<div class="container py-4" style="max-width:820px">
    <a href="<?= BASE_URL ?>/pages/news" class="btn btn-outline-secondary btn-sm mb-4">
        <i class="fa-solid fa-arrow-left me-1"></i>
        <?= $txt['news_back'] ?>
    </a>

    <article>
        <div class="news-detail-header">
            <div class="news-card-meta mb-3">
                <?php if (!empty($news['category_name'])): ?>
                    <a href="<?= BASE_URL ?>/pages/news?cat=<?= (int)$news['category_id'] ?>" class="badge-category">
                        <?= h($news['category_name']) ?>
                    </a>
                <?php endif; ?>
                <?php $_siteName = getSiteName(); if ($_siteName !== ''): ?>
                    <span class="badge-source"><?= h($_siteName) ?></span>
                <?php endif; ?>
                <span class="news-detail-meta">
                    <i class="fa-regular fa-calendar me-1"></i><?= $txt['news_published'] ?> <?= h(formatDate($date)) ?>
                </span>
            </div>
            <h1 class="news-detail-title"><?= h($title) ?></h1>
        </div>

        <?php
        $__ytEmbed = !empty($news['youtube_url']) ? youtubeEmbedUrl($news['youtube_url']) : null;
        if ($__ytEmbed): ?>
            <div class="news-detail-video">
                <iframe src="<?= h($__ytEmbed) ?>"
                        frameborder="0" allow="autoplay; encrypted-media"
                        allowfullscreen></iframe>
            </div>
        <?php elseif (!empty($news['image'])): ?>
            <img src="<?= h(assetUrl($news['image'])) ?>" alt="<?= h($title) ?>" class="news-detail-image" loading="lazy">
        <?php endif; ?>

        <div class="news-detail-content">
            <?= renderShortcodes($content) ?>
        </div>
    </article>
</div>

<?php include dirname(__DIR__) . '/includes/footer.php'; ?>
