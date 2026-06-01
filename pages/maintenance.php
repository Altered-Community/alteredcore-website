<?php
// Included by checkMaintenance() in functions.php
// Variables available: $lang, $title, $text, $siteName
// Headers (503 + Retry-After) already sent before this include
?><!DOCTYPE html>
<html lang="<?= isset($lang) ? htmlspecialchars($lang, ENT_QUOTES) : 'en' ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars(isset($title) ? $title : 'Maintenance', ENT_QUOTES) ?> — <?= htmlspecialchars(isset($siteName) ? $siteName : 'AlteredCore', ENT_QUOTES) ?></title>
    <link rel="stylesheet" href="<?= defined('BASE_URL') ? BASE_URL : '' ?>/css/maintenance.css">
</head>
<body>
    <div class="maintenance-box">
        <img src="<?= defined('BASE_URL') ? BASE_URL : '' ?>/assets/img/sadrobot.webp" alt="" class="maintenance-icon" loading="lazy">
        <h1><?= htmlspecialchars(isset($title) ? $title : 'Under Maintenance', ENT_QUOTES) ?></h1>
        <p><?= nl2br(htmlspecialchars(isset($text) ? $text : '', ENT_QUOTES)) ?></p>
        <span class="site-name"><?= htmlspecialchars(isset($siteName) ? $siteName : '', ENT_QUOTES) ?></span>
    </div>
</body>
</html>
