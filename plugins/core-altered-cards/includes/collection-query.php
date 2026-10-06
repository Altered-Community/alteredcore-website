<?php
// Query string of the collection API (GET /api/collection) from the collection-search proxy's own query.

/**
 * List filters go out as `key[]=v` (the API's array form): a repeated `key=v` keeps the last value only, so a
 * search on three rarities or several sets came back with one.
 */
function cacCollectionQuery(array $get): string
{
    $arrays = ['faction', 'rarity', 'cardType', 'variation', 'cardSet'];
    $scalar = ['isFoil', 'isBanned', 'isSuspended', 'cardReference', 'name', 'subTypes', 'locale'];
    $range  = ['mainCost', 'recallCost', 'oceanPower', 'mountainPower', 'forestPower'];

    $parts = [];
    foreach ($arrays as $k) {
        $vals = array_values(array_filter((array)($get[$k] ?? []), fn($v) => is_string($v) && $v !== ''));
        foreach ($vals as $v) $parts[] = $k . '[]=' . rawurlencode($v);
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
