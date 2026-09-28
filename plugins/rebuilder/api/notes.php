<?php
// /papi/rebuilder/notes — the signed-in user's private note on a deck, stored in the site
// database ({deck_notes}). The router has already checked the manifest rules: GET or PUT only,
// a signed-in user, the CSRF token on PUT.
//
//   GET /papi/rebuilder/notes?deck={id}          → { deck, body, updatedAt }  (body '' when none)
//   PUT /papi/rebuilder/notes  { deck, body }    → same; an empty body deletes the note
header('Cache-Control: no-store, max-age=0');

const RB_NOTE_MAX = 5000;

function rbReply(int $status, array $body): void {
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$userId = (int)($_SESSION['user_id'] ?? 0);
if ($userId <= 0) rbReply(401, ['error' => 'unauthenticated']);

$put  = $_SERVER['REQUEST_METHOD'] === 'PUT';
$in   = $put ? pluginApiBody() : $_GET;
$deck = is_string($in['deck'] ?? null) ? $in['deck'] : '';
if (!preg_match('/^[A-Za-z0-9_-]{1,64}$/', $deck)) rbReply(400, ['error' => 'bad_deck']);

$db = getDB();
if ($put) {
    $body = is_string($in['body'] ?? null) ? trim($in['body']) : '';
    if (mb_strlen($body) > RB_NOTE_MAX) rbReply(413, ['error' => 'note_too_long', 'max' => RB_NOTE_MAX]);
    if ($body === '') {
        $db->prepare(qp("DELETE FROM {deck_notes} WHERE user_id = :u AND deck_id = :d"))->execute([':u' => $userId, ':d' => $deck]);
    } else {
        $db->prepare(qp("INSERT INTO {deck_notes} (user_id, deck_id, body) VALUES (:u, :d, :b)
                         ON DUPLICATE KEY UPDATE body = VALUES(body)"))
           ->execute([':u' => $userId, ':d' => $deck, ':b' => $body]);
    }
}

$row = $db->prepare(qp("SELECT body, updated_at FROM {deck_notes} WHERE user_id = :u AND deck_id = :d"));
$row->execute([':u' => $userId, ':d' => $deck]);
$note = $row->fetch();
rbReply(200, ['deck' => $deck, 'body' => $note ? $note['body'] : '', 'updatedAt' => $note ? $note['updated_at'] : null]);
