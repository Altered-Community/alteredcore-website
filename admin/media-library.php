<?php
require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/includes/functions.php';

header('Content-Type: application/json');

if (!canViewAdminPanel()) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'Forbidden']);
    exit;
}
// Local admin has full access; Keycloak users need create or edit permission to manage media
if (empty($_SESSION['admin_logged_in']) && !adminCanCreate() && !adminCanEdit()) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'Forbidden']);
    exit;
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$folder = preg_replace('/[^a-z0-9_-]/', '', $_GET['folder'] ?? $_POST['folder'] ?? '');

// list all upload folders (no folder param needed)
if ($action === 'list-folders') {
    $uploadsDir = dirname(__DIR__) . '/uploads/';
    $folders = [];
    if (is_dir($uploadsDir)) {
        foreach (scandir($uploadsDir) as $item) {
            if ($item[0] === '.') continue;
            if (!is_dir($uploadsDir . $item)) continue;
            if (!preg_match('/^[a-z0-9_-]+$/', $item)) continue;
            $count = 0;
            $exts  = ['jpg','jpeg','png','webp','gif','svg'];
            foreach (scandir($uploadsDir . $item) as $f) {
                if (in_array(strtolower(pathinfo($f, PATHINFO_EXTENSION)), $exts, true)) $count++;
            }
            $folders[] = ['name' => $item, 'count' => $count];
        }
    }
    echo json_encode(['ok' => true, 'folders' => $folders]);
    exit;
}

// create new folder
if ($action === 'create-folder') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        echo json_encode(['ok' => false, 'error' => 'Invalid token']); exit;
    }
    if ($folder === '') {
        echo json_encode(['ok' => false, 'error' => 'Invalid folder name']); exit;
    }
    $newDir = dirname(__DIR__) . '/uploads/' . $folder . '/';
    if (is_dir($newDir)) {
        echo json_encode(['ok' => false, 'error' => 'Folder already exists']); exit;
    }
    if (!mkdir($newDir, 0755, true)) {
        echo json_encode(['ok' => false, 'error' => 'Could not create folder']); exit;
    }
    echo json_encode(['ok' => true, 'folder' => $folder]);
    exit;
}

if ($folder === '') {
    echo json_encode(['ok' => false, 'error' => 'Missing folder']);
    exit;
}

$folderDir = dirname(__DIR__) . '/uploads/' . $folder . '/';
$folderUrl = BASE_URL . '/uploads/' . $folder . '/';

// list images in folder
if ($action === 'list') {
    $images = [];
    if (is_dir($folderDir)) {
        $files = array_diff(scandir($folderDir), ['.', '..']);
        rsort($files);
        $exts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'];
        foreach ($files as $file) {
            if (!in_array(strtolower(pathinfo($file, PATHINFO_EXTENSION)), $exts, true)) continue;
            $images[] = [
                'path' => 'uploads/' . $folder . '/' . $file,
                'url'  => $folderUrl . rawurlencode($file),
                'name' => $file,
                'size' => filesize($folderDir . $file),
            ];
        }
    }
    echo json_encode(['ok' => true, 'images' => $images]);
    exit;
}

// delete image
if ($action === 'delete') {
    if (!adminCanDelete()) {
        echo json_encode(['ok' => false, 'error' => 'Permission denied']); exit;
    }
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        echo json_encode(['ok' => false, 'error' => 'Invalid token']); exit;
    }
    $filename  = basename($_POST['file'] ?? '');
    if ($filename === '') {
        echo json_encode(['ok' => false, 'error' => 'Missing file']); exit;
    }
    $fullPath   = $folderDir . $filename;
    $allowedBase = realpath(dirname(__DIR__) . '/uploads');
    $realPath    = realpath($fullPath);
    if (!$realPath || !$allowedBase || strpos($realPath, $allowedBase . DIRECTORY_SEPARATOR) !== 0) {
        echo json_encode(['ok' => false, 'error' => 'Invalid path']); exit;
    }
    if (!unlink($realPath)) {
        echo json_encode(['ok' => false, 'error' => 'Could not delete file']); exit;
    }
    echo json_encode(['ok' => true]);
    exit;
}

// upload new image
if ($action === 'upload') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
        exit;
    }
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        http_response_code(403);
        echo json_encode(['ok' => false, 'error' => 'Invalid CSRF token']);
        exit;
    }
    if (!isset($_FILES['file']) || $_FILES['file']['error'] === UPLOAD_ERR_NO_FILE) {
        echo json_encode(['ok' => false, 'error' => 'No file provided']);
        exit;
    }

    $file  = $_FILES['file'];
    $isSvg = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION)) === 'svg';

    if ($isSvg) {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            echo json_encode(['ok' => false, 'error' => 'Upload error (code ' . (int)$file['error'] . ')']);
            exit;
        }
        $svgMax = defined('UPLOAD_MAX_SIZE_SVG') ? UPLOAD_MAX_SIZE_SVG : 2 * 1024 * 1024;
        if ($file['size'] > $svgMax) {
            echo json_encode(['ok' => false, 'error' => 'SVG too large (max ' . round($svgMax / (1024 * 1024)) . ' MB)']);
            exit;
        }
        $svgContent = file_get_contents($file['tmp_name']);
        if ($svgContent === false || !validateSvgUpload($svgContent)) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'SVG rejected: file contains unsafe content']);
            exit;
        }
        $ext = 'svg';
    } else {
        $errMsg = validateImageUpload($file);
        if ($errMsg) {
            echo json_encode(['ok' => false, 'error' => $errMsg]);
            exit;
        }
        $ext = imageExtFromMime($file['tmp_name']);
    }

    if (!is_dir($folderDir)) mkdir($folderDir, 0755, true);
    $basename = date('Ymd_His') . '_' . bin2hex(random_bytes(4));

    if (!$isSvg) {
        $filename = imageConvertToWebp($file['tmp_name'], $folderDir, $basename);
        if ($filename === false) {
            $filename = $basename . '.' . $ext;
            if (!move_uploaded_file($file['tmp_name'], $folderDir . $filename)) {
                echo json_encode(['ok' => false, 'error' => 'Could not save file']);
                exit;
            }
        }
    } else {
        $filename = $basename . '.' . $ext;
        if (!move_uploaded_file($file['tmp_name'], $folderDir . $filename)) {
            echo json_encode(['ok' => false, 'error' => 'Could not save file']);
            exit;
        }
    }

    $path = 'uploads/' . $folder . '/' . $filename;
    echo json_encode([
        'ok'   => true,
        'path' => $path,
        'url'  => BASE_URL . '/' . $path,
        'name' => $filename,
    ]);
    exit;
}

echo json_encode(['ok' => false, 'error' => 'Unknown action']);
