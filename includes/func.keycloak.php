<?php
/**
 * Keycloak helpers — thin procedural facades over AuthSessionManager.
 *
 * Rule: refresh_token → AES-256-GCM encrypted in DB (`v2:` prefix, legacy CBC read fallback)
 *       access_token  → session only, never persisted
 */

require_once __DIR__ . '/auth-session.php';

function kc_encrypt(string $plaintext): string {
    return AuthSessionManager::default()->encrypt($plaintext);
}

function kc_decrypt(string $ciphertext) {
    return AuthSessionManager::default()->decrypt($ciphertext);
}

function kc_save_tokens(int $userId, array $tokens): void {
    AuthSessionManager::default()->saveTokens($userId, $tokens);
}

function kc_drop_refresh_token(int $userId): void {
    AuthSessionManager::default()->dropRefreshToken($userId);
}

function kc_exchange_refresh_token(string $refreshToken, bool $includeScope = true): array {
    return AuthSessionManager::default()->exchangeRefreshToken($refreshToken, $includeScope);
}

function kc_get_access_token(int $userId) {
    return AuthSessionManager::default()->getAccessToken($userId);
}

function kc_set_remember_cookie(int $userId): void {
    AuthSessionManager::default()->setRememberCookie($userId);
}

function kc_restore_session(): bool {
    return AuthSessionManager::default()->restoreKcSession();
}
