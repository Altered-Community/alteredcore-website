<?php
require_once dirname(__DIR__) . '/includes/functions.php';

// Language from URL only — no session, no side-effects
$lang = isset($_GET['lang']) && $_GET['lang'] === 'fr' ? 'fr' : 'en';

$db   = getDB();
$stmt = $db->prepare(q("
    SELECT n.slug,
           n.title_{$lang}   AS title,
           n.excerpt_{$lang} AS excerpt,
           n.content_{$lang} AS content,
           n.image,
           n.published_at,
           n.created_at,
           c.name_{$lang}    AS category_name
    FROM {news} n
    LEFT JOIN {news_categories} c ON n.category_id = c.id
    WHERE n.is_published = 1
      AND (n.published_at IS NULL OR n.published_at <= NOW())
      AND (c.is_hidden = 0 OR c.id IS NULL)
    ORDER BY COALESCE(n.published_at, n.created_at) DESC
    LIMIT 10
"));
$stmt->execute();
$items = $stmt->fetchAll();

$scheme  = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host    = $_SERVER['HTTP_HOST'] ?? 'localhost';
$siteUrl = $scheme . '://' . $host . BASE_URL;

$siteName  = getSiteName();
$feedTitle = $siteName . ' – News';
$feedDesc  = $lang === 'fr'
    ? 'Les dernières actualités de ' . $siteName
    : 'Latest news from ' . $siteName;
$feedLink  = $siteUrl . '/api/rss?lang=' . $lang;

header('Content-Type: application/rss+xml; charset=UTF-8');
header('Cache-Control: public, max-age=1800');

echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
?><rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title><?= htmlspecialchars($feedTitle, ENT_XML1) ?></title>
    <link><?= htmlspecialchars($siteUrl, ENT_XML1) ?></link>
    <description><?= htmlspecialchars($feedDesc, ENT_XML1) ?></description>
    <language><?= $lang === 'fr' ? 'fr-FR' : 'en-US' ?></language>
    <lastBuildDate><?= date('r') ?></lastBuildDate>
    <ttl>30</ttl>
    <atom:link href="<?= htmlspecialchars($feedLink, ENT_XML1) ?>" rel="self" type="application/rss+xml"/>
<?php foreach ($items as $news): ?>
<?php
    $description = trim($news['excerpt'] ?? '');
    if ($description === '') {
        $plain       = strip_tags($news['content'] ?? '');
        $description = mb_strlen($plain) > 300
            ? mb_substr($plain, 0, 300) . '…'
            : $plain;
    }

    $link    = $siteUrl . '/pages/news-detail?slug=' . rawurlencode($news['slug']);
    $pubDate = !empty($news['published_at'])
        ? date('r', strtotime($news['published_at']))
        : date('r', strtotime($news['created_at']));

    $imageUrl = !empty($news['image'])
        ? $siteUrl . '/' . ltrim($news['image'], '/')
        : null;
?>
    <item>
      <title><?= htmlspecialchars($news['title'], ENT_XML1) ?></title>
      <link><?= htmlspecialchars($link, ENT_XML1) ?></link>
      <description><?= htmlspecialchars($description, ENT_XML1) ?></description>
      <pubDate><?= $pubDate ?></pubDate>
      <guid isPermaLink="true"><?= htmlspecialchars($link, ENT_XML1) ?></guid>
<?php if (!empty($news['category_name'])): ?>
      <category><?= htmlspecialchars($news['category_name'], ENT_XML1) ?></category>
<?php endif; ?>
<?php if ($imageUrl): ?>
      <media:content url="<?= htmlspecialchars($imageUrl, ENT_XML1) ?>" medium="image"/>
<?php endif; ?>
    </item>
<?php endforeach; ?>
  </channel>
</rss>
