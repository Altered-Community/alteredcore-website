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
    $refreshToken = $tokens['refresh_token'] ?? '';
    if (!$refreshToken) return;

    $rtExp = isset($tokens['refresh_expires_in']) && (int)$tokens['refresh_expires_in'] > 0
           ? time() + (int)$tokens['refresh_expires_in']
           : 0; // 0 = offline token, no fixed expiry

    getDB()->prepare(q(
        "UPDATE {users} SET kc_refresh_token = :rt, kc_token_expiry = :exp WHERE id = :id"
    ))->execute([':rt' => kc_encrypt($refreshToken), ':exp' => $rtExp, ':id' => $userId]);

    $_SESSION['kc_access_token']     = $tokens['access_token'] ?? '';
    $_SESSION['kc_access_token_exp'] = time() + (int)($tokens['expires_in'] ?? 300);
}

/**
 * Returns a valid access_token. Uses the cached session token if still valid
 * (30s margin), otherwise exchanges the DB refresh_token for a new one.
 * Returns false if the token cannot be obtained.
 */
function kc_get_access_token(int $userId) {
    if (!empty($_SESSION['kc_access_token']) && !empty($_SESSION['kc_access_token_exp'])) {
        if ((int)$_SESSION['kc_access_token_exp'] > time() + 30) {
            return $_SESSION['kc_access_token'];
        }
    }

    $stmt = getDB()->prepare(q("SELECT kc_refresh_token, kc_token_expiry FROM {users} WHERE id = :id LIMIT 1"));
    $stmt->execute([':id' => $userId]);
    $row = $stmt->fetch();

    if (empty($row['kc_refresh_token'])) return false;
    $refreshToken = kc_decrypt($row['kc_refresh_token']);
    if (!$refreshToken) return false;

    $ch = curl_init(KC_URL . '/realms/' . KC_REALM . '/protocol/openid-connect/token');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => http_build_query([
            'grant_type'    => 'refresh_token',
            'client_id'     => KC_CLIENT_ID,
            'client_secret' => KC_CLIENT_SECRET,
            'refresh_token' => $refreshToken,
            'scope'         => KC_SCOPES,
        ]),
        CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
        CURLOPT_TIMEOUT    => 10,
    ]);
    $response = curl_exec($ch);
    $err      = curl_error($ch);
    curl_close($ch);

    if ($err || !$response) return false;
    $data = json_decode($response, true);
    if (empty($data['access_token'])) {
        // KC actively rejected the refresh token (expired/revoked). Drop the dead
        // token so we stop retrying it on every request and the user is steered
        // back to a fresh login. Mirrors kc_restore_session()'s cleanup. Only on a
        // genuine rejection — never on a transport error (handled above), which is
        // transient and must not nuke an otherwise-valid token.
        if (($data['error'] ?? '') === 'invalid_grant') {
            try {
                getDB()->prepare(q("UPDATE {users} SET kc_refresh_token = NULL, kc_token_expiry = 0 WHERE id = :id"))
                       ->execute([':id' => $userId]);
            } catch (Throwable $e) {}
            unset($_SESSION['kc_access_token'], $_SESSION['kc_access_token_exp']);
        }
        return false;
    }

    kc_save_tokens($userId, $data);
    return $data['access_token'];
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
    if (!$decoded) return false;

    $data = json_decode($decoded, true);
    if (empty($data['uid']) || empty($data['exp']) || (int)$data['exp'] < time()) return false;

    // Reject cookies issued before a cross-installation logout
    $globalLogoutAt = (int)($_COOKIE['ac_global_logout'] ?? 0);
    if ($globalLogoutAt > 0 && ((int)$data['exp'] - 15 * 86400) <= $globalLogoutAt) return false;

    $userId = (int)$data['uid'];

    $stmt = getDB()->prepare(q(
        "SELECT kc_refresh_token, kc_token_expiry, kc_sub, email, username FROM {users} WHERE id = :id LIMIT 1"
    ));
    $stmt->execute([':id' => $userId]);
    $user = $stmt->fetch();

    if (empty($user['kc_refresh_token'])) return false;
    $refreshToken = kc_decrypt($user['kc_refresh_token']);
    if (!$refreshToken) return false;

    $ch = curl_init(KC_URL . '/realms/' . KC_REALM . '/protocol/openid-connect/token');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => http_build_query([
            'grant_type'    => 'refresh_token',
            'client_id'     => KC_CLIENT_ID,
            'client_secret' => KC_CLIENT_SECRET,
            'refresh_token' => $refreshToken,
        ]),
        CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
        CURLOPT_TIMEOUT    => 10,
    ]);
    $response = curl_exec($ch);
    $err      = curl_error($ch);
    curl_close($ch);

    if ($err || !$response) return false;
    $tokens = json_decode($response, true);

    if (empty($tokens['access_token'])) {
        // KC rejected the token (revoked after logout) — null it so we don't retry
        try {
            getDB()->prepare(q("UPDATE {users} SET kc_refresh_token = NULL, kc_token_expiry = 0 WHERE id = :id"))
                   ->execute([':id' => $userId]);
        } catch (Throwable $e) {}
        return false;
    }

    kc_save_tokens($userId, $tokens);
    kc_set_remember_cookie($userId);

    // New session ID prevents session fixation on restore
    session_regenerate_id(true);

    $_SESSION['kc_logged_in']    = true;
    $_SESSION['kc_logged_in_at'] = time();
    $_SESSION['user_id']         = $userId;
    $_SESSION['kc_sub']          = $user['kc_sub'] ?? '';
    $_SESSION['kc_id_token']     = $tokens['id_token'] ?? '';

    if (STORE_KC_USER_DATA) {
        $_SESSION['kc_email']    = $user['email']    ?? '';
        $_SESSION['kc_username'] = $user['username'] ?? '';
    } else {
        $ch2 = curl_init(KC_URL . '/realms/' . KC_REALM . '/protocol/openid-connect/userinfo');
        curl_setopt_array($ch2, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $tokens['access_token']],
            CURLOPT_TIMEOUT        => 10,
        ]);
        $userInfo = json_decode(curl_exec($ch2), true);
        curl_close($ch2);
        $kcEmail = $userInfo['email'] ?? '';
        $_SESSION['kc_email']    = $kcEmail;
        $_SESSION['kc_username'] = $userInfo['pseudo']
                                ?? $userInfo['preferred_username']
                                ?? $userInfo['name']
                                ?? explode('@', $kcEmail ?: 'user@x')[0];
    }

    return true;
}
