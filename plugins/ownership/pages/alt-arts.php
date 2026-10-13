<?php
// « Arts alternatifs par défaut » tab of the Digital Ownership hub — lets a player browse
// every card family with more than one known illustration, see which prints they own, and
// choose the illustration of the 1st, 2nd and 3rd card (1 for heroes/tokens) with the keys
// above each print: their default alt arts, and the
// « par deck / global » mode that says how decks use them (see includes/func.alt-arts.php
// at the site's root). Talks to the AlteredOwnership /api/alt-arts/* endpoints
// via the papi proxies in ../api/alt-art-search.php and ../api/alt-art-set-preference.php
// — never directly (see ownApiRequestRaw()). Deliberately its own lightweight markup
// (filters + one row per family) rather than core-altered-cards' card-search.php widget,
// which is built around a paginated grid of individual cards, not per-family rows with
// keys.
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
        'keysHint'      => 'Click a box above an illustration to give it that card.',
        'intro'         => 'Choose the illustration of the 1st, 2nd and 3rd card of each card: your default alt arts. A token has a single illustration, the same in all your decks.',
        'usesNew'       => 'A card added to a deck takes',
        'usesAll'       => 'All your decks use',
        'results'       => 'Cards',
        'detail_label'  => 'View detail',
        'modeLabel'     => 'How your decks use them',
        'modePerDeck'   => 'Per deck',
        'modeGlobal'    => 'Global',
        'modePerDeckDesc' => 'A card added to a deck in the deck builder takes your default alt arts. Each deck then keeps its own illustrations, which you can change card by card for that deck only. Board Game Arena shows each deck\'s illustrations.',
        'modeGlobalDesc'  => 'Your default alt arts apply to all your decks, on this site and on Board Game Arena, whenever a deck is opened or changed. Illustrations cannot be changed deck by deck.',
        'toGlobalTitle'   => 'Switch to global mode?',
        'toGlobalText'    => 'All your decks will follow your default alt arts. The illustrations chosen deck by deck will be replaced.',
        'toGlobalConfirm' => 'Switch to global',
        'toPerDeckTitle'   => 'Switch to per-deck mode?',
        'toPerDeckText'    => 'Your default alt arts will be written in all your decks. Each deck then keeps its illustrations, which you can change in the deck builder.',
        'toPerDeckConfirm' => 'Switch to per deck',
        'cancel'        => 'Cancel',
        'progress'      => 'Decks updated: %1$s / %2$s',
        'leaveError'    => 'A deck could not be updated: you stay in global mode. Try again in a moment.',
        'modeSaveError' => 'Could not save your setting.',
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
        'keysHint'      => 'Cliquez sur une case au-dessus d\'une illustration pour la lui attribuer.',
        'intro'         => 'Choisissez l\'illustration de la 1ère, 2ème et 3ème carte de chaque carte : vos arts alternatifs par défaut. Un jeton a une seule illustration, la même dans tous vos decks.',
        'usesNew'       => 'Une carte ajoutée à un deck prend',
        'usesAll'       => 'Tous vos decks utilisent',
        'results'       => 'Cartes',
        'detail_label'  => 'Accéder au détail',
        'modeLabel'     => 'Utilisation dans vos decks',
        'modePerDeck'   => 'Par deck',
        'modeGlobal'    => 'Global',
        'modePerDeckDesc' => 'Une carte ajoutée à un deck dans le deck builder prend vos arts par défaut. Chaque deck garde ensuite ses propres illustrations, que vous pouvez changer carte par carte pour ce deck seulement. Board Game Arena montre les illustrations de chaque deck.',
        'modeGlobalDesc'  => 'Vos arts par défaut s\'appliquent à tous vos decks, sur ce site et sur Board Game Arena, à chaque ouverture et à chaque modification d\'un deck. Les illustrations ne se changent pas deck par deck.',
        'toGlobalTitle'   => 'Passer en mode global ?',
        'toGlobalText'    => 'Tous vos decks vont suivre vos arts par défaut. Les illustrations choisies deck par deck seront remplacées.',
        'toGlobalConfirm' => 'Passer en mode global',
        'toPerDeckTitle'   => 'Passer en mode par deck ?',
        'toPerDeckText'    => 'Vos arts par défaut vont être écrits dans tous vos decks. Chaque deck garde ensuite ses illustrations, que vous pouvez changer dans le deck builder.',
        'toPerDeckConfirm' => 'Passer en mode par deck',
        'cancel'        => 'Annuler',
        'progress'      => 'Decks mis à jour : %1$s / %2$s',
        'leaveError'    => 'Un deck n\'a pas pu être mis à jour : vous restez en mode global. Réessayez dans un instant.',
        'modeSaveError' => 'Impossible d\'enregistrer votre choix.',
    ],
][getUiLang()];

$ownEnabled  = defined('OWNERSHIP_API_URL') && OWNERSHIP_API_URL;
$ownLoggedIn = kcIsLoggedIn();
$ownActiveTab = 'alt-arts';

$userId = (int)($_SESSION['user_id'] ?? 0);
$isGlobalMode = $ownEnabled && $ownLoggedIn && ownGetAltArtPreferenceMode($userId) === 'Global';

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
        <div class="own-aa-modebar">
            <span class="filter-label" id="own-aa-mode-label"><?= h($txt['modeLabel']) ?></span>
            <div class="ac-segmented" role="group" aria-labelledby="own-aa-mode-label">
                <button type="button" id="own-aa-mode-perdeck" aria-pressed="<?= $isGlobalMode ? 'false' : 'true' ?>">
                    <?= h($txt['modePerDeck']) ?>
                </button>
                <button type="button" id="own-aa-mode-global" aria-pressed="<?= $isGlobalMode ? 'true' : 'false' ?>">
                    <?= h($txt['modeGlobal']) ?>
                </button>
            </div>
        </div>
        <p class="ac-text-small ac-text-muted mt-2 mb-0"><?= h($txt[$isGlobalMode ? 'modeGlobalDesc' : 'modePerDeckDesc']) ?></p>
    </div>

    <dialog class="ac-dialog" id="own-aa-mode-dialog" aria-labelledby="own-aa-mode-dialog-title">
        <div class="ac-dialog__header">
            <h2 class="ac-dialog__title" id="own-aa-mode-dialog-title"><?= h($txt[$isGlobalMode ? 'toPerDeckTitle' : 'toGlobalTitle']) ?></h2>
        </div>
        <div class="ac-dialog__body">
            <p class="mb-0"><?= h($txt[$isGlobalMode ? 'toPerDeckText' : 'toGlobalText']) ?></p>
            <div id="own-aa-mode-progress" class="mt-3" hidden>
                <div class="ac-progress"><div class="ac-progress__bar" id="own-aa-mode-progress-bar"></div></div>
                <p class="ac-text-small ac-text-muted mt-2 mb-0" id="own-aa-mode-progress-text" role="status"></p>
            </div>
            <div id="own-aa-mode-error" class="ac-notice ac-notice--danger mt-3" role="alert" hidden><?= ac_icon('circle-alert') ?><div></div></div>
        </div>
        <div class="ac-dialog__footer">
            <button type="button" class="ac-button ac-button--secondary" id="own-aa-mode-cancel"><?= h($txt['cancel']) ?></button>
            <button type="button" class="ac-button" id="own-aa-mode-confirm"><?= h($txt[$isGlobalMode ? 'toPerDeckConfirm' : 'toGlobalConfirm']) ?></button>
        </div>
    </dialog>

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

    <p class="ac-text-small ac-text-muted mb-2"><?= h($txt['keysHint']) ?></p>

    <div id="own-aa-loading" class="text-muted"><?= h($txt['loading']) ?></div>
    <div id="own-aa-empty" class="text-muted" hidden><?= h($txt['empty']) ?></div>
    <div id="own-aa-error" class="alert alert-danger" hidden></div>
    <section id="own-aa-results" class="own-aa-list" aria-label="<?= h($txt['results']) ?>"></section>
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
        // Labels of a family's type, faction and rarity (by code, rarity by its gem: C, R…).
        labels: <?= json_encode([
            'type'    => array_map(fn($d) => $d[$uiLang] ?? $d['en'] ?? '', $typesData),
            'faction' => array_map(fn($d) => $d[$uiLang] ?? $d['en'] ?? '', $factionsData),
            'rarity'  => array_column(array_map(fn($d) => ['gem' => $d['gem'] ?? '', 'label' => $d[$uiLang] ?? $d['en'] ?? ''], $raritiesData), 'label', 'gem'),
        ], JSON_UNESCAPED_UNICODE) ?>,
        csrfToken: <?= json_encode(csrfToken()) ?>,
        preferenceModeUrl: <?= json_encode(BASE_URL . '/papi/ownership/alt-art-preference-mode') ?>,
        leaveGlobalUrl: <?= json_encode(BASE_URL . '/papi/ownership/alt-art-leave-global') ?>,
        isGlobalMode: <?= json_encode($isGlobalMode) ?>,
    };
    // « Par deck » / « Global »: after a confirmation. Leaving « Global » first writes the defaults in every deck
    // (api/alt-art-leave-global.php), and the mode only changes once they all are.
    (function () {
        var cfg = window.OWN_AA_CONFIG;
        var txt = window.OWN_I18N[<?= json_encode($uiLang) ?>];
        var dialog = document.getElementById('own-aa-mode-dialog');
        var confirmBtn = document.getElementById('own-aa-mode-confirm');
        var cancelBtn = document.getElementById('own-aa-mode-cancel');
        var progress = document.getElementById('own-aa-mode-progress');
        var bar = document.getElementById('own-aa-mode-progress-bar');
        var progressText = document.getElementById('own-aa-mode-progress-text');
        var error = document.getElementById('own-aa-mode-error');
        var running = false;
        var headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': cfg.csrfToken };

        var request = function (method, url, body) {
            return fetch(url, { method: method, credentials: 'same-origin', headers: headers, body: body ? JSON.stringify(body) : undefined })
                .then(function (res) {
                    if (!res.ok) throw new Error(method + ' ' + res.status);
                    return res.status === 204 ? null : res.json();
                });
        };
        var setProgress = function (done, total) {
            bar.style.width = (total ? Math.round(done * 100 / total) : 100) + '%';
            progressText.textContent = txt.progress.replace('%1$s', done).replace('%2$s', total);
        };
        var setRunning = function (on) {
            running = on;
            confirmBtn.disabled = on;
            cancelBtn.disabled = on;
        };
        var fail = function (message) {
            setRunning(false);
            error.querySelector('div').textContent = message;
            error.hidden = false;
        };
        // Four decks at a time; the first error stops the others.
        var writeDecks = function () {
            return request('GET', cfg.leaveGlobalUrl).then(function (res) {
                var decks = (res.decks || []).slice();
                var total = decks.length;
                var done = 0;
                progress.hidden = false;
                setProgress(0, total);
                var next = function () {
                    var deck = decks.shift();
                    if (deck === undefined) return Promise.resolve();
                    return request('POST', cfg.leaveGlobalUrl, { deck: deck }).then(function () {
                        setProgress(++done, total);
                        return next();
                    }, function (e) {
                        decks.length = 0;
                        throw e;
                    });
                };
                return Promise.all([next(), next(), next(), next()]);
            });
        };

        confirmBtn.addEventListener('click', function () {
            error.hidden = true;
            setRunning(true);
            // Each step fails with its own message.
            var failWith = function (message) { return function () { throw message; }; };
            var saveMode = function (mode) {
                return request('PUT', cfg.preferenceModeUrl, { mode: mode }).then(null, failWith(txt.modeSaveError));
            };
            var steps = cfg.isGlobalMode
                ? writeDecks().then(function () { return saveMode('PerDeck'); }, failWith(txt.leaveError))
                : saveMode('Global');
            steps.then(function () { location.reload(); }).catch(fail);
        });
        cancelBtn.addEventListener('click', function () { dialog.close(); });
        dialog.addEventListener('cancel', function (e) { if (running) e.preventDefault(); });
        document.getElementById(cfg.isGlobalMode ? 'own-aa-mode-perdeck' : 'own-aa-mode-global')
            .addEventListener('click', function () {
                error.hidden = true;
                progress.hidden = true;
                dialog.showModal();
            });
    })();
    </script>

    <?php
    // A card opens large, as on the cards pages: core-altered-cards' lightbox, with the tilt and without the alt-art
    // widget (no deck-alt-arts URL: the keys of this page already choose).
    if ($cacAvailable) {
        $lang = getLang();
        $ownAltArtCfg = ['enabled' => true, 'altArtsUrl' => ''];
        include $cacDir . '/pages/_card-zoom-modal.php';
    }
    ?>

    <?php endif; ?>
    <?php endif; ?>
</div>
