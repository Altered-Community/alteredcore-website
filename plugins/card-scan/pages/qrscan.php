<?php
// card-scan — QR scanner page (single-scan → redirect).
// If ?r= is present the request came from a legacy qr.alteredcore.org QR code — redirect immediately.
if (!empty($_GET['r'])) {
    $ref  = rawurlencode($_GET['r']);
    $lang = rawurlencode(!empty($_GET['l']) ? $_GET['l'] : 'en');
    redirect(BASE_URL . '/pages/card?ref=' . $ref . '&card_lang=' . $lang);
}

$_lang = getUiLang();
$txt = [
    'en' => [
        'page_title'  => 'Card Scanner',
        'heading'     => 'Scan a Card',
        'hint'        => 'Point the camera at an Altered card QR code',
        'scan_btn'    => 'Start scanning',
        'cancel'      => 'Cancel',
        'redirecting' => 'Redirecting…',
        'err_camera'  => 'Camera access denied or unavailable.',
        'err_qr'      => 'This QR code is not supported.',
        'err_resolve' => 'Something went wrong. Please try again.',
    ],
    'fr' => [
        'page_title'  => 'Scanner de cartes',
        'heading'     => 'Scanner une carte',
        'hint'        => 'Pointez la caméra vers un QR code de carte Altered',
        'scan_btn'    => 'Démarrer le scan',
        'cancel'      => 'Annuler',
        'redirecting' => 'Redirection…',
        'err_camera'  => 'Accès à la caméra refusé ou indisponible.',
        'err_qr'      => 'Ce QR code n\'est pas pris en charge.',
        'err_resolve' => 'Une erreur est survenue. Veuillez réessayer.',
    ],
][$_lang] ?? [];
if (empty($txt)) $txt = ['page_title'=>'Card Scanner','heading'=>'Scan a Card','hint'=>'Point the camera at an Altered card QR code','scan_btn'=>'Start scanning','cancel'=>'Cancel','redirecting'=>'Redirecting…','err_camera'=>'Camera access denied or unavailable.','err_qr'=>'This QR code is not supported.','err_resolve'=>'Something went wrong. Please try again.'];

$pageTitle     = $txt['page_title'];
$pageFullwidth = true;
?>
<style>
/* card-scan qrscan page — hero only. The scanner overlay itself lives in the global
   scanner.css (window.CardScan). Colours come from the design system tokens. */
.cs-hero      { min-height: 55vh; padding-inline: var(--ac-page-padding); }
.cs-hero-icon { --ac-icon-size: 56px; color: var(--ac-color-primary); }
</style>

<div class="cs-hero d-flex flex-column align-items-center justify-content-center text-center gap-3 py-5">
    <?= ac_icon('qr-code', 'cs-hero-icon') ?>
    <h1 class="ac-text-title mb-0"><?= h($txt['heading']) ?></h1>
    <button class="ac-button" id="cs-btn-scan" type="button">
        <?= ac_icon('camera') ?>
        <?= h($txt['scan_btn']) ?>
    </button>
</div>

<script>
(function () {
    'use strict';
    var CARD_BASE = <?= json_encode(BASE_URL . '/pages/card?ref=', JSON_UNESCAPED_SLASHES) ?>;
    var TXT = {
        hint:        <?= json_encode($txt['hint']) ?>,
        cancel:      <?= json_encode($txt['cancel']) ?>,
        redirecting: <?= json_encode($txt['redirecting']) ?>,
        errCamera:   <?= json_encode($txt['err_camera']) ?>,
        errQr:       <?= json_encode($txt['err_qr']) ?>,
        errResolve:  <?= json_encode($txt['err_resolve']) ?>
    };
    function openScanner() {
        if (!window.CardScan) return;
        window.CardScan.open({ mode: 'redirect', cardBase: CARD_BASE, txt: TXT });
    }
    // Wait for DOMContentLoaded so the global scanner.js (injected in the footer) is loaded.
    document.addEventListener('DOMContentLoaded', function () {
        var btn = document.getElementById('cs-btn-scan');
        if (btn) btn.addEventListener('click', openScanner);
        openScanner();   // auto-start on page load (matches previous behaviour)
    });
}());
</script>
