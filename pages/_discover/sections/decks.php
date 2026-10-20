<?php
// Discover, section 4: Build your own deck (specifications/discover-04-decks.md). Included by pages/discover.php.
// Top: pitch, three features, depth figures and the four-step flow from account to play (no screenshot: the deckbuilder's design keeps changing).
// Beneath: the formats picker. Every format shows the same table rows, in the same order, so that moving from one
// format to the next shows what changed (add an axis as a row for all six, never inside one panel).
$_formats = [
    ['slug' => 'standard',      'deck' => 'standard'],
    ['slug' => 'nuc',           'deck' => 'nuc'],
    ['slug' => 'singleton',     'deck' => 'singleton'],
    ['slug' => 'singleton_nuc', 'deck' => 'singleton_nuc'],
    ['slug' => 'frontier',      'deck' => 'frontier'],
    ['slug' => 'draft',         'deck' => ''],   // no deck list of its own
];
$_rows = ['size', 'copies', 'unique', 'pool', 'bga'];
$_figs = ['cards', 'sets', 'formats', 'decks'];
?>
<div class="discover-decks">
    <div class="discover-decks__top">
        <div class="discover-decks__main">
            <p class="discover-lead"><?= pageText($tx, 'decks.lead') ?></p>

            <dl class="discover-features">
                <?php for ($i = 1; $i <= 3; $i++): ?>
                    <div class="discover-features__row">
                        <dt><?= pageText($tx, "decks.feat.$i.label") ?></dt>
                        <dd><?= pageText($tx, "decks.feat.$i.text") ?></dd>
                    </div>
                <?php endfor; ?>
            </dl>

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
                        <li class="discover-flow__step">
                            <h4 class="discover-flow__title"><?= pageText($tx, 'decks.flow.1.title') ?></h4>
                            <p class="discover-flow__text"><?= pageText($tx, 'decks.flow.1.text') ?></p>
                            <a class="ac-button ac-button--lg discover-flow__cta" href="<?= h(BASE_URL) ?>/pages/register"><?= pageText($tx, 'decks.flow.1.cta') ?></a>
                            <p class="discover-flow__aside"><?= pageText($tx, 'decks.flow.1.signin') ?> <a href="<?= h(BASE_URL) ?>/pages/login"><?= pageText($tx, 'decks.flow.1.signin_link') ?></a></p>
                        </li>
                        <li class="discover-flow__step">
                            <h4 class="discover-flow__title"><?= pageText($tx, 'decks.flow.2.title') ?></h4>
                            <p class="discover-flow__text"><?= pageText($tx, 'decks.flow.2.text') ?></p>
                        </li>
                    </ol>
                </div>
                <div class="discover-flow__group">
                    <p class="discover-flow__label"><?= pageText($tx, 'decks.flow.every') ?></p>
                    <ol class="discover-flow__steps" start="3">
                        <li class="discover-flow__step">
                            <h4 class="discover-flow__title"><?= pageText($tx, 'decks.flow.3.title') ?></h4>
                            <p class="discover-flow__text"><?= pageText($tx, 'decks.flow.3.text') ?></p>
                            <a class="discover-flow__link" href="<?= h(BASE_URL) ?>/pages/deckbuilder"><?= pageText($tx, 'decks.flow.3.link') ?> <?= ac_icon('arrow-right', 'ac-icon--14') ?></a>
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

    <div class="discover-formats" id="discover-formats">
        <div class="discover-chips" role="tablist" aria-label="<?= pageText($tx, 'decks.fmt.label') ?>">
            <?php foreach ($_formats as $i => $f): ?>
                <button type="button" class="discover-chip" role="tab" id="decks-tab-<?= h($f['slug']) ?>"
                        aria-controls="decks-panel-<?= h($f['slug']) ?>" aria-selected="<?= $i === 0 ? 'true' : 'false' ?>"
                        tabindex="<?= $i === 0 ? '0' : '-1' ?>" data-format="<?= h($f['slug']) ?>">
                    <span class="discover-chip__name"><?= pageText($tx, 'decks.fmt.' . $f['slug'] . '.name') ?></span>
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
</div>
