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
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; font-size: 13px; background: #f5f4f0; color: #333; display: flex; flex-direction: column; height: 100vh; overflow: hidden; }

#toolbar { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #fff; border-bottom: 1px solid #ddd; flex-shrink: 0; }
#toolbar label { font-weight: 600; white-space: nowrap; }
#folderSelect { padding: 4px 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; }
#searchBox { padding: 4px 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; flex: 1; min-width: 0; }
#statusBar { font-size: 11px; color: #888; margin-left: auto; white-space: nowrap; }

#grid { flex: 1; overflow-y: auto; padding: 12px; display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; align-content: start; }

.img-item { border: 2px solid transparent; border-radius: 6px; overflow: hidden; cursor: pointer; background: #fff; transition: border-color .15s; }
.img-item:hover { border-color: #c9a84c; }
.img-item.selected { border-color: #c9a84c; box-shadow: 0 0 0 2px #c9a84c44; }
.img-item img { display: block; width: 100%; height: 90px; object-fit: cover; }
.img-item span { display: block; font-size: 10px; color: #666; padding: 3px 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

#footer { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #fff; border-top: 1px solid #ddd; flex-shrink: 0; }
#selectedUrl { flex: 1; font-size: 11px; color: #555; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#btnInsert { padding: 6px 18px; background: #c9a84c; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 13px; }
#btnInsert:disabled { background: #ccc; cursor: default; }
#btnCancel { padding: 6px 14px; background: none; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; font-size: 13px; }

.msg { grid-column: 1 / -1; text-align: center; padding: 32px; color: #888; font-size: 13px; }
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
                grid.innerHTML = '<p class="msg" style="color:#c00">Failed to load folder.</p>';
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
