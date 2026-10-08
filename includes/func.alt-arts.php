<?php
// Default alt arts (plugins ownership, core-altered-cards, rebuilder). The player sets their default alt arts once
// (page « Arts alternatifs par défaut », plugin ownership); a deck stores the prints it uses, and Board Game Arena plays
// them. The ownership service's « Global » mode rewrote every deck with the global preferences, on the site and on BGA
// (AltArtService.ApplyToDeckAsync), so a deck could not keep its own prints: a player still in that mode is switched to
// « par deck » on their next visit (the first page that reads the mode), and their decks wait for their default alt
// arts until Re:Builder opens them (table {alt_art_pending_decks}, endpoint papi/ownership/alt-art-pending).

/**
 * « Global » → « par deck » for $userId, and their decks marked to take their default alt arts. `true` once switched;
 * `false` when the service refused or could not be reached (the mode stays, the next visit tries again).
 */
function altArtLeaveGlobalMode(int $userId): bool {
    if (!defined('OWNERSHIP_API_URL') || !OWNERSHIP_API_URL || $userId <= 0) return false;
    require_once __DIR__ . '/func.keycloak.php';
    $token = kc_get_access_token($userId);
    if (!$token) return false;

    // The decks first: when they cannot be listed, the mode stays and the next visit tries again.
    $ids = altArtUserDeckIds($token);
    if ($ids === null) return false;
    [$status] = altArtHttp('PUT', rtrim(OWNERSHIP_API_URL, '/') . '/api/alt-arts/preference-mode', $token, ['mode' => 'PerDeck']);
    if ($status !== 204) return false;

    if ($ids) {
        $insert = getDB()->prepare(q("INSERT IGNORE INTO {alt_art_pending_decks} (user_id, deck_id) VALUES (:u, :d)"));
        foreach ($ids as $id) $insert->execute([':u' => $userId, ':d' => $id]);
    }
    return true;
}

/** Whether $deckId (a deck of $userId) waits for its default alt arts. */
function altArtDeckPending(int $userId, string $deckId): bool {
    $stmt = getDB()->prepare(q("SELECT 1 FROM {alt_art_pending_decks} WHERE user_id = :u AND deck_id = :d LIMIT 1"));
    $stmt->execute([':u' => $userId, ':d' => $deckId]);
    return (bool)$stmt->fetchColumn();
}

/** $deckId took its default alt arts (or does not need them any more). */
function altArtClearPending(int $userId, string $deckId): void {
    getDB()->prepare(q("DELETE FROM {alt_art_pending_decks} WHERE user_id = :u AND deck_id = :d"))
        ->execute([':u' => $userId, ':d' => $deckId]);
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

/** JSON request with a bearer token: [status (0 when unreachable), decoded body or null]. */
function altArtHttp(string $method, string $url, string $token, ?array $body = null): array {
    $headers = ['Authorization: Bearer ' . $token, 'Accept: application/json'];
    if ($body !== null) $headers[] = 'Content-Type: application/json';
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
