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
    if (!$token) {
        echo json_encode(['ok' => false, 'error' => $txt['err_token']]);
        exit;
    }

    $deckId   = trim($_POST['deck_id'] ?? '');
    $payload  = json_decode($_POST['payload'] ?? '{}', true);

    $method  = $deckId ? 'PATCH' : 'POST';
    $url     = DECKS_API_URL . '/api/decks' . ($deckId ? '/' . rawurlencode($deckId) : '');

    $contentType = ($method === 'PATCH') ? 'application/merge-patch+json' : 'application/json';

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: ' . $contentType,
            'Accept: application/json',
            'Authorization: Bearer ' . $token,
        ],
        CURLOPT_TIMEOUT        => 15,
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    $response = curl_exec($ch);
    $code     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr  = curl_error($ch);
    curl_close($ch);

    if ($curlErr) {
        echo json_encode(['ok' => false, 'error' => $txt['err_connect']]);
    } elseif ($code >= 200 && $code < 300) {
        $data  = json_decode($response, true);
        $uuid = $data['id'] ?? $deckId;
        echo json_encode(['ok' => true, 'id' => $uuid]);
    } else {
        $apiBody   = json_decode($response, true);
        $apiDetail = '';
        if (!empty($apiBody['violations']) && is_array($apiBody['violations'])) {
            $apiDetail = formatApiViolations($apiBody['violations']);
        } elseif (!empty($apiBody['detail'])) {
            $apiDetail = $apiBody['detail'];
        } elseif (!empty($apiBody['title'])) {
            $apiDetail = $apiBody['title'];
        }
        $errorMsg = sprintf($txt['err_save'], $code);
        if ($apiDetail) $errorMsg .= "\n" . $apiDetail;
        echo json_encode(['ok' => false, 'error' => $errorMsg]);
    }
    exit;
}
