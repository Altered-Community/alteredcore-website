<?php
// Deck contest vote: shared helpers.

const DCV_TZ = 'Europe/Paris';

/** Tier list rows, best first: points stored in the votes table => letter. */
const DCV_TIERS = [5 => 'S', 4 => 'A', 3 => 'B', 2 => 'C', 1 => 'D'];

/** Voting window [opens_at, closes_at] as DateTimeImmutable in Paris time; null for a missing or invalid date. */
function dcvWindow(): array {
    $rows = getDB()->query(qp("SELECT `key`, `value` FROM {settings} WHERE `key` IN ('opens_at', 'closes_at')"))
        ->fetchAll(PDO::FETCH_KEY_PAIR);
    $tz = new DateTimeZone(DCV_TZ);
    $parse = function (?string $v) use ($tz): ?DateTimeImmutable {
        if ($v === null || trim($v) === '') return null;
        try { return new DateTimeImmutable($v, $tz); } catch (Exception $e) { return null; }
    };
    return [$parse($rows['opens_at'] ?? null), $parse($rows['closes_at'] ?? null)];
}

/** 'before' | 'open' | 'closed'. A missing bound does not limit that side. */
function dcvState(): string {
    [$opens, $closes] = dcvWindow();
    $now = new DateTimeImmutable('now', new DateTimeZone(DCV_TZ));
    if ($opens && $now < $opens) return 'before';
    if ($closes && $now > $closes) return 'closed';
    return 'open';
}

/** Decks in contest order (faction, then submission order). */
function dcvDecks(bool $onlyActive = true): array {
    $sql = "SELECT * FROM {decks}" . ($onlyActive ? " WHERE active = 1" : "") . " ORDER BY position";
    return getDB()->query(qp($sql))->fetchAll();
}

/** A user's votes: deck_id => ['tier' => ?int, 'frustrating' => bool]. */
function dcvUserVotes(int $userId): array {
    $stmt = getDB()->prepare(qp("SELECT deck_id, tier, frustrating FROM {votes} WHERE user_id = :u"));
    $stmt->execute([':u' => $userId]);
    $votes = [];
    foreach ($stmt as $v) {
        $votes[$v['deck_id']] = ['tier' => $v['tier'] === null ? null : (int)$v['tier'], 'frustrating' => (bool)$v['frustrating']];
    }
    return $votes;
}

/**
 * Records where one user put one deck: $tier is 1..5 (see DCV_TIERS) or null for « not placed », $frustrating the
 * flag « frustrating to face ». A deck neither placed nor flagged has its row removed. Returns false for a deck that
 * is not in the vote or a tier out of range.
 */
function dcvSaveVote(int $userId, string $deckId, ?int $tier, bool $frustrating): bool {
    if ($tier !== null && !isset(DCV_TIERS[$tier])) return false;
    $db   = getDB();
    $stmt = $db->prepare(qp("SELECT 1 FROM {decks} WHERE id = :d AND active = 1"));
    $stmt->execute([':d' => $deckId]);
    if (!$stmt->fetchColumn()) return false;

    if ($tier === null && !$frustrating) {
        $db->prepare(qp("DELETE FROM {votes} WHERE user_id = :u AND deck_id = :d"))->execute([':u' => $userId, ':d' => $deckId]);
        return true;
    }
    $db->prepare(qp(
        "INSERT INTO {votes} (user_id, deck_id, tier, frustrating) VALUES (:u, :d, :t, :f)
         ON DUPLICATE KEY UPDATE tier = VALUES(tier), frustrating = VALUES(frustrating)"
    ))->execute([':u' => $userId, ':d' => $deckId, ':t' => $tier, ':f' => $frustrating ? 1 : 0]);
    return true;
}

/** How many decks this user placed in the tier list. */
function dcvPlacedCount(int $userId): int {
    $stmt = getDB()->prepare(qp("SELECT COUNT(*) FROM {votes} v JOIN {decks} d ON d.id = v.deck_id WHERE v.user_id = :u AND v.tier IS NOT NULL AND d.active = 1"));
    $stmt->execute([':u' => $userId]);
    return (int)$stmt->fetchColumn();
}

// ─── Decklists: read from the decks API, cached in the decks table ────────────────────────────────────────────────

function dcvDecksApiUrl(): string {
    $stmt = getDB()->query(qp("SELECT `value` FROM {settings} WHERE `key` = 'decks_api_url'"));
    $url  = $stmt ? (string)$stmt->fetchColumn() : '';
    return rtrim($url !== '' ? $url : 'https://decks.alteredcore.org', '/');
}

/** C, R, U or E, read from the end of a card reference (ALT_CORE_B_AX_01_R2, …_U_1234). */
function dcvRarity(string $reference): string {
    return preg_match('/_([CRUE])(?:_?\d+)?$/', $reference, $m) ? $m[1] : '';
}

/** The part of the decks API answer the page shows: hero name and reference, and the cards (pictures come from the CDN). */
function dcvCompactDeck(array $api): array {
    $hero  = $api['stats']['hero'] ?? [];
    $cards = [];
    foreach ($api['cards'] ?? [] as $c) {
        if (($c['cardTypeReference'] ?? '') === 'HERO') continue;
        $cards[] = [
            'name'   => (string)($c['name'] ?? ''),
            'qty'    => (int)($c['quantity'] ?? 1),
            'cost'   => (int)($c['mainCost'] ?? 0),
            'type'   => (string)($c['cardTypeReference'] ?? ''),
            'rarity' => dcvRarity((string)($c['cardReference'] ?? '')),
            'ref'    => (string)($c['cardReference'] ?? ''),
        ];
    }
    usort($cards, fn($a, $b) => [$a['type'], $a['cost'], $a['name']] <=> [$b['type'], $b['cost'], $b['name']]);
    return ['hero' => (string)($hero['name'] ?? ''), 'hero_ref' => (string)($hero['reference'] ?? ''), 'cards' => $cards];
}

/**
 * Fetches the decklists of $decks (rows of the decks table) in both languages, in parallel, and stores them.
 * Returns the number of decks refreshed; a deck the API does not answer for keeps its previous cache.
 */
function dcvRefreshDecks(array $decks): int {
    if (!$decks || !function_exists('curl_multi_init')) return 0;
    $base    = dcvDecksApiUrl();
    $multi   = curl_multi_init();
    $handles = [];
    foreach ($decks as $d) {
        foreach (['fr', 'en'] as $lang) {
            $ch = curl_init($base . '/api/decks/' . rawurlencode($d['deck_uuid']) . '?locale=' . $lang);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER     => ['Accept: application/json'],
                CURLOPT_CONNECTTIMEOUT => 5,
                CURLOPT_TIMEOUT        => 20,
                CURLOPT_PROTOCOLS      => CURLPROTO_HTTP | CURLPROTO_HTTPS,
            ]);
            curl_multi_add_handle($multi, $ch);
            $handles[$d['id']][$lang] = $ch;
        }
    }
    do {
        $status = curl_multi_exec($multi, $running);
        if ($running) curl_multi_select($multi, 1.0);
    } while ($running && $status === CURLM_OK);

    $save = getDB()->prepare(qp("UPDATE {decks} SET data = :data, fetched_at = NOW() WHERE id = :id"));
    $done = 0;
    foreach ($handles as $deckId => $byLang) {
        $data = [];
        foreach ($byLang as $lang => $ch) {
            $body = curl_multi_getcontent($ch);
            if (curl_getinfo($ch, CURLINFO_HTTP_CODE) === 200 && is_array($api = json_decode((string)$body, true))) {
                $data[$lang] = dcvCompactDeck($api);
            }
            curl_multi_remove_handle($multi, $ch);
            curl_close($ch);
        }
        if (count($data) === 2) {
            $save->execute([':data' => json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), ':id' => $deckId]);
            $done++;
        }
    }
    curl_multi_close($multi);
    return $done;
}

/** Decks whose decklist was never fetched (or cached before the current format), fetched now so that the page is complete on its first view. */
function dcvFillMissingDecks(array $decks): array {
    $missing = array_values(array_filter($decks, fn($d) => $d['deck_uuid'] !== '' && !str_contains((string)$d['data'], '"hero_ref"')));
    if (!$missing || dcvRefreshDecks($missing) === 0) return $decks;
    return dcvDecks();
}

/** The archetype column as a list: « Buildup/Combo » => ['Buildup', 'Combo']. */
function dcvArchetypes(string $archetype): array {
    return array_values(array_filter(array_map('trim', explode('/', $archetype)), 'strlen'));
}
