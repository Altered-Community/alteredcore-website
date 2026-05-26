<?php
require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/includes/functions.php';

header('Content-Type: application/json');

// Only admins with at least one appearance-related section can upload
$_canUpload = false;
foreach (['banner','background','logo','font','footer','privacy'] as $_s) {
    if (adminHasSection($_s)) { $_canUpload = true; break; }
}
if (!$_canUpload) {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($_FILES['file'])) {
    http_response_code(400);
    echo json_encode(['error' => 'No file provided']);
    exit;
}

if (!csrfValid($_POST['csrf_token'] ?? '')) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid CSRF token']);
    exit;
}

$file  = $_FILES['file'];
$errMsg = validateImageUpload($file);
if ($errMsg) {
    http_response_code(400);
    echo json_encode(['error' => $errMsg]);
    exit;
}

$ext     = imageExtFromMime($file['tmp_name']);
$destDir = dirname(__DIR__) . '/uploads/editor/';
if (!is_dir($destDir)) mkdir($destDir, 0755, true);

$filename = date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
$dest     = $destDir . $filename;

if (!move_uploaded_file($file['tmp_name'], $dest)) {
    http_response_code(500);
    echo json_encode(['error' => 'Could not save file']);
    exit;
}

echo json_encode(['location' => BASE_URL . '/uploads/editor/' . $filename]);
