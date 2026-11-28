<?php
/**
 * Deep authentication & session manager (Keycloak + local auth fallback).
 *
 * Breaks the circular runtime dependency between includes/functions.php and
 * includes/func.keycloak.php, eliminates duplicate DB token queries in a single
 * request, and upgrades token/cookie encryption to authenticated AES-256-GCM
 * (`v2:` prefix) with transparent legacy AES-256-CBC read fallback.
 */

final class AuthSessionManager
{
    public const GCM_PREFIX = 'v2:';
    public const REMEMBER_TTL_SECS = 15 * 86400;

    /** @var callable(): ?PDO */
    private $dbProvider;
    /** @var callable(string, string): string */
    private $settingReader;
    /** @var callable(): int */
    private $clock;
    /** @var callable(string, array<string, mixed>): array{status: int, body: ?string, error: string} */
    private $httpPost;
    /** @var callable(string, string): array{status: int, body: ?string, error: string} */
    private $httpGetBearer;
    /** @var callable(string, string, array<string, mixed>): void */
    private $cookieWriter;
    /** @var callable(): void */
    private $sessionRegenerator;
    /** @var callable(): bool */
    private $isHttps;
    /** @var callable(string): string */
    private $sqlRewriter;

    /** @var array<string, mixed> */
    private array $config;

    /** @var array<string, mixed> */
    private array $sessionRef;
    private bool $useSuperglobalSession;

    /** @var array<string, mixed> */
    private array $cookiesRef;
    private bool $useSuperglobalCookies;

    /** Per-request memoization caches (single DB lookup per user per request). */
    private ?int $verifiedUserId = null;
    private bool $kcRestoreAttempted = false;
    private bool $localRestoreAttempted = false;
    /** @var array<int, bool> */
    private array $transientFailed = [];
    /** @var array<int, array<string, mixed>|false> */
    private array $userTokenRowCache = [];

    private static ?self $defaultInstance = null;

    /**
     * @param array<string, mixed> $config
     * @param array<string, mixed>|null $sessionOverride
     * @param array<string, mixed>|null $cookiesOverride
     */
    public function __construct(
        array $config = [],
        ?callable $dbProvider = null,
        ?callable $settingReader = null,
        ?callable $clock = null,
        ?callable $httpPost = null,
        ?callable $httpGetBearer = null,
        ?callable $cookieWriter = null,
        ?callable $sessionRegenerator = null,
        ?callable $isHttps = null,
        ?callable $sqlRewriter = null,
        ?array &$sessionOverride = null,
        ?array &$cookiesOverride = null
    ) {
        $this->config             = $config;
        $this->dbProvider         = $dbProvider         ?? static fn() => function_exists('getDB') ? getDB() : null;
        $this->settingReader      = $settingReader      ?? static fn(string $k, string $d = ''): string => function_exists('getSetting') ? getSetting($k, $d) : $d;
        $this->clock              = $clock              ?? static fn(): int => time();
        $this->httpPost           = $httpPost           ?? [self::class, 'defaultHttpPost'];
        $this->httpGetBearer      = $httpGetBearer      ?? [self::class, 'defaultHttpGetBearer'];
        $this->cookieWriter       = $cookieWriter       ?? [self::class, 'defaultCookieWriter'];
        $this->sessionRegenerator = $sessionRegenerator ?? [self::class, 'defaultSessionRegenerator'];
        $this->isHttps            = $isHttps            ?? static fn(): bool => function_exists('request_is_https') ? request_is_https() : false;
        $this->sqlRewriter        = $sqlRewriter        ?? static fn(string $sql): string => function_exists('q') ? q($sql) : $sql;

        if ($sessionOverride !== null) {
            $this->sessionRef = &$sessionOverride;
            $this->useSuperglobalSession = false;
        } else {
            $this->sessionRef = [];
            $this->useSuperglobalSession = true;
        }

        if ($cookiesOverride !== null) {
            $this->cookiesRef = &$cookiesOverride;
            $this->useSuperglobalCookies = false;
        } else {
            $this->cookiesRef = [];
            $this->useSuperglobalCookies = true;
        }
    }

    public static function default(): self
    {
        if (self::$defaultInstance === null) {
            self::$defaultInstance = new self();
        }
        return self::$defaultInstance;
    }

    public static function setDefault(?self $manager): void
    {
        self::$defaultInstance = $manager;
    }

    private function cfg(string $key, $default = '')
    {
        if (array_key_exists($key, $this->config)) {
            return $this->config[$key];
        }
        return defined($key) ? constant($key) : $default;
    }

    private function &session(): array
    {
        if ($this->useSuperglobalSession) {
            if (session_status() === PHP_SESSION_NONE && !headers_sent()) {
                session_start();
            }
            return $_SESSION;
        }
        return $this->sessionRef;
    }

    private function &cookies(): array
    {
        if ($this->useSuperglobalCookies) {
            return $_COOKIE;
        }
        return $this->cookiesRef;
    }

    private function now(): int
    {
        return ($this->clock)();
    }

    private function encryptionKey(): string
    {
        return (string)$this->cfg('ENCRYPTION_KEY', '');
    }

    // ── Authenticated Encryption (AES-256-GCM + legacy CBC fallback) ────────

    public function encrypt(string $plaintext): string
    {
        $rawKey = hash('sha256', $this->encryptionKey(), true);
        $iv     = random_bytes(12);
        $tag    = '';
        $cipher = openssl_encrypt($plaintext, 'aes-256-gcm', $rawKey, OPENSSL_RAW_DATA, $iv, $tag, '', 16);
        if ($cipher === false || strlen($tag) !== 16) {
            throw new RuntimeException('AES-256-GCM encryption failed');
        }
        return self::GCM_PREFIX . base64_encode($iv . $tag . $cipher);
    }

    /**
     * Decrypt `v2:` AES-256-GCM payloads (verifying authenticity tag) or fall back
     * transparently to legacy AES-256-CBC ciphertexts written before the upgrade.
     *
     * @return string|false
     */
    public function decrypt(string $ciphertext)
    {
        if ($ciphertext === '') {
            return false;
        }
        if (str_starts_with($ciphertext, self::GCM_PREFIX)) {
            $raw = base64_decode(substr($ciphertext, strlen(self::GCM_PREFIX)), true);
            if ($raw === false || strlen($raw) < 28) {
                return false;
            }
            $iv     = substr($raw, 0, 12);
            $tag    = substr($raw, 12, 16);
            $cipher = substr($raw, 28);
            $rawKey = hash('sha256', $this->encryptionKey(), true);
            return openssl_decrypt($cipher, 'aes-256-gcm', $rawKey, OPENSSL_RAW_DATA, $iv, $tag);
        }

        // Legacy AES-256-CBC fallback for pre-upgrade DB tokens / remember cookies.
        $raw   = base64_decode($ciphertext, true);
        $ivLen = openssl_cipher_iv_length('aes-256-cbc');
        if ($raw === false || $ivLen === false || strlen($raw) <= $ivLen) {
            return false;
        }
        $iv     = substr($raw, 0, $ivLen);
        $cipher = substr($raw, $ivLen);
        return openssl_decrypt($cipher, 'aes-256-cbc', $this->encryptionKey(), 0, $iv);
    }

    // ── Session Clearing & Global Logout ────────────────────────────────────

    public function clearKcSession(): void
    {
        $session = &$this->session();
        foreach ([
            'kc_logged_in', 'kc_logged_in_at', 'kc_sub', 'kc_email',
            'kc_username', 'kc_id_token', 'kc_access_token',
            'kc_access_token_exp', 'kc_is_admin', 'user_id',
        ] as $key) {
            unset($session[$key]);
        }
        $this->verifiedUserId = null;
        ($this->cookieWriter)('kc_remember', '', [
            'expires'  => $this->now() - 3600,
            'path'     => '/',
            'secure'   => ($this->isHttps)(),
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        $cookies = &$this->cookies();
        unset($cookies['kc_remember']);
    }

    public function clearAuthSession(): void
    {
        $session = &$this->session();
        foreach ([
            'admin_logged_in', 'admin_logged_in_at', 'admin_username',
            'local_logged_in', 'local_logged_in_at', 'local_email', 'local_username',
            'kc_logged_in', 'kc_logged_in_at', 'kc_sub', 'kc_email', 'kc_username', 'kc_id_token',
            'kc_is_admin', 'user_id',
        ] as $key) {
            unset($session[$key]);
        }
        $this->verifiedUserId = null;
    }

    public function clearLocalSession(): void
    {
        $session = &$this->session();
        foreach (['local_logged_in', 'local_logged_in_at', 'local_email', 'local_username', 'user_id'] as $key) {
            unset($session[$key]);
        }
        ($this->cookieWriter)('local_remember', '', [
            'expires'  => $this->now() - 3600,
            'path'     => '/',
            'secure'   => ($this->isHttps)(),
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        $cookies = &$this->cookies();
        unset($cookies['local_remember']);
    }

    public function globalLogoutSessionIsValid(): bool
    {
        $cookies = &$this->cookies();
        if (empty($cookies['ac_global_logout'])) {
            return true;
        }
        $session    = &$this->session();
        $logoutAt   = (int)$cookies['ac_global_logout'];
        $loggedInAt = (int)max(
            $session['kc_logged_in_at']    ?? 0,
            $session['local_logged_in_at'] ?? 0
        );
        return $loggedInAt > $logoutAt;
    }

    // ── Single Token Row Loader (eliminates duplicate DB queries per request) ─

    /**
     * @return array<string, mixed>|false|null null on DB failure, false when not found, array when found
     */
    private function loadUserTokenRow(int $userId, bool $withProfile = false)
    {
        if (!$withProfile && array_key_exists($userId, $this->userTokenRowCache)) {
            return $this->userTokenRowCache[$userId];
        }
        try {
            $db = ($this->dbProvider)();
            if (!$db) {
                return null;
            }
            $cols = $withProfile
                ? 'kc_refresh_token, kc_token_expiry, kc_sub, email, username'
                : 'kc_refresh_token, kc_token_expiry';
            $stmt = $db->prepare(($this->sqlRewriter)("SELECT {$cols} FROM {users} WHERE id = :id LIMIT 1"));
            $stmt->execute([':id' => $userId]);
            $row = $stmt->fetch();
            $this->userTokenRowCache[$userId] = $row ?: false;
            return $this->userTokenRowCache[$userId];
        } catch (Throwable $e) {
            return null;
        }
    }

    // ── Keycloak Token Persistence & Exchange ───────────────────────────────

    public function saveTokens(int $userId, array $tokens): void
    {
        $session = &$this->session();
        if (!empty($tokens['access_token'])) {
            $session['kc_access_token']     = $tokens['access_token'];
            $session['kc_access_token_exp'] = $this->now() + (int)($tokens['expires_in'] ?? 300);
        }

        $refreshToken = (string)($tokens['refresh_token'] ?? '');
        if ($refreshToken === '') {
            return;
        }

        $rtExp = isset($tokens['refresh_expires_in']) && (int)$tokens['refresh_expires_in'] > 0
            ? $this->now() + (int)$tokens['refresh_expires_in']
            : 0;
        $encrypted = $this->encrypt($refreshToken);

        $db = ($this->dbProvider)();
        if ($db) {
            $db->prepare(($this->sqlRewriter)(
                "UPDATE {users} SET kc_refresh_token = :rt, kc_token_expiry = :exp WHERE id = :id"
            ))->execute([':rt' => $encrypted, ':exp' => $rtExp, ':id' => $userId]);
        }
        $this->userTokenRowCache[$userId] = [
            'kc_refresh_token' => $encrypted,
            'kc_token_expiry'  => $rtExp,
        ];
    }

    public function dropRefreshToken(int $userId): void
    {
        if ($userId > 0) {
            try {
                $db = ($this->dbProvider)();
                if ($db) {
                    $db->prepare(($this->sqlRewriter)(
                        "UPDATE {users} SET kc_refresh_token = NULL, kc_token_expiry = 0 WHERE id = :id"
                    ))->execute([':id' => $userId]);
                }
            } catch (Throwable $e) {
            }
            unset($this->userTokenRowCache[$userId]);
        }
        $this->clearKcSession();
    }

    /**
     * @return array{tokens: ?array<string, mixed>, rejected: bool}
     */
    public function exchangeRefreshToken(string $refreshToken, bool $includeScope = true): array
    {
        $fields = [
            'grant_type'    => 'refresh_token',
            'client_id'     => (string)$this->cfg('KC_CLIENT_ID', ''),
            'client_secret' => (string)$this->cfg('KC_CLIENT_SECRET', ''),
            'refresh_token' => $refreshToken,
        ];
        $scopes = (string)$this->cfg('KC_SCOPES', '');
        if ($includeScope && $scopes !== '') {
            $fields['scope'] = $scopes;
        }

        $url = rtrim((string)$this->cfg('KC_URL', ''), '/') . '/realms/' . $this->cfg('KC_REALM', '') . '/protocol/openid-connect/token';
        $res = ($this->httpPost)($url, $fields);

        if ($res['error'] !== '' || $res['body'] === null || $res['body'] === '' || $res['status'] === 0 || $res['status'] >= 500) {
            return ['tokens' => null, 'rejected' => false];
        }

        $data = json_decode($res['body'], true);
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
     * @return string|false
     */
    public function getAccessToken(int $userId)
    {
        $kcUrl = (string)$this->cfg('KC_URL', '');
        if ($kcUrl === '' || $userId <= 0) {
            return false;
        }

        $session = &$this->session();
        if (!empty($session['kc_access_token']) && !empty($session['kc_access_token_exp'])) {
            if ((int)$session['kc_access_token_exp'] > $this->now() + 30) {
                unset($this->transientFailed[$userId]);
                return $session['kc_access_token'];
            }
        }

        if (!empty($this->transientFailed[$userId])) {
            return false;
        }

        $row = $this->loadUserTokenRow($userId, false);
        if ($row === null) {
            $this->transientFailed[$userId] = true;
            return false;
        }

        if (!$row || empty($row['kc_refresh_token'])) {
            $this->clearKcSession();
            return false;
        }

        $rtExp = (int)($row['kc_token_expiry'] ?? 0);
        if ($rtExp > 0 && $rtExp <= $this->now()) {
            $this->dropRefreshToken($userId);
            return false;
        }

        $refreshToken = $this->decrypt((string)$row['kc_refresh_token']);
        if (!$refreshToken) {
            $this->dropRefreshToken($userId);
            return false;
        }

        $result = $this->exchangeRefreshToken($refreshToken, true);
        if ($result['tokens'] === null) {
            if ($result['rejected']) {
                $this->dropRefreshToken($userId);
            } else {
                $this->transientFailed[$userId] = true;
            }
            return false;
        }

        $this->saveTokens($userId, $result['tokens']);
        return $result['tokens']['access_token'];
    }

    // ── Remember Cookie & Session Restoration ───────────────────────────────

    public function setRememberCookie(int $userId): void
    {
        $expires = $this->now() + self::REMEMBER_TTL_SECS;
        $value   = $this->encrypt((string)json_encode(['uid' => $userId, 'exp' => $expires]));
        ($this->cookieWriter)('kc_remember', $value, [
            'expires'  => $expires,
            'path'     => '/',
            'secure'   => ($this->isHttps)(),
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        $cookies = &$this->cookies();
        $cookies['kc_remember'] = $value;
    }

    public function restoreKcSession(): bool
    {
        $cookies = &$this->cookies();
        if (empty($cookies['kc_remember'])) {
            return false;
        }

        $decoded = $this->decrypt((string)$cookies['kc_remember']);
        if (!$decoded) {
            $this->clearKcSession();
            return false;
        }

        $data = json_decode($decoded, true);
        if (!is_array($data) || empty($data['uid']) || empty($data['exp']) || (int)$data['exp'] < $this->now()) {
            $this->clearKcSession();
            return false;
        }

        $globalLogoutAt = (int)($cookies['ac_global_logout'] ?? 0);
        if ($globalLogoutAt > 0 && ((int)$data['exp'] - self::REMEMBER_TTL_SECS) <= $globalLogoutAt) {
            $this->clearKcSession();
            return false;
        }

        $userId = (int)$data['uid'];
        $user   = $this->loadUserTokenRow($userId, true);
        if ($user === null) {
            return false;
        }
        if (!$user || empty($user['kc_refresh_token'])) {
            $this->clearKcSession();
            return false;
        }

        $rtExp = (int)($user['kc_token_expiry'] ?? 0);
        if ($rtExp > 0 && $rtExp <= $this->now()) {
            $this->dropRefreshToken($userId);
            return false;
        }

        $refreshToken = $this->decrypt((string)$user['kc_refresh_token']);
        if (!$refreshToken) {
            $this->dropRefreshToken($userId);
            return false;
        }

        $result = $this->exchangeRefreshToken($refreshToken, false);
        if ($result['tokens'] === null) {
            if ($result['rejected']) {
                $this->dropRefreshToken($userId);
            }
            return false;
        }
        $tokens = $result['tokens'];

        $this->saveTokens($userId, $tokens);

        $storeUserData = (bool)$this->cfg('STORE_KC_USER_DATA', true);
        $userInfo      = null;
        if (!$storeUserData) {
            $infoUrl = rtrim((string)$this->cfg('KC_URL', ''), '/') . '/realms/' . $this->cfg('KC_REALM', '') . '/protocol/openid-connect/userinfo';
            $infoRes = ($this->httpGetBearer)($infoUrl, (string)$tokens['access_token']);
            $userInfo = is_string($infoRes['body']) ? json_decode($infoRes['body'], true) : null;
            if (!is_array($userInfo) || empty($userInfo['sub'])) {
                $session = &$this->session();
                unset($session['kc_access_token'], $session['kc_access_token_exp']);
                return false;
            }
        }

        $this->setRememberCookie($userId);
        ($this->sessionRegenerator)();

        $session = &$this->session();
        $session['kc_logged_in']    = true;
        $session['kc_logged_in_at'] = $this->now();
        $session['user_id']         = $userId;
        $session['kc_sub']          = $user['kc_sub'] ?? '';
        $session['kc_id_token']     = $tokens['id_token'] ?? '';

        if ($storeUserData) {
            $session['kc_email']    = $user['email']    ?? '';
            $session['kc_username'] = $user['username'] ?? '';
        } else {
            $kcEmail                = (string)($userInfo['email'] ?? '');
            $session['kc_email']    = $kcEmail;
            $session['kc_username'] = $userInfo['pseudo']
                ?? $userInfo['preferred_username']
                ?? $userInfo['name']
                ?? explode('@', $kcEmail ?: 'user@x')[0];
        }

        $this->verifiedUserId = $userId;
        return true;
    }

    // ── Primary Login State Checks ──────────────────────────────────────────

    public function isLoggedIn(): bool
    {
        $kcUrl = (string)$this->cfg('KC_URL', '');
        if ($kcUrl === '') {
            return $this->isLocalLoggedIn();
        }

        $session = &$this->session();
        if (empty($session['kc_logged_in'])) {
            $this->verifiedUserId = null;
            $cookies = &$this->cookies();
            if (!$this->kcRestoreAttempted && !empty($cookies['kc_remember'])) {
                $this->kcRestoreAttempted = true;
                return $this->restoreKcSession();
            }
            return false;
        }

        $userId = (int)($session['user_id'] ?? 0);
        if ($userId <= 0) {
            $this->clearKcSession();
            return false;
        }

        if ($this->verifiedUserId === $userId && $this->globalLogoutSessionIsValid()) {
            return true;
        }

        // Single DB lookup (cached in $this->userTokenRowCache and reused by getAccessToken()).
        $row = $this->loadUserTokenRow($userId, false);
        if ($row === null) {
            return false;
        }
        if ($row === false || empty($row['kc_refresh_token'])) {
            $this->clearKcSession();
            return false;
        }
        $rtExp = (int)($row['kc_token_expiry'] ?? 0);
        if ($rtExp > 0 && $rtExp <= $this->now()) {
            $this->dropRefreshToken($userId);
            return false;
        }

        $forceAt = ($this->settingReader)('kc_force_logout_at', '');
        if ($forceAt !== '' && (int)($session['kc_logged_in_at'] ?? 0) <= strtotime($forceAt)) {
            $this->clearKcSession();
            return false;
        }

        if (!$this->globalLogoutSessionIsValid()) {
            $this->clearKcSession();
            return false;
        }

        if (!$this->getAccessToken($userId)) {
            return false;
        }

        $this->verifiedUserId = $userId;
        return true;
    }

    /** @return array{sub: string, email: string, username: string} */
    public function currentUser(): array
    {
        $kcUrl = (string)$this->cfg('KC_URL', '');
        if ($kcUrl === '') {
            return $this->localUser();
        }
        $session = &$this->session();
        return [
            'sub'      => (string)($session['kc_sub']      ?? ''),
            'email'    => (string)($session['kc_email']    ?? ''),
            'username' => (string)($session['kc_username'] ?? ''),
        ];
    }

    // ── Local Authentication ────────────────────────────────────────────────

    public function restoreLocalSession(): bool
    {
        $cookies = &$this->cookies();
        $token   = (string)($cookies['local_remember'] ?? '');
        if ($token === '' || strlen($token) !== 64) {
            return false;
        }

        try {
            $db = ($this->dbProvider)();
            if (!$db) {
                return false;
            }
            $stmt = $db->prepare(($this->sqlRewriter)(
                "SELECT id, email, username, local_remember_expiry
                 FROM {users}
                 WHERE local_remember_token = :tok AND local_remember_expiry > :now
                 LIMIT 1"
            ));
            $stmt->execute([':tok' => $token, ':now' => $this->now()]);
            $user = $stmt->fetch();
        } catch (Throwable $e) {
            return false;
        }

        if (!$user) {
            return false;
        }

        $logoutAt = (int)($cookies['ac_global_logout'] ?? 0);
        if ($logoutAt > 0) {
            $lifetimeDays = (int)$this->cfg('SESSION_LIFETIME_DAYS', 1);
            $tokenIat     = (int)$user['local_remember_expiry'] - $lifetimeDays * 86400;
            if ($tokenIat <= $logoutAt) {
                return false;
            }
        }

        ($this->sessionRegenerator)();

        $session = &$this->session();
        $session['local_logged_in']    = true;
        $session['local_logged_in_at'] = $this->now();
        $session['user_id']            = (int)$user['id'];
        $session['local_email']        = $user['email']    ?? '';
        $session['local_username']     = $user['username'] ?? '';

        return true;
    }

    public function isLocalLoggedIn(): bool
    {
        $session = &$this->session();
        if (empty($session['local_logged_in'])) {
            $cookies = &$this->cookies();
            if (!$this->localRestoreAttempted && !empty($cookies['local_remember'])) {
                $this->localRestoreAttempted = true;
                return $this->restoreLocalSession();
            }
            return false;
        }

        $forceAt = ($this->settingReader)('kc_force_logout_at', '');
        if ($forceAt !== '' && (int)($session['local_logged_in_at'] ?? 0) <= strtotime($forceAt)) {
            $this->clearLocalSession();
            return false;
        }

        if (!$this->globalLogoutSessionIsValid()) {
            $this->clearLocalSession();
            return false;
        }

        return true;
    }

    /** @return array{sub: string, email: string, username: string} */
    public function localUser(): array
    {
        $session = &$this->session();
        return [
            'sub'      => '',
            'email'    => (string)($session['local_email']    ?? ''),
            'username' => (string)($session['local_username'] ?? ''),
        ];
    }

    // ── Default Production Ports ────────────────────────────────────────────

    /** @return array{status: int, body: ?string, error: string} */
    public static function defaultHttpPost(string $url, array $fields): array
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => http_build_query($fields),
            CURLOPT_HTTPHEADER     => ['Content-Type: application/x-www-form-urlencoded'],
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT        => 10,
            CURLOPT_PROTOCOLS      => CURLPROTO_HTTP | CURLPROTO_HTTPS,
        ]);
        $body   = curl_exec($ch);
        $err    = curl_error($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return [
            'status' => $status,
            'body'   => $body === false ? null : (string)$body,
            'error'  => $err,
        ];
    }

    /** @return array{status: int, body: ?string, error: string} */
    public static function defaultHttpGetBearer(string $url, string $token): array
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $token],
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT        => 10,
            CURLOPT_PROTOCOLS      => CURLPROTO_HTTP | CURLPROTO_HTTPS,
        ]);
        $body   = curl_exec($ch);
        $err    = curl_error($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return [
            'status' => $status,
            'body'   => $body === false ? null : (string)$body,
            'error'  => $err,
        ];
    }

    public static function defaultCookieWriter(string $name, string $value, array $options): void
    {
        if (!headers_sent()) {
            setcookie($name, $value, $options);
        }
    }

    public static function defaultSessionRegenerator(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE && !headers_sent()) {
            session_regenerate_id(true);
        }
    }
}
