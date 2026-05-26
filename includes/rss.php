<?php

/**
 * Extract a named field from a SimpleXML RSS/Atom item.
 *
 * Supports:
 *  - Regular element text: 'title', 'description', 'pubDate', etc.
 *  - Atom <link href="...">: field name 'link' checks href attribute first
 *  - Standard enclosure: 'enclosure' reads the url attribute
 *  - Media namespace images: 'media:content' or 'media:thumbnail' reads url attribute
 */
function extractRssField(\SimpleXMLElement $item, string $fieldName): ?string
{
    if ($fieldName === '') return null;

    // Atom <link href="..." rel="alternate"/> vs RSS <link>URL</link>
    if ($fieldName === 'link') {
        if (!isset($item->link)) return null;
        // Try all <link> elements for rel="alternate" or any href
        $found = null;
        foreach ($item->link as $linkEl) {
            $href = (string)($linkEl['href'] ?? '');
            if ($href === '') continue;
            $rel = (string)($linkEl['rel'] ?? 'alternate');
            if ($rel === 'alternate' || $rel === '') return $href;
            if ($found === null) $found = $href;
        }
        if ($found !== null) return $found;
        // RSS 2.0 plain-text <link>
        $text = trim((string)$item->link);
        return $text !== '' ? $text : null;
    }

    // <enclosure url="..." type="image/jpeg" length="..."/>
    if ($fieldName === 'enclosure') {
        if (!isset($item->enclosure)) return null;
        $url = (string)($item->enclosure['url'] ?? '');
        return $url !== '' ? $url : null;
    }

    // media:content or media:thumbnail (Yahoo Media RSS namespace)
    // XPath is more reliable than children() + isset() for namespaced elements in SimpleXML
    if (strpos($fieldName, 'media:') === 0) {
        $localName = substr($fieldName, 6);
        $mediaUris = [
            'http://search.yahoo.com/mrss/',
            'http://search.yahoo.com/mrss',
            'http://video.search.yahoo.com/mrss/',
            'http://video.search.yahoo.com/mrss',
        ];
        foreach ($mediaUris as $uri) {
            $item->registerXPathNamespace('media', $uri);
            $results = $item->xpath('media:' . $localName);
            if ($results && isset($results[0])) {
                $url = (string)($results[0]['url'] ?? '');
                return $url !== '' ? $url : null;
            }
        }
        return null;
    }

    // Regular text element
    if (!isset($item->$fieldName)) return null;
    $val = trim((string)$item->$fieldName);
    return $val !== '' ? $val : null;
}

/**
 * Fetch and cache items from a single RSS feed by its DB id.
 * If url_fr is set, fetches both URLs and stores items tagged by lang ('en'/'fr').
 * If url_fr is not set, stores items with lang='' (language-neutral).
 * Returns true on success, false on error.
 */
function fetchRssFeed(int $feedId): bool
{
    $db   = getDB();
    $stmt = $db->prepare(q("SELECT * FROM {rss_feeds} WHERE id = :id"));
    $stmt->execute([':id' => $feedId]);
    $feed = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$feed) return false;

    $hasLangUrls = !empty($feed['url_fr']);

    // When switching to language-specific URLs, remove old language-neutral cache rows
    if ($hasLangUrls) {
        $db->prepare(q("DELETE FROM {rss_cache} WHERE feed_id = :id AND lang = ''"))
           ->execute([':id' => $feedId]);
    }

    $urlsToFetch = $hasLangUrls
        ? ['en' => $feed['url'], 'fr' => $feed['url_fr']]
        : ['' => $feed['url']];

    $ctx = stream_context_create(['http' => [
        'timeout'       => 10,
        'user_agent'    => 'alteredcore.org/rss-fetcher (PHP ' . PHP_VERSION . ')',
        'ignore_errors' => true,
    ], 'https' => [
        'timeout'       => 10,
        'user_agent'    => 'alteredcore.org/rss-fetcher (PHP ' . PHP_VERSION . ')',
        'ignore_errors' => true,
    ]]);

    $insertStmt = $db->prepare(q(
        "INSERT INTO {rss_cache} (feed_id, lang, guid, guid_hash, title, link, description, image, published_at)
         VALUES (:feed_id, :lang, :guid, :guid_hash, :title, :link, :description, :image, :published_at)
         ON DUPLICATE KEY UPDATE
             title = VALUES(title), link = VALUES(link),
             description = VALUES(description), image = VALUES(image),
             published_at = VALUES(published_at), fetched_at = NOW()"
    ));

    $success = false;
    foreach ($urlsToFetch as $lang => $url) {
        $raw = @file_get_contents($url, false, $ctx);
        if ($raw === false || trim($raw) === '') continue;

        libxml_use_internal_errors(true);
        $xml = simplexml_load_string($raw);
        libxml_clear_errors();
        if ($xml === false) continue;

        // Collect items: RSS 2.0 uses channel/item, Atom uses entry at root
        $items = [];
        if (isset($xml->channel->item)) {
            foreach ($xml->channel->item as $item) $items[] = $item;
        } elseif (isset($xml->entry)) {
            foreach ($xml->entry as $item) $items[] = $item;
        }

        foreach ($items as $item) {
            // Use <guid> (RSS) or <id> (Atom) for deduplication, fall back to link
            $guid = trim((string)($item->guid ?? $item->id ?? ''));
            if ($guid === '') {
                $guid = extractRssField($item, $feed['map_link']) ?? '';
            }
            if ($guid === '') continue;

            $title       = extractRssField($item, $feed['map_title'])       ?? '';
            $link        = extractRssField($item, $feed['map_link'])        ?? '';
            $description = extractRssField($item, $feed['map_description']);
            $image       = $feed['map_image'] !== '' ? extractRssField($item, $feed['map_image']) : null;

            $dateStr = extractRssField($item, $feed['map_date']);
            if ($dateStr) {
                $ts = strtotime($dateStr);
                $publishedAt = $ts ? date('Y-m-d H:i:s', $ts) : date('Y-m-d H:i:s');
            } else {
                $publishedAt = date('Y-m-d H:i:s');
            }

            $insertStmt->execute([
                ':feed_id'      => $feedId,
                ':lang'         => $lang,
                ':guid'         => mb_substr($guid, 0, 2048),
                ':guid_hash'    => md5($guid),
                ':title'        => mb_substr($title, 0, 500),
                ':link'         => mb_substr($link, 0, 2048),
                ':description'  => $description !== null ? mb_substr(strip_tags($description), 0, 1000) : null,
                ':image'        => $image !== null ? mb_substr($image, 0, 2048) : null,
                ':published_at' => $publishedAt,
            ]);
        }
        $success = true;
    }

    if ($success) {
        $db->prepare(q("UPDATE {rss_feeds} SET last_fetched_at = NOW() WHERE id = :id"))
           ->execute([':id' => $feedId]);
    }

    return $success;
}

/**
 * Return all visible feeds whose cache is stale (never fetched or past refresh interval).
 */
function getRssFeedsNeedingRefresh(): array
{
    try {
        $db   = getDB();
        $stmt = $db->query(q(
            "SELECT id FROM {rss_feeds}
             WHERE is_visible = 1
               AND (last_fetched_at IS NULL
                    OR last_fetched_at < DATE_SUB(NOW(), INTERVAL refresh_minutes MINUTE))"
        ));
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (\Exception $e) {
        return [];
    }
}
