<?php
// Listmonk (newsletter.altered.re) client for the "Newsletter" block of the
// account page and the homepage "Stay informed" form: reads and changes the
// subscription of ONE e-mail address to the two language lists
// (LISTMONK_LIST_EN / LISTMONK_LIST_FR, the numeric list ids -- not the UUIDs).
//
// Disabled when LISTMONK_URL is empty or undefined: the account page then shows
// no newsletter block, and the homepage form falls back to the local
// newsletter_sub table. The API user needs a Listmonk role with
// subscribers:get_all, subscribers:manage, subscribers:sql_query (the lookup by
// e-mail is an SQL expression) and lists:get_all / lists:manage_all.
//
// Every call returns null on a transport or API error (logged), so a Listmonk
// outage only hides the block instead of breaking the page.

function listmonkEnabled(): bool
{
    return defined('LISTMONK_URL') && LISTMONK_URL !== ''
        && defined('LISTMONK_LIST_EN') && defined('LISTMONK_LIST_FR');
}

function listmonkListIds(): array
{
    return [(int)LISTMONK_LIST_EN, (int)LISTMONK_LIST_FR];
}

/** @return array|null decoded JSON body, null on any error */
function listmonkRequest(string $method, string $path, ?array $payload = null)
{
    $ch = curl_init(rtrim(LISTMONK_URL, '/') . $path);
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_USERPWD        => LISTMONK_API_USER . ':' . LISTMONK_API_TOKEN,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_CONNECTTIMEOUT => 3,
        CURLOPT_TIMEOUT        => 5,
    ];
    if ($payload !== null) {
        $opts[CURLOPT_POSTFIELDS] = json_encode($payload);
    }
    curl_setopt_array($ch, $opts);
    $response = curl_exec($ch);
    $code     = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err      = curl_error($ch);
    curl_close($ch);

    if ($err || $code < 200 || $code >= 300) {
        error_log("listmonk: $method $path failed ($code) " . ($err ?: substr((string)$response, 0, 300)));
        return null;
    }
    return json_decode((string)$response, true) ?: [];
}

/**
 * The subscriber holding $email, or [] when there is none; null on error.
 * Keys: id, status (enabled|blocklisted), subscribed (bool: confirmed or
 * unconfirmed on one of the two lists).
 */
function listmonkFindSubscriber(string $email)
{
    // `query` is an SQL expression: quote the e-mail as an SQL string literal.
    $literal = "'" . str_replace("'", "''", strtolower($email)) . "'";
    $res = listmonkRequest('GET', '/api/subscribers?per_page=1&query='
        . rawurlencode("subscribers.email = $literal"));
    if ($res === null) {
        return null;
    }
    $sub = $res['data']['results'][0] ?? null;
    if (!$sub) {
        return [];
    }
    $subscribed = false;
    foreach ($sub['lists'] ?? [] as $list) {
        if (in_array((int)$list['id'], listmonkListIds(), true)
            && ($list['subscription_status'] ?? '') !== 'unsubscribed') {
            $subscribed = true;
        }
    }
    return ['id' => (int)$sub['id'], 'status' => $sub['status'], 'subscribed' => $subscribed];
}

/**
 * Subscribes $email to the list of $lang ('fr' -> FR, anything else -> EN),
 * confirmed straight away (single opt-in). Creates the subscriber if needed.
 * Returns 'subscribed', 'already' (already on one of the two lists),
 * 'blocklisted' or 'error'.
 */
function listmonkSubscribe(string $email, string $name, string $lang, array $attribs): string
{
    $listId = $lang === 'fr' ? (int)LISTMONK_LIST_FR : (int)LISTMONK_LIST_EN;
    $sub = listmonkFindSubscriber($email);
    if ($sub === null) {
        return 'error';
    }
    if (($sub['status'] ?? '') === 'blocklisted') {
        return 'blocklisted';
    }
    if (!empty($sub['subscribed'])) {
        return 'already';
    }
    if (!$sub) {
        $ok = listmonkRequest('POST', '/api/subscribers', [
            'email'                    => strtolower($email),
            'name'                     => $name,
            'status'                   => 'enabled',
            'lists'                    => [$listId],
            'attribs'                  => $attribs,
            'preconfirm_subscriptions' => true,
        ]) !== null;
    } else {
        $ok = listmonkRequest('PUT', '/api/subscribers/lists', [
            'ids'             => [$sub['id']],
            'action'          => 'add',
            'target_list_ids' => [$listId],
            'status'          => 'confirmed',
        ]) !== null;
    }
    return $ok ? 'subscribed' : 'error';
}

/** Unsubscribes $email from both lists; true when there was nothing to do. */
function listmonkUnsubscribe(string $email): bool
{
    $sub = listmonkFindSubscriber($email);
    if ($sub === null) {
        return false;
    }
    if (!$sub) {
        return true;
    }
    return listmonkRequest('PUT', '/api/subscribers/lists', [
        'ids'             => [$sub['id']],
        'action'          => 'unsubscribe',
        'target_list_ids' => listmonkListIds(),
    ]) !== null;
}
