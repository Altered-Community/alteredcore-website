<?php
// Admin « Deck contest vote »: voting window, decks in or out of the vote, decklist cache, and results per faction.
// A tier is worth 5 (S) to 1 (D) points; a deck's share is its points over the points of every deck of its faction
// (the public vote criterion: each deck counts its share of its own faction's votes). Decks left unplaced give nothing.
require_once __DIR__ . '/../inc/functions.php';

$_dcvUrl = BASE_URL . '/admin/plugin-page?plugin=deck-contest-vote&section=deck-vote';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        flash('Invalid token.', 'error');
        redirect($_dcvUrl);
    }
    $action = (string)($_POST['action'] ?? '');
    if ($action === 'window') {
        $tz   = new DateTimeZone(DCV_TZ);
        $save = $db->prepare(qp("INSERT INTO {settings} (`key`, `value`) VALUES (:k, :v) ON DUPLICATE KEY UPDATE `value` = :v2"));
        $ok   = true;
        foreach (['opens_at', 'closes_at'] as $key) {
            $raw = trim((string)($_POST[$key] ?? ''));
            $dt  = $raw === '' ? null : DateTimeImmutable::createFromFormat('Y-m-d\TH:i', $raw, $tz);
            if ($raw !== '' && !$dt) { $ok = false; continue; }
            $v = $dt ? $dt->format('Y-m-d H:i:s') : '';
            $save->execute([':k' => $key, ':v' => $v, ':v2' => $v]);
        }
        $ok ? flash('Voting window saved (Paris time).') : flash('Invalid date.', 'error');
    } elseif ($action === 'toggle') {
        $db->prepare(qp("UPDATE {decks} SET active = 1 - active WHERE id = :id"))->execute([':id' => (string)($_POST['id'] ?? '')]);
        flash('Deck updated.');
    } elseif ($action === 'refresh') {
        $all  = dcvDecks(false);
        $done = dcvRefreshDecks($all);
        flash("Decklists refreshed: $done of " . count($all) . '.', $done === count($all) ? 'success' : 'error');
    }
    redirect($_dcvUrl);
}

[$opens, $closes] = dcvWindow();
$state  = dcvState();
$voters = (int)$db->query(qp("SELECT COUNT(DISTINCT user_id) FROM {votes} WHERE tier IS NOT NULL"))->fetchColumn();

$stats = [];
foreach ($db->query(qp(
    "SELECT deck_id, COUNT(tier) AS placed, COALESCE(SUM(tier), 0) AS points, AVG(tier) AS mean, COUNT(*) AS rows_n
     FROM {votes} GROUP BY deck_id"
)) as $row) {
    $stats[$row['deck_id']] = $row;
}

$byFaction = [];
foreach (dcvDecks(false) as $deck) $byFaction[$deck['faction']][] = $deck;
foreach ($byFaction as &$decks) {
    $total = 0;
    foreach ($decks as $deck) if ($deck['active']) $total += (int)($stats[$deck['id']]['points'] ?? 0);
    foreach ($decks as &$deck) {
        $s = $stats[$deck['id']] ?? null;
        $deck['placed'] = $s ? (int)$s['placed'] : 0;
        $deck['points'] = $s ? (int)$s['points'] : 0;
        $deck['mean']   = $s && $s['mean'] !== null ? (float)$s['mean'] : null;
        $deck['share']  = $deck['active'] && $total > 0 ? $deck['points'] / $total : null;
    }
    unset($deck);
    usort($decks, fn($a, $b) => ($b['share'] ?? -1) <=> ($a['share'] ?? -1));
}
unset($decks);

$inputDate = fn(?DateTimeImmutable $d): string => $d ? $d->format('Y-m-d\TH:i') : '';
$pct       = fn(?float $v): string => $v === null ? '–' : number_format($v * 100, 1, '.', '') . ' %';
?>
<div class="admin-header-bar">
    <h1><?= ac_icon('vote', 'me-2') ?>Deck contest vote</h1>
</div>

<div class="ac-stack">
    <div class="ac-card ac-stack">
        <p>State: <strong><?= h($state) ?></strong> · <?= $voters ?> voter(s) who ranked at least one deck · public page: <a href="<?= h(BASE_URL . '/pages/deck-vote') ?>">/pages/deck-vote</a></p>
        <form method="post" class="ac-stack">
            <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
            <input type="hidden" name="action" value="window">
            <div class="ac-field">
                <label class="ac-field__label" for="dcv-opens">Opens (Paris time)</label>
                <input class="ac-input" type="datetime-local" id="dcv-opens" name="opens_at" value="<?= h($inputDate($opens)) ?>">
            </div>
            <div class="ac-field">
                <label class="ac-field__label" for="dcv-closes">Closes (Paris time)</label>
                <input class="ac-input" type="datetime-local" id="dcv-closes" name="closes_at" value="<?= h($inputDate($closes)) ?>">
            </div>
            <div><button type="submit" class="ac-button">Save</button></div>
        </form>
        <form method="post">
            <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
            <input type="hidden" name="action" value="refresh">
            <button type="submit" class="ac-button ac-button--secondary"><?= ac_icon('refresh-cw') ?> Refresh the decklists from the decks API</button>
            <span class="ac-text-small ac-text-muted">Run it if a builder changed a deck after its first display.</span>
        </form>
    </div>

    <?php foreach ($byFaction as $faction => $decks): ?>
    <section>
        <h2 class="ac-section-title"><?= h($faction) ?></h2>
        <div class="ac-table-wrap">
            <table class="ac-table">
                <thead><tr>
                    <th>Hero</th><th>Builder</th><th>Difficulty</th><th>Type</th>
                    <th>Ranked by</th><th>Mean (S=5…D=1)</th><th>Points</th><th>Share of the faction</th><th>In the vote</th>
                </tr></thead>
                <tbody>
                <?php foreach ($decks as $d): ?>
                    <tr<?= $d['active'] ? '' : ' class="ac-text-muted"' ?>>
                        <td><a href="<?= h($d['url']) ?>" target="_blank" rel="noopener noreferrer"><?= h($d['hero']) ?></a></td>
                        <td><?= h($d['author']) ?></td>
                        <td><?= h($d['difficulty']) ?></td>
                        <td><?= h($d['archetype']) ?></td>
                        <td><?= $d['placed'] ?></td>
                        <td><?= $d['mean'] === null ? '–' : number_format($d['mean'], 2, '.', '') ?></td>
                        <td><?= $d['points'] ?></td>
                        <td><strong><?= $pct($d['share']) ?></strong></td>
                        <td>
                            <form method="post">
                                <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
                                <input type="hidden" name="action" value="toggle">
                                <input type="hidden" name="id" value="<?= h($d['id']) ?>">
                                <button type="submit" class="ac-button ac-button--secondary ac-button--sm"><?= $d['active'] ? 'Remove' : 'Restore' ?></button>
                            </form>
                        </td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </section>
    <?php endforeach; ?>
</div>
