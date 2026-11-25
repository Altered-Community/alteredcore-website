<?php

// Tests for unified CardV2 adaptation & keyword code expansion in cacCardsApiBatch().

assertSame('[Fugace]', cacPrintKeywordCodes('[FLEETING]', 'fr'), 'keyword codes: FLEETING -> fr');
assertSame('[Fleeting]', cacPrintKeywordCodes('[FLEETING]', 'en'), 'keyword codes: FLEETING -> en');
assertSame('[Vergänglich]', cacPrintKeywordCodes('[FLEETING]', 'de'), 'keyword codes: FLEETING -> de');
assertSame('[Fugacidad]', cacPrintKeywordCodes('[FLEETING]', 'es'), 'keyword codes: FLEETING -> es');
assertSame('[Fugace]', cacPrintKeywordCodes('[FLEETING]', 'it'), 'keyword codes: FLEETING -> it');

assertSame('Les jetons sont [Défenseurs].', cacPrintKeywordCodes('Les jetons sont [DEFENDER_TKN_P].', 'fr'), 'keyword codes: DEFENDER_TKN_P -> fr');
assertSame('Les jetons sont [Défenseur].', cacPrintKeywordCodes('Les jetons sont [DEFENDER_XYZ_P].', 'fr'), 'keyword codes: suffixed variant prefix fallback');
assertSame('Gains [Tough 7].', cacPrintKeywordCodes('Gains [TOUGH_7].', 'en'), 'keyword codes: numbered TOUGH_7 -> en');
assertSame('Gagne [Coriace 7].', cacPrintKeywordCodes('Gagne [TOUGH_7].', 'fr'), 'keyword codes: numbered TOUGH_7 -> fr');
assertSame('Unknown [NOT_A_REAL_CODE] stays intact', cacPrintKeywordCodes('Unknown [NOT_A_REAL_CODE] stays intact', 'en'), 'keyword codes: unknown code preserved');

$uniqueV2 = [
    'reference'       => 'ALT_CORE_B_AX_04_U_1234',
    'name'            => ['en_US' => 'Kelon Elemental', 'fr_FR' => 'Élémentaire de Kélon'],
    'artist'          => 'Tarakanovich',
    'set'             => ['reference' => 'CORE', 'name' => 'Beyond the Gates', 'code' => 'BTG'],
    'cardSubTypes'    => [['reference' => 'ELEMENTAL', 'name' => ['en_US' => 'Elemental', 'fr_FR' => 'Élémentaire']]],
    'mainCost'        => 3,
    'recallCost'      => 2,
    'forestPower'     => 2,
    'mountainPower'   => 3,
    'oceanPower'      => 1,
    'faction'         => ['code' => 'AX', 'name' => 'Axiom'],
    'mainEffect'      => ['en_US' => '{J} Gain [FLEETING].', 'fr_FR' => '{J} Gagne [FLEETING].'],
    'echoEffect'      => ['en_US' => '{D} [RESUPPLY].', 'fr_FR' => '{D} [RESUPPLY].'],
    'collectorNumber' => 'BTG-004-U-1234',
    'legalFormats'    => ['standard', 'frontier'],
];

$uCard = cacAdaptV2Card($uniqueV2);
assertSame('ALT_CORE_B_AX_04_U_1234', $uCard['reference'], 'adapt V2 unique: reference');
assertSame('Élémentaire de Kélon', $uCard['name']['fr'], 'adapt V2 unique: localized fr name');
assertSame('UNIQUE', $uCard['rarity']['reference'], 'adapt V2 unique: default UNIQUE rarity');
assertSame('CHARACTER', $uCard['cardType']['reference'], 'adapt V2 unique: default CHARACTER type');
assertSame('Personnage', $uCard['cardType']['name']['fr'], 'adapt V2 unique: default fr type name');
assertSame('Élémentaire', $uCard['cardSubTypes'][0]['name']['fr'], 'adapt V2 unique: subtype fr name');
assertSame('{J} Gagne [Fugace].', $uCard['mainEffect']['fr'], 'adapt V2 unique: mainEffect keyword expanded');
assertSame('{D} [Ravitaillez].', $uCard['echoEffect']['fr'], 'adapt V2 unique: echoEffect keyword expanded');
assertSame('BTG-004-U-1234', $uCard['collectorNumberFormatedId'], 'adapt V2 unique: collectorNumberFormatedId');
assertSame([['name' => 'Tarakanovich']], $uCard['artists'], 'adapt V2 unique: artists array');
assertSame(['standard', 'frontier'], $uCard['legalFormats'], 'adapt V2 unique: legalFormats');
assertSame(['STANDARD', 'FRONTIER'], $uCard['gameplayFormat'], 'adapt V2 unique: gameplayFormat');

$nonUniqueV2 = [
    'reference'   => 'ALT_CORE_B_OR_03_C',
    'name'        => ['en_US' => 'Sigismar & Wingspan', 'fr_FR' => 'Sigismar & Wingspan'],
    'rarity'      => ['reference' => 'COMMON', 'name' => 'Common'],
    'cardType'    => ['reference' => 'HERO', 'name' => ['en_US' => 'Hero', 'fr_FR' => 'Héros']],
    'faction'     => ['code' => 'OR', 'name' => 'Ordis'],
    'set'         => ['reference' => 'CORE', 'name' => 'Beyond the Gates', 'code' => 'BTG'],
    'mainEffect'  => ['fr_FR' => 'Les jetons sont [DEFENDER_TKN_P].'],
    'echoEffect'  => [],
    'isBanned'    => false,
    'isErrated'   => true,
    'isSuspended' => false,
];

$nuCard = cacAdaptV2Card($nonUniqueV2);
assertSame('COMMON', $nuCard['rarity']['reference'], 'adapt V2 nonunique: rarity preserved');
assertSame('HERO', $nuCard['cardType']['reference'], 'adapt V2 nonunique: cardType preserved');
assertSame('Héros', $nuCard['cardType']['name']['fr'], 'adapt V2 nonunique: cardType fr name');
assertSame('Les jetons sont [Défenseurs].', $nuCard['mainEffect']['fr'], 'adapt V2 nonunique: suffixed keyword expanded');
assertSame(true, $nuCard['isErrated'], 'adapt V2 nonunique: isErrated preserved');
assertSame(false, $nuCard['isBanned'], 'adapt V2 nonunique: isBanned preserved');
