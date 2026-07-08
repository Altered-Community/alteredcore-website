<?php
// Favorites helpers — cartes favorites par utilisateur, stockées dans notre table DB locale.
//
// Table : {favorites} → plugin_cac_favorites (user_id, card_ref, faction, rarity, card_set, created_at).
// faction/rarity/card_set sont les VRAIS codes fournis par le client au moment du clic étoile
// (carte déjà normalisée : factionCode, rarity.reference, set.reference). Ils permettent le
// filtrage Set/Faction/Rareté 100% en SQL, sans re-parser la référence (transfuges non fiables).
//
// Réutilise le helper DB standard des plugins : getDB() + qp() (préfixe de table).
// Toutes les fonctions valident leurs entrées et ne lèvent jamais d'exception.

/** Valide une référence de carte (ALT_...). Renvoie la version normalisée (majuscules) ou ''. */
function cacFavNormalizeRef(string $ref): string {
    $ref = strtoupper(trim($ref));
    return preg_match('/^ALT_[A-Z0-9_]+$/', $ref) ? $ref : '';
}

/** Normalise un code court (faction / rareté / set) : majuscules, [A-Z0-9_], max 16 car. */
function cacFavNormalizeCode(string $v): string {
    $v = strtoupper(trim($v));
    if (!preg_match('/^[A-Z0-9_]{0,16}$/', $v)) return '';
    return $v;
}

/**
 * Construit le fragment WHERE des filtres (faction / rarity / set) + ses paramètres.
 * Chaque filtre est un tableau de codes (OR interne, AND entre critères).
 */
function _cacFavFilterSql(array $factions, array $rarities, array $sets, array &$params): string {
    $sql = '';
    $add = function(string $col, array $vals) use (&$sql, &$params) {
        $vals = array_values(array_filter(array_map('cacFavNormalizeCode', $vals), function($v) { return $v !== ''; }));
        if (!$vals) return;
        $sql .= ' AND ' . $col . ' IN (' . implode(',', array_fill(0, count($vals), '?')) . ')';
        foreach ($vals as $v) $params[] = $v;
    };
    $add('faction',  $factions);
    $add('rarity',   $rarities);
    $add('card_set', $sets);
    return $sql;
}

/** Toutes les références favorites d'un utilisateur (plus récentes d'abord). */
function cacFavGetRefs(int $userId): array {
    if ($userId <= 0) return [];
    try {
        $stmt = getDB()->prepare(qp(
            "SELECT card_ref FROM {favorites} WHERE user_id = ? ORDER BY created_at DESC, card_ref ASC"
        ));
        $stmt->execute([$userId]);
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    } catch (Throwable $e) {
        return [];
    }
}

/** Nombre de favoris d'un utilisateur (avec filtres optionnels faction/rarity/set). */
function cacFavCount(int $userId, array $factions = [], array $rarities = [], array $sets = []): int {
    if ($userId <= 0) return 0;
    try {
        $params = [$userId];
        $where  = _cacFavFilterSql($factions, $rarities, $sets, $params);
        $stmt = getDB()->prepare(qp("SELECT COUNT(*) FROM {favorites} WHERE user_id = ?" . $where));
        $stmt->execute($params);
        return (int)$stmt->fetchColumn();
    } catch (Throwable $e) {
        return 0;
    }
}

/** Une page de références favorites (plus récentes d'abord), avec filtres optionnels. */
function cacFavGetPage(int $userId, int $page, int $perPage, array $factions = [], array $rarities = [], array $sets = []): array {
    if ($userId <= 0) return [];
    $perPage = max(1, $perPage);
    $page    = max(1, $page);
    $offset  = ($page - 1) * $perPage;
    try {
        $params = [$userId];
        $where  = _cacFavFilterSql($factions, $rarities, $sets, $params);
        $stmt = getDB()->prepare(qp(
            "SELECT card_ref FROM {favorites}
             WHERE user_id = ?" . $where . "
             ORDER BY created_at DESC, card_ref ASC
             LIMIT $perPage OFFSET $offset"
        ));
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    } catch (Throwable $e) {
        return [];
    }
}

/** Vrai si la carte est en favori pour cet utilisateur. */
function cacFavIsFavorite(int $userId, string $ref): bool {
    $ref = cacFavNormalizeRef($ref);
    if ($userId <= 0 || $ref === '') return false;
    try {
        $stmt = getDB()->prepare(qp(
            "SELECT 1 FROM {favorites} WHERE user_id = ? AND card_ref = ? LIMIT 1"
        ));
        $stmt->execute([$userId, $ref]);
        return $stmt->fetchColumn() !== false;
    } catch (Throwable $e) {
        return false;
    }
}

/** Ajoute un favori (idempotent) avec ses métadonnées. Renvoie true en cas de succès. */
function cacFavAdd(int $userId, string $ref, string $faction = '', string $rarity = '', string $cardSet = ''): bool {
    $ref = cacFavNormalizeRef($ref);
    if ($userId <= 0 || $ref === '') return false;
    try {
        $stmt = getDB()->prepare(qp(
            "INSERT INTO {favorites} (user_id, card_ref, faction, rarity, card_set, created_at)
             VALUES (?, ?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE
                faction  = VALUES(faction),
                rarity   = VALUES(rarity),
                card_set = VALUES(card_set)"
        ));
        return $stmt->execute([
            $userId, $ref,
            cacFavNormalizeCode($faction),
            cacFavNormalizeCode($rarity),
            cacFavNormalizeCode($cardSet),
        ]);
    } catch (Throwable $e) {
        return false;
    }
}

/** Retire un favori. Renvoie true si une ligne a été supprimée. */
function cacFavRemove(int $userId, string $ref): bool {
    $ref = cacFavNormalizeRef($ref);
    if ($userId <= 0 || $ref === '') return false;
    try {
        $stmt = getDB()->prepare(qp(
            "DELETE FROM {favorites} WHERE user_id = ? AND card_ref = ?"
        ));
        $stmt->execute([$userId, $ref]);
        return $stmt->rowCount() > 0;
    } catch (Throwable $e) {
        return false;
    }
}

/**
 * Bascule l'état favori d'une carte (stocke faction/rareté/set à l'ajout).
 * Renvoie le nouvel état : true = désormais favori, false = retiré (ou échec/invalide).
 */
function cacFavToggle(int $userId, string $ref, string $faction = '', string $rarity = '', string $cardSet = ''): bool {
    if (cacFavIsFavorite($userId, $ref)) {
        cacFavRemove($userId, $ref);
        return false;
    }
    return cacFavAdd($userId, $ref, $faction, $rarity, $cardSet);
}

/**
 * Remplit les métadonnées manquantes d'un favori existant (favori créé depuis card.php/deck.php,
 * sans codes). N'écrase que les lignes dont au moins un champ est vide. Ne touche jamais created_at.
 */
function cacFavBackfillMeta(int $userId, string $ref, string $faction, string $rarity, string $cardSet): void {
    $ref = cacFavNormalizeRef($ref);
    if ($userId <= 0 || $ref === '') return;
    $faction = cacFavNormalizeCode($faction);
    $rarity  = cacFavNormalizeCode($rarity);
    $cardSet = cacFavNormalizeCode($cardSet);
    if ($faction === '' && $rarity === '' && $cardSet === '') return;
    try {
        $stmt = getDB()->prepare(qp(
            "UPDATE {favorites}
                SET faction = ?, rarity = ?, card_set = ?
              WHERE user_id = ? AND card_ref = ?
                AND (faction = '' OR rarity = '' OR card_set = '')"
        ));
        $stmt->execute([$faction, $rarity, $cardSet, $userId, $ref]);
    } catch (Throwable $e) {
        // best-effort, silencieux
    }
}
