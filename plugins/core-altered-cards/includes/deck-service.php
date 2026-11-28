<?php
/**
 * Deep service for Altered Decks API operations used by core-altered-cards pages.
 *
 * Built on AcServiceClient (injectable for unit tests), consolidating decklist
 * import, Altered.gg import, listing, defensive sorting, ownership checks,
 * rename/visibility/archive/delete/duplicate, and upvotes behind one clean seam.
 */

require_once dirname(__DIR__, 3) . '/includes/service-client.php';

final class DeckService
{
    private string $decksApiUrl;
    private AcServiceClient $client;

    public function __construct(?string $decksApiUrl = null, ?AcServiceClient $client = null)
    {
        $this->decksApiUrl = rtrim(
            $decksApiUrl ?? (defined('DECKS_API_URL') ? (string)DECKS_API_URL : ''),
            '/'
        );
        $this->client = $client ?? AcServiceClient::default();
    }

    // ── Pure parsers & payload builders ─────────────────────────────────────

    /**
     * Parse plain-text decklist lines (`3 ALT_CORE_B_AX_02_C`).
     *
     * @return list<array{cardReference: string, quantity: int}>
     */
    public static function parseDecklist(string $text): array
    {
        $lines     = explode("\n", str_replace("\r", '', trim($text)));
        $deckCards = [];
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || $line[0] === '#') {
                continue;
            }
            if (preg_match('/^(\d+)\s+(ALT_\S+)$/i', $line, $m)) {
                $deckCards[] = ['cardReference' => $m[2], 'quantity' => (int)$m[1]];
            }
        }
        return $deckCards;
    }

    /**
     * Extract an Altered.gg deck ID from a full URL or raw ID string.
     */
    public static function parseAlteredGgId(string $input): ?string
    {
        $input = trim($input);
        if (preg_match('#altered\.gg/(?:[^/]+/)?decks/([A-Z0-9]+)#i', $input, $m)) {
            return strtoupper($m[1]);
        }
        if (preg_match('/^[A-Z0-9]{10,}$/i', $input)) {
            return strtoupper($input);
        }
        return null;
    }

    /**
     * Convert an Altered.gg `deck_user_lists` payload into a Decks API POST payload.
     *
     * @param array<string, mixed> $ggData
     * @param array<string, array<string, mixed>> $formats
     * @return array<string, mixed>|null null when the source contains no valid cards
     */
    public static function buildAlteredGgImportPayload(
        array $ggData,
        array $formats,
        string $fallbackName = 'Unnamed'
    ): ?array {
        $deckName   = trim((string)($ggData['name'] ?? '')) ?: $fallbackName;
        $heroRef    = $ggData['alterator']['reference'] ?? null;
        $ggFormat   = strtoupper(trim((string)($ggData['eventFormat'] ?? '')));
        $deckFormat = 'sandbox';
        foreach ($formats as $fmtKey => $fmtData) {
            if (isset($fmtData['gg_format']) && $fmtData['gg_format'] === $ggFormat) {
                $deckFormat = (string)$fmtKey;
                break;
            }
        }

        $deckCards = [];
        if (is_string($heroRef) && $heroRef !== '') {
            $deckCards[] = ['cardReference' => $heroRef, 'quantity' => 1];
        }
        foreach (is_array($ggData['deckCardsByType'] ?? null) ? $ggData['deckCardsByType'] : [] as $typeData) {
            if (!is_array($typeData)) {
                continue;
            }
            foreach (is_array($typeData['deckUserListCard'] ?? null) ? $typeData['deckUserListCard'] : [] as $entry) {
                $ref = is_array($entry) ? ($entry['card']['reference'] ?? null) : null;
                $qty = is_array($entry) ? (int)($entry['quantity'] ?? 0) : 0;
                if (is_string($ref) && $ref !== '' && $qty > 0) {
                    $deckCards[] = ['cardReference' => $ref, 'quantity' => $qty];
                }
            }
        }

        if (empty($deckCards)) {
            return null;
        }

        return [
            'name'      => $deckName,
            'format'    => $deckFormat,
            'isPublic'  => false,
            'isDraft'   => false,
            'deckCards' => $deckCards,
        ];
    }

    /**
     * Defensively re-sort a Decks API collection envelope (`member` / `hydra:member` / flat list).
     *
     * @param array<mixed> $data
     * @return array<mixed>
     */
    public static function sortDeckListPayload(array $data, string $field, string $dir): array
    {
        $cmp = static function ($a, $b) use ($field, $dir): int {
            $va = is_array($a) ? ($a[$field] ?? '') : '';
            $vb = is_array($b) ? ($b[$field] ?? '') : '';
            $r  = $field === 'name'
                ? strcasecmp((string)$va, (string)$vb)
                : strcmp((string)$va, (string)$vb);
            return $dir === 'desc' ? -$r : $r;
        };

        if (isset($data['member']) && is_array($data['member'])) {
            usort($data['member'], $cmp);
        } elseif (isset($data['hydra:member']) && is_array($data['hydra:member'])) {
            usort($data['hydra:member'], $cmp);
        } elseif (isset($data[0]) || empty($data)) {
            usort($data, $cmp);
        }
        return $data;
    }

    // ── Remote Decks API operations ─────────────────────────────────────────

    public function listPublic(array $filters, string $lang, ?int $userId, string $publicPath = '/api/decks/public'): AcHttpResponse
    {
        $page   = max(1, (int)($filters['page'] ?? 1));
        $format = (string)($filters['format'] ?? '');
        if (!preg_match('/^[a-z_]*$/', $format)) {
            $format = '';
        }
        $order = (string)($filters['order'] ?? 'updatedAt');
        $dir   = (string)($filters['dir'] ?? 'desc');
        if (!in_array($order, ['createdAt', 'updatedAt', 'name', 'upvoteCount'], true)) {
            $order = 'updatedAt';
        }
        if (!in_array($dir, ['asc', 'desc'], true)) {
            $dir = 'desc';
        }
        if ($order === 'upvoteCount') {
            $dir = 'desc';
        }

        $faction = (string)($filters['faction'] ?? '');
        if (!preg_match('/^[A-Z]{2}$/', $faction)) {
            $faction = '';
        }
        $hero = (string)($filters['hero'] ?? '');
        if (!preg_match('/^[A-Z0-9_]+$/', $hero)) {
            $hero = '';
        }
        $q = trim((string)($filters['q'] ?? ''));
        if (mb_strlen($q) > 100) {
            $q = mb_substr($q, 0, 100);
        }

        $apiParams = ['page' => $page, 'itemsPerPage' => 24, 'locale' => $lang];
        if ($format  !== '') $apiParams['format']  = strtolower($format);
        if ($faction !== '') $apiParams['faction'] = $faction;
        if ($hero    !== '') $apiParams['hero']    = $hero;
        if ($q       !== '') $apiParams['name']    = $q;

        $url = $this->decksApiUrl . $publicPath . '?' . http_build_query($apiParams) . '&order[' . $order . ']=' . $dir;
        $req = new AcHttpRequest('GET', $url, ['Accept: application/json'], null, 10, 5, false, $userId);
        return $this->client->send($req);
    }

    /**
     * @return array{response: AcHttpResponse, order: string, dir: string}
     */
    public function listMine(array $filters, string $lang, int $userId): array
    {
        $page   = max(1, (int)($filters['page'] ?? 1));
        $format = (string)($filters['format'] ?? '');
        if (!preg_match('/^[a-z0-9_-]*$/', $format)) {
            $format = '';
        }
        $isPublic = (string)($filters['isPublic'] ?? '');
        $isDraft  = (string)($filters['isDraft'] ?? '');
        $order    = (string)($filters['order'] ?? 'updatedAt');
        $dir      = (string)($filters['dir'] ?? 'desc');
        if (!in_array($order, ['createdAt', 'updatedAt', 'name'], true)) {
            $order = 'updatedAt';
        }
        if (!in_array($dir, ['asc', 'desc'], true)) {
            $dir = 'desc';
        }
        $faction = (string)($filters['faction'] ?? '');
        if (!preg_match('/^[A-Z]{2}$/', $faction)) {
            $faction = '';
        }
        $hero = (string)($filters['hero'] ?? '');
        if (!preg_match('/^[A-Z0-9_]+$/', $hero)) {
            $hero = '';
        }

        $apiParams = ['page' => $page, 'itemsPerPage' => 24, 'locale' => $lang];
        if ($format   !== '') $apiParams['format']   = $format;
        if ($isPublic !== '') $apiParams['isPublic'] = $isPublic === '1' ? 'true' : 'false';
        if ($isDraft  !== '') $apiParams['isDraft']  = $isDraft === '1' ? 'true' : 'false';
        if ($faction  !== '') $apiParams['faction']  = $faction;
        if ($hero     !== '') $apiParams['hero']     = $hero;

        $url = $this->decksApiUrl . '/api/decks?' . http_build_query($apiParams) . '&order[' . $order . ']=' . $dir;
        $req = new AcHttpRequest('GET', $url, ['Accept: application/json'], null, 10, 5, false, $userId);
        return ['response' => $this->client->send($req), 'order' => $order, 'dir' => $dir];
    }

    public function get(string $deckId, string $lang, ?int $userId = null): AcHttpResponse
    {
        $url = $this->decksApiUrl . '/api/decks/' . rawurlencode($deckId) . '?locale=' . rawurlencode($lang);
        $req = new AcHttpRequest('GET', $url, ['Accept: application/json'], null, 15, 5, false, $userId);
        return $this->client->send($req);
    }

    public function isOwnedBy(string $deckId, int $userId): bool
    {
        if ($userId <= 0 || $deckId === '') {
            return false;
        }
        $url = $this->decksApiUrl . '/api/decks?' . http_build_query(['itemsPerPage' => 1000]);
        $res = $this->client->send(new AcHttpRequest('GET', $url, ['Accept: application/json'], null, 10, 5, false, $userId));
        if ($res->status !== 200) {
            return false;
        }
        $data = $res->json();
        if (!is_array($data)) {
            return false;
        }
        $items = $data['data'] ?? ($data['member'] ?? (isset($data[0]['id']) ? $data : []));
        if (!is_array($items)) {
            return false;
        }
        return in_array($deckId, array_column($items, 'id'), true);
    }

    public function create(array $payload, int $userId): AcHttpResponse
    {
        $req = AcHttpRequest::json('POST', $this->decksApiUrl . '/api/decks', $payload, $userId);
        return $this->client->send($req);
    }

    public function patch(string $deckId, array $fields, int $userId): AcHttpResponse
    {
        $url = $this->decksApiUrl . '/api/decks/' . rawurlencode($deckId);
        $req = AcHttpRequest::json('PATCH', $url, $fields, $userId, 'application/merge-patch+json');
        return $this->client->send($req);
    }

    public function rename(string $deckId, string $name, int $userId): AcHttpResponse
    {
        return $this->patch($deckId, ['name' => $name], $userId);
    }

    public function makePublic(string $deckId, int $userId): AcHttpResponse
    {
        return $this->patch($deckId, ['isPublic' => true], $userId);
    }

    public function setArchived(string $deckId, bool $archived, int $userId): AcHttpResponse
    {
        return $this->patch($deckId, ['isDraft' => $archived], $userId);
    }

    public function delete(string $deckId, int $userId): AcHttpResponse
    {
        $url = $this->decksApiUrl . '/api/decks/' . rawurlencode($deckId);
        return $this->client->send(new AcHttpRequest('DELETE', $url, ['Accept: application/json'], null, 15, 5, false, $userId));
    }

    /**
     * Fetch a source deck authoritatively and create a private, active duplicate
     * preserving `altArtOverrides` via `cacBuildDuplicateDeckPayload()`.
     *
     * @return array{ok: bool, id?: string, status: int, errorKey?: string, detail?: string}
     */
    public function duplicate(string $deckId, string $desiredName, string $defaultSuffix, string $lang, int $userId): array
    {
        $srcRes = $this->get($deckId, $lang, $userId);
        if (!$srcRes->isOk()) {
            return ['ok' => false, 'status' => $srcRes->status, 'errorKey' => 'err_api'];
        }
        $source = $srcRes->json();
        if (!is_array($source) || empty(cacDeckContentForWrite($source)['deckCards'])) {
            return ['ok' => false, 'status' => 404, 'errorKey' => 'not_found'];
        }

        $newName = trim($desiredName);
        if ($newName === '') {
            $newName = (string)($source['name'] ?? '') . $defaultSuffix;
        }
        $payload = cacBuildDuplicateDeckPayload($source, $newName);
        $res     = $this->create($payload, $userId);
        if ($res->isOk()) {
            $created = $res->json();
            return ['ok' => true, 'id' => (string)($created['id'] ?? ''), 'status' => $res->status];
        }
        return [
            'ok'       => false,
            'status'   => $res->status,
            'errorKey' => 'duplicate_err',
            'detail'   => $res->errorDetail(),
        ];
    }

    /**
     * Fetch a public Altered.gg deck by URL/ID and create a copy in the Decks API.
     *
     * @param array<string, array<string, mixed>> $formats
     * @return array{ok: bool, id?: ?string, status: int, errorKey?: string, detail?: string}
     */
    public function importFromAlteredGg(string $ggInput, array $formats, string $fallbackName, int $userId): array
    {
        $ggId = self::parseAlteredGgId($ggInput);
        if ($ggId === null) {
            return ['ok' => false, 'status' => 400, 'errorKey' => 'import_gg_err_invalid'];
        }

        $ggRes = $this->client->send(new AcHttpRequest(
            'GET',
            'https://api.altered.gg/deck_user_lists/' . rawurlencode($ggId),
            ['Accept: application/json'],
            null,
            15
        ));
        if ($ggRes->status !== 200) {
            return ['ok' => false, 'status' => $ggRes->status, 'errorKey' => 'import_gg_err_fetch'];
        }
        $ggData = $ggRes->json();
        if (!is_array($ggData)) {
            return ['ok' => false, 'status' => $ggRes->status, 'errorKey' => 'import_gg_err_fetch'];
        }

        $payload = self::buildAlteredGgImportPayload($ggData, $formats, $fallbackName);
        if ($payload === null) {
            return ['ok' => false, 'status' => 400, 'errorKey' => 'import_gg_err_empty'];
        }

        $saveRes = $this->create($payload, $userId);
        if ($saveRes->isOk()) {
            $data = $saveRes->json();
            return ['ok' => true, 'id' => $data['id'] ?? null, 'status' => $saveRes->status];
        }
        return [
            'ok'       => false,
            'status'   => $saveRes->status,
            'errorKey' => 'import_err_save',
            'detail'   => $saveRes->errorDetail(),
        ];
    }

    /** @return array{upvoteCount: int, hasUpvoted: bool}|null */
    public function upvote(string $deckId, int $userId): ?array
    {
        $url = $this->decksApiUrl . '/api/decks/' . rawurlencode($deckId) . '/upvote';
        $res = $this->client->send(AcHttpRequest::json('POST', $url, '{}', $userId));
        if (!$res->isOk()) {
            return null;
        }
        $data = $res->json();
        if (!is_array($data)) {
            return null;
        }
        return [
            'upvoteCount' => (int)($data['upvoteCount'] ?? 0),
            'hasUpvoted'  => !empty($data['hasUpvoted']),
        ];
    }
}
