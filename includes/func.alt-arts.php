<?php
// Alt arts (plugins ownership, core-altered-cards, rebuilder). The player's default alt arts (page « Arts alternatifs
// par défaut », plugin ownership) and the ownership service's mode:
// - « Global »: the service rewrites every deck with the defaults, on the site and on Board Game Arena
//   (AltArtService.ApplyToDeckAsync); the deck builders write them in the deck's list when it is opened or changed.
// - « par deck »: a deck plays the prints of its list; a card added in Re:Builder takes its default alt art, and the
//   brush changes a card's prints for one deck (table {rebuilder_deck_alt_arts}).
// Leaving « Global » writes the defaults in every deck first (endpoint papi/ownership/alt-art-leave-global), so that each
// deck starts from what Board Game Arena showed.

/**
 * $deckId, a deck of $userId, deleted from the decks API: its Re:Builder brush choices ({rebuilder_deck_alt_arts}) go
 * with it. Called after a successful DELETE (the services relay, the site's deck pages).
 */
function altArtForgetDeck(int $userId, string $deckId): void {
    if ($userId <= 0 || $deckId === '') return;
    altArtDeleteChoices('DELETE FROM {rebuilder_deck_alt_arts} WHERE user_id = :u AND deck_id = :d', [':u' => $userId, ':d' => $deckId]);
}

/** $userId switched to « Global »: their decks follow the defaults, the brush choices of every deck go. */
function altArtForgetChoices(int $userId): void {
    if ($userId <= 0) return;
    altArtDeleteChoices('DELETE FROM {rebuilder_deck_alt_arts} WHERE user_id = :u', [':u' => $userId]);
}

function altArtDeleteChoices(string $sql, array $args): void {
    try {
        getDB()->prepare(q($sql))->execute($args);
    } catch (Exception $e) {
        // Left-over rows are harmless: Re:Builder ignores a choice that no longer matches the deck's copies.
        error_log('altArtDeleteChoices: ' . $e->getMessage());
    }
}

/** Ids of the decks of the token's player (decks API, every deck of the account in one page); `null` on an error. */
function altArtUserDeckIds(string $token): ?array {
    if (!defined('DECKS_API_URL') || !DECKS_API_URL) return [];
    [$status, $body] = altArtHttp('GET', rtrim(DECKS_API_URL, '/') . '/api/decks?' . http_build_query(['page' => 1, 'itemsPerPage' => 1000]), $token);
    if ($status !== 200 || !is_array($body)) return null;
    $decks = isset($body['member']) && is_array($body['member']) ? $body['member'] : $body;
    $ids = [];
    foreach ($decks as $deck) {
        if (is_array($deck) && isset($deck['id']) && is_string($deck['id'])) $ids[] = $deck['id'];
    }
    return $ids;
}

/**
 * Writes in the list of deck $deckId what the ownership service shows of it in « Global » mode (POST
 * /api/alt-arts/apply-to-deck: the defaults, the base art for copies not owned; the hero is one of the deck's cards).
 * `true` when the list changed, `false` when it already had them, `null` on an error (nothing written).
 */
function altArtWriteDefaultsInDeck(string $token, string $deckId): ?bool {
    if (!defined('DECKS_API_URL') || !DECKS_API_URL || !defined('OWNERSHIP_API_URL') || !OWNERSHIP_API_URL) return null;
    $deckUrl = rtrim(DECKS_API_URL, '/') . '/api/decks/' . rawurlencode($deckId);
    [$status, $deck] = altArtHttp('GET', $deckUrl, $token);
    if ($status !== 200 || !is_array($deck)) return null;

    $before = [];
    foreach ((array)($deck['deckCards'] ?? $deck['cards'] ?? []) as $c) {
        if (!is_array($c) || empty($c['cardReference'])) continue;
        $ref = (string)$c['cardReference'];
        $before[$ref] = ($before[$ref] ?? 0) + (int)($c['quantity'] ?? 1);
    }
    if (!$before) return false;

    $items = [];
    foreach ($before as $ref => $qty) $items[] = ['reference' => $ref, 'quantity' => $qty];
    [$status, $applied] = altArtHttp('POST', rtrim(OWNERSHIP_API_URL, '/') . '/api/alt-arts/apply-to-deck', $token, $items);
    if ($status !== 200 || !is_array($applied['lines'] ?? null)) return null;

    // lines[i] is a list: a preference spread over several slots, or a shortfall, splits one line into several.
    $after = [];
    foreach ($applied['lines'] as $lines) {
        foreach ((array)$lines as $line) {
            if (!isset($line['reference'], $line['quantity'])) continue;
            $ref = (string)$line['reference'];
            $after[$ref] = ($after[$ref] ?? 0) + (int)$line['quantity'];
        }
    }
    if (!$after) return null;
    ksort($before);
    ksort($after);
    if ($after === $before) return false;

    $deckCards = [];
    foreach ($after as $ref => $qty) $deckCards[] = ['cardReference' => $ref, 'quantity' => $qty];
    [$status] = altArtHttp('PATCH', $deckUrl, $token, ['deckCards' => $deckCards], 'application/merge-patch+json');
    return $status >= 200 && $status < 300 ? true : null;
}

/** JSON request with a bearer token: [status (0 when unreachable), decoded body or null]. */
function altArtHttp(string $method, string $url, string $token, ?array $body = null, string $contentType = 'application/json'): array {
    $headers = ['Authorization: Bearer ' . $token, 'Accept: application/json'];
    if ($body !== null) $headers[] = 'Content-Type: ' . $contentType;
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_PROTOCOLS      => CURLPROTO_HTTP | CURLPROTO_HTTPS,
    ]);
    if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    $raw = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    if ($raw === false) return [0, null];
    $decoded = json_decode((string)$raw, true);
    return [$status, is_array($decoded) ? $decoded : null];
}
