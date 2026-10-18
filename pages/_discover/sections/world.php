<?php
// Discover, section 2: The world and its art (specifications/discover-02-world.md). Included by pages/discover.php.
// One panel per faction, all in the HTML (readable without script); js/discover.js shows the selected one, keeps the
// URL hash (#world-axiom) and draws the two illustrations from the cards API.
$_factions = [
    ['code' => 'ax', 'slug' => 'axiom',  'marker' => 'AX'],
    ['code' => 'br', 'slug' => 'bravos', 'marker' => 'BR'],
    ['code' => 'ly', 'slug' => 'lyra',   'marker' => 'LY'],
    ['code' => 'mu', 'slug' => 'muna',   'marker' => 'MU'],
    ['code' => 'or', 'slug' => 'ordis',  'marker' => 'OR'],
    ['code' => 'yz', 'slug' => 'yzmir',  'marker' => 'YZ'],
];
$_cardsApi  = defined('CARDS_API_URL') ? CARDS_API_URL : 'https://cards.alteredcore.org';
$_cdn       = defined('CDN_URL') ? CDN_URL : '';
$_worldLang = getLang() === 'fr' ? 'fr' : 'en';
$_setArt    = [];   // key art of six main sets (assets/img/discover/sets, all 729x409), one picked at random for the introduction tab
$_setFile   = dirname(__DIR__, 3) . '/plugins/core-altered-cards/data/altered.json';
$_setData   = is_file($_setFile) ? json_decode(ltrim((string)file_get_contents($_setFile), "ï»¿"), true) : [];
$_setFiles  = ['beyond-the-gates' => 'CORE', 'trial-by-frost' => 'ALIZE', 'whispers-from-the-maze' => 'BISE',
               'skybound-odyssey' => 'CYCLONE', 'seeds-of-unity' => 'DUSTER', 'roots-of-corruption' => 'EOLE'];
foreach ($_setFiles as $_slug => $_k) {
    if (!is_file(dirname(__DIR__, 3) . '/assets/img/discover/sets/' . $_slug . '.webp')) continue;
    $_n = $_setData['sets'][$_k][$_worldLang] ?? $_setData['sets'][$_k]['en'] ?? $_k;
    $_setArt[] = ['src' => BASE_URL . '/assets/img/discover/sets/' . $_slug . '.webp', 'name' => $_n];
}
$_setPick = $_setArt ? $_setArt[array_rand($_setArt)] : null;
?>
<div class="discover-world" id="discover-world"
     data-api="<?= h($_cardsApi) ?>" data-cdn="<?= h($_cdn) ?>" data-locale="<?= h($_worldLang) ?>"
     data-credit="<?= h($tx['world.credit'] ?? '') ?>">

    <p class="discover-lead"><?= pageText($tx, 'world.lead') ?></p>

    <div class="discover-chips" role="tablist" aria-label="<?= pageText($tx, 'world.chips.label') ?>">
        <button type="button" class="discover-chip" role="tab" id="world-tab-intro"
                aria-controls="world-panel-intro" aria-selected="true" tabindex="0" data-faction="intro">
            <?php /* The icon of the set Beyond the Gates (Altered icon font), as in the cards page. */ ?>
            <i class="fa-kit fa-ext-coreset discover-chip__icon" aria-hidden="true"></i>
            <span class="discover-chip__name"><?= pageText($tx, 'world.intro.name') ?></span>
        </button>
        <?php foreach ($_factions as $i => $f): ?>
            <button type="button" class="discover-chip" role="tab" id="world-tab-<?= h($f['slug']) ?>"
                    aria-controls="world-panel-<?= h($f['slug']) ?>" aria-selected="false" tabindex="-1" data-faction="<?= h($f['slug']) ?>">
                <img class="discover-chip__logo" src="<?= h(BASE_URL) ?>/plugins/core-altered-cards/assets/faction/<?= h($f['marker']) ?>.png" alt="" width="32" height="32">
                <span class="discover-chip__name"><?= pageText($tx, 'world.faction.' . $f['code'] . '.name') ?></span>
            </button>
        <?php endforeach; ?>
    </div>

    <div class="discover-faction" role="tabpanel" id="world-panel-intro" aria-labelledby="world-tab-intro" data-faction="intro">
        <div class="discover-faction__text">
            <?php for ($_b = 1; $_b <= 3; $_b++): ?>
                <h3 class="discover-faction__label"><?= pageText($tx, "world.intro.$_b.title") ?></h3>
                <p class="discover-faction__copy"><?= pageText($tx, "world.intro.$_b.body") ?></p>
            <?php endfor; ?>
        </div>
        <?php if ($_setPick): ?>
            <figure class="discover-set" data-images="<?= h(json_encode($_setArt, JSON_UNESCAPED_UNICODE)) ?>"
                    data-alt="<?= h($tx['world.intro.art.alt'] ?? '{set}') ?>">
                <img class="discover-set__img" src="<?= h($_setPick['src']) ?>"
                     alt="<?= h(str_replace('{set}', $_setPick['name'], $tx['world.intro.art.alt'] ?? '{set}')) ?>">
                <figcaption class="discover-set__caption"><?= h($_setPick['name']) ?></figcaption>
            </figure>
        <?php endif; ?>
    </div>

    <?php foreach ($_factions as $i => $f): ?>
        <?php $_name = $tx['world.faction.' . $f['code'] . '.name'] ?? $f['slug']; ?>
        <div class="discover-faction" role="tabpanel" id="world-panel-<?= h($f['slug']) ?>"
             aria-labelledby="world-tab-<?= h($f['slug']) ?>" data-faction="<?= h($f['slug']) ?>" data-code="<?= h(strtoupper($f['code'])) ?>"
             hidden>
            <div class="discover-faction__text">
                <h3 class="discover-faction__name"><?= h($_name) ?></h3>
                <p class="discover-faction__label"><?= pageText($tx, 'world.label.lore') ?></p>
                <p class="discover-faction__copy"><?= pageText($tx, 'world.faction.' . $f['code'] . '.lore') ?></p>
                <p class="discover-faction__label"><?= pageText($tx, 'world.label.play') ?></p>
                <p class="discover-faction__copy"><?= pageText($tx, 'world.faction.' . $f['code'] . '.play') ?></p>
                <a class="discover-faction__link" href="<?= h(BASE_URL) ?>/pages/cards?faction[]=<?= h(strtoupper($f['code'])) ?>">
                    <?= h(str_replace('{faction}', $_name, $tx['world.link.cards'] ?? '')) ?> <?= ac_icon('arrow-right', 'ac-icon--14') ?>
                </a>
            </div>
            <div class="discover-faction__art">
                <?php foreach (['hero', 'card'] as $_slot): ?>
                    <figure class="discover-art" data-slot="<?= $_slot ?>">
                        <div class="discover-art__frame"><img class="discover-art__img" alt="" hidden></div>
                        <figcaption class="discover-art__credit"></figcaption>
                    </figure>
                <?php endforeach; ?>
            </div>
        </div>
    <?php endforeach; ?>

    <p class="discover-world__human"><?= pageText($tx, 'world.human') ?></p>

    <p class="discover-world__links">
        <a class="discover-world__link" href="<?= h(BASE_URL) ?>/pages/cards"><?= pageText($tx, 'world.links.browse') ?> <?= ac_icon('arrow-right', 'ac-icon--14') ?></a>
        <a class="discover-world__link" href="https://alteredtcg.wiki.gg/" target="_blank" rel="noopener"><?= pageText($tx, 'world.links.wiki') ?> <?= ac_icon('arrow-right', 'ac-icon--14') ?></a>
    </p>
</div>
