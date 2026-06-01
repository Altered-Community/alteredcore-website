<?php
// Generic image upload endpoint for plugin TinyMCE editors.
// POST params: file (image), plugin (plugin id slug), section (admin section slug).
// Returns JSON {location: "..."} on success or {error: "..."} on failure.
// Auth: the caller must pass the plugin's admin section slug; access is granted only
// if the current admin session has that section in its permissions.
require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/includes/functions.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Validate section access — reuses the same ACL as the admin panel.
$_section = preg_replace('/[^a-z0-9_-]/', '', $_POST['section'] ?? '');
if ($_section === '' || !adminHasSection($_section)) {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden']);
    exit;
}

// Plugin id determines the upload subdirectory name (uploads/p_{plugin}/).
$_plugin = preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST['plugin'] ?? '');
if ($_plugin === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Missing plugin id']);
    exit;
}

if (empty($_FILES['file'])) {
    http_response_code(400);
    echo json_encode(['error' => 'No file provided']);
    exit;
}

$_file   = $_FILES['file'];
$_errMsg = validateImageUpload($_file);
if ($_errMsg) {
    http_response_code(400);
    echo json_encode(['error' => $_errMsg]);
    exit;
}

$_destDir = dirname(__DIR__) . '/uploads/p_' . $_plugin . '/';
if (!is_dir($_destDir)) mkdir($_destDir, 0755, true);

$_basename = date('Ymd_His') . '_' . bin2hex(random_bytes(4));
$_filename = imageConvertToWebp($_file['tmp_name'], $_destDir, $_basename);
if ($_filename === false) {
    $_ext      = imageExtFromMime($_file['tmp_name']);
    $_filename = $_basename . '.' . $_ext;
    if (!move_uploaded_file($_file['tmp_name'], $_destDir . $_filename)) {
        http_response_code(500);
        echo json_encode(['error' => 'Could not save file']);
        exit;
    }
}

echo json_encode(['location' => BASE_URL . '/uploads/p_' . $_plugin . '/' . $_filename]);
