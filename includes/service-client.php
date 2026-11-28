<?php
/**
 * Deep HTTP client for server-to-server Altered service calls (Decks, Collection,
 * Ownership, Uniques/Cards, GameApi, Formats).
 *
 * Centralizes:
 * - cURL transport defaults (timeouts, HTTP/HTTPS protocol restriction, gzip decoding)
 * - PHP session lock discipline (session_write_close() before blocking I/O)
 * - Keycloak bearer token injection with single 401 refresh-and-retry
 * - API-Platform violation/detail error extraction
 * - Injectable transport / tokenProvider / sessionLock seams for deterministic unit tests
 */

final class AcHttpRequest
{
    public string $method;
    public string $url;
    /** @var array<int, string> */
    public array $headers;
    public ?string $body;
    public int $timeout;
    public int $connectTimeout;
    public bool $followLocation;
    public ?int $userId;
    public ?string $bearerToken;
    public bool $retryOn401;

    /**
     * @param array<int, string> $headers
     */
    public function __construct(
        string $method,
        string $url,
        array $headers = [],
        ?string $body = null,
        int $timeout = 15,
        int $connectTimeout = 5,
        bool $followLocation = false,
        ?int $userId = null,
        ?string $bearerToken = null,
        bool $retryOn401 = true
    ) {
        $this->method         = strtoupper($method);
        $this->url            = $url;
        $this->headers        = $headers;
        $this->body           = $body;
        $this->timeout        = $timeout;
        $this->connectTimeout = $connectTimeout;
        $this->followLocation = $followLocation;
        $this->userId         = $userId;
        $this->bearerToken    = $bearerToken;
        $this->retryOn401     = $retryOn401;
    }

    /**
     * Convenience builder for JSON payloads.
     *
     * @param mixed $data
     * @param array<int, string> $extraHeaders
     */
    public static function json(
        string $method,
        string $url,
        $data = null,
        ?int $userId = null,
        string $contentType = 'application/json',
        array $extraHeaders = [],
        int $timeout = 15,
        ?string $bearerToken = null
    ): self {
        $headers = array_merge(['Accept: application/json'], $extraHeaders);
        $body = null;
        if ($data !== null) {
            $headers[] = 'Content-Type: ' . $contentType;
            $body = is_string($data) ? $data : json_encode($data, JSON_UNESCAPED_UNICODE);
        }
        return new self($method, $url, $headers, $body, $timeout, 5, false, $userId, $bearerToken);
    }
}

final class AcHttpResponse
{
    public int $status;
    public ?string $body;
    public string $contentType;
    public string $curlError;
    public bool $authExpired;

    public function __construct(
        int $status,
        ?string $body,
        string $contentType = '',
        string $curlError = '',
        bool $authExpired = false
    ) {
        $this->status      = $status;
        $this->body        = $body;
        $this->contentType = $contentType;
        $this->curlError   = $curlError;
        $this->authExpired = $authExpired;
    }

    public function isOk(): bool
    {
        return $this->curlError === '' && $this->status >= 200 && $this->status < 300;
    }

    public function isUnreachable(): bool
    {
        return $this->status === 0 || $this->body === null;
    }

    /** @return array<mixed>|null */
    public function json(): ?array
    {
        if ($this->body === null || $this->body === '') {
            return null;
        }
        $decoded = json_decode($this->body, true);
        return is_array($decoded) ? $decoded : null;
    }

    /**
     * Extract a human-readable detail string from an API-Platform / RFC 7807 error payload.
     */
    public function errorDetail(): string
    {
        $data = $this->json();
        if (!is_array($data)) {
            return '';
        }
        if (!empty($data['violations']) && is_array($data['violations'])) {
            return self::formatViolations($data['violations']);
        }
        if (!empty($data['detail']) && is_string($data['detail'])) {
            return $data['detail'];
        }
        if (!empty($data['title']) && is_string($data['title'])) {
            return $data['title'];
        }
        return '';
    }

    /**
     * @param array<int, array<string, mixed>> $violations
     */
    public static function formatViolations(array $violations): string
    {
        return implode(' — ', array_map(
            static function ($v): string {
                if (!is_array($v)) {
                    return '';
                }
                $path = (string)($v['propertyPath'] ?? '');
                $msg  = (string)($v['message'] ?? '');
                return ($path !== '' ? $path . ': ' : '') . $msg;
            },
            $violations
        ));
    }
}

final class AcServiceClient
{
    /** @var callable(AcHttpRequest, ?string): AcHttpResponse */
    private $transport;

    /** @var callable(int, bool): ?string */
    private $tokenProvider;

    /** @var callable(bool): void */
    private $sessionLock;

    /** @var callable(array<int, array{req: AcHttpRequest, token: ?string}>): array<int, AcHttpResponse> */
    private $multiTransport;

    private static ?self $defaultInstance = null;

    public function __construct(
        ?callable $transport = null,
        ?callable $tokenProvider = null,
        ?callable $sessionLock = null,
        ?callable $multiTransport = null
    ) {
        $this->transport      = $transport      ?? [self::class, 'curlTransport'];
        $this->tokenProvider  = $tokenProvider  ?? [self::class, 'defaultTokenProvider'];
        $this->sessionLock    = $sessionLock    ?? [self::class, 'defaultSessionLock'];
        $this->multiTransport = $multiTransport ?? [self::class, 'curlMultiTransport'];
    }

    public static function default(): self
    {
        if (self::$defaultInstance === null) {
            self::$defaultInstance = new self();
        }
        return self::$defaultInstance;
    }

    public static function setDefault(?self $client): void
    {
        self::$defaultInstance = $client;
    }

    /**
     * Send one HTTP request with session lock release during I/O and automatic single 401 refresh.
     */
    public function send(AcHttpRequest $req): AcHttpResponse
    {
        $authExpired = false;
        $token = $req->bearerToken;

        if ($token === null && $req->userId !== null && $req->userId > 0) {
            $token = ($this->tokenProvider)($req->userId, false);
            if ($token === null) {
                return new AcHttpResponse(401, null, '', '', true);
            }
        }

        ($this->sessionLock)(true);
        $res = ($this->transport)($req, $token);

        if ($res->status === 401 && $req->retryOn401 && $req->userId !== null && $req->userId > 0 && $req->bearerToken === null) {
            ($this->sessionLock)(false);
            $renewed = ($this->tokenProvider)($req->userId, true);
            ($this->sessionLock)(true);
            if ($renewed !== null) {
                $res = ($this->transport)($req, $renewed);
            } else {
                $authExpired = true;
            }
        }

        if ($authExpired || ($res->status === 401 && $token === null && $req->userId !== null && $req->userId > 0)) {
            return new AcHttpResponse($res->status, $res->body, $res->contentType, $res->curlError, true);
        }
        return $res;
    }

    /**
     * Execute multiple HTTP requests concurrently via curl_multi.
     *
     * @param array<int, AcHttpRequest> $requests
     * @return array<int, AcHttpResponse>
     */
    public function sendMulti(array $requests, ?int $userId = null): array
    {
        if (empty($requests)) {
            return [];
        }

        $sharedToken = null;
        if ($userId !== null && $userId > 0) {
            $sharedToken = ($this->tokenProvider)($userId, false);
            if ($sharedToken === null) {
                $out = [];
                foreach ($requests as $k => $_) {
                    $out[$k] = new AcHttpResponse(401, null, '', '', true);
                }
                return $out;
            }
        }

        $prepared = [];
        foreach ($requests as $k => $req) {
            $tok = $req->bearerToken ?? $sharedToken;
            if ($tok === null && $req->userId !== null && $req->userId > 0) {
                $tok = ($this->tokenProvider)($req->userId, false);
            }
            $prepared[$k] = ['req' => $req, 'token' => $tok];
        }

        ($this->sessionLock)(true);
        return ($this->multiTransport)($prepared);
    }

    private static function buildHeaders(AcHttpRequest $req, ?string $token): array
    {
        $headers = $req->headers;
        if ($token !== null && $token !== '') {
            $hasAuth = false;
            foreach ($headers as $h) {
                if (stripos($h, 'Authorization:') === 0) {
                    $hasAuth = true;
                    break;
                }
            }
            if (!$hasAuth) {
                $headers[] = 'Authorization: Bearer ' . $token;
            }
        }
        return $headers;
    }

    private static function buildCurlOptions(AcHttpRequest $req, ?string $token): array
    {
        $opts = [
            CURLOPT_CUSTOMREQUEST  => $req->method,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => self::buildHeaders($req, $token),
            CURLOPT_FOLLOWLOCATION => $req->followLocation,
            CURLOPT_ENCODING       => '',
            CURLOPT_CONNECTTIMEOUT => $req->connectTimeout,
            CURLOPT_TIMEOUT        => $req->timeout,
            CURLOPT_USERAGENT      => 'alteredcore.org/1.0',
            CURLOPT_PROTOCOLS      => CURLPROTO_HTTP | CURLPROTO_HTTPS,
        ];
        if ($req->body !== null) {
            $opts[CURLOPT_POSTFIELDS] = $req->body;
        }
        return $opts;
    }

    public static function curlTransport(AcHttpRequest $req, ?string $token): AcHttpResponse
    {
        $ch = curl_init($req->url);
        curl_setopt_array($ch, self::buildCurlOptions($req, $token));
        $out         = curl_exec($ch);
        $status      = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $contentType = (string)curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        $err         = curl_error($ch);
        $errno       = curl_errno($ch);
        curl_close($ch);

        if ($errno !== 0 || $out === false || $status === 0) {
            return new AcHttpResponse(0, null, '', $err !== '' ? $err : 'connection_error');
        }
        return new AcHttpResponse($status, (string)$out, $contentType, '');
    }

    /**
     * @param array<int, array{req: AcHttpRequest, token: ?string}> $prepared
     * @return array<int, AcHttpResponse>
     */
    public static function curlMultiTransport(array $prepared): array
    {
        $mh      = curl_multi_init();
        $handles = [];
        foreach ($prepared as $k => $entry) {
            $ch = curl_init($entry['req']->url);
            curl_setopt_array($ch, self::buildCurlOptions($entry['req'], $entry['token']));
            curl_multi_add_handle($mh, $ch);
            $handles[$k] = $ch;
        }

        $running = null;
        do {
            curl_multi_exec($mh, $running);
            if ($running > 0) {
                curl_multi_select($mh);
            }
        } while ($running > 0);

        $results = [];
        foreach ($handles as $k => $ch) {
            $out         = curl_multi_getcontent($ch);
            $status      = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
            $contentType = (string)curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
            $err         = curl_error($ch);
            $errno       = curl_errno($ch);
            curl_multi_remove_handle($mh, $ch);
            curl_close($ch);

            if ($errno !== 0 || $out === null || $out === false || $status === 0) {
                $results[$k] = new AcHttpResponse(0, null, '', $err !== '' ? $err : 'connection_error');
            } else {
                $results[$k] = new AcHttpResponse($status, (string)$out, $contentType, '');
            }
        }
        curl_multi_close($mh);
        return $results;
    }

    public static function defaultTokenProvider(int $userId, bool $forceRefresh): ?string
    {
        if ($userId <= 0) {
            return null;
        }
        if (!function_exists('kc_get_access_token')) {
            require_once __DIR__ . '/func.keycloak.php';
        }
        if ($forceRefresh) {
            if (session_status() === PHP_SESSION_NONE && !headers_sent()) {
                session_start();
            }
            unset($_SESSION['kc_access_token'], $_SESSION['kc_access_token_exp']);
        }
        $token = kc_get_access_token($userId);
        return is_string($token) && $token !== '' ? $token : null;
    }

    public static function defaultSessionLock(bool $release): void
    {
        if ($release) {
            if (session_status() === PHP_SESSION_ACTIVE) {
                session_write_close();
            }
        } else {
            if (session_status() === PHP_SESSION_NONE && !headers_sent()) {
                session_start();
            }
        }
    }
}

/**
 * Procedural facade over AcServiceClient::default()->send().
 */
function acServiceRequest(AcHttpRequest $req): AcHttpResponse
{
    return AcServiceClient::default()->send($req);
}

/**
 * Procedural facade over AcServiceClient::default()->sendMulti().
 *
 * @param array<int, AcHttpRequest> $requests
 * @return array<int, AcHttpResponse>
 */
function acServiceMulti(array $requests, ?int $userId = null): array
{
    return AcServiceClient::default()->sendMulti($requests, $userId);
}
