<?php
$adminPageTitle = 'Themes';
$adminSection   = 'themes';
require_once __DIR__ . '/includes/header.php';

// The site no longer has swappable themes. Its look comes from the design system
// (design-system/): one palette with a light and a dark theme, chosen by each visitor.
// themes/<slug>/ only holds the shell templates (header, menu, footer); SITE_THEME_FALLBACK
// (includes/functions.php) is the only one shipped.

$errors = [];
$stored = (string)(getSetting('active_theme') ?? '');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        $errors[] = 'Invalid form token.';
    } elseif (($_POST['action'] ?? '') === 'reset') {
        // Clears a setting left over from the former theme switcher.
        saveSetting('active_theme', null);
        flash('Theme setting reset.');
        redirect(BASE_URL . '/admin/themes');
    }
}

$active = getActiveTheme();
$themes = getAvailableThemes();
$flash  = getFlash();
?>

<div class="admin-header-bar">
    <h1><?= ac_icon('palette', 'me-2') ?>Themes</h1>
</div>

<?php if ($errors): ?>
<div class="alert alert-danger"><?= implode('<br>', array_map('h', $errors)) ?></div>
<?php endif; ?>
<?php if ($flash): ?>
<div class="alert alert-<?= $flash['type'] === 'success' ? 'success' : 'danger' ?>"><?= h($flash['msg']) ?></div>
<?php endif; ?>

<div class="ac-notice mb-4" role="note">
    <?= ac_icon('info') ?>
    <div>
        <p class="ac-notice__title">The look of the site comes from the design system</p>
        <p class="mb-1">
            Colours, fonts, spacing and components are defined once in <code>design-system/</code> and shared by
            every page, plugin and application of the site. There is no theme to choose: visitors switch between
            the <strong>light</strong> and <strong>dark</strong> themes themselves, and controls get larger on touch screens.
        </p>
        <p>
            To change the look, edit the design system (<code>design-system/README.md</code>);
            every component is shown on the <a href="<?= BASE_URL ?>/pages/design-system" target="_blank" rel="noopener">reference page</a>.
            The logo, font, background and banner are still set in their own settings pages.
        </p>
    </div>
</div>

<?php if ($stored !== '' && $stored !== $active): ?>
<div class="alert alert-warning d-flex flex-wrap align-items-center justify-content-between gap-2">
    <span>
        The settings still name the theme <code><?= h($stored) ?></code>, which is no longer available.
        The site uses <code><?= h($active) ?></code>.
    </span>
    <form method="post" class="mb-0">
        <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
        <input type="hidden" name="action" value="reset">
        <button type="submit" class="btn btn-sm btn-outline-secondary">Reset the setting</button>
    </form>
</div>
<?php endif; ?>

<h2 class="ac-section-title">Installed</h2>
<div class="row g-4">
<?php foreach ($themes as $theme): ?>
    <div class="col-12 col-md-6 col-xl-4">
        <div class="ac-card h-100">
            <div class="d-flex align-items-start justify-content-between gap-2 mb-1">
                <h3 class="ac-card__title"><?= h($theme['name']) ?></h3>
                <?php if ($theme['slug'] === $active): ?>
                <span class="ac-badge ac-badge--green">In use</span>
                <?php endif; ?>
            </div>
            <?php if ($theme['description'] !== ''): ?>
            <p class="ac-card__meta mb-2"><?= h($theme['description']) ?></p>
            <?php endif; ?>
            <p class="ac-card__meta mb-0">
                <code>themes/<?= h($theme['slug']) ?>/</code>
                <?php if ($theme['version'] !== ''): ?> &middot; v<?= h($theme['version']) ?><?php endif; ?>
                <?php if ($theme['author'] !== ''): ?> &middot; <?= h($theme['author']) ?><?php endif; ?>
            </p>
        </div>
    </div>
<?php endforeach; ?>
<?php if (empty($themes)): ?>
<div class="col-12">
    <div class="alert alert-warning">No theme found in the <code>themes/</code> directory.</div>
</div>
<?php endif; ?>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
