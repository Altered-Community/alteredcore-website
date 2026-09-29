# Composants Angular `ac-*` du plugin Re:Builder — inventaire et API

Les tokens (`--ac-*`) et les styles des composants génériques viennent du design system du site :
`design-system/` à la racine du repo ([README](../../../../design-system/README.md),
[WORKFLOW](../../../../design-system/WORKFLOW.md)). Le shell injecte `design-system/css/base.css` et
`design-system/css/components/*.css` dans le shadow root du plugin, avant les styles du plugin ; les tokens
héritent de `<html>` (`data-theme`, `data-density`). Pour un composant générique (bouton, champ, puce…), la
classe `ac-*` est dessinée par `design-system/css/components/` : le composant Angular pose seulement le
balisage et les classes. Le changer, c'est d'abord changer le CSS du design system (et sa doc), puis le
composant Angular. Les composants métier gardent leur SCSS, en tokens uniquement.

Principes communs :

- Composants standalone et `OnPush` par défaut (Angular 22, rien à déclarer), entrées/sorties en **signals** (`input()`, `output()`, `model()`).
- Les champs de formulaire implémentent `ControlValueAccessor` (utilisables avec Reactive Forms).
- **Une taille logique** (`size: 'sm' | 'md' | 'lg'`), jamais une hauteur en pixels : la hauteur vient de
  `--ac-control-*`, qui change avec `data-density` (pointer 32/40/48, touch 36/44/52).
- Aucune couleur, rayon ou ombre en dur : uniquement les variables `--ac-*` (`design-system/tokens/tokens.css`).
  Jamais de sélecteur `data-theme` / `data-density` : une valeur qui change avec la densité est un token
  (`--ac-control-*`, `--ac-hit-min`, `--ac-field-font-size`, `--ac-select-font-size`, `--ac-segment-*`,
  `--ac-page-padding`).
- Icônes : noms Lucide (`trash-2`, `ellipsis`, `sliders-horizontal`…), les mêmes que `ac_icon()` sur le site.
- Accessibilité : vrais `<button>` / `<a>` / `<input>`, `aria-label` obligatoire sur les boutons icône, focus visible,
  zone cliquable ≥ `--ac-hit-min`.
- « CSS DS » : dessiné par `design-system/css/components/<fichier>.css` ; sinon, SCSS du composant.

---

## 1. Fondations et infrastructure

| Élément | Rôle | API |
|---|---|---|
| Tokens `--ac-*` | Variables du site (`design-system/tokens/tokens.css`), sur `:root` | héritées dans le shadow root. Texte sur fond : `--ac-color-on-primary` (fond `--ac-color-primary`), `--ac-color-inverse` / `--ac-color-on-inverse` (compteurs, onglet pilule actif), `--ac-color-on-strong` (visuel, faction, commande posée sur une carte) ; `--ac-page-top` / `--ac-sticky-top` : haut de page et bord des panneaux collants |
| `src/embed/embed.scss` | Styles globaux du plugin dans le shadow root | `:host { all: initial }`, CDK overlay, classes `ac-overlay-*` des contenus d'overlay, `ac-hatch` ; la racine est `.ac-plugin-root` (conteneur du shell, stylé par `base.css`) |
| `AcDensityService` | Densité choisie par le site (`data-density` sur `<html>`, posé par le shell), en lecture seule | `density = signal<'pointer'\|'touch'>()`, pour les composants dont la mise en page (pas seulement les tailles) change avec la densité (`ac-faction-tabs`) |
| `AcBreakpointService` | Taille de fenêtre logique | `size = signal<'compact'\|'medium'\|'expanded'>()` (< 768, 768–1199, ≥ 1200 ; `BREAKPOINTS` de `design-system/tokens/breakpoints.ts`) |
| `ac-icon`, CSS DS (`icon.css`) | Icône Lucide | `name` (nom Lucide, `brand-discord` pour le logo plein), `size = 16` (→ `--ac-icon-size`), `strokeWidth = 2` (→ `--ac-icon-stroke`) ; rend `<svg class="ac-icon">`, hôte en `display: contents` |

## 2. Actions — `DS-Boutons`

| Composant | Variantes / entrées | Sorties | Écrans |
|---|---|---|---|
| `ac-button` (attribut `acButton` sur `<button>` ou `<a routerLink>`), CSS DS (`button.css`) | `variant: 'primary' \| 'secondary' \| 'ghost' \| 'add' \| 'danger'` (défaut `primary`), `size: 'sm' \| 'md' \| 'lg'` (défaut `md`), `icon?: string`, `fullWidth: boolean`, `disabled` ; propriété CSS `--ac-button-icon-color` pour colorer l'icône seule (logo Discord : `var(--ac-color-discord)`) | clic natif | tous |
| `ac-icon-button` (attribut `acIconButton`), CSS DS (`button.css`) | `acIconButton` (icône, requis), `ariaLabel` (requis), `variant: 'secondary' \| 'ghost' \| 'primary'`, `size` | clic natif | barres, réglages, fermer |
| `ac-card-add` | — | `add` | tuiles de carte (recherche, aperçu) |
| `ac-like-button` | sur `<button acLikeButton>` : `count` (affiché en notation courte, « 1,2 k »), `liked` (cœur plein, fond blanc, `--ac-color-like`), `ariaLabel` (requis, ex. « J’aime Kojo Havre, 128 j’aime ») ; `aria-pressed` ; pastille `--ac-control-sm` − 4 px (28 px, 32 px en touch) posée sur un visuel, zone cliquable ≥ `--ac-hit-min` | clic natif | cartes de deck (Communauté) |
| `ac-stepper` | `value = model<number>()`, `min = 0`, `max`, `appearance: 'overlay' \| 'inline'` | `valueChange` | `overlay` : sur les cartes ; `inline` : lignes de deck |

Classes et états des boutons : `design-system/docs/components/button.md`.

## 3. Champs — `DS-Champs`

| Composant | Entrées | Sorties | Écrans |
|---|---|---|---|
| `ac-input`, CSS DS (`field.css` : `ac-field`, `ac-input`, `ac-input-icon`) ; position de l'icône et bouton Effacer dans le SCSS | `label?`, `icon?` (`search`), `placeholder`, `type`, `appearance: 'default' \| 'subtle'`, `clearable`, `invalid`, CVA | `enter` | recherche, coûts « 3, 1-3, 4+ », nom du deck |
| `ac-select`, CSS DS (`ac-field`, `ac-select`) | `options: {value,label}[]`, `label?`, `inlineLabel`, CVA | — | tri, formats (liste Mes decks) |
| `ac-segmented<T>`, CSS DS (`segmented.css`) | `options: {value, label?, icon?, ariaLabel?}[]`, `value = model<T>()`, `fullWidth`, `size` | — | Privé/Public, Environnement, Recherche/Voir le deck, Grille/Liste, Par type/Par coût, Tous/Publics/Privés |
| `ac-radio-card` (dans un conteneur `role=radiogroup`) | `name`, `title`, `description`, `tag?: {label, tone}`, `checked`, `layout: 'row' \| 'stacked' \| 'compact'` (`compact` : radio 18 px, titre `--ac-field-font-size`/700, description sur une ligne avec points de suspension, tag centré à droite) | `choose` | choix du format (création : `compact`, réglages : `row`) |
| `ac-combobox<T>` | `options: {id, text, glyph?}[]`, `values = model<T[]>()`, `placeholder`, `emptyPlaceholder`, `searchPlaceholder = 'Rechercher…'` | `searchChange` (texte saisi) | éditeur d'effet (déclencheur, condition, effet). Le contrôle « Ajouter… » est un bouton (`role=combobox`) : il ouvre la liste avec un champ de recherche **non focalisé** (pas de clavier tactile tant qu'on ne touche pas le champ) ; une touche lettre sur le bouton démarre la recherche. Aucune option n'est surlignée à l'ouverture (seulement après une flèche ou une recherche) ; après un choix au toucher ou à la souris, la liste se ferme et rien ne garde le focus ; après Entrée, le focus revient au bouton. `glyph` : caractère `Altered Icons` avant le texte, dans la liste et sur la puce (main, réserve, partout). La liste ouverte est ramenée dans la vue (bas de feuille). « ou » entre chaque valeur et avant le bouton « Ajouter… » dès qu'au moins une valeur est choisie ; rien si la liste est vide |
| `ac-editable-title` | `value = model<string>()`, `ariaLabel` | — | titre du deck (desktop) |

Classes et états des champs et du contrôle segmenté : `design-system/docs/components/field.md` et `segmented.md`.

## 4. Puces, badges, indicateurs — `DS-Puces`

| Composant | Entrées | Sorties | Écrans |
|---|---|---|---|
| `ac-chip`, CSS DS (`chips.css` : `<button class="ac-chip">`, `ac-chip__dot` via `--ac-chip-dot`) | `label`, `dot?: string` (couleur faction), `removable`, `selected = model<boolean>()`, `shape: 'pill' \| 'square'` | `remove` | filtres actifs, types de carte, factions |
| `ac-filter-bar` | `chips: {id,label}[]` | `remove(id)`, `clearAll` | recherche desktop et mobile |
| `ac-icon-toggle-group` | `options: {value, icon, label}[]`, `values = model<string[]>()` | — | filtre rareté (C, R, E) |
| `ac-badge`, CSS DS (`chips.css`) | `tone: 'blue' \| 'green' \| 'violet' \| 'red' \| 'orange' \| 'neutral'`, `icon?`, `size: 24 \| 28` | — | format, Légal, Deck valide |
| `ac-tag`, CSS DS (`chips.css`) | `tone` | — | BGA : disponible / Arène BGA / indisponible |
| `ac-count`, CSS DS (`chips.css`) | `value`, `tone: 'dark' \| 'success' \| 'soft'` | — | nombre de filtres, 39 dans la nav |
| `ac-rarity-summary` | `counts: {C,R,U,E}`, `gap?` | — | résumés de deck, cartes de deck |
| `ac-terrain-totals` | `totals: {foret, montagne, ocean}` | — | Stats |
| `ac-logic-divider` | `label = 'et'` | — | entre blocs d'effets |

`ac-filter-bar` : une seule ligne, défilement horizontal, dégradé vers le fond, « Tout effacer » fixé à droite.
`ac-rarity-summary` : le groupe d'icônes ne se coupe jamais ; s'il manque de place, il passe entier à la ligne.

## 5. Navigation — `DS-Navigation`

| Composant | Entrées | Écrans |
|---|---|---|
| `ac-app-bar` | barre des écrans compacts (< 768 px), collante sous l'en-tête du site : `title`, `subtitle?`, slots `[leading]` / `[actions]` | Decks, éditeur, consultation (compact) |
| `ac-avatar`, CSS DS (`chips.css`) | `name` (initiale), `size: 28 \| 32` | éditeur (barre compacte) |
| `ac-back-button` | `fallback` (route si la page a été ouverte directement), `label = 'Retour'` ; revient à la page précédente de l'app (`AcNavigationHistory`, injecté au démarrage dans `EmbedApp`) | barres compactes des pages imbriquées : éditeur, consultation |
| `ac-tabs`, CSS DS (`navigation.css`) ; débord des pastilles dans la gouttière dans le SCSS | `tabs: {id,label,count?}[]`, `active = model<string>()`, `appearance: 'underline' \| 'pill'` (souligné ≥ medium, pastilles défilantes en compact) | source des cartes, Mes decks / Communauté, Cartes / Decklist |
| `ac-bottom-nav` | `items: {route, icon, label, badge?}[]` — rendu seulement en compact, au-dessus de `env(safe-area-inset-bottom)` | éditeur mobile, consultation mobile |
| `ac-breadcrumb`, CSS DS (`navigation.css`) | `items: {label, route?}[]` | éditeur desktop |

## 6. Conteneurs — `DS-Conteneurs`

| Composant | Entrées | Écrans |
|---|---|---|
| `ac-card`, CSS DS (`card.css`) | `padding: 'md' \| 'sm' \| 'none'` | panneaux, sections de deck |
| `ac-collapsible` | `title`, `open = model<boolean>(false)`, contenu projeté | Stats (ouvertes par défaut : `[(open)]` à `true`) |
| `ac-filter-section` | `title`, `count?`, action projetée (`ng-content select="[action]"`) | panneau de filtres |
| `ac-virtual-grid` | `items`, `overscan = 1.5` (écrans de rangées gardés au-dessus et au-dessous), `initial = 36` (cases rendues avant la mesure) ; expose `slice()` (éléments à rendre), `first()` (index dans `items` du premier rendu, pour `aria-posinset`) et `atEnd()` (dernier élément rendu : afficher les squelettes). Le parent rend lui-même les cases en contenu projeté : `<ac-virtual-grid #grid class="grid" [items]="cards">@for (c of grid.slice(); track c.reference) {…}</ac-virtual-grid>`. Grille CSS dont seules les rangées à moins de `overscan` écrans sont dans le DOM ; les autres sont remplacées par un padding de même hauteur (la page garde sa longueur, le sentinel de scroll infini reste en bas). L'hôte est la grille : le parent pose colonnes et espacements par une classe. Toutes les cases ont la hauteur de la première ; défile avec la fenêtre | résultats de recherche de cartes (éditeur) |
| `AcOverlayService` | `open(Component, {title, data, width?, height?: 'auto' \| 'fill', compact?: 'sheet' \| 'fullscreen'})` → CDK `Dialog` (`height: 'fill'` : fenêtre = hauteur de l'écran − 80 px) ; **jamais deux fenêtres superposées** : un écran secondaire s'ouvre avec `ref.openStep(Component, {title, data})`, qui remplace le contenu dans la même fenêtre / feuille (flèche retour, Échap et bouton retour du navigateur reviennent à l'écran précédent, dont l'état est conservé ; résultat sur `afterClosed` de l'étape) ; en compact : feuille basse par défaut (poignée, coins 20, `--ac-shadow-sheet`) ou page plein écran ; ≥ 768 px : fenêtre centrée (rayon 16, `--ac-shadow-dialog`) ; même composant de contenu, même pied d'actions | réglages du deck, éditeur d'effet, filtres mobile, nouveau deck, choisir un héros |

## 7. Composants métier — `DS-Metier`

| Composant | Entrées | Sorties | Écrans |
|---|---|---|---|
| `ac-card-tile` | `card`, `quantity`, `max` ; affiche coût main / réserve, nom + type sur bandeau ; anneau `--ac-ring-selected` si `quantity > 0` ; `readonly` (« ×n ») ; `plain` (carte seule, sans « + » ni compteur) ; une référence unique (`…_U_n`) affiche `ac-unique-card` à la place de l'image ; en attendant l'image, un fond gris clair uni (`--ac-color-track`, `ac-card-art` en `neutral`), sans texte ni couleur de faction | `quantityChange` | recherche, uniques, aperçu |
| `ac-unique-card` | `card` (réponse `/api/cards`, textes en chaîne ou en table de langues), `eager` ; face d'une Unique dessinée à partir de ses données, car aucune image par Unique n'est publiée : illustration Unique du CDN (`cards/assets/{SET}/{carte}_U.webp`, repli sans cadre puis dos de carte), coûts main / réserve, puissances Forêt / Montagne / Océan (icônes `assets/biome/`), texte (`{J}` `{R}` `{H}` `{D}` `{T}` en pastilles, `[mot-clé]` en gras, capacité de soutien sous un filet), numéro de collection en pied ; couleur de faction via `--ac-faction-*` ; tailles en `cqw`, lisibles comme une image de carte à la même largeur ; le cadre et le texte passent au-dessus de l'illustration ; sans coûts (ligne de deck invité rechargée) : illustration et nom seuls. L'aperçu d'un deck charge le texte imprimé (`mainEffect` / `echoEffect`) : conservé sur la ligne invité, sinon `POST /api/cards/batch` | — | tuiles Uniques (recherche, aperçu du deck) |
| `ac-deck-row` | `card`, `quantity`, `max`, `readonly` (consultation : « ×3 » + coûts, sans stepper), `plain` (rareté, nom, coûts, sans quantité) | `quantityChange` | panneau deck, Deck mobile, decklist |
| `ac-deck-section` | `title` (Personnages, Sorts…), `count`, `collapsible` | — | panneau deck, aperçu, cartes |
| `ac-cost-chart` | `values: number[7]` (coûts 1…7+), `tone: 'main' \| 'reserve'` | — | Stats |
| `ac-deck-summary` | `deck`, `appearance: 'card' \| 'embedded'` (`embedded` dans le panneau desktop : sans le nom, déjà dans le titre) ; total, validité et raretés centrés | `openSettings` → `AcOverlayService` « Réglages du deck » | éditeur desktop et mobile |
| `app-new-deck` (contenu d'overlay) | héros intégré (`ac-faction-tabs` + `ac-hero-selector`), nom pré-rempli « Deck <héros> », visibilité, formats `compact` ; colonne des héros < 500 px (fenêtres de 768 à ~950 px) : factions en 3 × 2 et héros sur 3 colonnes ; fenêtre 1080 px × (fenêtre − 80 px) via `AcOverlayService` `height: 'fill'`, plein écran en compact | `NewDeckResult` | Nouveau deck |
| `ac-deck-settings` (contenu d'overlay) | `deck` ; héros + « Changer », `ac-segmented` visibilité, `ac-radio-card` formats | `save`, `cancel` | réglages desktop / mobile |
| `ac-effect-summary` | `effect: {triggers[], conditions[], effects[]}` (valeurs `{id, text, glyph?}` : le glyphe précède le texte) | `edit`, `remove` | filtres Uniques |
| `ac-effect-editor` (contenu d'overlay) | `effect` ; un `ac-combobox` par critère | `apply`, `clear` | modifier un effet |
| `ac-extension-tile` | `extension`, `selected = model<boolean>()` | — | filtre extensions |
| `ac-hero-tile` | `hero`, `selected`, `unavailableOnBga?` (tag « Indispo. BGA »), `size: 'sm' \| 'md'` (`sm` : nom 13 px, pour le carrousel) ; remplit sa cellule de grille ou un emplacement de largeur fixe, nom sur 2 lignes max. ; `aria-pressed` | `choose` | Nouveau deck, choisir un héros |
| `ac-faction-tabs` | `active = model()`, `size: 'sm' \| 'md'` (`sm` : pastilles de 36 px, cible 44 px en touch), `layout: 'scroll' \| 'grid'` (`grid` : `columns` colonnes égales, 6 sur une ligne ou 3 sur deux lignes quand la place manque ; `scroll` : une ligne qui défile et garde l'onglet actif visible, marge de défilement via `--ac-faction-tabs-bleed`), `controls` (id du panneau) ; `role=tablist`, flèches / Début / Fin | — | Nouveau deck, choisir un héros |
| `ac-hero-selector` | `heroes: AcHeroOption[] \| null` (`null` = chargement : squelettes), `faction` (filtre), `selected = model()`, `layout: 'grid' \| 'carousel'`, `columns` (grille, et nombre de squelettes ; 3 en carrousel), `error` (message « Impossible de charger les héros… »), `panelId`, `ariaLabel` ; carrousel : tuiles 112 px, gap 12, `scroll-snap`, héros sélectionné ramené dans la vue, débord via `--ac-hero-selector-bleed` | `selectedChange` | Nouveau deck (grille 4 col. / carrousel), choisir un héros (grille 6 / 2 col.) |
| `ac-deck-card` | `deck` (format, légalité, visibilité, héros + logo de faction, compteurs, auteur) ; `layout: 'grid' \| 'row'` (row en compact) ; `variant: 'mine' \| 'community'` (`community` : auteur, « Modifié il y a 2 h » (`updatedAt`, sinon la date de création ; en bas de la carte sous un filet) et `ac-like-button` à la place de la visibilité, du badge Légal, du nombre de cartes et des raretés ; le cœur est en haut à droite du visuel en grille, en bas à gauche en ligne, hors du lien) | `likeToggle` (clic sur le cœur) ; lien `routerLink` | Decks (Mes decks, Communauté) |
