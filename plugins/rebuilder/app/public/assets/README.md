# Static assets from AlteredCore

Rarity gems (`gems/C.png`, `R.png`, `U.png`, `E.png`) and faction marks
(`faction/AX.png` …) are copied from
[Yutsa/alteredcore-website](https://github.com/Yutsa/alteredcore-website)
`plugins/core-altered-cards/assets/` (also served live at
`https://alteredcore.org/plugins/core-altered-cards/assets/…`).

They are vendored here so Re:Builder does not depend on hotlinking the PHP
app. Do not modify the website repo from this project.

Set marks (`set-logos/{SET}.svg`) are the small monochrome glyphs from
[alteredicons](https://github.com/Altered-Community/alteredcore-website/blob/preprod/assets/font/alteredicons.css),
the same `icon` each set carries in `plugins/core-altered-cards/data/altered.json`
(`fa-ext-coreset`, `fa-tbf`, `fa-wfm`, `fa-sky`, `fa-sdu`, `fa-roc`, `fa-nej`,
`fa-ks-set-icon`). They are not the set art in
`plugins/core-altered-cards/assets/set/small_bg`.
