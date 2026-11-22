<?php
// Admin — "Icon" form field with a live preview, shared by the menu editors
// (navigation, sidebar, user menu, footer links, announcements, groups).
//
// The site renders stored icons with ac_icon() (design-system/php/ui.php), which accepts:
//   - a Lucide name:            "house", "trophy", "brand-github"
//   - a Font Awesome class list: "fa-solid fa-house" (mapped by design-system/icons/fa-map.json)
//   - an Altered glyph:          "fak fa-collection" (glyph font, rendered as <i>)
// PHP 7.4 compatible.

/**
 * Preview markup of an icon reference, as the site renders it. $fallback is shown when the
 * reference is empty.
 */
function adminIconPreview(string $ref, string $fallback = ''): string {
    $ref = trim($ref) !== '' ? $ref : $fallback;
    return $ref === '' ? '' : ac_icon($ref);
}

/**
 * Renders the field: label, input with preview, help text. Options:
 *   id        input id (default "icon-input"); the preview gets id "<id>-preview"
 *   name      input name (default "icon")
 *   label     label text (default "Icon")
 *   optional  true adds "(optional)" to the label
 *   clearable true adds a button that empties the input
 *   help      extra sentence placed before the standard help text
 *   fallback  icon previewed when the input is empty (not stored)
 *   placeholder
 *   maxlength
 */
function adminIconField(string $value, array $opts = []): void {
    $id          = $opts['id']          ?? 'icon-input';
    $name        = $opts['name']        ?? 'icon';
    $label       = $opts['label']       ?? 'Icon';
    $fallback    = $opts['fallback']    ?? '';
    $placeholder = $opts['placeholder'] ?? 'house';
    $maxlength   = isset($opts['maxlength']) ? (int)$opts['maxlength'] : 0;
    $helpId      = $id . '-help';
    ?>
    <label class="form-label" for="<?= h($id) ?>"><?= h($label) ?><?php if (!empty($opts['optional'])): ?> <small class="text-muted">(optional)</small><?php endif; ?></label>
    <div class="input-group">
        <span class="input-group-text" id="<?= h($id) ?>-preview" data-icon-fallback="<?= h($fallback) ?>" aria-hidden="true"><?= adminIconPreview($value, $fallback) ?></span>
        <input type="text" name="<?= h($name) ?>" id="<?= h($id) ?>" class="form-control" data-icon-input
               value="<?= h($value) ?>" placeholder="<?= h($placeholder) ?>" aria-describedby="<?= h($helpId) ?>"
               <?= $maxlength > 0 ? 'maxlength="' . $maxlength . '"' : '' ?> autocomplete="off" spellcheck="false">
        <?php if (!empty($opts['clearable'])): ?>
        <button type="button" class="btn btn-sm btn-outline-secondary" data-icon-clear="<?= h($id) ?>" title="No icon" aria-label="No icon"><?= ac_icon('x') ?></button>
        <?php endif; ?>
    </div>
    <div class="form-text" id="<?= h($helpId) ?>">
        <?php if (!empty($opts['help'])): ?><?= h($opts['help']) ?><?php endif; ?>
        A <a href="https://lucide.dev/icons/" target="_blank" rel="noopener">Lucide icon</a> name is preferred:
        <code>house</code>, <code>newspaper</code>, <code>trophy</code>, brands as <code>brand-github</code>.
        Font Awesome classes (<code>fa-solid fa-house</code>) are still accepted, and so are the Altered icons
        (<code>fak fa-collection</code>, <code>fak fa-booster-pack</code>).
    </div>
    <?php
    adminIconFieldScript();
}

/** Live preview script, printed once per page. */
function adminIconFieldScript(): void {
    static $done = false;
    if ($done) return;
    $done = true;
    ?>
    <script>
    (function () {
        // Lucide names are drawn with acIcon() (design-system/js/ac.js); Font Awesome class lists
        // and Altered glyphs (fak …) are set as the class of an <i>, drawn by fa-shim.css or the
        // glyph font.
        // Also used by pages with a second preview (announcement-edit): adminRenderIcon(el, value).
        function render(preview, value) {
            value = String(value).trim() || preview.getAttribute('data-icon-fallback') || '';
            preview.textContent = '';
            if (value === '') return;
            if (/^fa-[a-z0-9-]+$/.test(value)) value = 'fa-solid ' + value; // the shim needs a style class
            if (/\s/.test(value) || value.indexOf('fa-') === 0 || value === 'fak') {
                var i = document.createElement('i');
                i.className = value;
                i.setAttribute('aria-hidden', 'true');
                preview.appendChild(i);
            } else if (typeof window.acIcon === 'function' && /^[a-z0-9-]+$/.test(value)) {
                preview.innerHTML = window.acIcon(value);
            }
        }
        window.adminRenderIcon = render;
        document.addEventListener('click', function (e) {
            var btn = e.target.closest ? e.target.closest('[data-icon-clear]') : null;
            if (!btn) return;
            var input = document.getElementById(btn.getAttribute('data-icon-clear'));
            if (!input) return;
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.focus();
        });
        document.addEventListener('input', function (e) {
            var input = e.target;
            if (!input.matches || !input.matches('[data-icon-input]')) return;
            var preview = document.getElementById(input.id + '-preview');
            if (preview) render(preview, input.value);
        });
    }());
    </script>
    <?php
}
