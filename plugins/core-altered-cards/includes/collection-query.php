<?php
// Query string of the collection API (GET /api/collection) from the collection-search proxy's own query.
require_once __DIR__ . '/numeric-filter.php';

/** @return array<string, string> */
function cacCollectionNumericFields(): array
{
    return [
        'mainCost'      => 'mainCost',
        'recallCost'    => 'recallCost',
        'oceanPower'    => 'oceanPower',
        'mountainPower' => 'mountainPower',
        'forestPower'   => 'forestPower',
    ];
}

/**
 * Single-pass collection query planner returning the upstream query string plus any multi-value
 * local filters (`cardType`, `subTypes`, disjoint numeric lists) enforced in PHP.
 *
 * @return array{query: string, localTypes: ?list<string>, localSubTypes: ?list<string>, localNumeric: array<string, list<int>>}
 */
function cacPlanCollectionQuery(array $get): array
{
    $arrays = ['faction', 'rarity', 'variation', 'cardSet'];
    $types = cacCollectionValues($get, 'cardType');
    if (count($types) === 1) $arrays[] = 'cardType';
    $subTypes = cacCollectionValues($get, 'subTypes');
    $scalar = ['isFoil', 'isBanned', 'isSuspended', 'cardReference', 'name', 'locale'];
    if (count($subTypes) === 1) $scalar[] = 'subTypes';

    $parts = [];
    foreach ($arrays as $k) {
        foreach (cacCollectionValues($get, $k) as $v) $parts[] = $k . '[]=' . rawurlencode($v);
    }
    foreach ($scalar as $k) {
        $v = $get[$k] ?? null;
        if (is_array($v)) $v = $v[0] ?? null;
        if (is_string($v) && $v !== '') $parts[] = $k . '=' . rawurlencode($v);
    }
    $numPlan = cacPlanNumericFilter($get, cacCollectionNumericFields());
    array_push($parts, ...$numPlan['queryParts']);

    return [
        'query'         => implode('&', $parts),
        'localTypes'    => count($types) > 1 ? $types : null,
        'localSubTypes' => count($subTypes) > 1 ? $subTypes : null,
        'localNumeric'  => $numPlan['localFilters'],
    ];
}

/**
 * List filters go out as `key[]=v` (the API's array form): a repeated `key=v` keeps the last value only, so a
 * search on three rarities or several sets came back with one. The API fails (HTTP 500) on several card types:
 * those go out only when there is one, the proxy filters the others itself (cacCollectionLocalTypes).
 */
function cacCollectionQuery(array $get): string
{
    return cacPlanCollectionQuery($get)['query'];
}

/** Disjoint numeric value sets that the collection proxy enforces in PHP after the upstream `[gte]..[lte]` query. */
function cacCollectionLocalNumeric(array $get): array
{
    return cacPlanNumericFilter($get, cacCollectionNumericFields())['localFilters'];
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
