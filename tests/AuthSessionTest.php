<?php
// Tests for includes/auth-session.php (AuthSessionManager: AES-256-GCM, legacy CBC fallback,
// tamper rejection, ac_global_logout, kc_force_logout_at, 5xx vs invalid_grant).
require_once dirname(__DIR__) . '/includes/auth-session.php';

// Minimal PDO-compatible fake statement + DB for deterministic auth tests.
final class FakeAuthStmt
{
    private $row;
    private $onExecute;
    public function __construct($row, ?callable $onExecute = null) { $this->row = $row; $this->onExecute = $onExecute; }
    public function execute(array $params = []): bool { if ($this->onExecute) { ($this->onExecute)($params); } return true; }
    public function fetch() { return $this->row; }
}

final class FakeAuthDb
{
    public array $userRow;
    public int $selectCount = 0;
    public int $updateCount = 0;
    public function __construct(array $userRow) { $this->userRow = $userRow; }
    public function prepare(string $sql): FakeAuthStmt
    {
        if (stripos($sql, 'SELECT ') === 0) {
            $this->selectCount++;
            return new FakeAuthStmt($this->userRow);
        }
        $db = $this;
        return new FakeAuthStmt(false, static function (array $params) use ($db, $sql): void {
            $db->updateCount++;
            if (stripos($sql, 'kc_refresh_token = NULL') !== false) {
                $db->userRow['kc_refresh_token'] = null;
                $db->userRow['kc_token_expiry']  = 0;
            } elseif (isset($params[':rt'])) {
                $db->userRow['kc_refresh_token'] = $params[':rt'];
                $db->userRow['kc_token_expiry']  = $params[':exp'] ?? 0;
            }
        });
    }
}

$key = 'test-super-secret-encryption-key-32bytes';
$now = 1700000000;

// 1. AES-256-GCM round-trip + tamper rejection + legacy CBC fallback
$s1 = []; $c1 = [];
$mgr = new AuthSessionManager(
    ['ENCRYPTION_KEY' => $key, 'KC_URL' => 'https://kc.test', 'KC_REALM' => 'altered'],
    static fn() => null,
    static fn(string $k, string $d = ''): string => $d,
    static fn(): int => $now,
    null, null,
    static function (string $n, string $v, array $o): void {},
    static function (): void {},
    static fn(): bool => true,
    static fn(string $sql): string => $sql,
    $s1, $c1
);

$enc = $mgr->encrypt('refresh-token-value');
assertSame(true, str_starts_with($enc, AuthSessionManager::GCM_PREFIX), 'encrypt uses v2: AES-256-GCM prefix');
assertSame('refresh-token-value', $mgr->decrypt($enc), 'AES-256-GCM round-trip matches');

// Tamper with a byte of the ciphertext -> GCM must reject
$raw = base64_decode(substr($enc, strlen(AuthSessionManager::GCM_PREFIX)), true);
$raw[strlen($raw) - 1] = chr(ord($raw[strlen($raw) - 1]) ^ 0xFF);
$tampered = AuthSessionManager::GCM_PREFIX . base64_encode($raw);
assertSame(false, $mgr->decrypt($tampered), 'tampered GCM payload is rejected');

// Legacy AES-256-CBC payload still decrypts transparently
$iv = random_bytes(openssl_cipher_iv_length('aes-256-cbc'));
$legacyCipher = base64_encode($iv . openssl_encrypt('legacy-secret', 'aes-256-cbc', $key, 0, $iv));
assertSame('legacy-secret', $mgr->decrypt($legacyCipher), 'legacy CBC ciphertext decrypts transparently');

// 2. Single DB lookup across isLoggedIn() + getAccessToken() when access token is expired
$db2 = new FakeAuthDb([
    'kc_refresh_token' => $mgr->encrypt('rt-initial'),
    'kc_token_expiry'  => $now + 3600,
]);
$s2 = ['kc_logged_in' => true, 'kc_logged_in_at' => $now - 10, 'user_id' => 5];
$c2 = [];
$mgr2 = new AuthSessionManager(
    ['ENCRYPTION_KEY' => $key, 'KC_URL' => 'https://kc.test', 'KC_REALM' => 'altered', 'KC_CLIENT_ID' => 'c', 'KC_CLIENT_SECRET' => 's'],
    static fn() => $db2,
    static fn(string $k, string $d = ''): string => $d,
    static fn(): int => $now,
    static fn(string $url, array $fields): array => [
        'status' => 200,
        'body'   => json_encode(['access_token' => 'at-new', 'expires_in' => 300, 'refresh_token' => 'rt-rotated']),
        'error'  => '',
    ],
    null,
    static function (string $n, string $v, array $o): void {},
    static function (): void {},
    static fn(): bool => true,
    static fn(string $sql): string => $sql,
    $s2, $c2
);
assertSame(true, $mgr2->isLoggedIn(), 'isLoggedIn succeeds and refreshes token');
assertSame(1, $db2->selectCount, 'isLoggedIn + getAccessToken share a single DB SELECT');
assertSame('at-new', $s2['kc_access_token'], 'refreshed access token stored in session');

// 3. Transient 5xx from Keycloak preserves DB refresh token & session
$db3 = new FakeAuthDb(['kc_refresh_token' => $mgr->encrypt('rt-keep'), 'kc_token_expiry' => $now + 3600]);
$s3 = ['kc_logged_in' => true, 'kc_logged_in_at' => $now - 10, 'user_id' => 6];
$c3 = [];
$mgr3 = new AuthSessionManager(
    ['ENCRYPTION_KEY' => $key, 'KC_URL' => 'https://kc.test', 'KC_REALM' => 'altered'],
    static fn() => $db3,
    static fn(string $k, string $d = ''): string => $d,
    static fn(): int => $now,
    static fn(string $url, array $fields): array => ['status' => 503, 'body' => 'Service Unavailable', 'error' => ''],
    null,
    static function (string $n, string $v, array $o): void {},
    static function (): void {},
    static fn(): bool => true,
    static fn(string $sql): string => $sql,
    $s3, $c3
);
assertSame(false, $mgr3->getAccessToken(6), '503 returns false access token');
assertSame(true, !empty($db3->userRow['kc_refresh_token']), '503 preserves DB refresh token');
assertSame(true, !empty($s3['kc_logged_in']), '503 preserves session login flag');

// 4. invalid_grant from Keycloak drops DB refresh token & clears session
$db4 = new FakeAuthDb(['kc_refresh_token' => $mgr->encrypt('rt-revoked'), 'kc_token_expiry' => $now + 3600]);
$s4 = ['kc_logged_in' => true, 'kc_logged_in_at' => $now - 10, 'user_id' => 7];
$c4 = [];
$mgr4 = new AuthSessionManager(
    ['ENCRYPTION_KEY' => $key, 'KC_URL' => 'https://kc.test', 'KC_REALM' => 'altered'],
    static fn() => $db4,
    static fn(string $k, string $d = ''): string => $d,
    static fn(): int => $now,
    static fn(string $url, array $fields): array => ['status' => 400, 'body' => '{"error":"invalid_grant"}', 'error' => ''],
    null,
    static function (string $n, string $v, array $o): void {},
    static function (): void {},
    static fn(): bool => true,
    static fn(string $sql): string => $sql,
    $s4, $c4
);
assertSame(false, $mgr4->getAccessToken(7), 'invalid_grant returns false');
assertSame(null, $db4->userRow['kc_refresh_token'], 'invalid_grant nulls DB refresh token');
assertSame(false, isset($s4['kc_logged_in']), 'invalid_grant clears session');

// 5. ac_global_logout and kc_force_logout_at invalidate active sessions
$db5 = new FakeAuthDb(['kc_refresh_token' => $mgr->encrypt('rt-ok'), 'kc_token_expiry' => $now + 3600]);
$s5 = ['kc_logged_in' => true, 'kc_logged_in_at' => $now - 100, 'user_id' => 8, 'kc_access_token' => 'tok', 'kc_access_token_exp' => $now + 300];
$c5 = ['ac_global_logout' => (string)($now - 50)];
$mgr5 = new AuthSessionManager(
    ['ENCRYPTION_KEY' => $key, 'KC_URL' => 'https://kc.test', 'KC_REALM' => 'altered'],
    static fn() => $db5,
    static fn(string $k, string $d = ''): string => $d,
    static fn(): int => $now,
    null, null,
    static function (string $n, string $v, array $o): void {},
    static function (): void {},
    static fn(): bool => true,
    static fn(string $sql): string => $sql,
    $s5, $c5
);
assertSame(false, $mgr5->isLoggedIn(), 'ac_global_logout invalidates older session');
assertSame(false, isset($s5['kc_logged_in']), 'invalidated session is cleared');

$s6 = ['kc_logged_in' => true, 'kc_logged_in_at' => $now - 100, 'user_id' => 8, 'kc_access_token' => 'tok', 'kc_access_token_exp' => $now + 300];
$c6 = [];
$mgr6 = new AuthSessionManager(
    ['ENCRYPTION_KEY' => $key, 'KC_URL' => 'https://kc.test', 'KC_REALM' => 'altered'],
    static fn() => $db5,
    static fn(string $k, string $d = ''): string => $k === 'kc_force_logout_at' ? gmdate('Y-m-d H:i:s', $now - 20) : $d,
    static fn(): int => $now,
    null, null,
    static function (string $n, string $v, array $o): void {},
    static function (): void {},
    static fn(): bool => true,
    static fn(string $sql): string => $sql,
    $s6, $c6
);
assertSame(false, $mgr6->isLoggedIn(), 'kc_force_logout_at invalidates older session');
