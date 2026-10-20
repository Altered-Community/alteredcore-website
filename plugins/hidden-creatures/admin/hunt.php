<?php
// Admin « Hidden creatures »: the creatures (names, images from the media library) and the spots where they hide
// (pages, trigger, contest code), kept here rather than in the public repository; how many players found each spot,
// the players who found them all, and one player's finds (to check a contest winner).
require_once __DIR__ . '/../inc/functions.php';

$_hcUrl  = BASE_URL . '/admin/plugin-page?plugin=hidden-creatures&section=hidden-creatures';
$_hcBack = function (array $params = []) use ($_hcUrl): string {
    return $_hcUrl . ($params ? '&' . http_build_query($params) : '');
};

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        flash('Invalid token.', 'error');
        redirect($_hcUrl);
    }
    $action   = (string)($_POST['action'] ?? '');
    $id       = trim((string)($_POST['id'] ?? ''));
    $isNew    = ($_POST['is_new'] ?? '') === '1';
    $existing = hcConfig();

    if ($action === 'creature') {
        if (!hcValidId($id)) {
            flash('Creature id: lowercase letters, digits and dashes.', 'error');
            redirect($_hcBack(['creature' => $isNew ? 'new' : $id]));
        }
        if ($isNew && isset($existing['creatures'][$id])) {
            flash("A creature « $id » exists already.", 'error');
            redirect($_hcBack(['creature' => 'new']));
        }
        hcSaveCreature(
            $id,
            mb_substr(trim((string)($_POST['name_fr'] ?? '')), 0, 100),
            mb_substr(trim((string)($_POST['name_en'] ?? '')), 0, 100),
            hcPrepareImage((string)($_POST['image_normal'] ?? ''), $id, 'normal'),
            hcPrepareImage((string)($_POST['image_click'] ?? ''), $id, 'click')
        );
        flash("Creature « $id » saved.");
    } elseif ($action === 'creature-delete') {
        if (hcDeleteCreature($id)) flash("Creature « $id » deleted.");
        else flash("« $id » still hides in a spot: delete or change the spot first.", 'error');
    } elseif ($action === 'spot') {
        $type  = (string)($_POST['rule_type'] ?? '');
        $value = trim((string)($_POST['rule_value'] ?? ''));
        $rule  = in_array($type, ['event', 'link'], true) ? $type . ':' . $value : $type;
        $pages = hcSplitPages((string)($_POST['pages'] ?? ''));
        $code  = trim((string)($_POST['code'] ?? ''));
        $errors = hcSpotErrors($id, (string)($_POST['creature'] ?? ''), $pages, $rule, $code);
        if ($isNew && isset($existing['spots'][$id])) $errors[] = "A spot « $id » exists already.";
        if ($errors) {
            flash(implode(' ', $errors), 'error');
            redirect($_hcBack(['spot' => $isNew ? 'new' : $id]));
        }
        hcSaveSpot($id, (string)$_POST['creature'], $pages, $rule, $code);
        flash("Spot « $id » saved.");
    } elseif ($action === 'spot-delete') {
        hcDeleteSpot($id);
        flash("Spot « $id » deleted. Its finds stay recorded, uncounted, until a spot takes the same id again.");
    }
    redirect($_hcUrl);
}

$config    = hcConfig();
$creatures = $config['creatures'];
$spots     = $config['spots'];
$spotIds   = array_keys($spots);
$users     = q('{users}');
$imageUrl  = function (string $path): string { return $path === '' ? '' : BASE_URL . '/' . $path; };

// Form being edited: ?creature=<id>|new, ?spot=<id>|new.
$editCreatureId = (string)($_GET['creature'] ?? '');
$editCreature   = $creatures[$editCreatureId] ?? null;
$editSpotId     = (string)($_GET['spot'] ?? '');
$editSpot       = $spots[$editSpotId] ?? null;
[$editRuleType, $editRuleValue] = array_pad(explode(':', $editSpot['when'] ?? 'load', 2), 2, '');

// Players per spot.
$perSpot = array_fill_keys($spotIds, 0);
foreach ($db->query(hcq("SELECT spot, COUNT(*) AS n FROM {finds} GROUP BY spot")) as $row) {
    if (isset($perSpot[$row['spot']])) $perSpot[$row['spot']] = (int)$row['n'];
}

// Players who found every spot, first to finish first.
$complete = [];
if ($spotIds) {
    $in   = implode(',', array_fill(0, count($spotIds), '?'));
    $stmt = $db->prepare(hcq(
        "SELECT user_id, MAX(found_at) AS done_at, COUNT(*) AS n FROM {finds}"
        . " WHERE spot IN ($in) GROUP BY user_id HAVING n = ? ORDER BY done_at"
    ));
    $stmt->execute(array_merge($spotIds, [count($spotIds)]));
    $completeIds = array_column($stmt->fetchAll(), 'done_at', 'user_id');
    if ($completeIds) {
        $uin  = implode(',', array_fill(0, count($completeIds), '?'));
        $stmt = $db->prepare("SELECT id, username, email FROM $users WHERE id IN ($uin)");
        $stmt->execute(array_keys($completeIds));
        $byId = array_column($stmt->fetchAll(), null, 'id');
        foreach ($completeIds as $uid => $doneAt) {
            if (isset($byId[$uid])) $complete[] = $byId[$uid] + ['done_at' => $doneAt];
        }
    }
}

// One player's finds, by email or username.
$search  = trim((string)($_GET['player'] ?? ''));
$matches = [];
if ($search !== '') {
    $stmt = $db->prepare("SELECT id, username, email FROM $users WHERE email = :e OR username = :u LIMIT 10");
    $stmt->execute([':e' => $search, ':u' => $search]);
    foreach ($stmt->fetchAll() as $u) $matches[] = $u + ['finds' => hcUserFinds((int)$u['id'])];
}

$ruleLabels = [
    'load'       => 'On the page from the start (falls through it in a loop)',
    'scroll-end' => 'At the bottom of the page (crosses the screen once)',
    'event'      => 'On a page event (crosses the screen once)',
    'link'       => 'After a click on a link (crosses the screen when the visitor is back)',
];

/** An image field with the media library picker (admin/includes/image-picker.php). */
$picker = function (string $name, string $label, string $value) use ($imageUrl): void {
    $id = 'hc_' . $name;
    ?>
    <div class="ac-field">
        <span class="ac-field__label"><?= h($label) ?></span>
        <div class="img-picker-widget" data-input="<?= $id ?>" data-preview="<?= $id ?>_preview"
             data-folder="<?= HC_IMAGE_FOLDER ?>" data-base-url="<?= h(BASE_URL) ?>" data-csrf="<?= h(csrfToken()) ?>"
             data-original="<?= h($value) ?>" data-can-delete="1">
            <div id="<?= $id ?>_preview" class="hc-preview mb-2"<?= $value === '' ? ' style="display:none"' : '' ?>>
                <img src="<?= h($imageUrl($value)) ?>" alt="">
                <button type="button" class="ac-icon-button ac-icon-button--ghost ac-icon-button--sm img-picker-clear"
                        aria-label="Remove the image"><?= ac_icon('x') ?></button>
            </div>
            <input type="hidden" name="<?= h($name) ?>" id="<?= $id ?>" value="<?= h($value) ?>">
            <button type="button" class="ac-button ac-button--secondary ac-button--sm img-picker-btn"><?= ac_icon('images') ?>Choose</button>
        </div>
    </div>
    <?php
};
?>
<style>
.hc-thumb { width: var(--ac-space-12); height: var(--ac-space-12); object-fit: contain; }
.hc-preview { display: inline-flex; align-items: flex-start; gap: var(--ac-space-1); }
.hc-preview img { width: calc(var(--ac-space-10) * 2); height: calc(var(--ac-space-10) * 2); object-fit: contain;
    border: 1px solid var(--ac-color-border); border-radius: var(--ac-radius-sm); }
</style>

<div class="admin-header-bar">
    <h1><?= ac_icon('sparkles', 'me-2') ?>Hidden creatures</h1>
</div>
<p class="ac-text-small ac-text-muted">
    Creatures and spots are kept here, not in the code: the repository is public. A click on a creature counts the find
    (recorded for signed-in players) and shows the spot's code, the Gleam « Secret Code » of that spot.
</p>

<!-- Creatures -->
<h2 class="h5 mt-4">Creatures</h2>
<div class="ac-table-wrap mb-3">
    <?php if (!$creatures): ?>
    <p class="ac-empty">No creature yet.</p>
    <?php else: ?>
    <table class="ac-table">
        <thead>
        <tr>
            <th scope="col">Images</th>
            <th scope="col">Id</th>
            <th scope="col">Name</th>
            <th scope="col" class="ac-table__num">Spots</th>
            <th scope="col"><span class="visually-hidden">Actions</span></th>
        </tr>
        </thead>
        <tbody>
        <?php foreach ($creatures as $cid => $c):
            $uses = count(array_filter($spots, function (array $s) use ($cid): bool { return $s['creature'] === $cid; })); ?>
        <tr>
            <td class="text-nowrap">
                <?php foreach (['normal', 'click'] as $variant): ?>
                    <?php if ($c[$variant] !== ''): ?>
                    <img class="hc-thumb" src="<?= h($imageUrl($c[$variant])) ?>" alt="<?= h($variant) ?>">
                    <?php else: ?>
                    <span class="ac-text-small ac-text-muted">No <?= h($variant) ?> image: cotton ball</span>
                    <?php endif; ?>
                <?php endforeach; ?>
            </td>
            <td><code><?= h($cid) ?></code></td>
            <td><?= h($c['name_fr']) ?><?= $c['name_en'] !== '' && $c['name_en'] !== $c['name_fr'] ? ' / ' . h($c['name_en']) : '' ?></td>
            <td class="ac-table__num"><?= $uses ?></td>
            <td class="ac-table__num text-nowrap">
                <a class="ac-button ac-button--ghost ac-button--sm" href="<?= h($_hcBack(['creature' => $cid])) ?>#creature-form">Edit</a>
                <?php if (!$uses): ?>
                <form method="post" class="d-inline" onsubmit="return confirm('Delete this creature?')">
                    <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                    <input type="hidden" name="action" value="creature-delete">
                    <input type="hidden" name="id" value="<?= h($cid) ?>">
                    <button type="submit" class="ac-button ac-button--danger ac-button--sm">Delete</button>
                </form>
                <?php endif; ?>
            </td>
        </tr>
        <?php endforeach; ?>
        </tbody>
    </table>
    <?php endif; ?>
</div>

<form method="post" id="creature-form" class="ac-card mb-4">
    <h3 class="h6"><?= $editCreature ? 'Edit « ' . h($editCreatureId) . ' »' : 'Add a creature' ?></h3>
    <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
    <input type="hidden" name="action" value="creature">
    <input type="hidden" name="is_new" value="<?= $editCreature ? '0' : '1' ?>">
    <div class="row g-3">
        <div class="col-md-4 ac-field">
            <label class="ac-field__label" for="hc_creature_id">Id</label>
            <input class="ac-input" id="hc_creature_id" name="id" required pattern="[a-z0-9][a-z0-9-]*" maxlength="64"
                   value="<?= h($editCreature ? $editCreatureId : '') ?>"<?= $editCreature ? ' readonly' : '' ?>>
            <p class="ac-field__hint">Lowercase letters, digits, dashes. Not shown to players.</p>
        </div>
        <div class="col-md-4 ac-field">
            <label class="ac-field__label" for="hc_name_fr">Name (FR)</label>
            <input class="ac-input" id="hc_name_fr" name="name_fr" maxlength="100" required value="<?= h($editCreature['name_fr'] ?? '') ?>">
        </div>
        <div class="col-md-4 ac-field">
            <label class="ac-field__label" for="hc_name_en">Name (EN)</label>
            <input class="ac-input" id="hc_name_en" name="name_en" maxlength="100" value="<?= h($editCreature['name_en'] ?? '') ?>">
        </div>
        <div class="col-md-6"><?php $picker('image_normal', 'Image', $editCreature['normal'] ?? ''); ?></div>
        <div class="col-md-6"><?php $picker('image_click', 'Image when clicked', $editCreature['click'] ?? ''); ?></div>
    </div>
    <p class="ac-field__hint mt-2">
        Square images with a transparent background. Saved as <?= HC_IMAGE_SIZE ?> px WebP copies in
        <code>uploads/<?= HC_IMAGE_FOLDER ?>/</code> when the server can.
    </p>
    <div class="d-flex gap-2 mt-3">
        <button type="submit" class="ac-button"><?= ac_icon('save') ?>Save the creature</button>
        <?php if ($editCreature): ?><a class="ac-button ac-button--ghost" href="<?= h($_hcUrl) ?>">Cancel</a><?php endif; ?>
    </div>
</form>

<!-- Spots -->
<h2 class="h5 mt-5">Spots</h2>
<div class="ac-table-wrap mb-3">
    <?php if (!$spots): ?>
    <p class="ac-empty">No spot yet.</p>
    <?php else: ?>
    <table class="ac-table">
        <thead>
        <tr>
            <th scope="col">Id</th>
            <th scope="col">Creature</th>
            <th scope="col">Pages</th>
            <th scope="col">Trigger</th>
            <th scope="col">Code</th>
            <th scope="col" class="ac-table__num">Players</th>
            <th scope="col" class="ac-table__num">Changed</th>
            <th scope="col"><span class="visually-hidden">Actions</span></th>
        </tr>
        </thead>
        <tbody>
        <?php foreach ($spots as $sid => $s): ?>
        <tr>
            <td><code><?= h($sid) ?></code></td>
            <td><?= h($s['creature']) ?><?= isset($creatures[$s['creature']]) ? '' : ' <span class="ac-text-small ac-text-muted">(missing)</span>' ?></td>
            <td><?= h(implode(' ', $s['pages'])) ?></td>
            <td><code><?= h($s['when']) ?></code></td>
            <td><?= h($s['code']) ?></td>
            <td class="ac-table__num"><?= $perSpot[$sid] ?></td>
            <td class="ac-table__num text-nowrap ac-text-small"><?= h($s['updated_at']) ?></td>
            <td class="ac-table__num text-nowrap">
                <a class="ac-button ac-button--ghost ac-button--sm" href="<?= h($_hcBack(['spot' => $sid])) ?>#spot-form">Edit</a>
                <form method="post" class="d-inline" onsubmit="return confirm('Delete this spot?')">
                    <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                    <input type="hidden" name="action" value="spot-delete">
                    <input type="hidden" name="id" value="<?= h($sid) ?>">
                    <button type="submit" class="ac-button ac-button--danger ac-button--sm">Delete</button>
                </form>
            </td>
        </tr>
        <?php endforeach; ?>
        </tbody>
    </table>
    <?php endif; ?>
</div>

<?php if ($creatures): ?>
<form method="post" id="spot-form" class="ac-card mb-4">
    <h3 class="h6"><?= $editSpot ? 'Edit « ' . h($editSpotId) . ' »' : 'Add a spot' ?></h3>
    <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
    <input type="hidden" name="action" value="spot">
    <input type="hidden" name="is_new" value="<?= $editSpot ? '0' : '1' ?>">
    <div class="row g-3">
        <div class="col-md-4 ac-field">
            <label class="ac-field__label" for="hc_spot_id">Id</label>
            <input class="ac-input" id="hc_spot_id" name="id" required pattern="[a-z0-9][a-z0-9-]*" maxlength="64"
                   value="<?= h($editSpot ? $editSpotId : '') ?>"<?= $editSpot ? ' readonly' : '' ?>>
            <p class="ac-field__hint">Finds are recorded by spot id: keep it once players have found the spot.</p>
        </div>
        <div class="col-md-4 ac-field">
            <label class="ac-field__label" for="hc_spot_creature">Creature</label>
            <select class="ac-select" id="hc_spot_creature" name="creature" required>
                <?php foreach ($creatures as $cid => $c): ?>
                <option value="<?= h($cid) ?>"<?= ($editSpot['creature'] ?? '') === $cid ? ' selected' : '' ?>><?= h($c['name_fr'] ?: $cid) ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        <div class="col-md-4 ac-field">
            <label class="ac-field__label" for="hc_spot_code">Contest code</label>
            <input class="ac-input" id="hc_spot_code" name="code" maxlength="100" value="<?= h($editSpot['code'] ?? '') ?>">
            <p class="ac-field__hint">Empty: no code, the hunt alone.</p>
        </div>
        <div class="col-md-4 ac-field">
            <label class="ac-field__label" for="hc_spot_pages">Pages</label>
            <input class="ac-input" id="hc_spot_pages" name="pages" required value="<?= h(implode(' ', $editSpot['pages'] ?? [])) ?>">
            <p class="ac-field__hint">
                Page slugs separated by spaces: <code>index</code> for the home page, the end of <code>/pages/&lt;slug&gt;</code>
                otherwise. <code>*</code>: every page (a link of the menu).
            </p>
        </div>
        <div class="col-md-4 ac-field">
            <label class="ac-field__label" for="hc_spot_rule">Trigger</label>
            <select class="ac-select" id="hc_spot_rule" name="rule_type">
                <?php foreach ($ruleLabels as $type => $label): ?>
                <option value="<?= h($type) ?>"<?= $editRuleType === $type ? ' selected' : '' ?>><?= h($label) ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        <div class="col-md-4 ac-field">
            <label class="ac-field__label" for="hc_spot_rule_value">Event name or link</label>
            <input class="ac-input" id="hc_spot_rule_value" name="rule_value" value="<?= h($editRuleValue) ?>">
            <p class="ac-field__hint">
                Event: the name a page sends (<code>test-hand</code>: Re:Builder's « Main de départ » tab;
                <code>tournament-heroes</code>: the heroes « Détail » of a tournament). Link: the start of its address.
            </p>
        </div>
    </div>
    <div class="d-flex gap-2 mt-3">
        <button type="submit" class="ac-button"><?= ac_icon('save') ?>Save the spot</button>
        <?php if ($editSpot): ?><a class="ac-button ac-button--ghost" href="<?= h($_hcUrl) ?>">Cancel</a><?php endif; ?>
    </div>
</form>
<?php endif; ?>

<!-- Players -->
<h2 class="h5 mt-5">Check a player</h2>
<form method="get" action="<?= h(BASE_URL . '/admin/plugin-page') ?>" class="d-flex gap-2 mb-3">
    <input type="hidden" name="plugin" value="hidden-creatures">
    <input type="hidden" name="section" value="hidden-creatures">
    <input type="search" name="player" class="ac-input" value="<?= h($search) ?>" required
           placeholder="Email or username" aria-label="Email or username">
    <button type="submit" class="ac-button ac-button--secondary"><?= ac_icon('search') ?>Search</button>
</form>
<?php if ($search !== '' && !$matches): ?>
<p class="ac-empty">No account with this email or username.</p>
<?php endif; ?>
<?php foreach ($matches as $m): ?>
<p class="mb-2">
    <a href="<?= h(BASE_URL . '/admin/user-edit?id=' . (int)$m['id']) ?>"><?= h($m['username'] ?: '#' . $m['id']) ?></a>
    <?= $m['email'] ? '· ' . h($m['email']) : '' ?>
    · <strong><?= count($m['finds']) ?>/<?= count($spotIds) ?></strong>
</p>
<div class="ac-table-wrap mb-3">
    <table class="ac-table">
        <tbody>
        <?php foreach ($spotIds as $sid): ?>
        <tr>
            <td><?= h($sid) ?></td>
            <td class="ac-table__num"><?= isset($m['finds'][$sid]) ? h($m['finds'][$sid]) : '—' ?></td>
        </tr>
        <?php endforeach; ?>
        </tbody>
    </table>
</div>
<?php endforeach; ?>

<h2 class="h5 mt-5">Found them all (<?= count($complete) ?>)</h2>
<div class="ac-table-wrap">
    <?php if (!$complete): ?>
    <p class="ac-empty">Nobody yet.</p>
    <?php else: ?>
    <table class="ac-table">
        <thead>
        <tr>
            <th scope="col">Player</th>
            <th scope="col">Email</th>
            <th scope="col" class="ac-table__num">Completed</th>
        </tr>
        </thead>
        <tbody>
        <?php foreach ($complete as $u): ?>
        <tr>
            <td><a href="<?= h(BASE_URL . '/admin/user-edit?id=' . (int)$u['id']) ?>"><?= h($u['username'] ?: '#' . $u['id']) ?></a></td>
            <td><?= h((string)$u['email']) ?></td>
            <td class="ac-table__num text-nowrap"><?= h($u['done_at']) ?></td>
        </tr>
        <?php endforeach; ?>
        </tbody>
    </table>
    <?php endif; ?>
</div>
