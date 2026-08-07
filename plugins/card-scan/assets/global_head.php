<?php
$_csConfig  = require __DIR__ . '/../config.php';
$_csPages   = array_values(array_filter(array_map('strval', (array)($_csConfig['pages'] ?? []))));
$_csApiUrl  = (string)($_csConfig['api_url'] ?? 'https://qr.alteredcore.org/api.php');
$_csCollect = !empty($_csConfig['collect']['enabled']);
?><script>
window.CS_PAGES=<?= json_encode($_csPages, JSON_UNESCAPED_UNICODE) ?>;
window.CS_API=<?= json_encode($_csApiUrl, JSON_UNESCAPED_SLASHES) ?>;
window.CS_COLLECT=<?= $_csCollect ? 'true' : 'false' ?>;
</script>
