<?php
$_hwConfig = require __DIR__ . '/../config.php';
$_hwPages  = array_values(array_filter(array_map('strval', (array)($_hwConfig['pages'] ?? []))));
?><script>window.HW_PAGES=<?= json_encode($_hwPages, JSON_UNESCAPED_UNICODE) ?>;</script>
