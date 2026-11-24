<?php
// « Arts alternatifs par défaut » tab of the Digital Ownership hub — lets a player browse
// every card family with more than one known illustration, see which prints they own, and
// choose the illustration of the 1st, 2nd and 3rd card (1 for heroes/tokens) with the keys
// above each print: their default alt arts. They apply to every deck, on this site and on
// Board Game Arena, except to the cards whose illustration a deck chose itself in the deck
// builder (the deck's `altArtOverrides` on the decks API, which win); AlteredOwnership
// always checks ownership. Talks to the AlteredOwnership /api/alt-arts/* endpoints
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
        'login_prompt'  => 'Log in to manage your default alt arts.',
        'authExpired'   => 'Your session has expired. Please sign in again.',
        'loginBtn'      => 'Sign in',
        'loginUrl'      => BASE_URL . '/pages/login',
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
        'usesAll'       => 'All your decks use',
        'decksNote'     => 'These choices apply to all your decks, on this site and on Board Game Arena, as far as you own the cards. A deck can override them card by card in the deck builder: its own choice wins.',
        'results'       => 'Cards',
        'detail_label'  => 'View detail',
    ],
    'fr' => [
        'unavailable'   => 'Le service de propriété numérique n\'est pas configuré sur ce site.',
        'anon_login'    => 'Se connecter / S\'inscrire',
        'login_prompt'  => 'Connectez-vous pour gérer vos arts alternatifs par défaut.',
        'authExpired'   => 'Votre session a expiré. Veuillez vous reconnecter.',
        'loginBtn'      => 'Se connecter',
        'loginUrl'      => BASE_URL . '/pages/login',
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
        'usesAll'       => 'Tous vos decks utilisent',
        'decksNote'     => 'Ces choix s\'appliquent à tous vos decks, sur ce site et sur Board Game Arena, dans la limite des cartes que vous possédez. Un deck peut les remplacer carte par carte dans le deck builder : son propre choix l\'emporte.',
        'results'       => 'Cartes',
        'detail_label'  => 'Accéder au détail',
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
        <p class="ac-card__meta"><?= h($txt['login_prompt']) ?></p>
        <div class="ac-card__footer">
            <a href="<?= h(BASE_URL) ?>/pages/login" class="ac-button ac-button--sm">
                <?= ac_icon('log-in') ?><?= h($txt['anon_login']) ?>
            </a>
        </div>
    </div>
    <?php else: ?>

    <!-- core-altered-cards' stylesheet isn't auto-loaded on this plugin's own pages —
         only this plugin's assets/style.css is (see plugin.json) — but .filter-row/
         .filter-toggle below come from it. -->
    <link rel="stylesheet" href="<?= h(BASE_URL) ?>/plugins/core-altered-cards/assets/style.css">

    <p class="mb-3"><?= h($txt['intro']) ?></p>

    <div class="ac-notice ac-notice--neutral mb-3" role="note"><?= ac_icon('info') ?><div><?= h($txt['decksNote']) ?></div></div>

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
    };
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
