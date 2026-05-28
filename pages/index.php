<?php
require_once dirname(__DIR__) . '/includes/functions.php';
require_once dirname(__DIR__) . '/includes/shortcodes.php';
initLang();

// translations
$txt = [
    'en' => [
        'news_latest'    => 'Latest News',
        'news_view_all'  => 'View all',
        'no_news'        => 'No news at the moment.',
        'news_read_more' => 'Read more',
    ],
    'fr' => [
        'news_latest'    => 'Dernières actualités',
        'news_view_all'  => 'Voir tout',
        'no_news'        => 'Aucune actualité pour le moment.',
        'news_read_more' => 'Lire la suite',
    ],
][getUiLang()] ?? [];

if (defined('SHOW_NEWSLETTER') && SHOW_NEWSLETTER) {
    require_once dirname(__DIR__) . '/includes/newsletter_sub.php';
}

// No $pageTitle — header uses getSiteName() alone for the homepage
$newsList     = getNewsList(HOME_NEWS_COUNT);
$banner       = getBanner();
$_uiLang      = getUiLang();
$announcement = getAnnouncement($_uiLang);
include dirname(__DIR__) . '/includes/header.php';
?>

<!-- Hero + announcement wrapper -->
<div class="hero-stack<?= $announcement ? ' has-announcement' : '' ?>">
<section class="hero"<?= $banner['bg_image'] ? ' style="background-image:url(' . h(BASE_URL . '/' . $banner['bg_image']) . ');background-size:cover;background-position:center center;background-repeat:no-repeat"' : '' ?>>
    <?php if ($banner['overlay_opacity'] > 0): ?>
    <div class="hero-overlay" style="background-color:<?= h($banner['overlay_color']) ?>;opacity:<?= round($banner['overlay_opacity'] / 100, 2) ?>"></div>
    <?php endif; ?>
    <div class="hero-content container" style="position:relative;z-index:1">
        <h1><?= h($banner['title']) ?></h1>
        <p><?= h($banner['subtitle']) ?></p>
        <?php if ($banner['btn_label'] && $banner['btn_url']): ?>
            <a href="<?= h($banner['btn_url']) ?>" class="btn-hero"><?= h($banner['btn_label']) ?></a>
        <?php endif; ?>
    </div>
</section>
<?php if ($announcement): ?>
<?php
// Build text HTML — replace {link} placeholder with an anchor if a link URL is set
$_annLinkUrl = $announcement['link_url'] ?? '';
$_annText    = $announcement['text'];
if ($_annLinkUrl !== '' && strpos($_annText, '{link}') !== false) {
    $_parts      = explode('{link}', $_annText, 2);
    $_linkLabel  = ($announcement['link_label'] !== '') ? $announcement['link_label'] : $_annLinkUrl;
    $_linkTarget = ($announcement['link_target'] ?? '_self') === '_blank' ? ' target="_blank" rel="noopener noreferrer"' : '';
    $_annTextHtml = h($_parts[0]) . '<a href="' . h($_annLinkUrl) . '"' . $_linkTarget . '>' . h($_linkLabel) . '</a>' . h($_parts[1] ?? '');
} else {
    $_annTextHtml = h($_annText);
}
?>
<div class="hero-announcement alert-<?= h($announcement['color']) ?>" role="alert">
    <div class="container d-flex align-items-start gap-3">
        <?php if ($announcement['icon'] !== ''): ?>
        <i class="<?= h($announcement['icon']) ?> flex-shrink-0 mt-1"></i>
        <?php endif; ?>
        <div>
            <?php if ($announcement['title'] !== ''): ?>
            <div class="hero-announcement-title"><?= h($announcement['title']) ?></div>
            <?php endif; ?>
            <?php if ($_annText !== ''): ?>
            <div class="hero-announcement-text"><?= $_annTextHtml ?></div>
            <?php endif; ?>
        </div>
    </div>
</div>
<?php endif; ?>
</div>

<?php if (function_exists('renderNewsletterBlock')) renderNewsletterBlock(); ?>

<!-- Latest news -->
<section class="container py-4">
    <div class="d-flex align-items-center justify-content-between mb-4">
        <div class="section-title mb-0">
            <span><?= $txt['news_latest'] ?></span>
        </div>
        <a href="<?= BASE_URL ?>/pages/news" class="btn-read-more fw-bold">
            <?= $txt['news_view_all'] ?> <i class="fa-solid fa-arrow-right ms-1"></i>
        </a>
    </div>

    <?php if (empty($newsList)): ?>
        <p class="text-muted"><?= $txt['no_news'] ?></p>
    <?php else: ?>
        <?php
        $_perRow = defined('NEWS_PER_ROW') ? (int)NEWS_PER_ROW : 3;
        $_colMap = [1 => 'col-12', 2 => 'col-md-6', 3 => 'col-md-6 col-lg-4', 4 => 'col-md-6 col-lg-3'];
        $_colCls = $_colMap[$_perRow] ?? 'col-md-6 col-lg-4';
        ?>
        <div class="row g-4">
            <?php foreach ($newsList as $news):
                $title     = $news['title'];
                $exc       = $news['excerpt'];
                $date      = $news['published_at'] ?? $news['created_at'];
                $isRss     = ($news['source_type'] ?? 'native') === 'rss';
                $newsLink  = $isRss ? ($news['rss_link'] ?? '#') : newsUrl($news);
                $extAttrs  = $isRss ? ' target="_blank" rel="noopener noreferrer"' : '';
                $imgSrc    = !empty($news['image'])
                    ? (strpos($news['image'], 'http') === 0 ? $news['image'] : assetUrl($news['image']))
                    : null;
                $srcName   = $isRss
                    ? ($news['source_name'] ?? '')
                    : getSiteName();
            ?>
            <div class="<?= $_colCls ?> d-flex">
                <div class="news-card w-100">
                    <?php
                    $__ytEmbed = !$isRss && !empty($news['youtube_url']) ? youtubeEmbedUrl($news['youtube_url']) : null;
                    if ($__ytEmbed): ?>
                        <div class="news-card-video">
                            <iframe src="<?= h($__ytEmbed) ?>"
                                    frameborder="0" allow="autoplay; encrypted-media"
                                    allowfullscreen loading="lazy"></iframe>
                        </div>
                    <?php elseif ($imgSrc): ?>
                        <a href="<?= h($newsLink) ?>"<?= $extAttrs ?> tabindex="-1">
                            <img src="<?= h($imgSrc) ?>" alt="<?= h($title) ?>" class="news-card-img">
                        </a>
                    <?php else: ?>
                        <div class="news-card-img-placeholder">
                            <i class="fa-solid fa-newspaper"></i>
                        </div>
                    <?php endif; ?>
                    <div class="news-card-body">
                        <div class="news-card-meta">
                            <?php if (!empty($news['is_pinned'])): ?>
                                <span class="badge-pinned" title="<?= h($txt['pinned'] ?? 'Pinned') ?>">
                                    <i class="fa-solid fa-thumbtack"></i>
                                </span>
                            <?php endif; ?>
                            <?php if (!empty($news['category_name'])): ?>
                                <a href="<?= BASE_URL ?>/pages/news?cat=<?= (int)$news['category_id'] ?>" class="badge-category">
                                    <?= h($news['category_name']) ?>
                                </a>
                            <?php endif; ?>
                            <span><i class="fa-regular fa-calendar me-1"></i><?= h(formatDate($date)) ?></span>
                        </div>
                        <div class="news-card-title">
                            <a href="<?= h($newsLink) ?>"<?= $extAttrs ?>><?= h($title) ?></a>
                        </div>
                        <?php if ($srcName !== ''): ?>
                        <div class="news-card-source"><?= h($srcName) ?></div>
                        <?php endif; ?>
                        <?php if (!empty($exc)): ?>
                            <div class="news-card-excerpt"><?= h($exc) ?></div>
                        <?php endif; ?>
                        <div class="news-card-footer">
                            <a href="<?= h($newsLink) ?>"<?= $extAttrs ?> class="btn-read-more">
                                <?= $txt['news_read_more'] ?> →
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>
</section>

<?php include __DIR__ . '/home.php'; ?>

<?php include dirname(__DIR__) . '/includes/footer.php'; ?>
<?php
require_once dirname(__DIR__) . '/includes/rss.php';
$_rssQueue = getRssFeedsNeedingRefresh();
if (!empty($_rssQueue)) {
    if (function_exists('fastcgi_finish_request')) {
        fastcgi_finish_request();
    } else {
        ignore_user_abort(true);
        if (ob_get_level()) ob_end_flush();
        flush();
    }
    foreach ($_rssQueue as $_rssFeed) {
        fetchRssFeed((int)$_rssFeed['id']);
    }
}
?>
