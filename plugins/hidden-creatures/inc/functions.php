<?php
// Hidden creatures: shared helpers. Creatures and spots live in the database, entered in the admin, so that the
// public repository does not tell where they hide.

const HC_RULES        = ['load', 'scroll-end', 'event', 'link'];
const HC_IMAGE_FOLDER = 'hidden-creatures';
const HC_IMAGE_SIZE   = 400;

/** qp() with this plugin's table prefix, whoever includes the file (global_head.php runs outside the plugin). */
function hcq(string $sql): string {
    $previous = $GLOBALS['_ac_current_plugin_prefix'] ?? null;
    $GLOBALS['_ac_current_plugin_prefix'] = 'hc';
    $sql = qp($sql);
    if ($previous === null) unset($GLOBALS['_ac_current_plugin_prefix']);
    else $GLOBALS['_ac_current_plugin_prefix'] = $previous;
    return $sql;
}

/**
 * The creatures (id => name_fr, name_en, normal, click, updated_at) and their spots (id => creature, pages, when,
 * code, updated_at), read once per request. Empty when the tables do not exist (plugin files without its install).
 */
function hcConfig(bool $reload = false): array {
    static $config = null;
    if ($config !== null && !$reload) return $config;
    $config = ['creatures' => [], 'spots' => []];
    try {
        $db = getDB();
        foreach ($db->query(hcq("SELECT * FROM {creatures} ORDER BY id")) as $c) {
            $config['creatures'][$c['id']] = [
                'name_fr'    => $c['name_fr'],
                'name_en'    => $c['name_en'],
                'normal'     => $c['image_normal'],
                'click'      => $c['image_click'],
                'updated_at' => $c['updated_at'],
            ];
        }
        foreach ($db->query(hcq("SELECT * FROM {spots} ORDER BY id")) as $s) {
            $config['spots'][$s['id']] = [
                'creature'   => $s['creature_id'],
                'pages'      => hcSplitPages($s['pages']),
                'when'       => $s['rule'],
                'code'       => $s['code'],
                'updated_at' => $s['updated_at'],
            ];
        }
    } catch (PDOException $e) {
        // Tables not installed: no spots.
    }
    return $config;
}

function hcSplitPages(string $pages): array {
    return array_values(array_filter(preg_split('/[\s,]+/', trim($pages)) ?: [], 'strlen'));
}

/** Spot ids: the counter's total. */
function hcSpotIds(): array {
    return array_map('strval', array_keys(hcConfig()['spots']));
}

/** The session saw this spot's page (global_head.php): a find can only count after that. */
function hcMarkSeen(string $spot): void {
    $_SESSION['hc_seen'][$spot] = time();
}

function hcSeen(string $spot): bool {
    return !empty($_SESSION['hc_seen'][$spot]);
}

/** spot => code, for the spots that have one. */
function hcSpotCodes(): array {
    return array_filter(array_map(function (array $s): string { return $s['code']; }, hcConfig()['spots']), 'strlen');
}

// ─── Admin: creatures and spots ─────────────────────────────────────────────

function hcValidId(string $id): bool {
    return (bool)preg_match('/^[a-z0-9][a-z0-9-]{0,63}$/', $id);
}

/** Errors of a spot form, [] when valid. `rule` is the stored form: load, scroll-end, event:<name>, link:<url>. */
function hcSpotErrors(string $id, string $creature, array $pages, string $rule, string $code): array {
    $errors = [];
    if (!hcValidId($id)) $errors[] = 'Spot id: lowercase letters, digits and dashes.';
    if (!isset(hcConfig()['creatures'][$creature])) $errors[] = 'Unknown creature.';
    if (!$pages) $errors[] = 'At least one page.';
    foreach ($pages as $page) {
        if ($page !== '*' && !preg_match('/^[a-z0-9_-]+$/', $page)) $errors[] = "Page « $page »: a slug (index, news-detail…) or *.";
    }
    [$type, $value] = array_pad(explode(':', $rule, 2), 2, '');
    if (!in_array($type, HC_RULES, true)) $errors[] = 'Unknown trigger.';
    if ($type === 'event' && !preg_match('/^[a-z0-9-]+$/', $value)) $errors[] = 'Event name: lowercase letters, digits and dashes.';
    if ($type === 'link' && !preg_match('#^https?://\S+$#', $value)) $errors[] = 'Link: an address starting with http:// or https://.';
    if (mb_strlen($code) > 100) $errors[] = 'Code: 100 characters at most.';
    return $errors;
}

function hcSaveSpot(string $id, string $creature, array $pages, string $rule, string $code): void {
    getDB()->prepare(hcq(
        "INSERT INTO {spots} (id, creature_id, pages, rule, code) VALUES (:id, :c, :p, :r, :code)"
        . " ON DUPLICATE KEY UPDATE creature_id = VALUES(creature_id), pages = VALUES(pages), rule = VALUES(rule), code = VALUES(code)"
    ))->execute([':id' => $id, ':c' => $creature, ':p' => implode(' ', $pages), ':r' => $rule, ':code' => $code]);
    hcConfig(true);
}

function hcDeleteSpot(string $id): void {
    getDB()->prepare(hcq("DELETE FROM {spots} WHERE id = :id"))->execute([':id' => $id]);
    hcConfig(true);
}

function hcSaveCreature(string $id, string $nameFr, string $nameEn, string $normal, string $click): void {
    getDB()->prepare(hcq(
        "INSERT INTO {creatures} (id, name_fr, name_en, image_normal, image_click) VALUES (:id, :fr, :en, :n, :c)"
        . " ON DUPLICATE KEY UPDATE name_fr = VALUES(name_fr), name_en = VALUES(name_en),"
        . " image_normal = VALUES(image_normal), image_click = VALUES(image_click)"
    ))->execute([':id' => $id, ':fr' => $nameFr, ':en' => $nameEn, ':n' => $normal, ':c' => $click]);
    hcConfig(true);
}

/** Deletes a creature no spot uses; false otherwise. */
function hcDeleteCreature(string $id): bool {
    foreach (hcConfig()['spots'] as $spot) {
        if ($spot['creature'] === $id) return false;
    }
    getDB()->prepare(hcq("DELETE FROM {creatures} WHERE id = :id"))->execute([':id' => $id]);
    hcConfig(true);
    return true;
}

/**
 * An image picked in the media library (uploads/…), made a square WebP of HC_IMAGE_SIZE px in uploads/hidden-creatures/
 * when GD can: the stored path. An image made here already, or one GD cannot read or write, is kept as it is; a path
 * outside uploads/ gives ''.
 */
function hcPrepareImage(string $path, string $creature, string $variant): string {
    $path = ltrim(trim($path), '/');
    if ($path === '') return '';
    $root    = dirname(__DIR__, 3);
    $uploads = realpath($root . '/uploads');
    $source  = realpath($root . '/' . $path);
    if (!$uploads || !$source || strpos($source, $uploads . DIRECTORY_SEPARATOR) !== 0 || !is_file($source)) return '';
    if (preg_match('#^uploads/' . HC_IMAGE_FOLDER . '/[a-z0-9-]+-(normal|click)-[0-9a-f]{8}\.webp$#', $path)) return $path;
    if (!function_exists('imagewebp') || !function_exists('imagecreatefromstring')) return $path;

    $image = @imagecreatefromstring((string)file_get_contents($source));
    if (!$image) return $path;
    $w = imagesx($image);
    $h = imagesy($image);
    $scale = min(1, HC_IMAGE_SIZE / max($w, $h));
    $dw = max(1, (int)round($w * $scale));
    $dh = max(1, (int)round($h * $scale));
    $out = imagecreatetruecolor(HC_IMAGE_SIZE, HC_IMAGE_SIZE);
    imagealphablending($out, false);
    imagesavealpha($out, true);
    imagefill($out, 0, 0, imagecolorallocatealpha($out, 0, 0, 0, 127));
    // Centred in the square, transparent around a non-square image.
    imagecopyresampled($out, $image, (int)((HC_IMAGE_SIZE - $dw) / 2), (int)((HC_IMAGE_SIZE - $dh) / 2), 0, 0, $dw, $dh, $w, $h);

    $dir = $root . '/uploads/' . HC_IMAGE_FOLDER;
    if (!is_dir($dir) && !@mkdir($dir, 0755, true)) return $path;
    $name = $creature . '-' . $variant . '-' . substr(md5($path . filemtime($source)), 0, 8) . '.webp';
    $ok = imagewebp($out, $dir . '/' . $name, 85);
    imagedestroy($image);
    imagedestroy($out);
    return $ok ? 'uploads/' . HC_IMAGE_FOLDER . '/' . $name : $path;
}

// ─── Finds ──────────────────────────────────────────────────────────────────

/** A user's finds, spot => found_at, for the spots that still exist. */
function hcUserFinds(int $userId): array {
    $stmt = getDB()->prepare(hcq("SELECT spot, found_at FROM {finds} WHERE user_id = :u ORDER BY found_at"));
    $stmt->execute([':u' => $userId]);
    $finds = [];
    foreach ($stmt as $row) {
        if (in_array($row['spot'], hcSpotIds(), true)) $finds[$row['spot']] = $row['found_at'];
    }
    return $finds;
}

/** Records a find; true the first time. */
function hcRecordFind(int $userId, string $spot): bool {
    $stmt = getDB()->prepare(hcq("INSERT IGNORE INTO {finds} (user_id, spot) VALUES (:u, :spot)"));
    $stmt->execute([':u' => $userId, ':spot' => $spot]);
    return $stmt->rowCount() > 0;
}
