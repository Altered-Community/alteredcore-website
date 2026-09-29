#!/usr/bin/env python3
"""Regenerate the favicons and PWA icons in assets/favicon/ from the master logo.

Dev-only helper (not deployed, not used at runtime). Requires Pillow:
    python3 -m pip install --user pillow
    python3 tools/generate-pwa-icons.py

Master image: assets/favicon/src/reunion-logo-512.png (round medallion on a
transparent background).

Outputs, all written to assets/favicon/:
  - web-app-manifest-{192,512}.png            manifest purpose "any": transparent, logo as-is
  - web-app-manifest-maskable-{192,512}.png   manifest purpose "maskable": opaque full-bleed
                                              background, medallion inside the 80% safe zone
  - apple-touch-icon.png (180)                opaque beige background (iOS fills transparency
                                              with black and applies its own rounded mask)
  - favicon-{16,32,96}.png, favicon.ico       transparent, for browser tabs

If you change ICON_BG, also update the colour in assets/favicon/manifest.php.
"""
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, 'assets', 'favicon')
MASTER = os.path.join(OUT_DIR, 'src', 'reunion-logo-512.png')

# Deep blue of the medallion's inner disc (sampled from the master image).
# On a blue background the gold rim reads as a frame, and a launcher crop
# (circle, squircle, rounded square) only ever cuts into flat blue.
ICON_BG = (0, 97, 150)  # #006196

# Medallion diameter as a fraction of the canvas for opaque icons. The maskable
# safe zone is a centred circle of 80% diameter; 0.78 keeps a small margin.
OPAQUE_LOGO_RATIO = 0.78

# apple-touch-icon: the site's light page background, so the gold rim stands out
# instead of blending into a blue square. iOS crops to a rounded square, not to
# the 80% maskable circle, so the medallion can be larger.
APPLE_BG = (250, 245, 232)  # #FAF5E8
APPLE_LOGO_RATIO = 0.88


def load_master():
    img = Image.open(MASTER).convert('RGBA')
    img = img.crop(img.getchannel('A').getbbox())
    # The trimmed medallion can be a pixel off square: pad it back to a square.
    side = max(img.size)
    square = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    square.alpha_composite(img, ((side - img.width) // 2, (side - img.height) // 2))
    return square


def transparent(master, size):
    return master.resize((size, size), Image.LANCZOS)


def opaque(master, size, bg=ICON_BG, ratio=OPAQUE_LOGO_RATIO):
    canvas = Image.new('RGBA', (size, size), bg + (255,))
    d = round(size * ratio)
    logo = master.resize((d, d), Image.LANCZOS)
    canvas.alpha_composite(logo, ((size - d) // 2, (size - d) // 2))
    return canvas.convert('RGB')


def save(img, name):
    path = os.path.join(OUT_DIR, name)
    img.save(path, optimize=True)
    print('wrote', os.path.relpath(path, ROOT), img.size)


def main():
    master = load_master()

    for size in (192, 512):
        save(transparent(master, size), 'web-app-manifest-%dx%d.png' % (size, size))
        save(opaque(master, size), 'web-app-manifest-maskable-%dx%d.png' % (size, size))

    save(opaque(master, 180, APPLE_BG, APPLE_LOGO_RATIO), 'apple-touch-icon.png')

    for size in (16, 32, 96):
        save(transparent(master, size), 'favicon-%dx%d.png' % (size, size))

    ico_path = os.path.join(OUT_DIR, 'favicon.ico')
    transparent(master, 256).save(ico_path, sizes=[(16, 16), (32, 32), (48, 48)])
    print('wrote', os.path.relpath(ico_path, ROOT), '16/32/48')


if __name__ == '__main__':
    main()
