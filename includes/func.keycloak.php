<?php
/**
 * Keycloak helpers — token management and session restoration.
 *
 * Rule: refresh_token → AES-256-CBC encrypted in DB
 *       access_token  → session only, never persisted
 */

// encryption

function kc_encrypt(string $plaintext): string {
    $iv = openssl_random_pseudo_bytes(openssl_cipher_iv_length('aes-256-cbc'));
    return base64_encode($iv . openssl_encrypt($plaintext, 'aes-256-cbc', ENCRYPTION_KEY, 0, $iv));
}

function kc_decrypt(string $ciphertext) {
    $raw    = base64_decode($ciphertext);
    $ivLen  = openssl_cipher_iv_length('aes-256-cbc');
    $iv     = substr($raw, 0, $ivLen);
    $cipher = substr($raw, $ivLen);
    return openssl_decrypt($cipher, 'aes-256-cbc', ENCRYPTION_KEY, 0, $iv);
}

// token persistence

/**
 * Saves the encrypted refresh_token to DB and the access_token to session.
 * Call after every successful token exchange (login or refresh).
 */
function kc_save_tokens(int $userId, array $tokens): void {
    if (!empty($tokens['access_token'])) {
        $_SESSION['kc_access_token']     = $tokens['access_token'];
        $_SESSION['kc_access_token_exp'] = time() + (int)($tokens['expires_in'] ?? 300);
    }

    $refreshToken = $tokens['refresh_token'] ?? '';
    if (!$refreshToken) return;

    $rtExp = isset($tokens['refresh_expires_in']) && (int)$tokens['refresh_expires_in'] > 0
           ? time() + (int)$tokens['refresh_expires_in']
           : 0; // 0 = offline token, no fixed expiry

    getDB()->prepare(q(
        "UPDATE {users} SET kc_refresh_token = :rt, kc_token_expiry = :exp WHERE id = :id"
    ))->execute([':rt' => kc_encrypt($refreshToken), ':exp' => $rtExp, ':id' => $userId]);
}

/**
 * Clears the stored Keycloak refresh token in DB and wipes the local session /
 * remember cookie so the user is no longer treated as signed in.
 */
function kc_drop_refresh_token(int $userId): void {
    if ($userId > 0) {
        try {
            getDB()->prepare(q("UPDATE {users} SET kc_refresh_token = NULL, kc_token_expiry = 0 WHERE id = :id"))
                   ->execute([':id' => $userId]);
        } catch (Throwable $e) {}
    }
    if (function_exists('kcClearSession')) {
        kcClearSession();
    } else {
        unset($_SESSION['kc_access_token'], $_SESSION['kc_access_token_exp']);
    }
}

/**
 * Exchanges a refresh token at Keycloak's token endpoint.
 * Returns ['tokens' => ?array, 'rejected' => bool] — 'rejected' is true only on
 * an explicit OAuth token rejection (e.g. invalid_grant), never on transport/5xx errors.
 */
function kc_exchange_refresh_token(string $refreshToken, bool $includeScope = true): array {
    $fields = [
        'grant_type'    => 'refresh_token',
        'client_id'     => KC_CLIENT_ID,
        'client_secret' => KC_CLIENT_SECRET,
        'refresh_token' => $refreshToken,
    ];
    if ($includeScope && defined('KC_SCOPES') && KC_SCOPES !== '') {
        $fields['scope'] = KC_SCOPES;
    }

    $ch = curl_init(KC_URL . '/realms/' . KC_REALM . '/protocol/openid-connect/token');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => http_build_query($fields),
        CURLOPT_HTTPHEADER     => ['Content-Type: application/x-www-form-urlencoded'],
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT        => 10,
    ]);
    $response = curl_exec($ch);
    $err      = curl_error($ch);
    $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($err || !$response || $httpCode === 0 || $httpCode >= 500) {
        return ['tokens' => null, 'rejected' => false];
    }

    $data = json_decode($response, true);
    if (!is_array($data)) {
        return ['tokens' => null, 'rejected' => false];
    }

    if (empty($data['access_token'])) {
        $error    = (string)($data['error'] ?? '');
        $rejected = in_array($error, ['invalid_grant', 'invalid_token'], true);
        return ['tokens' => null, 'rejected' => $rejected];
    }

    return ['tokens' => $data, 'rejected' => false];
}

/**
 * Returns a valid access_token. Uses the cached session token if still valid
 * (30s margin), otherwise exchanges the DB refresh_token for a new one.
 * Returns false if the token cannot be obtained.
 */
function kc_get_access_token(int $userId) {
    static $transientFailed = [];

    if (!defined('KC_URL') || KC_URL === '' || $userId <= 0) {
        return false;
    }

    if (!empty($_SESSION['kc_access_token']) && !empty($_SESSION['kc_access_token_exp'])) {
        if ((int)$_SESSION['kc_access_token_exp'] > time() + 30) {
            unset($transientFailed[$userId]);
            return $_SESSION['kc_access_token'];
        }
    }

    // Avoid repeating a failing Keycloak round-trip multiple times in one request.
    if (!empty($transientFailed[$userId])) {
        return false;
    }

    try {
        $stmt = getDB()->prepare(q("SELECT kc_refresh_token, kc_token_expiry FROM {users} WHERE id = :id LIMIT 1"));
        $stmt->execute([':id' => $userId]);
        $row = $stmt->fetch();
    } catch (Throwable $e) {
        $transientFailed[$userId] = true;
        return false;
    }

    if (!$row || empty($row['kc_refresh_token'])) {
        if (function_exists('kcClearSession')) kcClearSession();
        return false;
    }

    $rtExp = (int)($row['kc_token_expiry'] ?? 0);
    if ($rtExp > 0 && $rtExp <= time()) {
        kc_drop_refresh_token($userId);
        return false;
    }

    $refreshToken = kc_decrypt($row['kc_refresh_token']);
    if (!$refreshToken) {
        kc_drop_refresh_token($userId);
        return false;
    }

    $result = kc_exchange_refresh_token($refreshToken, true);
    if ($result['tokens'] === null) {
        // Only nuke the DB token & session on genuine rejection — never on a transient
        // transport/5xx error so a temporary Keycloak hiccup does not log users out.
        if ($result['rejected']) {
            kc_drop_refresh_token($userId);
        } else {
            $transientFailed[$userId] = true;
        }
        return false;
    }

    kc_save_tokens($userId, $result['tokens']);
    return $result['tokens']['access_token'];
}

// remember cookie

/**
 * Sets a long-lived encrypted cookie so the PHP session can be restored
 * after it has been garbage-collected.
 */
function kc_set_remember_cookie(int $userId): void {
    $secure  = request_is_https();
    $expires = time() + 15 * 86400;
    setcookie('kc_remember', kc_encrypt(json_encode(['uid' => $userId, 'exp' => $expires])), [
        'expires'  => $expires,
        'path'     => '/',
        'secure'   => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

/**
 * Tries to restore a KC session from the kc_remember cookie.
 * Exchanges the DB refresh_token for a fresh access_token.
 * Returns true if the session was successfully restored.
 */
function kc_restore_session(): bool {
    if (empty($_COOKIE['kc_remember'])) return false;

    $decoded = kc_decrypt($_COOKIE['kc_remember']);
    if (!$decoded) {
        if (function_exists('kcClearSession')) kcClearSession();
        return false;
    }

    $data = json_decode($decoded, true);
    if (empty($data['uid']) || empty($data['exp']) || (int)$data['exp'] < time()) {
        if (function_exists('kcClearSession')) kcClearSession();
        return false;
    }

    // Reject cookies issued before a cross-installation logout
    $globalLogoutAt = (int)($_COOKIE['ac_global_logout'] ?? 0);
    if ($globalLogoutAt > 0 && ((int)$data['exp'] - 15 * 86400) <= $globalLogoutAt) {
        if (function_exists('kcClearSession')) kcClearSession();
        return false;
    }

    $userId = (int)$data['uid'];

    try {
        $stmt = getDB()->prepare(q(
            "SELECT kc_refresh_token, kc_token_expiry, kc_sub, email, username FROM {users} WHERE id = :id LIMIT 1"
        ));
        $stmt->execute([':id' => $userId]);
        $user = $stmt->fetch();
    } catch (Throwable $e) {
        return false;
    }

    if (!$user || empty($user['kc_refresh_token'])) {
        if (function_exists('kcClearSession')) kcClearSession();
        return false;
    }

    $rtExp = (int)($user['kc_token_expiry'] ?? 0);
    if ($rtExp > 0 && $rtExp <= time()) {
        kc_drop_refresh_token($userId);
        return false;
    }

    $refreshToken = kc_decrypt($user['kc_refresh_token']);
    if (!$refreshToken) {
        kc_drop_refresh_token($userId);
        return false;
    }

    $result = kc_exchange_refresh_token($refreshToken, false);
    if ($result['tokens'] === null) {
        if ($result['rejected']) {
            kc_drop_refresh_token($userId);
        }
        return false;
    }
    $tokens = $result['tokens'];

    // Persist the rotated refresh token right away before any userinfo call so a
    // single-use refresh token is never lost if userinfo fails transiently.
    kc_save_tokens($userId, $tokens);

    $userInfo = null;
    if (!STORE_KC_USER_DATA) {
        $ch2 = curl_init(KC_URL . '/realms/' . KC_REALM . '/protocol/openid-connect/userinfo');
        curl_setopt_array($ch2, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $tokens['access_token']],
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT        => 10,
        ]);
        $rawInfo  = curl_exec($ch2);
        curl_close($ch2);
        $userInfo = is_string($rawInfo) ? json_decode($rawInfo, true) : null;
        if (!is_array($userInfo) || empty($userInfo['sub'])) {
            unset($_SESSION['kc_access_token'], $_SESSION['kc_access_token_exp']);
            return false;
        }
    }

    kc_set_remember_cookie($userId);

    // New session ID prevents session fixation on restore
    if (session_status() === PHP_SESSION_ACTIVE && !headers_sent()) {
        session_regenerate_id(true);
    }

    $_SESSION['kc_logged_in']    = true;
    $_SESSION['kc_logged_in_at'] = time();
    $_SESSION['user_id']         = $userId;
    $_SESSION['kc_sub']          = $user['kc_sub'] ?? '';
    $_SESSION['kc_id_token']     = $tokens['id_token'] ?? '';

    if (STORE_KC_USER_DATA) {
        $_SESSION['kc_email']    = $user['email']    ?? '';
        $_SESSION['kc_username'] = $user['username'] ?? '';
    } else {
        $kcEmail = $userInfo['email'] ?? '';
        $_SESSION['kc_email']    = $kcEmail;
        $_SESSION['kc_username'] = $userInfo['pseudo']
                                ?? $userInfo['preferred_username']
                                ?? $userInfo['name']
                                ?? explode('@', $kcEmail ?: 'user@x')[0];
    }

    return true;
}
