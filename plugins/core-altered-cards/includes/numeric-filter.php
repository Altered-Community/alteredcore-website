<?php
// Shared numeric-expression validation, upstream query builder, and local disjoint-list
// filtering for card-search pages and the collection/ownership proxies.

/**
 * Normalizes and validates a user-entered numeric filter expression
 * (e.g. "3", "1-3", "4+", "4-", "<4", "1,3", "1 3", "1 - 3").
 * Aligns whitespace grammar with Re:Builder: spaces around operators/ranges collapse while
 * space-separated numbers act as a list ("1 3" -> "1,3"). Returns null when empty or invalid.
 */
function cacValidateNumExpr(?string $raw): ?string
{
    if (!is_string($raw)) return null;
    $s = trim(str_replace(["\u{2013}", "\u{2014}", "\u{2212}"], '-', $raw));
    if ($s === '') return null;
    $s = preg_replace('/(\d)\s*-\s*(\d)/', '$1-$2', $s);
    $s = preg_replace('/(\d)\s*([+-])(?=\s|$|[,;])/', '$1$2', (string)$s);
    $s = preg_replace('/(<=|>=|<|>)\s*(\d)/', '$1$2', (string)$s);
    if ($s === null || $s === '') return null;
    if (preg_match('/^[,;]|[,;]$|[,;]\s*[,;]/', $s)) return null;
    $tokens = preg_split('/[,;\s]+/', $s, -1, PREG_SPLIT_NO_EMPTY);
    if (!$tokens) return null;
    foreach ($tokens as $tok) {
        if (preg_match('/^(?:<=|>=|<|>)\d{1,2}$/', $tok)) continue;
        if (preg_match('/^\d{1,2}[+-]$/', $tok)) continue;
        if (preg_match('/^\d{1,2}-\d{1,2}$/', $tok)) continue;
        if (preg_match('/^\d{1,2}$/', $tok)) continue;
        return null;
    }
    return implode(',', $tokens);
}

/**
 * Single-pass numeric filter planner returning both upstream query parts and local disjoint-set
 * filters so callers never parse numeric query params twice per request.
 *
 * @param array<string, string> $fieldMap incoming param => upstream param & item field
 * @return array{queryParts: list<string>, localFilters: array<string, list<int>>}
 */
function cacPlanNumericFilter(array $get, array $fieldMap): array
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

    return ['queryParts' => $parts, 'localFilters' => $localFilters];
}

/**
 * Translates incoming numeric query params (`$in => $out`) for upstream APIs that support
 * exact (`field=N`) and bound (`field[gte|lte|gt|lt]=N`) predicates, but not `IN` lists.
 *
 * @param array<string, string>      $fieldMap     incoming param => upstream param & item field
 * @param array<string, list<int>>   $localFilters output map of field => allowed integer values
 * @return list<string>
 */
function cacNumericQueryParts(array $get, array $fieldMap, array &$localFilters = []): array
{
    $plan = cacPlanNumericFilter($get, $fieldMap);
    $localFilters = $plan['localFilters'];
    return $plan['queryParts'];
}

/**
 * Returns only the per-field discrete value sets that upstream range filtering cannot express cleanly.
 *
 * @param array<string, string> $fieldMap
 * @return array<string, list<int>>
 */
function cacNumericLocalFilters(array $get, array $fieldMap): array
{
    return cacPlanNumericFilter($get, $fieldMap)['localFilters'];
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
