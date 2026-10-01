<?php
// Link preview of a deck (Discord, Slack, social networks…), shared by the site's deck page
// (plugins/core-altered-cards/pages/deck.php) and Re:Builder's (plugins/rebuilder/meta.php): both serve
// /pages/deck?id=…, and a link-preview bot gets one or the other depending on the « Beta Deckbuilder » cookie.
//
//   og:title       the deck's name ($pageOgTitle)
//   og:description hero · format ($pageDescription)
//   og:image       /api/deck-image?id=… — the decklist drawn by api/deck-image.php ($pageImage)
//   theme-color    the hero's faction: the embed's side bar on Discord ($pageThemeColor)
//   oEmbed         « by {author} », shown above the title ($pageOembedUrl → api/deck-oembed.php)
//
// A private deck keeps the site's default preview: bots fetch the page without a session.

/** Formats as named on the site (deck page, deck list). */
const DECK_PREVIEW_FORMATS = [
    'standard' => 'Standard All Uniques', 'frontier' => 'Frontier', 'nuc' => 'Standard No Unique', 'singleton' => 'Singleton',
    'singleton_nuc' => 'Singleton No Unique', 'sandbox' => 'Sandbox', 'test' => 'Test',
];

/** Faction colours: [accent (theme-color, as in altered.json), dark panel of the image]. */
const DECK_PREVIEW_FACTIONS = [
    'AX' => ['#8c432a', '#5e2a19'],
    'BR' => ['#c32637', '#7e1d26'],
    'LY' => ['#cf4171', '#7a2650'],
    'MU' => ['#3d6b42', '#1f4a2a'],
    'OR' => ['#0f6593', '#0f4766'],
    'YZ' => ['#764891', '#4b2e73'],
];
const DECK_PREVIEW_NEUTRAL = ['#5b5566', '#2e2935'];

/** A content language of the site (deck names, card images), English otherwise. */
function deckPreviewLang($lang): string {
    return in_array($lang, ['en', 'fr', 'es', 'it', 'de'], true) ? $lang : 'en';
}

/** Version of a deck in its image's URL and cache: changes with each edit. */
function deckPreviewVersion(array $deck): string {
    return substr(md5((string)($deck['updatedAt'] ?? $deck['createdAt'] ?? '')), 0, 10);
}

/** True for a deck id as the decks API issues them (UUID). */
function deckPreviewValidId(string $id): bool {
    return (bool)preg_match('#^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$#i', $id);
}

/**
 * GET /api/decks/{id} on the decks API, as a guest unless a token is given. Null when the deck is unknown,
 * private to the caller or the API is unreachable; $status tells them apart (HTTP status, 0 without an answer).
 */
function deckPreviewFetch(string $id, string $locale, ?string $token = null, int $timeout = 4, ?int &$status = null): ?array {
    $status = 0;
    if (!deckPreviewValidId($id) || !defined('DECKS_API_URL') || DECKS_API_URL === '') return null;
    $headers = ['Accept: application/json'];
    if ($token) $headers[] = 'Authorization: Bearer ' . $token;
    $ch = curl_init(rtrim(DECKS_API_URL, '/') . '/api/decks/' . rawurlencode($id) . '?' . http_build_query(['locale' => $locale]));
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_HTTPHEADER => $headers, CURLOPT_TIMEOUT => $timeout]);
    $body = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $status = $code;
    $deck = $code === 200 && is_string($body) ? json_decode($body, true) : null;
    return is_array($deck) ? $deck : null;
}

/** Faction code of the deck's hero (`ALT_CORE_B_LY_…` → `LY`), null without a hero. */
function deckPreviewFaction(array $deck): ?string {
    $parts = explode('_', (string)($deck['stats']['hero']['reference'] ?? ''));
    return isset($parts[3]) && array_key_exists($parts[3], DECK_PREVIEW_FACTIONS) ? $parts[3] : null;
}

/** [accent, panel] colours of the deck's faction. */
function deckPreviewColors(array $deck): array {
    $faction = deckPreviewFaction($deck);
    return $faction !== null ? DECK_PREVIEW_FACTIONS[$faction] : DECK_PREVIEW_NEUTRAL;
}

/** The author's username; the API sends `user` as an object, or as an empty list when it hides it. */
function deckPreviewAuthor(array $deck): ?string {
    $user = $deck['user'] ?? null;
    if (!is_array($user) || !isset($user['username'])) return null;
    $name = trim((string)$user['username']);
    return $name !== '' ? $name : null;
}

/** « Hero · Format », or what is known of it. */
function deckPreviewDescription(array $deck): string {
    $hero   = trim((string)($deck['stats']['hero']['name'] ?? ''));
    $format = DECK_PREVIEW_FORMATS[$deck['format'] ?? ''] ?? '';
    return implode(' · ', array_filter([$hero, $format], 'strlen'));
}

/** « par {author} » / « by {author} », null without an author. */
function deckPreviewByLine(array $deck, string $lang): ?string {
    $author = deckPreviewAuthor($deck);
    if ($author === null) return null;
    return ($lang === 'fr' ? 'par ' : 'by ') . $author;
}

/**
 * The page variables of a deck's link preview, for the header (includes/header.php). A private deck only gets
 * its title: bots can neither see it nor load its image.
 *
 *   ['title' => …, 'description' => …, 'image' => …, 'themeColor' => …, 'oembed' => …] = deckPreviewMeta($deck, $lang);
 */
function deckPreviewMeta(array $deck, string $lang): array {
    $id   = (string)($deck['id'] ?? '');
    $meta = ['title' => trim((string)($deck['name'] ?? '')), 'description' => null, 'image' => null, 'themeColor' => null, 'oembed' => null];
    if (empty($deck['isPublic']) || !deckPreviewValidId($id)) return $meta;

    $lang = deckPreviewLang($lang);
    $desc = deckPreviewDescription($deck);
    $meta['description'] = $desc !== '' ? $desc : null;
    // The version (last change) makes Discord and the image's own cache fetch a new image after an edit.
    $meta['image'] = BASE_URL . '/api/deck-image?' . http_build_query(['id' => $id, 'lang' => $lang, 'v' => deckPreviewVersion($deck)]);
    $meta['themeColor'] = deckPreviewColors($deck)[0];
    if (deckPreviewAuthor($deck) !== null) {
        $meta['oembed'] = BASE_URL . '/api/deck-oembed?' . http_build_query(['id' => $id, 'lang' => $lang]);
    }
    return $meta;
}
