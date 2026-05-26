<?php
require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/includes/functions.php';

header('Content-Type: application/json');

if (!adminCanEdit()) {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

if (!csrfValid($_POST['csrf_token'] ?? '')) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid CSRF token']);
    exit;
}

if (!defined('TRANSLATE_URL') || !defined('TRANSLATE_API_KEY')) {
    http_response_code(503);
    echo json_encode(['error' => 'Translation service not configured']);
    exit;
}

$content = $_POST['content'] ?? '';
$source  = $_POST['source']  ?? '';
$target  = $_POST['target']  ?? '';

$allowed = ['en', 'fr'];
if (!in_array($source, $allowed, true) || !in_array($target, $allowed, true) || $source === $target) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid language pair']);
    exit;
}

if (trim($content) === '') {
    echo json_encode(['translated' => '']);
    exit;
}

$payload = json_encode([
    'q'       => $content,
    'source'  => $source,
    'target'  => $target,
    'format'  => 'html',
    'api_key' => TRANSLATE_API_KEY,
]);

$ch = curl_init(TRANSLATE_URL);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    CURLOPT_TIMEOUT        => 30,
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($response === false || $httpCode !== 200) {
    http_response_code(502);
    $decoded = json_decode($response, true);
    echo json_encode(['error' => $decoded['error'] ?? 'Translation service unavailable (HTTP ' . $httpCode . ')']);
    exit;
}

$data = json_decode($response, true);
if (!isset($data['translatedText'])) {
    http_response_code(502);
    echo json_encode(['error' => 'Unexpected response from translation service']);
    exit;
}

echo json_encode(['translated' => $data['translatedText']]);
