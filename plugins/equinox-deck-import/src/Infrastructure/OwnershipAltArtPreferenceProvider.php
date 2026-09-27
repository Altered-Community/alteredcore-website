<?php

namespace AlteredCore\EquinoxDeckImport\Infrastructure;

use AlteredCore\EquinoxDeckImport\Port\AltArtPreferenceInterface;

/**
 * Talks to OWNERSHIP_API_URL directly (curl), the same host-functions-only dependency
 * style as KeycloakTokenProvider — no dependency on any other plugin. Any transport/API
 * error is treated as PerDeck/no-op: an import must never fail, nor silently rewrite
 * card references incorrectly, just because the ownership service is briefly
 * unreachable.
 */
final class OwnershipAltArtPreferenceProvider implements AltArtPreferenceInterface
{
    public function isGlobalMode(): bool
    {
        $data = $this->request('GET', '/api/alt-arts/preference-mode');
        return is_array($data) && ($data['mode'] ?? null) === 'Global';
    }

    public function applyPreferences(array $cards): array
    {
        if ($cards === []) {
            return $cards;
        }

        $checkItems = array_map(
            static fn(array $c): array => ['reference' => $c['cardReference'], 'quantity' => $c['quantity']],
            $cards
        );

        $result = $this->request('POST', '/api/alt-arts/apply-to-deck', $checkItems);
        if (!is_array($result) || !isset($result['lines']) || !is_array($result['lines'])) {
            return $cards;
        }

        // Lines[i] is itself a list (a shortfall/preference spread can turn one input
        // line into several) — flatten, then merge references repeated across different
        // input lines.
        $merged = [];
        foreach ($result['lines'] as $lines) {
            foreach ((array) $lines as $line) {
                if (!isset($line['reference'], $line['quantity'])) {
                    continue;
                }
                $ref = (string) $line['reference'];
                $merged[$ref] = ($merged[$ref] ?? 0) + (int) $line['quantity'];
            }
        }

        $out = [];
        foreach ($merged as $ref => $qty) {
            $out[] = ['cardReference' => $ref, 'quantity' => $qty];
        }
        return $out;
    }

    /**
     * @param array<int,mixed>|null $body
     * @return array<string,mixed>|null
     */
    private function request(string $method, string $path, ?array $body = null): ?array
    {
        if (!defined('OWNERSHIP_API_URL') || !OWNERSHIP_API_URL) {
            return null;
        }
        if (!function_exists('kcIsLoggedIn') || !\kcIsLoggedIn() || !function_exists('kc_get_access_token')) {
            return null;
        }
        $userId = (int) ($_SESSION['user_id'] ?? 0);
        if ($userId <= 0) {
            return null;
        }
        $token = \kc_get_access_token($userId);
        if (!is_string($token) || $token === '') {
            return null;
        }

        $headers = ['Authorization: Bearer ' . $token, 'Accept: application/json'];
        if ($body !== null) {
            $headers[] = 'Content-Type: application/json';
        }

        $ch = curl_init(rtrim(OWNERSHIP_API_URL, '/') . $path);
        $opts = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_USERAGENT      => 'alteredcore.org/1.0',
            CURLOPT_CUSTOMREQUEST  => $method,
        ];
        if ($body !== null) {
            $opts[CURLOPT_POSTFIELDS] = json_encode($body, JSON_UNESCAPED_UNICODE);
        }
        curl_setopt_array($ch, $opts);

        $raw = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_errno($ch);
        curl_close($ch);

        if ($err || $raw === false || $code < 200 || $code >= 300 || $raw === '') {
            return null;
        }
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : null;
    }
}
