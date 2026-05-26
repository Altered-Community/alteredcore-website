<?php
/**
 * Shared card filter controls partial.
 *
 * Set $_cf before including:
 *   txt           : translations (lbl_faction, lbl_type, lbl_rarity, lbl_cost_m,
 *                   lbl_cost_r, lbl_forest, lbl_mountain, lbl_ocean, lbl_set, lbl_subtype, lbl_keyword)
 *   uiLang        : 'en'|'fr'
 *   baseUrl       : BASE_URL
 *   validFactions  : array of codes
 *   factionNames   : code => label
 *   validTypes     : array of codes
 *   typeTxt        : code => label
 *   validRarities  : array of codes
 *   rarityGems     : code => gem filename
 *   rarityTxt      : code => label
 *   validCostPower : array '0'..'10'
 *   setsData       : ref => {en, fr, icon}
 *   subtypesData   : code => {en, fr}
 *   keywordsData   : code => {en, fr}
 *   variationsData : code => {en, fr}
 *   factions, types, rarities, mainCosts, reserveCosts,
 *   forestPowers, mountainPowers, oceanPowers, setsForSelect, subtypes, keywords, variations : selected values
 *   isBanned, isErrated, isSuspended : bool
 *   lbl_card_status, lbl_banned, lbl_errated, lbl_suspended : status row labels
 */
?>
<!-- Faction -->
<div class="filter-row mb-2">
    <span class="filter-label"><?= h($_cf['txt']['lbl_faction'] ?? 'Faction') ?></span>
    <?php foreach ($_cf['validFactions'] as $_f): ?>
    <button type="button" class="filter-toggle<?= in_array($_f, $_cf['factions']) ? ' active' : '' ?>"
            data-filter="faction" data-value="<?= $_f ?>" title="<?= h($_cf['factionNames'][$_f] ?? $_f) ?>">
        <img src="<?= h($_cf['baseUrl']) ?>/assets/faction/<?= $_f ?>.png" alt="<?= h($_f) ?>">
        <?= h($_cf['factionNames'][$_f] ?? $_f) ?>
    </button>
    <?php endforeach; ?>
</div>

<!-- Type -->
<div class="filter-row mb-2">
    <span class="filter-label"><?= h($_cf['txt']['lbl_type'] ?? 'Type') ?></span>
    <?php foreach ($_cf['validTypes'] as $_t): ?>
    <button type="button" class="filter-toggle<?= in_array($_t, $_cf['types']) ? ' active' : '' ?>"
            data-filter="type" data-value="<?= $_t ?>">
        <?= h($_cf['typeTxt'][$_t] ?? $_t) ?>
    </button>
    <?php endforeach; ?>
</div>

<!-- Rarity — data-coll-unavailable because rarity is not populated in the collection API data -->
<div class="filter-row mb-2" data-coll-unavailable="1">
    <span class="filter-label"><?= h($_cf['txt']['lbl_rarity'] ?? 'Rarity') ?></span>
    <?php foreach ($_cf['validRarities'] as $_r): ?>
    <button type="button" class="filter-toggle<?= in_array($_r, $_cf['rarities']) ? ' active' : '' ?>"
            data-filter="rarity" data-value="<?= $_r ?>">
        <img src="<?= h($_cf['baseUrl']) ?>/assets/gems/<?= h($_cf['rarityGems'][$_r] ?? substr($_r, 0, 1)) ?>.png"
             alt="<?= h($_r) ?>" style="width:15px;height:15px">
        <?= h($_cf['rarityTxt'][$_r] ?? $_r) ?>
    </button>
    <?php endforeach; ?>
</div>

<!-- Costs + powers -->
<div class="ts-filters-row ts-filters-row-5 mb-2">
    <div>
        <div class="filter-label mb-1"><?= h($_cf['txt']['lbl_cost_m'] ?? 'Hand') ?></div>
        <select id="filter-maincost" name="mainCost[]" multiple>
            <?php foreach ($_cf['validCostPower'] as $_v): ?>
            <option value="<?= $_v ?>"<?= in_array($_v, $_cf['mainCosts']) ? ' selected' : '' ?>><?= $_v ?></option>
            <?php endforeach; ?>
        </select>
    </div>
    <div>
        <div class="filter-label mb-1"><?= h($_cf['txt']['lbl_cost_r'] ?? 'Reserve') ?></div>
        <select id="filter-recallcost" name="recallCost[]" multiple>
            <?php foreach ($_cf['validCostPower'] as $_v): ?>
            <option value="<?= $_v ?>"<?= in_array($_v, $_cf['reserveCosts']) ? ' selected' : '' ?>><?= $_v ?></option>
            <?php endforeach; ?>
        </select>
    </div>
    <div>
        <div class="filter-label mb-1"><?= h($_cf['txt']['lbl_forest'] ?? 'Forest') ?></div>
        <select id="filter-forestpower" name="forestPower[]" multiple>
            <?php foreach ($_cf['validCostPower'] as $_v): ?>
            <option value="<?= $_v ?>"<?= in_array($_v, $_cf['forestPowers']) ? ' selected' : '' ?>><?= $_v ?></option>
            <?php endforeach; ?>
        </select>
    </div>
    <div>
        <div class="filter-label mb-1"><?= h($_cf['txt']['lbl_mountain'] ?? 'Mountain') ?></div>
        <select id="filter-mountainpower" name="mountainPower[]" multiple>
            <?php foreach ($_cf['validCostPower'] as $_v): ?>
            <option value="<?= $_v ?>"<?= in_array($_v, $_cf['mountainPowers']) ? ' selected' : '' ?>><?= $_v ?></option>
            <?php endforeach; ?>
        </select>
    </div>
    <div>
        <div class="filter-label mb-1"><?= h($_cf['txt']['lbl_ocean'] ?? 'Ocean') ?></div>
        <select id="filter-oceanpower" name="oceanPower[]" multiple>
            <?php foreach ($_cf['validCostPower'] as $_v): ?>
            <option value="<?= $_v ?>"<?= in_array($_v, $_cf['oceanPowers']) ? ' selected' : '' ?>><?= $_v ?></option>
            <?php endforeach; ?>
        </select>
    </div>
</div>

<!-- Collection + Set + Subtype + Keyword + Variation -->
<?php $_cf_hasCollection = !empty($_cf['collectionOptions']) && count($_cf['collectionOptions']) > 1; ?>
<div class="ts-filters-row<?= $_cf_hasCollection ? ' ts-filters-row-5' : '' ?> mb-2">
    <?php if ($_cf_hasCollection): ?>
    <div>
        <div class="filter-label mb-1"><?= h($_cf['txt']['lbl_collection'] ?? 'Collection') ?></div>
        <select id="filter-collection" multiple>
            <?php foreach ($_cf['collectionOptions'] as $_co): ?>
            <?php if ($_co['value'] === '') continue; ?>
            <option value="<?= h($_co['value']) ?>"><?= h($_co['label']) ?></option>
            <?php endforeach; ?>
        </select>
    </div>
    <?php endif; ?>
    <div>
        <div class="filter-label mb-1"><?= h($_cf['txt']['lbl_set'] ?? 'Set') ?></div>
        <select id="filter-set" name="set[]" multiple>
            <?php foreach ($_cf['setsData'] as $_sRef => $_sData): ?>
            <option value="<?= h($_sRef) ?>"<?= in_array($_sRef, $_cf['setsForSelect']) ? ' selected' : '' ?>><?= h($_sData[$_cf['uiLang']] ?? $_sData['en'] ?? $_sRef) ?></option>
            <?php endforeach; ?>
        </select>
    </div>
    <div>
        <div class="filter-label mb-1"><?= h($_cf['txt']['lbl_subtype'] ?? 'Subtype') ?></div>
        <select id="filter-subtype" name="subtype[]" multiple>
            <?php foreach ($_cf['subtypesData'] as $_stCode => $_stData): ?>
            <option value="<?= h($_stCode) ?>"<?= in_array($_stCode, $_cf['subtypes']) ? ' selected' : '' ?>><?= h($_stData[$_cf['uiLang']] ?? $_stData['en'] ?? $_stCode) ?></option>
            <?php endforeach; ?>
        </select>
    </div>
    <div data-coll-unavailable="1">
        <div class="filter-label mb-1"><?= h($_cf['txt']['lbl_keyword'] ?? 'Keyword') ?></div>
        <select id="filter-keyword" name="keyword[]" multiple>
            <?php foreach ($_cf['keywordsData'] as $_kwCode => $_kwData): ?>
            <option value="<?= h($_kwCode) ?>"<?= in_array($_kwCode, $_cf['keywords']) ? ' selected' : '' ?>><?= h($_kwData[$_cf['uiLang']] ?? $_kwData['en'] ?? $_kwCode) ?></option>
            <?php endforeach; ?>
        </select>
    </div>
    <div>
        <div class="filter-label mb-1"><?= h($_cf['txt']['lbl_variation'] ?? 'Variation') ?></div>
        <select id="filter-variation" name="variation[]" multiple>
            <?php foreach ($_cf['variationsData'] as $_varCode => $_varData): ?>
            <option value="<?= h($_varCode) ?>"<?= in_array($_varCode, $_cf['variations']) ? ' selected' : '' ?>><?= h($_varData[$_cf['uiLang']] ?? $_varData['en'] ?? $_varCode) ?></option>
            <?php endforeach; ?>
        </select>
    </div>
</div>

<!-- Card status -->
<div class="filter-row mb-0">
    <span class="filter-label"><?= h($_cf['txt']['lbl_card_status'] ?? 'Status') ?></span>
    <button type="button" class="filter-toggle<?= !empty($_cf['isBanned']) ? ' active' : '' ?>"
            data-bool-filter="isBanned">
        <i class="fa-solid fa-ban"></i> <?= h($_cf['txt']['lbl_banned'] ?? 'Banned') ?>
    </button>
    <button type="button" class="filter-toggle<?= !empty($_cf['isErrated']) ? ' active' : '' ?>"
            data-bool-filter="isErrated" data-coll-unavailable="1">
        <i class="fa-solid fa-pen-to-square"></i> <?= h($_cf['txt']['lbl_errated'] ?? 'Errated') ?>
    </button>
    <button type="button" class="filter-toggle<?= !empty($_cf['isSuspended']) ? ' active' : '' ?>"
            data-bool-filter="isSuspended">
        <i class="fa-solid fa-pause"></i> <?= h($_cf['txt']['lbl_suspended'] ?? 'Suspended') ?>
    </button>
</div>
