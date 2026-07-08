<?php
// Émet la config window.AC_FAV + le module assets/favorites.js, pour les pages HORS moteur
// card-search (card.php, deck.php). N'émet le module que pour les utilisateurs connectés.
// Prérequis : core functions.php chargé (csrfToken, session), $uiLang disponible dans le scope.
require_once __DIR__ . '/favorites.php';

$_favUserId  = (int)($_SESSION['user_id'] ?? 0);
$_favEnabled = $_favUserId > 0;
if ($_favEnabled):
    $_favData  = array_fill_keys(cacFavGetRefs($_favUserId), true);
    $_favLabel = (($uiLang ?? 'en') === 'fr') ? 'Favori' : 'Favorite';
?>
<script>
window.AC_FAV = {
    enabled:   true,
    data:      <?= json_encode((object)$_favData) ?>,
    csrf:      <?= json_encode(csrfToken()) ?>,
    toggleUrl: <?= json_encode(BASE_URL . '/papi/core-altered-cards/favorites-toggle') ?>,
    label:     <?= json_encode($_favLabel) ?>
};
</script>
<script src="<?= h(BASE_URL) ?>/plugins/core-altered-cards/assets/favorites.js"></script>
<?php endif; ?>
