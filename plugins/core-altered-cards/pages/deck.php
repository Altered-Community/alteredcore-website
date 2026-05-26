<?php
require_once __DIR__ . '/../includes/functions.php';
$lang   = getLang();
$uiLang = getUiLang();

// page configuration
require_once __DIR__ . '/../config.php';

// translations
$txt = [
    'en' => [
        'page_title'      => 'Deck',
        'back'            => 'My Decks',
        'login_msg'       => 'Sign in to view this private deck.',
        'login_btn'       => 'Sign in',
        'deck_private'    => 'This deck is private.',
        'not_found'       => 'Deck not found.',
        'err_api_auth'    => 'Could not connect to the deck API.',
        'err_api'         => 'API error (HTTP %d).',
        'err_connect'     => 'Connection error.',
        'api_later'       => 'The API is currently unavailable. Please try again later.',
        'draft'           => 'Draft',
        'deck_valid'      => 'Valid',
        'deck_invalid'    => 'Invalid',
        'public'          => 'Public',
        'private'         => 'Private',
        'created'         => 'Created',
        'edit_btn'        => 'Edit deck',
        'delete_btn'      => 'Delete',
        'rename_btn'      => 'Rename',
        'delete_confirm'  => 'Delete this deck permanently?',
        'rename_label'    => 'New name',
        'rename_ph'       => 'Deck name…',
        'deleting'        => 'Deleting…',
        'renaming'        => 'Renaming…',
        'cards'           => 'cards',
        'description'     => 'Description',
        'deleted_ok'      => 'Deck deleted.',
        'deleted_err'     => 'Could not delete this deck (HTTP %d).',
        'view_grid'       => 'Cards',
        'view_list'       => 'Decklist',
        'stats_cost_main'   => 'Hand cost curve',
        'stats_cost_recall' => 'Reserve cost curve',
        'stats_types'       => 'Card types',
        'stats_powers'      => 'Avg. powers',
        'statistics'      => 'Statistics',
        'detail_label'    => 'View detail',
        'cancel'          => 'Cancel',
        'name_required'   => 'Name required.',
        'legal'               => 'Legal',
        'illegal'             => 'Illegal',
        'format_errors_title' => 'Format errors',
        'legality_modal_title'   => 'Deck Legality',
        'legality_format_section'=> 'Deck Format',
        'legality_rules_section' => 'Deck Legality Error',
        'legality_errors_section'=> 'Format Errors',
        'legality_keys'       => [
            'hero'              => 'Hero is missing or invalid',
            'deckSize'          => 'Invalid number of cards',
            'faction'           => 'Cards from multiple factions',
            'sets'              => 'Cards from unauthorized sets',
            'bannedCards'       => 'Deck contains banned cards',
            'suspendedCards'    => 'Deck contains suspended cards',
            'copies'            => 'Too many copies of a card name',
            'uniqueQuantity'    => 'Too many unique cards',
            'rareQuantity'      => 'Too many rare cards',
            'exaltedQuantity'   => 'Too many exalted cards',
        ],
        'no_description'      => 'No description available for this deck.',
        'copy_btn'        => 'Copy decklist',
        'copy_ok'         => 'Copied!',
        'share_btn'           => 'Share',
        'share_title'         => 'Share this deck',
        'share_link_label'    => 'Link',
        'share_copy'          => 'Copy',
        'share_copied'        => 'Copied!',
        'share_private_title' => 'This deck is private',
        'share_private_body'  => 'The link only works for you. Make the deck public so others can open it.',
        'share_make_public'   => 'Make public & share',
        'share_making_public' => 'Making public…',
    ],
    'fr' => [
        'page_title'      => 'Deck',
        'back'            => 'Mes decks',
        'login_msg'       => 'Connectez-vous pour voir ce deck privé.',
        'login_btn'       => 'Se connecter',
        'deck_private'    => 'Ce deck est privé.',
        'not_found'       => 'Deck introuvable.',
        'err_api_auth'    => 'Impossible de se connecter à l\'API.',
        'err_api'         => 'Erreur API (HTTP %d).',
        'err_connect'     => 'Erreur de connexion.',
        'api_later'       => 'L\'API est actuellement indisponible. Veuillez réessayer plus tard.',
        'draft'           => 'Brouillon',
        'deck_valid'      => 'Valide',
        'deck_invalid'    => 'Invalide',
        'public'          => 'Public',
        'private'         => 'Privé',
        'created'         => 'Créé le',
        'edit_btn'        => 'Modifier le deck',
        'delete_btn'      => 'Supprimer',
        'rename_btn'      => 'Renommer',
        'delete_confirm'  => 'Supprimer ce deck définitivement ?',
        'rename_label'    => 'Nouveau nom',
        'rename_ph'       => 'Nom du deck…',
        'deleting'        => 'Suppression…',
        'renaming'        => 'Renommage…',
        'cards'           => 'cartes',
        'description'     => 'Description',
        'deleted_ok'      => 'Deck supprimé.',
        'deleted_err'     => 'Impossible de supprimer ce deck (HTTP %d).',
        'statistics'      => 'Statistiques',
        'detail_label'    => 'Accéder au détail',
        'cancel'          => 'Annuler',
        'name_required'   => 'Nom requis.',
        'copy_btn'        => 'Copier la decklist',
        'copy_ok'         => 'Copié !',
        'share_btn'           => 'Partager',
        'share_title'         => 'Partager ce deck',
        'share_link_label'    => 'Lien',
        'share_copy'          => 'Copier',
        'share_copied'        => 'Copié !',
        'share_private_title' => 'Ce deck est privé',
        'share_private_body'  => 'Le lien ne fonctionne que pour vous. Rendez le deck public pour que les autres puissent y accéder.',
        'share_make_public'   => 'Rendre public & partager',
        'share_making_public' => 'Publication…',
        'view_grid'       => 'Cartes',
        'view_list'       => 'Decklist',
        'stats_cost_main'   => 'Courbe coût main',
        'stats_cost_recall' => 'Courbe coût réserve',
        'stats_types'       => 'Types de cartes',
        'stats_powers'      => 'Puissances moy.',
        'legal'               => 'Légal',
        'illegal'             => 'Illégal',
        'format_errors_title' => 'Erreurs de format',
        'legality_modal_title'   => 'Légalité du deck',
        'legality_format_section'=> 'Format du deck',
        'legality_rules_section' => 'Erreurs de légalité',
        'legality_errors_section'=> 'Erreurs de format',
        'legality_keys'       => [
            'hero'              => 'Héros manquant ou invalide',
            'deckSize'          => 'Nombre de cartes invalide',
            'faction'           => 'Cartes de plusieurs factions',
            'sets'              => 'Cartes de sets non autorisés',
            'bannedCards'       => 'Contient des cartes bannies',
            'suspendedCards'    => 'Contient des cartes suspendues',
            'copies'            => 'Trop de copies d\'un même nom',
            'uniqueQuantity'    => 'Trop de cartes uniques',
            'rareQuantity'      => 'Trop de cartes rares',
            'exaltedQuantity'   => 'Trop de cartes exaltées',
        ],
        'no_description'      => 'Aucune description disponible pour ce deck.',
    ],
][$uiLang] ?? [];

$deckId     = trim($_GET['id'] ?? '');
$isLoggedIn = kcIsLoggedIn();
$kcUser     = $isLoggedIn ? kcUser() : [];

// form POST: delete deck
if ($_SERVER['REQUEST_METHOD'] === 'POST'
    && !isset($_GET['ajax'])
    && ($_POST['action'] ?? '') === 'delete_deck'
    && csrfValid($_POST['csrf_token'] ?? '')
    && $isLoggedIn
) {
    $delId = trim($_POST['deck_id'] ?? '');
    if ($delId) {
        $token = deckApiToken();
        if ($token) {
            $ch = curl_init(DECKS_API_URL . '/api/decks/' . rawurlencode($delId));
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_CUSTOMREQUEST  => 'DELETE',
                CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $token, 'Accept: application/json'],
                CURLOPT_TIMEOUT        => 15,
            ]);
            curl_exec($ch);
            $delCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            if ($delCode >= 200 && $delCode < 300) {
                flash($txt['deleted_ok']);
            } else {
                flash(sprintf($txt['deleted_err'], $delCode), 'error');
            }
        }
    }
    redirect(BASE_URL . '/pages/decks');
}

// aJAX proxy for owner actions (delete / rename)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_GET['ajax']) && $deckId) {
    header('Content-Type: application/json');
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        echo json_encode(['ok' => false, 'error' => 'Invalid token']); exit;
    }
    if (!$isLoggedIn) {
        echo json_encode(['ok' => false, 'error' => 'Not logged in']); exit;
    }
    $token = deckApiToken();
    if (!$token) {
        echo json_encode(['ok' => false, 'error' => $txt['err_api_auth']]); exit;
    }
    $action = $_POST['action'] ?? '';
    if ($action === 'delete') {
        $ch = curl_init(DECKS_API_URL . '/api/decks/' . rawurlencode($deckId));
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST  => 'DELETE',
            CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $token, 'Accept: application/json'],
            CURLOPT_TIMEOUT        => 15,
        ]);
        $r = curl_exec($ch); $c = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
        if ($c >= 200 && $c < 300) {
            echo json_encode(['ok' => true]);
        } else {
            echo json_encode(['ok' => false, 'error' => sprintf($txt['err_api'], $c)]);
        }
        exit;
    }
    if ($action === 'rename') {
        $name = trim($_POST['name'] ?? '');
        if ($name === '') { echo json_encode(['ok' => false, 'error' => 'Name required']); exit; }
        $ch = curl_init(DECKS_API_URL . '/api/decks/' . rawurlencode($deckId));
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST  => 'PATCH',
            CURLOPT_HTTPHEADER     => ['Content-Type: application/merge-patch+json', 'Accept: application/json', 'Authorization: Bearer ' . $token],
            CURLOPT_TIMEOUT        => 15,
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['name' => $name]));
        $r = curl_exec($ch); $c = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
        if ($c >= 200 && $c < 300) {
            echo json_encode(['ok' => true]);
        } else {
            echo json_encode(['ok' => false, 'error' => sprintf($txt['err_api'], $c)]);
        }
        exit;
    }
    if ($action === 'make_public') {
        $ch = curl_init(DECKS_API_URL . '/api/decks/' . rawurlencode($deckId));
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST  => 'PATCH',
            CURLOPT_HTTPHEADER     => ['Content-Type: application/merge-patch+json', 'Accept: application/json', 'Authorization: Bearer ' . $token],
            CURLOPT_TIMEOUT        => 15,
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['isPublic' => true]));
        $r = curl_exec($ch); $c = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
        if ($c >= 200 && $c < 300) {
            echo json_encode(['ok' => true]);
        } else {
            echo json_encode(['ok' => false, 'error' => sprintf($txt['err_api'], $c)]);
        }
        exit;
    }
    echo json_encode(['ok' => false, 'error' => 'Unknown action']); exit;
}

// fetch deck
$deck          = null;
$apiError      = null;
$isDeckPrivate = false;

if ($deckId) {
    $headers = ['Accept: application/json'];
    if ($isLoggedIn) {
        $token = deckApiToken();
        if ($token !== null) {
            $headers[] = 'Authorization: Bearer ' . $token;
        }
    }
    if (!$apiError) {
        $ch = curl_init(DECKS_API_URL . '/api/decks/' . rawurlencode($deckId) . '?locale=' . rawurlencode($uiLang));
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_TIMEOUT        => 15,
        ]);
        $response = curl_exec($ch);
        $code     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr  = curl_error($ch);
        curl_close($ch);

        if ($curlErr) {
            $apiError = $txt['err_connect'];
        } elseif ($code === 401 || $code === 403) {
            unset($_SESSION['deck_api_token'], $_SESSION['deck_api_token_sub']);
            $isDeckPrivate = true;
        } elseif ($code === 404) {
            $apiError = $txt['not_found'];
        } elseif ($code >= 200 && $code < 300 && $response) {
            $deck = json_decode($response, true);
        } else {
            $apiError = sprintf($txt['err_api'], $code);
        }
    }
}

// process deck data
$pageTitle = $deck['name'] ?? $txt['page_title'];
// Check ownership: the collection endpoint returns only the current user's decks,
// so fetching /api/decks and looking for this deck ID is reliable without any API change.
$isOwner = false;
if ($isLoggedIn && $deck && $deckId && !empty($token)) {
    $ch2 = curl_init(DECKS_API_URL . '/api/decks?' . http_build_query(['itemsPerPage' => 1000]));
    curl_setopt_array($ch2, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $token, 'Accept: application/json'],
        CURLOPT_TIMEOUT        => 10,
    ]);
    $r2 = curl_exec($ch2);
    $c2 = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
    curl_close($ch2);
    if ($c2 === 200 && $r2) {
        $d2      = json_decode($r2, true);
        $d2Items = $d2['data'] ?? (isset($d2[0]['id']) ? $d2 : []);
        $myIds   = array_column($d2Items, 'id');
        $isOwner = in_array($deckId, $myIds);
    }
}

$typesData  = loadAlteredData('types');
$powersData = loadAlteredData('powers');
$txt['types'] = array_map(fn($t) => $t[$uiLang] ?? $t['en'], $typesData);

$typeOrder  = array_keys($typesData);
$typeOrder[] = 'OTHER'; // catch-all for cards with unrecognized types
$txt['types']['OTHER'] = $uiLang === 'fr' ? 'Autre' : 'Other';
$cardGroups = array_fill_keys($typeOrder, []);

if ($deck && !empty($deck['cards'])) {
    foreach ($deck['cards'] as $card) {
        $type = $card['cardTypeReference'] ?? 'OTHER';
        $cardGroups[$type][] = $card;
    }
    foreach ($cardGroups as &$group) {
        usort($group, fn($a, $b) => ($a['mainCost'] ?? 0) <=> ($b['mainCost'] ?? 0));
    }
    unset($group);
}

// stats
$statsCostCurve   = [];
$statsRecallCurve = [];
$statsTypeTotals  = [];
$statsPowers      = array_fill_keys(array_keys($powersData), 0.0);
$statsPowerCount  = 0;

if ($deck && !empty($deck['cards'])) {
    foreach ($deck['cards'] as $card) {
        $type = $card['cardTypeReference'] ?? 'OTHER';
        $qty  = (int)($card['quantity'] ?? 1);
        if ($type === 'HERO') continue;
        $mainCost   = min((int)($card['mainCost']   ?? 0), 7);
        $recallCost = min((int)($card['recallCost'] ?? 0), 7);
        $statsCostCurve[$mainCost]     = ($statsCostCurve[$mainCost]     ?? 0) + $qty;
        $statsRecallCurve[$recallCost] = ($statsRecallCurve[$recallCost] ?? 0) + $qty;
        $statsTypeTotals[$type] = ($statsTypeTotals[$type] ?? 0) + $qty;
        foreach (array_keys($powersData) as $_pk) {
            $statsPowers[$_pk] += (float)($card[$_pk . 'Power'] ?? 0) * $qty;
        }
        $statsPowerCount += $qty;
    }
    ksort($statsCostCurve);
    ksort($statsRecallCurve);
}
$statsAvgPowers = $statsPowerCount > 0
    ? array_combine(array_keys($statsPowers), array_map(fn($v) => round($v / $statsPowerCount, 1), $statsPowers))
    : array_fill_keys(array_keys($powersData), 0);
$maxCostQty   = $statsCostCurve   ? max($statsCostCurve)   : 1;
$maxRecallQty = $statsRecallCurve ? max($statsRecallCurve) : 1;
$maxTypeQty   = $statsTypeTotals  ? max($statsTypeTotals)  : 1;
$maxPower     = max(max(array_values($statsAvgPowers)), 1);

// Build plain-text decklist for clipboard copy
$decklistLines = [];
if (!empty($cardGroups['HERO'][0])) {
    $decklistLines[] = '1 ' . ($cardGroups['HERO'][0]['cardReference'] ?? '');
}
foreach ($typeOrder as $_dlType) {
    if ($_dlType === 'HERO') continue;
    foreach ($cardGroups[$_dlType] as $_dlCard) {
        if (!empty($_dlCard['cardReference'])) {
            $decklistLines[] = ((int)($_dlCard['quantity'] ?? 1)) . ' ' . $_dlCard['cardReference'];
        }
    }
}
$decklistText = implode("\n", $decklistLines);

$heroCard    = $cardGroups['HERO'][0] ?? null;
$heroRef     = $heroCard['cardReference'] ?? '';
$heroName    = $heroCard['name'] ?? null;
$heroImgUrl  = $heroRef ? CDN_URL . '/cards/hero/' . $heroRef . '_1.webp' : null;
$factionCode = $heroCard['factionCode'] ?? null;
$factionsData   = loadAlteredData('factions');
$formatsData    = loadAlteredData('formats');
$raritiesData   = loadAlteredData('rarities');
$factionColor   = $factionsData[$factionCode]['color'] ?? '#ffffff';
$_gemColors = [];
foreach ($raritiesData as $_rd) {
    if (!empty($_rd['gem'])) $_gemColors[$_rd['gem']] = $_rd['color'] ?? '';
}
$factionImgPath = dirname(__DIR__) . '/plugins/core-altered-cards/assets/faction/' . $factionCode . '.png';
$factionImg     = ($factionCode && file_exists($factionImgPath))
    ? $pluginAssetsUrl . '/faction/' . $factionCode . '.png' : null;

$_apiByRarity = $deck['stats']['byRarity'] ?? [];
$byRarity = [];
foreach ($raritiesData as $_rd) {
    $g = $_rd['gem'] ?? null;
    if ($g) $byRarity[$g] = (int)($_apiByRarity[$g] ?? 0);
}

function _deck_is_unique(string $ref): bool {
    $p = explode('_', $ref);
    return isset($p[5]) && $p[5][0] === 'U';
}
function _deck_cdn_url(string $ref, string $lang): string {
    $p = explode('_', $ref);
    return CDN_URL . '/cards/' . $lang . '/' . ($p[1] ?? '') . '/' . $ref . '.webp';
}

$hasUniqueCards = false;
if ($deck && !empty($deck['cards'])) {
    foreach ($deck['cards'] as $_c) {
        if (_deck_is_unique($_c['cardReference'] ?? '')) { $hasUniqueCards = true; break; }
    }
}
$rendererSrc = 'https://cdn.jsdelivr.net/gh/PolluxTroy0/Altered-Card-Renderer@main/altered-card-renderer-minified.js';

?>
<?php if (defined('API_RESPONSE_DEBUG') && API_RESPONSE_DEBUG && $deck): ?>
<script>console.log('[deck] API response:', <?= json_encode($deck) ?>);</script>
<?php endif; ?>

<div class="container py-4">

    <div class="section-title mb-3"><span><?= h($deck['name'] ?? $txt['page_title']) ?></span></div>

    <div class="d-flex align-items-center justify-content-between mb-4 gap-2 flex-wrap">
        <a href="<?= BASE_URL ?>/pages/decks" class="btn btn-outline-secondary btn-sm">
            <i class="fa-solid fa-arrow-left me-1"></i>
            <?= h($txt['back']) ?>
        </a>
        <?php if ($deck): ?>
        <div class="d-flex gap-2 align-items-center flex-wrap">
            <?php if ($isOwner): ?>
            <?php
            $_editHref = $showEditBtn
                ? BASE_URL . '/pages/deckbuilder?id=' . rawurlencode($deckId)
                : str_replace('{deck_id}', rawurlencode($deckId), $editDeckUrl);
            $_showEdit = $showEditBtn || $editDeckUrl !== '';
            ?>
            <?php if ($_showEdit): ?>
            <a href="<?= h($_editHref) ?>" class="btn btn-outline-secondary btn-sm js-deck-edit">
                <i class="fa-solid fa-pen me-sm-1"></i><span class="d-none d-sm-inline"><?= h($txt['edit_btn']) ?></span>
            </a>
            <?php endif; ?>
            <?php if ($showDeleteBtn): ?>
            <form method="post" class="d-inline"
                  onsubmit="return confirm(<?= h(json_encode($txt['delete_confirm'])) ?>)">
                <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                <input type="hidden" name="action"     value="delete_deck">
                <input type="hidden" name="deck_id"    value="<?= h($deckId) ?>">
                <button type="submit" class="btn btn-sm btn-outline-danger">
                    <i class="fa-solid fa-trash me-sm-1"></i><span class="d-none d-sm-inline"><?= h($txt['delete_btn']) ?></span>
                </button>
            </form>
            <?php endif; ?>
            <button type="button" id="deck-rename-btn" class="btn btn-outline-secondary btn-sm">
                <i class="fa-solid fa-pencil me-sm-1"></i><span class="d-none d-sm-inline"><?= h($txt['rename_btn']) ?></span>
            </button>
            <?php endif; ?>
            <?php if (!empty($deck['cards'])): ?>
            <button type="button" id="deck-copy-btn" class="btn btn-outline-secondary btn-sm">
                <i class="fa-solid fa-clipboard-list me-sm-1"></i><span class="d-none d-sm-inline"><?= h($txt['copy_btn']) ?></span>
            </button>
            <?php endif; ?>
            <button type="button" id="deck-share-btn" class="btn btn-outline-secondary btn-sm">
                <i class="fa-solid fa-share-nodes me-sm-1"></i><span class="d-none d-sm-inline"><?= h($txt['share_btn']) ?></span>
            </button>
        </div>
        <?php endif; ?>
    </div>

    <?php if ($isDeckPrivate): ?>
    <div class="text-center py-5">
        <i class="fa-solid fa-lock" style="font-size:3rem;color:var(--neutral-200);margin-bottom:1.25rem;display:block"></i>
        <p class="text-muted"><?= h($txt['deck_private']) ?></p>
    </div>

    <?php elseif ($apiError): ?>
    <div class="text-center py-5">
        <i class="fa-solid fa-triangle-exclamation" style="font-size:3rem;color:#f87171;margin-bottom:.75rem;display:block"></i>
        <p class="text-muted mb-1"><?= h($apiError) ?></p>
        <p class="text-muted small"><?= h($txt['api_later']) ?></p>
    </div>

    <?php elseif ($deck): ?>

    <!-- Deck header banner -->
    <?php
    $hdrStyle = $heroImgUrl
        ? 'background-image:linear-gradient(to right,' . $factionColor . ' 35%,' . $factionColor . '00 100%),url(' . h($heroImgUrl) . ');background-size:cover;background-position:left top;'
        : '';
    ?>
    <div class="card-altered p-4 mb-4<?= $heroImgUrl ? ' deck-card-text-white' : '' ?>" style="<?= $hdrStyle ?>">
        <div class="d-flex align-items-start flex-wrap gap-3 justify-content-between">
            <div>
                <div class="d-flex align-items-center gap-2 mb-2">
                    <?php if ($factionImg): ?>
                    <img src="<?= h($factionImg) ?>" alt="<?= h($factionCode) ?>" style="width:32px;height:32px;object-fit:contain">
                    <?php endif; ?>
                    <div>
                        <h1 class="deck-hdr-title"><?= h($deck['name'] ?? '') ?></h1>
                        <?php if ($heroName): ?>
                        <div class="deck-hdr-meta"><?= h($heroName) ?></div>
                        <?php endif; ?>
                    </div>
                </div>
                <div class="d-flex flex-wrap gap-2 align-items-center mb-3">
                    <?php
                    $fmt      = strtolower($deck['format'] ?? 'standard');
                    $fmtData  = $formatsData[$fmt] ?? null;
                    $fmtLabel = $fmtData ? ($fmtData[$uiLang] ?? $fmtData['en'] ?? ucfirst($fmt)) : ucfirst($fmt);
                    $fmtColor = $fmtData['color'] ?? 'var(--primary-400)';
                    ?>
                    <span class="badge" style="background:<?= $fmtColor ?>;color:#fff"><?= h($fmtLabel) ?></span>
                    <?php
                    $_deckLegal   = $deck['legal'] ?? null;
                    $_fmtErrors   = is_array($deck['formatErrors'] ?? null) ? $deck['formatErrors'] : [];
                    $_legalDetail = is_array($deck['legalityDetail'] ?? null) ? $deck['legalityDetail'] : [];
                    // Only show Illegal when there are actual failing checks; a freshly
                    // imported draft returns legal=false before the API calculates legality.
                    $_hasActualErrors = !empty($_fmtErrors);
                    if (!$_hasActualErrors) {
                        foreach ($_legalDetail as $_lk => $_lv) {
                            if ($_lk !== 'global' && $_lv === false) { $_hasActualErrors = true; break; }
                        }
                    }
                    if ($_deckLegal === true): ?>
                    <span class="badge bg-success">
                        <i class="fa-solid fa-check me-1"></i><?= h($txt['legal']) ?>
                    </span>
                    <?php elseif ($_deckLegal === false && $_hasActualErrors): ?>
                    <button type="button" class="badge border-0 bg-danger js-deck-illegal"
                            data-errors="<?= h(json_encode($_fmtErrors)) ?>"
                            data-legality="<?= h(json_encode($_legalDetail)) ?>"
                            data-format="<?= h($fmtLabel) ?>"
                            style="cursor:pointer">
                        <i class="fa-solid fa-triangle-exclamation me-1"></i><?= h($txt['illegal']) ?>
                    </button>
                    <?php endif; ?>
                    <span id="deck-visibility-badge" class="badge <?= $heroImgUrl ? 'deck-badge-on-img' : 'deck-badge-no-img' ?>">
                        <i class="fa-solid <?= !empty($deck['isPublic']) ? 'fa-globe' : 'fa-lock' ?> me-1"></i>
                        <?= h(!empty($deck['isPublic']) ? $txt['public'] : $txt['private']) ?>
                    </span>
                    <?php if (!isset($deck['isDraft']) || $deck['isDraft']): ?>
                    <span class="badge bg-secondary"><?= h($txt['draft']) ?></span>
                    <?php endif; ?>
                    <?php if (!empty($deck['createdAt'])): ?>
                    <span class="<?= $heroImgUrl ? 'deck-hdr-on-bg' : 'text-muted small' ?>"><?= h($txt['created']) ?> <?= date('d/m/Y', strtotime($deck['createdAt'])) ?></span>
                    <?php endif; ?>
                </div>
                <!-- Rarity breakdown -->
                <div class="d-flex align-items-center gap-3">
                    <?php
                    $totalDeckCards = array_sum($byRarity);
                    if ($totalDeckCards > 0): ?>
                    <span class="<?= $heroImgUrl ? 'deck-hdr-on-bg' : 'text-muted small' ?>"><?= $totalDeckCards ?> <?= h($txt['cards']) ?></span>
                    <?php endif; ?>
                    <?php foreach (['C','R','E','U'] as $r):
                        if (($byRarity[$r] ?? 0) === 0) continue;
                        $rColor = $heroImgUrl ? 'color:rgba(255,255,255,.85)' : (($_gemColors[$r] ?? '') ? 'color:' . $_gemColors[$r] : ''); ?>
                    <span class="d-flex align-items-center gap-1">
                        <img src="<?= $pluginAssetsUrl ?>/gems/<?= $r ?>.png" alt="<?= $r ?>" style="width:16px;height:16px;object-fit:contain">
                        <span class="fw-semibold" <?= $rColor ? 'style="'.$rColor.'"' : '' ?>><?= $byRarity[$r] ?></span>
                    </span>
                    <?php endforeach; ?>
                </div>
            </div>
        </div>
    </div>

    <div class="decks-tabs mb-3">
            <?php if (!empty($deck['cards'])): ?>
            <button type="button" id="deck-view-grid" class="decks-tab active">
                <i class="fa-solid fa-grip"></i>
                <span><?= h($txt['view_grid']) ?></span>
            </button>
            <button type="button" id="deck-view-list" class="decks-tab">
                <i class="fa-solid fa-list"></i>
                <span><?= h($txt['view_list']) ?></span>
            </button>
            <?php endif; ?>
            <button type="button" id="deck-view-desc" class="decks-tab<?= empty($deck['cards']) ? ' active' : '' ?>">
                <i class="fa-solid fa-align-left"></i>
                <span><?= h($txt['description']) ?></span>
            </button>
            <?php if (!empty($deck['cards'])): ?>
            <button type="button" id="deck-view-stats" class="decks-tab">
                <i class="fa-solid fa-chart-pie"></i>
                <span>Stats</span>
            </button>
            <?php endif; ?>
        </div>

        <!-- Grid view -->
        <div id="deck-grid-view">
        <?php foreach ($typeOrder as $type):
            if ($type === 'HERO' || empty($cardGroups[$type])) continue;
            $groupTotal = array_sum(array_column($cardGroups[$type], 'quantity'));
        ?>
        <div class="mb-5">
            <div class="deck-type-header">
                <?= h($txt['types'][$type] ?? $type) ?>
                <span class="badge bg-secondary" style="font-size:.65rem"><?= $groupTotal ?></span>
            </div>
            <div class="deck-cards-grid">
            <?php foreach ($cardGroups[$type] as $card):
                $ref = $card['cardReference'] ?? '';
                $qty = (int)($card['quantity'] ?? 1);
            ?>
            <div class="deck-card-wrap" data-ref="<?= h($ref) ?>"
                 data-unique="<?= _deck_is_unique($ref) ? '1' : '0' ?>" data-lang="<?= h($uiLang) ?>">
                <span class="deck-card-qty">×<?= $qty ?></span>
                <?php if (_deck_is_unique($ref)): ?>
                <altered-card ref="<?= h($ref) ?>" locale="<?= h($uiLang) ?>"></altered-card>
                <?php else: ?>
                <img src="<?= h(_deck_cdn_url($ref, $uiLang)) ?>" alt="<?= h($card['name'] ?? $ref) ?>" class="deck-card-img" loading="lazy">
                <?php endif; ?>
            </div>
            <?php endforeach; ?>
            </div>
        </div>
        <?php endforeach; ?>
        </div>

        <!-- Decklist view -->
        <div id="deck-list-view" style="display:none">
        <?php foreach ($typeOrder as $type):
            if ($type === 'HERO' || empty($cardGroups[$type])) continue;
            $groupTotal = array_sum(array_column($cardGroups[$type], 'quantity'));
        ?>
        <div class="deck-type-section">
            <div class="deck-type-header">
                <?= h($txt['types'][$type] ?? $type) ?>
                <span class="badge bg-secondary" style="font-size:.65rem"><?= $groupTotal ?></span>
            </div>
            <?php foreach ($cardGroups[$type] as $card):
                $ref         = $card['cardReference'] ?? '';
                $qty         = (int)($card['quantity'] ?? 1);
                $cardFaction = $card['factionCode'] ?? '';
                $_refParts   = explode('_', $ref);
                $cardRarityL = $_refParts[5][0] ?? '';
                $_rawName    = $card['name'] ?? null;
                $cardName    = is_array($_rawName)
                    ? (($_rawName[$lang] ?? '') ?: ($_rawName['en'] ?? $ref))
                    : (($_rawName !== null && $_rawName !== '') ? $_rawName : $ref);
                $cMain    = (int)($card['mainCost']     ?? 0);
                $cRecall  = (int)($card['recallCost']   ?? 0);
                $cOcean   = (int)($card['oceanPower']   ?? 0);
                $cMtn     = (int)($card['mountainPower'] ?? 0);
                $cForest  = (int)($card['forestPower']  ?? 0);
            ?>
            <div class="decklist-row" data-ref="<?= h($ref) ?>"
                 data-unique="<?= _deck_is_unique($ref) ? '1' : '0' ?>"
                 data-lang="<?= h($uiLang) ?>"
                 data-img-src="<?= h(_deck_cdn_url($ref, $uiLang)) ?>">
                <span class="decklist-qty">×<?= $qty ?></span>
                <span class="decklist-faction">
                    <?php if ($cardFaction): ?>
                    <img src="<?= h($pluginAssetsUrl . '/faction/' . $cardFaction . '.png') ?>"
                         alt="<?= h($cardFaction) ?>">
                    <?php endif; ?>
                </span>
                <?php if ($cardRarityL): ?>
                <img src="<?= h($pluginAssetsUrl . '/gems/' . $cardRarityL . '.png') ?>"
                     alt="<?= h($cardRarityL) ?>" style="width:13px;height:13px;object-fit:contain;flex-shrink:0">
                <?php endif; ?>
                <span class="decklist-name"><?= h($cardName) ?></span>
                <span class="decklist-stats d-none d-sm-flex">
                    <span class="decklist-stat"><i class="fak fa-altered-h" style="font-size:.8rem"></i><?= $cMain ?></span>
                    <span class="decklist-stat"><i class="fak fa-altered-r" style="font-size:.8rem"></i><?= $cRecall ?></span>
                    <span class="decklist-stat"><img src="<?= $pluginAssetsUrl ?>/biome/F.webp" alt="F"><?= $cForest ?></span>
                    <span class="decklist-stat"><img src="<?= $pluginAssetsUrl ?>/biome/M.webp" alt="M"><?= $cMtn ?></span>
                    <span class="decklist-stat"><img src="<?= $pluginAssetsUrl ?>/biome/O.webp" alt="O"><?= $cOcean ?></span>
                </span>
            </div>
            <?php endforeach; ?>
        </div>
        <?php endforeach; ?>
        </div>

        <!-- Description view -->
        <div id="deck-desc-view"<?= !empty($deck['cards']) ? ' style="display:none"' : '' ?>>
            <?php if (!empty($deck['description'])): ?>
            <p style="white-space:pre-wrap;font-size:.9rem;line-height:1.6;color:var(--neutral-600)"><?= h($deck['description']) ?></p>
            <?php else: ?>
            <p class="text-muted" style="font-size:.9rem"><?= h($txt['no_description']) ?></p>
            <?php endif; ?>
        </div>

        <!-- Stats view -->
        <?php if (!empty($deck['cards'])): ?>
        <div id="deck-stats-view" style="display:none">
        <div class="deck-stats-col">
            <?php
            // Render a vertical cost curve (slots 0-7)
            $renderVCurve = function(array $curve, int $maxQty, string $color) {
                $counts = '';
                $bars   = '';
                $labels = '';
                for ($i = 1; $i <= 7; $i++) {
                    $qty  = $curve[$i] ?? 0;
                    $h    = $maxQty > 0 ? round($qty / $maxQty * 100) : 0;
                    $lbl  = $i < 7 ? (string)$i : '7+';
                    $counts .= '<span>' . ($qty > 0 ? $qty : '') . '</span>';
                    $bars   .= '<div class="vcurve-bar" style="height:' . $h . '%;background:' . $color . '"></div>';
                    $labels .= '<span>' . $lbl . '</span>';
                }
                return '<div class="vcurve-counts">' . $counts . '</div>'
                     . '<div class="vcurve-bars">'   . $bars   . '</div>'
                     . '<div class="vcurve-labels">' . $labels . '</div>';
            };
            ?>
            <div class="deck-stat-card">
                <div class="deck-stat-title"><?= h($txt['stats_cost_main']) ?></div>
                <?php if ($statsCostCurve): ?>
                    <?= $renderVCurve($statsCostCurve, $maxCostQty, 'var(--primary-400)') ?>
                <?php else: ?>
                    <span style="font-size:.78rem;color:var(--neutral-400)">—</span>
                <?php endif; ?>
            </div>
            <div class="deck-stat-card">
                <div class="deck-stat-title"><?= h($txt['stats_cost_recall']) ?></div>
                <?php if ($statsRecallCurve): ?>
                    <?= $renderVCurve($statsRecallCurve, $maxRecallQty, 'var(--secondary-400,#a78bfa)') ?>
                <?php else: ?>
                    <span style="font-size:.78rem;color:var(--neutral-400)">—</span>
                <?php endif; ?>
            </div>
            <div class="deck-stat-card">
                <div class="deck-stat-title"><?= h($txt['stats_types']) ?></div>
                <?php foreach ($typeOrder as $type):
                    if ($type === 'HERO' || empty($statsTypeTotals[$type])) continue;
                    $qty = $statsTypeTotals[$type];
                ?>
                <div class="stat-bar-row">
                    <span class="stat-bar-label" style="min-width:70px;text-align:left;font-size:.72rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><?= h($txt['types'][$type] ?? $type) ?></span>
                    <div class="stat-bar-track"><div class="stat-bar-fill" style="width:<?= $maxTypeQty > 0 ? round($qty / $maxTypeQty * 100) : 0 ?>%"></div></div>
                    <span class="stat-bar-val"><?= $qty ?></span>
                </div>
                <?php endforeach; ?>
            </div>
            <div class="deck-stat-card">
                <div class="deck-stat-title"><?= h($txt['stats_powers']) ?></div>
                <?php
                foreach ($powersData as $pk => $pinfo): ?>
                <div class="stat-bar-row">
                    <span class="stat-bar-label" style="min-width:20px"><img src="<?= $pluginAssetsUrl ?>/biome/<?= $pinfo['img'] ?>" style="width:16px;height:16px;object-fit:contain" alt="<?= $pk ?>"></span>
                    <div class="stat-bar-track"><div class="stat-bar-fill" style="width:<?= $maxPower > 0 ? round($statsAvgPowers[$pk] / $maxPower * 100) : 0 ?>%;background:<?= $pinfo['color'] ?>"></div></div>
                    <span class="stat-bar-val"><?= $statsAvgPowers[$pk] ?></span>
                </div>
                <?php endforeach; ?>
            </div>
        </div>
        </div>
        <?php endif; ?>

    <?php endif; ?>

</div>

<!-- Deck Legality modal -->
<div class="modal fade" id="deckFormatErrorsModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable" style="max-width:480px">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title"><i class="fa-solid fa-scale-balanced me-2"></i><?= h($txt['legality_modal_title']) ?></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body" id="deckFormatErrorsBody"></div>
        </div>
    </div>
</div>
<script>
(function() {
    var legalityKeys          = <?= json_encode($txt['legality_keys']) ?>;
    var legalityFormatSection = <?= json_encode($txt['legality_format_section']) ?>;
    var legalityRulesSection  = <?= json_encode($txt['legality_rules_section']) ?>;
    var legalityErrorsSection = <?= json_encode($txt['legality_errors_section']) ?>;

    function esc(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function sectionLabel(label) {
        return '<p class="text-uppercase fw-bold small mb-1">' + esc(label) + '</p>';
    }

    document.addEventListener('click', function(e) {
        var btn = e.target.closest('.js-deck-illegal');
        if (!btn) return;
        var errors = [], detail = {};
        try { errors = JSON.parse(btn.dataset.errors || '[]'); } catch(_) {}
        try { detail = JSON.parse(btn.dataset.legality || '{}'); } catch(_) {}
        var deckFormat = btn.dataset.format || '';

        var html = '';

        // Deck Format section
        html += '<div class="mb-3">'
              + sectionLabel(legalityFormatSection)
              + '<p class="mb-0">' + esc(deckFormat) + '</p>'
              + '</div>';

        // Deck Legality Error section
        var failures = [];
        Object.keys(detail).forEach(function(k) {
            if (k !== 'global' && detail[k] === false) {
                failures.push(legalityKeys[k] || k);
            }
        });
        if (failures.length) {
            html += '<div class="mb-3">'
                  + sectionLabel(legalityRulesSection)
                  + '<ul class="mb-0 ps-3">' + failures.map(function(f) {
                        return '<li class="small">' + esc(f) + '</li>';
                    }).join('') + '</ul>'
                  + '</div>';
        }

        // Format Errors section
        if (errors.length) {
            html += '<div class="mb-0">'
                  + sectionLabel(legalityErrorsSection)
                  + '<ul class="mb-0 ps-3">' + errors.map(function(err) {
                        return '<li class="small">' + esc(String(err)) + '</li>';
                    }).join('') + '</ul>'
                  + '</div>';
        }

        var body = document.getElementById('deckFormatErrorsBody');
        if (body) body.innerHTML = html;
        var modal = document.getElementById('deckFormatErrorsModal');
        if (modal && typeof bootstrap !== 'undefined') bootstrap.Modal.getOrCreateInstance(modal).show();
    });
}());
</script>

<!-- Share modal -->
<div class="modal fade" id="deckShareModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" style="max-width:400px">
        <div class="modal-content db-modal-content">
            <div class="modal-body p-4 db-modal-body">
                <div class="d-flex align-items-center justify-content-between mb-3">
                    <h5 class="fw-bold mb-0"><?= h($txt['share_title']) ?></h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <label class="form-label small fw-semibold mb-1"><?= h($txt['share_link_label']) ?></label>
                <div class="input-group mb-3">
                    <input type="text" id="deck-share-url" class="form-control form-control-sm" readonly style="font-size:.82rem">
                    <button type="button" id="deck-share-copy" class="btn btn-primary-altered btn-sm">
                        <i class="fa-solid fa-copy me-1"></i><?= h($txt['share_copy']) ?>
                    </button>
                </div>
                <div id="deck-share-qr" class="d-flex justify-content-center" style="padding:12px;background:#fff;border-radius:10px;border:1px solid var(--sand-200)"></div>
            </div>
        </div>
    </div>
</div>

<!-- Share private warning modal -->
<?php if ($isOwner && empty($deck['isPublic'])): ?>
<div class="modal fade" id="deckSharePrivateModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" style="max-width:400px">
        <div class="modal-content db-modal-content">
            <div class="modal-body p-4 db-modal-body">
                <h5 class="fw-bold mb-3">
                    <i class="fa-solid fa-lock me-2"></i><?= h($txt['share_private_title']) ?>
                </h5>
                <p class="small mb-3" style="color:var(--neutral-600)"><?= h($txt['share_private_body']) ?></p>
                <div id="deck-share-private-error" class="alert alert-danger p-2 mb-3 small" style="display:none"></div>
                <div class="d-flex gap-2">
                    <button type="button" class="btn btn-outline-secondary flex-fill" data-bs-dismiss="modal">
                        <?= h($txt['cancel']) ?>
                    </button>
                    <button type="button" id="deck-share-make-public" class="btn btn-primary-altered flex-fill">
                        <i class="fa-solid fa-globe me-1"></i><?= h($txt['share_make_public']) ?>
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>
<?php endif; ?>

<!-- Card lightbox -->
<div id="card-modal" class="ac-lightbox-overlay" style="display:none">
    <div id="card-modal-inner" class="ac-lightbox-inner" onclick="event.stopPropagation()"></div>
</div>

<?php if ($hasUniqueCards): ?>
<script src="<?= h($rendererSrc) ?>"></script>
<?php endif; ?>

<script>
(function () {
    var modal = document.getElementById('card-modal');
    var inner = document.getElementById('card-modal-inner');
    var detailLabel = <?= json_encode($txt['detail_label']) ?>;
    var cardDetailBase = <?= json_encode(BASE_URL . '/pages/card') ?>;
    var cardDetailLang = <?= json_encode(in_array($uiLang, ['en', 'fr']) ? $uiLang : 'en') ?>;

    function closeModal() {
        modal.style.display = 'none'; inner.innerHTML = '';
        document.body.style.overflow = '';
    }
    function openModal(ref, unique, lang, imgSrc) {
        inner.innerHTML = '';
        var cardEl;
        if (unique) {
            cardEl = document.createElement('altered-card');
            cardEl.setAttribute('ref', ref); cardEl.setAttribute('locale', lang);
            cardEl.style.cssText = 'display:block;width:100%;max-height:80vh;border-radius:12px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.6);cursor:pointer';
        } else {
            cardEl = document.createElement('img');
            cardEl.src = imgSrc || ''; cardEl.alt = '';
            cardEl.style.cssText = 'display:block;width:100%;max-height:80vh;object-fit:contain;border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,.6);cursor:pointer';
        }
        cardEl.addEventListener('click', closeModal);
        inner.appendChild(cardEl);
        var detailBtn = document.createElement('a');
        detailBtn.href = cardDetailBase + '?ref=' + encodeURIComponent(ref) + '&card_lang=' + cardDetailLang;
        detailBtn.innerHTML = '<i class="fa-solid fa-circle-info me-1"></i>' + detailLabel;
        detailBtn.className = 'btn btn-sm btn-primary-altered';
        detailBtn.style.cssText = 'display:block;width:100%;margin-top:8px;text-decoration:none';
        inner.appendChild(detailBtn);
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    document.querySelectorAll('.deck-card-wrap').forEach(function (w) {
        w.addEventListener('click', function () {
            var srcImg = w.querySelector('img');
            openModal(w.dataset.ref, w.dataset.unique === '1', w.dataset.lang, srcImg ? srcImg.src : '');
        });
    });
    document.querySelectorAll('.decklist-row[data-ref]').forEach(function (row) {
        row.addEventListener('click', function () {
            openModal(row.dataset.ref, row.dataset.unique === '1', row.dataset.lang, row.dataset.imgSrc || '');
        });
    });
    modal.addEventListener('click', closeModal);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
}());
</script>

<!-- View toggle -->
<script>
(function() {
    var gridBtn   = document.getElementById('deck-view-grid');
    var listBtn   = document.getElementById('deck-view-list');
    var descBtn   = document.getElementById('deck-view-desc');
    var statsBtn  = document.getElementById('deck-view-stats');
    var gridView  = document.getElementById('deck-grid-view');
    var listView  = document.getElementById('deck-list-view');
    var descView  = document.getElementById('deck-desc-view');
    var statsView = document.getElementById('deck-stats-view');
    function showView(which) {
        if (gridView)  gridView.style.display  = which === 'grid'  ? '' : 'none';
        if (listView)  listView.style.display  = which === 'list'  ? '' : 'none';
        if (descView)  descView.style.display  = which === 'desc'  ? '' : 'none';
        if (statsView) statsView.style.display = which === 'stats' ? '' : 'none';
        if (gridBtn)   gridBtn.classList.toggle('active',  which === 'grid');
        if (listBtn)   listBtn.classList.toggle('active',  which === 'list');
        if (descBtn)   descBtn.classList.toggle('active',  which === 'desc');
        if (statsBtn)  statsBtn.classList.toggle('active', which === 'stats');
        var tabBar = document.querySelector('.decks-tabs');
        if (tabBar) {
            var navH = (document.querySelector('.site-header') || {}).offsetHeight || 0;
            if (window.innerWidth >= 992) {
                window.scrollTo({ top: tabBar.getBoundingClientRect().top + window.scrollY - navH, behavior: 'smooth' });
            } else {
                var pane = which === 'grid' ? gridView : which === 'list' ? listView : which === 'desc' ? descView : statsView;
                if (pane) window.scrollTo({ top: pane.getBoundingClientRect().top + window.scrollY - navH, behavior: 'smooth' });
            }
        }
    }
    if (gridBtn)  gridBtn.addEventListener('click',  function() { showView('grid'); });
    if (listBtn)  listBtn.addEventListener('click',  function() { showView('list'); });
    if (descBtn)  descBtn.addEventListener('click',  function() { showView('desc'); });
    if (statsBtn) statsBtn.addEventListener('click', function() { showView('stats'); });
})();
</script>

<!-- Share -->
<script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>
<script>
(function() {
    var shareUrl    = <?= json_encode(
        ((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http')
        . '://' . $_SERVER['HTTP_HOST']
        . BASE_URL . '/pages/deck?id=' . rawurlencode($deckId)
    ) ?>;
    var copyLabel   = <?= json_encode($txt['share_copy']) ?>;
    var copiedLabel = <?= json_encode($txt['share_copied']) ?>;
    var isOwner     = <?= $isOwner ? 'true' : 'false' ?>;
    var deckIsPublic = <?= !empty($deck['isPublic']) ? 'true' : 'false' ?>;
    var csrfToken   = <?= json_encode(csrfToken()) ?>;
    var deckId      = <?= json_encode($deckId) ?>;
    var baseUrl     = <?= json_encode(BASE_URL) ?>;
    var makingPublicLabel = <?= json_encode($txt['share_making_public']) ?>;
    var makePublicLabel   = <?= json_encode('<i class="fa-solid fa-globe me-1"></i>' . h($txt['share_make_public'])) ?>;
    var publicLabel       = <?= json_encode($txt['public']) ?>;
    var errConn           = <?= json_encode($txt['err_connect']) ?>;

    var shareBtn    = document.getElementById('deck-share-btn');
    var shareModal  = null;
    var urlInput    = document.getElementById('deck-share-url');
    var copyBtn     = document.getElementById('deck-share-copy');
    var qrContainer = document.getElementById('deck-share-qr');
    var qrGenerated = false;

    urlInput.value = shareUrl;

    function openShareModal() {
        if (!shareModal) shareModal = new bootstrap.Modal(document.getElementById('deckShareModal'));
        shareModal.show();
        if (!qrGenerated) {
            qrGenerated = true;
            new QRCode(qrContainer, {
                text: shareUrl,
                width: 200,
                height: 200,
                colorDark: '#2C2416',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.M,
            });
        }
    }

    shareBtn.addEventListener('click', function() {
        if (!deckIsPublic && isOwner) {
            var privateModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('deckSharePrivateModal'));
            document.getElementById('deck-share-private-error').style.display = 'none';
            privateModal.show();
            return;
        }
        openShareModal();
    });

    copyBtn.addEventListener('click', function() {
        navigator.clipboard.writeText(shareUrl).then(function() {
            copyBtn.innerHTML = '<i class="fa-solid fa-check me-1"></i>' + copiedLabel;
            setTimeout(function() {
                copyBtn.innerHTML = '<i class="fa-solid fa-copy me-1"></i>' + copyLabel;
            }, 2000);
        }).catch(function() {
            urlInput.select();
            document.execCommand('copy');
        });
    });

    var makePubBtn = document.getElementById('deck-share-make-public');
    if (makePubBtn) {
        makePubBtn.addEventListener('click', function() {
            var errEl = document.getElementById('deck-share-private-error');
            makePubBtn.disabled = true;
            makePubBtn.textContent = makingPublicLabel;
            errEl.style.display = 'none';
            var fd = new FormData();
            fd.append('csrf_token', csrfToken);
            fd.append('action', 'make_public');
            fetch(baseUrl + '/pages/deck?ajax=1&id=' + encodeURIComponent(deckId), { method: 'POST', body: fd })
                .then(function(r) { return r.json(); })
                .then(function(d) {
                    if (d.ok) {
                        deckIsPublic = true;
                        var badge = document.getElementById('deck-visibility-badge');
                        if (badge) badge.innerHTML = '<i class="fa-solid fa-globe me-1"></i>' + publicLabel;
                        bootstrap.Modal.getInstance(document.getElementById('deckSharePrivateModal')).hide();
                        openShareModal();
                    } else {
                        errEl.textContent = d.error || 'Error';
                        errEl.style.display = '';
                    }
                })
                .catch(function() {
                    errEl.textContent = errConn;
                    errEl.style.display = '';
                })
                .finally(function() {
                    makePubBtn.disabled = false;
                    makePubBtn.innerHTML = makePublicLabel;
                });
        });
    }
})();
</script>

<!-- Copy decklist -->
<?php if (!empty($deck['cards'])): ?>
<script>
(function() {
    var decklistText = <?= json_encode($decklistText) ?>;
    var copyLabel    = <?= json_encode($txt['copy_btn']) ?>;
    var copiedLabel  = <?= json_encode($txt['copy_ok']) ?>;
    var btn = document.getElementById('deck-copy-btn');
    if (!btn) return;
    btn.addEventListener('click', function() {
        navigator.clipboard.writeText(decklistText).then(function() {
            btn.innerHTML = '<i class="fa-solid fa-check me-1"></i>' + copiedLabel;
            setTimeout(function() {
                btn.innerHTML = '<i class="fa-solid fa-clipboard-list me-1"></i>' + copyLabel;
            }, 2000);
        }).catch(function() {
            var ta = document.createElement('textarea');
            ta.value = decklistText;
            ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta); ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        });
    });
})();
</script>
<?php endif; ?>

<?php if ($isOwner): ?>
<!-- Rename modal -->
<div class="modal fade" id="deckRenameModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" style="max-width:420px">
        <div class="modal-content db-modal-content">
            <div class="modal-body p-4 db-modal-body">
                <h5 class="fw-bold mb-3"><?= h($txt['rename_btn']) ?></h5>
                <div id="deck-rename-error" class="alert alert-danger p-2 mb-3 small" style="display:none"></div>
                <input type="text" id="deck-rename-input" class="form-control mb-3"
                       placeholder="<?= h($txt['rename_ph']) ?>"
                       value="<?= h($deck['name'] ?? '') ?>">
                <div class="d-flex gap-2">
                    <button type="button" class="btn btn-outline-secondary flex-fill" data-bs-dismiss="modal">
                        <?= h($txt['cancel']) ?>
                    </button>
                    <button type="button" id="deck-rename-confirm" class="btn btn-primary-altered flex-fill">
                        <i class="fa-solid fa-check me-1"></i><?= h($txt['rename_btn']) ?>
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>
<script>
(function() {
    var csrfToken = <?= json_encode(csrfToken()) ?>;
    var deckId    = <?= json_encode($deckId) ?>;
    var baseUrl   = <?= json_encode(BASE_URL) ?>;
    var renaming  = <?= json_encode($txt['renaming']) ?>;
    var errConn   = <?= json_encode($txt['err_connect']) ?>;
    var renameLbl = <?= json_encode('<i class="fa-solid fa-check me-1"></i>' . h($txt['rename_btn'])) ?>;
    var reqLbl    = <?= json_encode($txt['name_required']) ?>;

    function ajaxRename(name, onOk, onErr) {
        var fd = new FormData();
        fd.append('csrf_token', csrfToken);
        fd.append('action', 'rename');
        fd.append('name', name);
        fetch(baseUrl + '/pages/deck?ajax=1&id=' + encodeURIComponent(deckId), { method: 'POST', body: fd })
            .then(function(r) { return r.json(); })
            .then(function(d) { d.ok ? onOk() : onErr(d.error || 'Error'); })
            .catch(function() { onErr(errConn); });
    }

    var renameBtn     = document.getElementById('deck-rename-btn');
    var renameConfirm = document.getElementById('deck-rename-confirm');
    var renameInput   = document.getElementById('deck-rename-input');
    var renameError   = document.getElementById('deck-rename-error');
    var renameModal   = null;

    if (renameBtn) renameBtn.addEventListener('click', function() {
        if (!renameModal) renameModal = new bootstrap.Modal(document.getElementById('deckRenameModal'));
        renameError.style.display = 'none';
        renameModal.show();
        setTimeout(function() { renameInput.select(); }, 300);
    });

    if (renameConfirm) renameConfirm.addEventListener('click', function() {
        var name = renameInput.value.trim();
        if (!name) { renameError.textContent = reqLbl; renameError.style.display = ''; return; }
        renameConfirm.disabled = true;
        renameConfirm.textContent = renaming;
        renameError.style.display = 'none';
        ajaxRename(name, function() {
            var titleEl = document.querySelector('.section-title span');
            if (titleEl) titleEl.textContent = name;
            document.title = name + ' — ' + document.title.split(' — ').slice(1).join(' — ');
            renameModal.hide();
            renameConfirm.disabled = false;
            renameConfirm.innerHTML = renameLbl;
        }, function(err) {
            renameError.textContent = err;
            renameError.style.display = '';
            renameConfirm.disabled = false;
            renameConfirm.innerHTML = renameLbl;
        });
    });
})();
</script>
<?php endif; ?>

<script>
(function () {
    var theme = localStorage.getItem('acTheme') === 'dark' ? 'dark' : 'light';
    document.querySelectorAll('.js-deck-edit').forEach(function (a) {
        a.href += (a.href.indexOf('?') >= 0 ? '&' : '?') + 'theme=' + theme;
    });
}());
</script>
