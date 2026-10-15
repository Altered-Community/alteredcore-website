<?php
/**
 * Catalog transport for the alt-art shop.
 *
 * One input: GET /api/alt-arts/search on the ownership service — the very endpoint the Digital
 * Ownership alt-arts page lists through (api/alt-art-search.php). It answers with
 * the families that have alt arts, their printings and how many copies of each the player owns,
 * already localised and filtered. Reusing it means the shop shows exactly the set of alt arts the
 * player can see in their collection, with no second source to drift out of step.
 *
 * Two deliberate differences from the ownership page's call:
 *
 *   - `hideNonChoices=false`, because that filter exists for a marker-assignment page: it drops
 *     families where the player owns a single print and so has no marker to move. A shop listing
 *     wants the whole catalogue.
 *   - no cardType filter. The ownership page narrows to TOKEN types in per-deck mode, because
 *     regular-card art is chosen in the deckbuilder instead. The shop is not that page, so it
 *     lists every type.
 */

declare(strict_types=1);

require_once __DIR__ . '/shop-pricing.php';
require_once __DIR__ . '/shop-balance.php';
require_once __DIR__ . '/functions.php';

/** Families per search call. The service caps `take` at 100. */
const OWN_SHOP_PAGE_SIZE = 50;

/**
 * Card artwork URL. The cards CDN is path-derived — /cards/{lang}/{SET}/{reference}.webp — so
 * nothing here stores or looks up image paths and the result is language-independent.
 *
 * getUiLang(), not getLang(): artwork exists only in the languages the cards were printed in, so
 * es/it/de fall back to English rather than requesting an image that is not there.
 */
function ownShopCardImageUrl(string $reference, string $lang = ''): string {
    if ($reference === '') return '';
    $parts = explode('_', $reference);
    $set   = $parts[1] ?? '';
    if ($set === '') return '';
    $lang = $lang !== '' ? $lang : getUiLang();
    $base = defined('CDN_URL') && CDN_URL ? rtrim(CDN_URL, '/') : 'https://cdn.alteredcore.org';
    return $base . '/cards/' . rawurlencode($lang) . '/' . rawurlencode($set) . '/' . rawurlencode($reference) . '.webp';
}

/**
 * True when a reference is an alt-art print.
 *
 * The grammar is ALT_{SET}_{A|B}_{FACTION}_{NUM}_{SLUG}: the third field is the variation, A for
 * alt-art and B for the standard print. Checked on the field rather than with a substring so a set
 * code that happens to contain "ALT" cannot pass.
 */
function ownShopIsAltReference(string $reference): bool {
    $parts = explode('_', $reference);
    return count($parts) === 6 && $parts[0] === 'ALT' && $parts[2] === 'A';
}

/**
 * Index an ownership-service `options` payload by family, the way the ownership proxy does.
 *
 * The service sends one group per family carrying that family's printings; the lookup is
 * familyId:faction:rarity, and both the live proxy and the preview fixture are keyed the same way so
 * the same mapping reads either.
 *
 * @param mixed $options Raw `options` from the payload.
 * @return array<string, array>
 */
function ownShopOptionsByKey($options): array {
    if (!is_array($options)) return [];

    $byKey = [];
    foreach ($options as $group) {
        if (!is_array($group)) continue;
        $byKey[($group['familyId'] ?? '') . ':' . ($group['faction'] ?? '') . ':' . ($group['rarity'] ?? '')] = $group;
    }
    return $byKey;
}

/**
 * Normalise a filter value that may arrive as a scalar or a repeated list.
 *
 * The shop's chips are multi-select, so faction/rarity/type arrive as arrays; a single-value caller
 * (or a query string with one occurrence) still hands over a scalar. Both are accepted, blanks are
 * dropped so an empty selection never becomes a filter, and the result is a clean list of strings.
 *
 * @param mixed $raw
 * @return list<string>
 */
function ownShopFilterValues($raw): array {
    $out = [];
    foreach (is_array($raw) ? $raw : [$raw] as $value) {
        if (!is_scalar($value)) continue;
        $value = trim((string)$value);
        if ($value !== '') $out[] = $value;
    }
    return $out;
}

/**
 * The query string for one page of the ownership service's alt-art search.
 *
 * Pure and separate from the HTTP call so the exact shape of the request — `name` single-valued,
 * `faction[]`/`rarity[]`/`type[]` repeated — can be asserted without a service to talk to. The
 * service reads the two shapes differently; a bracket on `name` would arrive as an array it cannot
 * use, and a repeated `faction` without the bracket would keep only the last value.
 *
 * @param array{name?:string,faction?:string|array,rarity?:string|array,type?:string|array,skip?:int} $filters
 */
function ownShopSearchQuery(array $filters, int $skip): string {
    $parts = [
        'locale=' . rawurlencode(getLang()),
        'hideNonChoices=false',
        'skip=' . max(0, $skip),
        'take=' . OWN_SHOP_PAGE_SIZE,
    ];

    $name = trim((string)($filters['name'] ?? ''));
    if ($name !== '') $parts[] = 'name=' . rawurlencode($name);

    foreach (['faction', 'rarity', 'type'] as $key) {
        foreach (ownShopFilterValues($filters[$key] ?? null) as $value) {
            $parts[] = $key . '[]=' . rawurlencode($value);
        }
    }

    return implode('&', $parts);
}

/**
 * One page of the ownership service's alt-art search.
 *
 * Returns ['families', 'options' (keyed by family), 'hasMore', 'skipNext', 'error']. `error` is set
 * only when the call itself failed; an empty `families` with no error is a legitimate empty result.
 *
 * @param array{name?:string,faction?:string|array,rarity?:string|array,type?:string|array,skip?:int} $filters
 */
function ownShopSearchPage(int $userId, array $filters = []): array {
    $fail = static fn(string $why): array => [
        'families' => [], 'options' => [], 'hasMore' => false, 'skipNext' => 0, 'error' => $why,
    ];

    $apiUrl = defined('OWNERSHIP_API_URL') && OWNERSHIP_API_URL ? rtrim(OWNERSHIP_API_URL, '/') : '';
    if ($apiUrl === '') return $fail('not_configured');
    if ($userId <= 0) return $fail('unauthenticated');

    $skip  = max(0, (int)($filters['skip'] ?? 0));
    $query = ownShopSearchQuery($filters, $skip);

    $res   = ownApiRequest('GET', '/api/alt-arts/search?' . $query, $userId);
    if (!is_array($res)) return $fail('upstream_error');

    $families = is_array($res['families'] ?? null) ? $res['families'] : [];
    $options  = is_array($res['options'] ?? null) ? $res['options'] : [];

    // Key the option groups the way the ownership proxy does, so the two read the payload alike.
    $byKey = ownShopOptionsByKey($options);

    // `skip` counts families, but the shop's items are printings — a family with three alt arts
    // contributes one family and three items. The caller cannot derive the next offset from the
    // item count, so hand it the value the service expects.
    $skipNext = $skip + count($families);

    return [
        'families' => $families,
        'options'  => $byKey,
        'hasMore'  => (bool)($res['hasMore'] ?? false),
        'skipNext' => $skipNext,
        'error'    => null,
    ];
}

/**
 * The shop's view of one family: one entry per alt-art printing it can still sell.
 *
 * The service reports every printing of the family, with `ownedQuantity` per printing (null on the
 * standard print, which is unlimited). Two of those are not offers:
 *
 *   - the standard print, because a shop sells alt art, not the card everyone already has;
 *   - anything the player already holds, because there is nothing to buy. A print the player owns
 *     is not listed at a price at all — not greyed out, not marked Owned. The shop's answer to
 *     "what can I buy" is a list of what they cannot buy yet, and a visible-but-dead price reads as
 *     an offer.
 *
 * A print whose owned count was not reported (null) stays listed. Silence from the service is not
 * proof of ownership, and hiding a print the player does not have would be the worse error.
 *
 * @param array<string,int>|null $priceTable Loaded prices, or null to read them here.
 */
function ownShopFamilyItems(array $family, array $optionsByKey, ?array $priceTable = null): array {
    $key = ($family['familyId'] ?? '') . ':' . ($family['faction'] ?? '') . ':' . ($family['rarity'] ?? '');
    $group = $optionsByKey[$key] ?? [];
    if (!is_array($group)) return [];

    $rarity = strtoupper(trim((string)($family['rarity'] ?? '')));
    $name   = trim((string)($family['name'] ?? ''));
    if ($name === '') return [];

    $cardType = (string)($family['cardType'] ?? '');
    $copies   = max(1, (int)($group['copies'] ?? 3));
    $out      = [];

    $prints = $group['options'] ?? [];
    if (!is_array($prints)) return [];

    foreach ($prints as $print) {
        if (!is_array($print)) continue;
        $reference = (string)($print['reference'] ?? '');
        if (!ownShopIsAltReference($reference)) continue;

        $owned = $print['ownedQuantity'] ?? null;
        if ($owned !== null && (int)$owned > 0) continue;

        $out[] = [
            'reference' => $reference,
            'familyId'  => (int)($family['familyId'] ?? 0),
            'name'      => $name,
            'rarity'    => $rarity,
            'faction'   => strtoupper((string)($family['faction'] ?? '')),
            'cardType'  => $cardType,
            'copies'    => $copies,
            // Always 0 or null from here on; kept so the item says which it was rather than leaving
            // the client to guess from the absence of a label.
            'owned'     => $owned === null ? null : 0,
            'price'     => ownShopPrice($rarity, $cardType, $priceTable),
            'image'     => ownShopCardImageUrl($reference),
        ];
    }

    return $out;
}

/**
 * Design-system colour token for a faction code, or '' when the code has none.
 *
 * The tokens are named after the faction, not its code (--ac-faction-axiom, not --ac-faction-AX),
 * so the mapping is spelled out rather than derived. A new faction with no token yet returns ''
 * and the chip is drawn without a dot, instead of rendering an unresolved var().
 */
function ownShopFactionToken(string $code): string {
    $tokens = [
        'AX' => 'axiom',
        'BR' => 'bravos',
        'LY' => 'lyra',
        'MU' => 'muna',
        'OR' => 'ordis',
        'YZ' => 'yzmir',
    ];
    $code = strtoupper(trim($code));
    return isset($tokens[$code]) ? $tokens[$code] : '';
}

/**
 * Localised label for a faction code, from the cards data the ownership page also reads.
 * Falls back to the bare code when the data is unavailable or has no entry.
 */
function ownShopFactionLabel(string $code, array $factions, string $lang = ''): string {
    $code = strtoupper(trim($code));
    $lang = $lang !== '' ? $lang : getUiLang();

    $entry = $factions[$code] ?? null;
    if (is_array($entry)) {
        foreach ([$lang, 'en'] as $loc) {
            if (!empty($entry[$loc]) && is_string($entry[$loc])) return $entry[$loc];
        }
    } elseif (is_string($entry) && $entry !== '') {
        return $entry;
    }
    return $code;
}