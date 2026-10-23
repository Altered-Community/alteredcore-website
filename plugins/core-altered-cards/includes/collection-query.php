<?php
// Query string of the collection API (GET /api/collection) from the collection-search proxy's own query.

/**
 * List filters go out as `key[]=v` (the API's array form): a repeated `key=v` keeps the last value only, so a
 * search on three rarities or several sets came back with one. The API fails (HTTP 500) on several card types:
 * those go out only when there is one, the proxy filters the others itself (cacCollectionLocalTypes).
 */
function cacCollectionQuery(array $get): string
{
    $arrays = ['faction', 'rarity', 'variation', 'cardSet'];
    if (count(cacCollectionValues($get, 'cardType')) === 1) $arrays[] = 'cardType';
    $scalar = ['isFoil', 'isBanned', 'isSuspended', 'cardReference', 'name', 'subTypes', 'locale'];
    $range  = ['mainCost', 'recallCost', 'oceanPower', 'mountainPower', 'forestPower'];

    $parts = [];
    foreach ($arrays as $k) {
        foreach (cacCollectionValues($get, $k) as $v) $parts[] = $k . '[]=' . rawurlencode($v);
    }
    foreach ($scalar as $k) {
        $v = $get[$k] ?? null;
        if (is_array($v)) $v = $v[0] ?? null;
        if (is_string($v) && $v !== '') $parts[] = $k . '=' . rawurlencode($v);
    }
    foreach ($range as $k) {
        if (!is_array($get[$k] ?? null)) continue;
        foreach (['gte', 'lte', 'gt', 'lt'] as $op) {
            $v = $get[$k][$op] ?? null;
            if (is_scalar($v) && $v !== '') $parts[] = $k . '[' . $op . ']=' . rawurlencode((string)$v);
        }
    }
    return implode('&', $parts);
}

/** The card types the proxy keeps itself (several of them, see cacCollectionQuery); `null` when the API filters. */
function cacCollectionLocalTypes(array $get): ?array
{
    $types = cacCollectionValues($get, 'cardType');
    return count($types) > 1 ? $types : null;
}

/** The non-empty string values of a list filter. */
function cacCollectionValues(array $get, string $key): array
{
    return array_values(array_filter((array)($get[$key] ?? []), fn($v) => is_string($v) && $v !== ''));
}
