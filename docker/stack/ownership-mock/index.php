<?php
// Local stand-in for the AlteredOwnership service (OWNERSHIP_API_URL), for the local / CI stack only.
// The real service is not public and only accepts altered.re Keycloak tokens. This mock answers the
// alt-art endpoints the site proxies (plugins/ownership/api, plugins/core-altered-cards/api) and
// Re:Builder calls through /api/v1/services/ownership, with families built from the production cards
// API: a card group's standard print plus its alt-art (`_A_`) and promo prints. Owned quantities are
// made up (stable per user and print); preferences and the mode are kept in /tmp per token subject.
//
//   php -S 0.0.0.0:8080 index.php

const CARDS_API = 'https://cards.alteredcore.org';
const STATE_DIR = '/tmp/ownership-mock';

header('Content-Type: application/json; charset=UTF-8');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path   = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$body   = json_decode(file_get_contents('php://input') ?: 'null', true);
$user   = mockUser();

switch ("$method $path") {
    case 'GET /health':
        reply(['status' => 'ok']);
    case 'GET /api/alt-arts/preference-mode':
        reply(['mode' => state($user)['mode'] ?? 'PerDeck']);
    case 'PUT /api/alt-arts/preference-mode':
        if (!in_array($body['mode'] ?? null, ['PerDeck', 'Global'], true)) reply(['error' => 'mode must be "PerDeck" or "Global"'], 400);
        saveState($user, ['mode' => $body['mode']] + state($user));
        reply(null, 204);
    case 'POST /api/alt-arts/resolve-references':
        $out = [];
        foreach ((array)$body as $ref) {
            if (!is_string($ref) || !($f = familyOf($ref))) continue;
            $out[] = ['reference' => $ref] + key3($f);
        }
        reply($out);
    case 'POST /api/alt-arts/options':
        $out = [];
        foreach ((array)$body as $k) {
            if (is_array($k) && ($f = familyById((int)($k['familyId'] ?? 0)))) $out[] = options($f, $user);
        }
        reply($out);
    case 'PUT /api/alt-arts/preferences':
        $f = familyById((int)($body['familyId'] ?? 0));
        if (!$f || !is_array($body['slotReferences'] ?? null)) reply(['error' => 'Unknown family or missing slotReferences'], 400);
        $valid = array_column($f['prints'], 'reference');
        $slots = array_values(array_filter($body['slotReferences'], fn($r) => in_array($r, $valid, true)));
        $s = state($user);
        $s['slots'][$f['key']] = $slots;
        saveState($user, $s);
        reply(null, 204);
    case 'GET /api/alt-arts/search':
        reply(search($user));
    case 'POST /api/alt-arts/apply-to-deck':
        reply(['lines' => applyToDeck((array)$body, $user)]);
    case 'GET /api/collection':
        reply(collection());
    default:
        reply(['error' => "No mock for $method $path"], 404);
}

function reply($data, int $status = 200): never {
    http_response_code($status);
    if ($status !== 204) echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** Subject of the bearer token (not verified: local stack only), `anonymous` without one. */
function mockUser(): string {
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/^Bearer\s+[^.]+\.([^.]+)\./', $auth, $m)) {
        $claims = json_decode(base64_decode(strtr($m[1], '-_', '+/')), true);
        if (is_string($claims['sub'] ?? null)) return preg_replace('/[^A-Za-z0-9-]/', '', $claims['sub']);
    }
    return 'anonymous';
}

function state(string $user): array {
    $file = STATE_DIR . "/$user.json";
    return is_file($file) ? (json_decode(file_get_contents($file), true) ?: []) : [];
}

function saveState(string $user, array $state): void {
    @mkdir(STATE_DIR, 0777, true);
    file_put_contents(STATE_DIR . "/$user.json", json_encode($state));
}

/** GET on the cards API, cached for a day in /tmp. */
function cardsApi(string $pathAndQuery): array {
    $cache = STATE_DIR . '/cache-' . md5($pathAndQuery) . '.json';
    if (is_file($cache) && filemtime($cache) > time() - 86400) return json_decode(file_get_contents($cache), true) ?: [];
    $raw = @file_get_contents(CARDS_API . $pathAndQuery, false, stream_context_create(['http' => ['header' => "Accept: application/json\r\n", 'timeout' => 15]]));
    $data = $raw ? (json_decode($raw, true) ?: []) : [];
    if ($raw) {
        @mkdir(STATE_DIR, 0777, true);
        file_put_contents($cache, $raw);
    }
    return $data;
}

/** A card group as a family: standard print first, then alt arts and promos; `null` with a single illustration. */
function toFamily(array $g): ?array {
    $prints = [];
    $base = null;
    foreach ($g['cards'] ?? [] as $c) {
        $ref = $c['reference'] ?? '';
        $variation = $c['variation'] ?? '';
        if ($variation === 'serialized' || $ref === '') continue;
        if (preg_match('/^ALT_[^_]+_A_/', $ref) || $variation === 'promo') $prints[] = ['reference' => $ref, 'alt' => true];
        elseif ($base === null && preg_match('/^ALT_[^_]+_B_/', $ref)) $base = $ref;
    }
    if ($base === null || !$prints) return null;
    array_unshift($prints, ['reference' => $base, 'alt' => false]);
    $slug = (string)($g['slug'] ?? '');
    $rarity = substr($slug, strrpos($slug, '-') + 1);
    $faction = is_array($g['faction'] ?? null) ? ($g['faction']['code'] ?? '') : (string)($g['faction'] ?? '');
    $type = is_array($g['cardType'] ?? null) ? ($g['cardType']['reference'] ?? '') : (string)($g['cardType'] ?? '');
    $f = [
        'familyId' => (int)$g['id'],
        'faction'  => $faction,
        'rarity'   => $rarity,
        'cardType' => $type,
        'name'     => $g['name'] ?? '',
        'slug'     => $slug,
        'copies'   => $type === 'HERO' || str_starts_with($type, 'TOKEN') ? 1 : 3,
        'prints'   => $prints,
    ];
    $f['key'] = $f['familyId'] . ':' . $faction . ':' . $rarity;
    @mkdir(STATE_DIR, 0777, true);
    file_put_contents(STATE_DIR . '/family-' . $f['familyId'] . '.json', json_encode($f));
    return $f;
}

function key3(array $f): array {
    return ['familyId' => $f['familyId'], 'faction' => $f['faction'], 'rarity' => $f['rarity']];
}

/** ALT_{SET}_{P}_{FACTION}_{NUM}_{RARITY} → group slug FACTION-NNN-RARITY (Uniques, 7 parts: none). */
function familyOf(string $ref): ?array {
    $p = explode('_', $ref);
    if (count($p) !== 6 || !ctype_digit($p[4])) return null;
    $slug = sprintf('%s-%03d-%s', $p[3], (int)$p[4], $p[5]);
    $group = cardsApi('/api/card_groups?slug=' . rawurlencode($slug))['member'][0] ?? null;
    return $group ? toFamily($group) : null;
}

function familyById(int $id): ?array {
    $file = STATE_DIR . "/family-$id.json";
    return is_file($file) ? json_decode(file_get_contents($file), true) : null;
}

/** Made-up but stable copies owned: 0 to 3 per alt print, the standard print is unlimited (`null`). */
function owned(array $print, string $user): ?int {
    return $print['alt'] ? crc32($user . $print['reference']) % 4 : null;
}

function options(array $f, string $user): array {
    $chosen = state($user)['slots'][$f['key']] ?? [];
    $slots = [];
    for ($i = 0; $i < $f['copies']; $i++) $slots[] = ['slotIndex' => $i, 'reference' => $chosen[$i] ?? $f['prints'][0]['reference']];
    return key3($f) + [
        'options' => array_map(fn($p) => ['reference' => $p['reference'], 'ownedQuantity' => owned($p, $user)], $f['prints']),
        'slots'   => $slots,
    ];
}

/** Families of the chosen types (tokens by default), one page of the cards API per call. */
function search(string $user): array {
    $types = array_values(array_filter((array)($_GET['type'] ?? []), 'is_string')) ?: ['TOKEN', 'TOKEN_LANDMARK_PERMANENT', 'TOKEN_MANA'];
    $factions = array_values(array_filter((array)($_GET['faction'] ?? []), 'is_string'));
    $rarities = array_values(array_filter((array)($_GET['rarity'] ?? []), 'is_string'));
    $name = mb_strtolower(trim((string)($_GET['name'] ?? '')));
    $locale = (string)($_GET['locale'] ?? 'fr');
    $take = max(1, min(100, (int)($_GET['take'] ?? 25)));
    $page = intdiv(max(0, (int)($_GET['skip'] ?? 0)), $take) + 1;
    $q = 'itemsPerPage=' . $take . '&page=' . $page;
    foreach ($types as $t) $q .= '&cardType[]=' . rawurlencode($t);
    foreach ($factions as $fc) $q .= '&faction[]=' . rawurlencode($fc);
    $res = cardsApi('/api/card_groups?' . $q);
    $families = [];
    $options = [];
    foreach ($res['member'] ?? [] as $g) {
        $f = toFamily($g);
        if (!$f || ($rarities && !in_array($f['rarity'], $rarities, true))) continue;
        $label = is_array($f['name']) ? ($f['name'][$locale] ?? $f['name']['en'] ?? reset($f['name'])) : $f['name'];
        if ($name !== '' && !str_contains(mb_strtolower((string)$label), $name)) continue;
        $families[] = key3($f) + ['cardType' => $f['cardType'], 'name' => $label, 'reference' => $f['prints'][0]['reference']];
        $options[] = options($f, $user);
    }
    return ['families' => $families, 'options' => $options, 'hasMore' => $page * $take < (int)($res['totalItems'] ?? 0)];
}

/**
 * A few owned cards (the same for every user), filtered as the services do: `key[]` lists, `name` substring. Also the
 * stack's collection API (COLLECTION_API_URL, same path): its filters are named `cardType` / `cardSet`.
 */
function collection(): array {
    $owned = [
        ['reference' => 'ALT_CORE_B_AX_08_C', 'quantity' => 3, 'name' => 'Récupérateur Axiom', 'faction' => 'AX', 'rarity' => 'COMMON', 'type' => 'CHARACTER', 'set' => 'CORE'],
        ['reference' => 'ALT_CORE_B_AX_08_R1', 'quantity' => 1, 'name' => 'Récupérateur Axiom', 'faction' => 'AX', 'rarity' => 'RARE', 'type' => 'CHARACTER', 'set' => 'CORE'],
        ['reference' => 'ALT_CORE_B_AX_15_C', 'quantity' => 2, 'name' => 'Brouilleur Axiom', 'faction' => 'AX', 'rarity' => 'COMMON', 'type' => 'CHARACTER', 'set' => 'CORE'],
        ['reference' => 'ALT_ALIZE_B_AX_32_R1', 'quantity' => 1, 'name' => 'La Machine dans la Glace', 'faction' => 'AX', 'rarity' => 'RARE', 'type' => 'CHARACTER', 'set' => 'ALIZE'],
        ['reference' => 'ALT_CORE_B_BR_10_C', 'quantity' => 3, 'name' => 'Red', 'faction' => 'BR', 'rarity' => 'COMMON', 'type' => 'CHARACTER', 'set' => 'CORE'],
    ];
    $name = mb_strtolower(trim((string)($_GET['name'] ?? '')));
    $filters = ['faction' => ['faction'], 'rarity' => ['rarity'], 'type' => ['type', 'cardType'], 'set' => ['set', 'cardSet']];
    $match = function ($c) use ($name, $filters) {
        foreach ($filters as $field => $params) {
            foreach ($params as $k) {
                $wanted = (array)($_GET[$k] ?? []);
                if ($wanted && !in_array($c[$field], $wanted, true)) return false;
            }
        }
        return $name === '' || str_contains(mb_strtolower($c['name']), $name);
    };
    return array_map(fn($c) => $c + ['cardReference' => $c['reference']], array_values(array_filter($owned, $match)));
}

/** Global mode: each copy takes its slot's print when owned, the standard print otherwise. */
function applyToDeck(array $lines, string $user): array {
    $global = (state($user)['mode'] ?? 'PerDeck') === 'Global';
    $out = [];
    foreach ($lines as $l) {
        $ref = (string)($l['reference'] ?? '');
        $qty = (int)($l['quantity'] ?? 0);
        $f = $global && $ref !== '' ? familyOf($ref) : null;
        if (!$f) {
            $out[] = [['reference' => $ref, 'quantity' => $qty]];
            continue;
        }
        $slots = options($f, $user)['slots'];
        $left = [];
        foreach ($f['prints'] as $p) $left[$p['reference']] = owned($p, $user);
        $sum = [];
        for ($i = 0; $i < $qty; $i++) {
            $want = $slots[$i]['reference'] ?? $ref;
            $avail = array_key_exists($want, $left) ? $left[$want] : 0;
            $pick = $avail === null || $avail > 0 ? $want : $f['prints'][0]['reference'];
            if (is_int($left[$pick] ?? null)) $left[$pick]--;
            $sum[$pick] = ($sum[$pick] ?? 0) + 1;
        }
        $out[] = array_map(fn($r, $n) => ['reference' => $r, 'quantity' => $n], array_keys($sum), $sum);
    }
    return $out;
}
