<?php
// Favorites search endpoint — /papi/core-altered-cards/favorites-search
// Filtre + pagine les favoris de l'utilisateur EN SQL (colonnes faction/rarity/card_set), puis
// hydrate les ≤ perPage cartes de la page via POST /api/cards/batch, et renvoie une enveloppe
// compatible cards-API { member, totalItems, lastPage }.
require_once dirname(__DIR__) . '/includes/functions.php';
require_once dirname(__DIR__) . '/includes/favorites.php';

header('Content-Type: application/json');

if (!kcIsLoggedIn()) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized', 'code' => 'FS01']);
    exit;
}

$userId = (int)($_SESSION['user_id'] ?? 0);
if ($userId <= 0) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized', 'code' => 'FS01']);
    exit;
}

$perPage = max(1, (int)($_GET['itemsPerPage'] ?? 30));
$page    = max(1, (int)($_GET['page'] ?? 1));
$locale  = preg_match('/^[a-z]{2}$/', $_GET['locale'] ?? '') ? $_GET['locale'] : 'en';

// Filtres simples (noms sans point pour éviter la conversion PHP '.'→'_')
$factions = isset($_GET['faction']) ? (array)$_GET['faction'] : [];
$rarities = isset($_GET['rarity'])  ? (array)$_GET['rarity']  : [];
$sets     = isset($_GET['set'])     ? (array)$_GET['set']     : [];
$hasFilter = !empty($factions) || !empty($rarities) || !empty($sets);

// SQL : total + refs de la page (filtrés le cas échéant)
$total    = cacFavCount($userId, $factions, $rarities, $sets);
$lastPage = $total > 0 ? (int)ceil($total / $perPage) : 1;
$page     = min($page, $lastPage);
$refs     = cacFavGetPage($userId, $page, $perPage, $factions, $rarities, $sets);

$member = [];
if (!empty($refs)) {
    // Un seul appel batch pour les refs de la page (≤ perPage, sous la limite de 200).
    $cards = cacCardsApiBatch($refs, $locale);

    $byRef = [];
    foreach ($cards as $card) {
        if (!empty($card['reference'])) $byRef[$card['reference']] = $card;
    }

    foreach ($refs as $ref) {
        if (isset($byRef[$ref])) {
            $card = $byRef[$ref];
            $member[] = $card;
            // Backfill des métadonnées manquantes (favoris créés depuis card.php/deck.php),
            // uniquement en vue non filtrée (qui parcourt tous les favoris).
            if (!$hasFilter) {
                cacFavBackfillMeta(
                    $userId, $ref,
                    $card['faction']['code']     ?? '',
                    $card['rarity']['reference'] ?? '',
                    $card['set']['reference']    ?? ''
                );
            }
        } else {
            // Ref sans donnée renvoyée (ex. Unique) — rendue côté client à partir de la ref seule.
            $member[] = ['reference' => $ref];
        }
    }
}

echo json_encode([
    'member'     => $member,
    'totalItems' => $total,
    'lastPage'   => $lastPage,
]);
