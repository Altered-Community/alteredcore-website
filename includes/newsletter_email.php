<?php
// Turns a news article into a ready-to-send newsletter e-mail (full HTML document)
// for admin/news-newsletter.php, which previews it and pushes it to Listmonk as a
// draft campaign. Listmonk only sends: its campaign template must be a bare
// passthrough (`{{ template "content" . }}`, see LISTMONK_TEMPLATE_ID), the whole
// layout lives here.
//
// The e-mail = header (logo, site name, "read on the website" link), the article
// (image or YouTube thumbnail, title, content), the 3 latest other news as tiles,
// footer (site links, unsubscribe). Every link points to the website, in the
// e-mail's language (?lang=).
//
// E-mail clients ignore most CSS: the article HTML is rewritten with inline
// styles (newsletterEmailContent), URLs are made absolute and what cannot be
// shown in a mail (iframes, scripts, card shortcodes) is replaced or dropped.

require_once __DIR__ . '/shortcodes.php';

// Discord invite of the footer and the "Fan content" badge (relative to the site).
const NEWSLETTER_DISCORD_URL = 'https://discord.gg/pSA9HxB7Ky';
const NEWSLETTER_FAN_BADGE   = 'uploads/editor/20260514_085456_96ed3e02.png';
// Inner width of the e-mail body (600px card minus 2 x 28px padding).
const NEWSLETTER_CONTENT_WIDTH = 544;

/**
 * Colours and font of the e-mail: the design-system tokens (light theme), as raw
 * values since mail clients have no CSS variables. The markup below writes
 * {c:<name>}, replaced at the end of newsletterEmailHtml().
 */
function newsletterPalette(): array
{
    static $palette = null;
    if ($palette === null) {
        $palette = [];
        foreach ([
            'bg'             => '--ac-color-bg-app',
            'surface'        => '--ac-color-surface',
            'subtle'         => '--ac-color-bg-subtle',
            'border'         => '--ac-color-border',
            'dot'            => '--ac-color-border-dashed',
            'text'           => '--ac-color-text',
            'text-2'         => '--ac-color-text-2',
            'muted'          => '--ac-color-text-muted',
            'primary'        => '--ac-color-primary',
            'primary-border' => '--ac-color-primary-border',
            'primary-soft'   => '--ac-color-primary-soft',
            'on-primary'     => '--ac-color-on-primary',
            'font'           => '--ac-font-family',
        ] as $key => $token) {
            $palette['{c:' . $key . '}'] = dsToken($token) ?? 'inherit';
        }
    }
    return $palette;
}

/** Absolute base URL of the website, without trailing slash. */
function newsletterSiteUrl(): string
{
    if (defined('NEWSLETTER_SITE_URL') && NEWSLETTER_SITE_URL !== '') {
        return rtrim(NEWSLETTER_SITE_URL, '/');
    }
    return request_scheme() . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . BASE_URL;
}

/** Path relative to the site root of a site URL ('/x', 'x', '../x'), null for external ones. */
function newsletterRelPath(string $url): ?string
{
    $url = trim($url);
    if ($url === '' || preg_match('#^([a-z][a-z0-9+.-]*:|//|\#|\{\{)#i', $url)) {
        return null;
    }
    $path = ltrim($url, '/');
    if (BASE_URL !== '' && strpos('/' . $path, BASE_URL . '/') === 0) {
        $path = substr('/' . $path, strlen(BASE_URL) + 1);
    }
    while (strpos($path, '../') === 0) {
        $path = substr($path, 3);
    }
    return $path;
}

/** Absolute URL of a site path or upload ('uploads/x.png', '/pages/news', 'https://…'). */
function newsletterAbsUrl(string $url): string
{
    $path = trim($url) === '' ? '' : newsletterRelPath($url);
    if ($path === null) {
        return strpos(trim($url), '//') === 0 ? 'https:' . trim($url) : trim($url);
    }
    return newsletterSiteUrl() . '/' . $path;
}

/** Site URL with ?lang= so the reader lands on the e-mail's language. */
function newsletterSiteLink(string $path, string $lang): string
{
    $url = newsletterAbsUrl($path);
    return $url . (strpos($url, '?') === false ? '?' : '&') . 'lang=' . $lang;
}

function newsletterArticleUrl(array $news, string $lang): string
{
    return newsletterSiteLink(!empty($news['slug'])
        ? 'pages/news-detail?slug=' . rawurlencode($news['slug'])
        : 'pages/news-detail?id=' . (int)$news['id'], $lang);
}

function newsletterFormatDate(string $date, string $lang): string
{
    $ts = strtotime($date);
    if ($lang === 'fr') {
        $months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
                   'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
        return date('j', $ts) . ' ' . $months[(int)date('n', $ts) - 1] . ' ' . date('Y', $ts);
    }
    return date('M j, Y', $ts);
}

/** Image of a news for the e-mail: its picture, else its YouTube thumbnail. */
function newsletterNewsImage(array $news): string
{
    if (!empty($news['youtube_url']) && ($yt = youtubeVideoId($news['youtube_url']))) {
        return 'https://img.youtube.com/vi/' . $yt . '/hqdefault.jpg';
    }
    return !empty($news['image']) ? newsletterAbsUrl($news['image']) : '';
}

/** The news itself, both languages, with its category name in each. */
function newsletterGetNews(int $id): ?array
{
    $stmt = getDB()->prepare(q(
        "SELECT n.*, c.name_en AS category_en, c.name_fr AS category_fr
         FROM {news} n LEFT JOIN {news_categories} c ON n.category_id = c.id
         WHERE n.id = :id"));
    $stmt->execute([':id' => $id]);
    return $stmt->fetch() ?: null;
}

/** The $limit latest published news other than $excludeId (pinned or not). */
function newsletterLatestNews(int $excludeId, int $limit = 3): array
{
    $stmt = getDB()->prepare(q(
        "SELECT n.id, n.slug, n.title_en, n.title_fr, n.image, n.youtube_url,
                n.published_at, n.created_at, c.name_en AS category_en, c.name_fr AS category_fr
         FROM {news} n LEFT JOIN {news_categories} c ON n.category_id = c.id
         WHERE n.is_published = 1 AND n.id != :id
           AND (n.published_at IS NULL OR n.published_at <= NOW())
           AND (c.is_hidden = 0 OR c.id IS NULL)
         ORDER BY COALESCE(n.published_at, n.created_at) DESC
         LIMIT :lim"));
    $stmt->bindValue(':id', $excludeId, PDO::PARAM_INT);
    $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll();
}

/** Inline styles applied to the article HTML, per tag (existing styles win). */
function newsletterContentStyles(): array
{
    return [
        'h1'         => 'margin:24px 0 12px 0; font-size:22px; line-height:28px; font-weight:800; color:{c:text};',
        'h2'         => 'margin:26px 0 12px 0; padding-left:10px; border-left:4px solid {c:primary}; font-size:18px; line-height:23px; font-weight:800; color:{c:text};',
        'h3'         => 'margin:22px 0 8px 0; font-size:16px; line-height:21px; font-weight:800; color:{c:text};',
        'h4'         => 'margin:18px 0 6px 0; font-size:15px; line-height:20px; font-weight:800; color:{c:text};',
        'p'          => 'margin:0 0 14px 0; font-size:15px; line-height:23px; color:{c:text};',
        'ul'         => 'margin:0 0 14px 0; padding-left:22px;',
        'ol'         => 'margin:0 0 14px 0; padding-left:22px;',
        'li'         => 'margin:0 0 6px 0; font-size:15px; line-height:23px; color:{c:text};',
        'a'          => 'color:{c:primary}; font-weight:600;',
        'strong'     => 'color:{c:text};',
        'b'          => 'color:{c:text};',
        'blockquote' => 'margin:0 0 14px 0; padding:10px 14px; background-color:{c:primary-soft}; border-left:4px solid {c:primary-border}; color:{c:text};',
        'hr'         => 'margin:24px 0; border:0; border-top:1px solid {c:border}; height:0;',
        'img'        => 'display:block; max-width:100%; height:auto; border:0; border-radius:8px;',
        'table'      => 'border-collapse:collapse; max-width:100%;',
        'td'         => 'padding:6px 8px; border:1px solid {c:border}; font-size:14px; line-height:20px; color:{c:text};',
        'th'         => 'padding:6px 8px; border:1px solid {c:border}; font-size:14px; line-height:20px; color:{c:text}; background-color:{c:subtle};',
    ];
}

function newsletterButton(string $url, string $label): string
{
    return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 16px 0;"><tr>'
         . '<td align="center" bgcolor="{c:primary}" style="background-color:{c:primary}; border:1px solid {c:primary}; border-radius:6px;">'
         . '<a href="' . h(newsletterAbsUrl($url)) . '" style="display:inline-block; padding:10px 24px; font-size:14px; font-weight:700; color:{c:on-primary}; text-decoration:none;">'
         . h($label) . '</a></td></tr></table>';
}

/**
 * The article HTML (TinyMCE output) made e-mail safe: shortcodes, absolute URLs,
 * inline styles, no iframe/script. Listmonk parses the body as a Go template, so
 * a literal "{{" in the article is escaped.
 */
function newsletterEmailContent(string $html): string
{
    // [btn] -> button, [section-title] -> h2, card shortcodes have no e-mail form.
    $html = preg_replace_callback('/\[btn\s([^\]]+)\]/i', function ($m) {
        $a = _sc_attrs($m[1]);
        if (($a['url'] ?? '') === '') return '';
        return newsletterButton($a['url'],
            html_entity_decode($a['text'] ?? $a['url'], ENT_QUOTES | ENT_HTML5, 'UTF-8'));
    }, $html);
    $html = preg_replace_callback('/\[section-title\s([^\]]+)\]/i', function ($m) {
        $a = _sc_attrs($m[1]);
        return '<h2>' . h(html_entity_decode($a['text'] ?? '', ENT_QUOTES | ENT_HTML5, 'UTF-8')) . '</h2>';
    }, $html);
    $html = preg_replace('/\[(?:card|altered-card|altered-card-unique)\s[^\]]*\]/i', '', $html);

    $doc = new DOMDocument();
    libxml_use_internal_errors(true);
    $doc->loadHTML('<?xml encoding="utf-8"?><html><body><div id="nl-root">' . $html . '</div></body></html>');
    libxml_clear_errors();
    $root = $doc->getElementById('nl-root');
    if (!$root) {
        return '';
    }
    $xp = new DOMXPath($doc);

    foreach (iterator_to_array($xp->query('.//script|.//style|.//form|.//noscript|.//link|.//meta', $root)) as $n) {
        $n->parentNode->removeChild($n);
    }
    // Embeds: YouTube -> clickable thumbnail, anything else -> plain link.
    foreach (iterator_to_array($xp->query('.//iframe', $root)) as $n) {
        $src  = $n->getAttribute('src');
        $repl = $doc->createElement('div');
        $repl->setAttribute('style', 'margin:0 0 14px 0;');
        $yt   = youtubeVideoId($src);
        $a    = $doc->createElement('a');
        $a->setAttribute('href', $yt ? 'https://www.youtube.com/watch?v=' . $yt : newsletterAbsUrl($src));
        if ($yt) {
            $img = $doc->createElement('img');
            $img->setAttribute('src', 'https://img.youtube.com/vi/' . $yt . '/hqdefault.jpg');
            $img->setAttribute('alt', 'YouTube');
            $img->setAttribute('width', (string)NEWSLETTER_CONTENT_WIDTH);
            $a->appendChild($img);
        } else {
            $a->appendChild($doc->createTextNode($src));
        }
        $repl->appendChild($a);
        // An embed alone in its paragraph replaces the paragraph (no <div> in a <p>).
        $parent = $n->parentNode;
        if ($parent->nodeName === 'p' && trim($parent->textContent) === '' && $parent->childNodes->length <= 3) {
            $parent->parentNode->replaceChild($repl, $parent);
        } else {
            $parent->replaceChild($repl, $n);
        }
    }

    foreach (iterator_to_array($xp->query('.//a[@href]', $root)) as $n) {
        $n->setAttribute('href', newsletterAbsUrl($n->getAttribute('href')));
        $n->removeAttribute('target');
    }
    foreach (iterator_to_array($xp->query('.//img', $root)) as $n) {
        $src = $n->getAttribute('src');
        // Outlook ignores max-width: give a width attribute no wider than the column
        // (read from the file for local uploads; left unset when unknown).
        $w   = (int)$n->getAttribute('width');
        $rel = newsletterRelPath($src);
        if ($w <= 0 && $rel !== null && is_file(dirname(__DIR__) . '/' . strtok($rel, '?'))) {
            $size = @getimagesize(dirname(__DIR__) . '/' . strtok($rel, '?'));
            $w    = $size ? (int)$size[0] : 0;
        }
        if ($w > 0) {
            $n->setAttribute('width', (string)min($w, NEWSLETTER_CONTENT_WIDTH));
        }
        $n->removeAttribute('height');
        $n->removeAttribute('loading');
        $n->removeAttribute('srcset');
        $n->setAttribute('src', newsletterAbsUrl($src));
    }

    // Buttons built above are layout tables (role="presentation"): left as they are.
    foreach (newsletterContentStyles() as $tag => $style) {
        foreach (iterator_to_array($xp->query('.//' . $tag . '[not(ancestor-or-self::table[@role="presentation"])]', $root)) as $n) {
            if (($tag === 'ul' || $tag === 'ol') && $n->parentNode->nodeName === 'li') {
                $style = 'margin:6px 0 0 0; padding-left:22px;';
            }
            $own = trim($n->getAttribute('style'));
            $n->setAttribute('style', $style . ($own !== '' ? ' ' . $own : ''));
        }
    }
    foreach (iterator_to_array($xp->query('.//*[@class]', $root)) as $n) {
        $n->removeAttribute('class');
    }

    $out = '';
    foreach ($root->childNodes as $child) {
        $out .= $doc->saveHTML($child);
    }
    return str_replace('{{', '{{ "{{" }}', $out);
}

function newsletterTexts(string $lang): array
{
    return [
        'en' => [
            'tagline'     => getSetting('footer_tagline_en'),
            'read_online' => 'Read on the website',
            'latest'      => 'Latest news',
            'view_all'    => 'View all',
            'read_more'   => 'Read more',
            'news'        => 'News',
            'cards'       => 'Cards',
            'decks'       => 'Decks',
            'events'      => 'Events',
            'play'        => 'Play',
            'disclaimer'  => 'Altered Re:Union is an unofficial community website and is not affiliated with Equinox.',
            'privacy'     => 'Privacy',
            'unsubscribe' => 'Unsubscribe',
        ],
        'fr' => [
            'tagline'     => getSetting('footer_tagline_fr'),
            'read_online' => 'Lire sur le site',
            'latest'      => 'Dernières actus',
            'view_all'    => 'Tout voir',
            'read_more'   => 'Lire la suite',
            'news'        => 'Actus',
            'cards'       => 'Cartes',
            'decks'       => 'Decks',
            'events'      => 'Événements',
            'play'        => 'Jouer',
            'disclaimer'  => 'Altered Re:Union est un site communautaire non officiel, sans lien avec Equinox.',
            'privacy'     => 'Confidentialité',
            'unsubscribe' => 'Se désinscrire',
        ],
    ][$lang];
}

/**
 * Full e-mail for $news (a newsletterGetNews() row) in $lang ('en'|'fr').
 * With $preview, the Listmonk tags are replaced so the page renders in a browser.
 */
function newsletterEmailHtml(array $news, string $lang, bool $preview = false): string
{
    $lang     = $lang === 'fr' ? 'fr' : 'en';
    $t        = newsletterTexts($lang);
    $siteName = getSiteName();
    $title    = ($news['title_' . $lang] ?? '') ?: $news['title_en'];
    $excerpt  = ($news['excerpt_' . $lang] ?? '') ?: '';
    $content  = newsletterEmailContent(($news['content_' . $lang] ?? '') ?: $news['content_en']);
    $url      = newsletterArticleUrl($news, $lang);
    $image    = newsletterNewsImage($news);
    $logo     = getSetting('logo_path');
    $latest   = newsletterLatestNews((int)$news['id']);
    $unsub    = $preview ? '#' : '{{ UnsubscribeURL }}';
    $track    = $preview ? '' : '{{ TrackView }}';

    $links = [
        [newsletterSiteLink('', $lang), parse_url(newsletterSiteUrl(), PHP_URL_HOST)],
        [newsletterSiteLink('pages/news', $lang), $t['news']],
        [newsletterSiteLink('pages/cards', $lang), $t['cards']],
        [newsletterSiteLink('pages/decks', $lang), $t['decks']],
        [newsletterSiteLink('pages/events', $lang), $t['events']],
        ['https://boardgamearena.com/gamepanel?game=altered', $t['play']],
        [NEWSLETTER_DISCORD_URL, 'Discord'],
    ];

    ob_start();
    ?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="<?= $lang ?>">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title><?= h($title) ?></title>
<!--[if gte mso 9]>
<xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
<style>table, td { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; } body, table, td, p, a, span, h1, h2, h3, h4, li { font-family: 'Segoe UI', Arial, sans-serif !important; }</style>
<![endif]-->
<style>
  /* The site font, for the clients that load web fonts (Apple Mail, iOS); the others use the fallbacks of the stack. */
  @font-face { font-family: 'Figtree'; font-style: normal; font-weight: 300 900; src: url('<?= h(newsletterAbsUrl('design-system/fonts/figtree/figtree-latin-wght-normal.woff2')) ?>') format('woff2'); }
  html, body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
  body { background-color: {c:bg}; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table { border-spacing: 0; }
  td { padding: 0; }
  img { border: 0; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
  a { color: {c:primary}; }
  a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
  @media only screen and (max-width: 620px) {
    .container { width: 100% !important; max-width: 100% !important; }
    .gutter { padding-left: 12px !important; padding-right: 12px !important; }
    .pad { padding-left: 18px !important; padding-right: 18px !important; }
    .thumb { width: 96px !important; }
    .thumb img { width: 96px !important; height: 54px !important; }
    .hide-mobile { display: none !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background-color:{c:bg}; font-family:{c:font}; color:{c:text};">

<?php if ($excerpt !== ''): ?>
<div style="display:none; font-size:1px; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden; mso-hide:all; color:{c:bg};"><?= h($excerpt) ?><?= str_repeat('&nbsp;&#847;&zwnj;', 30) ?></div>
<?php endif; ?>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{c:bg}" style="background-color:{c:bg};">
  <tr>
    <td align="center" class="gutter" style="padding:24px 12px 32px 12px;">

      <!--[if (gte mso 9)|(IE)]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td><![endif]-->
      <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" align="center" bgcolor="{c:surface}" style="width:600px; max-width:600px; background-color:{c:surface}; border:1px solid {c:border}; border-radius:12px;">

        <!-- Header -->
        <tr>
          <td bgcolor="{c:primary}" style="background-color:{c:primary}; height:5px; line-height:5px; font-size:0; border-radius:12px 12px 0 0;">&nbsp;</td>
        </tr>
        <tr>
          <td class="pad" style="padding:16px 28px; border-bottom:1px solid {c:border};">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <?php if ($logo): ?>
                <td width="36" valign="middle" style="padding-right:12px;">
                  <a href="<?= h(newsletterSiteLink('', $lang)) ?>"><img src="<?= h(newsletterAbsUrl($logo)) ?>" width="36" height="36" alt="<?= h($siteName) ?>" style="display:block; width:36px; height:36px; border-radius:18px;"></a>
                </td>
                <?php endif; ?>
                <td valign="middle">
                  <a href="<?= h(newsletterSiteLink('', $lang)) ?>" style="font-size:17px; line-height:20px; font-weight:800; letter-spacing:-0.01em; color:{c:text}; text-decoration:none;"><?= h($siteName) ?></a>
                  <?php if ($t['tagline'] !== ''): ?>
                  <div class="hide-mobile" style="font-size:11px; line-height:14px; color:{c:muted};"><?= h($t['tagline']) ?></div>
                  <?php endif; ?>
                </td>
                <td valign="middle" align="right" style="font-size:11px; line-height:14px; color:{c:muted}; white-space:nowrap;">
                  <a href="<?= h($url) ?>" style="color:{c:muted}; text-decoration:underline;"><?= $t['read_online'] ?></a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Article -->
        <tr>
          <td class="pad" style="padding:28px 28px 8px 28px; font-size:15px; line-height:23px; color:{c:text};">
            <?php if ($image): ?>
            <a href="<?= h($url) ?>" style="display:block; margin-bottom:20px;"><img src="<?= h($image) ?>" width="<?= NEWSLETTER_CONTENT_WIDTH ?>" alt="<?= h($title) ?>" style="display:block; width:100%; max-width:<?= NEWSLETTER_CONTENT_WIDTH ?>px; height:auto; border:0; border-radius:8px;"></a>
            <?php endif; ?>
            <h1 style="margin:0 0 18px 0; font-size:24px; line-height:30px; font-weight:800; letter-spacing:-0.01em; color:{c:text};">
              <span style="display:inline-block; border-left:4px solid {c:primary}; padding-left:12px;"><?= h($title) ?></span>
            </h1>
            <?= $content ?>
          </td>
        </tr>

        <?php if ($latest): ?>
        <!-- Latest news -->
        <tr>
          <td class="pad" style="padding:20px 28px 8px 28px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid {c:border};">
              <tr>
                <td align="left" valign="bottom" style="padding:22px 0 12px 0;">
                  <span style="display:inline-block; border-left:4px solid {c:primary}; padding-left:10px; font-size:17px; line-height:20px; font-weight:800; color:{c:text};"><?= $t['latest'] ?></span>
                </td>
                <td align="right" valign="bottom" style="padding:22px 0 12px 0;">
                  <a href="<?= h(newsletterSiteLink('pages/news', $lang)) ?>" style="font-size:12px; font-weight:700; color:{c:primary}; text-decoration:none;"><?= $t['view_all'] ?> &rarr;</a>
                </td>
              </tr>
            </table>
            <?php foreach ($latest as $i => $item):
                $itemUrl   = newsletterArticleUrl($item, $lang);
                $itemTitle = ($item['title_' . $lang] ?? '') ?: $item['title_en'];
                $itemCat   = ($item['category_' . $lang] ?? '') ?: ($item['category_en'] ?? '');
                $itemImg   = newsletterNewsImage($item);
            ?>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid {c:border}; border-radius:8px;<?= $i < count($latest) - 1 ? ' margin-bottom:10px;' : '' ?>">
              <tr>
                <?php if ($itemImg): ?>
                <td class="thumb" width="120" valign="top" style="padding:10px 0 10px 10px;">
                  <a href="<?= h($itemUrl) ?>" style="display:block;"><img src="<?= h($itemImg) ?>" width="120" height="68" alt="<?= h($itemTitle) ?>" style="display:block; width:120px; height:68px; object-fit:cover; border-radius:6px;"></a>
                </td>
                <?php endif; ?>
                <td valign="top" style="padding:10px 12px 10px 14px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <?php if ($itemCat !== ''): ?>
                      <td bgcolor="{c:primary}" style="background-color:{c:primary}; border-radius:4px; padding:2px 7px; font-size:10px; line-height:14px; font-weight:700; letter-spacing:0.04em; text-transform:uppercase; color:{c:on-primary}; white-space:nowrap;"><?= h($itemCat) ?></td>
                      <?php endif; ?>
                      <td style="<?= $itemCat !== '' ? 'padding-left:8px; ' : '' ?>font-size:11px; line-height:14px; color:{c:muted}; white-space:nowrap;"><?= h(newsletterFormatDate($item['published_at'] ?? $item['created_at'], $lang)) ?></td>
                    </tr>
                  </table>
                  <p style="margin:6px 0 4px 0; font-size:14px; line-height:19px; font-weight:700; color:{c:text};">
                    <a href="<?= h($itemUrl) ?>" style="color:{c:text}; text-decoration:none;"><?= h($itemTitle) ?></a>
                  </p>
                  <a href="<?= h($itemUrl) ?>" style="font-size:12px; font-weight:700; color:{c:primary}; text-decoration:none;"><?= $t['read_more'] ?> &rarr;</a>
                </td>
              </tr>
            </table>
            <?php endforeach; ?>
          </td>
        </tr>
        <?php endif; ?>

        <tr><td style="height:24px; line-height:24px; font-size:0;">&nbsp;</td></tr>

        <!-- Footer -->
        <tr>
          <td class="pad" bgcolor="{c:subtle}" style="background-color:{c:subtle}; border-top:1px solid {c:border}; border-radius:0 0 12px 12px; padding:20px 28px 22px 28px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="padding-bottom:12px; font-size:13px; line-height:22px;">
                  <?php foreach ($links as $i => [$href, $label]): ?>
                  <?php if ($i > 0): ?><span style="color:{c:dot};">&nbsp;&middot;&nbsp;</span><?php endif; ?>
                  <a href="<?= h($href) ?>" style="color:{c:text-2}; font-weight:700; text-decoration:none;"><?= h($label) ?></a>
                  <?php endforeach; ?>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding-bottom:10px;">
                  <img src="<?= h(newsletterAbsUrl(NEWSLETTER_FAN_BADGE)) ?>" width="100" height="32" alt="Altered Fan Content" style="display:block; width:100px; height:32px;">
                </td>
              </tr>
              <tr>
                <td align="center" style="font-size:11px; line-height:17px; color:{c:muted};">
                  <?= $t['disclaimer'] ?><br>
                  &copy; <?= date('Y') ?> <?= h($siteName) ?>
                  &nbsp;&middot;&nbsp; <a href="<?= h(newsletterSiteLink('pages/privacy', $lang)) ?>" style="color:{c:muted};"><?= $t['privacy'] ?></a>
                  &nbsp;&middot;&nbsp; <a href="<?= $unsub ?>" style="color:{c:muted};"><?= $t['unsubscribe'] ?></a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
      <!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->

    </td>
  </tr>
</table>
<?= $track ?>

</body>
</html>
<?php
    return strtr(ob_get_clean(), newsletterPalette());
}
