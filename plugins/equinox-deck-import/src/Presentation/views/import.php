<?php
/**
 * Upload view (global namespace → host h() resolves directly). Variables are
 * provided by ImportView::render(): $pageTitle, $intro, $fileLabel, $submit,
 * $noscript, $csrf, $siteBase, $jsTxt.
 *
 * The front-end queue (js/) intercepts the form, uploads to parse-zip, then
 * imports each deck via import-deck — rendering progress into .container.
 */
?>
<script>
var SITE_BASE = <?= json_encode($siteBase, JSON_UNESCAPED_SLASHES) ?>;
var EDI_CSRF = <?= json_encode($csrf) ?>;
var EDI_TXT = <?= json_encode($jsTxt, JSON_UNESCAPED_UNICODE) ?>;
</script>
<div class="ac-page edi-page">

    <header class="ac-page-header">
        <div>
            <h1 class="ac-page-header__title"><?= h($pageTitle) ?></h1>
        </div>
    </header>

    <noscript>
        <div class="ac-notice ac-notice--warning edi-noscript" role="status">
            <?= ac_icon('triangle-alert') ?><div><?= h($noscript) ?></div>
        </div>
    </noscript>

    <div class="ac-card edi-form-card">
        <ol class="edi-steps">
            <li><span><?= $step1 ?></span></li>
            <li><span><?= $step2 ?></span></li>
        </ol>

        <p class="edi-intro"><?= $intro ?></p>

        <form method="post" enctype="multipart/form-data" class="ac-stack">
            <input type="hidden" name="csrf_token" value="<?= h($csrf) ?>">

            <div class="ac-field">
                <label class="ac-field__label" for="edi-zip">
                    <?= ac_icon('file-archive') ?> <?= h($fileLabel) ?>
                </label>
                <input type="file" id="edi-zip" name="equinox_zip" class="form-control" accept=".zip,application/zip">
            </div>

            <div>
                <button type="submit" class="ac-button ac-button--sm">
                    <?= ac_icon('file-input') ?><?= h($submit) ?>
                </button>
            </div>
        </form>
    </div>

</div>
