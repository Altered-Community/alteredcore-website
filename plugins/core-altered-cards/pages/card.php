<?php
require_once __DIR__ . '/../includes/functions.php';
$lang   = getLang();
$uiLang = getUiLang();

// Unique cards: renderer only supports en/fr. Non-unique: API supports en/fr/de/it/es.
$_refParts    = explode('_', trim($_GET['ref'] ?? ''));
$_refIsUnique = isset($_refParts[5]) && isset($_refParts[5][0]) && $_refParts[5][0] === 'U';
$_validCardLangs = $_refIsUnique ? ['en', 'fr'] : ['en', 'fr', 'de', 'it', 'es'];
$cardLang = in_array($_GET['card_lang'] ?? '', $_validCardLangs, true)
    ? $_GET['card_lang']
    : (in_array($lang, $_validCardLangs, true) ? $lang : 'en');

// static data (local JSON files — no network call)
$factionsData = loadAlteredData('factions');
$raritiesData = loadAlteredData('rarities');
$setsData     = loadAlteredData('sets');
$subtypesData = loadAlteredData('subtypes');

// translations
$txt = [
    'en' => [
        'page_title'   => 'Card',
        'not_found'    => 'Card not found.',
        'err_api'      => 'Could not load card data.',
        'err_connect'  => 'Connection error.',
        'api_later'    => 'The API is currently unavailable. Please try again later.',
        'lbl_info'          => 'Information',
        'lbl_stats'         => 'Statistics',
        'lbl_lore'          => 'Lore',
        'lbl_altered_cards'   => 'Altered Cards',
        'lbl_rulings'         => 'Rulings & Clarifications',
        'search_unique'       => 'Search for Unique variants of',
        'tab_general'         => 'General',
        'tab_rules'           => 'Rules',
        'tab_altered'         => 'Altered Cards',
        'tab_lore'            => 'Lore',
        'lbl_set'      => 'Set',
        'lbl_ref'      => 'References',
        'lbl_keywords' => 'Keywords',
        'lbl_main'     => 'Main effect',
        'lbl_echo'     => 'Echo effect',
        'banned'       => 'Banned',
        'errated'      => 'Errata',
        'suspended'    => 'Suspended',
        'no_rulings'   => 'Nothing to say about this card for now...',
        'detail_label' => 'View detail',
        'loading'      => 'Loading…',
        'types' => [
            'HERO'                    => 'Hero',
            'CHARACTER'               => 'Character',
            'SPELL'                   => 'Spell',
            'PERMANENT'               => 'Permanent',
            'LANDMARK_PERMANENT'      => 'Landmark',
            'EXPEDITION_PERMANENT'    => 'Expedition',
            'TOKEN'                   => 'Token',
            'TOKEN_LANDMARK_PERMANENT'=> 'Token Landmark',
            'TOKEN_MANA'              => 'Mana',
        ],
    ],
    'fr' => [
        'page_title'   => 'Carte',
        'not_found'    => 'Carte introuvable.',
        'err_api'      => 'Impossible de charger les données de la carte.',
        'err_connect'  => 'Erreur de connexion.',
        'api_later'    => 'L\'API est actuellement indisponible. Veuillez réessayer plus tard.',
        'lbl_info'          => 'Informations',
        'lbl_stats'         => 'Statistiques',
        'lbl_lore'          => 'Lore',
        'lbl_altered_cards'   => 'Cartes Altérées',
        'lbl_rulings'         => 'Règlement & Clarifications',
        'search_unique'       => 'Chercher des variantes Uniques de',
        'tab_general'         => 'Général',
        'tab_rules'           => 'Règles',
        'tab_altered'         => 'Cartes Altérées',
        'tab_lore'            => 'Lore',
        'lbl_set'      => 'Set',
        'lbl_ref'      => 'Références',
        'lbl_keywords' => 'Mots-clés',
        'lbl_main'     => 'Effet principal',
        'lbl_echo'     => 'Effet de réserve',
        'banned'       => 'Banni',
        'errated'      => 'Erratum',
        'suspended'    => 'Suspendu',
        'no_rulings'   => 'Rien à dire sur cette carte pour le moment...',
        'detail_label' => 'Accéder au détail',
        'loading'      => 'Chargement…',
        'types' => [
            'HERO'                    => 'Héros',
            'CHARACTER'               => 'Personnage',
            'SPELL'                   => 'Sort',
            'PERMANENT'               => 'Permanent',
            'LANDMARK_PERMANENT'      => 'Lieu permanent',
            'EXPEDITION_PERMANENT'    => 'Permanent d\'expédition',
            'TOKEN'                   => 'Jeton',
            'TOKEN_LANDMARK_PERMANENT'=> 'Jeton lieu',
            'TOKEN_MANA'              => 'Mana',
        ],
    ],
][$uiLang] ?? [];

// validate reference
$ref = trim($_GET['ref'] ?? '');
if (!preg_match('/^[A-Za-z0-9_-]+$/', $ref)) {
    $ref = '';
}

// page meta (derivable from ref without API call)
$_assetParts = explode('_', $ref);
$_assetSet   = $_assetParts[1] ?? '';
$_assetRef   = $_refIsUnique ? preg_replace('/_\d+$/', '', $ref) : $ref;
$pageTitle   = $txt['page_title'];
$pageImage   = $ref ? CDN_URL . '/cards/assets/' . $_assetSet . '/' . $_assetRef . '.webp' : '';

?>

<div class="container py-4" style="max-width:980px">

    <div class="section-title mb-4">
        <span><?= h($txt['page_title']) ?></span>
    </div>

    <?php if (!$ref): ?>
    <div class="text-center py-5">
        <i class="fa-solid fa-circle-exclamation" style="font-size:3rem;color:#f87171;margin-bottom:.75rem;display:block"></i>
        <p class="text-muted mb-1"><?= h($txt['not_found']) ?></p>
    </div>
    <?php else: ?>

    <!-- Error state (hidden until JS reveals it) -->
    <div id="card-error" style="display:none" class="text-center py-5">
        <i class="fa-solid fa-circle-exclamation" style="font-size:3rem;color:#f87171;margin-bottom:.75rem;display:block"></i>
        <p class="text-muted mb-1" id="card-error-msg"></p>
        <p class="text-muted small"><?= h($txt['api_later']) ?></p>
    </div>

    <div class="row g-4 g-lg-5" id="card-row">

        <!-- ── Card image ──────────────────────────────────────────── -->
        <div class="col-md-5 col-lg-4">
            <div class="card-view-img-wrap">
                <div id="card-img-toggle" style="cursor:pointer">
                    <!-- Card back shown immediately as placeholder -->
                    <img id="card-render"
                         src="<?= BASE_URL ?>/plugins/core-altered-cards/assets/img/ALT_OFFICIAL_CARDBACK.png"
                         class="card-view-img" alt="">
                    <img id="card-asset" src="" class="card-view-img" style="display:none" alt="">
                </div>
                <!-- Language switcher — hidden until card loads -->
                <div id="card-lang-wrap" class="d-flex justify-content-center mt-3" style="visibility:hidden">
                    <div class="btn-group btn-group-sm" id="card-lang-btns" role="group"></div>
                </div>
            </div>
        </div>

        <!-- ── Card details ─────────────────────────────────────────── -->
        <div class="col-md-7 col-lg-8">

            <!-- Name skeleton -->
            <h1 id="card-name" style="font-size:1.75rem;font-weight:800;color:var(--neutral-800);margin-bottom:.6rem;line-height:1.2">
                <span class="card-skeleton" style="display:inline-block;width:210px;height:1.8rem">&nbsp;</span>
            </h1>

            <!-- Badges skeleton -->
            <div id="card-badges" class="d-flex flex-wrap gap-2 mb-3">
                <span class="card-skeleton" style="display:inline-block;width:84px;height:26px;border-radius:20px"></span>
                <span class="card-skeleton" style="display:inline-block;width:66px;height:26px;border-radius:20px"></span>
            </div>

            <!-- Status flags (hidden until needed) -->
            <div id="card-status" class="d-flex flex-wrap gap-2 mb-3" style="display:none!important"></div>

            <!-- Tabs -->
            <div class="card-tabs mb-3" id="card-tab-bar" role="tablist">
                <button class="card-tab active" data-bs-toggle="tab" data-bs-target="#tab-general" type="button" role="tab">
                    <?= h($txt['tab_general']) ?>
                </button>
                <button class="card-tab" data-bs-toggle="tab" data-bs-target="#tab-rules" type="button" role="tab">
                    <?= h($txt['tab_rules']) ?>
                </button>
                <button id="tab-altered-btn" class="card-tab" data-bs-toggle="tab" data-bs-target="#tab-altered" type="button" role="tab">
                    <?= h($txt['tab_altered']) ?>
                </button>
                <button class="card-tab" data-bs-toggle="tab" data-bs-target="#tab-lore" type="button" role="tab">
                    <?= h($txt['tab_lore']) ?>
                </button>
            </div>

            <div class="tab-content">

                <!-- Tab Général -->
                <div class="tab-pane fade show active" id="tab-general" role="tabpanel">
                    <div id="card-info-block" class="card-altered p-3 mb-3">
                        <div class="card-section-label"><?= h($txt['lbl_info']) ?></div>
                        <div class="card-skeleton" style="height:1.3rem;border-radius:4px;margin-bottom:.45rem"></div>
                        <div class="card-skeleton" style="height:1.3rem;width:65%;border-radius:4px"></div>
                    </div>
                    <div id="card-stats-block" class="card-altered p-3 mb-3" style="display:none">
                        <div class="card-section-label"><?= h($txt['lbl_stats']) ?></div>
                        <div id="card-stats-content" class="d-flex flex-wrap gap-3 align-items-center"></div>
                    </div>
                    <div id="card-effects" class="card-altered p-3 mb-3" style="display:none"></div>
                </div>

                <!-- Tab Règles -->
                <div class="tab-pane fade" id="tab-rules" role="tabpanel">
                    <div class="card-altered p-3">
                        <div class="card-section-label"><?= h($txt['lbl_rulings']) ?></div>
                        <div id="card-rulings-list">
                            <div class="card-skeleton" style="height:1.3rem;border-radius:4px;margin-bottom:.45rem"></div>
                            <div class="card-skeleton" style="height:1.3rem;width:75%;border-radius:4px"></div>
                        </div>
                    </div>
                </div>

                <!-- Tab Cartes Altérées -->
                <div class="tab-pane fade" id="tab-altered" role="tabpanel">
                    <div class="card-altered p-3">
                        <div class="card-section-label"><?= h($txt['lbl_altered_cards']) ?></div>
                        <div id="card-altered-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:.5rem"></div>
                    </div>
                </div>

                <!-- Tab Lore -->
                <div class="tab-pane fade" id="tab-lore" role="tabpanel">
                    <div id="card-lore-content">
                        <div class="card-altered p-3">
                            <div class="card-skeleton" style="height:1.3rem;border-radius:4px;margin-bottom:.45rem"></div>
                            <div class="card-skeleton" style="height:1.3rem;width:82%;border-radius:4px;margin-bottom:.45rem"></div>
                            <div class="card-skeleton" style="height:1.3rem;width:58%;border-radius:4px"></div>
                        </div>
                    </div>
                </div>

            </div><!-- /tab-content -->

        </div><!-- /col details -->
    </div><!-- /row -->

    <?php endif; ?>
</div>

<!-- Altered Cards lightbox -->
<div id="ac-lightbox" style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.82);align-items:center;justify-content:center;cursor:pointer">
    <div id="ac-lightbox-inner" style="max-width:420px;width:88vw;cursor:default;position:relative" onclick="event.stopPropagation()"></div>
</div>

<?php if ($ref): ?>
<script>
var AlteredCard = {
    ref:      <?= json_encode($ref) ?>,
    cardLang: <?= json_encode($cardLang) ?>,
    uiLang:   <?= json_encode($uiLang) ?>,
    isUnique: <?= $_refIsUnique ? 'true' : 'false' ?>,
    apiBase:  <?= json_encode(CARDS_API_URL) ?>,
    uniquesApiBase: <?= json_encode(defined('UNIQUES_API_URL') ? UNIQUES_API_URL : '') ?>,
    cdnBase:  <?= json_encode(CDN_URL) ?>,
    baseUrl:  <?= json_encode(BASE_URL) ?>,
    factions: <?= json_encode($factionsData) ?>,
    rarities: <?= json_encode($raritiesData) ?>,
    sets:     <?= json_encode($setsData) ?>,
    subtypes: <?= json_encode($subtypesData) ?>,
    txt: <?= json_encode([
        'not_found'    => $txt['not_found'],
        'err_api'      => $txt['err_api'],
        'err_connect'  => $txt['err_connect'],
        'lbl_info'     => $txt['lbl_info'],
        'lbl_stats'    => $txt['lbl_stats'],
        'lbl_set'      => $txt['lbl_set'],
        'lbl_ref'      => $txt['lbl_ref'],
        'lbl_main'     => $txt['lbl_main'],
        'lbl_echo'     => $txt['lbl_echo'],
        'lbl_rulings'  => $txt['lbl_rulings'],
        'lbl_altered_cards' => $txt['lbl_altered_cards'],
        'search_unique'=> $txt['search_unique'],
        'banned'       => $txt['banned'],
        'errated'      => $txt['errated'],
        'suspended'    => $txt['suspended'],
        'no_rulings'   => $txt['no_rulings'],
        'detail_label' => $txt['detail_label'],
        'loading'      => $txt['loading'],
        'types'        => $txt['types'],
    ]) ?>,
};
</script>
<script>
(function () {
    var ref      = AlteredCard.ref;
    var lang     = AlteredCard.cardLang;
    var uiLang   = AlteredCard.uiLang;
    var isUnique = AlteredCard.isUnique;
    var API      = AlteredCard.apiBase;
    // rust-cards-api (Uniques), used instead of API/card_groups when configured —
    // dev-local only for now. Falls back to the old two-call flow when empty.
    var UNIQUES_API = isUnique ? (AlteredCard.uniquesApiBase || '') : '';
    var CDN      = AlteredCard.cdnBase;
    var BASE     = AlteredCard.baseUrl;
    var txt      = AlteredCard.txt;

    var groupData  = null;
    var cardData   = null;
    var altLoaded  = false;
    var rendererLoaded = false;

    // rust-cards-api locale maps use long codes (en_US, fr_FR, ...); the rest of
    // this page's loc()/renderEffects()/etc. already key off short codes (en, fr)
    // since that's what the old Cards API returns. Convert once on fetch.
    var LOCALE_MAP_LONG = { en: 'en_US', fr: 'fr_FR', de: 'de_DE', it: 'it_IT', es: 'es_ES' };
    function toShortLocaleMap(map) {
        var out = {};
        Object.keys(LOCALE_MAP_LONG).forEach(function (short) {
            var long = LOCALE_MAP_LONG[short];
            if (map && (map[long] !== undefined || map[short] !== undefined)) {
                out[short] = map[long] !== undefined ? map[long] : map[short];
            }
        });
        return out;
    }

    // Adapt a CardV2 object (GET /api/v2/card/{ref}) into the {group, card} shape
    // the rest of this file's renderCard()/switchLang() already expect (modeled on
    // the old API's /api/card_groups + /api/cards/reference split). Fields the new
    // API doesn't have (rarity, cardType, isBanned/isSuspended/isErrated,
    // cardRulings, loreEntries, collectorNumberFormatedId) are left unset — the
    // existing render code already handles their absence gracefully.
    function adaptUniqueCard(c) {
        var group = {
            name: toShortLocaleMap(c.name || {}),
            faction: c.faction,
            mainEffect: toShortLocaleMap(c.mainEffect || {}),
            echoEffect: toShortLocaleMap(c.echoEffect || {}),
        };
        var card = {
            set: c.set,
            cardSubTypes: c.cardSubTypes,
            mainCost: c.mainCost,
            recallCost: c.recallCost,
            forestPower: c.forestPower,
            mountainPower: c.mountainPower,
            oceanPower: c.oceanPower,
        };
        return { group: group, card: card };
    }

    if (isUnique && UNIQUES_API) {
        // Single call: no cross-rarity "other prints" data exists in this API, so
        // the "Cartes Altérées" tab (which relies on it) is hidden below.
        var altTabBtnEarly = document.getElementById('tab-altered-btn');
        if (altTabBtnEarly) altTabBtnEarly.style.display = 'none';

        fetch(UNIQUES_API + '/api/v2/card/' + encodeURIComponent(ref), { headers: { 'Accept': 'application/json' } })
            .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .then(function (c) {
                var adapted = adaptUniqueCard(c);
                groupData = adapted.group;
                cardData  = adapted.card;
                renderCard(groupData, cardData, lang);
            })
            .catch(function () {
                showError(txt.err_connect);
            });
    } else {
        // fetch both APIs in parallel
        Promise.all([
            fetch(API + '/api/card_groups?cards.reference=' + encodeURIComponent(ref) + '&itemsPerPage=1', { headers: { 'Accept': 'application/json' } })
                .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }),
            fetch(API + '/api/cards/reference/' + encodeURIComponent(ref) + '?locale=' + encodeURIComponent(lang), { headers: { 'Accept': 'application/json' } })
                .then(function (r) { return r.ok ? r.json() : {}; }),
        ]).then(function (results) {
            var groupResp = results[0];
            groupData = groupResp.member && groupResp.member[0] ? groupResp.member[0] : null;
            cardData  = results[1];
            if (!groupData) { showError(txt.not_found); return; }
            renderCard(groupData, cardData, lang);
        }).catch(function () {
            showError(txt.err_connect);
        });
    }

    // main render
    function renderCard(group, card, l) {
        var name = loc(group.name, l) || ref;
        document.title = name + ' — Alteredcore';

        // Faction
        var fCode   = (group.faction && group.faction.code) ? group.faction.code : '';
        var fData   = AlteredCard.factions[fCode] || {};
        var fName   = fData[uiLang] || fData.en || fCode;
        var fColor  = fData.color  || 'var(--neutral-400)';

        // Rarity
        var rCode   = (group.rarity && group.rarity.reference) ? group.rarity.reference : '';
        var rData   = AlteredCard.rarities[rCode] || {};
        var rName   = rData[uiLang] || rData.en || rCode;
        var rLetter = { COMMON:'C', RARE:'R', EXALTED:'E', UNIQUE:'U' }[rCode] || '';

        // Type
        var tCode   = (group.cardType && group.cardType.reference) ? group.cardType.reference : '';
        var tLabel  = (txt.types || {})[tCode] || tCode;

        // Set
        var setRef  = (card.set && card.set.reference) ? card.set.reference : '';
        var setData = AlteredCard.sets[setRef] || {};
        var setName = setData[uiLang] || setData.en || setRef;
        var setIcon = setData.icon || '';

        // Subtypes (from localized /api/cards/reference response)
        var stList  = (card.cardSubTypes || []).map(function (st) {
            var stRef  = st.reference || '';
            var stData = AlteredCard.subtypes[stRef] || {};
            return { ref: stRef, name: stData[uiLang] || stData.en || stRef };
        });

        // Collector number
        var collNum = card.collectorNumberFormatedId || '';

        // card image
        var imgWrap = document.getElementById('card-img-toggle');
        if (isUnique) {
            ensureRenderer();
            var ac = document.createElement('altered-card');
            ac.id = 'card-render';
            ac.setAttribute('ref', ref);
            ac.setAttribute('locale', l);
            ac.style.cssText = 'display:block;max-width:300px;margin:0 auto;border-radius:10px;overflow:hidden';
            var oldRender = document.getElementById('card-render');
            imgWrap.replaceChild(ac, oldRender);
        } else {
            var imgEl = document.getElementById('card-render');
            imgEl.src = cdnUrl(ref, l);
            imgEl.alt = name;
            imgEl.onerror = function () { this.src = BASE + '/plugins/core-altered-cards/assets/img/ALT_OFFICIAL_CARDBACK.png'; this.onerror = null; };
        }
        var assetEl = document.getElementById('card-asset');
        var ap = ref.split('_');
        var aset = ap[1] || '';
        var aref = isUnique ? ref.replace(/_\d+$/, '') : ref;
        assetEl.src  = CDN + '/cards/assets/' + aset + '/' + aref + '.webp';
        assetEl.alt  = name;

        document.getElementById('card-img-toggle').addEventListener('click', function () {
            var render = document.getElementById('card-render');
            var asset  = document.getElementById('card-asset');
            var showAsset = asset.style.display === 'none';
            render.style.display = showAsset ? 'none' : '';
            asset.style.display  = showAsset ? ''     : 'none';
            this.style.cursor    = showAsset ? 'zoom-out' : 'pointer';
        });

        // language switcher
        renderLangSwitcher(l);

        // name
        var nameEl = document.getElementById('card-name');
        nameEl.textContent = name;

        // badges
        var badgesEl = document.getElementById('card-badges');
        badgesEl.innerHTML = '';
        if (fCode) {
            var fb = document.createElement('a');
            fb.href = BASE + '/pages/cards?faction[]=' + encodeURIComponent(fCode);
            fb.className = 'badge d-flex align-items-center gap-1 text-decoration-none';
            fb.style.cssText = 'background:' + fColor + ';color:#fff;font-size:.8rem;padding:4px 10px;border-radius:20px';
            fb.innerHTML = '<img src="' + BASE + '/plugins/core-altered-cards/assets/faction/' + escAttr(fCode) + '.png" alt="" style="width:14px;height:14px;object-fit:contain;filter:brightness(10)">'
                + escHtml(fName);
            badgesEl.appendChild(fb);
        }
        if (rLetter) {
            var rb = document.createElement('a');
            rb.href = BASE + '/pages/cards?rarity[]=' + encodeURIComponent(rCode);
            rb.className = 'badge d-flex align-items-center gap-1 text-decoration-none';
            rb.style.cssText = 'background:var(--sand-200);color:var(--neutral-700);font-size:.8rem;padding:4px 10px;border-radius:20px';
            rb.innerHTML = '<img src="' + BASE + '/plugins/core-altered-cards/assets/gems/' + escAttr(rLetter) + '.png" alt="' + escAttr(rCode) + '" style="width:14px;height:14px;object-fit:contain">'
                + escHtml(rName);
            badgesEl.appendChild(rb);
        }
        if (tLabel) {
            var tb = document.createElement('a');
            tb.href = BASE + '/pages/cards?type[]=' + encodeURIComponent(tCode);
            tb.className = 'badge text-decoration-none';
            tb.style.cssText = 'background:var(--sand-300);color:var(--neutral-800);font-size:.8rem;padding:4px 10px;border-radius:20px';
            tb.textContent = tLabel;
            badgesEl.appendChild(tb);
        }
        stList.forEach(function (st) {
            var stb = document.createElement('a');
            stb.href = BASE + '/pages/cards?subtype[]=' + encodeURIComponent(st.ref);
            stb.className = 'badge text-decoration-none';
            stb.style.cssText = 'background:var(--sand-200);color:var(--neutral-700);font-size:.8rem;padding:4px 10px;border-radius:20px';
            stb.textContent = st.name;
            badgesEl.appendChild(stb);
        });

        // status flags
        var statusEl = document.getElementById('card-status');
        statusEl.innerHTML = '';
        var hasStatus = false;
        if (group.isBanned)    { statusEl.innerHTML += '<span class="badge" style="background:#ef4444;color:#fff;font-size:.78rem;padding:4px 10px;border-radius:20px"><i class="fa-solid fa-ban me-1"></i>' + escHtml(txt.banned) + '</span>'; hasStatus = true; }
        if (group.isSuspended) { statusEl.innerHTML += '<span class="badge" style="background:#f97316;color:#fff;font-size:.78rem;padding:4px 10px;border-radius:20px"><i class="fa-solid fa-pause me-1"></i>' + escHtml(txt.suspended) + '</span>'; hasStatus = true; }
        if (group.isErrated)   { statusEl.innerHTML += '<span class="badge" style="background:#eab308;color:#fff;font-size:.78rem;padding:4px 10px;border-radius:20px"><i class="fa-solid fa-pen-to-square me-1"></i>' + escHtml(txt.errated) + '</span>'; hasStatus = true; }
        statusEl.style.cssText = hasStatus ? '' : 'display:none!important';

        // info block
        var infoEl = document.getElementById('card-info-block');
        var infoHtml = '<div class="card-section-label">' + escHtml(txt.lbl_info) + '</div>';
        if (setName) {
            infoHtml += '<div class="card-stat-row">'
                + '<span class="card-stat-label">' + escHtml(txt.lbl_set) + '</span>'
                + '<span class="card-stat-val d-flex align-items-center gap-2">'
                + (setIcon ? '<i class="' + escAttr(setIcon) + '" style="font-size:1.1em;opacity:.8"></i>' : '')
                + escHtml(setName) + '</span></div>';
        }
        infoHtml += '<div class="card-stat-row"><span class="card-stat-label">' + escHtml(txt.lbl_ref) + '</span>'
            + '<span class="card-stat-val d-flex flex-column gap-1">';
        if (collNum) {
            infoHtml += '<span id="card-collector-num" style="font-family:monospace;font-size:.78rem;color:var(--neutral-400)">'
                + escHtml(collNum) + '</span>';
        }
        infoHtml += '<span style="font-family:monospace;font-size:.78rem;color:var(--neutral-500)">' + escHtml(ref) + '</span>'
            + '</span></div>';
        infoEl.innerHTML = infoHtml;

        // stats
        var statsBlock   = document.getElementById('card-stats-block');
        var statsContent = document.getElementById('card-stats-content');
        var statsHtml    = '';
        var biomes = { forestPower:'F', mountainPower:'M', oceanPower:'O' };
        if (card.mainCost   !== undefined && card.mainCost   !== null) statsHtml += '<span class="power-pip"><i class="fak fa-altered-h" style="font-size:.88rem"></i>' + card.mainCost   + '</span>';
        if (card.recallCost !== undefined && card.recallCost !== null) statsHtml += '<span class="power-pip"><i class="fak fa-altered-r" style="font-size:.88rem"></i>' + card.recallCost + '</span>';
        Object.keys(biomes).forEach(function (f) {
            var biomeKey = f.replace('Power', '');
            var dp = (card.displayPowers && card.displayPowers[biomeKey] !== undefined) ? card.displayPowers[biomeKey] : null;
            var displayVal, show;
            if (dp !== null) {
                var m = String(dp).match(/^#(.+)#$/);
                displayVal = m ? '<span style="color:#FFFF00">' + m[1] + '</span>' : String(dp);
                show = true;
            } else if (card[f] !== undefined && card[f] !== null) {
                displayVal = card[f];
                show = true;
            }
            if (show) statsHtml += '<span class="power-pip"><img src="' + BASE + '/plugins/core-altered-cards/assets/biome/' + biomes[f] + '.webp" alt="' + biomes[f] + '" style="width:14px;height:14px;object-fit:contain">' + displayVal + '</span>';
        });
        statsContent.innerHTML = statsHtml;
        statsBlock.style.display = statsHtml ? '' : 'none';

        // effects
        renderEffects(l);

        // rulings
        document.getElementById('card-rulings-list').innerHTML = renderRulings(group.cardRulings, l);

        // lore
        document.getElementById('card-lore-content').innerHTML = renderLore(group.loreEntries, l);
    }

    // language switcher
    function renderLangSwitcher(activeLang) {
        var flags = { en: '<span class="fi fi-gb"></span>', fr: '<span class="fi fi-fr"></span>', de: '<span class="fi fi-de"></span>', it: '<span class="fi fi-it"></span>', es: '<span class="fi fi-es"></span>' };
        var langs = isUnique ? ['en', 'fr'] : ['en', 'fr', 'de', 'it', 'es'];
        var container = document.getElementById('card-lang-btns');
        container.innerHTML = '';
        langs.forEach(function (l) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn card-lang-btn ' + (l === activeLang ? 'btn-secondary' : 'btn-outline-secondary');
            btn.dataset.lang = l;
            btn.style.cssText = 'font-size:.78rem;padding:.2rem .55rem';
            btn.innerHTML = (flags[l] || '') + ' ' + l.toUpperCase();
            btn.addEventListener('click', function () { switchLang(l); });
            container.appendChild(btn);
        });
        document.getElementById('card-lang-wrap').style.visibility = '';
    }

    var _switchSeq = 0;

    // Shared render step for a language switch, given the (possibly re-fetched)
    // localized `card` object. Used both after a re-fetch (old API) and directly
    // from cache (new API, which already has every locale).
    function applyLangUpdate(card, l) {
        var name = loc(groupData.name, l) || ref;

        document.getElementById('card-name').textContent = name;

        var cnEl = document.getElementById('card-collector-num');
        if (cnEl && card.collectorNumberFormatedId) cnEl.textContent = l.toUpperCase() + '-' + card.collectorNumberFormatedId;

        renderEffects(l);
        document.getElementById('card-rulings-list').innerHTML = renderRulings(groupData.cardRulings, l);
        document.getElementById('card-lore-content').innerHTML = renderLore(groupData.loreEntries, l);

        // Update altered cards thumbnails if already loaded
        document.querySelectorAll('.ac-thumb-btn[data-ref]').forEach(function (btn) {
            var newImg = cdnUrl(btn.dataset.ref, l);
            btn.dataset.img = newImg;
            var img = btn.querySelector('img');
            if (img) img.src = newImg;
        });
        var searchLink = document.getElementById('card-unique-search-link');
        if (searchLink) {
            searchLink.href = BASE + '/pages/cards?q=' + encodeURIComponent(name) + '&rarity[]=UNIQUE';
            var em = searchLink.querySelector('em');
            if (em) em.textContent = name;
        }
    }

    // language switch (soft — no page reload)
    function switchLang(l) {
        lang = l;
        var seq = ++_switchSeq;

        // Image update is immediate
        if (isUnique) {
            var oldAc = document.getElementById('card-render');
            if (oldAc) {
                var newAc = document.createElement('altered-card');
                newAc.id = 'card-render';
                newAc.setAttribute('ref', ref);
                newAc.setAttribute('locale', l);
                newAc.style.cssText = oldAc.style.cssText;
                oldAc.parentNode.replaceChild(newAc, oldAc);
            }
        } else {
            var imgEl = document.getElementById('card-render');
            if (imgEl) imgEl.src = cdnUrl(ref, l);
        }

        if (isUnique && UNIQUES_API) {
            // rust-cards-api already returned every locale on the initial fetch
            // (adaptUniqueCard converted it to the short-code shape) — no re-fetch.
            applyLangUpdate(cardData, l);
        } else {
            // Re-fetch localized effects for new language
            fetch(API + '/api/cards/reference/' + encodeURIComponent(ref) + '?locale=' + encodeURIComponent(l), { headers: { 'Accept': 'application/json' } })
                .then(function (r) { return r.ok ? r.json() : {}; })
                .then(function (card) {
                    if (seq !== _switchSeq) return;
                    cardData = card;
                    applyLangUpdate(card, l);
                });
        }

        history.pushState(null, '', '?ref=' + encodeURIComponent(ref) + '&card_lang=' + encodeURIComponent(l));

        document.querySelectorAll('.card-lang-btn').forEach(function (b) {
            var active = b.dataset.lang === l;
            b.classList.toggle('btn-secondary', active);
            b.classList.toggle('btn-outline-secondary', !active);
        });
    }

    // altered cards: lazy-load on tab click
    var altTabBtn = document.getElementById('tab-altered-btn');
    if (altTabBtn) {
        altTabBtn.addEventListener('click', function () {
            if (!altLoaded && groupData) { altLoaded = true; loadAlteredCards(lang); }
        });
    }

    function loadAlteredCards(l) {
        var grid = document.getElementById('card-altered-grid');
        if (!grid) return;
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:1.5rem;color:var(--neutral-400)"><i class="fa-solid fa-spinner fa-spin"></i></div>';

        var cardName   = loc(groupData.name, l) || ref;
        var factionCode = (groupData.faction && groupData.faction.code) ? groupData.faction.code : '';
        var url = API + '/api/card_groups?'
            + 'name[' + l + ']=' + encodeURIComponent(cardName)
            + (factionCode ? '&faction.code[]=' + encodeURIComponent(factionCode) : '')
            + '&itemsPerPage=20';

        fetch(url, { headers: { 'Accept': 'application/json' } })
            .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .then(function (data) {
                var altCards = [];
                (data.member || []).forEach(function (cg) {
                    var n = loc(cg.name, l);
                    if (n !== cardName) return;
                    if ((cg.rarity && cg.rarity.reference) === 'UNIQUE') return;
                    (cg.cards || []).forEach(function (c) {
                        if (/_(C|R1|R2|E)_\d{3}$/.test(c.reference || '')) return;
                        altCards.push(c);
                    });
                });
                renderAlteredGrid(grid, altCards, cardName, l);
            })
            .catch(function () {
                grid.innerHTML = '<div style="grid-column:1/-1;color:var(--neutral-400);font-size:.85rem">' + escHtml(txt.err_api) + '</div>';
            });
    }

    function renderAlteredGrid(grid, altCards, cardName, l) {
        grid.innerHTML = '';
        altCards.forEach(function (ac) {
            var acRef  = ac.reference || '';
            var acImg  = cdnUrl(acRef, l);
            var acUrl  = BASE + '/pages/card?ref=' + encodeURIComponent(acRef);
            var btn    = document.createElement('button');
            btn.type   = 'button';
            btn.className = 'ac-thumb-btn';
            btn.dataset.ref  = acRef;
            btn.dataset.img  = acImg;
            btn.dataset.name = cardName;
            btn.dataset.url  = acUrl;
            btn.title = cardName;
            btn.style.cssText = 'display:block;min-width:0;padding:0;border:none;background:none;cursor:pointer';
            btn.innerHTML = '<img src="' + escAttr(acImg) + '" alt="' + escAttr(cardName) + '" loading="lazy"'
                + ' style="width:100%;aspect-ratio:63.5/88;object-fit:cover;display:block;border-radius:6px;transition:transform .15s,box-shadow .15s"'
                + ' onmouseover="this.style.transform=\'scale(1.04)\';this.style.boxShadow=\'0 4px 16px rgba(0,0,0,.22)\'"'
                + ' onmouseout="this.style.transform=\'\';this.style.boxShadow=\'\'">';
            btn.addEventListener('click', function () { openLightbox(btn); });
            grid.appendChild(btn);
        });

        // Unique variant search link
        var searchLink = document.createElement('a');
        searchLink.id  = 'card-unique-search-link';
        searchLink.href = BASE + '/pages/cards?q=' + encodeURIComponent(cardName) + '&rarity[]=UNIQUE';
        searchLink.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;aspect-ratio:63.5/88;border-radius:6px;border:2px dashed var(--sand-300);gap:.5rem;text-decoration:none;padding:.5rem;text-align:center;color:var(--neutral-500);transition:border-color .15s,color .15s';
        searchLink.onmouseover = function () { this.style.borderColor = 'var(--primary-400)'; this.style.color = 'var(--primary-400)'; };
        searchLink.onmouseout  = function () { this.style.borderColor = 'var(--sand-300)';    this.style.color = 'var(--neutral-500)'; };
        searchLink.innerHTML   = '<span style="font-size:.72rem;font-weight:600;line-height:1.3">' + escHtml(txt.search_unique) + '<br><em>' + escHtml(cardName) + '</em></span>'
            + '<img src="' + BASE + '/plugins/core-altered-cards/assets/gems/U.png" alt="Unique" style="width:22px;height:22px;object-fit:contain">';
        grid.appendChild(searchLink);
    }

    // lightbox
    var lbModal = document.getElementById('ac-lightbox');
    var lbInner = document.getElementById('ac-lightbox-inner');

    function openLightbox(btn) {
        lbInner.innerHTML = '';
        var imgEl = document.createElement('img');
        imgEl.src = btn.dataset.img; imgEl.alt = btn.dataset.name;
        imgEl.style.cssText = 'display:block;width:100%;max-height:80vh;object-fit:contain;border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,.6);cursor:pointer';
        imgEl.addEventListener('click', closeLightbox);
        lbInner.appendChild(imgEl);
        var detailBtn = document.createElement('a');
        detailBtn.href = btn.dataset.url;
        detailBtn.innerHTML = '<i class="fa-solid fa-circle-info me-1"></i>' + escHtml(txt.detail_label);
        detailBtn.className = 'btn btn-sm btn-primary-altered';
        detailBtn.style.cssText = 'display:block;width:100%;margin-top:8px;text-decoration:none';
        lbInner.appendChild(detailBtn);
        lbModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
    function closeLightbox() {
        lbModal.style.display = 'none'; lbInner.innerHTML = '';
        document.body.style.overflow = '';
    }
    lbModal.addEventListener('click', closeLightbox);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeLightbox(); });

    // error state
    function showError(msg) {
        document.getElementById('card-row').style.display   = 'none';
        document.getElementById('card-error-msg').textContent = msg || txt.err_api;
        document.getElementById('card-error').style.display = '';
    }

    // renderer (unique cards)
    function ensureRenderer() {
        if (rendererLoaded) return;
        rendererLoaded = true;
        var s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/gh/PolluxTroy0/Altered-Card-Renderer@main/altered-card-renderer-minified.js';
        document.head.appendChild(s);
    }

    // render helpers
    function renderEffects(l) {
        var effectsEl = document.getElementById('card-effects');
        var pairs = [[groupData.mainEffect, txt.lbl_main], [groupData.echoEffect, txt.lbl_echo]];
        var html = '', first = true;
        pairs.forEach(function (p) {
            var text = loc(p[0], l);
            if (!text) return;
            html += '<div' + (first ? '' : ' style="border-top:1px solid var(--sand-200);padding-top:.75rem;margin-top:.75rem"') + '>'
                + '<div style="font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--neutral-400);margin-bottom:.3rem">' + escHtml(p[1]) + '</div>'
                + '<div style="font-size:.9rem;color:var(--neutral-700);line-height:1.55">' + textRender(text) + '</div>'
                + '</div>';
            first = false;
        });
        effectsEl.innerHTML = html;
        effectsEl.style.display = html ? '' : 'none';
    }

    function renderRulings(rulingsData, l) {
        var list = (rulingsData && !Array.isArray(rulingsData)) ? (rulingsData[l] || rulingsData.en || []) : [];
        if (!list.length) {
            return '<div class="text-center py-3">'
                + '<img src="' + BASE + '/plugins/core-altered-cards/assets/img/no_rules.png" alt="" style="max-width:120px;opacity:.6;display:block;margin:0 auto .75rem" onerror="this.style.display=\'none\'">'
                + '<p class="text-muted" style="font-size:.85rem;margin:0">' + escHtml(txt.no_rulings) + '</p></div>';
        }
        var html = '';
        list.forEach(function (r, i) {
            html += '<div' + (i > 0 ? ' style="border-top:1px solid var(--sand-200);padding-top:.75rem;margin-top:.75rem"' : '') + '>'
                + '<p style="font-size:.88rem;font-weight:600;color:var(--neutral-800);margin:0 0 .25rem 0">' + escHtml(r.question || '') + '</p>'
                + '<p style="font-size:.85rem;color:var(--neutral-700);margin:0 0 .3rem 0">' + escHtml(r.answer || '') + '</p>'
                + (r.rulingDate ? '<p style="font-size:.75rem;color:var(--neutral-400);margin:0">' + escHtml(String(r.rulingDate).substring(0, 10)) + '</p>' : '')
                + '</div>';
        });
        return html;
    }

    function renderLore(loreData, l) {
        var entries = (loreData && !Array.isArray(loreData)) ? (loreData[l] || loreData.en || []) : [];
        var entry = null;
        for (var i = 0; i < entries.length && !entry; i++) {
            for (var j = 0; j < (entries[i].elements || []).length; j++) {
                if (entries[i].elements[j].text) { entry = entries[i]; break; }
            }
        }
        if (!entry) return '';
        var html = '<div class="card-altered p-3">';
        (entry.elements || []).forEach(function (el) {
            var t = el.text || '';
            if (!t || t === '#N/A' || t === 'N/A') return;
            var esc = escHtml(t);
            if (el.type === 'FLAVOR_TEXT')  html += '<blockquote style="border-left:3px solid var(--sand-300);padding-left:1rem;margin:0 0 .75rem 0;color:var(--neutral-600);font-size:.9rem"><em>' + esc + '</em></blockquote>';
            else if (el.type === 'STORY')   html += '<p style="font-size:.88rem;color:var(--neutral-700);line-height:1.65;margin:0 0 .5rem 0">' + esc.replace(/\n/g, '<br>') + '</p>';
            else if (el.type === 'NARRATOR') html += '<p style="font-size:.8rem;color:var(--neutral-500);text-align:right;font-style:italic;margin:0">— ' + esc + '</p>';
        });
        return html + '</div>';
    }

    function textRender(raw) {
        if (!raw) return '';
        var out = escHtml(decodeEntities(raw));
        var icons = {'{R}':'<i class="fak fa-altered-r"></i>','{J}':'<i class="fak fa-altered-j"></i>','{H}':'<i class="fak fa-altered-h"></i>','{T}':'<i class="fak fa-altered-t"></i>','{D}':'<i class="fak fa-altered-d"></i>','{O}':'<i class="fak fa-altered-o"></i>','{M}':'<i class="fak fa-altered-m"></i>','{V}':'<i class="fak fa-altered-v"></i>','{I}':'<i class="fak fa-altered-i"></i>','{r}':'<i class="fak fa-altered-r"></i>','{j}':'<i class="fak fa-altered-j"></i>','{h}':'<i class="fak fa-altered-h"></i>','{t}':'<i class="fak fa-altered-t"></i>','{d}':'<i class="fak fa-altered-d"></i>'};
        var nums  = {'{0}':'⓪','{1}':'❶','{2}':'❷','{3}':'❸','{4}':'❹','{5}':'❺','{6}':'❻','{7}':'❼','{8}':'❽','{9}':'❾'};
        for (var k in icons) out = out.split(k).join(icons[k]);
        for (var k in nums)  out = out.split(k).join(nums[k]);
        out = out.replace(/#(.*?)#/g,        '<span class="effect-hl">$1</span>');
        out = out.replace(/\{X\}/g,          '<strong>X</strong>');
        out = out.replace(/\(([^)]+)\)/g,    '(<em>$1</em>)');
        out = out.replace(/\[\[(.*?)\]\]/g,  '<strong><u>$1</u></strong>');
        out = out.replace(/—/g,         '-');
        out = out.replace(/  /g,             '<br>');
        out = out.replace(/\[\]/g,           ' ');
        out = out.replace(/\[(.*?)\]/g,      '<strong>$1</strong>');
        return out;
    }

    // utility functions
    function loc(val, l) {
        var s;
        if (val && typeof val === 'object' && !Array.isArray(val)) s = val[l] || val.en || '';
        else s = String(val || '');
        return (s === '#N/A' || s === 'N/A') ? '' : s;
    }
    function cdnUrl(r, l) {
        var p = r.split('_');
        return CDN + '/cards/' + l + '/' + (p[1] || '') + '/' + r + '.webp';
    }
    function decodeEntities(s) {
        var t = document.createElement('textarea');
        t.innerHTML = s;
        return t.value;
    }
    function escHtml(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function escAttr(s) {
        return String(s).replace(/'/g,"\\'").replace(/"/g,'&quot;');
    }
    // Scroll to tab bar when switching tabs
    var cardTabBar = document.getElementById('card-tab-bar');
    if (cardTabBar) {
        cardTabBar.addEventListener('shown.bs.tab', function() {
            var navH = (document.querySelector('.site-header') || {}).offsetHeight || 0;
            window.scrollTo({ top: cardTabBar.getBoundingClientRect().top + window.scrollY - navH, behavior: 'smooth' });
        });
    }
})();
</script>

<?php require_once __DIR__ . '/../includes/favorites-inject.php'; ?>
<script>
(function () {
    if (!window.acFavButton) return;
    // #card-img-toggle hugs the card image; the inline renderer only replaces the
    // #card-render child, so a star appended here survives the async render.
    var wrap = document.getElementById('card-img-toggle');
    if (!wrap) return;
    // faction/rareté non fiables côté serveur ici (transfuges) → laissées vides, remplies par le
    // backfill quand l'onglet Favoris non filtré récupère la carte. Le set est fiable.
    var star = window.acFavButton({ ref: <?= json_encode($ref) ?>, set: <?= json_encode($_assetSet) ?> });
    if (star) wrap.appendChild(star);
})();
</script>
<?php endif; ?>

