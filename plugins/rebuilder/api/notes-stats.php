<?php
// /papi/rebuilder/notes-stats — note counts for site admins (manifest: "auth": "admin", GET).
header('Cache-Control: no-store, max-age=0');

$row = getDB()->query(qp("SELECT COUNT(*) AS notes, COUNT(DISTINCT user_id) AS users FROM {deck_notes}"))->fetch();
echo json_encode(['notes' => (int)$row['notes'], 'users' => (int)$row['users']]);
