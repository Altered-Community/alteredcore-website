<?php
// Shared numeric-expression validation, upstream query builder, and local disjoint-list
// filtering for card-search pages and the collection/ownership proxies.

/**
 * Normalizes and validates a user-entered numeric filter expression
 * (e.g. "3", "1-3", "4+", "4-", "<4", "1,3", "1-3, 5"). Returns null when empty or invalid.
 */
function cacValidateNumExpr(?string $raw): ?string
{
    if (!is_string($raw)) return null;
    $s = preg_replace('/\s+/', '', str_replace(["\u{2013}", "\u{2014}", "\u{2212}"], '-', trim($raw)));
    if ($s === null || $s === '') return null;
    $tokens = explode(',', str_replace(';', ',', $s));
    foreach ($tokens as $tok) {
        if ($tok === '') return null;
        if (preg_match('/^(?:<=|>=|<|>)\d{1,2}$/', $tok)) continue;
        if (preg_match('/^\d{1,2}[+-]$/', $tok)) continue;
        if (preg_match('/^\d{1,2}-\d{1,2}$/', $tok)) continue;
        if (preg_match('/^\d{1,2}$/', $tok)) continue;
        return null;
    }
    return implode(',', $tokens);
}

/**
 * Translates incoming numeric query params (`$in => $out`) for upstream APIs that support
 * exact (`field=N`) and bound (`field[gte|lte|gt|lt]=N`) predicates, but not `IN` lists.
 *
 * For discrete arrays like `mainCost[]=1&mainCost[]=3`, emits the tight `[gte]`..`[lte]`
 * envelope for the upstream query and populates `$localFilters[$out]` whenever the set
 * has gaps (disjoint values) so the proxy can filter the exact values before paginating.
 *
 * @param array<string, string>      $fieldMap     incoming param => upstream param & item field
 * @param array<string, list<int>>   $localFilters output map of field => allowed integer values
 * @return list<string>
 */
function cacNumericQueryParts(array $get, array $fieldMap, array &$localFilters = []): array
{
    $parts = [];
    $localFilters = [];

    foreach ($fieldMap as $in => $out) {
        if (!isset($get[$in])) continue;
        $raw = $get[$in];

        if (is_array($raw)) {
            $opParts = [];
            foreach (['gte', 'lte', 'gt', 'lt'] as $op) {
                $v = $raw[$op] ?? null;
                if (is_scalar($v) && $v !== '') {
                    $opParts[] = $out . '[' . $op . ']=' . rawurlencode((string)$v);
                }
            }
            if ($opParts !== []) {
                array_push($parts, ...$opParts);
                continue;
            }

            $vals = [];
            foreach ($raw as $v) {
                if (is_scalar($v) && preg_match('/^\d+$/', trim((string)$v))) {
                    $vals[(int)$v] = true;
                }
            }
            if ($vals === []) continue;

            $sorted = array_keys($vals);
            sort($sorted, SORT_NUMERIC);
            if (count($sorted) === 1) {
                $parts[] = $out . '=' . $sorted[0];
            } else {
                $min = $sorted[0];
                $max = $sorted[count($sorted) - 1];
                $parts[] = $out . '[gte]=' . $min;
                $parts[] = $out . '[lte]=' . $max;
                if (count($sorted) < ($max - $min + 1)) {
                    $localFilters[$out] = $sorted;
                }
            }
            continue;
        }

        if (is_scalar($raw)) {
            $s = trim((string)$raw);
            if ($s !== '' && preg_match('/^\d+$/', $s)) {
                $parts[] = $out . '=' . (int)$s;
            }
        }
    }

    return $parts;
}

/**
 * Returns only the per-field discrete value sets that upstream range filtering cannot express cleanly.
 *
 * @param array<string, string> $fieldMap
 * @return array<string, list<int>>
 */
function cacNumericLocalFilters(array $get, array $fieldMap): array
{
    $localFilters = [];
    cacNumericQueryParts($get, $fieldMap, $localFilters);
    return $localFilters;
}

/**
 * Filters upstream result items in PHP against exact disjoint integer sets.
 *
 * @param array<int, mixed>        $items
 * @param array<string, list<int>> $localFilters
 * @return array<int, mixed>
 */
function cacFilterItemsByNumeric(array $items, array $localFilters): array
{
    if ($localFilters === []) return $items;

    return array_values(array_filter($items, static function ($it) use ($localFilters): bool {
        if (!is_array($it)) return false;
        foreach ($localFilters as $field => $allowed) {
            if (!isset($it[$field]) || !is_numeric($it[$field])) return false;
            if (!in_array((int)$it[$field], $allowed, true)) return false;
        }
        return true;
    }));
}
