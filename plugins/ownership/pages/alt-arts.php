<?php
// « Arts alternatifs par défaut » tab of the Digital Ownership hub — lets a player browse
// every card family with more than one known illustration, see which prints they own, and
// assign their up-to-3 copy markers (1 for heroes/tokens): the illustration each copy takes
// when the card is added to a deck in Re:Builder (a deck can then change it), and the one of
// each token in every deck (see includes/func.alt-arts.php at the site's root). Talks to the AlteredOwnership /api/alt-arts/* endpoints
// via the papi proxies in ../api/alt-art-search.php and ../api/alt-art-set-preference.php
// — never directly (see ownApiRequestRaw()). Deliberately its own lightweight markup
// (filters + one row per family) rather than core-altered-cards' card-search.php widget,
// which is built around a paginated grid of individual cards, not per-family rows with
// marker assignment.
require_once __DIR__ . '/../includes/functions.php';

$txt = [
    'en' => [
        'unavailable'   => 'The digital ownership service is not configured on this site.',
        'anon_login'    => 'Log in / Sign up',
        'search_ph'     => 'Search by name…',
        'search_btn'    => 'Search',
        'lbl_faction'   => 'Faction',
        'lbl_type'      => 'Type',
        'lbl_rarity'    => 'Rarity',
        'lbl_cost'      => 'Mana cost',
        'hideNonChoices' => 'Hide non-choices',
        'loading'       => 'Loading…',
        'empty'         => 'No matching card has more than one illustration.',
        'loadError'     => 'Could not load alt arts.',
        'networkError'  => 'Network error.',
        'saveError'     => 'Could not save your choice.',
        'loadMore'      => 'Load more',
        'markerHint'    => 'Click a marker, then click a card to move it there.',
        'intro'         => 'Choose the illustration each copy of a card takes when you add it to a deck (1st, 2nd and 3rd copy). In Re:Builder, the brush of a card changes its illustrations for one deck, and « Default alt arts » applies these choices to a deck again. A token\'s illustration is the same in all your decks.',
    ],
    'fr' => [
        'unavailable'   => 'Le service de propriété numérique n\'est pas configuré sur ce site.',
        'anon_login'    => 'Se connecter / S\'inscrire',
        'search_ph'     => 'Rechercher par nom…',
        'search_btn'    => 'Rechercher',
        'lbl_faction'   => 'Faction',
        'lbl_type'      => 'Type',
        'lbl_rarity'    => 'Rareté',
        'lbl_cost'      => 'Coût en mana',
        'hideNonChoices' => 'Masquer les non-choix',
        'loading'       => 'Chargement…',
        'empty'         => 'Aucune carte correspondante n\'a plus d\'une illustration.',
        'loadError'     => 'Impossible de charger les illustrations alternatives.',
        'networkError'  => 'Erreur réseau.',
        'saveError'     => 'Impossible d\'enregistrer votre choix.',
        'loadMore'      => 'Charger plus',
        'markerHint'    => 'Cliquez un marqueur, puis une carte pour l\'y déplacer.',
        'intro'         => 'Choisissez l\'illustration que prend chaque exemplaire d\'une carte quand vous l\'ajoutez à un deck (1er, 2e et 3e exemplaire). Dans Re:Builder, le pinceau d\'une carte change ses illustrations pour un deck, et « Arts par défaut » réapplique ces choix à un deck. L\'illustration d\'un jeton est la même dans tous vos decks.',
    ],
][getUiLang()];

$ownEnabled  = defined('OWNERSHIP_API_URL') && OWNERSHIP_API_URL;
$ownLoggedIn = kcIsLoggedIn();
$ownActiveTab = 'alt-arts';

// Reading the mode switches a player still in « Global » to « par deck » (default alt arts replace it).
if ($ownEnabled && $ownLoggedIn) ownGetAltArtPreferenceMode((int)($_SESSION['user_id'] ?? 0));

$cacDir = dirname(__DIR__, 2) . '/core-altered-cards';
$cacAvailable = is_file($cacDir . '/includes/functions.php');
if ($cacAvailable) {
    require_once $cacDir . '/includes/functions.php';
    $factionsData = loadAlteredData('factions');
    $raritiesData = loadAlteredData('rarities');
    $typesData    = loadAlteredData('types');
} else {
    $factionsData = [];
    $raritiesData = [];
    $typesData    = [];
}
// The catalog never contains Unique-rarity prints (the 1-of-1 Hero card itself has no alt
// art), so that rarity is never a useful filter here. The HERO card type does have alt
// arts though: it's the Common-rarity companion print bundled with boosters (e.g. "Kauri
// & Puff"), not the unique Hero — see AlteredOwnership's CardArtCatalog — so it stays in
// the type filter.
$raritiesData = array_filter($raritiesData, fn($r) => ($r['gem'] ?? '') !== 'U');

$uiLang = getUiLang();
?>
<div class="ac-page">

    <?php if (!$ownEnabled): ?>
    <div class="ac-notice ac-notice--warning" role="status"><?= ac_icon('triangle-alert') ?><div><?= h($txt['unavailable']) ?></div></div>
    <?php else: ?>

    <?php require __DIR__ . '/../includes/subnav.php'; ?>

    <?php if (!$ownLoggedIn): ?>
    <div class="ac-card">
        <a href="<?= h(BASE_URL) ?>/pages/login" class="ac-button ac-button--sm">
            <?= ac_icon('log-in') ?><?= h($txt['anon_login']) ?>
        </a>
    </div>
    <?php else: ?>

    <!-- core-altered-cards' stylesheet isn't auto-loaded on this plugin's own pages —
         only this plugin's assets/style.css is (see plugin.json) — but .filter-row/
         .filter-toggle below come from it. -->
    <link rel="stylesheet" href="<?= h(BASE_URL) ?>/plugins/core-altered-cards/assets/style.css">

    <p class="mb-3"><?= h($txt['intro']) ?></p>

    <div class="ac-card mb-3">
        <div class="filter-row mb-2">
            <input type="text" id="own-aa-search" class="ac-input own-aa-search"
                   aria-label="<?= h($txt['search_ph']) ?>" placeholder="<?= h($txt['search_ph']) ?>">
            <button type="button" id="own-aa-search-btn" class="ac-button ac-button--sm">
                <?= h($txt['search_btn']) ?>
            </button>
        </div>
        <div class="filter-row mb-2">
            <span class="filter-label"><?= h($txt['lbl_faction']) ?></span>
            <?php foreach ($factionsData as $fCode => $fData): ?>
            <button type="button" class="filter-toggle" data-filter="faction" data-value="<?= h($fCode) ?>"
                    title="<?= h($fData[$uiLang] ?? $fData['en'] ?? $fCode) ?>">
                <img src="<?= h(BASE_URL) ?>/plugins/core-altered-cards/assets/faction/<?= h($fCode) ?>.png" alt="<?= h($fCode) ?>">
                <?= h($fData[$uiLang] ?? $fData['en'] ?? $fCode) ?>
            </button>
            <?php endforeach; ?>
        </div>
        <div class="filter-row mb-2">
            <span class="filter-label"><?= h($txt['lbl_type']) ?></span>
            <?php foreach ($typesData as $tCode => $tData): ?>
            <button type="button" class="filter-toggle" data-filter="type" data-value="<?= h($tCode) ?>">
                <?= h($tData[$uiLang] ?? $tData['en'] ?? $tCode) ?>
            </button>
            <?php endforeach; ?>
        </div>
        <div class="filter-row mb-2">
            <span class="filter-label"><?= h($txt['lbl_rarity']) ?></span>
            <?php foreach ($raritiesData as $rCode => $rData): ?>
            <button type="button" class="filter-toggle" data-filter="rarity" data-value="<?= h($rData['gem'] ?? substr($rCode, 0, 1)) ?>">
                <img src="<?= h(BASE_URL) ?>/plugins/core-altered-cards/assets/gems/<?= h($rData['gem'] ?? substr($rCode, 0, 1)) ?>.png"
                     alt="<?= h($rCode) ?>" class="own-aa-gem">
                <?= h($rData[$uiLang] ?? $rData['en'] ?? $rCode) ?>
            </button>
            <?php endforeach; ?>
        </div>
        <div class="filter-row mb-2">
            <span class="filter-label"><?= h($txt['lbl_cost']) ?></span>
            <?php for ($c = 0; $c <= 6; $c++): ?>
            <button type="button" class="filter-toggle" data-filter="mainCost" data-value="<?= $c ?>">
                <?= $c === 6 ? '6+' : $c ?>
            </button>
            <?php endfor; ?>
        </div>
        <div class="filter-row mb-0">
            <button type="button" id="own-aa-hide-non-choices" class="filter-toggle active" data-bool-filter="hideNonChoices">
                <?= ac_icon('eye-off') ?> <?= h($txt['hideNonChoices']) ?>
            </button>
        </div>
    </div>

    <p class="ac-text-small ac-text-muted mb-2"><?= h($txt['markerHint']) ?></p>

    <div id="own-aa-loading" class="text-muted"><?= h($txt['loading']) ?></div>
    <div id="own-aa-empty" class="text-muted" hidden><?= h($txt['empty']) ?></div>
    <div id="own-aa-error" class="alert alert-danger" hidden></div>
    <div id="own-aa-results"></div>
    <div class="text-center my-3">
        <button type="button" id="own-aa-load-more" class="ac-button ac-button--secondary ac-button--sm" hidden>
            <?= h($txt['loadMore']) ?>
        </button>
    </div>

    <meta name="csrf-token" content="<?= h(csrfToken()) ?>">
    <script>
    window.OWN_I18N = { <?= h($uiLang) ?>: <?= json_encode($txt, JSON_UNESCAPED_UNICODE) ?> };
    window.OWN_AA_CONFIG = {
        searchUrl: <?= json_encode(BASE_URL . '/papi/ownership/alt-art-search') ?>,
        setPreferenceUrl: <?= json_encode(BASE_URL . '/papi/ownership/alt-art-set-preference') ?>,
        baseUrl: <?= json_encode(BASE_URL) ?>,
        cdnUrl: <?= json_encode(CDN_URL) ?>,
        lang: <?= json_encode(getLang()) ?>,
        markerImg: <?= json_encode(BASE_URL . '/plugins/ownership/assets/selected_alt.png') ?>,
        csrfToken: <?= json_encode(csrfToken()) ?>,
    };
    </script>

    <?php endif; ?>
    <?php endif; ?>
</div>
