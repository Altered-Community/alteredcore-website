<?php
// Local stack only: copies the public content of production (https://altered.re) into the local
// database, so the local site shows what production shows. Reads the public pages, in English and
// French, the way a visitor sees them; the server itself (database, config.local.php) stays out of
// reach, so anything only an admin or a logged-in user can see is not copied.
//
//   docker compose exec web php docker/stack/mirror-prod.php            # once (skipped if done)
//   docker compose exec web php docker/stack/mirror-prod.php --force    # again, replacing the copy
//   … --source=https://website-preprod.altered.re                        # another environment
//
// Also run by docker/entrypoint.sh when AC_STACK_MIRROR=1.
//
// Copied: site settings (description, logo, theme colour, footer columns and images, home
// page text, privacy policy), home banner, news categories and articles, content pages (the admin
// "Pages" of type content, e.g. /pages/faq-like pages that no PHP file provides), side menu,
// footer links. Images under /uploads/ are downloaded into uploads/ (ignored by git). Content pages
// are served by pages/_router.php without the stub file the admin writes on the server.
// Not copied: the main menu (docker/stack/seed.php), announcements, projects, users, plugin data and
// plugin settings (events JSON, GameApi URL…), what needs a production login.

require_once dirname(__DIR__, 2) . '/includes/functions.php';

const MIRROR_VERSION = '1';

$opts   = getopt('', ['force', 'source::']);
$source = rtrim($opts['source'] ?? getenv('AC_STACK_MIRROR_SOURCE') ?: 'https://altered.re', '/');
$force  = isset($opts['force']);
$root   = dirname(__DIR__, 2);

if (!$force && getSetting('stack_mirror_version') === MIRROR_VERSION . '@' . $source) {
    echo "[mirror] already applied from $source (--force to copy again)\n";
    exit(0);
}

// ---- HTTP + DOM helpers --------------------------------------------------------------------

function fetchPage(string $url): ?string {
    static $cache = [];
    if (array_key_exists($url, $cache)) return $cache[$url];
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => false, CURLOPT_TIMEOUT => 30,
        CURLOPT_USERAGENT => 'AlteredCore local stack mirror',
    ]);
    $body = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return $cache[$url] = ($code === 200 && is_string($body)) ? $body : null;
}

function page(string $path, string $lang): ?DOMXPath {
    global $source;
    $url  = $source . $path . (strpos($path, '?') === false ? '?' : '&') . 'lang=' . $lang;
    $html = fetchPage($url);
    if ($html === null) return null;
    $doc = new DOMDocument();
    libxml_use_internal_errors(true);
    $doc->loadHTML('<?xml encoding="UTF-8">' . $html, LIBXML_NOERROR | LIBXML_NOWARNING);
    libxml_clear_errors();
    return new DOMXPath($doc);
}

function one(DOMXPath $x, string $query, ?DOMNode $ctx = null): ?DOMElement {
    $n = $x->query($query, $ctx);
    return ($n && $n->length) ? $n->item(0) : null;
}

function cls(string $name): string {
    return "contains(concat(' ', normalize-space(@class), ' '), ' $name ')";
}

function text(?DOMNode $n): string {
    return $n ? trim(preg_replace('/\s+/u', ' ', $n->textContent)) : '';
}

function inner(?DOMNode $n): string {
    if (!$n) return '';
    $html = '';
    foreach ($n->childNodes as $c) $html .= $n->ownerDocument->saveHTML($c);
    return trim($html);
}

/** Children of <main> without the scripts and the loading overlay every page carries. */
function mainNodes(DOMXPath $x): array {
    $main = one($x, '//main');
    $out  = [];
    if (!$main) return $out;
    foreach ($main->childNodes as $c) {
        if ($c instanceof DOMElement && ($c->tagName === 'script' || $c->getAttribute('id') === 'ac-spinner')) continue;
        if ($c instanceof DOMText && trim($c->textContent) === '') continue;
        $out[] = $c;
    }
    return $out;
}

/** Upload path ("uploads/…") from a URL of the source site, or null. */
function uploadPath(string $url): ?string {
    global $source;
    $url = preg_replace('#^' . preg_quote($source, '#') . '#', '', html_entity_decode($url));
    return preg_match('#^/?(uploads/[^"\'\s)?]+)#', $url, $m) ? rawurldecode($m[1]) : null;
}

// ---- Collect -------------------------------------------------------------------------------

$langs = ['en', 'fr'];
$home  = [];
foreach ($langs as $l) {
    $home[$l] = page('/', $l);
    if (!$home[$l]) { fwrite(STDERR, "[mirror] $source is unreachable\n"); exit(1); }
}
$settings = [];

// Head: description, keywords, author, theme colour, og image (fonts are the design system's).
foreach ($langs as $l) {
    $d = one($home[$l], '//meta[@name="description"]');
    if ($d) $settings['meta_description_' . $l] = $d->getAttribute('content');
}
foreach (['keywords' => 'meta_keywords', 'author' => 'meta_author', 'theme-color' => 'theme_color', 'twitter:site' => 'twitter_handle'] as $meta => $key) {
    $m = one($home['en'], '//meta[@name="' . $meta . '"]');
    if ($m && $m->getAttribute('content') !== '') $settings[$key] = $m->getAttribute('content');
}
$og = one($home['en'], '//meta[@property="og:image"]');
if ($og && ($p = uploadPath($og->getAttribute('content')))) $settings['og_image'] = $p;

// Logo.
$logo = one($home['en'], '//img[' . cls('navbar-logo-custom') . ']');
if ($logo && ($p = uploadPath($logo->getAttribute('src')))) $settings['logo_path'] = $p;

// Home banner.
$banner = [];
foreach ($langs as $l) {
    $hero = one($home[$l], '//section[' . cls('hero') . ']');
    if (!$hero) continue;
    $banner['title_' . $l]     = text(one($home[$l], './/h1', $hero));
    $banner['subtitle_' . $l]  = text(one($home[$l], './/p', $hero));
    $btn = one($home[$l], './/a[' . cls('btn-hero') . ']', $hero);
    $banner['btn_label_' . $l] = text($btn);
    $banner['btn_url']         = $btn ? $btn->getAttribute('href') : '';
    $banner['bg_image']        = preg_match('#url\(([^)]+)\)#', $hero->getAttribute('style'), $m) ? uploadPath($m[1]) : null;
    $ov = one($home[$l], './/div[' . cls('hero-overlay') . ']', $hero);
    if ($ov && preg_match('#background-color:(\#[0-9a-fA-F]{3,8});opacity:([0-9.]+)#', $ov->getAttribute('style'), $m)) {
        $banner['overlay_color']   = $m[1];
        $banner['overlay_opacity'] = (int)round((float)$m[2] * 100);
    }
}

// Home page text: the last section of <main> (pages/home.php), when it is not the news block.
foreach ($langs as $l) {
    $sections = array_values(array_filter(mainNodes($home[$l]), function ($n) {
        return $n instanceof DOMElement && $n->tagName === 'section';
    }));
    $last = end($sections);
    if ($last && !one($home[$l], './/*[' . cls('news-card') . ']', $last) && !one($home[$l], './/form', $last)) {
        $settings['homepage_content_' . $l] = inner($last);
    }
}

// Footer: column titles and contents, links, decoration images.
$footerLinks = [];
foreach ($langs as $l) {
    $footer = one($home[$l], '//footer');
    if (!$footer) continue;
    $row = one($home[$l], './/div[' . cls('row') . ']', $footer);
    $col = 0;
    foreach ($row ? $row->childNodes : [] as $c) {
        if (!$c instanceof DOMElement) continue;
        $col++;
        $title   = one($home[$l], './/div[' . cls('footer-col-title') . ']', $c);
        $content = one($home[$l], './/div[' . cls('footer-col-content') . ']', $c);
        $settings["footer_col{$col}_title_$l"]   = text($title);
        $settings["footer_col{$col}_content_$l"] = inner($content);
        foreach ($home[$l]->query('.//ul/li/a', $c) as $i => $a) {
            $icon = one($home[$l], './/i', $a);
            $footerLinks[$col . '.' . $i]['label_' . $l] = text($a);
            $footerLinks[$col . '.' . $i] += [
                'url' => $a->getAttribute('href'), 'column_num' => $col, 'sort_order' => $i + 1,
                'icon' => $icon ? trim(str_replace('me-1', '', $icon->getAttribute('class'))) : null,
            ];
        }
    }
}
foreach ($home['en']->query('//style') as $style) {
    $css = $style->textContent;
    if (strpos($css, '.site-footer') === false) continue;
    foreach (['before' => 'left', 'after' => 'right'] as $pseudo => $side) {
        if (preg_match('#\.site-footer::' . $pseudo . '\{[^}]*background-image:url\("([^"]+)"\)[^}]*opacity:([0-9.]+)#', $css, $m)) {
            $settings['footer_deco_' . $side]              = uploadPath($m[1]);
            $settings['footer_deco_' . $side . '_opacity'] = (string)(int)round((float)$m[2] * 100);
        }
    }
    if (preg_match('#\.site-footer\{[^}]*background-image:url\("([^"]+)"\)#', $css, $m)) $settings['footer_bg_image'] = uploadPath($m[1]);
}

// Side menu.
$sidebar = [];
foreach ($langs as $l) {
    $i = 0;
    foreach ($home[$l]->query('//aside[@id="site-sidebar"]//nav/*') as $n) {
        $i++;
        $item = &$sidebar[$i];
        if (preg_match('/sidebar-section-title/', $n->getAttribute('class'))) {
            $item['label_' . $l] = text($n);
            $item += ['url' => '#', 'icon' => '', 'is_section_header' => 1, 'is_separator' => 0, 'is_blank' => 0];
        } elseif (preg_match('/sidebar-sep|sidebar-divider/', $n->getAttribute('class')) || $n->tagName === 'hr') {
            $item += ['label_' . $l => '', 'url' => '#', 'icon' => '', 'is_section_header' => 0, 'is_separator' => 1, 'is_blank' => 0];
        } else {
            $icon = one($home[$l], './/i', $n);
            $item['label_' . $l] = text($n);
            $item += [
                'url' => $n->getAttribute('href'), 'icon' => $icon ? $icon->getAttribute('class') : '',
                'is_section_header' => 0, 'is_separator' => 0, 'is_blank' => $n->getAttribute('target') === '_blank' ? 1 : 0,
            ];
        }
        unset($item);
    }
}

// News categories (the filter on /pages/news) and articles (every page of the list).
$categories = [];
$news       = [];
foreach ($langs as $l) {
    $list = page('/pages/news', $l);
    foreach ($list ? $list->query('//div[' . cls('cat-filter') . ']/a[contains(@href, "cat=")]') : [] as $i => $a) {
        if (!preg_match('/cat=(\d+)/', $a->getAttribute('href'), $m)) continue;
        $categories[(int)$m[1]]['name_' . $l] = text($a);
    }
}
for ($p = 1; $p <= 50; $p++) {
    $list = page('/pages/news?p=' . $p, 'en');
    $new  = 0;
    foreach ($list ? $list->query('//div[' . cls('news-card-title') . ']/a') : [] as $a) {
        $href = $a->getAttribute('href');
        if (!preg_match('/news-detail\?slug=([^&]+)/', $href, $m) || isset($news[$m[1]])) continue;
        $card = $a->parentNode->parentNode;
        $news[$m[1]] = ['excerpt_en' => text(one($list, './/div[' . cls('news-card-excerpt') . ']', $card))];
        $new++;
    }
    if ($new === 0) break;
}
$dates = [];  // RSS: exact publication times
$rss = fetchPage($source . '/pages/rss?lang=en');
if ($rss && ($xml = @simplexml_load_string($rss))) {
    foreach ($xml->channel->item ?? [] as $item) {
        if (preg_match('/slug=([^&]+)/', (string)$item->link, $m)) $dates[$m[1]] = date('Y-m-d H:i:s', strtotime((string)$item->pubDate));
    }
}
foreach (array_keys($news) as $slug) {
    foreach ($langs as $l) {
        $d = page('/pages/news-detail?slug=' . rawurlencode($slug), $l);
        if (!$d) continue;
        $news[$slug]['title_' . $l]   = text(one($d, '//h1[' . cls('news-detail-title') . ']'));
        $news[$slug]['content_' . $l] = inner(one($d, '//div[' . cls('news-detail-content') . ']'));
        if ($l === 'en') {
            $cat = one($d, '//div[' . cls('news-detail-header') . ']//a[contains(@href, "cat=")]');
            $img = one($d, '//img[' . cls('news-detail-image') . ']');
            $yt  = one($d, '//article//iframe[contains(@src, "youtube")]');
            $news[$slug]['category_id'] = ($cat && preg_match('/cat=(\d+)/', $cat->getAttribute('href'), $m)) ? (int)$m[1] : null;
            $news[$slug]['image']       = $img ? uploadPath($img->getAttribute('src')) : null;
            $news[$slug]['youtube_url'] = $yt ? $yt->getAttribute('src') : null;
            $meta = text(one($d, '//span[' . cls('news-detail-meta') . ']'));
            $news[$slug]['published_at'] = $dates[$slug]
                ?? ((preg_match('/[A-Z][a-z]+ \d{1,2}, \d{4}/', $meta, $dm) && ($t = strtotime($dm[0]))) ? date('Y-m-d 12:00:00', $t) : date('Y-m-d H:i:s'));
        }
    }
    if (($news[$slug]['category_id'] ?? null) && !isset($categories[$news[$slug]['category_id']])) {
        $categories[$news[$slug]['category_id']] = ['name_en' => 'Category ' . $news[$slug]['category_id'], 'is_hidden' => 1];
    }
}

// Privacy policy.
foreach ($langs as $l) {
    $pp = page('/pages/privacy', $l);
    $c  = $pp ? one($pp, '//main//div[' . cls('news-detail-content') . ']') : null;
    if ($c) $settings['privacy_content_' . $l] = inner($c);
}

// Content pages: internal /pages/<slug> links that no PHP file of this repo provides.
$codeSlugs = array_map(function ($f) { return basename($f, '.php'); }, glob($root . '/pages/*.php'));
foreach (glob($root . '/plugins/*/plugin.json') as $manifest) {
    foreach (json_decode((string)file_get_contents($manifest), true)['pages'] ?? [] as $pg) $codeSlugs[] = $pg['slug'] ?? '';
}
$slugs = [];
foreach ($home['en']->query('//a[starts-with(@href, "/pages/")]') as $a) {
    if (preg_match('#^/pages/([a-z0-9-]+)$#', $a->getAttribute('href'), $m) && !in_array($m[1], $codeSlugs, true)) $slugs[$m[1]] = true;
}
$pages = [];
foreach (array_keys($slugs) as $slug) {
    foreach ($langs as $l) {
        $pg = page('/pages/' . $slug, $l);
        if (!$pg) continue;
        $nodes = mainNodes($pg);
        $title = trim(preg_replace('/\s+—\s+[^—]+$/u', '', text(one($pg, '//title'))));
        // The page title, shown by includes/content-page.php: drop it from the copied block.
        foreach ($pg->query('//main//*[' . cls('section-title') . ']') as $t) {
            if (text($t) !== $title) continue;
            $drop = ($t->parentNode instanceof DOMElement && preg_match('/\bd-flex\b/', $t->parentNode->getAttribute('class'))
                     && $t->parentNode->childNodes->length <= 3) ? $t->parentNode : $t;
            $drop->parentNode->removeChild($drop);
            break;
        }
        $blocks = array_values(array_filter($nodes, function ($n) { return !($n instanceof DOMElement && in_array($n->tagName, ['style', 'link'], true)); }));
        $plain  = count($blocks) === 1 && preg_match('/^container py-4$/', trim($blocks[0]->getAttribute('class')));
        $pages[$slug]['title_' . $l]   = $title;
        $html = [];
        foreach ($nodes as $n) {                                  // unwrap the content-page.php layout
            $html[] = ($plain && $n === $blocks[0]) ? inner($n) : $n->ownerDocument->saveHTML($n);
        }
        $pages[$slug]['content_' . $l] = implode("\n", $html);
    }
}

// ---- Write ---------------------------------------------------------------------------------

$db = getDB();
$db->beginTransaction();
$db->exec('SET foreign_key_checks = 0');

foreach ($settings as $k => $v) saveSetting($k, $v);

if ($banner) {
    $db->exec(q('DELETE FROM {banner}'));
    $b = $banner + ['title_en' => '', 'title_fr' => '', 'subtitle_en' => '', 'subtitle_fr' => '', 'btn_label_en' => '', 'btn_label_fr' => '',
                    'btn_url' => '', 'bg_image' => null, 'overlay_color' => '#000000', 'overlay_opacity' => 0];
    $db->prepare(q('INSERT INTO {banner} (id, title_en, title_fr, subtitle_en, subtitle_fr, btn_label_en, btn_label_fr, btn_url, bg_image, overlay_color, overlay_opacity)
                    VALUES (1, :title_en, :title_fr, :subtitle_en, :subtitle_fr, :btn_label_en, :btn_label_fr, :btn_url, :bg_image, :overlay_color, :overlay_opacity)'))
       ->execute($b);
}

if ($categories) {
    $db->exec(q('DELETE FROM {news_categories}'));
    $ins = $db->prepare(q('INSERT INTO {news_categories} (id, name_en, name_fr, slug, is_hidden, sort_order) VALUES (?, ?, ?, ?, ?, ?)'));
    foreach ($categories as $id => $c) {
        $slug = trim(preg_replace('/[^a-z0-9]+/', '-', strtolower($c['name_en'] ?? 'category')), '-') . '-' . $id;
        $ins->execute([$id, $c['name_en'] ?? '', $c['name_fr'] ?? ($c['name_en'] ?? ''), $slug, $c['is_hidden'] ?? 0, $c['sort_order'] ?? 99]);
    }
}

if ($news) {
    $db->exec(q('DELETE FROM {news}'));
    $ins = $db->prepare(q('INSERT INTO {news} (category_id, slug, title_en, title_fr, content_en, content_fr, excerpt_en, excerpt_fr, image, youtube_url, published_at, is_published)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)'));
    foreach ($news as $slug => $n) {
        // The list shortens long excerpts on display: drop its ellipsis, the site adds it back.
        $excerpt = trim(preg_replace('/(…|\.\.\.)$/u', '', $n['excerpt_en'] ?? '')) ?: null;
        $ins->execute([$n['category_id'] ?? null, $slug, $n['title_en'] ?? $slug, $n['title_fr'] ?? ($n['title_en'] ?? $slug),
                       $n['content_en'] ?? '', $n['content_fr'] ?? ($n['content_en'] ?? ''), $excerpt, null,
                       $n['image'] ?? null, $n['youtube_url'] ?? null, $n['published_at'] ?? date('Y-m-d H:i:s')]);
    }
}

if ($sidebar) {
    $db->exec(q('DELETE FROM {sidebar_items}'));
    $ins = $db->prepare(q('INSERT INTO {sidebar_items} (label_en, label_fr, url, icon, sort_order, is_visible, is_separator, is_section_header, is_blank) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)'));
    foreach (array_values($sidebar) as $i => $s) {
        $ins->execute([$s['label_en'] ?? '', $s['label_fr'] ?? ($s['label_en'] ?? ''), $s['url'], $s['icon'], ($i + 1) * 10, $s['is_separator'], $s['is_section_header'], $s['is_blank']]);
    }
}

if ($footerLinks) {
    $db->exec(q('DELETE FROM {footer_links}'));
    $ins = $db->prepare(q('INSERT INTO {footer_links} (label_en, label_fr, url, icon, column_num, sort_order) VALUES (?, ?, ?, ?, ?, ?)'));
    foreach ($footerLinks as $f) {
        $ins->execute([$f['label_en'] ?? '', $f['label_fr'] ?? ($f['label_en'] ?? ''), $f['url'], $f['icon'], $f['column_num'], $f['sort_order']]);
    }
}

$ins = $db->prepare(q("INSERT INTO {pages} (slug, type, title_en, title_fr, content_en, content_fr, is_visible)
                       VALUES (:slug, 'content', :ten, :tfr, :cen, :cfr, 1)
                       ON DUPLICATE KEY UPDATE type = 'content', title_en = VALUES(title_en), title_fr = VALUES(title_fr),
                                               content_en = VALUES(content_en), content_fr = VALUES(content_fr), is_visible = 1"));
foreach ($pages as $slug => $p) {
    $ins->execute([':slug' => $slug, ':ten' => $p['title_en'] ?? $slug, ':tfr' => $p['title_fr'] ?? ($p['title_en'] ?? $slug),
                   ':cen' => $p['content_en'] ?? '', ':cfr' => $p['content_fr'] ?? ($p['content_en'] ?? '')]);
}

$db->exec('SET foreign_key_checks = 1');
saveSetting('stack_mirror_version', MIRROR_VERSION . '@' . $source);
$db->commit();

// ---- Images --------------------------------------------------------------------------------

$blob = json_encode([$settings, $banner, $news, $pages, $sidebar, $footerLinks], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
preg_match_all('#(?:' . preg_quote($source, '#') . ')?/(uploads/[A-Za-z0-9_./%-]+\.(?:png|jpe?g|webp|gif|svg|avif|pdf))#i', $blob, $m);
$files = array_unique(array_merge($m[1], array_filter(array_merge(array_values($settings), [$banner['bg_image'] ?? null], array_column($news, 'image')), function ($v) {
    return is_string($v) && strpos($v, 'uploads/') === 0;
})));
$got = 0;
foreach ($files as $rel) {
    $rel  = rawurldecode($rel);
    $dest = $root . '/' . $rel;
    if (is_file($dest)) continue;
    $data = fetchPage($source . '/' . str_replace('%2F', '/', rawurlencode($rel)));
    if ($data === null) continue;
    if (!is_dir(dirname($dest))) mkdir(dirname($dest), 0775, true);
    file_put_contents($dest, $data);
    $got++;
}

printf("[mirror] from %s: %d settings, banner, %d news in %d categories, %d content pages (%s), %d side menu items, %d footer links, %d images downloaded\n",
    $source, count($settings), count($news), count($categories), count($pages), implode(', ', array_keys($pages)), count($sidebar), count($footerLinks), $got);
