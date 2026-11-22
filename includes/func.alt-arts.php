<?php
// Alt arts (plugins ownership, core-altered-cards, rebuilder). The player's default alt arts (page « Arts alternatifs
// par défaut », plugin ownership) and the ownership service's mode:
// - « Global »: the service rewrites every deck with the defaults, on the site and on Board Game Arena
//   (AltArtService.ApplyToDeckAsync); the deck builders write them in the deck's list when it is opened or changed.
// - « par deck »: a deck plays the prints of its list; a card added in Re:Builder takes its default alt art, and the
//   brush changes a card's prints for one deck (table {rebuilder_deck_alt_arts}).
// Leaving « Global » writes the defaults in every deck first (endpoint papi/ownership/alt-art-leave-global), so that each
// deck starts from what Board Game Arena showed, and drops its brush choices.

/**
 * The Re:Builder brush choices ({rebuilder_deck_alt_arts}) of deck $deckId, a deck of $userId, go: the deck was deleted
 * (the services relay, the site's deck pages) or took the defaults on leaving « Global ».
 */
function altArtForgetDeck(int $userId, string $deckId): void {
    if ($userId <= 0 || $deckId === '') return;
    try {
        getDB()->prepare(q('DELETE FROM {rebuilder_deck_alt_arts} WHERE user_id = :u AND deck_id = :d'))
            ->execute([':u' => $userId, ':d' => $deckId]);
    } catch (Exception $e) {
        // Left-over rows are harmless: Re:Builder ignores a choice that no longer matches the deck's copies.
        error_log('altArtForgetDeck: ' . $e->getMessage());
    }
}

/**
 * Ids of every deck of the token's player; `null` on an error. `GET /api/decks` ignores `page` and `itemsPerPage` today
 * and sends every deck at once (docs/api-limitations/decks-api.md of Re:Builder): a page that is not full, or that
 * brings no new deck, ends the loop, else an account of 1000 decks or more would get the same list again and again.
 */
function altArtUserDeckIds(string $token): ?array {
    if (!defined('DECKS_API_URL') || !DECKS_API_URL) return [];
    $perPage = 1000;
    $ids = [];
    for ($page = 1; $page <= 50; $page++) {
        [$status, $body] = altArtHttp('GET', rtrim(DECKS_API_URL, '/') . '/api/decks?' . http_build_query(['page' => $page, 'itemsPerPage' => $perPage]), $token);
        if ($status !== 200 || !is_array($body)) return null;
        $decks = isset($body['member']) && is_array($body['member']) ? $body['member'] : $body;
        $fresh = 0;
        foreach ($decks as $deck) {
            if (!is_array($deck) || !isset($deck['id']) || !is_string($deck['id']) || isset($ids[$deck['id']])) continue;
            $ids[$deck['id']] = true;
            $fresh++;
        }
        if (count($decks) !== $perPage || $fresh === 0) break;
    }
    return array_map('strval', array_keys($ids));
}

/**
 * $cards ({cardReference, quantity} lines) as the ownership service shows them in « Global » mode (POST
 * /api/alt-arts/apply-to-deck: the defaults, the base art for copies not owned), one line a reference; `null` on an error.
 * The service fills each line from the family's 1st card: a deck holding one line a print (the alt art for the 1st
 * card, the plain print for the 2nd and 3rd) would get the 1st card's alt art twice. The lines of a family are sent as
 * one (POST /api/alt-arts/resolve-references gives each reference its family).
 */
function altArtApplyToDeck(string $token, array $cards): ?array {
    if (!defined('OWNERSHIP_API_URL') || !OWNERSHIP_API_URL) return null;
    $base = rtrim(OWNERSHIP_API_URL, '/');
    $quantities = [];
    foreach ($cards as $c) {
        if (empty($c['cardReference'])) continue;
        $ref = (string)$c['cardReference'];
        $quantities[$ref] = ($quantities[$ref] ?? 0) + (int)($c['quantity'] ?? 1);
    }
    if (!$quantities) return [];
    [$status, $resolved] = altArtHttp('POST', $base . '/api/alt-arts/resolve-references', $token, array_map('strval', array_keys($quantities)));
    if ($status !== 200 || !is_array($resolved)) return null;
    $familyOf = [];
    foreach ($resolved as $r) {
        if (is_array($r) && isset($r['reference'], $r['familyId'], $r['faction'], $r['rarity'])) {
            $familyOf[(string)$r['reference']] = $r['familyId'] . ':' . $r['faction'] . ':' . $r['rarity'];
        }
    }
    // One line a family (its first reference), one line a reference without a family.
    $items = [];
    foreach ($quantities as $ref => $qty) {
        $key = $familyOf[(string)$ref] ?? 'ref:' . $ref;
        if (isset($items[$key])) $items[$key]['quantity'] += $qty;
        else $items[$key] = ['reference' => (string)$ref, 'quantity' => $qty];
    }
    [$status, $applied] = altArtHttp('POST', $base . '/api/alt-arts/apply-to-deck', $token, array_values($items));
    if ($status !== 200 || !is_array($applied['lines'] ?? null)) return null;

    // lines[i] is a list: a preference spread over several slots, or a shortfall, splits one line into several; two
    // prints falling back to the same base art are merged.
    $merged = [];
    foreach ($applied['lines'] as $lines) {
        foreach ((array)$lines as $line) {
            if (!isset($line['reference'], $line['quantity'])) continue;
            $ref = (string)$line['reference'];
            $merged[$ref] = ($merged[$ref] ?? 0) + (int)$line['quantity'];
        }
    }
    $out = [];
    foreach ($merged as $ref => $qty) $out[] = ['cardReference' => $ref, 'quantity' => $qty];
    return $out;
}

/**
 * Writes in the list of deck $deckId what the ownership service shows of it in « Global » mode (altArtApplyToDeck; the
 * hero is one of the deck's cards). `true` when the list changed, `false` when it already had them, `null` on an error
 * (nothing written).
 */
function altArtWriteDefaultsInDeck(string $token, string $deckId): ?bool {
    if (!defined('DECKS_API_URL') || !DECKS_API_URL) return null;
    $deckUrl = rtrim(DECKS_API_URL, '/') . '/api/decks/' . rawurlencode($deckId);
    [$status, $deck] = altArtHttp('GET', $deckUrl, $token);
    if ($status !== 200 || !is_array($deck)) return null;

    $before = (array)($deck['deckCards'] ?? $deck['cards'] ?? []);
    $after = altArtApplyToDeck($token, $before);
    if ($after === null) return null;
    $count = function (array $lines): array {
        $n = [];
        foreach ($lines as $l) {
            if (!empty($l['cardReference'])) $n[$l['cardReference']] = ($n[$l['cardReference']] ?? 0) + (int)($l['quantity'] ?? 1);
        }
        ksort($n);
        return $n;
    };
    if ($count($after) === $count($before)) return false;

    [$status] = altArtHttp('PATCH', $deckUrl, $token, ['deckCards' => $after], 'application/merge-patch+json');
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
