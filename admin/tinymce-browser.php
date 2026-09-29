<?php
require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/includes/functions.php';

if (!canViewAdminPanel()) {
    http_response_code(403);
    exit('Forbidden');
}
if (empty($_SESSION['admin_logged_in']) && !adminCanCreate() && !adminCanEdit()) {
    http_response_code(403);
    exit('Forbidden');
}

// Scan uploads/ for subfolders
$uploadsDir = dirname(__DIR__) . '/uploads/';
$folders = [];
if (is_dir($uploadsDir)) {
    $items = scandir($uploadsDir);
    foreach ($items as $item) {
        if ($item[0] === '.') continue;
        if (is_dir($uploadsDir . $item)) $folders[] = $item;
    }
    sort($folders);
}
$defaultFolder = !empty($folders) ? $folders[0] : 'news';
?><!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Image Browser</title>
<link rel="stylesheet" href="<?= htmlspecialchars(dsUrl('fonts/fonts.css'), ENT_QUOTES) ?>">
<link rel="stylesheet" href="<?= htmlspecialchars(dsUrl('tokens/tokens.css'), ENT_QUOTES) ?>">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--ac-font-family); font-size: 13px; background: var(--ac-color-bg-app); color: var(--ac-color-text); display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
:focus-visible { outline: 2px solid var(--ac-color-focus); outline-offset: 2px; }

#toolbar { display: flex; align-items: center; gap: var(--ac-space-2); padding: var(--ac-space-2) var(--ac-space-3); background: var(--ac-color-surface); border-bottom: 1px solid var(--ac-color-border); flex-shrink: 0; }
#toolbar label { font-weight: 600; white-space: nowrap; }
#folderSelect, #searchBox { height: var(--ac-control-sm); padding: 0 var(--ac-space-2); border: 1px solid var(--ac-color-border-control); border-radius: var(--ac-radius-md); background: var(--ac-color-surface); color: var(--ac-color-text); font: inherit; }
#searchBox { flex: 1; min-width: 0; }
#statusBar { font-size: 11px; color: var(--ac-color-text-muted); margin-left: auto; white-space: nowrap; }

#grid { flex: 1; overflow-y: auto; padding: var(--ac-space-3); display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: var(--ac-space-2); align-content: start; }

.img-item { border: 2px solid transparent; border-radius: var(--ac-radius-sm); overflow: hidden; cursor: pointer; background: var(--ac-color-surface); transition: border-color var(--ac-duration-fast); }
.img-item:hover { border-color: var(--ac-color-primary-border); }
.img-item.selected { border-color: var(--ac-color-primary); box-shadow: 0 0 0 2px var(--ac-color-primary-soft); }
.img-item img { display: block; width: 100%; height: 90px; object-fit: cover; }
.img-item span { display: block; font-size: 10px; color: var(--ac-color-text-muted); padding: 3px 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

#footer { display: flex; align-items: center; gap: var(--ac-space-2); padding: var(--ac-space-2) var(--ac-space-3); background: var(--ac-color-surface); border-top: 1px solid var(--ac-color-border); flex-shrink: 0; }
#selectedUrl { flex: 1; font-size: 11px; color: var(--ac-color-text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#btnInsert, #btnCancel { height: var(--ac-control-sm); padding: 0 var(--ac-space-4); border-radius: var(--ac-radius-md); cursor: pointer; font: inherit; font-weight: 600; }
#btnInsert { background: var(--ac-color-primary); color: var(--ac-color-on-primary); border: 1px solid transparent; }
#btnInsert:hover:not(:disabled) { background: var(--ac-color-primary-strong); }
#btnInsert:disabled { opacity: .45; cursor: not-allowed; }
#btnCancel { background: var(--ac-color-surface); color: var(--ac-color-text); border: 1px solid var(--ac-color-border-control); }
#btnCancel:hover { background: var(--ac-color-bg-subtle); }

.msg { grid-column: 1 / -1; text-align: center; padding: var(--ac-space-8); color: var(--ac-color-text-muted); font-size: 13px; }
.msg--error { color: var(--ac-color-required); }
</style>
</head>
<body>

<div id="toolbar">
    <label for="folderSelect">Folder:</label>
    <select id="folderSelect">
        <?php foreach ($folders as $f): ?>
        <option value="<?= htmlspecialchars($f, ENT_QUOTES) ?>"><?= htmlspecialchars($f, ENT_QUOTES) ?></option>
        <?php endforeach; ?>
        <?php if (empty($folders)): ?>
        <option value="news">news</option>
        <?php endif; ?>
    </select>
    <input type="text" id="searchBox" placeholder="Filter images…">
    <span id="statusBar"></span>
</div>

<div id="grid"><p class="msg">Loading…</p></div>

<div id="footer">
    <span id="selectedUrl">No image selected</span>
    <button id="btnCancel">Cancel</button>
    <button id="btnInsert" disabled>Insert image</button>
</div>

<script>
(function () {
    var BASE       = '<?= BASE_URL ?>';
    var grid       = document.getElementById('grid');
    var folderSel  = document.getElementById('folderSelect');
    var searchBox  = document.getElementById('searchBox');
    var statusBar  = document.getElementById('statusBar');
    var selectedUrl= document.getElementById('selectedUrl');
    var btnInsert  = document.getElementById('btnInsert');
    var btnCancel  = document.getElementById('btnCancel');
    var _selected  = null;
    var _allImages = [];

    function escH(s) {
        return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    function renderImages(images) {
        if (!images.length) {
            grid.innerHTML = '<p class="msg">No images found.</p>';
            statusBar.textContent = '0 images';
            return;
        }
        statusBar.textContent = images.length + ' image' + (images.length > 1 ? 's' : '');
        var html = '';
        images.forEach(function (img) {
            html += '<div class="img-item" data-url="' + escH(img.url) + '" data-name="' + escH(img.name) + '" title="' + escH(img.name) + '">'
                  + '<img src="' + escH(img.url) + '" alt="' + escH(img.name) + '" loading="lazy">'
                  + '<span>' + escH(img.name) + '</span>'
                  + '</div>';
        });
        grid.innerHTML = html;
        grid.querySelectorAll('.img-item').forEach(function (el) {
            el.addEventListener('click', function () { selectItem(el); });
            el.addEventListener('dblclick', function () { selectItem(el); doInsert(); });
        });
    }

    function applyFilter() {
        var q = searchBox.value.toLowerCase();
        var filtered = !q ? _allImages : _allImages.filter(function (img) {
            return img.name.toLowerCase().indexOf(q) !== -1;
        });
        renderImages(filtered);
        setSelected(null);
    }

    function setSelected(url) {
        _selected = url;
        selectedUrl.textContent = url || 'No image selected';
        btnInsert.disabled = !url;
        grid.querySelectorAll('.img-item').forEach(function (el) {
            el.classList.toggle('selected', el.dataset.url === url);
        });
    }

    function selectItem(el) {
        setSelected(el.dataset.url);
    }

    function loadFolder(folder) {
        grid.innerHTML = '<p class="msg">Loading…</p>';
        setSelected(null);
        statusBar.textContent = '';
        _allImages = [];
        fetch(BASE + '/admin/media-library.php?action=list&folder=' + encodeURIComponent(folder), { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                _allImages = data.ok ? data.images : [];
                applyFilter();
            })
            .catch(function () {
                grid.innerHTML = '<p class="msg msg--error">Failed to load folder.</p>';
            });
    }

    function doInsert() {
        if (!_selected) return;
        var alt = '';
        // Get alt text from selected item name (strip extension)
        var el = grid.querySelector('.img-item.selected');
        if (el) alt = el.dataset.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
        if (window.opener && typeof window.opener.tinymceBrowserCallback === 'function') {
            window.opener.tinymceBrowserCallback(_selected, alt);
        }
        window.close();
    }

    folderSel.addEventListener('change', function () { searchBox.value = ''; loadFolder(folderSel.value); });
    searchBox.addEventListener('input', applyFilter);
    btnInsert.addEventListener('click', doInsert);
    btnCancel.addEventListener('click', function () { window.close(); });

    // Initial load
    folderSel.value = '<?= htmlspecialchars($defaultFolder, ENT_QUOTES) ?>';
    loadFolder(folderSel.value);
})();
</script>
</body>
</html>
