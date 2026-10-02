<?php
require_once __DIR__ . '/../includes/functions.php';
$lang   = getLang();
$uiLang = getUiLang();

// Non-logged-in visitors are no longer redirected; they land on the Community tab by default.
require_once __DIR__ . '/../config.php';

// Path on DECKS_API_URL for public decks listing (e.g. '/api/decks/public').
// Leave empty to hide the Public tab entirely.
$publicDecksApiPath = '/api/decks/public';

$contestDecksAll = cacLoadContestDecksFromJsonFile(__DIR__ . '/../data/starter-deck-contest-collection.json');

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
        'section_subtitle'=> 'Build, import and share your Altered decks.',
        'filters_toggle'  => 'Show filters',
        'tabs_label'      => 'Deck lists',
        'views_label'     => 'Views',
        'upvote_label'    => 'Upvote this deck',
        'delete_btn'      => 'Delete',
        'pagination_label'=> 'Pages',
        'page_go'         => 'Go',
        'tab_my'          => 'My Decks',
        'tab_public'      => 'Community',
        'tab_contest'     => 'Starter Deck Contest',
        'create_btn'      => 'New deck',
        'import_btn'      => 'Import a deck',
        'import_bulk_btn' => 'Import from Equinox ZIP',
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
        'lbl_hero'        => 'Hero',
        'hero_all'        => 'All heroes',
        'lbl_visibility'  => 'Visibility',
        'lbl_sort'        => 'Sort',
        'sort_updated_desc' => 'Recently updated',
        'sort_updated_asc'  => 'Oldest updated',
        'sort_created_desc' => 'Recently created',
        'sort_created_asc'  => 'Oldest created',
        'sort_name_asc'     => 'Name A→Z',
        'sort_name_desc'    => 'Name Z→A',
        'sort_upvotes_desc' => 'Most upvotes',
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
        'filter_curated'        => 'Starter Deck Contest Winners',
        'filter_curated_collection' => 'Starter Deck Contest Entries',
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
        'section_subtitle'=> 'Créez, importez et partagez vos decks Altered.',
        'filters_toggle'  => 'Afficher les filtres',
        'tabs_label'      => 'Listes de decks',
        'views_label'     => 'Vues',
        'upvote_label'    => 'Voter pour ce deck',
        'delete_btn'      => 'Supprimer',
        'pagination_label'=> 'Pages',
        'page_go'         => 'OK',
        'tab_my'          => 'Mes decks',
        'tab_public'      => 'Communauté',
        'tab_contest'     => 'Concours deck de démarrage',
        'create_btn'      => 'Nouveau deck',
        'import_btn'      => 'Importer un deck',
        'import_bulk_btn' => 'Importer depuis le ZIP Equinox',
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
        'lbl_hero'        => 'Héros',
        'hero_all'        => 'Tous les héros',
        'lbl_visibility'  => 'Visibilité',
        'lbl_sort'        => 'Tri',
        'sort_updated_desc' => 'Récemment modifié',
        'sort_updated_asc'  => 'Plus ancien modifié',
        'sort_created_desc' => 'Récemment créé',
        'sort_created_asc'  => 'Plus ancien créé',
        'sort_name_asc'     => 'Nom A→Z',
        'sort_name_desc'    => 'Nom Z→A',
        'sort_upvotes_desc' => 'Plus d\'upvotes',
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
        'filter_curated'        => 'Gagnants du concours de deck de démarrage',
        'filter_curated_collection' => 'Decklists du concours de deck de démarrage',
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

// AJAX proxy: heroes list
if ($_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['ajax'] ?? '') === 'heroes') {
    header('Content-Type: application/json');
    $heroLocale = in_array($uiLang, ['fr', 'en', 'de', 'es', 'it'], true) ? $uiLang : 'en';
    $heroesUrl = 'https://deckbuilder.alteredcore.org/deck-api-proxy/decks/public/heroes?locale=' . $heroLocale;
    $ch = curl_init($heroesUrl);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_HTTPHEADER => ['Accept: application/json'], CURLOPT_TIMEOUT => 10]);
    $heroesResp = curl_exec($ch);
    $heroesCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($heroesCode >= 200 && $heroesCode < 300 && $heroesResp) {
        echo $heroesResp;
    } else {
        http_response_code($heroesCode ?: 500);
        echo json_encode([]);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_GET['ajax'] ?? '') === 'upvote') {
    header('Content-Type: application/json');
    if (!csrfValid($_POST['csrf_token'] ?? '') || !$isLoggedIn) {
        echo json_encode(['ok' => false]);
        exit;
    }
    $upvoteDeckId = trim($_POST['deck_id'] ?? '');
    if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $upvoteDeckId)) {
        echo json_encode(['ok' => false]);
        exit;
    }
    $token = deckApiToken();
    if (!$token) {
        echo json_encode(['ok' => false]);
        exit;
    }
    $result = cacDeckApiUpvote($upvoteDeckId, $token);
    if ($result === null) {
        echo json_encode(['ok' => false]);
        exit;
    }
    echo json_encode(['ok' => true, 'upvoteCount' => $result['upvoteCount'], 'hasUpvoted' => $result['hasUpvoted']]);
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
    $allowedPubOrders = ['createdAt', 'updatedAt', 'name', 'upvoteCount'];
    $allowedPubDirs   = ['asc', 'desc'];
    if (!in_array($pubOrder, $allowedPubOrders, true)) $pubOrder = 'updatedAt';
    if (!in_array($pubDir,   $allowedPubDirs,   true)) $pubDir   = 'desc';
    if ($pubOrder === 'upvoteCount') $pubDir = 'desc';

    $pubFaction = $_GET['faction'] ?? '';
    if (!preg_match('/^[A-Z]{2}$/', $pubFaction)) $pubFaction = '';
    $pubHero = $_GET['hero'] ?? '';
    if (!preg_match('/^[A-Z0-9_]+$/', $pubHero)) $pubHero = '';
    $pubQ = trim($_GET['q'] ?? '');
    if (mb_strlen($pubQ) > 100) $pubQ = mb_substr($pubQ, 0, 100);

    $apiParams = ['page' => $pubPage, 'itemsPerPage' => 24];
    if ($pubFormat  !== '') $apiParams['format']  = strtolower($pubFormat);
    if ($pubFaction !== '') $apiParams['faction'] = $pubFaction;
    if ($pubHero    !== '') $apiParams['hero']    = $pubHero;
    if ($pubQ       !== '') $apiParams['name']    = $pubQ;
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

    $myFaction = $_GET['faction'] ?? '';
    if (!preg_match('/^[A-Z]{2}$/', $myFaction)) $myFaction = '';
    $myHero = $_GET['hero'] ?? '';
    if (!preg_match('/^[A-Z0-9_]+$/', $myHero)) $myHero = '';

    $apiParams = ['page' => $myPage, 'itemsPerPage' => 24];
    if ($myFormat !== '')    $apiParams['format']   = $myFormat;
    if ($myIsPublic !== '')  $apiParams['isPublic'] = $myIsPublic === '1' ? 'true' : 'false';
    if ($myIsDraft  !== '')  $apiParams['isDraft']  = $myIsDraft  === '1' ? 'true' : 'false';
    if ($myFaction !== '')   $apiParams['faction']  = $myFaction;
    if ($myHero    !== '')   $apiParams['hero']     = $myHero;

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

<?php
// Faction accent of the deck tiles: the design-system faction tokens (both themes).
$_factionTokens = ['AX' => 'axiom', 'BR' => 'bravos', 'LY' => 'lyra', 'MU' => 'muna', 'OR' => 'ordis', 'YZ' => 'yzmir'];
$_factionColorVars = [];
foreach ($factionsData as $_fc => $_fd) {
    $_factionColorVars[$_fc] = isset($_factionTokens[$_fc]) ? 'var(--ac-faction-' . $_factionTokens[$_fc] . ')' : 'var(--ac-color-overlay-control)';
}
// Renders the chip rows + selects of one tab's filter panel.
$_deckFilterChip = function (string $attr, string $value, string $label, string $lead = '', bool $hidden = false): string {
    return '<button type="button" class="ac-chip" aria-pressed="false" data-' . $attr . '="' . h($value) . '"'
         . ($hidden ? ' data-hidden="1" hidden' : '') . '>' . $lead . h($label) . '</button>';
};
?>

<div class="ac-page ac-page--wide decks-page">

    <header class="ac-page-header">
        <div>
            <h1 class="ac-page-header__title"><?= h($txt['section_title']) ?></h1>
            <p class="ac-page-header__subtitle"><?= h($txt['section_subtitle']) ?></p>
        </div>
        <?php if ($isLoggedIn): ?>
        <div class="ac-page-header__actions">
            <button type="button" class="ac-button ac-button--secondary"
                    data-bs-toggle="modal" data-bs-target="#importDeckModal">
                <?= ac_icon('file-input') ?><?= h($txt['import_btn']) ?>
            </button>
            <a href="<?= h(BASE_URL) ?>/pages/equinox-deck-import" class="ac-button ac-button--secondary">
                <?= ac_icon('file-archive') ?><?= h($txt['import_bulk_btn']) ?>
            </a>
            <?php if ($showNewDeckBtn): ?>
            <a href="<?= h($newDeckHref) ?>" class="ac-button">
                <?= ac_icon('plus') ?><?= h($txt['create_btn']) ?>
            </a>
            <?php endif; ?>
        </div>
        <?php elseif ($guestModeEnabled): ?>
        <div class="ac-page-header__actions">
            <a href="<?= h(BASE_URL) ?>/pages/deckbuilder" class="ac-button">
                <?= ac_icon('plus') ?><?= h($txt['guest_new_btn']) ?>
            </a>
        </div>
        <?php endif; ?>
    </header>

    <?php if (!empty($communityBuilders)): ?>
    <div class="ac-notice deck-community" role="note">
        <?= ac_icon('info') ?>
        <p><?= h($txt['community_info']) ?></p>
        <button type="button" class="ac-button ac-button--secondary ac-button--sm"
                data-bs-toggle="modal" data-bs-target="#communityBuildersModal">
            <?= ac_icon('external-link') ?><?= h($txt['community_btn']) ?>
        </button>
    </div>
    <?php endif; ?>

    <?php if ($showPublicTab): ?>
    <?php $_myActive = ($isLoggedIn || !$showPublicTab); ?>
    <div class="ac-tabs ac-tabs--underline decks-list-tabs" role="tablist" aria-label="<?= h($txt['tabs_label']) ?>">
        <button type="button" role="tab" id="decks-tab-my" aria-controls="tab-my"
                class="decks-list-tab<?= $_myActive ? ' is-active active' : '' ?>"
                aria-selected="<?= $_myActive ? 'true' : 'false' ?>" data-tab="my">
            <?= ac_icon('user') ?><span><?= h($txt['tab_my']) ?></span>
        </button>
        <button type="button" role="tab" id="decks-tab-public" aria-controls="tab-public"
                class="decks-list-tab<?= !$_myActive ? ' is-active active' : '' ?>"
                aria-selected="<?= !$_myActive ? 'true' : 'false' ?>" data-tab="public">
            <?= ac_icon('globe') ?><span><?= h($txt['tab_public']) ?></span>
        </button>
        <button type="button" role="tab" id="decks-tab-contest" aria-controls="tab-contest"
                class="decks-list-tab" aria-selected="false" data-tab="contest">
            <?= ac_icon('trophy') ?><span><?= h($txt['tab_contest']) ?></span>
        </button>
    </div>
    <?php endif; ?>

    <?php if ($flash = getFlash()): ?>
    <div class="ac-notice ac-notice--<?= $flash['type'] === 'error' ? 'danger' : 'success' ?> deck-local" role="status">
        <?= ac_icon($flash['type'] === 'error' ? 'triangle-alert' : 'check') ?>
        <div><?= h($flash['msg']) ?></div>
    </div>
    <?php endif; ?>

    <!-- ── My Decks tab ────────────────────────────────────────────────────── -->
    <div id="tab-my" class="decks-tab-pane"<?= $showPublicTab ? ' role="tabpanel" aria-labelledby="decks-tab-my"' : '' ?><?= (!$isLoggedIn && $showPublicTab) ? ' style="display:none"' : '' ?>>

        <!-- Local deck import zone for logged-in users (populated by JS) -->
        <div id="local-deck-import" class="deck-local" style="display:none"></div>

        <?php if (!$isLoggedIn && !$guestModeEnabled): ?>
        <!-- Login CTA (no guest mode) -->
        <div class="ac-empty deck-login">
            <?= ac_icon('layers') ?>
            <p><?= h($txt['login_msg']) ?></p>
            <a href="<?= h(BASE_URL . '/pages/login?redirect=' . rawurlencode(BASE_URL . '/pages/decks')) ?>" class="ac-button">
                <?= ac_icon('log-in') ?><?= h($txt['login_btn']) ?>
            </a>
        </div>

        <?php elseif (!$isLoggedIn): ?>
        <!-- Guest banner -->
        <div class="ac-notice ac-notice--warning deck-local" role="note">
            <?= ac_icon('info') ?>
            <div><?= h($txt['guest_banner']) ?></div>
        </div>

        <!-- Local deck (rendered by JS) -->
        <div id="guest-deck-wrap" style="display:none">
            <div class="ac-grid deck-grid" id="guest-deck-grid"></div>
        </div>
        <div id="guest-no-deck" class="ac-empty">
            <?= ac_icon('layers') ?>
            <p class="ac-empty__title"><?= h($txt['guest_no_deck']) ?></p>
        </div>

        <!-- Login CTA -->
        <div class="ac-empty deck-login deck-guest-cta">
            <p><?= h($txt['guest_login_cta']) ?></p>
            <a href="<?= h(BASE_URL . '/pages/login?redirect=' . rawurlencode($_SERVER['REQUEST_URI'] ?? '/pages/decks')) ?>" class="ac-button">
                <?= ac_icon('log-in') ?><?= h($txt['login_btn']) ?>
            </a>
        </div>

        <?php else: ?>
        <!-- Filter panel — JS reloads the list on every change -->
        <div class="ac-card deck-filters">
            <div class="deck-filters__top">
                <div class="ac-input-icon deck-filters__search">
                    <?= ac_icon('search') ?>
                    <input type="search" id="my-deck-search" class="ac-input" autocomplete="off"
                           placeholder="<?= h($txt['search_ph']) ?>" aria-label="<?= h($txt['search_ph']) ?>">
                </div>
                <button type="button" class="ac-icon-button deck-filter-toggle" aria-expanded="false"
                        aria-label="<?= h($txt['filters_toggle']) ?>"><?= ac_icon('chevron-down') ?></button>
            </div>
            <div class="deck-filters__body deck-filter-collapsible">
                <div class="deck-filters__chips filter-row--scroll">
                    <?php foreach ($formatsData as $fmtKey => $fmtData): ?>
                    <?= $_deckFilterChip('my-format', (string)$fmtKey, $fmtData[$uiLang] ?? $fmtData['en'] ?? ucfirst($fmtKey),
                            '<span class="deck-dot" style="--deck-dot:' . h($fmtData['color'] ?? 'var(--ac-color-text-muted)') . '"></span>',
                            !empty($fmtData['hidden'])) ?>
                    <?php endforeach; ?>
                </div>
                <div class="deck-filters__chips filter-row--scroll">
                    <?php foreach ($factionsData as $fCode => $fData): ?>
                    <?= $_deckFilterChip('my-faction', (string)$fCode, $fData[$uiLang] ?? $fData['en'] ?? $fCode,
                            '<img class="deck-chip-img" src="' . h($pluginAssetsUrl) . '/faction/' . h($fCode) . '.png" alt="">') ?>
                    <?php endforeach; ?>
                </div>
                <div class="deck-filters__chips filter-row--scroll">
                    <?= $_deckFilterChip('my-visibility', '1', $txt['public'], ac_icon('globe')) ?>
                    <?= $_deckFilterChip('my-visibility', '0', $txt['private'], ac_icon('lock')) ?>
                </div>
                <div class="deck-filters__selects">
                    <div class="ac-field">
                        <label class="ac-field__label" for="my-hero"><?= h($txt['lbl_hero']) ?></label>
                        <select id="my-hero" class="ac-select">
                            <option value=""><?= h($txt['hero_all']) ?></option>
                        </select>
                    </div>
                    <div class="ac-field">
                        <label class="ac-field__label" for="my-sort"><?= h($txt['lbl_sort']) ?></label>
                        <select id="my-sort" class="ac-select">
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
        </div>
        <p id="my-deck-count" class="deck-count ac-text-small ac-text-muted" style="display:none"></p>
        <div id="my-loading" class="deck-state" role="status" style="display:none">
            <span class="ac-spinner" aria-hidden="true"></span><?= h($txt['loading']) ?>
        </div>
        <div id="my-error" class="ac-empty" style="display:none"></div>
        <div id="my-empty" class="ac-empty" style="display:none">
            <?= ac_icon('layers') ?>
            <p class="ac-empty__title"><?= h($txt['no_decks']) ?></p>
            <?php if ($showNewDeckBtn): ?>
            <a href="<?= h($newDeckHref) ?>" class="ac-button ac-button--secondary ac-button--sm"><?= ac_icon('plus') ?><?= h($txt['create_btn']) ?></a>
            <?php endif; ?>
        </div>
        <div id="my-deck-grid" class="ac-grid deck-grid"></div>
        <nav id="my-pagination" class="deck-pagination" aria-label="<?= h($txt['pagination_label']) ?>" style="display:none!important"></nav>

        <?php endif; ?>
    </div><!-- /#tab-my -->

    <?php if ($showPublicTab): ?>
    <!-- ── Public Decks tab ───────────────────────────────────────────────── -->
    <div id="tab-public" class="decks-tab-pane" role="tabpanel" aria-labelledby="decks-tab-public"<?= (!$isLoggedIn && $showPublicTab) ? '' : ' style="display:none"' ?>>

        <div class="ac-card deck-filters">
            <div class="deck-filters__top">
                <div class="ac-input-icon deck-filters__search">
                    <?= ac_icon('search') ?>
                    <input type="search" id="pub-deck-search" class="ac-input" autocomplete="off"
                           placeholder="<?= h($txt['search_ph']) ?>" aria-label="<?= h($txt['search_ph']) ?>">
                </div>
                <button type="button" class="ac-icon-button deck-filter-toggle" aria-expanded="false"
                        aria-label="<?= h($txt['filters_toggle']) ?>"><?= ac_icon('chevron-down') ?></button>
            </div>
            <div class="deck-filters__body deck-filter-collapsible">
                <div class="deck-filters__chips filter-row--scroll">
                    <?php foreach ($formatsData as $fmtKey => $fmtData): ?>
                    <?= $_deckFilterChip('pub-format', (string)$fmtKey, $fmtData[$uiLang] ?? $fmtData['en'] ?? ucfirst($fmtKey),
                            '<span class="deck-dot" style="--deck-dot:' . h($fmtData['color'] ?? 'var(--ac-color-text-muted)') . '"></span>',
                            !empty($fmtData['hidden'])) ?>
                    <?php endforeach; ?>
                </div>
                <div class="deck-filters__chips filter-row--scroll">
                    <?php foreach ($factionsData as $fCode => $fData): ?>
                    <?= $_deckFilterChip('pub-faction', (string)$fCode, $fData[$uiLang] ?? $fData['en'] ?? $fCode,
                            '<img class="deck-chip-img" src="' . h($pluginAssetsUrl) . '/faction/' . h($fCode) . '.png" alt="">') ?>
                    <?php endforeach; ?>
                </div>
                <div class="deck-filters__selects">
                    <div class="ac-field">
                        <label class="ac-field__label" for="pub-hero"><?= h($txt['lbl_hero']) ?></label>
                        <select id="pub-hero" class="ac-select">
                            <option value=""><?= h($txt['hero_all']) ?></option>
                        </select>
                    </div>
                    <div class="ac-field">
                        <label class="ac-field__label" for="pub-sort"><?= h($txt['lbl_sort']) ?></label>
                        <select id="pub-sort" class="ac-select">
                            <option value="updatedAt:desc"><?= h($txt['sort_updated_desc']) ?></option>
                            <option value="updatedAt:asc"><?= h($txt['sort_updated_asc']) ?></option>
                            <option value="createdAt:desc"><?= h($txt['sort_created_desc']) ?></option>
                            <option value="createdAt:asc"><?= h($txt['sort_created_asc']) ?></option>
                            <option value="name:asc"><?= h($txt['sort_name_asc']) ?></option>
                            <option value="name:desc"><?= h($txt['sort_name_desc']) ?></option>
                            <option value="upvoteCount:desc"><?= h($txt['sort_upvotes_desc']) ?></option>
                        </select>
                    </div>
                </div>
            </div>
        </div>

        <div id="pub-loading" class="deck-state" role="status" style="display:none">
            <span class="ac-spinner" aria-hidden="true"></span><?= h($txt['loading']) ?>
        </div>
        <div id="pub-error" class="ac-empty" style="display:none"></div>
        <div id="pub-empty" class="ac-empty" style="display:none">
            <?= ac_icon('layers') ?>
            <p class="ac-empty__title"><?= h($txt['no_public_decks']) ?></p>
        </div>
        <div id="pub-no-match" class="ac-empty" style="display:none">
            <?= ac_icon('search') ?>
            <p class="ac-empty__title"><?= h($txt['no_match']) ?></p>
        </div>
        <div id="pub-grid" class="ac-grid deck-grid"></div>
        <nav id="pub-pagination" class="deck-pagination" aria-label="<?= h($txt['pagination_label']) ?>" style="display:none!important"></nav>

    </div><!-- /#tab-public -->
    <?php endif; ?>

    <!-- Starter Deck Contest tab (JSON snapshot, no Decks API) -->
    <div id="tab-contest" class="decks-tab-pane"<?= $showPublicTab ? ' role="tabpanel" aria-labelledby="decks-tab-contest"' : '' ?> style="display:none">

        <div class="ac-card deck-filters">
            <div class="deck-filters__top">
                <div class="ac-input-icon deck-filters__search">
                    <?= ac_icon('search') ?>
                    <input type="search" id="contest-deck-search" class="ac-input" autocomplete="off"
                           placeholder="<?= h($txt['search_ph']) ?>" aria-label="<?= h($txt['search_ph']) ?>">
                </div>
                <button type="button" class="ac-icon-button deck-filter-toggle" aria-expanded="false"
                        aria-label="<?= h($txt['filters_toggle']) ?>"><?= ac_icon('chevron-down') ?></button>
            </div>
            <div class="deck-filters__body deck-filter-collapsible">
                <div class="deck-filters__chips filter-row--scroll">
                    <button type="button" class="ac-chip" aria-pressed="false" data-contest-set="collection" title="<?= h($txt['filter_curated_collection']) ?>">
                        <?= ac_icon('layers') ?><?= h($txt['filter_curated_collection']) ?>
                    </button>
                    <button type="button" class="ac-chip active" aria-pressed="true" data-contest-set="winners" title="<?= h($txt['filter_curated']) ?>">
                        <?= ac_icon('star') ?><?= h($txt['filter_curated']) ?>
                    </button>
                    <?php $contestFmt = $formatsData['nuc'] ?? []; ?>
                    <span class="ac-chip" aria-pressed="true" aria-disabled="true">
                        <span class="deck-dot" style="--deck-dot:<?= h($contestFmt['color'] ?? 'var(--ac-color-primary)') ?>"></span>
                        <?= h($contestFmt[$uiLang] ?? $contestFmt['en'] ?? 'Standard No Unique') ?>
                    </span>
                </div>
                <div class="deck-filters__chips filter-row--scroll">
                    <?php foreach ($factionsData as $fCode => $fData): ?>
                    <?= $_deckFilterChip('contest-faction', (string)$fCode, $fData[$uiLang] ?? $fData['en'] ?? $fCode,
                            '<img class="deck-chip-img" src="' . h($pluginAssetsUrl) . '/faction/' . h($fCode) . '.png" alt="">') ?>
                    <?php endforeach; ?>
                </div>
                <div class="deck-filters__selects">
                    <div class="ac-field">
                        <label class="ac-field__label" for="contest-hero"><?= h($txt['lbl_hero']) ?></label>
                        <select id="contest-hero" class="ac-select">
                            <option value=""><?= h($txt['hero_all']) ?></option>
                        </select>
                    </div>
                </div>
            </div>
        </div>

        <div id="contest-grid" class="ac-grid deck-grid"></div>

    </div><!-- /#tab-contest -->

</div>

<script>
(function () {
    // BGA tester: hidden formats (filters + import select) become visible only when
    // the tester flag has been enabled via the secret /pages/bgatester opt-in page.
    var _bgaTester = false;
    try { _bgaTester = localStorage.getItem('bgatester') === 'true'; } catch (e) {}
    if (_bgaTester) {
        document.querySelectorAll('[data-hidden]').forEach(function (el) {
            el.hidden = false;
            el.removeAttribute('hidden');
        });
    }

    var baseUrl         = <?= json_encode(BASE_URL) ?>;
    var pluginAssetsUrl = <?= json_encode($pluginAssetsUrl) ?>;
    var apiDebug        = <?= (defined('API_RESPONSE_DEBUG') && API_RESPONSE_DEBUG) ? 'true' : 'false' ?>;
    var showPublic = <?= json_encode($showPublicTab) ?>;
    var contestDecksAll = <?= json_encode($contestDecksAll, JSON_UNESCAPED_UNICODE) ?>;
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
        'hero_all'              => $txt['hero_all'],
        'views_label'           => $txt['views_label'],
        'upvote_label'          => $txt['upvote_label'],
        'delete_btn'            => $txt['delete_btn'],
        'pagination_label'      => $txt['pagination_label'],
        'page_go'               => $txt['page_go'],
    ]) ?>;
    var formats = <?= json_encode(array_map(fn($d) => [
        'label' => $d[$uiLang] ?? $d['en'] ?? '',
        'color' => $d['color'] ?? 'var(--ac-color-text-muted)',
    ], $formatsData)) ?>;
    var factions = <?= json_encode(array_combine(array_keys($factionsData), array_map(fn($code, $d) => [
        'color' => $_factionColorVars[$code],
        'name'  => $d[$uiLang] ?? $d['en'] ?? '',
    ], array_keys($factionsData), $factionsData))) ?>;
    var cdnUrl = <?= json_encode(CDN_URL) ?>;
    // Icons rendered by PHP (ac_icon): this script runs before the deferred ac.js.
    var ICONS = <?= json_encode([
        'alert'    => ac_icon('triangle-alert'),
        'check'    => ac_icon('check'),
        'globe'    => ac_icon('globe'),
        'lock'     => ac_icon('lock'),
        'eye'      => ac_icon('eye'),
        'heart'    => ac_icon('heart'),
        'pencil'   => ac_icon('pencil'),
        'trash'    => ac_icon('trash-2'),
        'external' => ac_icon('external-link'),
        'prev'     => ac_icon('chevron-left'),
        'next'     => ac_icon('chevron-right'),
    ]) ?>;

    // The Collector Booster's individually-serialized hero prints (ALT_DUSTERCB_P_<FACTION>_
    // <NUM>_<RARITY>_<001-030|XXX>, 6 heroes x 31 serials) have no per-serial portrait crop
    // under /cards/hero/ -- every one of them is a numbered copy of the set's regular DUSTER
    // alt-art hero print, so resolve through this first instead of needing 186 distinct images.
    function heroPortraitRef(ref) {
        var p = ref.split('_');
        if (p[1] === 'DUSTERCB' && p.length > 6) {
            return 'ALT_DUSTER_A_' + (p[3] || '') + '_' + (p[4] || '') + '_' + (p[5] || '');
        }
        return ref;
    }

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
            var collapsible = btn.closest('.deck-filters').querySelector('.deck-filter-collapsible');
            var expanded = collapsible.classList.toggle('expanded');
            btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        });
    });

    // tab switching
    var pubLoaded = false;
    var contestRendered = false;
    document.querySelectorAll('.decks-list-tab').forEach(function (btn) {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.decks-list-tab').forEach(function (b) {
                b.classList.remove('active', 'is-active');
                b.setAttribute('aria-selected', 'false');
            });
            document.querySelectorAll('.decks-tab-pane').forEach(function (p) { p.style.display = 'none'; });
            btn.classList.add('active', 'is-active');
            btn.setAttribute('aria-selected', 'true');
            var pane = document.getElementById('tab-' + btn.dataset.tab);
            if (pane) pane.style.display = '';
            if (btn.dataset.tab === 'public' && !pubLoaded) {
                pubLoaded = true;
                loadPublicDecks(1);
            }
            if (btn.dataset.tab === 'contest' && !contestRendered && typeof initContestTabView === 'function') {
                contestRendered = true;
                initContestTabView();
            }
            syncDeckUrl(btn.dataset.tab);
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
    var myFaction     = '';
    var myHero        = '';
    var myFormat      = '';
    var myVisibility  = '';
    var mySortVal     = 'updatedAt:desc';
    var mySearchTimer = null;
    var myAllItems    = [];

    // ── URL filter sync (mirrors the cards page) ─────────────────────────
    // The active tab's filters are mirrored into the query string, and any
    // filters present in the URL on load are applied to the matching tab.
    var DEFAULT_DECK_SORT = 'updatedAt:desc';
    var DEFAULT_DECK_TAB  = myIsLoggedIn ? 'my' : (showPublic ? 'public' : 'my');
    var _deckUrlParams    = new URLSearchParams(location.search);
    var _urlSyncReady     = false;  // stays false during the initial restore so we don't rewrite the URL we just read

    var _wantTab   = _deckUrlParams.get('tab');
    var TARGET_TAB = (_wantTab === 'my' || _wantTab === 'public' || _wantTab === 'contest') ? _wantTab : DEFAULT_DECK_TAB;
    if (TARGET_TAB !== 'my' && !showPublic) TARGET_TAB = 'my';
    if (TARGET_TAB === 'my' && !myIsLoggedIn && showPublic) TARGET_TAB = 'public';

    function activeDeckTab() {
        var t = document.querySelector('.decks-list-tab.active');
        return t ? t.dataset.tab : DEFAULT_DECK_TAB;
    }

    function buildDeckQuery(tab) {
        var parts = [];
        // Always carry the tab when tabs exist, so the URL lands on the right
        // tab regardless of the visitor's per-login default.
        if (showPublic) parts.push('tab=' + encodeURIComponent(tab));
        if (tab === 'my') {
            if (myFormat)            parts.push('format='     + encodeURIComponent(myFormat));
            if (myFaction)           parts.push('faction='    + encodeURIComponent(myFaction));
            if (myHero)              parts.push('hero='        + encodeURIComponent(myHero));
            if (myVisibility !== '') parts.push('visibility=' + encodeURIComponent(myVisibility));
            if (mySortVal && mySortVal !== DEFAULT_DECK_SORT) parts.push('sort=' + encodeURIComponent(mySortVal));
            var mq = mySearch ? mySearch.value.trim() : '';
            if (mq) parts.push('q=' + encodeURIComponent(mq));
        } else if (tab === 'public') {
            if (pubFormat)  parts.push('format='  + encodeURIComponent(pubFormat));
            if (pubFaction) parts.push('faction=' + encodeURIComponent(pubFaction));
            if (pubHero)    parts.push('hero='    + encodeURIComponent(pubHero));
            if (pubSortVal && pubSortVal !== DEFAULT_DECK_SORT) parts.push('sort=' + encodeURIComponent(pubSortVal));
            var pq = pubSearch ? pubSearch.value.trim() : '';
            if (pq) parts.push('q=' + encodeURIComponent(pq));
        } else if (tab === 'contest') {
            if (contestSet && contestSet !== 'winners') parts.push('set=' + encodeURIComponent(contestSet));
            if (contestFaction) parts.push('faction=' + encodeURIComponent(contestFaction));
            if (contestHero)    parts.push('hero='    + encodeURIComponent(contestHero));
            var cq = contestSearch ? contestSearch.value.trim() : '';
            if (cq) parts.push('q=' + encodeURIComponent(cq));
        }
        return parts;
    }

    // Write the given tab's filters to the URL — but only once the initial
    // restore is done and only for the tab the user is actually looking at.
    function syncDeckUrl(tab) {
        if (!_urlSyncReady) return;
        if (tab !== activeDeckTab()) return;
        var parts = buildDeckQuery(tab);
        history.replaceState(null, '', location.pathname + (parts.length ? '?' + parts.join('&') : ''));
    }

    function applyMyUrlFilters(p) {
        var fmt = p.get('format');
        if (fmt) {
            var fb = document.querySelector('[data-my-format="' + fmt.replace(/[^a-z0-9_-]/gi, '') + '"]');
            if (fb) { document.querySelectorAll('[data-my-format]').forEach(function(b){ setChip(b, false); }); setChip(fb, true); myFormat = fb.dataset.myFormat; }
        }
        var fac = p.get('faction');
        if (fac) {
            var ab = document.querySelector('[data-my-faction="' + fac.replace(/[^a-z0-9_-]/gi, '') + '"]');
            if (ab) { document.querySelectorAll('[data-my-faction]').forEach(function(b){ setChip(b, false); }); setChip(ab, true); myFaction = ab.dataset.myFaction; }
        }
        var vis = p.get('visibility');
        if (vis === '0' || vis === '1') {
            var vb = document.querySelector('[data-my-visibility="' + vis + '"]');
            if (vb) { document.querySelectorAll('[data-my-visibility]').forEach(function(b){ setChip(b, false); }); setChip(vb, true); myVisibility = vis; }
        }
        var sort = p.get('sort');
        var mySortEl = document.getElementById('my-sort');
        if (sort && mySortEl && mySortEl.querySelector('option[value="' + sort.replace(/[^a-z0-9:]/gi, '') + '"]')) {
            mySortEl.value = sort; mySortVal = sort;
        }
        var hero = p.get('hero');
        if (hero) myHero = hero;            // applied to the <select> once heroes load
        var q = p.get('q');
        if (q && mySearch) mySearch.value = q;
    }

    function applyPubUrlFilters(p) {
        var fmt = p.get('format');
        if (fmt) {
            var fb = document.querySelector('[data-pub-format="' + fmt.replace(/[^a-z0-9_-]/gi, '') + '"]');
            if (fb) { document.querySelectorAll('[data-pub-format]').forEach(function(b){ setChip(b, false); }); setChip(fb, true); pubFormat = fb.dataset.pubFormat; }
        }
        var fac = p.get('faction');
        if (fac) {
            var ab = document.querySelector('[data-pub-faction="' + fac.replace(/[^a-z0-9_-]/gi, '') + '"]');
            if (ab) { document.querySelectorAll('[data-pub-faction]').forEach(function(b){ setChip(b, false); }); setChip(ab, true); pubFaction = ab.dataset.pubFaction; }
        }
        var sort = p.get('sort');
        var pubSortEl = document.getElementById('pub-sort');
        if (sort && pubSortEl && pubSortEl.querySelector('option[value="' + sort.replace(/[^a-z0-9:]/gi, '') + '"]')) {
            pubSortEl.value = sort; pubSortVal = sort;
        }
        var hero = p.get('hero');
        if (hero) pubHero = hero;
        var q = p.get('q');
        if (q && pubSearch) pubSearch.value = q;
    }

    function applyContestUrlFilters(p) {
        var set = p.get('set');
        if (set === 'collection' || set === 'winners') {
            var sb = document.querySelector('[data-contest-set="' + set + '"]');
            if (sb) { document.querySelectorAll('[data-contest-set]').forEach(function(b){ setChip(b, false); }); setChip(sb, true); contestSet = set; }
        }
        var fac = p.get('faction');
        if (fac) {
            var ab = document.querySelector('[data-contest-faction="' + fac.replace(/[^a-z0-9_-]/gi, '') + '"]');
            if (ab) { document.querySelectorAll('[data-contest-faction]').forEach(function(b){ setChip(b, false); }); setChip(ab, true); contestFaction = ab.dataset.contestFaction; }
        }
        var hero = p.get('hero');
        if (hero) contestHero = hero;       // applied during refreshContestHeroSelect()
        var q = p.get('q');
        if (q && contestSearch) contestSearch.value = q;
    }

    function escHtml(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    // Filter chips: .active (read by the code below) + aria-pressed (drawn by .ac-chip).
    function setChip(b, on) {
        b.classList.toggle('active', !!on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    function apiErrorHtml(msg) {
        return ICONS.alert
             + '<p class="ac-empty__title">' + escHtml(msg) + '</p>'
             + '<p>' + escHtml(txt.api_later) + '</p>';
    }

    function buildMyDeckEditHtml(deckId) {
        var theme    = localStorage.getItem('acTheme') === 'dark' ? 'dark' : 'light';
        var editHref = myShowEditBtn
            ? baseUrl + '/pages/deckbuilder?id=' + encodeURIComponent(deckId) + '&theme=' + theme
            : myEditDeckUrl.replace('{deck_id}', encodeURIComponent(deckId)) + (myEditDeckUrl.indexOf('?') >= 0 ? '&' : '?') + 'theme=' + theme;
        var showEdit    = myShowEditBtn || myEditDeckUrl !== '';
        var useDropdown = myDeckBuilders.length > 0;

        if (!showEdit && !useDropdown) return '';

        var btnClass = 'ac-button ac-button--secondary ac-button--sm';
        if (showEdit && !useDropdown) {
            return '<a href="' + escHtml(editHref) + '" class="' + btnClass + '">'
                + ICONS.pencil + escHtml(txt.edit_btn) + '</a>';
        }
        var items = '';
        if (showEdit) {
            items += '<li><a class="dropdown-item" href="' + escHtml(editHref) + '">'
                + (mySiteLogo
                    ? '<img src="' + escHtml(mySiteLogo) + '" alt="" class="deck-img-16">'
                    : ICONS.pencil)
                + escHtml(mySiteName) + '</a></li><li><hr class="dropdown-divider"></li>';
        }
        myDeckBuilders.forEach(function(cb) {
            var cbHref = cb.deckbuilder_url.replace('{deck_id}', deckId) + (cb.deckbuilder_url.indexOf('?') >= 0 ? '&' : '?') + 'theme=' + theme;
            items += '<li><a class="dropdown-item" href="' + escHtml(cbHref) + '" target="_blank" rel="noopener">'
                + (cb.logo
                    ? '<img src="' + escHtml(cb.logo) + '" alt="" class="deck-img-16">'
                    : ICONS.external)
                + escHtml(cb.title) + '</a></li>';
        });
        return '<div class="dropdown"><button type="button" class="' + btnClass + ' dropdown-toggle" data-bs-toggle="dropdown">'
            + ICONS.pencil + escHtml(txt.edit_btn)
            + '</button><ul class="dropdown-menu dropdown-menu-start">' + items + '</ul></div>';
    }

    // Everything a deck tile shows that the "my" and "public" renderers share.
    function _deckData(deck) {
        var fmt      = (deck.format || 'standard').toLowerCase();
        var fmtData  = formats[fmt] || {};
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
        var formatErrors   = Array.isArray(deck.formatErrors) ? deck.formatErrors : [];
        var legalityDetail = (deck.legalityDetail && typeof deck.legalityDetail === 'object') ? deck.legalityDetail : {};
        var legal          = deck.hasOwnProperty('legal') ? deck.legal : null;
        var fmtLabel       = fmtData.label || fmt;
        var factionCode = '';
        var fm = heroRef.match(/^ALT_[^_]+_[^_]+_([A-Z]{2})_/);
        if (fm) factionCode = fm[1];
        var factionData = factions[factionCode] || {};
        return {
            fmtLabel:     fmtLabel,
            fmtColor:     fmtData.color || 'var(--ac-color-text-muted)',
            heroName:     heroName,
            totalCards:   stats.totalCards != null ? stats.totalCards : null,
            byRarity:     stats.byRarity || {},
            desc:         deck.description || '',
            factionCode:  factionCode,
            factionColor: factionData.color || 'var(--ac-color-overlay-control)',
            factionImg:   factionCode ? pluginAssetsUrl + '/faction/' + factionCode + '.png' : '',
            heroImgUrl:   heroRef ? cdnUrl + '/cards/hero/' + heroPortraitRef(heroRef) + '_1.webp' : '',
            legalityHtml: _deckLegalityHtml(legal, _deckHasErrors(formatErrors, legalityDetail), formatErrors, legalityDetail, fmtLabel)
        };
    }

    // Artwork band + the link that makes the whole tile clickable.
    function _deckTileTop(deckId, name, d) {
        var art = d.heroImgUrl
            ? '<div class="deck-tile__art" style="background-image:url(' + escHtml(d.heroImgUrl) + ')">'
            : '<div class="deck-tile__art deck-tile__art--empty">';
        return '<a href="' + escHtml(baseUrl) + '/pages/deck?id=' + encodeURIComponent(deckId) + '" class="deck-tile__link deck-card-link-overlay" aria-label="' + escHtml(name) + '"></a>'
            + art
            + (d.factionImg ? '<img class="deck-tile__faction" src="' + escHtml(d.factionImg) + '" alt="' + escHtml(d.factionCode) + '">' : '')
            + '</div>';
    }

    function _deckFormatBadge(d) {
        return '<span class="ac-badge"><span class="deck-dot" style="--deck-dot:' + escHtml(d.fmtColor) + '"></span>' + escHtml(d.fmtLabel) + '</span>';
    }

    function _deckVisibilityBadge(isPublic) {
        return isPublic
            ? '<span class="ac-badge ac-badge--blue deck-tile__visibility">' + ICONS.globe + escHtml(txt.public) + '</span>'
            : '<span class="ac-badge deck-tile__visibility">' + ICONS.lock + escHtml(txt.private) + '</span>';
    }

    function _deckCountsHtml(d) {
        var html = '<span class="deck-tile__counts">';
        if (d.totalCards !== null) html += '<span class="deck-tile__total">' + d.totalCards + ' ' + escHtml(txt.cards) + '</span>';
        ['C','R','E','U'].forEach(function(r) {
            var qty = d.byRarity[r] || 0;
            if (qty > 0) html += '<span class="deck-tile__gem">'
                + '<img src="' + pluginAssetsUrl + '/gems/' + r + '.png" alt="' + r + '">' + qty + '</span>';
        });
        return html + '</span>';
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
            return '<span class="ac-badge ac-badge--green">' + ICONS.check + escHtml(txt.legal) + '</span>';
        if (legal === false && hasActualErrors)
            return '<button type="button" class="ac-badge ac-badge--red js-deck-illegal"'
                + ' data-errors="' + escHtml(JSON.stringify(formatErrors)) + '"'
                + ' data-legality="' + escHtml(JSON.stringify(legalityDetail)) + '"'
                + ' data-format="' + escHtml(fmtLabel) + '">'
                + ICONS.alert + escHtml(txt.illegal) + '</button>';
        return '';
    }

    function renderMyDeck(deck) {
        var deckId   = deck.id || '';
        var name     = deck.name || txt.unnamed;
        var fmt      = (deck.format || 'standard').toLowerCase();
        var isPublic = !!deck.isPublic;
        var isDraft  = !deck.hasOwnProperty('isDraft') || !!deck.isDraft;
        var d        = _deckData(deck);

        var deleteHtml = myShowDeleteBtn
            ? '<button type="button" class="ac-icon-button ac-icon-button--sm js-my-delete" data-id="' + escHtml(deckId) + '" aria-label="' + escHtml(txt.delete_btn) + '">'
              + ICONS.trash + '</button>'
            : '';

        // Edit / delete stay in the markup (JS hooks) but hidden, as before: the tile opens the deck page.
        return '<article class="my-deck-item ac-card ac-card--interactive deck-tile" data-format="' + escHtml(fmt) + '" data-public="' + (isPublic ? '1' : '0') + '" data-faction="' + escHtml(d.factionCode) + '" data-deck-id="' + escHtml(deckId) + '"'
            + ' style="--deck-faction:' + escHtml(d.factionColor) + '">'
            + _deckTileTop(deckId, name, d)
            + '<div class="deck-tile__body">'
            + '<div class="deck-tile__badges">'
            + _deckFormatBadge(d)
            + (isDraft ? '<span class="ac-badge ac-badge--orange">' + escHtml(txt.draft) + '</span>' : '')
            + d.legalityHtml
            + _deckVisibilityBadge(isPublic)
            + '</div>'
            + '<h3 class="deck-tile__title">' + escHtml(name) + '</h3>'
            + (d.heroName ? '<p class="deck-tile__hero">' + escHtml(d.heroName) + '</p>' : '')
            + '<div class="deck-tile__footer">'
            + _deckCountsHtml(d)
            + '<div class="deck-tile__actions" hidden>' + buildMyDeckEditHtml(deckId) + deleteHtml + '</div>'
            + '</div>'
            + '</div></article>';
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

    // Pagination: ac-pagination (links, current page as aria-current) + a jump field past 5 pages.
    function renderPaginationUI(container, currentPage, totalPages, loaderFn) {
        container.innerHTML = '';
        if (totalPages <= 1) { container.style.setProperty('display', 'none', 'important'); return; }
        container.style.removeProperty('display');

        var list = document.createElement('ul');
        list.className = 'ac-pagination';

        function addItem(el) {
            var li = document.createElement('li');
            li.appendChild(el);
            list.appendChild(li);
        }
        function pageLink(n, html, label) {
            var a = document.createElement('a');
            a.href = '#';
            a.setAttribute('role', 'button');
            a.innerHTML = html;
            if (label) a.setAttribute('aria-label', label);
            a.addEventListener('click', function(e) { e.preventDefault(); loaderFn(n, true); });
            return a;
        }

        if (currentPage > 1) addItem(pageLink(currentPage - 1, ICONS.prev + '<span class="ac-sr-only">' + escHtml(txt.prev) + '</span>', txt.prev));

        var pgNums = [];
        for (var pi = 1; pi <= totalPages; pi++) {
            if (pi === 1 || pi === totalPages || (pi >= currentPage - 2 && pi <= currentPage + 2)) {
                pgNums.push(pi);
            }
        }
        var lastPg = 0;
        for (var pj = 0; pj < pgNums.length; pj++) {
            if (lastPg && pgNums[pj] > lastPg + 1) {
                var dots = document.createElement('span');
                dots.setAttribute('aria-hidden', 'true');
                dots.textContent = '…';
                addItem(dots);
            }
            if (pgNums[pj] === currentPage) {
                var cur = document.createElement('span');
                cur.setAttribute('aria-current', 'page');
                cur.textContent = pgNums[pj];
                addItem(cur);
            } else {
                addItem(pageLink(pgNums[pj], String(pgNums[pj])));
            }
            lastPg = pgNums[pj];
        }

        if (currentPage < totalPages) addItem(pageLink(currentPage + 1, '<span class="ac-sr-only">' + escHtml(txt.next) + '</span>' + ICONS.next, txt.next));

        container.appendChild(list);

        if (totalPages > 5) {
            var jump = document.createElement('div');
            jump.className = 'deck-page-jump';

            var inp = document.createElement('input');
            inp.type = 'number'; inp.min = '1'; inp.max = String(totalPages);
            inp.placeholder = String(currentPage);
            inp.className = 'ac-input';
            inp.setAttribute('aria-label', txt.pagination_label);
            jump.appendChild(inp);

            var go = document.createElement('button');
            go.type = 'button'; go.className = 'ac-button ac-button--secondary ac-button--sm';
            go.textContent = txt.page_go;
            (function(input, total) {
                go.onclick = function() {
                    var v = parseInt(input.value, 10);
                    if (v >= 1 && v <= total) loaderFn(v, true);
                };
                input.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter') go.onclick();
                });
            })(inp, totalPages);
            jump.appendChild(go);
            container.appendChild(jump);
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
        if (myFaction)    fetchUrl += '&faction='  + encodeURIComponent(myFaction);
        if (myHero)       fetchUrl += '&hero='     + encodeURIComponent(myHero);
        var q = mySearch ? mySearch.value.trim() : '';
        // name search is client-side only (API has no text search param)

        syncDeckUrl('my');

        fetch(fetchUrl)
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (apiDebug) console.log('[decks] my decks API response:', data);
                myLoading.style.display = 'none';
                if (data.error) { myError.innerHTML = apiErrorHtml(data.error); myError.style.display = ''; return; }
                var decks = data.member || data.data || (Array.isArray(data) ? data : []);
                // Client-side name search filter
                if (q) decks = decks.filter(function(d) { return (d.name || '').toLowerCase().indexOf(q.toLowerCase()) >= 0; });
                if (!decks.length) { myEmpty.style.display = ''; return; }
                decks.forEach(function(deck) { myGrid.insertAdjacentHTML('beforeend', renderMyDeck(deck)); });
                myAllItems = Array.from(myGrid.querySelectorAll('.my-deck-item'));
                filterMyDecks();
                var pagination = data.pagination || {};
                var total  = pagination.totalItems ? Math.ceil(pagination.totalItems / 24) : (data.totalItems ? Math.ceil(data.totalItems / 24) : 1);
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
        e.stopPropagation();
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
            if (myFormat === v) { myFormat = ''; setChip(btn, false); }
            else { document.querySelectorAll('[data-my-format]').forEach(function(b) { setChip(b, false); }); myFormat = v; setChip(btn, true); }
            loadMyDecks(1);
        });
    });

    document.querySelectorAll('[data-my-faction]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var v = btn.dataset.myFaction;
            if (myFaction === v) { myFaction = ''; setChip(btn, false); }
            else { document.querySelectorAll('[data-my-faction]').forEach(function(b) { setChip(b, false); }); myFaction = v; setChip(btn, true); }
            myHero = '';
            if (myHeroSelect) {
                myHeroSelect.value = '';
                loadHeroes(function(h) { populateHeroSelect(myHeroSelect, h, myFaction, txt.hero_all); });
            }
            loadMyDecks(1);
        });
    });

    document.querySelectorAll('[data-my-visibility]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var v = btn.dataset.myVisibility;
            if (myVisibility === v) { myVisibility = ''; setChip(btn, false); }
            else { document.querySelectorAll('[data-my-visibility]').forEach(function(b) { setChip(b, false); }); myVisibility = v; setChip(btn, true); }
            loadMyDecks(1);
        });
    });

    var mySort = document.getElementById('my-sort');
    if (mySort) {
        mySort.addEventListener('change', function() { mySortVal = mySort.value; loadMyDecks(1); });
    }

    // Apply My Decks filters (format, faction, hero, visibility, sort, search)
    // from the URL when the My tab is the one being opened.
    if (TARGET_TAB === 'my') applyMyUrlFilters(_deckUrlParams);

    if (myIsLoggedIn && myGrid) {
        loadMyDecks(1);
    }

    if (!showPublic) { _urlSyncReady = true; return; }

    // public Decks
    var pubSearch     = document.getElementById('pub-deck-search');
    var pubLoading    = document.getElementById('pub-loading');
    var pubError      = document.getElementById('pub-error');
    var pubEmpty      = document.getElementById('pub-empty');
    var pubNoMatch    = document.getElementById('pub-no-match');
    var pubGrid       = document.getElementById('pub-grid');
    var pubPagination = document.getElementById('pub-pagination');
    var pubFaction    = '';
    var pubHero       = '';
    var pubFormat     = '';
    var pubSortVal    = 'updatedAt:desc';

    var myHeroSelect  = document.getElementById('my-hero');
    var pubHeroSelect = document.getElementById('pub-hero');

    function populateHeroSelect(sel, heroes, activeFaction, heroAllLabel) {
        var current = sel.value;
        while (sel.lastElementChild) sel.removeChild(sel.lastElementChild);
        var allOpt = document.createElement('option');
        allOpt.value = '';
        allOpt.textContent = heroAllLabel;
        sel.appendChild(allOpt);
        var groups = {};
        heroes.forEach(function(h) {
            var m = h.reference.match(/^ALT_[^_]+_[^_]+_([A-Z]{2})_/);
            var fc = m ? m[1] : '';
            if (activeFaction && fc !== activeFaction) return;
            if (!groups[fc]) groups[fc] = [];
            groups[fc].push(h);
        });
        Object.keys(groups).sort().forEach(function(fc) {
            var grp = document.createElement('optgroup');
            grp.label = (factions[fc] && factions[fc].name) ? factions[fc].name : fc;
            // Faction dot in the design-system listbox (design-system/docs/components/listbox.md).
            var fid = { AX: 'axiom', BR: 'bravos', LY: 'lyra', MU: 'muna', OR: 'ordis', YZ: 'yzmir' }[fc];
            if (fid) grp.dataset.faction = fid;
            groups[fc].forEach(function(h) {
                var opt = document.createElement('option');
                opt.value = h.reference;
                opt.textContent = h.name;
                if (h.reference === current) opt.selected = true;
                grp.appendChild(opt);
            });
            sel.appendChild(grp);
        });
    }

    var heroesCache = null;
    function loadHeroes(cb) {
        if (heroesCache) { cb(heroesCache); return; }
        fetch(baseUrl + '/pages/decks?ajax=heroes')
            .then(function(r) { return r.json(); })
            .then(function(data) {
                heroesCache = Array.isArray(data) ? data : [];
                cb(heroesCache);
            })
            .catch(function() { cb([]); });
    }

    loadHeroes(function(heroes) {
        var label = txt.hero_all;
        if (myHeroSelect) { populateHeroSelect(myHeroSelect,  heroes, myFaction,  label); if (myHero) myHeroSelect.value = myHero; }
        if (pubHeroSelect) { populateHeroSelect(pubHeroSelect, heroes, pubFaction, label); if (pubHero) pubHeroSelect.value = pubHero; }
    });

    if (myHeroSelect) {
        myHeroSelect.addEventListener('change', function() {
            myHero = myHeroSelect.value;
            loadMyDecks(1);
        });
    }
    if (pubHeroSelect) {
        pubHeroSelect.addEventListener('change', function() {
            pubHero = pubHeroSelect.value;
            loadPublicDecks(1);
        });
    }

    function renderPublicDeck(deck) {
        var deckId   = deck.id || '';
        var name     = deck.name || txt.unnamed;
        var fmt      = (deck.format || 'standard').toLowerCase();
        var isPublic = deck.isPublic;
        var isDraft  = !deck.hasOwnProperty('isDraft') || deck.isDraft;
        var d        = _deckData(deck);

        var viewCount   = deck.viewCount   != null ? parseInt(deck.viewCount,   10) : null;
        var upvoteCount = deck.upvoteCount != null ? parseInt(deck.upvoteCount, 10) : 0;
        var hasUpvoted  = !!deck.hasUpvoted;
        var statsHtml = '';
        if (viewCount !== null || isPublic !== false) {
            statsHtml = '<span class="deck-tile__stats">';
            if (viewCount !== null) {
                statsHtml += '<span class="ac-badge" title="' + escHtml(txt.views_label) + '">'
                    + ICONS.eye + '<span>' + viewCount + '</span>'
                    + '<span class="ac-sr-only">' + escHtml(txt.views_label) + '</span></span>';
            }
            if (isPublic !== false) {
                statsHtml += '<button type="button" class="ac-chip deck-upvote pub-deck-upvote'
                    + (hasUpvoted ? ' deck-stat-pill--upvoted' : '') + '"'
                    + ' aria-pressed="' + (hasUpvoted ? 'true' : 'false') + '"'
                    + ' aria-label="' + escHtml(txt.upvote_label) + '"'
                    + ' data-deck-id="' + escHtml(deckId) + '"'
                    + ' data-upvoted="' + (hasUpvoted ? '1' : '0') + '">'
                    + ICONS.heart
                    + '<span class="js-upvote-count">' + upvoteCount + '</span></button>';
            }
            statsHtml += '</span>';
        }

        return '<article class="pub-deck-item ac-card ac-card--interactive deck-tile"'
            + ' data-name="' + escHtml(name.toLowerCase()) + '"'
            + ' data-format="' + escHtml(fmt) + '"'
            + ' data-faction="' + escHtml(d.factionCode) + '"'
            + ' data-public="' + (isPublic ? '1' : '0') + '"'
            + ' data-deck-id="' + escHtml(deckId) + '"'
            + ' style="--deck-faction:' + escHtml(d.factionColor) + '">'
            + _deckTileTop(deckId, name, d)
            + '<div class="deck-tile__body">'
            + '<div class="deck-tile__badges">'
            + _deckFormatBadge(d)
            + (isDraft ? '<span class="ac-badge ac-badge--orange">' + escHtml(txt.draft) + '</span>' : '')
            + d.legalityHtml
            + _deckVisibilityBadge(isPublic)
            + '</div>'
            + '<h3 class="deck-tile__title">' + escHtml(name) + '</h3>'
            + (d.heroName ? '<p class="deck-tile__hero">' + escHtml(d.heroName) + '</p>' : '')
            + '<div class="deck-tile__footer">'
            + _deckCountsHtml(d)
            + statsHtml
            + '</div>'
            + '</div></article>';
    }

    if (pubGrid) {
        pubGrid.addEventListener('click', function(e) {
            var upvoteBtn = e.target.closest('.pub-deck-upvote');
            if (upvoteBtn) {
                e.preventDefault();
                e.stopPropagation();
                if (!myIsLoggedIn) {
                    location.href = baseUrl + '/pages/login?redirect=' + encodeURIComponent(location.pathname + location.search);
                    return;
                }
                if (upvoteBtn.disabled) return;
                upvoteBtn.disabled = true;
                var fd = new FormData();
                fd.append('csrf_token', myCSRF);
                fd.append('deck_id', upvoteBtn.dataset.deckId || '');
                fetch(baseUrl + '/pages/decks?ajax=upvote', { method: 'POST', body: fd, credentials: 'same-origin' })
                    .then(function (r) { return r.json(); })
                    .then(function (data) {
                        if (!data.ok) return;
                        upvoteBtn.dataset.upvoted = data.hasUpvoted ? '1' : '0';
                        upvoteBtn.classList.toggle('deck-stat-pill--upvoted', !!data.hasUpvoted);
                        upvoteBtn.setAttribute('aria-pressed', data.hasUpvoted ? 'true' : 'false');
                        var countEl = upvoteBtn.querySelector('.js-upvote-count');
                        if (countEl) countEl.textContent = data.upvoteCount;
                    })
                    .finally(function () { upvoteBtn.disabled = false; });
                return;
            }
            if (e.target.closest('a, button, .dropdown')) return;
            var card = e.target.closest('.pub-deck-item');
            if (card && card.dataset.deckId) {
                location.href = baseUrl + '/pages/deck?id=' + encodeURIComponent(card.dataset.deckId);
            }
        }, true);
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
        if (pubFormat)  fetchUrl += '&format='  + encodeURIComponent(pubFormat);
        if (pubFaction) fetchUrl += '&faction=' + encodeURIComponent(pubFaction);
        if (pubHero)    fetchUrl += '&hero='    + encodeURIComponent(pubHero);
        var pubQ = pubSearch ? pubSearch.value.trim() : '';
        if (pubQ) fetchUrl += '&q=' + encodeURIComponent(pubQ);
        syncDeckUrl('public');
        fetch(fetchUrl)
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (apiDebug) console.log('[decks] public decks API response:', data);
                pubLoading.style.display = 'none';
                if (data.error) { pubError.innerHTML = apiErrorHtml(data.error); pubError.style.display = ''; return; }
                var decks = data.member || data.data || (Array.isArray(data) ? data : []);
                if (!decks.length) {
                    if (pubQ || pubFormat || pubFaction || pubHero) pubNoMatch.style.display = '';
                    else pubEmpty.style.display = '';
                    return;
                }
                decks.forEach(function (deck) { pubGrid.insertAdjacentHTML('beforeend', renderPublicDeck(deck)); });
                var total = data.lastPage || (data.totalItems ? Math.ceil(data.totalItems / 24) : 1);
                renderPagination(p, total);
                if (scroll) pubGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
            })
            .catch(function () {
                pubLoading.style.display = 'none';
                pubError.innerHTML = apiErrorHtml(txt.err_connect);
                pubError.style.display = '';
            });
    }

    var pubSearchTimer;
    if (pubSearch) {
        pubSearch.addEventListener('input', function () {
            clearTimeout(pubSearchTimer);
            pubSearchTimer = setTimeout(function () { loadPublicDecks(1); }, 350);
        });
    }

    document.querySelectorAll('[data-pub-format]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var v = btn.dataset.pubFormat;
            if (pubFormat === v) { pubFormat = ''; setChip(btn, false); }
            else { document.querySelectorAll('[data-pub-format]').forEach(function (b) { setChip(b, false); }); pubFormat = v; setChip(btn, true); }
            loadPublicDecks(1);
        });
    });

    document.querySelectorAll('[data-pub-faction]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var v = btn.dataset.pubFaction;
            if (pubFaction === v) { pubFaction = ''; setChip(btn, false); }
            else { document.querySelectorAll('[data-pub-faction]').forEach(function(b) { setChip(b, false); }); pubFaction = v; setChip(btn, true); }
            pubHero = '';
            if (pubHeroSelect) {
                pubHeroSelect.value = '';
                loadHeroes(function(h) { populateHeroSelect(pubHeroSelect, h, pubFaction, txt.hero_all); });
            }
            loadPublicDecks(1);
        });
    });

    var pubSort = document.getElementById('pub-sort');
    if (pubSort) {
        pubSort.addEventListener('change', function() { pubSortVal = pubSort.value; loadPublicDecks(1); });
    }

    // (Initial public/contest tab activation happens in the URL-restore block
    //  at the end of this IIFE, once every tab's handlers are wired up.)

    var contestGrid       = document.getElementById('contest-grid');
    var contestSearch     = document.getElementById('contest-deck-search');
    var contestHeroSelect = document.getElementById('contest-hero');
    var contestSet     = 'winners';
    var contestFaction = '';
    var contestHero    = '';

    function contestHeroesFromDecks(decks, activeFaction) {
        var seen = {};
        var out  = [];
        (decks || []).forEach(function (deck) {
            var hero = deck.stats && deck.stats.hero;
            if (!hero || !hero.reference) return;
            var ref = hero.reference;
            var m = ref.match(/^ALT_[^_]+_[^_]+_([A-Z]{2})_/);
            var fc = m ? m[1] : '';
            if (activeFaction && fc !== activeFaction) return;
            if (seen[ref]) return;
            seen[ref] = true;
            out.push({ reference: ref, name: hero.name || ref });
        });
        out.sort(function (a, b) {
            return String(a.name || a.reference).localeCompare(String(b.name || b.reference), undefined, { sensitivity: 'base' });
        });
        return out;
    }

    function refreshContestHeroSelect() {
        if (!contestHeroSelect) return;
        var heroes = contestHeroesFromDecks(contestDecksForSet(), contestFaction);
        populateHeroSelect(contestHeroSelect, heroes, '', txt.hero_all);
        var stillValid = contestHero && heroes.some(function (h) { return h.reference === contestHero; });
        if (!stillValid) {
            contestHero = '';
            contestHeroSelect.value = '';
        } else {
            contestHeroSelect.value = contestHero;
        }
    }

    function contestDecksForSet() {
        if (contestSet === 'winners') {
            return contestDecksAll.filter(function (d) { return d.winner; });
        }
        return contestDecksAll.slice();
    }

    function filterContestDecks(decks) {
        var q = contestSearch ? contestSearch.value.trim().toLowerCase() : '';
        return decks.filter(function (deck) {
            var name = (deck.name || '').toLowerCase();
            var heroRef = (deck.stats && deck.stats.hero && deck.stats.hero.reference) ? deck.stats.hero.reference : '';
            var factionCode = '';
            var m = heroRef.match(/^ALT_[^_]+_[^_]+_([A-Z]{2})_/);
            if (m) factionCode = m[1];
            if (q && name.indexOf(q) < 0) return false;
            if (contestFaction && factionCode !== contestFaction) return false;
            if (contestHero && heroRef !== contestHero) return false;
            return true;
        });
    }

    function renderContestDecks() {
        if (!contestGrid) return;
        contestGrid.innerHTML = '';
        var decks = filterContestDecks(contestDecksForSet());
        decks.forEach(function (deck) {
            contestGrid.insertAdjacentHTML('beforeend', renderPublicDeck(deck));
        });
    }

    function initContestTabView() {
        refreshContestHeroSelect();
        renderContestDecks();
    }

    if (contestGrid) {
        contestGrid.addEventListener('click', function(e) {
            if (e.target.closest('a, button, .dropdown')) return;
            var card = e.target.closest('.pub-deck-item');
            if (card && card.dataset.deckId) {
                location.href = baseUrl + '/pages/deck?id=' + encodeURIComponent(card.dataset.deckId);
            }
        });
    }

    if (contestSearch) {
        contestSearch.addEventListener('input', function () {
            renderContestDecks();
            syncDeckUrl('contest');
        });
    }

    document.querySelectorAll('[data-contest-set]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var set = btn.dataset.contestSet || 'collection';
            if (contestSet === set) return;
            contestSet = set;
            document.querySelectorAll('[data-contest-set]').forEach(function (b) { setChip(b, false); });
            setChip(btn, true);
            refreshContestHeroSelect();
            renderContestDecks();
            syncDeckUrl('contest');
        });
    });

    document.querySelectorAll('[data-contest-faction]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var v = btn.dataset.contestFaction;
            if (contestFaction === v) { contestFaction = ''; setChip(btn, false); }
            else {
                document.querySelectorAll('[data-contest-faction]').forEach(function (b) { setChip(b, false); });
                contestFaction = v;
                setChip(btn, true);
            }
            contestHero = '';
            if (contestHeroSelect) {
                contestHeroSelect.value = '';
            }
            refreshContestHeroSelect();
            renderContestDecks();
            syncDeckUrl('contest');
        });
    });

    if (contestHeroSelect) {
        contestHeroSelect.addEventListener('change', function () {
            contestHero = contestHeroSelect.value;
            renderContestDecks();
            syncDeckUrl('contest');
        });
    }

    // ── Restore tab + filters from the URL, then enable URL writing ──────
    // (The My tab, if it's the target, was already filtered & loaded above.)
    if (TARGET_TAB === 'public') {
        applyPubUrlFilters(_deckUrlParams);
        var _pubTabBtn = document.querySelector('.decks-list-tab[data-tab="public"]');
        if (_pubTabBtn) _pubTabBtn.click();
        else { pubLoaded = true; loadPublicDecks(1); }
    } else if (TARGET_TAB === 'contest') {
        applyContestUrlFilters(_deckUrlParams);
        var _contestTabBtn = document.querySelector('.decks-list-tab[data-tab="contest"]');
        if (_contestTabBtn) _contestTabBtn.click();
    }
    _urlSyncReady = true;
    // Reflect the active tab in the URL immediately, even on a bare landing.
    syncDeckUrl(activeDeckTab());

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

    var ICONS = <?= json_encode([
        'drive'   => ac_icon('hard-drive'),
        'upload'  => ac_icon('cloud-upload'),
        'spinner' => ac_icon('loader-circle', 'ac-icon--spin'),
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
        '<div class="ac-notice" role="status">' + ICONS.drive
        + '<div><div class="deck-local__row">'
        + '<span><strong>' + escHtml(name) + '</strong> — '
        + total + ' ' + escHtml(txt.cards) + ' — '
        + escHtml(txt.local_deck_found) + '</span>'
        + '<div class="deck-local__actions">'
        + '<button type="button" id="local-discard-btn" class="ac-button ac-button--secondary ac-button--sm">' + escHtml(txt.local_discard_btn) + '</button>'
        + '<button type="button" id="local-save-btn" class="ac-button ac-button--sm">'
        + ICONS.upload + escHtml(txt.local_save_btn)
        + '</button>'
        + '</div>'
        + '</div>'
        + '<p id="local-import-msg" class="deck-local__msg" style="display:none"></p>'
        + '</div></div>';
    zone.style.display = '';

    var saveBtnHtml = ICONS.upload + escHtml(txt.local_save_btn);

    document.getElementById('local-discard-btn').addEventListener('click', function () {
        if (!confirm(txt.local_discard_confirm)) return;
        localStorage.removeItem(GUEST_DECK_KEY);
        zone.style.display = 'none';
    });

    document.getElementById('local-save-btn').addEventListener('click', function () {
        var btn   = this;
        var msgEl = document.getElementById('local-import-msg');
        btn.disabled = true;
        btn.innerHTML = ICONS.spinner + '…';
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
                    msgEl.style.display = '';
                }
            })
            .catch(function () {
                btn.disabled = false;
                btn.innerHTML = saveBtnHtml;
                msgEl.textContent = txt.err_connect;
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
    var pluginAssetsUrl = <?= json_encode($pluginAssetsUrl) ?>;
    var formats  = <?= json_encode(array_map(fn($d) => ['label' => $d[$uiLang] ?? $d['en'] ?? '', 'color' => $d['color'] ?? 'var(--ac-color-text-muted)'], $formatsData)) ?>;
    var factions = <?= json_encode(array_map(fn($c) => ['color' => $c], $_factionColorVars)) ?>;
    var ICONS    = <?= json_encode(['drive' => ac_icon('hard-drive'), 'trash' => ac_icon('trash-2'), 'pencil' => ac_icon('pencil')]) ?>;
    var uiLang   = <?= json_encode($uiLang) ?>;

    // The Collector Booster's individually-serialized hero prints (ALT_DUSTERCB_P_<FACTION>_
    // <NUM>_<RARITY>_<001-030|XXX>, 6 heroes x 31 serials) have no per-serial portrait crop
    // under /cards/hero/ -- every one of them is a numbered copy of the set's regular DUSTER
    // alt-art hero print, so resolve through this first instead of needing 186 distinct images.
    function heroPortraitRef(ref) {
        var p = ref.split('_');
        if (p[1] === 'DUSTERCB' && p.length > 6) {
            return 'ALT_DUSTER_A_' + (p[3] || '') + '_' + (p[4] || '') + '_' + (p[5] || '');
        }
        return ref;
    }
    var txtGuest = <?= json_encode([
        'unnamed'        => $txt['unnamed'],
        'cards'          => $txt['cards'],
        'local'          => $txt['guest_local'],
        'edit'           => $txt['guest_edit_btn'],
        'delete_confirm' => $txt['guest_delete_confirm'],
        'no_deck'        => $txt['guest_no_deck'],
        'delete_label'   => $txt['delete_btn'],
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
        var fmtColor = fmtData.color || 'var(--ac-color-text-muted)';

        var hero        = raw.hero || null;
        var heroRef     = hero ? (hero.cardReference || '') : '';
        var heroName    = hero ? (typeof hero.name === 'object' ? (hero.name[uiLang] || hero.name.en || '') : (hero.name || '')) : '';
        var factionCode = hero ? (hero.factionCode || '') : '';
        var factionData = factions[factionCode] || {};
        var factionColor = factionData.color || 'var(--ac-color-overlay-control)';
        var factionImg  = factionCode ? pluginAssetsUrl + '/faction/' + factionCode + '.png' : '';
        var heroImgUrl  = heroRef ? cdnUrl + '/cards/hero/' + heroPortraitRef(heroRef) + '_1.webp' : '';

        var art = heroImgUrl
            ? '<div class="deck-tile__art" style="background-image:url(' + escHtml(heroImgUrl) + ')">'
            : '<div class="deck-tile__art deck-tile__art--empty">';

        grid.innerHTML = '<article class="ac-card deck-tile" style="--deck-faction:' + escHtml(factionColor) + '">'
            + art
            + (factionImg ? '<img class="deck-tile__faction" src="' + escHtml(factionImg) + '" alt="' + escHtml(factionCode) + '">' : '')
            + '</div>'
            + '<div class="deck-tile__body">'
            + '<div class="deck-tile__badges">'
            + '<span class="ac-badge"><span class="deck-dot" style="--deck-dot:' + escHtml(fmtColor) + '"></span>' + escHtml(fmtLabel) + '</span>'
            + '<span class="ac-badge ac-badge--orange deck-tile__visibility">' + ICONS.drive + escHtml(txtGuest.local) + '</span>'
            + '</div>'
            + '<h3 class="deck-tile__title">' + escHtml(name) + '</h3>'
            + (heroName ? '<p class="deck-tile__hero">' + escHtml(heroName) + '</p>' : '')
            + '<div class="deck-tile__footer">'
            + '<span class="deck-tile__counts"><span class="deck-tile__total">' + total + ' ' + escHtml(txtGuest.cards) + '</span></span>'
            + '<span class="deck-tile__actions">'
            + '<button type="button" onclick="guestDeckDelete()" class="ac-icon-button ac-icon-button--sm" aria-label="' + escHtml(txtGuest.delete_label) + '">' + ICONS.trash + '</button>'
            + '<a href="' + escHtml(baseUrl) + '/pages/deckbuilder" class="ac-button ac-button--sm">' + ICONS.pencil + escHtml(txtGuest.edit) + '</a>'
            + '</span>'
            + '</div>'
            + '</div></article>';

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
                    <?= ac_icon('users', 'text-primary me-2') ?><?= h($txt['community_modal_title']) ?>
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-3">
                <div class="row g-3">
                    <?php foreach ($communityBuilders as $cb): ?>
                    <div class="col-12 col-sm-6 col-md-4">
                        <div class="ac-card ac-card--flush h-100 d-flex flex-column">
                            <?php if (!empty($cb['image'])): ?>
                            <img class="ac-card__media" src="<?= h(assetUrl($cb['image'])) ?>" alt="<?= h($cb['title']) ?>">
                            <?php endif; ?>
                            <div class="ac-card__body d-flex flex-column flex-fill">
                                <h3 class="ac-card__title"><?= h($cb['title']) ?></h3>
                                <p class="ac-card__meta flex-fill">
                                    <?= h($cb['desc'][$uiLang] ?? $cb['desc']['en'] ?? '') ?>
                                </p>
                                <a href="<?= h($cb['url']) ?>" target="_blank" rel="noopener"
                                   class="ac-button ac-button--sm align-self-start">
                                    <?= ac_icon('external-link') ?><?= h($txt['community_visit']) ?>
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
                <h5 class="modal-title"><?= ac_icon('scale', 'me-2') ?><?= h($txt['legality_modal_title']) ?></h5>
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
                    <?= ac_icon('file-input', 'text-primary me-2') ?><?= h($txt['import_modal_title']) ?>
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body pb-2">
                <ul class="nav nav-tabs mb-3" id="importDeckTabs" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active" id="import-tab-list-btn" data-bs-toggle="tab"
                                data-bs-target="#import-pane-list" type="button" role="tab">
                            <?= ac_icon('list', 'me-1') ?><?= h($txt['import_tab_list']) ?>
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="import-tab-gg-btn" data-bs-toggle="tab"
                                data-bs-target="#import-pane-gg" type="button" role="tab">
                            <?= ac_icon('external-link', 'me-1') ?><?= h($txt['import_tab_gg']) ?>
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
                                <option value="<?= h($fmtKey) ?>"<?= !empty($fmtData['hidden']) ? ' data-hidden="1" hidden' : '' ?>><?= h($fmtData[$uiLang] ?? $fmtData['en']) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="mb-1">
                            <label class="form-label small fw-semibold"><?= h($txt['import_list_label']) ?></label>
                            <textarea id="import-list" class="form-control form-control-sm" rows="8"
                                      style="font-variant-numeric:tabular-nums"
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
                <button type="button" id="import-submit" class="btn btn-primary btn-sm">
                    <?= ac_icon('file-input', 'me-1') ?><?= h($txt['import_submit']) ?>
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
    var spinnerHtml = <?= json_encode(ac_icon('loader-circle', 'ac-icon--spin me-1')) ?>;
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
            submitBtn.innerHTML = spinnerHtml + '…';

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
            submitBtn.innerHTML = spinnerHtml + '…';

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
<script>
(function() {
    document.querySelectorAll('.filter-row--scroll').forEach(function(el) {
        el.addEventListener('wheel', function(e) {
            if (e.deltaY !== 0) { e.preventDefault(); el.scrollLeft += e.deltaY; }
        }, { passive: false });
    });
})();
</script>

