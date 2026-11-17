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
        header('X-Ac-Auth-State: unauthenticated');
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => $txt['err_token']]);
        exit;
    }

    $deckId   = trim($_POST['deck_id'] ?? '');
    $payload  = json_decode($_POST['payload'] ?? '{}', true);

    $method  = $deckId ? 'PATCH' : 'POST';
    $url     = DECKS_API_URL . '/api/decks' . ($deckId ? '/' . rawurlencode($deckId) : '');
    $contentType = ($method === 'PATCH') ? 'application/merge-patch+json' : 'application/json';
    $encodedPayload = json_encode($payload);

    $sendSave = function (string $bearer) use ($url, $method, $contentType, $encodedPayload): array {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST  => $method,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: ' . $contentType,
                'Accept: application/json',
                'Authorization: Bearer ' . $bearer,
            ],
            CURLOPT_TIMEOUT        => 15,
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $encodedPayload);
        $response = curl_exec($ch);
        $code     = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr  = curl_error($ch);
        curl_close($ch);
        return [$code, $response, $curlErr];
    };

    [$code, $response, $curlErr] = $sendSave($token);
    if (!$curlErr && $code === 401) {
        unset($_SESSION['kc_access_token'], $_SESSION['kc_access_token_exp']);
        $renewed = deckApiToken();
        if ($renewed) {
            [$code, $response, $curlErr] = $sendSave($renewed);
        } else {
            header('X-Ac-Auth-State: unauthenticated');
            http_response_code(401);
            echo json_encode(['ok' => false, 'error' => $txt['err_token']]);
            exit;
        }
    }

    if ($curlErr) {
        echo json_encode(['ok' => false, 'error' => $txt['err_connect']]);
    } elseif ($code >= 200 && $code < 300) {
        $data  = json_decode($response, true);
        $uuid = $data['id'] ?? $deckId;
        echo json_encode(['ok' => true, 'id' => $uuid]);
    } else {
        if ($code === 401) {
            header('X-Ac-Auth-State: unauthenticated');
            http_response_code(401);
        }
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
