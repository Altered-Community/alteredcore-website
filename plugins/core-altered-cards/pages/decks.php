<?php
require_once __DIR__ . '/../includes/functions.php';
$lang   = getLang();
$uiLang = getUiLang();

// Non-logged-in visitors are no longer redirected; they land on the Community tab by default.
require_once __DIR__ . '/../config.php';

// Path on DECKS_API_URL for public decks listing (e.g. '/api/decks/public').
// Leave empty to hide the Public tab entirely.
$publicDecksApiPath = '/api/decks/public';

// community deckbuilders (from DB)
$_db = getDB();
$_cbRows = $_db->query(q(
    "SELECT title, desc_en, desc_fr, image, url, deckbuilder_url, deckbuilder_logo, deckbuilder_enabled
     FROM {community_builders}
     WHERE is_visible = 1 ORDER BY sort_order ASC, created_at ASC"
))->fetchAll();
$communityBuilders = array_map(fn($r) => [
    'title'               => $r['title'],
    'desc'                => ['en' => $r['desc_en'] ?? '', 'fr' => $r['desc_fr'] ?? ''],
    'image'               => $r['image'] ?? '',
    'url'                 => $r['url'],
    'deckbuilder_url'     => $r['deckbuilder_url'] ?? '',
    'deckbuilder_logo'    => $r['deckbuilder_logo'] ?? '',
    'deckbuilder_enabled' => !empty($r['deckbuilder_enabled']),
], $_cbRows);

$_cbDeckbuilders = array_values(array_filter($communityBuilders, fn($cb) => $cb['deckbuilder_enabled'] && $cb['deckbuilder_url'] !== ''));

// translations
$txt = [
    'en' => [
        'page_title'      => 'Decks',
        'page_desc'       => 'Altered TCG decks.',
        'section_title'   => 'Decks',
        'tab_my'          => 'My Decks',
        'tab_public'      => 'Community',
        'create_btn'      => 'New deck',
        'import_btn'      => 'Import a deck',
        'login_msg'       => 'Sign in to access your decks.',
        'login_btn'       => 'Sign in',
        'no_decks'        => 'No decks yet.',
        'no_match'        => 'No decks match these filters.',
        'no_public_decks' => 'No public decks found.',
        'loading'         => 'Loading…',
        'draft'           => 'Draft',
        'public'          => 'Public',
        'private'         => 'Private',
        'unnamed'         => 'Unnamed',
        'cards'           => 'cards',
        'view_btn'        => 'View',
        'edit_btn'        => 'Edit',
        'delete_btn'      => 'Delete',
        'delete_confirm'  => 'Delete this deck?',
        'prev'            => 'Previous',
        'next'            => 'Next',
        'lbl_search'      => 'Search',
        'search_ph'       => 'Search a deck…',
        'lbl_format'      => 'Format',
        'lbl_faction'     => 'Faction',
        'lbl_visibility'  => 'Visibility',
        'lbl_sort'        => 'Sort',
        'sort_updated_desc' => 'Recently updated',
        'sort_updated_asc'  => 'Oldest updated',
        'sort_created_desc' => 'Recently created',
        'sort_created_asc'  => 'Oldest created',
        'sort_name_asc'     => 'Name A→Z',
        'sort_name_desc'    => 'Name Z→A',
        'err_api_auth'    => 'Could not connect to the deck API.',
        'err_connect'     => 'Connection error.',
        'api_later'       => 'The API is currently unavailable. Please try again later.',
        'err_expired'     => 'Session expired. Please reload.',
        'err_api'         => 'API error (HTTP %d).',
        'deleted_ok'      => 'Deck deleted.',
        'deleted_err'     => 'Could not delete the deck (HTTP %d).',
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
        'community_info'        => 'Other deck builders share the same database. Create, edit, or import decks in any of them and continue anywhere. All decks appear on BGA.',
        'community_btn'         => 'View deckbuilders',
        'community_modal_title' => 'Community deckbuilders',
        'community_visit'       => 'Visit',
        'import_modal_title'    => 'Import a deck',
        'import_tab_list'       => 'From decklist',
        'import_tab_gg'         => 'From Altered.gg',
        'import_name_label'     => 'Deck name',
        'import_format_label'   => 'Format',
        'import_list_label'     => 'Decklist',
        'import_list_hint'      => 'One line per card: quantity then reference (e.g. 3 ALT_CORE_B_AX_02_C)',
        'import_submit'         => 'Import',
        'import_cancel'         => 'Cancel',
        'import_err_empty'      => 'The decklist is empty or contains no valid lines.',
        'import_err_save'       => 'Could not import the deck (HTTP %d).',
        'import_gg_url_label'   => 'Deck URL or ID',
        'import_gg_url_hint'    => 'e.g. https://www.altered.gg/decks/01KD6B… or just the deck ID',
        'import_gg_err_invalid' => 'Invalid deck URL or ID.',
        'import_gg_err_fetch'   => 'Could not fetch the deck from Altered.gg.',
        'import_gg_err_empty'   => 'The deck contains no valid cards.',
        'guest_banner'          => 'Guest mode — Build a deck without an account. It is saved locally in this browser (1 deck max).',
        'guest_new_btn'         => 'New deck (guest)',
        'guest_no_deck'         => 'No local deck yet. Create one to get started.',
        'guest_local'           => 'Local',
        'guest_delete_confirm'  => 'Delete this local deck?',
        'guest_edit_btn'        => 'Edit',
        'guest_login_cta'       => 'Log in to save your decks on the server and manage multiple decks.',
        'local_deck_found'      => 'You have a deck saved in guest mode.',
        'local_save_btn'        => 'Save to my account',
        'local_discard_btn'     => 'Discard',
        'local_discard_confirm' => 'Discard this local deck? This cannot be undone.',
        'local_save_err'        => 'Could not save the deck.',
        'my_deck'               => 'My deck',
    ],
    'fr' => [
        'page_title'      => 'Decks',
        'page_desc'       => 'Decks Altered TCG.',
        'section_title'   => 'Decks',
        'tab_my'          => 'Mes decks',
        'tab_public'      => 'Communauté',
        'create_btn'      => 'Nouveau deck',
        'import_btn'      => 'Importer un deck',
        'login_msg'       => 'Connectez-vous pour accéder à vos decks.',
        'login_btn'       => 'Se connecter',
        'no_decks'        => 'Aucun deck pour l\'instant.',
        'no_match'        => 'Aucun deck ne correspond à ces filtres.',
        'no_public_decks' => 'Aucun deck public trouvé.',
        'loading'         => 'Chargement…',
        'draft'           => 'Brouillon',
        'public'          => 'Public',
        'private'         => 'Privé',
        'unnamed'         => 'Sans nom',
        'cards'           => 'cartes',
        'view_btn'        => 'Voir',
        'edit_btn'        => 'Modifier',
        'delete_btn'      => 'Supprimer',
        'delete_confirm'  => 'Supprimer ce deck ?',
        'prev'            => 'Précédent',
        'next'            => 'Suivant',
        'lbl_search'      => 'Recherche',
        'search_ph'       => 'Rechercher un deck…',
        'lbl_format'      => 'Format',
        'lbl_faction'     => 'Faction',
        'lbl_visibility'  => 'Visibilité',
        'lbl_sort'        => 'Tri',
        'sort_updated_desc' => 'Récemment modifié',
        'sort_updated_asc'  => 'Plus ancien modifié',
        'sort_created_desc' => 'Récemment créé',
        'sort_created_asc'  => 'Plus ancien créé',
        'sort_name_asc'     => 'Nom A→Z',
        'sort_name_desc'    => 'Nom Z→A',
        'err_api_auth'    => 'Impossible de se connecter à l\'API de decks.',
        'err_connect'     => 'Erreur de connexion.',
        'api_later'       => 'L\'API est actuellement indisponible. Veuillez réessayer plus tard.',
        'err_expired'     => 'Session expirée. Rechargez la page.',
        'err_api'         => 'Erreur API (HTTP %d).',
        'deleted_ok'      => 'Deck supprimé.',
        'deleted_err'     => 'Impossible de supprimer le deck (HTTP %d).',
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
        'community_info'        => 'D\'autres deck builders partagent la même base de données. Créez, modifiez ou importez vos decks dans l\'un d\'eux et continuez sur un autre. Tous les decks apparaissent sur BGA.',
        'community_btn'         => 'Voir les deckbuilders',
        'community_modal_title' => 'Deckbuilders communautaires',
        'community_visit'       => 'Visiter',
        'import_modal_title'    => 'Importer un deck',
        'import_tab_list'       => 'Depuis une decklist',
        'import_tab_gg'         => 'Depuis Altered.gg',
        'import_name_label'     => 'Nom du deck',
        'import_format_label'   => 'Format',
        'import_list_label'     => 'Decklist',
        'import_list_hint'      => 'Une carte par ligne : quantité puis référence (ex : 3 ALT_CORE_B_AX_02_C)',
        'import_submit'         => 'Importer',
        'import_cancel'         => 'Annuler',
        'import_err_empty'      => 'La decklist est vide ou ne contient aucune ligne valide.',
        'import_err_save'       => 'Impossible d\'importer le deck (HTTP %d).',
        'import_gg_url_label'   => 'URL ou ID du deck',
        'import_gg_url_hint'    => 'ex. https://www.altered.gg/decks/01KD6B… ou simplement l\'ID du deck',
        'import_gg_err_invalid' => 'URL ou ID de deck invalide.',
        'import_gg_err_fetch'   => 'Impossible de récupérer le deck depuis Altered.gg.',
        'import_gg_err_empty'   => 'Le deck ne contient aucune carte valide.',
        'guest_banner'          => 'Mode invité — Construisez un deck sans compte. Il est sauvegardé localement dans ce navigateur (1 deck maximum).',
        'guest_new_btn'         => 'Nouveau deck (invité)',
        'guest_no_deck'         => 'Aucun deck local pour l\'instant. Créez-en un pour commencer.',
        'guest_local'           => 'Local',
        'guest_delete_confirm'  => 'Supprimer ce deck local ?',
        'guest_edit_btn'        => 'Modifier',
        'guest_login_cta'       => 'Connectez-vous pour sauvegarder vos decks sur le serveur et en gérer plusieurs.',
        'local_deck_found'      => 'Vous avez un deck sauvegardé en mode invité.',
        'local_save_btn'        => 'Sauvegarder sur mon compte',
        'local_discard_btn'     => 'Ignorer',
        'local_discard_confirm' => 'Supprimer ce deck local ? Cette action est irréversible.',
        'local_save_err'        => 'Impossible de sauvegarder le deck.',
        'my_deck'               => 'Mon deck',
    ],
][$uiLang] ?? [];

$pageTitle       = $txt['page_title'];
$pageDescription = $txt['page_desc'];

$isLoggedIn = kcIsLoggedIn();
$kcUser     = $isLoggedIn ? kcUser() : [];

// handle deck delete
if ($isLoggedIn
    && $_SERVER['REQUEST_METHOD'] === 'POST'
    && ($_POST['action'] ?? '') === 'delete_deck'
    && csrfValid($_POST['csrf_token'] ?? ''))
{
    $deleteId = trim($_POST['deck_id'] ?? '');
    if ($deleteId) {
        $token = deckApiToken();
        if ($token) {
            $ch = curl_init(DECKS_API_URL . '/api/decks/' . rawurlencode($deleteId));
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_CUSTOMREQUEST  => 'DELETE',
                CURLOPT_HTTPHEADER     => ['Accept: application/json', 'Authorization: Bearer ' . $token],
                CURLOPT_TIMEOUT        => 10,
            ]);
            curl_exec($ch);
            $deleteCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            if ($deleteCode >= 200 && $deleteCode < 300) {
                flash($txt['deleted_ok']);
            } else {
                flash(sprintf($txt['deleted_err'], $deleteCode), 'error');
            }
        }
    }
    redirect(BASE_URL . '/pages/decks');
}

// aJAX: import from decklist
if ($isLoggedIn
    && $_SERVER['REQUEST_METHOD'] === 'POST'
    && ($_GET['ajax'] ?? '') === 'import'
    && csrfValid($_POST['csrf_token'] ?? ''))
{
    header('Content-Type: application/json');
    $token = deckApiToken();
    if (!$token) {
        echo json_encode(['ok' => false, 'error' => $txt['err_api_auth']]);
        exit;
    }
    $lines     = explode("\n", str_replace("\r", '', trim($_POST['decklist'] ?? '')));
    $deckCards = [];
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') continue;
        if (preg_match('/^(\d+)\s+(ALT_\S+)$/i', $line, $m)) {
            $deckCards[] = ['cardReference' => $m[2], 'quantity' => (int)$m[1]];
        }
    }
    if (empty($deckCards)) {
        echo json_encode(['ok' => false, 'error' => $txt['import_err_empty']]);
        exit;
    }
    $importFormat = in_array($_POST['format'] ?? '', array_keys(loadAlteredData('formats')), true) ? $_POST['format'] : 'standard';
    $payload = [
        'name'      => trim($_POST['name'] ?? '') ?: $txt['unnamed'],
        'format'    => $importFormat,
        'isPublic'  => false,
        'isDraft'   => ($importFormat === 'sandbox'),
        'deckCards' => $deckCards,
    ];
    $ch = curl_init(DECKS_API_URL . '/api/decks');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => 'POST',
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json', 'Accept: application/json', 'Authorization: Bearer ' . $token],
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_TIMEOUT        => 15,
    ]);
    $response = curl_exec($ch);
    $code     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($code >= 200 && $code < 300) {
        $data  = json_decode($response, true);
        $uuid = $data['id'] ?? null;
        echo json_encode(['ok' => true, 'id' => $uuid]);
    } else {
        $apiBody  = json_decode($response, true);
        $detail   = '';
        if (!empty($apiBody['violations'])) {
            $detail = formatApiViolations($apiBody['violations']);
        } elseif (!empty($apiBody['detail'])) {
            $detail = $apiBody['detail'];
        }
        $msg = sprintf($txt['import_err_save'], $code);
        if ($detail) $msg .= "\n" . $detail;
        echo json_encode(['ok' => false, 'error' => $msg]);
    }
    exit;
}

// aJAX: import from Altered.gg
if ($isLoggedIn
    && $_SERVER['REQUEST_METHOD'] === 'POST'
    && ($_GET['ajax'] ?? '') === 'import_gg'
    && csrfValid($_POST['csrf_token'] ?? ''))
{
    header('Content-Type: application/json');
    $token = deckApiToken();
    if (!$token) {
        echo json_encode(['ok' => false, 'error' => $txt['err_api_auth']]);
        exit;
    }

    $ggInput  = trim($_POST['gg_url'] ?? '');
    $deckGgId = '';
    if (preg_match('#altered\.gg/(?:[^/]+/)?decks/([A-Z0-9]+)#i', $ggInput, $m)) {
        $deckGgId = strtoupper($m[1]);
    } elseif (preg_match('/^[A-Z0-9]{10,}$/i', $ggInput)) {
        $deckGgId = strtoupper($ggInput);
    }
    if (!$deckGgId) {
        echo json_encode(['ok' => false, 'error' => $txt['import_gg_err_invalid']]);
        exit;
    }

    $ch = curl_init('https://api.altered.gg/deck_user_lists/' . rawurlencode($deckGgId));
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => ['Accept: application/json'],
        CURLOPT_TIMEOUT        => 15,
    ]);
    $ggResp = curl_exec($ch);
    $ggCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($ggCode !== 200 || !$ggResp) {
        echo json_encode(['ok' => false, 'error' => $txt['import_gg_err_fetch']]);
        exit;
    }
    $ggData = json_decode($ggResp, true);
    if (!is_array($ggData)) {
        echo json_encode(['ok' => false, 'error' => $txt['import_gg_err_fetch']]);
        exit;
    }

    $deckName   = trim($ggData['name'] ?? '') ?: $txt['unnamed'];
    $heroRef    = $ggData['alterator']['reference'] ?? null;
    $ggFormat   = strtoupper(trim($ggData['eventFormat'] ?? ''));
    $deckFormat = 'sandbox';
    foreach (loadAlteredData('formats') as $_fmtKey => $_fmtData) {
        if (isset($_fmtData['gg_format']) && $_fmtData['gg_format'] === $ggFormat) {
            $deckFormat = $_fmtKey;
            break;
        }
    }

    $deckCards = [];
    if ($heroRef) {
        $deckCards[] = ['cardReference' => $heroRef, 'quantity' => 1];
    }
    foreach ($ggData['deckCardsByType'] ?? [] as $typeData) {
        foreach ($typeData['deckUserListCard'] ?? [] as $entry) {
            $ref = $entry['card']['reference'] ?? null;
            $qty = (int)($entry['quantity'] ?? 0);
            if ($ref && $qty > 0) {
                $deckCards[] = ['cardReference' => $ref, 'quantity' => $qty];
            }
        }
    }

    if (empty($deckCards)) {
        echo json_encode(['ok' => false, 'error' => $txt['import_gg_err_empty']]);
        exit;
    }

    $payload = [
        'name'      => $deckName,
        'format'    => $deckFormat,
        'isPublic'  => false,
        'isDraft'   => ($deckFormat === 'sandbox'),
        'deckCards' => $deckCards,
    ];
    $ch = curl_init(DECKS_API_URL . '/api/decks');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => 'POST',
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json', 'Accept: application/json', 'Authorization: Bearer ' . $token],
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_TIMEOUT        => 15,
    ]);
    $response = curl_exec($ch);
    $code     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($code >= 200 && $code < 300) {
        $data  = json_decode($response, true);
        $uuid = $data['id'] ?? null;
        echo json_encode(['ok' => true, 'id' => $uuid]);
    } else {
        $apiBody = json_decode($response, true);
        $detail  = '';
        if (!empty($apiBody['violations'])) {
            $detail = formatApiViolations($apiBody['violations']);
        } elseif (!empty($apiBody['detail'])) {
            $detail = $apiBody['detail'];
        }
        $msg = sprintf($txt['import_err_save'], $code);
        if ($detail) $msg .= "\n" . $detail;
        echo json_encode(['ok' => false, 'error' => $msg]);
    }
    exit;
}

// aJAX proxy: public decks
if ($_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['ajax'] ?? '') === 'public' && $publicDecksApiPath !== '') {
    header('Content-Type: application/json');
    $pubPage   = max(1, (int)($_GET['page'] ?? 1));
    $pubFormat = $_GET['format'] ?? '';
    if (!preg_match('/^[a-z_]*$/', $pubFormat)) $pubFormat = '';
    $pubOrder = $_GET['order'] ?? 'updatedAt';
    $pubDir   = $_GET['dir']   ?? 'desc';
    $allowedPubOrders = ['createdAt', 'updatedAt', 'name'];
    $allowedPubDirs   = ['asc', 'desc'];
    if (!in_array($pubOrder, $allowedPubOrders, true)) $pubOrder = 'updatedAt';
    if (!in_array($pubDir,   $allowedPubDirs,   true)) $pubDir   = 'desc';

    $apiParams = ['page' => $pubPage, 'itemsPerPage' => 21];
    if ($pubFormat !== '') $apiParams['format'] = strtolower($pubFormat);
    $headers = ['Accept: application/json'];
    if ($isLoggedIn) {
        $token = deckApiToken();
        if ($token) $headers[] = 'Authorization: Bearer ' . $token;
    }
    $pubUrl = DECKS_API_URL . $publicDecksApiPath . '?' . http_build_query($apiParams) . '&order[' . $pubOrder . ']=' . $pubDir;
    $ch = curl_init($pubUrl);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_HTTPHEADER => $headers, CURLOPT_TIMEOUT => 10]);
    $pubResp = curl_exec($ch);
    $pubCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($pubCode >= 200 && $pubCode < 300 && $pubResp) {
        echo $pubResp;
    } else {
        http_response_code($pubCode ?: 500);
        echo json_encode(['error' => sprintf($txt['err_api'], $pubCode)]);
    }
    exit;
}

// aJAX proxy: my decks
if ($isLoggedIn && $_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['ajax'] ?? '') === 'my') {
    header('Content-Type: application/json');
    $token = deckApiToken();
    if (!$token) {
        http_response_code(401);
        echo json_encode(['error' => $txt['err_api_auth']]);
        exit;
    }
    $myPage   = max(1, (int)($_GET['page'] ?? 1));
    $myFormat = $_GET['format'] ?? '';
    if (!preg_match('/^[a-z0-9_-]*$/', $myFormat)) $myFormat = '';
    $myIsPublic = $_GET['isPublic'] ?? '';
    $myIsDraft  = $_GET['isDraft']  ?? '';
    $myOrder    = $_GET['order']    ?? 'updatedAt';
    $myDir      = $_GET['dir']      ?? 'desc';
    if (!in_array($myOrder, ['createdAt', 'updatedAt', 'name'], true)) $myOrder = 'updatedAt';
    if (!in_array($myDir,   ['asc', 'desc'],                    true)) $myDir   = 'desc';

    $apiParams = ['page' => $myPage, 'itemsPerPage' => 21];
    if ($myFormat !== '')    $apiParams['format']   = $myFormat;
    if ($myIsPublic !== '')  $apiParams['isPublic'] = $myIsPublic === '1' ? 'true' : 'false';
    if ($myIsDraft  !== '')  $apiParams['isDraft']  = $myIsDraft  === '1' ? 'true' : 'false';
    // $apiParams['faction'] = ...; // TODO: enable when API supports faction filtering

    $myUrl = DECKS_API_URL . '/api/decks?' . http_build_query($apiParams) . '&order[' . $myOrder . ']=' . $myDir;
    $ch = curl_init($myUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => ['Accept: application/json', 'Authorization: Bearer ' . $token],
        CURLOPT_TIMEOUT        => 10,
    ]);
    $myResp = curl_exec($ch);
    $myCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($myCode >= 200 && $myCode < 300 && $myResp) {
        $myData = json_decode($myResp, true);
        if (is_array($myData)) {
            // Locate the decks array regardless of response envelope format
            $sortField = $myOrder;
            $sortDir   = $myDir;
            $cmp = function ($a, $b) use ($sortField, $sortDir) {
                $va = is_array($a) ? ($a[$sortField] ?? '') : '';
                $vb = is_array($b) ? ($b[$sortField] ?? '') : '';
                $r  = $sortField === 'name' ? strcasecmp((string)$va, (string)$vb) : strcmp((string)$va, (string)$vb);
                return $sortDir === 'desc' ? -$r : $r;
            };
            // Safety net: re-sort in case the API ignored the order parameter
            if (isset($myData['member']) && is_array($myData['member'])) {
                usort($myData['member'], $cmp);
            } elseif (isset($myData['hydra:member']) && is_array($myData['hydra:member'])) {
                usort($myData['hydra:member'], $cmp);
            } elseif (isset($myData[0]) || empty($myData)) {
                usort($myData, $cmp);
            }
            echo json_encode($myData);
        } else {
            echo $myResp;
        }
    } else {
        http_response_code($myCode ?: 500);
        echo json_encode(['error' => sprintf($txt['err_api'], $myCode)]);
    }
    exit;
}

// site logo (used in Edit dropdown)
$_siteLogo = getSetting('logo_path');

// My Decks are now loaded via AJAX (?ajax=my); no server-side fetch needed here.

// static data
$factionsData = loadAlteredData('factions');
$formatsData  = loadAlteredData('formats');

$newDeckHref    = $enableNewDeck ? BASE_URL . '/pages/deckbuilder' : $newDeckUrl;
$showNewDeckBtn = $enableNewDeck || $newDeckUrl !== '';

$showImportBtnVisible = $showImportBtn || $importDeckUrl !== '';

$showPublicTab = $publicDecksApiPath !== '';

?>

<div class="container py-4 decks-page">

    <div class="section-title mb-3"><span><?= h($txt['section_title']) ?></span></div>

    <?php if (!empty($communityBuilders)): ?>
    <div class="d-none d-lg-flex" style="background:var(--sand-100);border:1px solid var(--sand-300);border-left:3px solid var(--primary-400);border-radius:.5rem;padding:.8rem 1rem;margin-bottom:1.25rem;font-size:.875rem;color:var(--neutral-700);align-items:center;gap:1rem">
        <span style="flex:1"><i class="fa-solid fa-circle-info me-2" style="color:var(--primary-400)"></i><?= h($txt['community_info']) ?></span>
        <button type="button" class="btn btn-outline-secondary btn-sm flex-shrink-0"
                data-bs-toggle="modal" data-bs-target="#communityBuildersModal">
            <i class="fa-solid fa-arrow-up-right-from-square me-1"></i><?= h($txt['community_btn']) ?>
        </button>
    </div>
    <?php endif; ?>

    <?php if ($showPublicTab): ?>
    <div class="decks-tabs mb-4">
        <button class="decks-tab <?= ($isLoggedIn || !$showPublicTab) ? 'active' : '' ?>" data-tab="my">
            <i class="fa-solid fa-user"></i>
            <span><?= h($txt['tab_my']) ?></span>
        </button>
        <button class="decks-tab <?= (!$isLoggedIn && $showPublicTab) ? 'active' : '' ?>" data-tab="public">
            <i class="fa-solid fa-globe"></i>
            <span><?= h($txt['tab_public']) ?></span>
        </button>
    </div>
    <?php else: ?>
    <div class="mb-4"></div>
    <?php endif; ?>

    <?php if ($flash = getFlash()): ?>
    <div class="alert alert-<?= $flash['type'] === 'error' ? 'danger' : 'success' ?> mb-3">
        <?= h($flash['msg']) ?>
    </div>
    <?php endif; ?>

    <!-- ── My Decks tab ────────────────────────────────────────────────────── -->
    <div id="tab-my" class="decks-tab-pane"<?= (!$isLoggedIn && $showPublicTab) ? ' style="display:none"' : '' ?>>

        <div class="d-flex align-items-center mb-4 flex-wrap gap-3">
            <?php if ($isLoggedIn): ?>
            <span id="my-deck-count" class="text-muted small" style="display:none"></span>
            <div class="d-flex align-items-center gap-2 ms-auto">
                <button type="button" class="btn btn-outline-secondary btn-sm"
                        data-bs-toggle="modal" data-bs-target="#importDeckModal"
                        title="<?= h($txt['import_btn']) ?>">
                    <i class="fa-solid fa-file-import me-1"></i><?= h($txt['import_btn']) ?>
                </button>
                <?php if ($showNewDeckBtn): ?>
                <a href="<?= h($newDeckHref) ?>" class="btn btn-primary-altered btn-sm" title="<?= h($txt['create_btn']) ?>">
                    <i class="fa-solid fa-plus me-1"></i><?= h($txt['create_btn']) ?>
                </a>
                <?php endif; ?>
            </div>
            <?php elseif ($guestModeEnabled): ?>
            <div class="ms-auto">
                <a href="<?= h(BASE_URL) ?>/pages/deckbuilder" class="btn btn-sm" style="background:#f59e0b;color:#fff;border:none">
                    <i class="fa-solid fa-plus me-1"></i><?= h($txt['guest_new_btn']) ?>
                </a>
            </div>
            <?php endif; ?>
        </div>

        <!-- Local deck import zone for logged-in users (populated by JS) -->
        <div id="local-deck-import" style="display:none;margin-bottom:1.25rem"></div>

        <?php if (!$isLoggedIn && !$guestModeEnabled): ?>
        <!-- Login CTA (no guest mode) -->
        <div class="text-center py-5">
            <i class="fa-solid fa-layer-group" style="font-size:3rem;color:var(--neutral-200);margin-bottom:1rem;display:block"></i>
            <p class="text-muted mb-3"><?= h($txt['login_msg']) ?></p>
            <a href="<?= h(BASE_URL . '/pages/login?redirect=' . rawurlencode(BASE_URL . '/pages/decks')) ?>" class="btn btn-primary-altered">
                <i class="fa-solid fa-right-to-bracket me-1"></i><?= h($txt['login_btn']) ?>
            </a>
        </div>

        <?php elseif (!$isLoggedIn): ?>
        <!-- Guest banner -->
        <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:12px 16px;margin-bottom:1.25rem;font-size:.85rem;color:#92400e">
            <i class="fa-solid fa-circle-info me-1"></i><?= h($txt['guest_banner']) ?>
        </div>

        <!-- Local deck (rendered by JS) -->
        <div id="guest-deck-wrap" style="display:none" class="mb-4">
            <div class="row g-3" id="guest-deck-grid"></div>
        </div>
        <div id="guest-no-deck" class="text-center py-3 text-muted small mb-3">
            <?= h($txt['guest_no_deck']) ?>
        </div>

        <!-- Login CTA -->
        <div class="text-center py-4" style="border-top:1px solid var(--sand-200)">
            <p class="text-muted mb-3"><?= h($txt['guest_login_cta']) ?></p>
            <a href="<?= h(BASE_URL . '/pages/login?redirect=' . rawurlencode($_SERVER['REQUEST_URI'] ?? '/pages/decks')) ?>" class="btn btn-primary-altered">
                <i class="fa-solid fa-right-to-bracket me-1"></i><?= h($txt['login_btn']) ?>
            </a>
        </div>

        <?php else: ?>
        <!-- Filter form — always shown for logged-in users, JS triggers reload on change -->
        <div class="card-altered p-3 mb-4">
            <div class="filter-row mb-0">
                <span class="filter-label"><?= h($txt['lbl_search']) ?></span>
                <div class="deck-search-wrap">
                    <i class="fa-solid fa-magnifying-glass deck-search-icon"></i>
                    <input type="text" id="my-deck-search" placeholder="<?= h($txt['search_ph']) ?>"
                           class="form-control form-control-sm" style="width:220px" autocomplete="off">
                </div>
                <button type="button" class="deck-filter-toggle d-lg-none ms-auto" aria-expanded="false">
                    <i class="fa-solid fa-chevron-down"></i>
                </button>
            </div>
            <div class="deck-filter-collapsible">
                <div class="filter-row mb-2 mt-2">
                    <span class="filter-label"><?= h($txt['lbl_format']) ?></span>
                    <?php foreach ($formatsData as $fmtKey => $fmtData): ?>
                    <button type="button" class="filter-toggle" data-my-format="<?= h($fmtKey) ?>">
                        <span style="width:8px;height:8px;border-radius:50%;background:<?= h($fmtData['color'] ?? 'var(--neutral-400)') ?>;flex-shrink:0;display:inline-block"></span>
                        <?= h($fmtData[$uiLang] ?? $fmtData['en'] ?? ucfirst($fmtKey)) ?>
                    </button>
                    <?php endforeach; ?>
                </div>
                <div class="filter-row mb-2">
                    <span class="filter-label"><?= h($txt['lbl_faction']) ?></span>
                    <?php foreach ($factionsData as $fCode => $fData): ?>
                    <button type="button" class="filter-toggle" data-my-faction="<?= h($fCode) ?>">
                        <img src="<?= $pluginAssetsUrl ?>/faction/<?= h($fCode) ?>.png" alt="<?= h($fCode) ?>">
                        <?= h($fData[$uiLang] ?? $fData['en'] ?? $fCode) ?>
                    </button>
                    <?php endforeach; ?>
                </div>
                <div class="filter-row mb-2">
                    <span class="filter-label"><?= h($txt['lbl_visibility']) ?></span>
                    <button type="button" class="filter-toggle" data-my-visibility="1">
                        <i class="fa-solid fa-globe me-1"></i><?= h($txt['public']) ?>
                    </button>
                    <button type="button" class="filter-toggle" data-my-visibility="0">
                        <i class="fa-solid fa-lock me-1"></i><?= h($txt['private']) ?>
                    </button>
                </div>
                <div class="filter-row mb-0">
                    <span class="filter-label"><?= h($txt['lbl_sort']) ?></span>
                    <select id="my-sort" class="form-select form-select-sm" style="width:auto">
                        <option value="updatedAt:desc"><?= h($txt['sort_updated_desc']) ?></option>
                        <option value="updatedAt:asc"><?= h($txt['sort_updated_asc']) ?></option>
                        <option value="createdAt:desc"><?= h($txt['sort_created_desc']) ?></option>
                        <option value="createdAt:asc"><?= h($txt['sort_created_asc']) ?></option>
                        <option value="name:asc"><?= h($txt['sort_name_asc']) ?></option>
                        <option value="name:desc"><?= h($txt['sort_name_desc']) ?></option>
                    </select>
                </div>
            </div>
        </div>
        <div id="my-loading" class="text-center py-4 text-muted" style="display:none">
            <div class="spinner-border spinner-border-sm me-2" role="status"></div><?= h($txt['loading']) ?>
        </div>
        <div id="my-error" class="text-center py-5" style="display:none"></div>
        <div id="my-empty" class="text-center py-5" style="display:none">
            <i class="fa-solid fa-layer-group" style="font-size:3rem;color:var(--neutral-200);margin-bottom:1rem;display:block"></i>
            <p class="text-muted mb-3"><?= h($txt['no_decks']) ?></p>
        </div>
        <div id="my-deck-grid" class="row g-3"></div>
        <nav id="my-pagination" class="mt-4 d-flex justify-content-center gap-2" style="display:none!important"></nav>

        <?php endif; ?>
    </div><!-- /#tab-my -->

    <?php if ($showPublicTab): ?>
    <!-- ── Public Decks tab ───────────────────────────────────────────────── -->
    <div id="tab-public" class="decks-tab-pane"<?= (!$isLoggedIn && $showPublicTab) ? '' : ' style="display:none"' ?>>

        <div class="card-altered p-3 mb-4">
            <div class="filter-row mb-0">
                <span class="filter-label"><?= h($txt['lbl_search']) ?></span>
                <div class="deck-search-wrap">
                    <i class="fa-solid fa-magnifying-glass deck-search-icon"></i>
                    <input type="text" id="pub-deck-search" placeholder="<?= h($txt['search_ph']) ?>"
                           class="form-control form-control-sm" style="width:220px" autocomplete="off">
                </div>
                <button type="button" class="deck-filter-toggle d-lg-none ms-auto" aria-expanded="false">
                    <i class="fa-solid fa-chevron-down"></i>
                </button>
            </div>
            <div class="deck-filter-collapsible">
                <div class="filter-row mb-2 mt-2">
                    <span class="filter-label"><?= h($txt['lbl_format']) ?></span>
                    <?php foreach ($formatsData as $fmtKey => $fmtData): ?>
                    <button type="button" class="filter-toggle" data-pub-format="<?= h($fmtKey) ?>">
                        <span style="width:8px;height:8px;border-radius:50%;background:<?= h($fmtData['color'] ?? 'var(--neutral-400)') ?>;flex-shrink:0;display:inline-block"></span>
                        <?= h($fmtData[$uiLang] ?? $fmtData['en'] ?? ucfirst($fmtKey)) ?>
                    </button>
                    <?php endforeach; ?>
                </div>
                <div class="filter-row mb-2">
                    <span class="filter-label"><?= h($txt['lbl_faction']) ?></span>
                    <?php foreach ($factionsData as $fCode => $fData): ?>
                    <button type="button" class="filter-toggle" data-pub-faction="<?= h($fCode) ?>">
                        <img src="<?= $pluginAssetsUrl ?>/faction/<?= h($fCode) ?>.png" alt="<?= h($fCode) ?>">
                        <?= h($fData[$uiLang] ?? $fData['en'] ?? $fCode) ?>
                    </button>
                    <?php endforeach; ?>
                </div>
                <div class="filter-row mb-0">
                    <span class="filter-label"><?= h($txt['lbl_sort']) ?></span>
                    <select id="pub-sort" class="form-select form-select-sm" style="width:auto">
                        <option value="updatedAt:desc"><?= h($txt['sort_updated_desc']) ?></option>
                        <option value="updatedAt:asc"><?= h($txt['sort_updated_asc']) ?></option>
                        <option value="createdAt:desc"><?= h($txt['sort_created_desc']) ?></option>
                        <option value="createdAt:asc"><?= h($txt['sort_created_asc']) ?></option>
                        <option value="name:asc"><?= h($txt['sort_name_asc']) ?></option>
                        <option value="name:desc"><?= h($txt['sort_name_desc']) ?></option>
                    </select>
                </div>
            </div>
        </div>

        <div id="pub-loading" class="text-center py-4 text-muted" style="display:none">
            <div class="spinner-border spinner-border-sm me-2" role="status"></div><?= h($txt['loading']) ?>
        </div>
        <div id="pub-error" class="text-center py-5" style="display:none"></div>
        <div id="pub-empty" class="text-center py-5" style="display:none">
            <i class="fa-solid fa-layer-group" style="font-size:3rem;color:var(--neutral-200);margin-bottom:1rem;display:block"></i>
            <p class="text-muted"><?= h($txt['no_public_decks']) ?></p>
        </div>
        <div id="pub-no-match" class="text-center py-4 text-muted" style="display:none">
            <?= h($txt['no_match']) ?>
        </div>
        <div id="pub-grid" class="row g-3"></div>
        <nav id="pub-pagination" class="mt-4 d-flex justify-content-center gap-2" style="display:none!important"></nav>

    </div><!-- /#tab-public -->
    <?php endif; ?>

</div>

<script>
(function () {
    var baseUrl         = <?= json_encode(BASE_URL) ?>;
    var pluginAssetsUrl = <?= json_encode($pluginAssetsUrl) ?>;
    var apiDebug        = <?= (defined('API_RESPONSE_DEBUG') && API_RESPONSE_DEBUG) ? 'true' : 'false' ?>;
    var showPublic = <?= json_encode($showPublicTab) ?>;
    var txt = <?= json_encode([
        'prev'           => $txt['prev'],
        'next'           => $txt['next'],
        'unnamed'        => $txt['unnamed'],
        'draft'          => $txt['draft'],
        'public'         => $txt['public'],
        'private'        => $txt['private'],
        'cards'          => $txt['cards'],
        'view_btn'       => $txt['view_btn'],
        'edit_btn'       => $txt['edit_btn'],
        'delete_confirm' => $txt['delete_confirm'],
        'err_connect'    => $txt['err_connect'],
        'api_later'      => $txt['api_later'],
        'no_match'           => $txt['no_match'],
        'no_decks'           => $txt['no_decks'],
        'loading'            => $txt['loading'],
        'legal'              => $txt['legal'],
        'illegal'            => $txt['illegal'],
        'format_errors_title'=> $txt['format_errors_title'],
        'legalityFormatSection' => $txt['legality_format_section'],
        'legalityRulesSection'  => $txt['legality_rules_section'],
        'legalityErrorsSection' => $txt['legality_errors_section'],
        'legalityKeys'          => $txt['legality_keys'],
    ]) ?>;
    var formats = <?= json_encode(array_map(fn($d) => [
        'label' => $d[$uiLang] ?? $d['en'] ?? '',
        'color' => $d['color'] ?? 'var(--neutral-400)',
    ], $formatsData)) ?>;
    var factions = <?= json_encode(array_map(fn($d) => [
        'color' => $d['color'] ?? '#ffffff',
    ], $factionsData)) ?>;
    var cdnUrl = <?= json_encode(CDN_URL) ?>;

    // My Decks AJAX vars (only populated when logged in)
    var myIsLoggedIn    = <?= json_encode($isLoggedIn) ?>;
    var myCSRF          = <?= json_encode($isLoggedIn ? csrfToken() : '') ?>;
    var myShowEditBtn   = <?= json_encode($showEditBtn) ?>;
    var myEditDeckUrl   = <?= json_encode($editDeckUrl) ?>;
    var myShowDeleteBtn = <?= json_encode($showDeleteBtn) ?>;
    var myDeckBuilders  = <?= json_encode(array_map(function($cb) {
        return [
            'title'          => $cb['title'],
            'deckbuilder_url'=> $cb['deckbuilder_url'],
            'logo'           => $cb['deckbuilder_logo'] ? assetUrl($cb['deckbuilder_logo']) : '',
        ];
    }, $_cbDeckbuilders)) ?>;
    var mySiteName = <?= json_encode(getSiteName()) ?>;
    var mySiteLogo = <?= json_encode($_siteLogo ? assetUrl($_siteLogo) : '') ?>;

    // filter collapsible toggle
    document.querySelectorAll('.deck-filter-toggle').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var collapsible = btn.closest('.card-altered').querySelector('.deck-filter-collapsible');
            var expanded = collapsible.classList.toggle('expanded');
            btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        });
    });

    // tab switching
    var pubLoaded = false;
    document.querySelectorAll('.decks-tab').forEach(function (btn) {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.decks-tab').forEach(function (b) { b.classList.remove('active'); });
            document.querySelectorAll('.decks-tab-pane').forEach(function (p) { p.style.display = 'none'; });
            btn.classList.add('active');
            var pane = document.getElementById('tab-' + btn.dataset.tab);
            if (pane) pane.style.display = '';
            if (btn.dataset.tab === 'public' && !pubLoaded) {
                pubLoaded = true;
                loadPublicDecks(1);
            }
        });
    });

    // my Decks AJAX
    var mySearch      = document.getElementById('my-deck-search');
    var myLoading     = document.getElementById('my-loading');
    var myError       = document.getElementById('my-error');
    var myEmpty       = document.getElementById('my-empty');
    var myGrid        = document.getElementById('my-deck-grid');
    var myPagination  = document.getElementById('my-pagination');
    var myCountEl     = document.getElementById('my-deck-count');
    var myFactions    = [];
    var myFormat      = '';
    var myVisibility  = '';
    var mySortVal     = 'updatedAt:desc';
    var mySearchTimer = null;
    var myAllItems    = [];

    function escHtml(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function apiErrorHtml(msg) {
        return '<i class="fa-solid fa-triangle-exclamation" style="font-size:3rem;color:#f87171;margin-bottom:.75rem;display:block"></i>'
             + '<p class="text-muted mb-1">' + escHtml(msg) + '</p>'
             + '<p class="text-muted small">' + escHtml(txt.api_later) + '</p>';
    }

    function buildMyDeckEditHtml(deckId) {
        var theme    = localStorage.getItem('acTheme') === 'dark' ? 'dark' : 'light';
        var editHref = myShowEditBtn
            ? baseUrl + '/pages/deckbuilder?id=' + encodeURIComponent(deckId) + '&theme=' + theme
            : myEditDeckUrl.replace('{deck_id}', encodeURIComponent(deckId)) + (myEditDeckUrl.indexOf('?') >= 0 ? '&' : '?') + 'theme=' + theme;
        var showEdit    = myShowEditBtn || myEditDeckUrl !== '';
        var useDropdown = myDeckBuilders.length > 0;

        if (!showEdit && !useDropdown) return '';

        var btnStyle = 'background:rgba(255,255,255,.85);border:1px solid rgba(0,0,0,.15);color:#333';
        if (showEdit && !useDropdown) {
            return '<a href="' + escHtml(editHref) + '" class="btn btn-sm" style="' + btnStyle + '">'
                + '<i class="fa-solid fa-pen me-1"></i>' + escHtml(txt.edit_btn) + '</a>';
        }
        var items = '';
        if (showEdit) {
            items += '<li><a class="dropdown-item" href="' + escHtml(editHref) + '">'
                + (mySiteLogo
                    ? '<img src="' + escHtml(mySiteLogo) + '" alt="" style="width:16px;height:16px;object-fit:contain;vertical-align:middle;margin-right:6px">'
                    : '<i class="fa-solid fa-pen fa-fw me-1"></i>')
                + escHtml(mySiteName) + '</a></li><li><hr class="dropdown-divider"></li>';
        }
        myDeckBuilders.forEach(function(cb) {
            var cbHref = cb.deckbuilder_url.replace('{deck_id}', deckId) + (cb.deckbuilder_url.indexOf('?') >= 0 ? '&' : '?') + 'theme=' + theme;
            items += '<li><a class="dropdown-item" href="' + escHtml(cbHref) + '" target="_blank" rel="noopener">'
                + (cb.logo
                    ? '<img src="' + escHtml(cb.logo) + '" alt="" style="width:16px;height:16px;object-fit:contain;vertical-align:middle;margin-right:6px">'
                    : '<i class="fa-solid fa-arrow-up-right-from-square fa-fw me-1"></i>')
                + escHtml(cb.title) + '</a></li>';
        });
        return '<div class="dropdown"><button type="button" class="btn btn-sm dropdown-toggle" data-bs-toggle="dropdown" style="' + btnStyle + '">'
            + '<i class="fa-solid fa-pen me-1"></i>' + escHtml(txt.edit_btn)
            + '</button><ul class="dropdown-menu dropdown-menu-start">' + items + '</ul></div>';
    }

    function _deckHeroStyle(heroImgUrl, factionColor) {
        return heroImgUrl
            ? 'background-image:linear-gradient(to right,' + factionColor + 'cc 30%,' + factionColor + '00 100%),url(' + escHtml(heroImgUrl) + ');background-size:cover;background-position:left top;'
            : 'background-image:linear-gradient(rgba(0,0,0,.5),rgba(0,0,0,.5)),url(' + pluginAssetsUrl + '/img/ALT_OFFICIAL_CARDBACK.png);background-size:120% auto;background-position:center center;background-repeat:no-repeat;';
    }

    function _deckRarityHtml(byRarity) {
        var html = '';
        ['C','R','E','U'].forEach(function(r) {
            var qty = byRarity[r] || 0;
            if (qty > 0) html += '<span class="d-flex align-items-center gap-1" style="font-size:.8rem">'
                + '<img src="' + pluginAssetsUrl + '/gems/' + r + '.png" alt="' + r + '" style="width:14px;height:14px;object-fit:contain">'
                + '<span style="color:rgba(255,255,255,.7)">' + qty + '</span></span>';
        });
        return html;
    }

    function _deckHasErrors(formatErrors, legalityDetail) {
        if (Array.isArray(formatErrors) && formatErrors.length > 0) return true;
        if (!legalityDetail || typeof legalityDetail !== 'object') return false;
        for (var k in legalityDetail) {
            if (k !== 'global' && legalityDetail[k] === false) return true;
        }
        return false;
    }

    function _deckLegalityHtml(legal, hasActualErrors, formatErrors, legalityDetail, fmtLabel) {
        if (legal === true)
            return '<span class="badge" style="background:rgba(34,197,94,.85);color:#fff;font-size:.72rem"><i class="fa-solid fa-check me-1"></i>' + escHtml(txt.legal) + '</span>';
        if (legal === false && hasActualErrors)
            return '<button type="button" class="badge border-0 js-deck-illegal"'
                + ' data-errors="' + escHtml(JSON.stringify(formatErrors)) + '"'
                + ' data-legality="' + escHtml(JSON.stringify(legalityDetail)) + '"'
                + ' data-format="' + escHtml(fmtLabel) + '"'
                + ' style="background:rgba(239,68,68,.85);color:#fff;font-size:.72rem;cursor:pointer">'
                + '<i class="fa-solid fa-triangle-exclamation me-1"></i>' + escHtml(txt.illegal) + '</button>';
        return '';
    }

    function renderMyDeck(deck) {
        var deckId   = deck.id || '';
        var name     = deck.name || txt.unnamed;
        var fmt      = (deck.format || 'standard').toLowerCase();
        var fmtData  = formats[fmt] || {};
        var fmtLabel = fmtData.label || fmt;
        var fmtColor = fmtData.color || 'var(--neutral-400)';
        var isPublic = !!deck.isPublic;
        var isDraft  = !deck.hasOwnProperty('isDraft') || !!deck.isDraft;
        var stats    = deck.stats || {};
        var hero     = stats.hero || {};
        var heroRef  = hero.reference || '';
        var heroName = hero.name || '';
        if (!heroRef && deck.cards) {
            for (var ci = 0; ci < deck.cards.length; ci++) {
                if (deck.cards[ci].cardTypeReference === 'HERO') {
                    heroRef  = deck.cards[ci].cardReference || '';
                    heroName = deck.cards[ci].name || '';
                    break;
                }
            }
        }
        var totalCards = stats.totalCards != null ? stats.totalCards : null;
        var byRarity   = stats.byRarity || {};
        var desc       = deck.description || '';
        var legal          = deck.hasOwnProperty('legal') ? deck.legal : null;
        var formatErrors   = Array.isArray(deck.formatErrors) ? deck.formatErrors : [];
        var legalityDetail = (deck.legalityDetail && typeof deck.legalityDetail === 'object') ? deck.legalityDetail : {};

        var factionCode  = '';
        var fm = heroRef.match(/^ALT_[^_]+_[^_]+_([A-Z]{2})_/);
        if (fm) factionCode = fm[1];
        var factionData  = factions[factionCode] || {};
        var factionColor = factionData.color || '#ffffff';
        var factionImg   = factionCode ? pluginAssetsUrl + '/faction/' + factionCode + '.png' : '';
        var heroImgUrl   = heroRef ? cdnUrl + '/cards/hero/' + heroRef + '_1.webp' : '';

        var heroStyle    = _deckHeroStyle(heroImgUrl, factionColor);
        var rarityHtml   = _deckRarityHtml(byRarity);
        var legalityHtml = _deckLegalityHtml(legal, _deckHasErrors(formatErrors, legalityDetail), formatErrors, legalityDetail, fmtLabel);

        var deleteHtml = myShowDeleteBtn
            ? '<button type="button" class="btn btn-sm js-my-delete" data-id="' + escHtml(deckId) + '" style="background:rgba(255,255,255,.85);border:1px solid rgba(200,50,50,.4);color:#c0392b">'
              + '<i class="fa-solid fa-trash"></i></button>'
            : '';

        return '<div class="col-12 col-md-6 col-lg-4 my-deck-item" data-format="' + escHtml(fmt) + '" data-public="' + (isPublic ? '1' : '0') + '" data-faction="' + escHtml(factionCode) + '" data-deck-id="' + escHtml(deckId) + '">'
            + '<div class="news-card h-100" style="border-top:3px solid ' + escHtml(fmtColor) + ';cursor:pointer;' + heroStyle + '">'
            + '<div class="news-card-body d-flex flex-column gap-2 deck-card-text-white">'

            + '<div class="d-flex flex-wrap gap-1 align-items-center">'
            + '<span class="badge" style="background:' + escHtml(fmtColor) + ';color:#fff;font-size:.72rem">' + escHtml(fmtLabel) + '</span>'
            + (isDraft ? '<span class="badge bg-secondary" style="font-size:.72rem">' + escHtml(txt.draft) + '</span>' : '')
            + legalityHtml
            + '<span class="badge ms-auto" style="background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.2);color:#fff;font-size:.72rem">'
            + '<i class="fa-solid ' + (isPublic ? 'fa-globe' : 'fa-lock') + ' me-1"></i>' + escHtml(isPublic ? txt.public : txt.private)
            + '</span></div>'

            + '<h3 class="news-card-title mb-0 d-flex align-items-center gap-2" style="font-size:1.05rem">'
            + (factionImg ? '<img src="' + escHtml(factionImg) + '" alt="' + escHtml(factionCode) + '" style="width:24px;height:24px;object-fit:contain;flex-shrink:0">' : '')
            + escHtml(name) + '</h3>'

            + (heroName ? '<p class="mb-0" style="font-size:.8rem;color:rgba(255,255,255,.75)">' + escHtml(heroName) + '</p>' : '')

            + '<div class="mt-auto pt-2" style="border-top:1px solid rgba(255,255,255,.2)">'
            + '<div class="d-flex align-items-center gap-2 mb-2">'
            + (totalCards !== null ? '<span style="color:rgba(255,255,255,.7);font-size:.875rem;font-weight:700">' + totalCards + ' ' + escHtml(txt.cards) + '</span>' : '')
            + rarityHtml + '</div>'
            + '<div class="d-flex align-items-center justify-content-between gap-1">'
            + '<div class="d-flex gap-1 d-none">' + buildMyDeckEditHtml(deckId) + deleteHtml + '</div>'
            + '<a href="' + escHtml(baseUrl) + '/pages/deck?id=' + encodeURIComponent(deckId) + '" class="btn btn-primary-altered btn-sm d-none">'
            + escHtml(txt.view_btn) + ' <i class="fa-solid fa-eye ms-1"></i></a>'
            + '</div></div>'
            + '</div></div></div>';
    }

    function filterMyDecks() {
        var visible = 0;
        myAllItems.forEach(function(el) {
            var show = (!myFormat     || el.dataset.format  === myFormat)
                    && (myVisibility === '' || el.dataset.public  === myVisibility);
            el.style.display = show ? '' : 'none';
            if (show) visible++;
        });
        if (myAllItems.length > 0 && visible === 0) myEmpty.style.display = '';
    }

    function renderPaginationUI(container, currentPage, totalPages, loaderFn) {
        container.innerHTML = '';
        if (totalPages <= 1) { container.style.setProperty('display', 'none', 'important'); return; }
        container.style.removeProperty('display');

        function makePgBtn(n, active) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'btn btn-sm ' + (active ? 'btn-primary-altered' : 'btn-outline-secondary');
            b.textContent = n;
            b.disabled = active;
            if (!active) b.onclick = function() { loaderFn(n, true); };
            return b;
        }
        function makeDots() {
            var s = document.createElement('span');
            s.className = 'text-muted small align-self-center px-1';
            s.textContent = '…';
            return s;
        }

        if (currentPage > 1) {
            var prev = document.createElement('button');
            prev.type = 'button'; prev.className = 'btn btn-outline-secondary btn-sm';
            prev.textContent = '← ' + txt.prev;
            prev.onclick = function() { loaderFn(currentPage - 1, true); };
            container.appendChild(prev);
        }

        var pgNums = [];
        for (var pi = 1; pi <= totalPages; pi++) {
            if (pi === 1 || pi === totalPages || (pi >= currentPage - 2 && pi <= currentPage + 2)) {
                pgNums.push(pi);
            }
        }
        var lastPg = 0;
        for (var pj = 0; pj < pgNums.length; pj++) {
            if (lastPg && pgNums[pj] > lastPg + 1) container.appendChild(makeDots());
            container.appendChild(makePgBtn(pgNums[pj], pgNums[pj] === currentPage));
            lastPg = pgNums[pj];
        }

        if (currentPage < totalPages) {
            var next = document.createElement('button');
            next.type = 'button'; next.className = 'btn btn-outline-secondary btn-sm';
            next.textContent = txt.next + ' →';
            next.onclick = function() { loaderFn(currentPage + 1, true); };
            container.appendChild(next);
        }

        if (totalPages > 5) {
            var sep = document.createElement('span');
            sep.style.cssText = 'width:1px;background:var(--neutral-300);align-self:stretch;margin:0 4px';
            container.appendChild(sep);

            var inp = document.createElement('input');
            inp.type = 'number'; inp.min = '1'; inp.max = String(totalPages);
            inp.placeholder = String(currentPage);
            inp.className = 'form-control form-control-sm';
            inp.style.cssText = 'width:60px;text-align:center';
            container.appendChild(inp);

            var go = document.createElement('button');
            go.type = 'button'; go.className = 'btn btn-sm btn-outline-secondary';
            go.textContent = 'Go';
            (function(input, total) {
                go.onclick = function() {
                    var v = parseInt(input.value, 10);
                    if (v >= 1 && v <= total) loaderFn(v, true);
                };
                input.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter') go.onclick();
                });
            })(inp, totalPages);
            container.appendChild(go);
        }
    }

    function renderMyPagination(p, t) { renderPaginationUI(myPagination, p, t, loadMyDecks); }

    function loadMyDecks(p, scroll) {
        if (!myGrid) return;
        myLoading.style.display = '';
        myError.style.display   = 'none';
        myEmpty.style.display   = 'none';
        myGrid.innerHTML        = '';
        myPagination.style.setProperty('display', 'none', 'important');

        var sortParts = mySortVal.split(':');
        var fetchUrl = baseUrl + '/pages/decks?ajax=my&page=' + p
            + '&order=' + encodeURIComponent(sortParts[0])
            + '&dir='   + encodeURIComponent(sortParts[1] || 'desc');
        if (myFormat)     fetchUrl += '&format='   + encodeURIComponent(myFormat);
        if (myVisibility !== '') fetchUrl += '&isPublic=' + encodeURIComponent(myVisibility);
        var q = mySearch ? mySearch.value.trim() : '';
        // name search is client-side only (API has no text search param)

        fetch(fetchUrl)
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (apiDebug) console.log('[decks] my decks API response:', data);
                myLoading.style.display = 'none';
                if (data.error) { myError.innerHTML = apiErrorHtml(data.error); myError.style.display = ''; return; }
                var decks = data.member || data.data || (Array.isArray(data) ? data : []);
                // Client-side name search filter
                if (q) decks = decks.filter(function(d) { return (d.name || '').toLowerCase().indexOf(q.toLowerCase()) >= 0; });
                // Client-side faction filter (API doesn't support it yet)
                if (myFactions.length) {
                    decks = decks.filter(function(d) {
                        var ref = (d.stats && d.stats.hero && d.stats.hero.reference) || '';
                        var fm2 = ref.match(/^ALT_[^_]+_[^_]+_([A-Z]{2})_/);
                        return fm2 && myFactions.indexOf(fm2[1]) >= 0;
                    });
                }
                if (!decks.length) { myEmpty.style.display = ''; return; }
                decks.forEach(function(deck) { myGrid.insertAdjacentHTML('beforeend', renderMyDeck(deck)); });
                myAllItems = Array.from(myGrid.querySelectorAll('.my-deck-item'));
                filterMyDecks();
                var pagination = data.pagination || {};
                var total  = pagination.totalItems ? Math.ceil(pagination.totalItems / 21) : (data.totalItems ? Math.ceil(data.totalItems / 21) : 1);
                var totalN = pagination.totalItems || data.totalItems || decks.length;
                if (myCountEl) { myCountEl.textContent = totalN + ' deck' + (totalN > 1 ? 's' : ''); myCountEl.style.display = ''; }
                renderMyPagination(p, total);
                if (scroll) myGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
            })
            .catch(function() {
                myLoading.style.display = 'none';
                myError.innerHTML = apiErrorHtml(txt.err_connect);
                myError.style.display = '';
            });
    }

    if (myGrid) {
        myGrid.addEventListener('click', function(e) {
            // Delete button
            var deleteBtn = e.target.closest('.js-my-delete');
            if (deleteBtn) {
                if (!confirm(txt.delete_confirm)) return;
                var form = document.createElement('form');
                form.method = 'POST';
                form.action = baseUrl + '/pages/decks';
                var addField = function(n, v) { var inp = document.createElement('input'); inp.type = 'hidden'; inp.name = n; inp.value = v; form.appendChild(inp); };
                addField('csrf_token', myCSRF);
                addField('action', 'delete_deck');
                addField('deck_id', deleteBtn.dataset.id);
                document.body.appendChild(form);
                form.submit();
                return;
            }
            // Skip interactive elements (dropdowns, links, buttons, legality badge)
            if (e.target.closest('a, button, .dropdown')) return;
            // Card click → navigate to deck
            var card = e.target.closest('.my-deck-item');
            if (card && card.dataset.deckId) {
                location.href = baseUrl + '/pages/deck?id=' + encodeURIComponent(card.dataset.deckId);
            }
        });
    }

    if (mySearch) {
        mySearch.addEventListener('input', function() {
            clearTimeout(mySearchTimer);
            mySearchTimer = setTimeout(function() { loadMyDecks(1); }, 350);
        });
    }

    document.addEventListener('click', function(e) {
        var btn = e.target.closest('.js-deck-illegal');
        if (!btn) return;
        var errors = [], detail = {};
        try { errors = JSON.parse(btn.dataset.errors || '[]'); } catch(_) {}
        try { detail = JSON.parse(btn.dataset.legality || '{}'); } catch(_) {}
        var deckFormat = btn.dataset.format || '';

        function sectionLabel(label) {
            return '<p class="text-uppercase fw-bold small mb-1">' + escHtml(label) + '</p>';
        }

        var html = '';

        // Deck Format section
        html += '<div class="mb-3">'
              + sectionLabel(txt.legalityFormatSection)
              + '<p class="mb-0">' + escHtml(deckFormat) + '</p>'
              + '</div>';

        // Deck Legality Error section
        var failures = [];
        Object.keys(detail).forEach(function(k) {
            if (k !== 'global' && detail[k] === false) {
                failures.push(txt.legalityKeys[k] || k);
            }
        });
        if (failures.length) {
            html += '<div class="mb-3">'
                  + sectionLabel(txt.legalityRulesSection)
                  + '<ul class="mb-0 ps-3">' + failures.map(function(f) {
                        return '<li class="small">' + escHtml(f) + '</li>';
                    }).join('') + '</ul>'
                  + '</div>';
        }

        // Format Errors section
        if (errors.length) {
            html += '<div class="mb-0">'
                  + sectionLabel(txt.legalityErrorsSection)
                  + '<ul class="mb-0 ps-3">' + errors.map(function(err) {
                        return '<li class="small">' + escHtml(String(err)) + '</li>';
                    }).join('') + '</ul>'
                  + '</div>';
        }

        var body = document.getElementById('deckFormatErrorsBody');
        if (body) body.innerHTML = html;
        var modal = document.getElementById('deckFormatErrorsModal');
        if (modal && typeof bootstrap !== 'undefined') bootstrap.Modal.getOrCreateInstance(modal).show();
    });

    document.querySelectorAll('[data-my-format]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var v = btn.dataset.myFormat;
            if (myFormat === v) { myFormat = ''; btn.classList.remove('active'); }
            else { document.querySelectorAll('[data-my-format]').forEach(function(b) { b.classList.remove('active'); }); myFormat = v; btn.classList.add('active'); }
            loadMyDecks(1);
        });
    });

    document.querySelectorAll('[data-my-faction]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var v = btn.dataset.myFaction, idx = myFactions.indexOf(v);
            if (idx >= 0) { myFactions.splice(idx, 1); btn.classList.remove('active'); }
            else          { myFactions.push(v);          btn.classList.add('active'); }
            loadMyDecks(1);
        });
    });

    document.querySelectorAll('[data-my-visibility]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var v = btn.dataset.myVisibility;
            if (myVisibility === v) { myVisibility = ''; btn.classList.remove('active'); }
            else { document.querySelectorAll('[data-my-visibility]').forEach(function(b) { b.classList.remove('active'); }); myVisibility = v; btn.classList.add('active'); }
            loadMyDecks(1);
        });
    });

    var mySort = document.getElementById('my-sort');
    if (mySort) {
        mySort.addEventListener('change', function() { mySortVal = mySort.value; loadMyDecks(1); });
    }

    if (myIsLoggedIn && myGrid) {
        loadMyDecks(1);
    }

    if (!showPublic) return;

    // public Decks
    var pubSearch     = document.getElementById('pub-deck-search');
    var pubLoading    = document.getElementById('pub-loading');
    var pubError      = document.getElementById('pub-error');
    var pubEmpty      = document.getElementById('pub-empty');
    var pubNoMatch    = document.getElementById('pub-no-match');
    var pubGrid       = document.getElementById('pub-grid');
    var pubPagination = document.getElementById('pub-pagination');
    var pubFactions   = [];
    var pubFormat     = '';
    var pubSortVal    = 'updatedAt:desc';
    var pubAllItems   = [];

    function renderPublicDeck(deck) {
        var deckId   = deck.id || '';
        var name     = deck.name || txt.unnamed;
        var fmt      = (deck.format || 'standard').toLowerCase();
        var fmtData  = formats[fmt] || {};
        var fmtLabel = fmtData.label || fmt;
        var fmtColor = fmtData.color || 'var(--neutral-400)';
        var isPublic = deck.isPublic;
        var isDraft  = !deck.hasOwnProperty('isDraft') || deck.isDraft;
        var stats    = deck.stats || {};
        var hero     = stats.hero || {};
        var heroRef  = hero.reference || '';
        var heroName = hero.name || '';
        var totalCards = stats.totalCards != null ? stats.totalCards : null;
        var byRarity = stats.byRarity || {};
        var desc     = deck.description || '';
        var legal          = deck.hasOwnProperty('legal') ? deck.legal : null;
        var formatErrors   = Array.isArray(deck.formatErrors) ? deck.formatErrors : [];
        var legalityDetail = (deck.legalityDetail && typeof deck.legalityDetail === 'object') ? deck.legalityDetail : {};

        var factionCode = '';
        var m = heroRef.match(/^ALT_[^_]+_[^_]+_([A-Z]{2})_/);
        if (m) factionCode = m[1];
        var factionData  = factions[factionCode] || {};
        var factionColor = factionData.color || '#ffffff';
        var factionImg   = factionCode ? pluginAssetsUrl + '/faction/' + factionCode + '.png' : '';
        var heroImgUrl   = heroRef ? cdnUrl + '/cards/hero/' + heroRef + '_1.webp' : '';

        var heroStyle    = _deckHeroStyle(heroImgUrl, factionColor);
        var rarityHtml   = _deckRarityHtml(byRarity);
        var legalityHtml = _deckLegalityHtml(legal, _deckHasErrors(formatErrors, legalityDetail), formatErrors, legalityDetail, fmtLabel);

        var viewCount   = deck.viewCount   != null ? parseInt(deck.viewCount,   10) : null;
        var upvoteCount = deck.upvoteCount != null ? parseInt(deck.upvoteCount, 10) : null;
        var statsHtml = '';
        if (viewCount !== null || upvoteCount !== null) {
            statsHtml = '<span class="d-flex align-items-center gap-3" style="color:rgba(255,255,255,.6);font-size:.78rem">';
            if (viewCount   !== null) statsHtml += '<span><i class="fa-solid fa-eye me-1"></i>' + viewCount   + '</span>';
            if (upvoteCount !== null) statsHtml += '<span><i class="fa-solid fa-heart me-1"></i>' + upvoteCount + '</span>';
            statsHtml += '</span>';
        }

        var descHtml = desc ? '<p class="news-card-excerpt mb-0" style="font-size:.88rem">' + escHtml(desc.substring(0, 120) + (desc.length > 120 ? '…' : '')) + '</p>' : '';

        return '<div class="col-12 col-md-6 col-lg-4 pub-deck-item"'
            + ' data-name="' + escHtml(name.toLowerCase()) + '"'
            + ' data-format="' + escHtml(fmt) + '"'
            + ' data-faction="' + escHtml(factionCode) + '"'
            + ' data-public="' + (isPublic ? '1' : '0') + '"'
            + ' data-deck-id="' + escHtml(deckId) + '">'
            + '<div class="news-card h-100" style="border-top:3px solid ' + escHtml(fmtColor) + ';cursor:pointer;' + heroStyle + '">'
            + '<div class="news-card-body d-flex flex-column gap-2 deck-card-text-white">'

            + '<div class="d-flex flex-wrap gap-1 align-items-center">'
            + '<span class="badge" style="background:' + escHtml(fmtColor) + ';color:#fff;font-size:.72rem">' + escHtml(fmtLabel) + '</span>'
            + (isDraft ? '<span class="badge bg-secondary" style="font-size:.72rem">' + escHtml(txt.draft) + '</span>' : '')
            + legalityHtml
            + '<span class="badge ms-auto" style="background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.2);color:#fff;font-size:.72rem">'
            + '<i class="fa-solid ' + (isPublic ? 'fa-globe' : 'fa-lock') + ' me-1"></i>' + escHtml(isPublic ? txt.public : txt.private)
            + '</span></div>'

            + '<h3 class="news-card-title mb-0 d-flex align-items-center gap-2" style="font-size:1.05rem">'
            + (factionImg ? '<img src="' + escHtml(factionImg) + '" alt="' + escHtml(factionCode) + '" style="width:24px;height:24px;object-fit:contain;flex-shrink:0">' : '')
            + escHtml(name) + '</h3>'

            + (heroName ? '<p class="mb-0" style="font-size:.8rem;color:rgba(255,255,255,.75)">' + escHtml(heroName) + '</p>' : '')

            + '<div class="mt-auto pt-2" style="border-top:1px solid rgba(255,255,255,.2)">'
            + '<div class="d-flex align-items-center gap-2 mb-2">'
            + (totalCards !== null ? '<span style="color:rgba(255,255,255,.7);font-size:.875rem;font-weight:700">' + totalCards + ' ' + escHtml(txt.cards) + '</span>' : '')
            + rarityHtml + '</div>'
            + '<div class="d-flex align-items-center justify-content-between">'
            + statsHtml
            + '<a href="' + escHtml(baseUrl) + '/pages/deck?id=' + encodeURIComponent(deckId) + '" class="btn btn-primary-altered btn-sm d-none">'
            + escHtml(txt.view_btn) + ' <i class="fa-solid fa-eye ms-1"></i></a>'
            + '</div></div>'
            + '</div></div></div>';
    }

    if (pubGrid) {
        pubGrid.addEventListener('click', function(e) {
            if (e.target.closest('a, button, .dropdown')) return;
            var card = e.target.closest('.pub-deck-item');
            if (card && card.dataset.deckId) {
                location.href = baseUrl + '/pages/deck?id=' + encodeURIComponent(card.dataset.deckId);
            }
        });
    }

    function filterPublic() {
        var q = pubSearch ? pubSearch.value.trim().toLowerCase() : '';
        var visible = 0;
        pubAllItems.forEach(function (el) {
            var show = (!q              || (el.dataset.name    || '').includes(q))
                    && (!pubFormat      || el.dataset.format   === pubFormat)
                    && (!pubFactions.length || pubFactions.indexOf(el.dataset.faction) >= 0);
            el.style.display = show ? '' : 'none';
            if (show) visible++;
        });
        if (pubNoMatch) pubNoMatch.style.display = (visible === 0 && pubAllItems.length > 0) ? '' : 'none';
    }

    function renderPagination(p, t) { renderPaginationUI(pubPagination, p, t, loadPublicDecks); }

    function loadPublicDecks(p, scroll) {
        pubLoading.style.display = '';
        pubError.style.display   = 'none';
        pubEmpty.style.display   = 'none';
        pubNoMatch.style.display = 'none';
        pubGrid.innerHTML        = '';
        pubPagination.style.setProperty('display', 'none', 'important');

        var pubSortParts = pubSortVal.split(':');
        var fetchUrl = baseUrl + '/pages/decks?ajax=public&page=' + p
            + '&order=' + encodeURIComponent(pubSortParts[0])
            + '&dir='   + encodeURIComponent(pubSortParts[1] || 'desc');
        if (pubFormat) fetchUrl += '&format=' + encodeURIComponent(pubFormat);
        fetch(fetchUrl)
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (apiDebug) console.log('[decks] public decks API response:', data);
                pubLoading.style.display = 'none';
                if (data.error) { pubError.innerHTML = apiErrorHtml(data.error); pubError.style.display = ''; return; }
                var decks = data.member || data.data || (Array.isArray(data) ? data : []);
                if (!decks.length) { pubEmpty.style.display = ''; return; }
                decks.forEach(function (deck) { pubGrid.insertAdjacentHTML('beforeend', renderPublicDeck(deck)); });
                pubAllItems = Array.from(pubGrid.querySelectorAll('.pub-deck-item'));
                filterPublic();
                var total = data.totalItems ? Math.ceil(data.totalItems / 21) : 1;
                renderPagination(p, total);
                if (scroll) pubGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
            })
            .catch(function () {
                pubLoading.style.display = 'none';
                pubError.innerHTML = apiErrorHtml(txt.err_connect);
                pubError.style.display = '';
            });
    }

    if (pubSearch) pubSearch.addEventListener('input', filterPublic);

    document.querySelectorAll('[data-pub-format]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var v = btn.dataset.pubFormat;
            if (pubFormat === v) { pubFormat = ''; btn.classList.remove('active'); }
            else { document.querySelectorAll('[data-pub-format]').forEach(function (b) { b.classList.remove('active'); }); pubFormat = v; btn.classList.add('active'); }
            loadPublicDecks(1);
        });
    });

    document.querySelectorAll('[data-pub-faction]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var v = btn.dataset.pubFaction, idx = pubFactions.indexOf(v);
            if (idx >= 0) { pubFactions.splice(idx, 1); btn.classList.remove('active'); }
            else          { pubFactions.push(v);         btn.classList.add('active'); }
            filterPublic();
        });
    });

    var pubSort = document.getElementById('pub-sort');
    if (pubSort) {
        pubSort.addEventListener('change', function() { pubSortVal = pubSort.value; loadPublicDecks(1); });
    }

    // Auto-load public decks when it's the default tab (visitor not logged in)
    if (<?= json_encode(!$isLoggedIn && $showPublicTab) ?>) {
        pubLoaded = true;
        loadPublicDecks(1);
    }

}());
</script>

<?php if ($isLoggedIn): ?>
<script>
(function () {
    var GUEST_DECK_KEY = 'alteredcore_guest_deck';
    var baseUrl  = <?= json_encode(BASE_URL) ?>;
    var uiLang   = <?= json_encode($uiLang) ?>;
    var csrf     = <?= json_encode(csrfToken()) ?>;
    var txt = <?= json_encode([
        'unnamed'          => $txt['unnamed'],
        'cards'            => $txt['cards'],
        'local_deck_found' => $txt['local_deck_found'],
        'local_save_btn'   => $txt['local_save_btn'],
        'local_discard_btn'    => $txt['local_discard_btn'],
        'local_discard_confirm'=> $txt['local_discard_confirm'],
        'local_save_err'   => $txt['local_save_err'],
        'err_connect'      => $txt['err_connect'],
    ]) ?>;

    function escHtml(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    var zone = document.getElementById('local-deck-import');
    if (!zone) return;

    var raw = null;
    try { raw = JSON.parse(localStorage.getItem(GUEST_DECK_KEY)); } catch (e) {}
    if (!raw || (!raw.hero && !Object.keys(raw.cards || {}).length)) return;

    var name  = raw.name || txt.unnamed;
    var total = Object.keys(raw.cards || {}).reduce(function (s, ref) { return s + ((raw.cards[ref].qty) || 0); }, 0);

    zone.innerHTML =
        '<div style="background:#eff6ff;border:1px solid #3b82f6;border-radius:8px;padding:12px 16px;font-size:.875rem;color:#1e40af">'
        + '<div class="d-flex align-items-center justify-content-between flex-wrap gap-2">'
        + '<span><i class="fa-solid fa-hard-drive me-1"></i>'
        + '<strong>' + escHtml(name) + '</strong> — '
        + total + ' ' + escHtml(txt.cards) + ' — '
        + escHtml(txt.local_deck_found) + '</span>'
        + '<div class="d-flex gap-2 flex-shrink-0">'
        + '<button type="button" id="local-discard-btn" class="btn btn-sm btn-outline-secondary">' + escHtml(txt.local_discard_btn) + '</button>'
        + '<button type="button" id="local-save-btn" class="btn btn-sm btn-primary-altered">'
        + '<i class="fa-solid fa-cloud-arrow-up me-1"></i>' + escHtml(txt.local_save_btn)
        + '</button>'
        + '</div>'
        + '</div>'
        + '<div id="local-import-msg" style="margin-top:6px;font-size:.82rem;display:none"></div>'
        + '</div>';
    zone.style.display = '';

    var saveBtnHtml = '<i class="fa-solid fa-cloud-arrow-up me-1"></i>' + escHtml(txt.local_save_btn);

    document.getElementById('local-discard-btn').addEventListener('click', function () {
        if (!confirm(txt.local_discard_confirm)) return;
        localStorage.removeItem(GUEST_DECK_KEY);
        zone.style.display = 'none';
    });

    document.getElementById('local-save-btn').addEventListener('click', function () {
        var btn   = this;
        var msgEl = document.getElementById('local-import-msg');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i>…';
        msgEl.style.display = 'none';

        var hero  = raw.hero  || null;
        var cards = raw.cards || {};
        var deckCards = Object.keys(cards).map(function (ref) {
            return { cardReference: ref, quantity: cards[ref].qty };
        });
        if (hero) deckCards.unshift({ cardReference: hero.cardReference, quantity: 1 });

        var payload = {
            name:      raw.name || <?= json_encode($txt['unnamed']) ?>,
            description: '',
            format:    raw.format || 'standard',
            isPublic:  false,
            isDraft:   true,
            deckCards: deckCards,
        };

        var body = new FormData();
        body.append('csrf_token', csrf);
        body.append('deck_id',    '');
        body.append('payload',    JSON.stringify(payload));

        fetch(baseUrl + '/pages/deckbuilder?ajax=1', { method: 'POST', body: body })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.ok) {
                    localStorage.removeItem(GUEST_DECK_KEY);
                    window.location.href = data.id
                        ? baseUrl + '/pages/deck?id=' + encodeURIComponent(data.id)
                        : baseUrl + '/pages/decks';
                } else {
                    btn.disabled = false;
                    btn.innerHTML = saveBtnHtml;
                    msgEl.textContent = data.error || txt.local_save_err;
                    msgEl.style.color = '#dc2626';
                    msgEl.style.display = '';
                }
            })
            .catch(function () {
                btn.disabled = false;
                btn.innerHTML = saveBtnHtml;
                msgEl.textContent = txt.err_connect;
                msgEl.style.color = '#dc2626';
                msgEl.style.display = '';
            });
    });
}());
</script>
<?php endif; ?>

<?php if (!$isLoggedIn && $guestModeEnabled): ?>
<script>
(function () {
    var GUEST_DECK_KEY = 'alteredcore_guest_deck';
    var baseUrl  = <?= json_encode(BASE_URL) ?>;
    var cdnUrl   = <?= json_encode(CDN_URL) ?>;
    var formats  = <?= json_encode(array_map(fn($d) => ['label' => $d[$uiLang] ?? $d['en'] ?? '', 'color' => $d['color'] ?? 'var(--neutral-400)'], $formatsData)) ?>;
    var factions = <?= json_encode(array_map(fn($d) => ['color' => $d['color'] ?? '#ffffff'], $factionsData)) ?>;
    var uiLang   = <?= json_encode($uiLang) ?>;
    var txtGuest = <?= json_encode([
        'unnamed'        => $txt['unnamed'],
        'cards'          => $txt['cards'],
        'local'          => $txt['guest_local'],
        'edit'           => $txt['guest_edit_btn'],
        'delete_confirm' => $txt['guest_delete_confirm'],
        'no_deck'        => $txt['guest_no_deck'],
    ]) ?>;

    function escHtml(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function renderGuestDeck() {
        var wrap   = document.getElementById('guest-deck-wrap');
        var grid   = document.getElementById('guest-deck-grid');
        var noDeck = document.getElementById('guest-no-deck');
        if (!wrap || !grid || !noDeck) return;

        var raw = null;
        try { raw = JSON.parse(localStorage.getItem(GUEST_DECK_KEY)); } catch (e) {}

        if (!raw) {
            wrap.style.display = 'none';
            noDeck.style.display = '';
            return;
        }

        var total = 0;
        var cards = raw.cards || {};
        Object.keys(cards).forEach(function (ref) { total += (cards[ref].qty || 0); });

        var name     = raw.name || txtGuest.unnamed;
        var fmt      = (raw.format || 'standard').toLowerCase();
        var fmtData  = formats[fmt] || {};
        var fmtLabel = fmtData.label || fmt;
        var fmtColor = fmtData.color || 'var(--neutral-400)';

        var hero        = raw.hero || null;
        var heroRef     = hero ? (hero.cardReference || '') : '';
        var heroName    = hero ? (typeof hero.name === 'object' ? (hero.name[uiLang] || hero.name.en || '') : (hero.name || '')) : '';
        var factionCode = hero ? (hero.factionCode || '') : '';
        var factionData = factions[factionCode] || {};
        var factionColor = factionData.color || '#ffffff';
        var factionImg  = factionCode ? pluginAssetsUrl + '/faction/' + factionCode + '.png' : '';
        var heroImgUrl  = heroRef ? cdnUrl + '/cards/hero/' + heroRef + '_1.webp' : '';

        var heroStyle = heroImgUrl
            ? 'background-image:linear-gradient(to right,' + factionColor + 'cc 30%,' + factionColor + '00 100%),url(' + escHtml(heroImgUrl) + ');background-size:cover;background-position:left top;'
            : 'background-image:linear-gradient(rgba(0,0,0,.5),rgba(0,0,0,.5)),url(' + pluginAssetsUrl + '/img/ALT_OFFICIAL_CARDBACK.png);background-size:120% auto;background-position:center center;background-repeat:no-repeat;';

        grid.innerHTML = '<div class="col-12 col-md-6 col-lg-4">'
            + '<div class="news-card h-100" style="border-top:3px solid #f59e0b;' + heroStyle + '">'
            + '<div class="news-card-body d-flex flex-column gap-2 deck-card-text-white">'

            + '<div class="d-flex flex-wrap gap-1 align-items-center">'
            + '<span class="badge" style="background:' + escHtml(fmtColor) + ';color:#fff;font-size:.72rem">' + escHtml(fmtLabel) + '</span>'
            + '<span class="badge ms-auto" style="background:rgba(245,158,11,.35);border:1px solid rgba(245,158,11,.6);color:#fef3c7;font-size:.72rem">'
            + '<i class="fa-solid fa-hard-drive me-1"></i>' + escHtml(txtGuest.local)
            + '</span>'
            + '</div>'

            + '<h3 class="news-card-title mb-0 d-flex align-items-center gap-2" style="font-size:1.05rem">'
            + (factionImg ? '<img src="' + escHtml(factionImg) + '" alt="' + escHtml(factionCode) + '" style="width:24px;height:24px;object-fit:contain;flex-shrink:0">' : '')
            + escHtml(name) + '</h3>'

            + (heroName ? '<p class="mb-0" style="font-size:.8rem;color:rgba(255,255,255,.75)">' + escHtml(heroName) + '</p>' : '')

            + '<div class="mt-auto pt-2" style="border-top:1px solid rgba(255,255,255,.2)">'
            + '<div class="d-flex align-items-center gap-2 mb-2">'
            + '<span style="color:rgba(255,255,255,.7);font-size:.875rem">' + total + ' ' + escHtml(txtGuest.cards) + '</span>'
            + '</div>'
            + '<div class="d-flex align-items-center justify-content-between gap-1">'
            + '<button type="button" onclick="guestDeckDelete()" class="btn btn-sm" style="background:rgba(255,255,255,.85);border:1px solid rgba(200,50,50,.4);color:#c0392b">'
            + '<i class="fa-solid fa-trash"></i>'
            + '</button>'
            + '<a href="' + escHtml(baseUrl) + '/pages/deckbuilder" class="btn btn-primary-altered btn-sm">'
            + '<i class="fa-solid fa-pen me-1"></i>' + escHtml(txtGuest.edit)
            + '</a>'
            + '</div></div>'
            + '</div></div></div>';

        wrap.style.display = '';
        noDeck.style.display = 'none';
    }

    window.guestDeckDelete = function () {
        if (!confirm(txtGuest.delete_confirm)) return;
        localStorage.removeItem(GUEST_DECK_KEY);
        renderGuestDeck();
    };

    renderGuestDeck();
}());
</script>
<?php endif; ?>

<?php if (!empty($communityBuilders)): ?>
<div class="modal fade" id="communityBuildersModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title fw-bold">
                    <i class="fa-solid fa-people-group me-2" style="color:var(--primary-400)"></i><?= h($txt['community_modal_title']) ?>
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-3">
                <div class="row g-3">
                    <?php foreach ($communityBuilders as $cb): ?>
                    <div class="col-12 col-sm-6 col-md-4">
                        <div class="card-altered h-100 d-flex flex-column" style="overflow:hidden">
                            <?php if (!empty($cb['image'])): ?>
                            <div style="height:120px;overflow:hidden">
                                <img src="<?= h(assetUrl($cb['image'])) ?>" alt="<?= h($cb['title']) ?>"
                                     style="width:100%;height:100%;object-fit:cover">
                            </div>
                            <?php endif; ?>
                            <div class="p-3 d-flex flex-column flex-fill">
                                <div class="fw-bold mb-1" style="font-size:1rem"><?= h($cb['title']) ?></div>
                                <p class="small mb-3 flex-fill" style="color:var(--neutral-600)">
                                    <?= h($cb['desc'][$uiLang] ?? $cb['desc']['en'] ?? '') ?>
                                </p>
                                <a href="<?= h($cb['url']) ?>" target="_blank" rel="noopener"
                                   class="btn btn-primary-altered btn-sm align-self-start">
                                    <i class="fa-solid fa-arrow-up-right-from-square me-1"></i><?= h($txt['community_visit']) ?>
                                </a>
                            </div>
                        </div>
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>
        </div>
    </div>
</div>
<?php endif; ?>


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

<?php if ($isLoggedIn): ?>
<!-- Import deck modal (tabbed: decklist / Altered.gg) -->
<div class="modal fade" id="importDeckModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" style="max-width:500px">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title fw-bold">
                    <i class="fa-solid fa-file-import me-2" style="color:var(--primary-400)"></i><?= h($txt['import_modal_title']) ?>
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body pb-2">
                <ul class="nav nav-tabs mb-3" id="importDeckTabs" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active" id="import-tab-list-btn" data-bs-toggle="tab"
                                data-bs-target="#import-pane-list" type="button" role="tab">
                            <i class="fa-solid fa-list me-1"></i><?= h($txt['import_tab_list']) ?>
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="import-tab-gg-btn" data-bs-toggle="tab"
                                data-bs-target="#import-pane-gg" type="button" role="tab">
                            <i class="fa-solid fa-arrow-up-right-from-square me-1"></i><?= h($txt['import_tab_gg']) ?>
                        </button>
                    </li>
                </ul>
                <div class="tab-content">
                    <!-- Tab: decklist -->
                    <div class="tab-pane fade show active" id="import-pane-list" role="tabpanel">
                        <div id="import-list-error" class="alert alert-danger p-2 mb-3" style="display:none;font-size:.85rem"></div>
                        <div class="mb-3">
                            <label class="form-label small fw-semibold"><?= h($txt['import_name_label']) ?></label>
                            <input type="text" id="import-name" class="form-control form-control-sm"
                                   placeholder="<?= h($txt['my_deck']) ?>">
                        </div>
                        <div class="mb-3">
                            <label class="form-label small fw-semibold"><?= h($txt['import_format_label']) ?></label>
                            <select id="import-format" class="form-select form-select-sm">
                                <?php foreach ($formatsData as $fmtKey => $fmtData): ?>
                                <option value="<?= h($fmtKey) ?>"><?= h($fmtData[$uiLang] ?? $fmtData['en']) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="mb-1">
                            <label class="form-label small fw-semibold"><?= h($txt['import_list_label']) ?></label>
                            <textarea id="import-list" class="form-control form-control-sm" rows="8"
                                      style="font-family:monospace;font-size:.8rem"
                                      placeholder="1 ALT_CORE_B_AX_01_U_2021&#10;3 ALT_CORE_B_AX_02_C&#10;…"></textarea>
                            <div class="form-text"><?= h($txt['import_list_hint']) ?></div>
                        </div>
                    </div>
                    <!-- Tab: Altered.gg -->
                    <div class="tab-pane fade" id="import-pane-gg" role="tabpanel">
                        <div id="import-gg-error" class="alert alert-danger p-2 mb-3" style="display:none;font-size:.85rem"></div>
                        <div class="mb-1">
                            <label class="form-label small fw-semibold"><?= h($txt['import_gg_url_label']) ?></label>
                            <input type="text" id="import-gg-url" class="form-control form-control-sm"
                                   placeholder="https://www.altered.gg/decks/01KD6B…">
                            <div class="form-text"><?= h($txt['import_gg_url_hint']) ?></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal"><?= h($txt['import_cancel']) ?></button>
                <button type="button" id="import-submit" class="btn btn-primary-altered btn-sm">
                    <i class="fa-solid fa-file-import me-1"></i><?= h($txt['import_submit']) ?>
                </button>
            </div>
        </div>
    </div>
</div>
<script>
(function () {
    var baseUrl    = <?= json_encode(BASE_URL) ?>;
    var csrf       = <?= json_encode(csrfToken()) ?>;
    var txtImport  = <?= json_encode([
        'err_empty' => $txt['import_err_empty'],
        'err_conn'  => $txt['err_connect'],
    ]) ?>;

    var modalEl    = document.getElementById('importDeckModal');
    var submitBtn  = document.getElementById('import-submit');
    var submitHtml = submitBtn ? submitBtn.innerHTML : '';
    if (!submitBtn) return;

    function activeTab() {
        var pane = document.getElementById('import-pane-list');
        return (pane && pane.classList.contains('show')) ? 'list' : 'gg';
    }

    function resetModal() {
        document.getElementById('import-list-error').style.display = 'none';
        document.getElementById('import-gg-error').style.display   = 'none';
        document.getElementById('import-name').value    = '';
        document.getElementById('import-list').value    = '';
        document.getElementById('import-gg-url').value  = '';
    }

    function onSuccess(id) {
        bootstrap.Modal.getInstance(modalEl).hide();
        window.location.href = id
            ? baseUrl + '/pages/deck?id=' + encodeURIComponent(id)
            : baseUrl + '/pages/decks';
    }

    submitBtn.addEventListener('click', function () {
        if (activeTab() === 'list') {
            var errorEl = document.getElementById('import-list-error');
            var name    = document.getElementById('import-name').value.trim();
            var format  = document.getElementById('import-format').value;
            var list    = document.getElementById('import-list').value.trim();

            errorEl.style.display = 'none';
            if (!list) {
                errorEl.textContent = txtImport.err_empty;
                errorEl.style.display = '';
                return;
            }

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i>…';

            var body = new FormData();
            body.append('csrf_token', csrf);
            body.append('name',       name);
            body.append('format',     format);
            body.append('decklist',   list);

            fetch(baseUrl + '/pages/decks?ajax=import', { method: 'POST', body: body })
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = submitHtml;
                    if (data.ok) { onSuccess(data.id); }
                    else { errorEl.textContent = data.error || 'Error'; errorEl.style.display = ''; }
                })
                .catch(function () {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = submitHtml;
                    errorEl.textContent = txtImport.err_conn;
                    errorEl.style.display = '';
                });
        } else {
            var errorEl = document.getElementById('import-gg-error');
            var url     = document.getElementById('import-gg-url').value.trim();

            errorEl.style.display = 'none';
            if (!url) return;

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i>…';

            var body = new FormData();
            body.append('csrf_token', csrf);
            body.append('gg_url',     url);

            fetch(baseUrl + '/pages/decks?ajax=import_gg', { method: 'POST', body: body })
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = submitHtml;
                    if (data.ok) { onSuccess(data.id); }
                    else { errorEl.textContent = data.error || 'Error'; errorEl.style.display = ''; }
                })
                .catch(function () {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = submitHtml;
                    errorEl.textContent = txtImport.err_conn;
                    errorEl.style.display = '';
                });
        }
    });

    modalEl.addEventListener('hidden.bs.modal', resetModal);
}());
</script>
<?php endif; ?>

