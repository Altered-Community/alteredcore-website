<?php
// Decode-only port of altered-bga-api's DeckfmtCodec: the blobs below are the
// exact strings altered-bga-api emits (asserted on its side by
// DeckfmtTests.EncodeList_ProducesExpectedOutput / DecodeList_StillDecodesV1Blobs).
require_once __DIR__ . '/../inc/Deckfmt/Deckfmt.php';

use TournamentReports\Deckfmt\Deckfmt;
use TournamentReports\Deckfmt\DeckfmtConfig;

function trDeckfmtRefs(string $blob): array
{
    $res = Deckfmt::decode($blob);
    if (!$res['ok']) {
        return ['error' => $res['error']];
    }
    return array_map(fn ($c) => $c['quantity'] . ' ' . $c['reference'], $res['cards']);
}

assertSame(2, DeckfmtConfig::latest(), 'latest Deckfmt version is 2');

$core = ['1 ALT_CORE_B_YZ_02_C', '3 ALT_CORE_B_LY_28_C', '2 ALT_CORE_B_NE_01_C'];
assertSame($core, trDeckfmtRefs('IBAg3gh24LwQ'), 'v2 CORE blob decodes');
assertSame($core, trDeckfmtRefs('EBAg3gh24LwQ'), 'v1 CORE blob still decodes');

// MUSUBI: 5 bits in v1 (max 31), 7 bits in v2 (cards go up to 74).
assertSame(['1 ALT_MUSUBI_B_LY_06_C'], trDeckfmtRefs('EBEQWzAA'), 'v1 MUSUBI blob keeps its 5-bit number');
assertSame(['1 ALT_MUSUBI_B_BR_74_R1'], trDeckfmtRefs('IBEQWpRA'), 'v2 MUSUBI_74 decodes');

assertSame(['1 ALT_EOLETOP_A_YZ_105_C'], trDeckfmtRefs('IBFAVbSA'), 'v2 EOLETOP (set id 20) decodes');
assertSame('EOLEOP', DeckfmtConfig::for(2)->setById(21)['code'], 'set id 21 is EOLEOP');
