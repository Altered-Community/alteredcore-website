<?php

// cacCardFormatVerdict(): the card page's "Legal in / Not legal in" rows, from the rules GET /api/formats publishes.

$sets = ['CORE', 'COREKS', 'BISE', 'ALIZE', 'CYCLONE', 'DUSTER', 'EOLE'];
$standard = [
    'code' => 'standard', 'allowBanned' => false, 'allowSuspended' => false,
    'limits' => ['unique' => 3], 'sets' => ['allowed' => $sets, 'forbidden' => ['FUGUE']],
    'bannedCards' => ['ALT_CORE_B_YZ_09_C'], 'suspendedCards' => ['BR_34_C', 'OR_27_R1', 'AX_17'], 'uniqueAllowlist' => null,
];
$nuc      = ['code' => 'nuc', 'limits' => ['unique' => 0]] + $standard;
$frontier = ['code' => 'frontier', 'uniqueAllowlist' => ['ALT_CORE_B_OR_09_U_4261']] + $standard;
$sandbox  = ['code' => 'sandbox', 'allowBanned' => true, 'allowSuspended' => true, 'bannedCards' => [], 'suspendedCards' => []] + $standard;
$sealed   = ['code' => 'sealed', 'allowBanned' => true, 'allowSuspended' => true, 'limits' => ['unique' => null],
             'sets' => ['allowed' => [], 'forbidden' => []], 'bannedCards' => [], 'suspendedCards' => [], 'uniqueAllowlist' => null];

assertSame(true, cacCardFormatVerdict('ALT_CORE_B_AX_04_C', $standard), 'verdict: plain card in an allowed set');
assertSame(false, cacCardFormatVerdict('ALT_CORE_B_YZ_09_C', $standard), 'verdict: banned by reference');
assertSame(false, cacCardFormatVerdict('ALT_CORE_A_YZ_09_C', $standard), 'verdict: banned reference covers its alt art (booster reference)');
assertSame(false, cacCardFormatVerdict('ALT_ALIZE_B_BR_34_C', $standard), 'verdict: suspended by family + rarity, any set');
assertSame(true, cacCardFormatVerdict('ALT_CORE_B_BR_34_R1', $standard), 'verdict: another rarity of a family+rarity entry is fine');
assertSame(false, cacCardFormatVerdict('ALT_CORE_B_OR_27_R1', $standard), 'verdict: suspended R1');
assertSame(false, cacCardFormatVerdict('ALT_CORE_B_AX_17_R2', $standard), 'verdict: suspended whole family');
assertSame(true, cacCardFormatVerdict('ALT_CORE_B_BR_34_C', $sandbox), 'verdict: sandbox allows suspended cards');

assertSame(true, cacCardFormatVerdict('ALT_CORE_B_AX_05_U_42', $standard), 'verdict: Unique in standard');
assertSame(false, cacCardFormatVerdict('ALT_CORE_B_AX_05_U_42', $nuc), 'verdict: no Unique in NUC');
assertSame(true, cacCardFormatVerdict('ALT_CORE_B_OR_09_U_4261', $frontier), 'verdict: allowlisted Unique in Frontier');
assertSame(false, cacCardFormatVerdict('ALT_CORE_B_OR_09_U_4262', $frontier), 'verdict: Unique not on the Frontier allowlist');
assertSame(true, cacCardFormatVerdict('ALT_CORE_B_AX_04_C', $frontier), 'verdict: the allowlist only concerns Uniques');

assertSame(null, cacCardFormatVerdict('ALT_FUGUE_B_AX_04_C', $standard), 'verdict: forbidden set -> unknown (a reprint may be legal)');
assertSame(null, cacCardFormatVerdict('ALT_NEWSET_B_AX_04_C', $standard), 'verdict: set not in the allowed list -> unknown');
assertSame(null, cacCardFormatVerdict('ALT_CORE_B_AX_04_C', $sealed), 'verdict: sealed (pool) -> unknown');
assertSame(null, cacCardFormatVerdict('not-a-ref', $standard), 'verdict: invalid reference -> unknown');

$all = cacCardFormatVerdicts('ALT_CORE_B_AX_05_U_42', [$standard, $nuc, ['code' => 'Test', 'hidden' => true] + $standard, 'junk']);
assertSame(['standard' => true, 'nuc' => false], $all, 'verdicts: by lower-case code, hidden formats and junk skipped');
