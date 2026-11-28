<?php
/**
 * AJAX create/update for the deckbuilder (POST ?ajax=1).
 * Expects bootstrap locals: $isGuest, $token, $txt.
 */
// handle AJAX save
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_GET['ajax'])) {
    header('Content-Type: application/json');

    if ($isGuest) {
        echo json_encode(['ok' => false, 'error' => 'guest']);
        exit;
    }
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        echo json_encode(['ok' => false, 'error' => 'Invalid token']);
        exit;
    }
    $userId = kcCurrentUserId();
    if (!$token || $userId <= 0) {
        header('X-Ac-Auth-State: unauthenticated');
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => $txt['err_token']]);
        exit;
    }

    $deckId      = trim($_POST['deck_id'] ?? '');
    $payload     = json_decode($_POST['payload'] ?? '{}', true);
    $method      = $deckId ? 'PATCH' : 'POST';
    $url         = DECKS_API_URL . '/api/decks' . ($deckId ? '/' . rawurlencode($deckId) : '');
    $contentType = ($method === 'PATCH') ? 'application/merge-patch+json' : 'application/json';

    $res = acServiceRequest(AcHttpRequest::json($method, $url, $payload, $userId, $contentType));

    if ($res->isUnreachable()) {
        if ($res->status === 401 && $res->authExpired) {
            header('X-Ac-Auth-State: unauthenticated');
            http_response_code(401);
            echo json_encode(['ok' => false, 'error' => $txt['err_token']]);
            exit;
        }
        echo json_encode(['ok' => false, 'error' => $txt['err_connect']]);
    } elseif ($res->isOk()) {
        $data = $res->json();
        $uuid = is_array($data) ? ($data['id'] ?? $deckId) : $deckId;
        echo json_encode(['ok' => true, 'id' => $uuid]);
    } else {
        if ($res->status === 401) {
            header('X-Ac-Auth-State: unauthenticated');
            http_response_code(401);
            if ($res->authExpired) {
                echo json_encode(['ok' => false, 'error' => $txt['err_token']]);
                exit;
            }
        }
        $apiDetail = $res->errorDetail();
        $errorMsg  = sprintf($txt['err_save'], $res->status);
        if ($apiDetail !== '') $errorMsg .= "\n" . $apiDetail;
        echo json_encode(['ok' => false, 'error' => $errorMsg]);
    }
    exit;
}
