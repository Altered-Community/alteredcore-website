<?php
// Favorites toggle endpoint — POST /papi/core-altered-cards/favorites-toggle
// Body: card_ref, csrf_token (+ optional faction, rarity, card_set). Ajoute/retire une carte des
// favoris de l'utilisateur connecté. Le routeur a déjà chargé le core + fixé le préfixe de table.
require_once dirname(__DIR__) . '/includes/functions.php';
require_once dirname(__DIR__) . '/includes/favorites.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed', 'code' => 'FT00']);
    exit;
}

if (!kcIsLoggedIn()) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Unauthorized', 'code' => 'FT01']);
    exit;
}

if (!csrfValid($_POST['csrf_token'] ?? '')) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid token', 'code' => 'FT02']);
    exit;
}

$userId = (int)($_SESSION['user_id'] ?? 0);
$ref    = cacFavNormalizeRef($_POST['card_ref'] ?? '');

if ($userId <= 0 || $ref === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid ref', 'code' => 'FT03']);
    exit;
}

// Vrais codes fournis par le client (carte normalisée) — pour le filtrage SQL des favoris.
$faction = cacFavNormalizeCode($_POST['faction']  ?? '');
$rarity  = cacFavNormalizeCode($_POST['rarity']   ?? '');
$cardSet = cacFavNormalizeCode($_POST['card_set'] ?? '');

$favorited = cacFavToggle($userId, $ref, $faction, $rarity, $cardSet);

echo json_encode(['ok' => true, 'favorited' => $favorited, 'ref' => $ref]);
