<?php
require_once dirname(__DIR__) . '/includes/functions.php';
initLang();

// translations
$txt = [
    'en' => [
        'news_title'    => 'News',
        'news_all_cats' => 'All categories',
        'no_news'       => 'No news at the moment.',
        'news_read_more'=> 'Read more',
        'pinned'        => 'Pinned',
    ],
    'fr' => [
        'news_title'    => 'Actualités',
        'news_all_cats' => 'Toutes les catégories',
        'no_news'       => 'Aucune actualité pour le moment.',
        'news_read_more'=> 'Lire la suite',
        'pinned'        => 'Épinglée',
    ],
][getUiLang()] ?? [];

$catId      = isset($_GET['cat']) ? (int)$_GET['cat'] : null;
$page       = max(1, isset($_GET['p']) ? (int)$_GET['p'] : 1);
$perPage    = NEWS_PER_PAGE;
$offset     = ($page - 1) * $perPage;

$newsList   = getNewsList($perPage, $catId, $offset);
$total      = countNews($catId);
$totalPages = (int)ceil($total / $perPage);
$categories = getCategories();

$pageTitle  = $txt['news_title'];
include dirname(__DIR__) . '/includes/header.php';
?>

<div class="container py-4">
    <div class="section-title mb-4"><span><?= $txt['news_title'] ?></span></div>

    <!-- Category filter -->
    <div class="cat-filter">
        <a href="<?= BASE_URL ?>/pages/news" class="<?= $catId === null ? 'active' : '' ?>">
            <?= $txt['news_all_cats'] ?>
        </a>
        <?php foreach ($categories as $cat): ?>
            <a href="<?= BASE_URL ?>/pages/news?cat=<?= (int)$cat['id'] ?>"
               class="<?= $catId === (int)$cat['id'] ? 'active' : '' ?>">
                <?= h($cat['name']) ?>
            </a>
        <?php endforeach; ?>
    </div>

    <?php if (empty($newsList)): ?>
        <p class="text-muted mt-3"><?= $txt['no_news'] ?></p>
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
                                <span class="badge-pinned" title="<?= h($txt['pinned']) ?>">
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

        <!-- Pagination -->
        <?php if ($totalPages > 1): ?>
        <nav class="mt-5 d-flex justify-content-center">
            <ul class="pagination pagination-altered">
                <?php for ($i = 1; $i <= $totalPages; $i++):
                    $href = BASE_URL . '/pages/news?p=' . $i . ($catId ? '&cat=' . $catId : '');
                ?>
                <li class="page-item <?= $i === $page ? 'active' : '' ?>">
                    <a class="page-link" href="<?= h($href) ?>"><?= $i ?></a>
                </li>
                <?php endfor; ?>
            </ul>
        </nav>
        <?php endif; ?>
    <?php endif; ?>
</div>

<?php include dirname(__DIR__) . '/includes/footer.php'; ?>
<?php
// Background RSS refresh — send the response to the browser first, then fetch
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
