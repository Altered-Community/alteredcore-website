<?php
// Newsletter e-mail of a news: previews the e-mail generated from the article
// (includes/newsletter_email.php) in both languages and saves it as a draft
// campaign in Listmonk, FR -> LISTMONK_LIST_FR, EN -> LISTMONK_LIST_EN.
// Nothing is sent from here: review and send from Listmonk.
$adminPageTitle = 'News newsletter';
$adminSection   = 'news';
require_once __DIR__ . '/includes/header.php';
require_once dirname(__DIR__) . '/includes/listmonk.php';
require_once dirname(__DIR__) . '/includes/newsletter_email.php';

$id   = (int)($_GET['id'] ?? 0);
$news = $id ? newsletterGetNews($id) : null;
if (!$news) {
    flash('News not found.', 'error');
    redirect(BASE_URL . '/admin/news');
}

$canSave = adminCanPublish() && listmonkEnabled()
        && defined('LISTMONK_TEMPLATE_ID') && (int)LISTMONK_TEMPLATE_ID > 0;
$langs   = ['fr' => (int)(defined('LISTMONK_LIST_FR') ? LISTMONK_LIST_FR : 0),
            'en' => (int)(defined('LISTMONK_LIST_EN') ? LISTMONK_LIST_EN : 0)];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        flash('Invalid form token. Please try again.', 'error');
    } elseif (!$canSave) {
        flash('Listmonk is not configured, or you lack the publish permission.', 'error');
    } else {
        $done = [];
        $errs = [];
        foreach ((array)($_POST['langs'] ?? []) as $lang) {
            if (!isset($langs[$lang])) continue;
            $title = ($news['title_' . $lang] ?? '') ?: $news['title_en'];
            $key   = '[news #' . $id . ' ' . $lang . ']';
            $res   = listmonkSaveDraftCampaign($key, $key . ' ' . $title, $title, $langs[$lang],
                newsletterEmailHtml($news, $lang));
            if (isset($res['error'])) {
                $errs[] = strtoupper($lang) . ': ' . $res['error'];
            } else {
                $done[] = strtoupper($lang) . ' (#' . $res['id'] . ($res['updated'] ? ', updated' : ', created') . ')';
            }
        }
        $msg = $done ? 'Listmonk draft campaigns saved: ' . implode(', ', $done) . '. Review and send them from Listmonk.' : '';
        if ($errs) {
            flash(trim($msg . ' Errors: ' . implode(' — ', $errs)), 'error');
        } elseif ($done) {
            flash($msg);
        } else {
            flash('Pick at least one language.', 'error');
        }
    }
    redirect(BASE_URL . '/admin/news-newsletter?id=' . $id);
}

$previews = ['fr' => newsletterEmailHtml($news, 'fr', true), 'en' => newsletterEmailHtml($news, 'en', true)];
?>

<div class="ac-stack">
<header class="ac-page-header">
    <div>
        <h1 class="ac-page-header__title"><?= ac_icon('mail') ?> Newsletter: <?= h($news['title_en']) ?></h1>
        <p class="ac-page-header__subtitle">The e-mail generated from this news, as Listmonk will send it.</p>
    </div>
    <div class="ac-page-header__actions">
        <a href="<?= BASE_URL ?>/admin/news" class="ac-button ac-button--ghost ac-button--sm"><?= ac_icon('arrow-left') ?> Back</a>
        <a href="<?= BASE_URL ?>/admin/news-edit?id=<?= $id ?>" class="ac-button ac-button--secondary ac-button--sm"><?= ac_icon('pencil') ?> Edit the news</a>
    </div>
</header>

<?php if (!$news['is_published']): ?>
<div class="ac-notice ac-notice--warning">
    <?= ac_icon('triangle-alert') ?>
    <div><p>This news is not published: the links of the e-mail to the article will not work until it is.</p></div>
</div>
<?php endif; ?>

<section class="ac-card">
    <?php if ($canSave): ?>
    <form method="post" class="ac-row ac-row--lg">
        <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
        <?php foreach ($langs as $lang => $listId): ?>
        <label class="ac-check">
            <input type="checkbox" name="langs[]" value="<?= $lang ?>" checked>
            <?= strtoupper($lang) ?> <span class="ac-text-muted">(list #<?= $listId ?>)</span>
        </label>
        <?php endforeach; ?>
        <button type="submit" class="ac-button ac-button--sm"><?= ac_icon('send') ?> Save as Listmonk drafts</button>
        <a href="<?= h(rtrim(LISTMONK_URL, '/')) ?>/admin/campaigns" target="_blank" rel="noopener" class="ac-button ac-button--ghost ac-button--sm">
            Open Listmonk <?= ac_icon('external-link') ?>
        </a>
    </form>
    <p class="ac-field__hint">Creates one draft campaign per language, or updates it if this news already has one (saving again after editing the news is safe). Nothing is sent: review and send from Listmonk.</p>
    <?php elseif (!adminCanPublish()): ?>
    <p class="ac-field__hint">Saving to Listmonk needs the <em>Can publish</em> permission.</p>
    <?php else: ?>
    <p class="ac-field__hint">Listmonk is not configured: set LISTMONK_URL and LISTMONK_TEMPLATE_ID in config.local.php to save these e-mails as campaigns.</p>
    <?php endif; ?>
</section>

<section class="ac-card ac-stack">
    <div class="ac-segmented" role="group" aria-label="Preview language">
        <?php foreach (array_keys($previews) as $i => $lang): ?>
        <button type="button" class="nl-tab" data-lang="<?= $lang ?>" aria-pressed="<?= $i === 0 ? 'true' : 'false' ?>"><?= strtoupper($lang) ?></button>
        <?php endforeach; ?>
    </div>
    <?php foreach ($previews as $lang => $html): ?>
    <iframe class="nl-preview" data-lang="<?= $lang ?>" title="Preview <?= strtoupper($lang) ?>"
            srcdoc="<?= htmlspecialchars($html, ENT_QUOTES, 'UTF-8') ?>"
            style="width:100%; height:80vh; border:1px solid var(--ac-color-border); border-radius:var(--ac-radius-md);"<?= $lang !== 'fr' ? ' hidden' : '' ?>></iframe>
    <?php endforeach; ?>
</section>
</div>

<script>
document.querySelectorAll('.nl-tab').forEach(function (btn) {
    btn.addEventListener('click', function () {
        document.querySelectorAll('.nl-tab').forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
        document.querySelectorAll('.nl-preview').forEach(function (f) { f.hidden = f.dataset.lang !== btn.dataset.lang; });
    });
});
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
