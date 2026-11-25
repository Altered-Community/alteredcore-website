<?php
// Global <head> hook (manifest assets.global_php): hands js/booster-alert.js its settings on every
// page. Nothing is output for a visitor who is not signed in, or when the integration is off,
// so the script then does nothing at all.
if (!ownershipIsActive() || !kcIsLoggedIn()) return;

$_ownAlertTxt = [
    'en' => ['menuLabel' => 'Boosters to open'],
    'fr' => ['menuLabel' => 'Boosters à ouvrir'],
][getUiLang()];
?>
<script>window.OWN_BOOSTER_ALERT = <?= json_encode([
    'userId'      => (int)($_SESSION['user_id'] ?? 0),
    'countUrl'    => BASE_URL . '/papi/ownership/boosters-count',
    'boostersUrl' => BASE_URL . '/pages/boosters',
    'txt'         => $_ownAlertTxt,
], JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP) ?>;</script>
