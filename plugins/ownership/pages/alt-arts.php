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
        'modePerDeck'   => 'Set per deck',
        'modeGlobal'    => 'Set globally',
        'modeInfoBtn'   => 'What\'s the difference?',
        'modeInfoTitle' => 'Per deck vs. global illustrations',
        'modePerDeckTitle' => 'Per deck (default)',
        'modePerDeckDesc'  => "Clicking a card no longer shows the illustration preference. Only tokens can be changed on this page. In the deckbuilder, you choose each card's and the hero's illustration individually while building the deck.",
        'modeGlobalTitle'  => 'Global',
        'modeGlobalDesc'   => 'Your illustration preferences are set here or by clicking a card, and apply automatically everywhere: opening a deck to edit it, duplicating it, importing it, retrieving it from BGA, and whenever you change a card\'s quantity. The deckbuilder no longer lets you change illustrations card by card, and there is no "apply preferences" button — it always applies.',
        'modeClose'     => 'Close',
        'modeSaving'    => 'Saving…',
        'modeSaveError' => 'Could not save your setting.',
        'perDeckNotice' => 'Per-deck mode is on: only token illustrations are managed here. Regular cards\' illustrations are chosen individually in each deck, in the deckbuilder.',
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
        'modePerDeck'   => 'Définir par deck',
        'modeGlobal'    => 'Définir au global',
        'modeInfoBtn'   => 'Quelle est la différence ?',
        'modeInfoTitle' => 'Illustrations par deck ou au global',
        'modePerDeckTitle' => 'Par deck (par défaut)',
        'modePerDeckDesc'  => "Le changement des préférences d'une carte n'est pas visible lorsque l'on clique sur une carte. Seuls les jetons sont modifiables sur cette page. Dans le deckbuilder, vous choisissez l'illustration de chaque carte et du héros individuellement pendant la construction du deck.",
        'modeGlobalTitle'  => 'Global',
        'modeGlobalDesc'   => "Vos préférences d'illustration sont modifiables ici ou en cliquant sur une carte, et s'appliquent automatiquement partout : à l'ouverture d'un deck pour le modifier, à sa duplication, à son import, à sa récupération depuis BGA, et à chaque changement du nombre d'exemplaires d'une carte. Le deckbuilder ne permet plus de changer les illustrations carte par carte, et il n'y a plus de bouton \"appliquer mes préférences\" — c'est toujours appliqué.",
        'modeClose'     => 'Fermer',
        'modeSaving'    => 'Enregistrement…',
        'modeSaveError' => 'Impossible d\'enregistrer votre choix.',
        'perDeckNotice' => 'Le mode par deck est actif : seuls les jetons sont gérés ici. Les illustrations des cartes normales se choisissent individuellement dans chaque deck, dans le deckbuilder.',
    ],
][getUiLang()];

$ownEnabled  = defined('OWNERSHIP_API_URL') && OWNERSHIP_API_URL;
$ownLoggedIn = kcIsLoggedIn();
$ownActiveTab = 'alt-arts';

$userId = (int)($_SESSION['user_id'] ?? 0);
$altArtMode = ($ownEnabled && $ownLoggedIn) ? ownGetAltArtPreferenceMode($userId) : 'PerDeck';
$isGlobalMode = $altArtMode === 'Global';

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

// Per-deck mode: this page only manages token illustrations — regular card alt-arts are
// chosen per deck in the deckbuilder instead. Enforced again server-side in
// api/alt-art-search.php; this is just what the type-filter row offers.
if (!$isGlobalMode) {
    $typesData = array_filter($typesData, fn($code) => strpos($code, 'TOKEN') === 0, ARRAY_FILTER_USE_KEY);
}

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

    <div class="card-altered p-3 mb-3 d-flex flex-wrap align-items-center gap-2">
        <div class="btn-group btn-group-sm" role="group" aria-label="alt-art mode">
            <button type="button" id="own-aa-mode-perdeck" class="btn btn-outline-secondary<?= $isGlobalMode ? '' : ' active' ?>">
                <?= h($txt['modePerDeck']) ?>
            </button>
            <button type="button" id="own-aa-mode-global" class="btn btn-outline-secondary<?= $isGlobalMode ? ' active' : '' ?>">
                <?= h($txt['modeGlobal']) ?>
            </button>
        </div>
        <button type="button" id="own-aa-mode-info-btn" class="btn btn-sm btn-link text-decoration-none">
            <i class="fa-solid fa-circle-info me-1"></i><?= h($txt['modeInfoBtn']) ?>
        </button>
    </div>

    <?php if (!$isGlobalMode): ?>
    <div class="alert alert-secondary py-2 small"><?= h($txt['perDeckNotice']) ?></div>
    <?php endif; ?>

    <div id="own-aa-mode-info-modal" class="own-aa-modal-overlay" hidden>
        <div class="own-aa-modal card-altered p-3">
            <h5 class="mb-3"><?= h($txt['modeInfoTitle']) ?></h5>
            <p class="mb-1"><strong><?= h($txt['modePerDeckTitle']) ?></strong></p>
            <p class="text-muted small mb-3"><?= h($txt['modePerDeckDesc']) ?></p>
            <p class="mb-1"><strong><?= h($txt['modeGlobalTitle']) ?></strong></p>
            <p class="text-muted small mb-3"><?= h($txt['modeGlobalDesc']) ?></p>
            <div class="text-end">
                <button type="button" id="own-aa-mode-info-close" class="btn btn-sm btn-primary-altered">
                    <?= h($txt['modeClose']) ?>
                </button>
            </div>
        </div>
    </div>

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
            <button type="button" id="own-aa-hide-non-choices" class="filter-toggle active" data-bool-filter="hideNonChoices">
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
        preferenceModeUrl: <?= json_encode(BASE_URL . '/papi/ownership/alt-art-preference-mode') ?>,
        baseUrl: <?= json_encode(BASE_URL) ?>,
        cdnUrl: <?= json_encode(CDN_URL) ?>,
        lang: <?= json_encode(getLang()) ?>,
        markerImg: <?= json_encode(BASE_URL . '/plugins/ownership/assets/selected_alt.png') ?>,
        csrfToken: <?= json_encode(csrfToken()) ?>,
        isGlobalMode: <?= json_encode($isGlobalMode) ?>,
    };
    (function () {
        var cfg = window.OWN_AA_CONFIG;
        var t = function (key, fallback) {
            var dict = (window.OWN_I18N || {})[document.documentElement.lang] || {};
            return dict[key] || fallback;
        };

        var infoBtn = document.getElementById('own-aa-mode-info-btn');
        var infoModal = document.getElementById('own-aa-mode-info-modal');
        var infoClose = document.getElementById('own-aa-mode-info-close');
        infoBtn?.addEventListener('click', function () { infoModal.hidden = false; });
        infoClose?.addEventListener('click', function () { infoModal.hidden = true; });
        infoModal?.addEventListener('click', function (e) { if (e.target === infoModal) infoModal.hidden = true; });

        var perDeckBtn = document.getElementById('own-aa-mode-perdeck');
        var globalBtn = document.getElementById('own-aa-mode-global');
        var setMode = function (mode) {
            if ((mode === 'Global') === cfg.isGlobalMode) return;
            [perDeckBtn, globalBtn].forEach(function (b) { b && (b.disabled = true); });
            fetch(cfg.preferenceModeUrl, {
                method: 'PUT',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: mode, csrf_token: cfg.csrfToken }),
            }).then(function (res) {
                if (!res.ok) throw new Error('save failed');
                location.reload();
            }).catch(function () {
                [perDeckBtn, globalBtn].forEach(function (b) { b && (b.disabled = false); });
                alert(t('modeSaveError', 'Could not save your setting.'));
            });
        };
        perDeckBtn?.addEventListener('click', function () { setMode('PerDeck'); });
        globalBtn?.addEventListener('click', function () { setMode('Global'); });
    })();
    </script>

    <?php endif; ?>
    <?php endif; ?>
</div>
