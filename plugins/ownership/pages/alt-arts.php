<?php
// "Alt Arts BGA" tab of the Digital Ownership hub — lets a player browse every card
// family with more than one known illustration, see which prints they own, and assign
// their up-to-3 copy markers (1 for heroes/tokens) to the art shown when that card is
// played on Board Game Arena. Talks to the AlteredOwnership /api/alt-arts/* endpoints
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
    ],
    'fr' => [
        'unavailable'   => 'Le service de propriété numérique n\'est pas configuré sur ce site.',
        'anon_login'    => 'Se connecter / S\'inscrire',
        'search_ph'     => 'Rechercher par nom…',
        'search_btn'    => 'Rechercher',
        'lbl_faction'   => 'Faction',
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
    ],
][getUiLang()];

$ownEnabled  = defined('OWNERSHIP_API_URL') && OWNERSHIP_API_URL;
$ownLoggedIn = kcIsLoggedIn();
$ownActiveTab = 'alt-arts';

$cacDir = dirname(__DIR__, 2) . '/core-altered-cards';
$cacAvailable = is_file($cacDir . '/includes/functions.php');
if ($cacAvailable) {
    require_once $cacDir . '/includes/functions.php';
    $factionsData = loadAlteredData('factions');
    $raritiesData = loadAlteredData('rarities');
} else {
    $factionsData = [];
    $raritiesData = [];
}
// The catalog never contains Unique-rarity prints (heroes/uniques have no alt art —
// see AlteredOwnership's CardArtCatalog), so that rarity is never a useful filter here.
$raritiesData = array_filter($raritiesData, fn($r) => ($r['gem'] ?? '') !== 'U');

$uiLang = getUiLang();
?>
<div class="container py-4">

    <?php if (!$ownEnabled): ?>
    <div class="alert alert-warning"><?= h($txt['unavailable']) ?></div>
    <?php else: ?>

    <?php require __DIR__ . '/../includes/subnav.php'; ?>

    <?php if (!$ownLoggedIn): ?>
    <div class="card-altered p-4">
        <a href="<?= h(BASE_URL) ?>/pages/login" class="btn btn-sm btn-primary-altered">
            <i class="fa-solid fa-right-to-bracket me-1"></i><?= h($txt['anon_login']) ?>
        </a>
    </div>
    <?php else: ?>

    <!-- core-altered-cards' stylesheet isn't auto-loaded on this plugin's own pages —
         only this plugin's assets/style.css is (see plugin.json) — but .filter-row/
         .filter-toggle/.card-altered below all come from it. -->
    <link rel="stylesheet" href="<?= h(BASE_URL) ?>/plugins/core-altered-cards/assets/style.css">

    <div class="card-altered p-3 mb-3">
        <div class="filter-row mb-2">
            <input type="text" id="own-aa-search" class="form-control form-control-sm"
                   style="max-width:260px" placeholder="<?= h($txt['search_ph']) ?>">
            <button type="button" id="own-aa-search-btn" class="btn btn-sm btn-primary-altered">
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
            <span class="filter-label"><?= h($txt['lbl_rarity']) ?></span>
            <?php foreach ($raritiesData as $rCode => $rData): ?>
            <button type="button" class="filter-toggle" data-filter="rarity" data-value="<?= h($rData['gem'] ?? substr($rCode, 0, 1)) ?>">
                <img src="<?= h(BASE_URL) ?>/plugins/core-altered-cards/assets/gems/<?= h($rData['gem'] ?? substr($rCode, 0, 1)) ?>.png"
                     alt="<?= h($rCode) ?>" style="width:15px;height:15px">
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
            <button type="button" id="own-aa-hide-non-choices" class="filter-toggle" data-bool-filter="hideNonChoices">
                <i class="fa-solid fa-eye-slash"></i> <?= h($txt['hideNonChoices']) ?>
            </button>
        </div>
    </div>

    <div class="text-muted small mb-2"><?= h($txt['markerHint']) ?></div>

    <div id="own-aa-loading" class="text-muted"><?= h($txt['loading']) ?></div>
    <div id="own-aa-empty" class="text-muted" hidden><?= h($txt['empty']) ?></div>
    <div id="own-aa-error" class="alert alert-danger" hidden></div>
    <div id="own-aa-results"></div>
    <div class="text-center my-3">
        <button type="button" id="own-aa-load-more" class="btn btn-sm btn-outline-secondary" hidden>
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
    };
    </script>

    <?php endif; ?>
    <?php endif; ?>
</div>
