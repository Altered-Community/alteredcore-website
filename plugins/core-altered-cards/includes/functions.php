<?php
// Card/collection helpers for the core-altered-cards plugin.
// Required by plugin pages and the collection-search API endpoint.
require_once __DIR__ . '/numeric-filter.php';
require_once dirname(__DIR__, 3) . '/includes/service-client.php';

function loadSearchSettings(): array {
    static $cfg = null;
    if ($cfg === null) {
        $file = dirname(__DIR__) . '/data/search_settings.json';
        if (!file_exists($file)) { $cfg = []; return []; }
        $raw = file_get_contents($file);
        if (strncmp($raw, "\xEF\xBB\xBF", 3) === 0) $raw = substr($raw, 3);
        $cfg = json_decode($raw, true) ?? [];
    }
    return $cfg;
}

function loadAlteredData(string $name): array {
    static $all = null;
    if ($all === null) {
        $file = dirname(__DIR__) . '/data/altered.json';
        if (!file_exists($file)) { $all = []; return []; }
        $raw = file_get_contents($file);
        // Strip UTF-8 BOM added by some Windows editors
        if (strncmp($raw, "\xEF\xBB\xBF", 3) === 0) $raw = substr($raw, 3);
        $all = json_decode($raw, true) ?? [];
    }
    return $all[$name] ?? [];
}

/**
 * Localized printed names of keyword codes written by uniques-search-api
 * (`[FLEETING]`, `[RESUPPLY_T]`, `[TOUGH_2]`...), keyed by UPPER_CODE => [lang => label].
 */
function loadKeywordCodes(): array {
    static $codes = null;
    if ($codes === null) {
        $file = dirname(__DIR__) . '/data/keyword_codes.json';
        if (!file_exists($file)) { $codes = []; return []; }
        $raw = file_get_contents($file);
        if (strncmp($raw, "\xEF\xBB\xBF", 3) === 0) $raw = substr($raw, 3);
        $decoded = json_decode($raw, true);
        $codes = is_array($decoded) ? $decoded : [];
    }
    return $codes;
}

/**
 * Expand `[KEYWORD_CODE]` placeholders from uniques-search-api texts into their localized
 * printed label (`[FLEETING]` -> `[Fugace]` in fr, `[Fleeting]` in en), with prefix fallback
 * for suffixed variants (`[DEFENDER_TKN_P]` -> `[Défenseur]`, `[TOUGH_7]` -> `[Coriace 7]`).
 */
function cacPrintKeywordCodes(string $text, string $locale = 'en'): string {
    if ($text === '' || strpos($text, '[') === false) return $text;
    $codes = loadKeywordCodes();
    if (empty($codes)) return $text;
    $short = strtolower(substr($locale, 0, 2));
    return (string)preg_replace_callback('/\[([A-Z][A-Z0-9_]*)\]/', function (array $m) use ($codes, $short): string {
        $code = $m[1];
        if (isset($codes[$code])) {
            $label = $codes[$code][$short] ?? $codes[$code]['en'] ?? reset($codes[$code]);
            return $label ? '[' . $label . ']' : $m[0];
        }
        $num = '';
        $base = $code;
        if (preg_match('/^(.+?)_(\d+)$/', $code, $nm)) {
            $base = $nm[1];
            $num  = $nm[2];
        }
        $parts = explode('_', $base);
        for ($i = count($parts); $i > 0; $i--) {
            $prefix = implode('_', array_slice($parts, 0, $i));
            $entry = $codes[$prefix] ?? null;
            $stripOne = false;
            if ($entry === null && isset($codes[$prefix . '_1'])) {
                $entry = $codes[$prefix . '_1'];
                $stripOne = true;
            }
            if ($entry !== null) {
                $label = $entry[$short] ?? $entry['en'] ?? reset($entry);
                if ($label) {
                    if ($stripOne) {
                        $label = (string)preg_replace('/[\s\x{00A0}]+1$/u', '', $label);
                    }
                    return '[' . ($num !== '' ? $label . ' ' . $num : $label) . ']';
                }
            }
        }
        return $m[0];
    }, $text);
}

/** Convert a CardV2 locale map (`en_US`, `fr_FR`, ...) to short codes (`en`, `fr`, ...). */
function cacToShortLocaleMap($map, bool $expandKeywords = false): array {
    if (!is_array($map)) return [];
    $out = [];
    foreach ($map as $key => $val) {
        if (!is_string($val) || $val === '') continue;
        $short = strtolower(substr((string)$key, 0, 2));
        if ($short === '') continue;
        $out[$short] = $expandKeywords ? cacPrintKeywordCodes($val, $short) : $val;
    }
    return $out;
}

/**
 * Adapt a CardV2 object from uniques-search-api (`POST /api/v2/search` or `GET /api/v2/card/{ref}`)
 * to the legacy cards-API `card:read` shape expected by favorites-search, card-search.js, and
 * deck-preview/unique-card.php.
 */
function cacAdaptV2Card(array $c): array {
    $ref = (string)($c['reference'] ?? '');
    $rarityRef = (string)($c['rarity']['reference'] ?? 'UNIQUE');
    $cardTypeRef = (string)($c['cardType']['reference'] ?? 'CHARACTER');
    $cardTypeName = !empty($c['cardType']['name'])
        ? cacToShortLocaleMap($c['cardType']['name'])
        : ($cardTypeRef === 'CHARACTER'
            ? ['en' => 'Character', 'fr' => 'Personnage', 'de' => 'Charakter', 'es' => 'Personaje', 'it' => 'Personaggio']
            : []);

    $subTypes = [];
    foreach (is_array($c['cardSubTypes'] ?? null) ? $c['cardSubTypes'] : [] as $st) {
        if (!is_array($st)) continue;
        $subTypes[] = [
            'reference' => (string)($st['reference'] ?? ''),
            'name'      => cacToShortLocaleMap($st['name'] ?? []),
        ];
    }

    $artists = [];
    if (!empty($c['artist']) && is_string($c['artist'])) {
        $artists[] = ['name' => $c['artist']];
    }

    $legalFormats = is_array($c['legalFormats'] ?? null) ? array_values($c['legalFormats']) : [];

    $out = [
        'reference'                 => $ref,
        'name'                      => cacToShortLocaleMap($c['name'] ?? []),
        'faction'                   => is_array($c['faction'] ?? null) ? $c['faction'] : null,
        'rarity'                    => ['reference' => $rarityRef, 'name' => (string)($c['rarity']['name'] ?? ucfirst(strtolower($rarityRef)))],
        'cardType'                  => ['reference' => $cardTypeRef, 'name' => $cardTypeName],
        'cardSubTypes'              => $subTypes,
        'set'                       => is_array($c['set'] ?? null) ? $c['set'] : null,
        'mainCost'                  => $c['mainCost'] ?? null,
        'recallCost'                => $c['recallCost'] ?? null,
        'forestPower'               => $c['forestPower'] ?? null,
        'mountainPower'             => $c['mountainPower'] ?? null,
        'oceanPower'                => $c['oceanPower'] ?? null,
        'mainEffect'                => cacToShortLocaleMap($c['mainEffect'] ?? [], true),
        'echoEffect'                => cacToShortLocaleMap($c['echoEffect'] ?? [], true),
        'collectorNumberFormatedId' => (string)($c['collectorNumber'] ?? ''),
        'artists'                   => $artists,
        'isBanned'                  => !empty($c['isBanned']),
        'isErrated'                 => !empty($c['isErrated']),
        'isSuspended'               => !empty($c['isSuspended']),
        'legalFormats'              => $legalFormats,
    ];
    if (!empty($legalFormats)) {
        $out['gameplayFormat'] = array_map('strtoupper', $legalFormats);
    }
    return $out;
}

function deckApiToken(): ?string {
    $userId = kcCurrentUserId();
    if (!$userId) return null;
    require_once dirname(dirname(dirname(__DIR__))) . '/includes/func.keycloak.php';
    $token = kc_get_access_token($userId);
    return $token ?: null;
}

/**
 * Deletes a deck of the signed-in player from the decks API: the HTTP status (0 when unreachable). The site keeps
 * nothing else about a deck: its art choices live in the deck itself (`altArtOverrides`).
 */
function cacDeckApiDelete(string $deckId, string $token): int
{
    $url = DECKS_API_URL . '/api/decks/' . rawurlencode($deckId);
    $res = acServiceRequest(new AcHttpRequest('DELETE', $url, ['Accept: application/json'], null, 15, 5, false, null, $token, false));
    return $res->status;
}

/** Archives (isDraft: true, hidden in BGA) or unarchives a deck; returns the HTTP status. */
function cacDeckApiSetArchived(string $deckId, bool $archived, string $token): int
{
    $url = DECKS_API_URL . '/api/decks/' . rawurlencode($deckId);
    $res = acServiceRequest(AcHttpRequest::json('PATCH', $url, ['isDraft' => $archived], null, 'application/merge-patch+json', [], 15, $token));
    return $res->status;
}

/** @return array{upvoteCount: int, hasUpvoted: bool}|null */
function cacDeckApiUpvote(string $deckId, string $token): ?array
{
    $url = DECKS_API_URL . '/api/decks/' . rawurlencode($deckId) . '/upvote';
    $res = acServiceRequest(AcHttpRequest::json('POST', $url, '{}', null, 'application/json', [], 15, $token));
    if (!$res->isOk()) {
        return null;
    }
    $data = $res->json();
    if (!is_array($data)) {
        return null;
    }

    return [
        'upvoteCount' => (int) ($data['upvoteCount'] ?? 0),
        'hasUpvoted'  => !empty($data['hasUpvoted']),
    ];
}

/**
 * Authenticated request returning [statusCode, rawBody] and retrying once on upstream 401.
 *
 * @return array{0:int,1:?string}
 */
function collApiRequestRaw(string $apiUrl, string $method, string $path, int $userId, $body = null, string $contentType = 'application/json'): array {
    $res = acServiceRequest(AcHttpRequest::json($method, $apiUrl . $path, $body, $userId, $contentType));
    return [$res->status, $res->body];
}

function collApiRequest(string $apiUrl, string $method, string $path, int $userId, $body = null, string $contentType = 'application/json') {
    [$code, $raw] = collApiRequestRaw($apiUrl, $method, $path, $userId, $body, $contentType);
    if ($code === 0 || $code >= 400) return false;
    if ($code === 204) return true;
    if ($raw === null || $raw === '') return false;
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : false;
}

/**
 * Fetch several Unique and/or non-Unique cards by reference via POST UNIQUES_API_URL/api/v2/search
 * in chunks of 200, adapted to the legacy card:read array shape. Returns [] when UNIQUES_API_URL
 * is not configured or unreachable.
 *
 * @param string[] $refs
 */
function cacUniquesApiBatch(array $refs): array {
    if (!defined('UNIQUES_API_URL') || UNIQUES_API_URL === '') return [];
    $url = rtrim(UNIQUES_API_URL, '/') . '/api/v2/search';
    $out = [];
    foreach (array_chunk($refs, 200) as $chunk) {
        $parts = [];
        foreach ($chunk as $r) {
            $parts[] = 'ref[]=' . rawurlencode($r);
        }
        $parts[] = 'limit=' . count($chunk);
        $res = acServiceRequest(new AcHttpRequest(
            'POST',
            $url,
            ['Accept: application/json', 'Content-Type: application/x-www-form-urlencoded'],
            implode('&', $parts),
            15
        ));
        if (!$res->isOk()) return [];
        $decoded = $res->json();
        if (!is_array($decoded) || !isset($decoded['cards']) || !is_array($decoded['cards'])) return [];
        foreach ($decoded['cards'] as $card) {
            if (is_array($card) && !empty($card['reference'])) {
                $out[] = cacAdaptV2Card($card);
            }
        }
    }
    return $out;
}

/**
 * Fetch several cards by reference in ONE public call (no auth).
 * Uses UNIQUES_API_URL (POST /api/v2/search, hydrating both Uniques and non-Uniques) first,
 * falling back to legacy POST CARDS_API_URL/api/cards/batch for any missing refs or when
 * UNIQUES_API_URL is unset/unreachable.
 *
 * @param string[] $refs    Card references
 * @param string   $locale  'en'|'fr'
 */
function cacCardsApiBatch(array $refs, string $locale = 'en'): array {
    $refs = array_values(array_unique(array_filter($refs, function($r) { return is_string($r) && $r !== ''; })));
    if (empty($refs)) return [];

    $found = cacUniquesApiBatch($refs);
    $seen  = [];
    foreach ($found as $card) {
        if (!empty($card['reference'])) $seen[$card['reference']] = true;
    }
    $missing = array_values(array_filter($refs, function ($r) use ($seen) { return !isset($seen[$r]); }));
    if (empty($missing)) return $found;

    if (!defined('CARDS_API_URL') || CARDS_API_URL === '') return $found;

    $url = rtrim(CARDS_API_URL, '/') . '/api/cards/batch?locale=' . rawurlencode($locale);
    $res = acServiceRequest(AcHttpRequest::json('POST', $url, ['references' => $missing]));
    if (!$res->isOk()) return $found;
    $decoded = $res->json();
    if (!is_array($decoded)) return $found;
    // The batch endpoint returns a flat array; tolerate an enveloped {member:[...]} too.
    $legacy = (isset($decoded['member']) && is_array($decoded['member'])) ? $decoded['member'] : $decoded;
    return array_merge($found, $legacy);
}

/**
 * Returns the user's collection, session-cached for 5 minutes.
 *
 * @param string $apiUrl  Collection API base URL
 * @param int    $userId
 * @return array{collection: array<string,int>, entries: array<string,int>}
 */
function collGetUserCollection(string $apiUrl, int $userId): array {
    if (session_status() === PHP_SESSION_NONE) session_start();

    $cacheKey = '_coll_' . $userId;
    $tsKey    = '_coll_ts_' . $userId;

    if (!empty($_SESSION[$cacheKey]) && isset($_SESSION[$tsKey]) && (time() - (int)$_SESSION[$tsKey]) < 300) {
        return $_SESSION[$cacheKey];
    }

    $collection = [];
    $entries    = [];

    $raw = collApiRequest($apiUrl, 'GET', '/api/collection', $userId);
    if (is_array($raw)) {
        foreach ($raw as $entry) {
            $ref = $entry['cardReference'] ?? '';
            $qty = (int)($entry['quantity'] ?? 0);
            $id  = (int)($entry['id'] ?? 0);
            if ($ref && $qty > 0) {
                $collection[$ref] = $qty;
                $entries[$ref]    = $id;
            }
        }
    }

    $result = ['collection' => $collection, 'entries' => $entries];
    $_SESSION[$cacheKey] = $result;
    $_SESSION[$tsKey]    = time();
    return $result;
}

/**
 * Sets the quantity of one card in the user's physical collection (0 removes it), then drops the session cache of
 * collGetUserCollection(). `$entryId`: the collection line of the card, 0 when it has none yet.
 * Returns ['ok' => bool, 'ref' => string, 'qty' => int, 'entry_id' => int].
 */
function collSetQuantity(string $apiUrl, int $userId, string $ref, int $qty, int $entryId): array {
    $qty = max(0, min(99, $qty));
    if ($entryId > 0 && $qty === 0) {
        $r      = collApiRequest($apiUrl, 'DELETE', '/api/collection/' . $entryId, $userId);
        $result = ['ok' => $r !== false, 'ref' => $ref, 'qty' => 0, 'entry_id' => 0];
    } elseif ($entryId > 0) {
        $r      = collApiRequest($apiUrl, 'PATCH', '/api/collection/' . $entryId, $userId,
            ['quantity' => $qty], 'application/merge-patch+json');
        $result = ['ok' => is_array($r), 'ref' => $ref, 'qty' => $qty, 'entry_id' => $entryId];
    } elseif ($qty === 0) {
        $result = ['ok' => true, 'ref' => $ref, 'qty' => 0, 'entry_id' => 0];
    } else {
        $r      = collApiRequest($apiUrl, 'POST', '/api/collection', $userId,
            ['cardReference' => $ref, 'quantity' => $qty, 'isFoil' => false]);
        $result = is_array($r)
            ? ['ok' => true, 'ref' => $ref, 'qty' => $qty, 'entry_id' => (int)($r['id'] ?? 0)]
            : ['ok' => false, 'ref' => $ref, 'qty' => $qty, 'entry_id' => 0];
    }
    if (session_status() === PHP_SESSION_NONE) session_start();
    unset($_SESSION['_coll_' . $userId], $_SESSION['_coll_ts_' . $userId]);
    return $result;
}

/**
 * Formats API violation objects into a human-readable string.
 * Used when an API returns a 422 response with a "violations" array.
 */
function formatApiViolations(array $violations): string {
    return AcHttpResponse::formatViolations($violations);
}

/**
 * The {cardReference, quantity} lines of $lines, lines without a reference skipped, quantities as int (at least 1).
 */
function cacDeckLines(array $lines): array
{
    $out = [];
    foreach ($lines as $line) {
        if (!is_array($line) || empty($line['cardReference']) || !is_string($line['cardReference'])) {
            continue;
        }
        $out[] = [
            'cardReference' => $line['cardReference'],
            'quantity'      => max(1, (int)($line['quantity'] ?? 1)),
        ];
    }
    return $out;
}

/**
 * A deck's content as the decks API stores it, for a write that must keep its art choices: the canonical lines
 * (`canonicalCards`, one canonical reference per gameplay card) and `altArtOverrides` (the deck's own prints and
 * tokens) when the API sent them, else the concrete prints (`cards`, or `deckCards`) of an older API, which the API
 * turns back into canonical lines + overrides on write.
 *
 * @return array{deckCards: list<array{cardReference: string, quantity: int}>, altArtOverrides: ?array}
 */
function cacDeckContentForWrite(array $deck): array
{
    $canonical = is_array($deck['canonicalCards'] ?? null) ? cacDeckLines($deck['canonicalCards']) : [];
    if ($canonical) {
        $overrides = is_array($deck['altArtOverrides'] ?? null) ? $deck['altArtOverrides'] : null;
        if ($overrides !== null) {
            // A JSON object once decoded: an empty `cards` map must go back as {} (json_encode would send []).
            $cards  = is_array($overrides['cards'] ?? null) ? $overrides['cards'] : [];
            $tokens = is_array($overrides['tokens'] ?? null) ? array_values($overrides['tokens']) : [];
            $overrides = ['cards' => $cards ?: new stdClass(), 'tokens' => $tokens];
        }
        return ['deckCards' => $canonical, 'altArtOverrides' => $overrides];
    }
    $prints = cacDeckLines(is_array($deck['cards'] ?? null) ? $deck['cards'] : []);
    if (!$prints) {
        $prints = cacDeckLines(is_array($deck['deckCards'] ?? null) ? $deck['deckCards'] : []);
    }
    return ['deckCards' => $prints, 'altArtOverrides' => null];
}

/**
 * Build the POST /api/decks payload for duplicating an existing deck.
 *
 * Copies every card (including the hero) with the source's art choices (cacDeckContentForWrite()), resets visibility
 * to private, mirrors the source draft flag (falling back to sandbox => draft), and only carries a description when
 * the source has a non-empty one. The new owner's global alt-art preferences are not written into the list: the
 * decks API keeps a deck's own choices in `altArtOverrides`, and AlteredOwnership applies the global preferences to
 * the other cards when the deck is shown.
 *
 * @param array  $sourceDeck Deck as returned by GET /api/decks/{id}.
 * @param string $newName    Desired name for the copy (already localized/suffixed by the caller).
 * @return array Payload ready for json_encode().
 */
function cacBuildDuplicateDeckPayload(array $sourceDeck, string $newName): array
{
    $content = cacDeckContentForWrite($sourceDeck);
    $format  = $sourceDeck['format'] ?? 'standard';
    $newName = trim($newName);

    $payload = [
        'name'      => $newName !== '' ? $newName : (string)($sourceDeck['name'] ?? 'Deck'),
        'format'    => $format,
        'isPublic'  => false,
        'isDraft'   => false, // a copy is a new, active deck (isDraft = archived)
        'deckCards' => $content['deckCards'],
    ];
    if ($content['altArtOverrides'] !== null) {
        $payload['altArtOverrides'] = $content['altArtOverrides'];
    }

    $description = trim((string)($sourceDeck['description'] ?? ''));
    if ($description !== '') {
        $payload['description'] = $description;
    }

    return $payload;
}

/**
 * The PATCH /api/decks/{id} body that adds one copy of $cardRef to $deck (as returned by GET /api/decks/{id}): +1 on
 * the line of that reference, or a new line. The deck's own art choices (`altArtOverrides`) are sent back unchanged so
 * the API keeps them (a sent `deckCards` is the whole truth for cards and prints). A print (alt art, promo) of a card
 * already in the deck becomes a new line, which the API stores as one more copy of the canonical card in that print.
 */
function cacDeckAddCardPatch(array $deck, string $cardRef): array
{
    $content   = cacDeckContentForWrite($deck);
    $deckCards = $content['deckCards'];
    $found     = false;
    foreach ($deckCards as $i => $line) {
        if ($line['cardReference'] === $cardRef) {
            $deckCards[$i]['quantity']++;
            $found = true;
            break;
        }
    }
    if (!$found) {
        $deckCards[] = ['cardReference' => $cardRef, 'quantity' => 1];
    }
    $patch = ['deckCards' => $deckCards];
    if ($content['altArtOverrides'] !== null) {
        $patch['altArtOverrides'] = $content['altArtOverrides'];
    }
    return $patch;
}

/**
 * What a page shows of a deck's legality, from the decks API's verdict only (never computed here): `legal` when the
 * API says so; `illegal` when it says not and gives a reason; `none` otherwise (a draft, an unknown format or a deck
 * not validated yet: the API sends `legal: false` without errors). `messages` are the API's translated error messages
 * (`errors[].message`, in the request's `?locale=`; `formatErrors` from an older API); `rules` the failing
 * `legalityDetail` keys, shown for a deck without messages.
 *
 * @return array{status: string, messages: list<string>, rules: list<string>}
 */
function cacDeckLegalityView(array $deck): array
{
    $messages = [];
    foreach (is_array($deck['errors'] ?? null) ? $deck['errors'] : [] as $error) {
        $msg = is_array($error) ? trim((string)($error['message'] ?? '')) : '';
        if ($msg !== '') $messages[] = $msg;
    }
    if (!$messages) {
        foreach (is_array($deck['formatErrors'] ?? null) ? $deck['formatErrors'] : [] as $msg) {
            if (is_string($msg) && trim($msg) !== '') $messages[] = trim($msg);
        }
    }
    $rules = [];
    foreach (is_array($deck['legalityDetail'] ?? null) ? $deck['legalityDetail'] : [] as $rule => $ok) {
        if ($rule !== 'global' && $ok === false) $rules[] = (string)$rule;
    }
    $legal  = $deck['legal'] ?? null;
    $status = 'none';
    if ($legal === true) {
        $status = 'legal';
    } elseif ($legal === false && ($messages || $rules)) {
        $status = 'illegal';
    }
    return ['status' => $status, 'messages' => $messages, 'rules' => $rules];
}

/** The deck owner's pseudo, which the decks API gives on public decks (`owner.pseudo`), or null. */
function cacDeckOwnerPseudo(array $deck): ?string
{
    $pseudo = is_array($deck['owner'] ?? null) ? ($deck['owner']['pseudo'] ?? null) : null;
    if (!is_string($pseudo)) return null;
    $pseudo = trim($pseudo);
    return $pseudo !== '' ? $pseudo : null;
}

/**
 * The decks API's format rules (GET /api/formats: limits, sets, banned/suspended cards, Unique allowlist), cached for
 * 10 minutes in the system temp directory; the last good copy is used when the API fails. Null when never fetched.
 */
function cacFetchDeckApiFormats(): ?array
{
    if (!defined('DECKS_API_URL') || !DECKS_API_URL) return null;
    $url    = rtrim(DECKS_API_URL, '/') . '/api/formats';
    $cache  = sys_get_temp_dir() . '/ac-deckapi-formats-' . md5($url) . '.json';
    $cached = null;
    if (is_file($cache)) {
        $cached = json_decode((string)@file_get_contents($cache), true);
        if (is_array($cached) && (time() - (int)@filemtime($cache)) < 600) return $cached;
    }
    // After a failure, wait a minute before asking again: a card page must not wait on a down API every time.
    $failMark = $cache . '.fail';
    if (is_file($failMark) && (time() - (int)@filemtime($failMark)) < 60) {
        return is_array($cached) ? $cached : null;
    }
    $res = acServiceRequest(new AcHttpRequest('GET', $url, ['Accept: application/json'], null, 5, 3));
    $data = $res->status === 200 ? $res->json() : null;
    if (is_array($data) && array_is_list($data)) {
        @file_put_contents($cache, (string)$res->body, LOCK_EX);
        @unlink($failMark);
        return $data;
    }
    @touch($failMark);
    return is_array($cached) ? $cached : null;
}

/**
 * Whether card $ref can be played in $format (one entry of GET /api/formats), from the rules the decks API publishes:
 * true, false, or null when the card alone can't tell. The API stays the judge of a deck (it validates every save);
 * this only labels a card page.
 * - banned / suspended: the format's lists (entries: a reference, a family `BR_06`, a family + rarity `OR_27_R1`);
 * - a Unique: never in a format without Uniques; only an allowlisted print where the format has an allowlist;
 * - sets: a card printed in an allowed set is fine. Otherwise null: a reprint in an allowed set makes the card legal,
 *   and only the API knows the reprints. A format without an allowed set list (sealed: the player's pool) is null too.
 */
function cacCardFormatVerdict(string $ref, array $format): ?bool
{
    $p = explode('_', strtoupper(trim($ref)));
    if (count($p) < 6 || $p[0] !== 'ALT' || !ctype_digit($p[4])) return null;
    $set     = $p[1];
    $rarity  = $p[5] === 'R' ? 'R1' : $p[5];
    $family  = $p[3] . '_' . str_pad((string)(int)$p[4], 2, '0', STR_PAD_LEFT);
    $full    = implode('_', $p);
    $booster = implode('_', array_replace($p, [2 => 'B']));
    $matches = function ($entries) use ($full, $booster, $family, $rarity): bool {
        foreach (is_array($entries) ? $entries : [] as $entry) {
            if (!is_string($entry)) continue;
            $e = strtoupper(trim($entry));
            if (str_starts_with($e, 'ALT_')) {
                if ($e === $full || $e === $booster) return true;
                continue;
            }
            $ep = explode('_', $e);
            if (count($ep) < 2 || count($ep) > 3 || !ctype_digit($ep[1])) continue;
            if ($ep[0] . '_' . str_pad((string)(int)$ep[1], 2, '0', STR_PAD_LEFT) !== $family) continue;
            if (count($ep) === 2 || ($ep[2] === 'R' ? 'R1' : $ep[2]) === $rarity) return true;
        }
        return false;
    };
    if (empty($format['allowBanned']) && $matches($format['bannedCards'] ?? [])) return false;
    if (empty($format['allowSuspended']) && $matches($format['suspendedCards'] ?? [])) return false;
    if ($rarity === 'U') {
        if (($format['limits']['unique'] ?? null) === 0 && empty($format['uniqueLimitsByHero'])) return false;
        $allowlist = $format['uniqueAllowlist'] ?? null;
        if (is_array($allowlist) && !in_array($full, array_map('strtoupper', array_filter($allowlist, 'is_string')), true)) {
            return false;
        }
    }
    $allowed   = is_array($format['sets']['allowed'] ?? null) ? $format['sets']['allowed'] : [];
    $forbidden = is_array($format['sets']['forbidden'] ?? null) ? $format['sets']['forbidden'] : [];
    if (!$allowed || in_array($set, $forbidden, true) || !in_array($set, $allowed, true)) return null;
    return true;
}

/**
 * cacCardFormatVerdict() for every visible format of $apiFormats (GET /api/formats), keyed by lower-case format code.
 *
 * @return array<string, ?bool>
 */
function cacCardFormatVerdicts(string $ref, array $apiFormats): array
{
    $out = [];
    foreach ($apiFormats as $format) {
        if (!is_array($format) || !is_string($format['code'] ?? null) || !empty($format['hidden'])) continue;
        $out[strtolower($format['code'])] = cacCardFormatVerdict($ref, $format);
    }
    return $out;
}

/**
 * The Collector Booster's individually-serialized hero prints (ALT_DUSTERCB_P_<FACTION>_
 * <NUM>_<RARITY>_<001-030|XXX>, 6 heroes x 31 serials = 186 refs) have no per-serial
 * portrait crop generated under /cards/hero/ -- every one of them is a numbered copy of
 * the set's regular DUSTER alt-art hero print, so callers building a hero portrait URL
 * resolve through this first instead of requesting (and needing) 186 distinct images.
 */
function cacHeroPortraitRef(string $ref): string {
    $p = explode('_', $ref);
    if (($p[1] ?? '') === 'DUSTERCB' && count($p) > 6) {
        return 'ALT_DUSTER_A_' . ($p[3] ?? '') . '_' . ($p[4] ?? '') . '_' . ($p[5] ?? '');
    }
    return $ref;
}

/**
 * Execute multiple collection API requests in parallel using curl_multi.
 *
 * @param string $apiUrl  Base URL (no trailing slash)
 * @param array  $reqs    Each item: ['method'=>'...', 'path'=>'...', 'body'=>[...], 'contentType'=>'...']
 * @param int    $userId  Used to retrieve the Keycloak access token
 * @return array  Results indexed by request order (same format as collApiRequest)
 */
function collApiMultiRequest(string $apiUrl, array $reqs, int $userId): array {
    if (empty($reqs)) return [];
    $httpReqs = [];
    foreach ($reqs as $i => $req) {
        $httpReqs[$i] = AcHttpRequest::json(
            (string)$req['method'],
            $apiUrl . $req['path'],
            $req['body'] ?? null,
            null,
            (string)($req['contentType'] ?? 'application/json'),
            [],
            30
        );
    }
    $responses = acServiceMulti($httpReqs, $userId);
    $results   = [];
    foreach ($responses as $i => $res) {
        if ($res->isUnreachable() || $res->status >= 400) {
            $results[$i] = false;
            continue;
        }
        if ($res->status === 204) {
            $results[$i] = true;
            continue;
        }
        $decoded = $res->json();
        $results[$i] = is_array($decoded) ? $decoded : false;
    }
    return $results;
}

/**
 * Starter deck contest entries from bundled JSON (no Decks API).
 *
 * @return array<int, array<string, mixed>>
 */
function cacLoadContestDecksFromJsonFile(string $path): array
{
    $data = json_decode(file_get_contents($path), true);
    $decks = [];
    foreach ($data['decks'] as $entry) {
        $stats = $entry['stats'];
        $stats['totalCards'] = 39;
        $decks[] = [
            'id'       => $entry['id'],
            'name'     => $entry['name'],
            'winner'   => !empty($entry['winner']),
            'format'   => 'nuc',
            'isPublic' => true,
            'isDraft'  => false,
            'legal'    => true,
            'stats'    => $stats,
        ];
    }

    return $decks;
}

/**
 * Build the pool of drawable cards for the "starting hand" tester.
 *
 * This does NOT draw a hand — it only prepares the source data the client-side
 * tester draws from. The actual shuffle + pick-6 happens in JS. This returns the
 * deck's cards with HERO excluded (the hero is never drawn), each with its
 * quantity preserved, so the JS can expand the pool (each card ×qty) and shuffle.
 *
 * Mirrors the decklist's name resolution (localized-array -> $lang -> 'en' ->
 * ref; a plain-string name is kept as-is). qty/mainCost are coerced to ints.
 *
 * Returns a list of ['ref','name','qty','type','mainCost']. The caller adds the
 * presentation-only 'img'/'unique' fields — those depend on page-level helpers
 * and the CDN_URL constant, so they stay out of this pure, testable function.
 *
 * @param array  $cards The deck's `cards` array (each an assoc array from the API).
 * @param string $lang  Card language for name resolution ('en'|'fr').
 * @return array<int,array{ref:string,name:string,qty:int,type:string,mainCost:int}>
 */
function getDeckStartingHandPool(array $cards, string $lang): array
{
    $out = [];
    foreach ($cards as $card) {
        $type = $card['cardTypeReference'] ?? 'OTHER';
        if ($type === 'HERO') continue;
        $ref     = $card['cardReference'] ?? '';
        $rawName = $card['name'] ?? null;
        $name    = is_array($rawName)
            ? (($rawName[$lang] ?? '') ?: ($rawName['en'] ?? $ref))
            : (($rawName !== null && $rawName !== '') ? $rawName : $ref);
        $out[] = [
            'ref'        => $ref,
            'name'       => $name,
            'qty'        => (int)($card['quantity'] ?? 1),
            'type'       => $type,
            'mainCost'   => (int)($card['mainCost'] ?? 0),
            'recallCost' => (int)($card['recallCost'] ?? 0),
        ];
    }
    return $out;
}

/**
 * i18n for the shared "Starting hand" stats + draw-odds block (rendered by
 * pages/_starting-hand-stats.php on both the deck detail page and the deck builder).
 * Single source so the two pages never drift. Returns the resolved strings for $lang.
 */
function cacStartingHandStatsTxt(string $lang): array
{
    $t = [
        'en' => [
            'ho_calc'          => 'Calculators',
            'ho_deck'          => 'Deck',
            'ho_drawn'         => 'Drawn',
            'ho_types_label'   => 'Average composition',
            'ohs_comp_sub'     => 'Average card types in a 6-card opening hand',
            'ho_pick'          => 'Pick…',
            'ho_group_a'       => 'A', 'ho_group_b' => 'B',
            'ho_ratio'         => '≈ {x} in {y} hands',
            'ho_ratio_generic' => '≈ {x} chances in {y}',
            'nc_atleast'       => 'Chances of having',
            'nc_atleast_combo' => 'Chances of having at least one of',
            'nc_among'         => 'cards among',
            'nc_among_combo'   => 'among',
            'nc_draw_a'        => 'by drawing',
            'nc_draw_b'        => 'cards',
            'nc_both'          => 'Both',
            'ohs_title'        => 'Opening hand stats',
            'ohs_detail'       => 'See details',
            'ohs_card'         => 'card', 'ohs_cards' => 'cards',
            'ohs_play'         => 'play', 'ohs_plays' => 'plays',
            'ohs_b1_title'     => 'Mana used on day 1',
            'ohs_b1_sub'       => 'How much of your 3 mana you can spend on the first day',
            'ohs_b1_h1'        => 'Optimal start',
            'ohs_b1_h1_note'   => 'of games let you spend all 3 mana',
            'ohs_b1_h2'        => 'Dead hand',
            'ohs_b1_h2_note'   => 'no play possible',
            'ohs_b1_detail'    => 'Breakdown by spendable mana',
            'ohs_b2_title'     => 'Expensive cards',
            'ohs_b2_sub'       => 'Cards at 4 mana or more, unplayable on the first day',
            'ohs_b2_note'      => 'of hands hold 3 expensive cards or more — fewer options for your initial mana',
            'ohs_b2_detail'    => 'Number of cards at 4 mana or more in the opening hand',
            'ohs_b3_title'     => 'Reactivity (after you)',
            'ohs_b3_sub'       => 'Chaining several plays on day 1: act, watch, then respond',
            'ohs_b3_note'      => 'of hands let you chain 2 plays or more on day 1 (combined cost 3 or less)',
            'ohs_b3_detail'    => 'Number of possible plays on day 1',
            'ohs_b4_title'     => 'Contestable Expeditions on day 1',
            'ohs_b4_sub'       => 'Characters you can deploy on the first day',
            'ohs_b4_h1'        => 'Both Expeditions',
            'ohs_b4_h1_note'   => 'you can deploy 2 or 3 characters on day 1',
            'ohs_b4_h2'        => 'No Expedition',
            'ohs_b4_h2_note'   => 'no character playable on day 1',
            'ohs_b4_detail'    => 'Number of contestable Expeditions on day 1',
            'ohs_b4_none'      => 'No character',
            'ohs_b4_one'       => '1 Expedition',
            'ohs_b4_both'      => 'Both Expeditions',
            // playtest sandbox
            'hand_empty'           => 'No cards to draw.',
            'hand_characters'      => 'Characters',
            'hand_spells'          => 'Spells',
            'hand_permanents'      => 'Permanents',
            'hand_avg_cost'        => 'Avg. hand cost',
            'pt_restart'           => 'New hand',
            'pt_toggle_playground' => 'Game mode',
            'pt_setup_hint'        => 'Select 3 cards to set as mana',
            'pt_commit_mana'       => 'Put in mana',
            'pt_mana'              => 'Mana',
            'pt_mana_list'         => 'Cards in mana',
            'pt_empty_zone'        => 'Empty',
            'pt_deck'              => 'Deck',
            'pt_draw'              => 'Draw',
            'pt_to_mana'           => 'To mana',
            'pt_play_board'        => 'Play to board',
            'pt_cancel'            => 'Cancel',
            'pt_zoom'              => 'Zoom',
            'pt_board'             => 'In play (Expeditions, Reserve, Landmarks)',
            'pt_discard'           => 'Discard',
            'pt_board_more'        => 'See all',
            'pt_return_hand'       => 'Return to hand',
            'pt_board_list'        => 'Board cards',
            'pt_discard_list'      => 'Discard pile',
        ],
        'fr' => [
            'ho_calc'          => 'Calculateurs',
            'ho_deck'          => 'Deck',
            'ho_drawn'         => 'Piochées',
            'ho_types_label'   => 'Composition moyenne',
            'ohs_comp_sub'     => 'Types de cartes moyens dans une main d\'ouverture de 6 cartes',
            'ho_pick'          => 'Choisir…',
            'ho_group_a'       => 'A', 'ho_group_b' => 'B',
            'ho_ratio'         => '≈ {x} sur {y} mains',
            'ho_ratio_generic' => '≈ {x} chances sur {y}',
            'nc_atleast'       => 'Chances d\'avoir',
            'nc_atleast_combo' => 'Chances d\'avoir au moins une de',
            'nc_among'         => 'cartes parmi',
            'nc_among_combo'   => 'parmi',
            'nc_draw_a'        => 'en piochant',
            'nc_draw_b'        => 'cartes',
            'nc_both'          => 'A + B',
            'ohs_title'        => 'Stats de main de départ',
            'ohs_detail'       => 'Voir le détail',
            'ohs_card'         => 'carte', 'ohs_cards' => 'cartes',
            'ohs_play'         => 'play', 'ohs_plays' => 'plays',
            'ohs_b1_title'     => 'Mana utilisé au jour 1',
            'ohs_b1_sub'       => 'Combien de tes 3 mana tu peux dépenser dès le premier jour',
            'ohs_b1_h1'        => 'Démarrage optimal',
            'ohs_b1_h1_note'   => 'des parties te laissent dépenser tes 3 mana',
            'ohs_b1_h2'        => 'Main morte',
            'ohs_b1_h2_note'   => 'aucun jeu possible',
            'ohs_b1_detail'    => 'Répartition par mana consommable',
            'ohs_b2_title'     => 'Cartes chères',
            'ohs_b2_sub'       => 'Cartes à 4 mana ou plus, injouables dès le premier jour',
            'ohs_b2_note'      => 'des mains contiennent 3 cartes chères ou plus — réduit tes choix pour la mise en mana initiale',
            'ohs_b2_detail'    => 'Nombre de cartes à 4 mana ou plus dans la main de départ',
            'ohs_b3_title'     => 'Réactivité (après-vous)',
            'ohs_b3_sub'       => 'Pouvoir enchaîner plusieurs plays au jour 1 : jouer, voir, puis répondre',
            'ohs_b3_note'      => 'des mains te laissent enchaîner 2 plays ou plus au jour 1 (coût cumulé 3 ou moins)',
            'ohs_b3_detail'    => 'Nombre de plays possibles au jour 1',
            'ohs_b4_title'     => 'Expéditions contestables au jour 1',
            'ohs_b4_sub'       => 'Personnages déployables dès le premier jour',
            'ohs_b4_h1'        => 'Les deux Expéditions',
            'ohs_b4_h1_note'   => 'tu peux déployer 2 ou 3 personnages au jour 1',
            'ohs_b4_h2'        => 'Aucune Expédition',
            'ohs_b4_h2_note'   => 'aucun personnage jouable au jour 1',
            'ohs_b4_detail'    => 'Nombre d\'Expéditions contestables au jour 1',
            'ohs_b4_none'      => 'Aucun personnage',
            'ohs_b4_one'       => '1 Expédition',
            'ohs_b4_both'      => 'Les 2 Expéditions',
            // playtest sandbox
            'hand_empty'           => 'Aucune carte à tirer.',
            'hand_characters'      => 'Personnages',
            'hand_spells'          => 'Sorts',
            'hand_permanents'      => 'Permanents',
            'hand_avg_cost'        => 'Coût moyen en main',
            'pt_restart'           => 'Nouvelle main',
            'pt_toggle_playground' => 'Mode jeu',
            'pt_setup_hint'        => 'Sélectionne 3 cartes à mettre en mana',
            'pt_commit_mana'       => 'Mettre en mana',
            'pt_mana'              => 'Mana',
            'pt_mana_list'         => 'Cartes en mana',
            'pt_empty_zone'        => 'Vide',
            'pt_deck'              => 'Deck',
            'pt_draw'              => 'Piocher',
            'pt_to_mana'           => 'En mana',
            'pt_play_board'        => 'Jouer sur le plateau',
            'pt_cancel'            => 'Annuler',
            'pt_zoom'              => 'Zoom',
            'pt_board'             => 'En jeu (Expéditions, Réserve, Permanents)',
            'pt_discard'           => 'Défausse',
            'pt_board_more'        => 'Voir +',
            'pt_return_hand'       => 'Remettre en main',
            'pt_board_list'        => 'Cartes du plateau',
            'pt_discard_list'      => 'Défausse',
        ],
    ];
    return $t[$lang] ?? $t['en'];
}

// Uniques search API format id used for the Frontier allowlist (`format=<id>`).
// Each Frontier season is published as its own entry in the formats manifest
// (frontier, frontier-s04, ...), so the active id is a site setting editable in
// Admin > Uniques format. Falls back to 'frontier' when unset or invalid.
function cacIsValidUniquesFormatId(string $id): bool {
    return preg_match('/^[A-Za-z0-9_.-]{1,32}$/', $id) === 1;
}

function cacUniquesFrontierFormat(): string {
    $id = trim(getSetting('uniques_frontier_format', 'frontier'));
    return cacIsValidUniquesFormatId($id) ? $id : 'frontier';
}

function cacFormatsManifestUrl(): string {
    return defined('FORMATS_MANIFEST_URL') && FORMATS_MANIFEST_URL !== ''
        ? FORMATS_MANIFEST_URL
        : 'https://altered-reunion-formats-prod.s3.fr-par.scw.cloud/manifest.json';
}

// Fetch the public formats manifest (array of {id, name, path, version}).
// Returns the valid entries, or null when the manifest can't be fetched/parsed.
function cacFetchFormatsManifest(): ?array {
    $res = acServiceRequest(new AcHttpRequest('GET', cacFormatsManifestUrl(), ['Accept: application/json'], null, 5, 3));
    if ($res->status !== 200) return null;

    $data = $res->json();
    if (!is_array($data)) return null;
    $entries = [];
    foreach ($data as $entry) {
        $id = is_array($entry) ? (string) ($entry['id'] ?? '') : '';
        if (!cacIsValidUniquesFormatId($id)) continue;
        $entries[] = [
            'id'      => $id,
            'name'    => (string) ($entry['name'] ?? $id),
            'version' => $entry['version'] ?? null,
        ];
    }
    return $entries;
}

// Tell the Deck API that the Frontier format changed (Admin > Uniques format), so
// deck validity follows the same season: DeckApi reads that season's allowlist
// from its own formats manifest, makes it the current Frontier season and
// revalidates every Frontier deck in the background.
// Needs DECKS_API_URL and DECKS_API_MAINTENANCE_KEY (DeckApi's ApiKeys:Maintenance).
// Returns null when not configured, else ['ok' => bool, 'season' => ?string, 'error' => ?string].
function cacNotifyDeckApiFrontierFormat(string $formatId): ?array {
    $key = defined('DECKS_API_MAINTENANCE_KEY') ? (string) DECKS_API_MAINTENANCE_KEY : '';
    $base = defined('DECKS_API_URL') ? rtrim((string) DECKS_API_URL, '/') : '';
    if ($key === '' || $base === '') return null;

    $res = acServiceRequest(AcHttpRequest::json(
        'POST',
        $base . '/api/admin/formats/season',
        ['formatId' => $formatId],
        null,
        'application/json',
        ['X-Api-Key: ' . $key],
        20
    ));

    $data = $res->json();
    if ($res->isOk()) {
        return ['ok' => true, 'season' => is_array($data) ? ($data['season'] ?? null) : null, 'error' => null];
    }
    $error = $res->errorDetail();
    if ($error === '') $error = $res->status > 0 ? 'HTTP ' . $res->status : ($res->curlError !== '' ? $res->curlError : 'no response');
    error_log('[core-altered-cards] Deck API Frontier format update failed for "' . $formatId . '": ' . $error);
    return ['ok' => false, 'season' => null, 'error' => $error];
}
