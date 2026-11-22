<?php
// Discover, section 4: Build your own deck (specifications/discover-04-decks.md). Included by pages/discover.php.
// Top: pitch, three features, depth figures and the four-step flow from account to play (no screenshot: the deckbuilder's design keeps changing).
// Beneath: the formats picker. Every format shows the same table rows, in the same order, so that moving from one
// format to the next shows what changed (add an axis as a row for all six, never inside one panel).
// Only the formats Board Game Arena supports (Singleton is left out). Frontier is the one to start with.
$_formats = [
    ['slug' => 'standard',      'deck' => 'standard'],
    ['slug' => 'nuc',           'deck' => 'nuc'],
    ['slug' => 'singleton_nuc', 'deck' => 'singleton_nuc'],
    ['slug' => 'frontier',      'deck' => 'frontier'],
    ['slug' => 'draft',         'deck' => ''],   // no deck list of its own
];
$_rows = ['size', 'copies', 'unique', 'pool', 'bga'];
$_figs = ['cards', 'sets', 'formats', 'decks'];
// Illustration beside the pitch: one of six frameless arts, one per faction, another one per visit.
$_deckArts = [
    ['FUGUE/ALT_FUGUE_B_AX_140_U_FRAMELESS_T1',    'Jefrey Yonathan'],
    ['BISE/ALT_BISE_B_BR_55_U_FRAMELESS_T1',       'Nestor Papatriantafyllou'],
    ['DUSTER/ALT_DUSTER_B_LY_89_U_FRAMELESS_T4',   'Zero Wen'],
    ['DUSTER/ALT_DUSTER_B_MU_88_R_FRAMELESS_T1',   'Matteo Spirito'],
    ['ALIZE/ALT_ALIZE_B_OR_36_U_FRAMELESS_T1',     'Nestor Papatriantafyllou'],
    ['FUGUE/ALT_FUGUE_B_YZ_133_U_FRAMELESS_T1',    'Eilene Cherie'],
];
$_deckArt = $_deckArts[array_rand($_deckArts)];
// Placed beside the whole section, title included, by pages/discover.php.
$_asideClass = ' discover-section--aside-art';
ob_start();
?>
<figure class="discover-aside">
    <img src="<?= h((defined('CDN_URL') ? CDN_URL : '') . '/illustrations/' . $_deckArt[0] . '.webp') ?>" alt="" width="744" height="1039" loading="lazy">
    <figcaption><?= h(str_replace('{artist}', $_deckArt[1], $tx['world.credit'] ?? '')) ?></figcaption>
</figure>
<?php
$_aside = ob_get_clean();
?>
<div class="discover-decks">
    <div class="discover-decks__top">
        <div class="discover-decks__main">
            <p class="discover-lead"><?= pageText($tx, 'decks.lead') ?></p>

            <ul class="discover-figures" aria-label="<?= pageText($tx, 'decks.fig.label') ?>">
                <?php foreach ($_figs as $f): ?>
                    <li class="discover-figures__item">
                        <span class="discover-figures__value"><?= pageText($tx, "decks.fig.$f.value") ?></span>
                        <span class="discover-figures__label"><?= pageText($tx, "decks.fig.$f.label") ?></span>
                    </li>
                <?php endforeach; ?>
            </ul>

            <div class="discover-flow" role="group" aria-label="<?= pageText($tx, 'decks.flow.label') ?>">
                <div class="discover-flow__group">
                    <p class="discover-flow__label"><?= pageText($tx, 'decks.flow.once') ?></p>
                    <ol class="discover-flow__steps">
                        <li class="discover-flow__step discover-flow__step--corner">
                            <img class="discover-flow__corner" src="<?= h(BASE_URL) ?>/assets/img/discover/reunion-logo.png" alt="" width="42" height="42">
                            <h4 class="discover-flow__title"><?= pageText($tx, 'decks.flow.1.title') ?></h4>
                            <p class="discover-flow__text"><?= pageText($tx, 'decks.flow.1.text') ?></p>
                            <a class="ac-button ac-button--lg discover-flow__cta" href="<?= h(BASE_URL) ?>/pages/register"><?= pageText($tx, 'decks.flow.1.cta') ?></a>
                            <p class="discover-flow__aside"><?= pageText($tx, 'decks.flow.1.signin') ?> <a href="<?= h(BASE_URL) ?>/pages/login"><?= pageText($tx, 'decks.flow.1.signin_link') ?></a></p>
                        </li>
                        <li class="discover-flow__step discover-flow__step--corner">
                            <img class="discover-flow__corner discover-flow__corner--bga" src="<?= h(BASE_URL) ?>/assets/img/bga/short_logo.png" alt="" width="56" height="56">
                            <h4 class="discover-flow__title"><?= pageText($tx, 'decks.flow.2.title') ?></h4>
                            <p class="discover-flow__text"><?= pageText($tx, 'decks.flow.2.text') ?></p>
                            <a class="ac-button ac-button--lg discover-flow__cta" href="https://boardgamearena.com/preferences?section=account" target="_blank" rel="noopener"><?= pageText($tx, 'decks.flow.2.cta') ?> <?= ac_icon('external-link', 'ac-icon--14') ?><span class="ac-sr-only">(<?= pageText($tx, 'play.external') ?>)</span></a>
                        </li>
                    </ol>
                </div>
                <div class="discover-flow__group">
                    <p class="discover-flow__label"><?= pageText($tx, 'decks.flow.every') ?></p>
                    <ol class="discover-flow__steps" start="3">
                        <li class="discover-flow__step">
                            <div class="discover-flow__option">
                                <p class="discover-flow__sub"><?= pageText($tx, 'decks.flow.3.dup.title') ?></p>
                                <a class="discover-flow__link" href="<?= h(BASE_URL) ?>/pages/decks?tab=public"><?= pageText($tx, 'decks.flow.3.dup.link') ?> <?= ac_icon('arrow-right', 'ac-icon--14') ?></a>
                            </div>
                            <p class="discover-flow__or"><span><?= pageText($tx, 'decks.flow.3.or') ?></span></p>
                            <div class="discover-flow__option">
                                <p class="discover-flow__sub"><?= pageText($tx, 'decks.flow.3.own.title') ?></p>
                                <p class="discover-flow__text"><?= pageText($tx, 'decks.flow.3.text') ?></p>
                                <a class="discover-flow__link" href="<?= h(BASE_URL) ?>/pages/deckbuilder"><?= pageText($tx, 'decks.flow.3.link') ?> <?= ac_icon('arrow-right', 'ac-icon--14') ?></a>
                            </div>
                        </li>
                        <li class="discover-flow__step">
                            <h4 class="discover-flow__title"><?= pageText($tx, 'decks.flow.4.title') ?></h4>
                            <p class="discover-flow__text"><?= pageText($tx, 'decks.flow.4.text') ?></p>
                        </li>
                    </ol>
                </div>
            </div>
        </div>
    </div>
</div>
<?php
// The formats picker keeps the full width of the section, under the illustration: pages/discover.php places it.
ob_start();
?>
    <div class="discover-formats" id="discover-formats">
        <div class="discover-chips" role="tablist" aria-label="<?= pageText($tx, 'decks.fmt.label') ?>">
            <?php foreach ($_formats as $i => $f): ?>
                <button type="button" class="discover-chip" role="tab" id="decks-tab-<?= h($f['slug']) ?>"
                        aria-controls="decks-panel-<?= h($f['slug']) ?>" aria-selected="<?= $i === 0 ? 'true' : 'false' ?>"
                        tabindex="<?= $i === 0 ? '0' : '-1' ?>" data-format="<?= h($f['slug']) ?>">
                    <span class="discover-chip__name"><?= pageText($tx, 'decks.fmt.' . $f['slug'] . '.name') ?></span>
                    <?php if ($f['slug'] === 'frontier'): ?>
                        <span class="ac-badge ac-badge--blue ac-badge--dense discover-chip__flag"><?= ac_icon('star', 'ac-icon--14') ?> <?= pageText($tx, 'decks.fmt.recommended') ?></span>
                    <?php endif; ?>
                </button>
            <?php endforeach; ?>
        </div>

        <?php foreach ($_formats as $i => $f): ?>
            <div class="discover-faction discover-format" role="tabpanel" id="decks-panel-<?= h($f['slug']) ?>"
                 aria-labelledby="decks-tab-<?= h($f['slug']) ?>" data-format="<?= h($f['slug']) ?>"<?= $i === 0 ? '' : ' hidden' ?>>
                <div class="discover-faction__text">
                    <h3 class="discover-faction__name"><?= pageText($tx, 'decks.fmt.' . $f['slug'] . '.name') ?></h3>
                    <p class="discover-faction__label"><?= pageText($tx, 'decks.fmt.what') ?></p>
                    <p class="discover-faction__copy"><?= pageText($tx, 'decks.fmt.' . $f['slug'] . '.what') ?></p>
                    <p class="discover-faction__label"><?= pageText($tx, 'decks.fmt.who') ?></p>
                    <p class="discover-faction__copy"><?= pageText($tx, 'decks.fmt.' . $f['slug'] . '.who') ?></p>
                    <p class="discover-format__links">
                        <a class="discover-faction__link" href="<?= h(BASE_URL) ?>/pages/decks<?= $f['deck'] !== '' ? '?format=' . h($f['deck']) : '' ?>">
                            <?= pageText($tx, 'decks.fmt.browse') ?> <?= ac_icon('arrow-right', 'ac-icon--14') ?></a>
                    </p>
                </div>
                <table class="discover-table">
                    <caption class="ac-sr-only"><?= pageText($tx, 'decks.fmt.table') ?></caption>
                    <tbody>
                        <?php foreach ($_rows as $r): ?>
                            <tr>
                                <th scope="row"><?= pageText($tx, "decks.fmt.row.$r") ?></th>
                                <td><?= pageText($tx, 'decks.fmt.' . $f['slug'] . ".$r") ?></td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php endforeach; ?>

        <p class="discover-formats__closing">
            <span><?= pageText($tx, 'decks.fmt.closing') ?></span>
            <a class="discover-world__link" href="<?= h(BASE_URL) ?>/pages/formats"><?= pageText($tx, 'decks.fmt.all') ?> <?= ac_icon('arrow-right', 'ac-icon--14') ?></a>
        </p>
    </div>
<?php
$_after = ob_get_clean();
