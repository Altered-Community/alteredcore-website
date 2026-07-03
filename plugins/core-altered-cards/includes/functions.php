<?php
// Card/collection helpers for the core-altered-cards plugin.
// Required by plugin pages and the collection-search API endpoint.

function loadSearchSettings(): array {
    static $cfg = null;
    if ($cfg === null) {
        $file = dirname(__DIR__) . '/data/search_settings.json';
        if (!file_exists($file)) { $cfg = []; return []; }
        $raw = file_get_contents($file);
        if (strncmp($raw, "\xEF\xBB\xBF", 3) === 0) $raw = substr($raw, 3);
        $cfg = json_decode($raw, true) ?? [];
    }
    return $cfg;
}

function loadAlteredData(string $name): array {
    static $all = null;
    if ($all === null) {
        $file = dirname(__DIR__) . '/data/altered.json';
        if (!file_exists($file)) { $all = []; return []; }
        $raw = file_get_contents($file);
        // Strip UTF-8 BOM added by some Windows editors
        if (strncmp($raw, "\xEF\xBB\xBF", 3) === 0) $raw = substr($raw, 3);
        $all = json_decode($raw, true) ?? [];
    }
    return $all[$name] ?? [];
}

/**
 * Normalize a card reference for CDN image lookups. Mirrors the client-side
 * normalizeRef()/normalizeHeroRef() helpers in decks.php and deckbuilder.php:
 * promo prints (segment 2 === 'P') fall back to the base booster art ('B'),
 * and BISE-set refs (segment 1 === 'BISE') map to CORE.
 */
function normalizeCardRef(string $ref): string {
    $p = explode('_', $ref);
    if (($p[2] ?? null) === 'P')    $p[2] = 'B';
    if (($p[1] ?? null) === 'BISE') $p[1] = 'CORE';
    return implode('_', $p);
}

function deckApiToken(): ?string {
    if (!kcIsLoggedIn()) return null;
    $userId = (int)($_SESSION['user_id'] ?? 0);
    if (!$userId) return null;
    require_once dirname(dirname(dirname(__DIR__))) . '/includes/func.keycloak.php';
    $token = kc_get_access_token($userId);
    return $token ?: null;
}

/** @return array{upvoteCount: int, hasUpvoted: bool}|null */
function cacDeckApiUpvote(string $deckId, string $token): ?array
{
    $ch = curl_init(DECKS_API_URL . '/api/decks/' . rawurlencode($deckId) . '/upvote');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => [
            'Authorization: Bearer ' . $token,
            'Accept: application/json',
            'Content-Type: application/json',
        ],
        CURLOPT_POSTFIELDS     => '{}',
        CURLOPT_TIMEOUT        => 15,
    ]);
    $raw  = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($code < 200 || $code >= 300 || !$raw) {
        return null;
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        return null;
    }

    return [
        'upvoteCount' => (int) ($data['upvoteCount'] ?? 0),
        'hasUpvoted'  => !empty($data['hasUpvoted']),
    ];
}

/**
 * Make an authenticated request to the collection API.
 *
 * @param string     $apiUrl      Base URL (no trailing slash)
 * @param string     $method      GET | POST | PATCH | DELETE
 * @param string     $path        Path with leading slash, e.g. '/api/collection'
 * @param int        $userId      Used to retrieve the Keycloak access token
 * @param array|null $body        Data for POST/PATCH (encoded as JSON automatically)
 * @param string     $contentType Content-Type for body (default: application/json)
 * @return array|true|false  Decoded JSON array, true on 204 No Content, false on error
 */
function collApiRequest(string $apiUrl, string $method, string $path, int $userId, $body = null, string $contentType = 'application/json') {
    require_once dirname(dirname(dirname(__DIR__))) . '/includes/func.keycloak.php';
    $token = kc_get_access_token($userId);
    if (!$token) return false;

    $headers = [
        'Authorization: Bearer ' . $token,
        'Accept: application/json',
    ];
    if ($body !== null) {
        $headers[] = 'Content-Type: ' . $contentType;
    }

    $ch = curl_init($apiUrl . $path);
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_USERAGENT      => 'alteredcore.org/1.0',
        CURLOPT_CUSTOMREQUEST  => $method,
    ];
    if ($body !== null) {
        $opts[CURLOPT_POSTFIELDS] = json_encode($body, JSON_UNESCAPED_UNICODE);
    }
    curl_setopt_array($ch, $opts);

    $raw  = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_errno($ch);
    curl_close($ch);

    if ($err || $code >= 400) return false;
    if ($code === 204) return true;
    if ($raw === false || $raw === '') return false;
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : false;
}

/**
 * Fetch several cards by reference in ONE public call (no auth) via POST /api/cards/batch.
 * Used to hydrate a page of favorites. Returns a flat array of card objects (card:read),
 * or [] on error/empty.
 *
 * @param string[] $refs    Card references (max 200 per the cards API)
 * @param string   $locale  'en'|'fr'
 */
function cacCardsApiBatch(array $refs, string $locale = 'en'): array {
    $refs = array_values(array_filter($refs, function($r) { return is_string($r) && $r !== ''; }));
    if (empty($refs)) return [];
    if (!defined('CARDS_API_URL') || CARDS_API_URL === '') return [];

    $url = rtrim(CARDS_API_URL, '/') . '/api/cards/batch?locale=' . rawurlencode($locale);
    $ch  = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_HTTPHEADER     => ['Accept: application/json', 'Content-Type: application/json'],
        CURLOPT_USERAGENT      => 'alteredcore.org/1.0',
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode(['references' => $refs], JSON_UNESCAPED_UNICODE),
    ]);
    $raw  = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_errno($ch);
    curl_close($ch);

    if ($err || $code >= 400 || !$raw) return [];
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) return [];
    // The batch endpoint returns a flat array; tolerate an enveloped {member:[...]} too.
    if (isset($decoded['member']) && is_array($decoded['member'])) return $decoded['member'];
    return $decoded;
}

/**
 * Returns the user's collection, session-cached for 5 minutes.
 *
 * @param string $apiUrl  Collection API base URL
 * @param int    $userId
 * @return array{collection: array<string,int>, entries: array<string,int>}
 */
function collGetUserCollection(string $apiUrl, int $userId): array {
    if (session_status() === PHP_SESSION_NONE) session_start();

    $cacheKey = '_coll_' . $userId;
    $tsKey    = '_coll_ts_' . $userId;

    if (!empty($_SESSION[$cacheKey]) && isset($_SESSION[$tsKey]) && (time() - (int)$_SESSION[$tsKey]) < 300) {
        return $_SESSION[$cacheKey];
    }

    $collection = [];
    $entries    = [];

    $raw = collApiRequest($apiUrl, 'GET', '/api/collection', $userId);
    if (is_array($raw)) {
        foreach ($raw as $entry) {
            $ref = $entry['cardReference'] ?? '';
            $qty = (int)($entry['quantity'] ?? 0);
            $id  = (int)($entry['id'] ?? 0);
            if ($ref && $qty > 0) {
                $collection[$ref] = $qty;
                $entries[$ref]    = $id;
            }
        }
    }

    $result = ['collection' => $collection, 'entries' => $entries];
    $_SESSION[$cacheKey] = $result;
    $_SESSION[$tsKey]    = time();
    return $result;
}

/**
 * Formats API violation objects into a human-readable string.
 * Used when an API returns a 422 response with a "violations" array.
 */
function formatApiViolations(array $violations): string {
    return implode(' — ', array_map(
        function ($v) { return ($v['propertyPath'] ? $v['propertyPath'] . ': ' : '') . ($v['message'] ?? ''); },
        $violations
    ));
}

/**
 * Build the POST /api/decks payload for duplicating an existing deck.
 *
 * Copies every card (including the hero), resets visibility to private,
 * mirrors the source draft flag (falling back to sandbox => draft), and
 * only carries a description when the source has a non-empty one.
 *
 * @param array  $sourceDeck Deck as returned by GET /api/decks/{id}.
 * @param string $newName    Desired name for the copy (already localized/suffixed by the caller).
 * @return array Payload ready for json_encode().
 */
function cacBuildDuplicateDeckPayload(array $sourceDeck, string $newName): array
{
    $deckCards = [];
    foreach ($sourceDeck['cards'] ?? [] as $card) {
        if (empty($card['cardReference'])) {
            continue;
        }
        $deckCards[] = [
            'cardReference' => $card['cardReference'],
            'quantity'      => (int)($card['quantity'] ?? 1),
        ];
    }

    $format  = $sourceDeck['format'] ?? 'standard';
    $newName = trim($newName);

    $payload = [
        'name'      => $newName !== '' ? $newName : (string)($sourceDeck['name'] ?? 'Deck'),
        'format'    => $format,
        'isPublic'  => false,
        'isDraft'   => $sourceDeck['isDraft'] ?? ($format === 'sandbox'),
        'deckCards' => $deckCards,
    ];

    $description = trim((string)($sourceDeck['description'] ?? ''));
    if ($description !== '') {
        $payload['description'] = $description;
    }

    return $payload;
}

/**
 * Execute multiple collection API requests in parallel using curl_multi.
 *
 * @param string $apiUrl  Base URL (no trailing slash)
 * @param array  $reqs    Each item: ['method'=>'...', 'path'=>'...', 'body'=>[...], 'contentType'=>'...']
 * @param int    $userId  Used to retrieve the Keycloak access token
 * @return array  Results indexed by request order (same format as collApiRequest)
 */
function collApiMultiRequest(string $apiUrl, array $reqs, int $userId): array {
    if (empty($reqs)) return [];
    require_once dirname(dirname(dirname(__DIR__))) . '/includes/func.keycloak.php';
    $token = kc_get_access_token($userId);
    if (!$token) return array_fill(0, count($reqs), false);

    $baseHeaders = ['Authorization: Bearer ' . $token, 'Accept: application/json'];

    $mh      = curl_multi_init();
    $handles = [];
    foreach ($reqs as $i => $req) {
        $body    = $req['body'] ?? null;
        $headers = $baseHeaders;
        if ($body !== null) $headers[] = 'Content-Type: ' . ($req['contentType'] ?? 'application/json');
        $opts = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_USERAGENT      => 'alteredcore.org/1.0',
            CURLOPT_CUSTOMREQUEST  => $req['method'],
        ];
        if ($body !== null) $opts[CURLOPT_POSTFIELDS] = json_encode($body, JSON_UNESCAPED_UNICODE);
        $ch = curl_init($apiUrl . $req['path']);
        curl_setopt_array($ch, $opts);
        curl_multi_add_handle($mh, $ch);
        $handles[$i] = $ch;
    }

    $running = null;
    do { curl_multi_exec($mh, $running); curl_multi_select($mh); } while ($running > 0);

    $results = [];
    foreach ($handles as $i => $ch) {
        $raw  = curl_multi_getcontent($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err  = curl_errno($ch);
        curl_multi_remove_handle($mh, $ch);
        curl_close($ch);
        if ($err) { $results[$i] = false; continue; }
        if ($code === 204) { $results[$i] = true; continue; }
        if (!$raw) { $results[$i] = false; continue; }
        $decoded = json_decode($raw, true);
        $results[$i] = is_array($decoded) ? $decoded : false;
    }
    curl_multi_close($mh);
    return $results;
}

/**
 * Starter deck contest entries from bundled JSON (no Decks API).
 *
 * @return array<int, array<string, mixed>>
 */
function cacLoadContestDecksFromJsonFile(string $path): array
{
    $data = json_decode(file_get_contents($path), true);
    $decks = [];
    foreach ($data['decks'] as $entry) {
        $stats = $entry['stats'];
        $stats['totalCards'] = 39;
        $decks[] = [
            'id'       => $entry['id'],
            'name'     => $entry['name'],
            'winner'   => !empty($entry['winner']),
            'format'   => 'nuc',
            'isPublic' => true,
            'isDraft'  => false,
            'legal'    => true,
            'stats'    => $stats,
        ];
    }

    return $decks;
}

/**
 * Build the pool of drawable cards for the "starting hand" tester.
 *
 * This does NOT draw a hand — it only prepares the source data the client-side
 * tester draws from. The actual shuffle + pick-6 happens in JS. This returns the
 * deck's cards with HERO excluded (the hero is never drawn), each with its
 * quantity preserved, so the JS can expand the pool (each card ×qty) and shuffle.
 *
 * Mirrors the decklist's name resolution (localized-array -> $lang -> 'en' ->
 * ref; a plain-string name is kept as-is). qty/mainCost are coerced to ints.
 *
 * Returns a list of ['ref','name','qty','type','mainCost']. The caller adds the
 * presentation-only 'img'/'unique' fields — those depend on page-level helpers
 * and the CDN_URL constant, so they stay out of this pure, testable function.
 *
 * @param array  $cards The deck's `cards` array (each an assoc array from the API).
 * @param string $lang  Card language for name resolution ('en'|'fr').
 * @return array<int,array{ref:string,name:string,qty:int,type:string,mainCost:int}>
 */
function getDeckStartingHandPool(array $cards, string $lang): array
{
    $out = [];
    foreach ($cards as $card) {
        $type = $card['cardTypeReference'] ?? 'OTHER';
        if ($type === 'HERO') continue;
        $ref     = $card['cardReference'] ?? '';
        $rawName = $card['name'] ?? null;
        $name    = is_array($rawName)
            ? (($rawName[$lang] ?? '') ?: ($rawName['en'] ?? $ref))
            : (($rawName !== null && $rawName !== '') ? $rawName : $ref);
        $out[] = [
            'ref'        => $ref,
            'name'       => $name,
            'qty'        => (int)($card['quantity'] ?? 1),
            'type'       => $type,
            'mainCost'   => (int)($card['mainCost'] ?? 0),
            'recallCost' => (int)($card['recallCost'] ?? 0),
        ];
    }
    return $out;
}

/**
 * i18n for the shared "Starting hand" stats + draw-odds block (rendered by
 * pages/_starting-hand-stats.php on both the deck detail page and the deck builder).
 * Single source so the two pages never drift. Returns the resolved strings for $lang.
 */
function cacStartingHandStatsTxt(string $lang): array
{
    $t = [
        'en' => [
            'ho_calc'          => 'Calculators',
            'ho_deck'          => 'Deck',
            'ho_drawn'         => 'Drawn',
            'ho_types_label'   => 'Average composition',
            'ohs_comp_sub'     => 'Average card types in a 6-card opening hand',
            'ho_pick'          => 'Pick…',
            'ho_group_a'       => 'A', 'ho_group_b' => 'B',
            'ho_ratio'         => '≈ {x} in {y} hands',
            'ho_ratio_generic' => '≈ {x} chances in {y}',
            'nc_atleast'       => 'Chances of having',
            'nc_atleast_combo' => 'Chances of having at least one of',
            'nc_among'         => 'cards among',
            'nc_among_combo'   => 'among',
            'nc_draw_a'        => 'by drawing',
            'nc_draw_b'        => 'cards',
            'nc_both'          => 'Both',
            'ohs_title'        => 'Opening hand stats',
            'ohs_detail'       => 'See details',
            'ohs_card'         => 'card', 'ohs_cards' => 'cards',
            'ohs_play'         => 'play', 'ohs_plays' => 'plays',
            'ohs_b1_title'     => 'Mana used on day 1',
            'ohs_b1_sub'       => 'How much of your 3 mana you can spend on the first day',
            'ohs_b1_h1'        => 'Optimal start',
            'ohs_b1_h1_note'   => 'of games let you spend all 3 mana',
            'ohs_b1_h2'        => 'Dead hand',
            'ohs_b1_h2_note'   => 'no play possible',
            'ohs_b1_detail'    => 'Breakdown by spendable mana',
            'ohs_b2_title'     => 'Expensive cards',
            'ohs_b2_sub'       => 'Cards at 4 mana or more, unplayable on the first day',
            'ohs_b2_note'      => 'of hands hold 3 expensive cards or more — fewer options for your initial mana',
            'ohs_b2_detail'    => 'Number of cards at 4 mana or more in the opening hand',
            'ohs_b3_title'     => 'Reactivity (after you)',
            'ohs_b3_sub'       => 'Chaining several plays on day 1: act, watch, then respond',
            'ohs_b3_note'      => 'of hands let you chain 2 plays or more on day 1 (combined cost 3 or less)',
            'ohs_b3_detail'    => 'Number of possible plays on day 1',
            'ohs_b4_title'     => 'Contestable Expeditions on day 1',
            'ohs_b4_sub'       => 'Characters you can deploy on the first day',
            'ohs_b4_h1'        => 'Both Expeditions',
            'ohs_b4_h1_note'   => 'you can deploy 2 or 3 characters on day 1',
            'ohs_b4_h2'        => 'No Expedition',
            'ohs_b4_h2_note'   => 'no character playable on day 1',
            'ohs_b4_detail'    => 'Number of contestable Expeditions on day 1',
            'ohs_b4_none'      => 'No character',
            'ohs_b4_one'       => '1 Expedition',
            'ohs_b4_both'      => 'Both Expeditions',
            // playtest sandbox
            'hand_empty'           => 'No cards to draw.',
            'hand_characters'      => 'Characters',
            'hand_spells'          => 'Spells',
            'hand_permanents'      => 'Permanents',
            'hand_avg_cost'        => 'Avg. hand cost',
            'pt_restart'           => 'New hand',
            'pt_toggle_playground' => 'Game mode',
            'pt_setup_hint'        => 'Select 3 cards to set as mana',
            'pt_commit_mana'       => 'Put in mana',
            'pt_mana'              => 'Mana',
            'pt_mana_list'         => 'Cards in mana',
            'pt_empty_zone'        => 'Empty',
            'pt_deck'              => 'Deck',
            'pt_draw'              => 'Draw',
            'pt_to_mana'           => 'To mana',
            'pt_play_board'        => 'Play to board',
            'pt_cancel'            => 'Cancel',
            'pt_zoom'              => 'Zoom',
            'pt_board'             => 'In play (Expeditions, Reserve, Landmarks)',
            'pt_discard'           => 'Discard',
            'pt_board_more'        => 'See all',
            'pt_return_hand'       => 'Return to hand',
            'pt_board_list'        => 'Board cards',
            'pt_discard_list'      => 'Discard pile',
        ],
        'fr' => [
            'ho_calc'          => 'Calculateurs',
            'ho_deck'          => 'Deck',
            'ho_drawn'         => 'Piochées',
            'ho_types_label'   => 'Composition moyenne',
            'ohs_comp_sub'     => 'Types de cartes moyens dans une main d\'ouverture de 6 cartes',
            'ho_pick'          => 'Choisir…',
            'ho_group_a'       => 'A', 'ho_group_b' => 'B',
            'ho_ratio'         => '≈ {x} sur {y} mains',
            'ho_ratio_generic' => '≈ {x} chances sur {y}',
            'nc_atleast'       => 'Chances d\'avoir',
            'nc_atleast_combo' => 'Chances d\'avoir au moins une de',
            'nc_among'         => 'cartes parmi',
            'nc_among_combo'   => 'parmi',
            'nc_draw_a'        => 'en piochant',
            'nc_draw_b'        => 'cartes',
            'nc_both'          => 'A + B',
            'ohs_title'        => 'Stats de main de départ',
            'ohs_detail'       => 'Voir le détail',
            'ohs_card'         => 'carte', 'ohs_cards' => 'cartes',
            'ohs_play'         => 'play', 'ohs_plays' => 'plays',
            'ohs_b1_title'     => 'Mana utilisé au jour 1',
            'ohs_b1_sub'       => 'Combien de tes 3 mana tu peux dépenser dès le premier jour',
            'ohs_b1_h1'        => 'Démarrage optimal',
            'ohs_b1_h1_note'   => 'des parties te laissent dépenser tes 3 mana',
            'ohs_b1_h2'        => 'Main morte',
            'ohs_b1_h2_note'   => 'aucun jeu possible',
            'ohs_b1_detail'    => 'Répartition par mana consommable',
            'ohs_b2_title'     => 'Cartes chères',
            'ohs_b2_sub'       => 'Cartes à 4 mana ou plus, injouables dès le premier jour',
            'ohs_b2_note'      => 'des mains contiennent 3 cartes chères ou plus — réduit tes choix pour la mise en mana initiale',
            'ohs_b2_detail'    => 'Nombre de cartes à 4 mana ou plus dans la main de départ',
            'ohs_b3_title'     => 'Réactivité (après-vous)',
            'ohs_b3_sub'       => 'Pouvoir enchaîner plusieurs plays au jour 1 : jouer, voir, puis répondre',
            'ohs_b3_note'      => 'des mains te laissent enchaîner 2 plays ou plus au jour 1 (coût cumulé 3 ou moins)',
            'ohs_b3_detail'    => 'Nombre de plays possibles au jour 1',
            'ohs_b4_title'     => 'Expéditions contestables au jour 1',
            'ohs_b4_sub'       => 'Personnages déployables dès le premier jour',
            'ohs_b4_h1'        => 'Les deux Expéditions',
            'ohs_b4_h1_note'   => 'tu peux déployer 2 ou 3 personnages au jour 1',
            'ohs_b4_h2'        => 'Aucune Expédition',
            'ohs_b4_h2_note'   => 'aucun personnage jouable au jour 1',
            'ohs_b4_detail'    => 'Nombre d\'Expéditions contestables au jour 1',
            'ohs_b4_none'      => 'Aucun personnage',
            'ohs_b4_one'       => '1 Expédition',
            'ohs_b4_both'      => 'Les 2 Expéditions',
            // playtest sandbox
            'hand_empty'           => 'Aucune carte à tirer.',
            'hand_characters'      => 'Personnages',
            'hand_spells'          => 'Sorts',
            'hand_permanents'      => 'Permanents',
            'hand_avg_cost'        => 'Coût moyen en main',
            'pt_restart'           => 'Nouvelle main',
            'pt_toggle_playground' => 'Mode jeu',
            'pt_setup_hint'        => 'Sélectionne 3 cartes à mettre en mana',
            'pt_commit_mana'       => 'Mettre en mana',
            'pt_mana'              => 'Mana',
            'pt_mana_list'         => 'Cartes en mana',
            'pt_empty_zone'        => 'Vide',
            'pt_deck'              => 'Deck',
            'pt_draw'              => 'Piocher',
            'pt_to_mana'           => 'En mana',
            'pt_play_board'        => 'Jouer sur le plateau',
            'pt_cancel'            => 'Annuler',
            'pt_zoom'              => 'Zoom',
            'pt_board'             => 'En jeu (Expéditions, Réserve, Permanents)',
            'pt_discard'           => 'Défausse',
            'pt_board_more'        => 'Voir +',
            'pt_return_hand'       => 'Remettre en main',
            'pt_board_list'        => 'Cartes du plateau',
            'pt_discard_list'      => 'Défausse',
        ],
    ];
    return $t[$lang] ?? $t['en'];
}
