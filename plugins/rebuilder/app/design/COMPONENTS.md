# Composants `ar-*` — inventaire et API proposée

Référence visuelle : `mockups/DS-*.dc.html` et `screenshots/DS-*.png`. Tokens : `tokens/tokens.css`.

Principes communs :

- Composants standalone et `OnPush` par défaut (Angular 22, rien à déclarer), entrées/sorties en **signals** (`input()`, `output()`, `model()`).
- Les champs de formulaire implémentent `ControlValueAccessor` (utilisables avec Reactive Forms).
- **Une taille logique** (`size: 'sm' | 'md' | 'lg'`), jamais une hauteur en pixels : la hauteur vient de
  `--ar-control-*`, qui change avec `data-density` (pointer 32/40/48, touch 36/44/52).
- Aucune couleur, rayon ou ombre en dur : uniquement les variables `--ar-*`.
- Accessibilité : vrais `<button>` / `<a>` / `<input>`, `aria-label` obligatoire sur les boutons icône, focus visible,
  zone cliquable ≥ `--ar-hit-min`.
- Les écrans cités sont ceux de `mockups/` où le composant apparaît.

---

## 1. Fondations et infrastructure

| Élément | Rôle | API |
|---|---|---|
| `tokens.css` | Variables globales (`:root`, et `.ar-embed` dans le site AlteredCore) | `angular.json` → `styles` (autonome) ; `src/embed/embed.scss` (build `embed`, shadow root). Texte sur fond : `--ar-color-on-primary` (fond `--ar-color-primary`), `--ar-color-inverse` / `--ar-color-on-inverse` (compteurs, onglet pilule actif), `--ar-color-on-strong` (visuel, faction, commande posée sur une carte) ; `--ar-page-top` / `--ar-sticky-top` : haut de page et bord des panneaux collants |
| `ArDensityService` | Pose `data-density="pointer\|touch"` sur `<html>` (sur la racine du plugin si `AR_DENSITY_TARGET` est fourni) | Basé sur `matchMedia('(pointer: coarse)')` + `BreakpointObserver` (< 768 px ⇒ touch) ; expose `density = signal<'pointer'\|'touch'>()` |
| `ArBreakpointService` | Taille de fenêtre logique | `size = signal<'compact'\|'medium'\|'expanded'>()` (< 768, 768–1199, ≥ 1200) |
| `ar-icon` | Icône au trait | `name: string`, `size = 16\|18\|20\|22` — SVG Lucide en ligne (`text`, `hand`, `rotate` : onglets Description / Main de départ du deck ; `hard-drive` : decks locaux ; `info` : bandeau des deckbuilders) ; `discord` est un logo plein (sans trait) |

## 2. Actions — `DS-Boutons`

| Composant | Variantes / entrées | Sorties | Écrans |
|---|---|---|---|
| `ar-button` (attribut sur `<button>` ou `<a routerLink>`) | `variant: 'primary' \| 'secondary' \| 'ghost' \| 'add' \| 'danger'` (défaut `primary`), `size: 'sm' \| 'md' \| 'lg'` (défaut `md`), `icon?: string`, `fullWidth: boolean`, `disabled` ; propriété CSS `--ar-button-icon-color` pour colorer l'icône seule (logo Discord : `var(--ar-color-discord)`) | clic natif | tous |
| `ar-icon-button` | `icon` (requis), `ariaLabel` (requis), `variant: 'secondary' \| 'ghost' \| 'primary'`, `size` | clic natif | barres, réglages, fermer |
| `ar-card-add` | — | `add` | tuiles de carte (recherche, aperçu) |
| `ar-like-button` | sur `<button arLikeButton>` : `count` (affiché en notation courte, « 1,2 k »), `liked` (cœur plein, fond blanc, `--ar-color-like`), `ariaLabel` (requis, ex. « J’aime Kojo Havre, 128 j’aime ») ; `aria-pressed` ; pastille 28 px (32 px en touch) posée sur un visuel, zone cliquable ≥ `--ar-hit-min` | clic natif | cartes de deck (Communauté) |
| `ar-stepper` | `value = model<number>()`, `min = 0`, `max`, `appearance: 'overlay' \| 'inline'` | `valueChange` | `overlay` : sur les cartes ; `inline` : lignes de deck |

Spécifications : bouton rayon `--ar-radius-control` (14 px en `lg` tactile), police 14/700 (13 en `sm`, 16 en `lg` tactile),
`secondary` = bordure `--ar-color-border-control`, `add` = bordure pointillée `--ar-color-border-dashed`,
`danger` = texte `--ar-color-required` sur fond blanc. Désactivé : opacité 0.45.

## 3. Champs — `DS-Champs`

| Composant | Entrées | Sorties | Écrans |
|---|---|---|---|
| `ar-input` | `label?`, `icon?` (loupe), `placeholder`, `type`, CVA | — | recherche, coûts « 3, 1-3, 4+ », nom du deck |
| `ar-textarea` | `value = model<string>()`, `label?`, `ariaLabel?`, `placeholder`, `rows` (4), `maxlength?`, `invalid`, CVA ; même bordure, rayon et focus que `ar-input`, redimensionnable en hauteur | — | description du deck (réglages, nouveau deck) |
| `ar-file-input` | `file = model<File \| null>()`, `label?`, `accept`, `disabled` ; vrai `<input type="file">` transparent sur un champ en pointillés (hauteur `--ar-control-md`) qui affiche le nom du fichier | `fileChange` | import de l'export altered.gg |
| `ar-select` | `options: {value,label,group?}[]` (`group` : options consécutives d’un même groupe sous un `<optgroup>`), `label?`, CVA | — | tri, formats, héros groupés par faction (liste des decks) |
| `ar-segmented<T>` | `options: {value, label?, icon?, ariaLabel?}[]`, `value = model<T>()`, `fullWidth`, `size` | — | Privé/Public, Environnement, Recherche/Voir le deck, Grille/Liste, Par type/Par coût, Tous/Publics/Privés |
| `ar-radio-card` (dans un conteneur `role=radiogroup`) | `name`, `title`, `description`, `tag?: {label, tone}`, `checked`, `layout: 'row' \| 'stacked' \| 'compact'` (`compact` : radio 18 px / 20 px en touch, titre 14/700 / 15 en touch, description sur une ligne avec points de suspension, tag centré à droite) | `choose` | choix du format (création : `compact`, réglages : `row`) |
| `ar-combobox<T>` | `options: {id, text, glyph?}[]`, `values = model<T[]>()`, `placeholder`, `emptyPlaceholder`, `searchPlaceholder = 'Rechercher…'` | `searchChange` (texte saisi) | éditeur d'effet (déclencheur, condition, effet). Le contrôle « Ajouter… » est un bouton (`role=combobox`) qui ouvre la liste dans un overlay CDK (`cdkConnectedOverlay` : largeur du bouton, sous le bouton ou au-dessus faute de place, fermeture au clic extérieur et sur Échap). La liste est un `cdkListbox` (flèches, Début / Fin, Entrée, saisie rapide, ARIA). Le champ de recherche n'est **pas focalisé** à l'ouverture (pas de clavier tactile tant qu'on ne le touche pas) ; une lettre sur le bouton démarre la recherche, Entrée dans le champ prend le premier résultat, une flèche passe dans la liste. Après un choix ou Échap, la liste se ferme et le focus revient au bouton. `glyph` : caractère `Altered Icons` avant le texte, dans la liste et sur la puce (main, réserve, partout). « ou » entre chaque valeur et avant le bouton « Ajouter… » dès qu'au moins une valeur est choisie ; rien si la liste est vide |
| `ar-editable-title` | `value = model<string>()`, `ariaLabel` | — | titre du deck (desktop) |

Spécifications : champ hauteur `--ar-control-md`, rayon 10, bordure `--ar-color-border-control`, focus bordure 2 px `--ar-color-primary`.
Contrôle segmenté : piste `--ar-color-track`, padding 4, gap 4, rayon 12 ; segment actif blanc + `--ar-shadow-e1`,
texte `--ar-color-primary-strong` 700 ; segments rayon 8.

## 4. Puces, badges, indicateurs — `DS-Puces`

| Composant | Entrées | Sorties | Écrans |
|---|---|---|---|
| `ar-chip` | `label`, `dot?: string` (couleur faction), `removable`, `selected = model<boolean>()` | `remove` | filtres actifs, types de carte, factions |
| `ar-filter-bar` | `chips: {id,label}[]` | `remove(id)`, `clearAll` | recherche desktop et mobile |
| `ar-icon-toggle-group` | `options: {value, icon, label}[]`, `values = model<string[]>()` | — | filtre rareté (C, R, E) |
| `ar-badge` | `tone: 'blue' \| 'green' \| 'violet' \| 'red' \| 'orange' \| 'neutral'`, `icon?`, `size: 24 \| 28` | — | format, Légal, Deck valide |
| `ar-tag` | `tone` | — | BGA : disponible / Arène BGA / indisponible |
| `ar-count` | `value`, `tone: 'dark' \| 'success'` | — | nombre de filtres, 39 dans la nav |
| `ar-rarity-summary` | `counts: {C,R,U,E}`, `gap?` | — | résumés de deck, cartes de deck |
| `ar-terrain-totals` | `totals: {foret, montagne, ocean}` | — | Stats |
| `ar-logic-divider` | `label = 'et'` | — | entre blocs d'effets |

`ar-filter-bar` : une seule ligne, défilement horizontal, dégradé vers le fond, « Tout effacer » fixé à droite.
`ar-rarity-summary` : le groupe d'icônes ne se coupe jamais ; s'il manque de place, il passe entier à la ligne.

## 5. Navigation — `DS-Navigation`

| Composant | Entrées | Écrans |
|---|---|---|
| `ar-app-bar` | `title?`, `subtitle?` ; slots `[leading]` / `[actions]` ; barre des écrans compacts, sous l'en-tête du site | écrans compacts |
| `ar-back-button` | `fallback` (route si la page a été ouverte directement), `label = 'Retour'` ; revient à la page précédente de l'app (`ArNavigationHistory`, injecté au démarrage dans `App`) | barres compactes des pages imbriquées : éditeur, consultation, connexion |
| `ar-tabs` | `tabs: {id,label,count?}[]`, `active = model<string>()`, `appearance: 'auto' \| 'underline' \| 'pill'` (`auto` = souligné ≥ medium, pastilles défilantes en compact) | source des cartes, Mes decks / Communauté, Cartes / Decklist |
| `ar-bottom-nav` | `items: {route, icon, label, badge?}[]` — rendu seulement en compact, au-dessus de `env(safe-area-inset-bottom)` | éditeur mobile, consultation mobile |
| `ar-breadcrumb` | `items: {label, route?}[]` | éditeur desktop |

## 6. Conteneurs — `DS-Conteneurs`

| Composant | Entrées | Écrans |
|---|---|---|
| `ar-card` | `padding: 'md' \| 'sm'` | panneaux, sections de deck |
| `ar-progress-bar` | `value` (0–100), `ariaLabel` ; `role=progressbar`, barre `--ar-color-track` remplie en `--ar-color-primary` | import de l'export altered.gg |
| `ar-collapsible` | `title`, `open = model<boolean>(false)`, contenu projeté | Stats (ouvertes par défaut : `[(open)]` à `true`) |
| `ar-filter-section` | `title`, `count?`, action projetée (`ng-content select="[action]"`) | panneau de filtres |
| `ar-virtual-grid` | `items`, `overscan = 1.5` (écrans de rangées gardés au-dessus et au-dessous), `initial = 36` (cases rendues avant la mesure) ; expose `slice()` (éléments à rendre), `first()` (index dans `items` du premier rendu, pour `aria-posinset`) et `atEnd()` (dernier élément rendu : afficher les squelettes). Le parent rend lui-même les cases en contenu projeté : `<ar-virtual-grid #grid class="grid" [items]="cards">@for (c of grid.slice(); track c.reference) {…}</ar-virtual-grid>`. Grille CSS dont seules les rangées à moins de `overscan` écrans sont dans le DOM ; les autres sont remplacées par un padding de même hauteur (la page garde sa longueur, le sentinel de scroll infini reste en bas). L'hôte est la grille : le parent pose colonnes et espacements par une classe. Toutes les cases ont la hauteur de la première ; défile avec la fenêtre | résultats de recherche de cartes (Cartes, éditeur) |
| `ArOverlayService` | `open(Component, {title, data, width?, height?: 'auto' \| 'fill', compact?: 'sheet' \| 'drawer' \| 'fullscreen'})` → CDK `Dialog` (`height: 'fill'` : fenêtre = hauteur de l'écran − 80 px) ; **jamais deux fenêtres superposées** : un écran secondaire s'ouvre avec `ref.openStep(Component, {title, data})`, qui remplace le contenu dans la même fenêtre / feuille / tiroir (flèche retour, Échap et bouton retour Android reviennent à l'écran précédent, dont l'état est conservé ; résultat sur `afterClosed` de l'étape) ; en compact : feuille basse par défaut (poignée, coins 20, `--ar-shadow-sheet`), tiroir plein hauteur depuis la gauche (`compact: 'drawer'`, largeur `--ar-drawer-width`, voile `--ar-color-scrim`, `--ar-shadow-drawer`, fermeture au voile, à Fermer et à Échap) ou page plein écran ; ≥ 768 px : fenêtre centrée (rayon 16, `--ar-shadow-dialog`), y compris si `compact: 'drawer'` est demandé ; même composant de contenu, même pied d'actions. `ref.closeGuard.set(() => boolean)` : demandé avant une fermeture par l'utilisateur (croix, Échap, voile, bouton retour ; `ref.dismiss()`), `false` garde la fenêtre ouverte (import en cours) ; `ref.close()` l'ignore. Un lien du menu ☰ navigue tout de suite : la navigation `replaceUrl` reprend l'entrée d'historique du tiroir (pas d'attente de la fermeture) | réglages du deck, éditeur d'effet, filtres mobile, nouveau deck, choisir un héros ; menu ☰ (`compact: 'drawer'`) |


## 7. Composants métier — `DS-Metier`

| Composant | Entrées | Sorties | Écrans |
|---|---|---|---|
| `ar-card-tile` | `card`, `quantity`, `max` ; `blockedReason` (avec `max` à 0 et aucun exemplaire : badge « Interdite » à la place du « + », raison en `title` et en texte masqué, ex. Unique en format No Unique) ; affiche coût main / réserve, nom + type sur bandeau ; anneau `--ar-ring-selected` si `quantity > 0` ; `readonly` (« ×n ») ; `plain` (carte seule, sans « + » ni compteur) ; une référence unique (`…_U_n`) affiche `ar-unique-card` à la place de l'image ; en attendant l'image, un fond gris clair uni (`--ar-color-track`, `ar-card-art` en `neutral`), sans texte ni couleur de faction | `quantityChange` | recherche, uniques, aperçu, Cartes (`plain`) |
| `ar-unique-card` | `card` (réponse `/api/cards`, textes en chaîne ou en table de langues), `eager` ; face d'une Unique dessinée à partir de ses données, car aucune image par Unique n'est publiée : illustration Unique du CDN (`cards/assets/{SET}/{carte}_U.webp`, repli sans cadre puis dos de carte), coûts main / réserve, puissances Forêt / Montagne / Océan (icônes `assets/biome/`), texte (`{J}` `{R}` `{H}` `{D}` `{T}` en pastilles, `[mot-clé]` en gras, capacité de soutien sous un filet), numéro de collection en pied ; couleur de faction via `--ar-faction-*` ; tailles en `cqw`, lisibles comme une image de carte à la même largeur ; le cadre et le texte passent au-dessus de l'illustration ; sans coûts (ligne de deck invité rechargée) : illustration et nom seuls. L'aperçu d'un deck charge le texte imprimé (`mainEffect` / `echoEffect`) : conservé sur la ligne invité, sinon `POST /api/cards/batch` | — | tuiles Uniques (recherche, Cartes, aperçu du deck) |
| `ar-deck-row` | `card`, `quantity`, `max`, `readonly` (consultation : « ×3 » + coûts, sans stepper), `plain` (rareté, nom, coûts, sans quantité), `issues` (règles enfreintes par la ligne : nom en `--ar-color-danger` et icône `alert` dont `aria-label` / `title` donnent les raisons), `blockedReason` (avec `max` à 0 et aucun exemplaire : badge « Interdite » à la place du stepper, raison en `title` et en texte masqué) | `quantityChange` | panneau deck, Deck mobile, decklist, Cartes (`plain`) |
| `ar-deck-section` | `title` (Personnages, Sorts…), `count`, `collapsible` | — | panneau deck, aperçu, cartes |
| `ar-cost-chart` | `values: number[7]` (coûts 1…7+), `tone: 'main' \| 'reserve'` | — | Stats |
| `ar-donut-chart` | `segments: {key, label, value, display, tone: 'character' \| 'spell' \| 'permanent'}[]`, `ariaLabel` ; anneau `conic-gradient` (parts proportionnelles à `value`, couleurs `--ar-color-type-*`, piste `--ar-color-track` si tout vaut 0) et légende (pastille, libellé, `display` dans la couleur du segment) | — | Main de départ (composition moyenne) |
| `ar-probability-bars` | `rows: {key, label, p: number \| null, warn?}[]`, `labelWidth: 'narrow' \| 'wide'`, `ariaLabel?` ; barre remplie à `p` (`--ar-color-chart-main`, `--ar-color-chart-reserve` si `warn`, filet minimal pour une valeur non nulle), pourcentage arrondi (« < 1 % », « > 99 % ») avec deux décimales au survol ; `p: null` = barre vide sans valeur | — | Main de départ (détails des stats, calculateurs) |
| `ar-deck-summary` | `deck`, `appearance: 'card' \| 'embedded'` (`embedded` dans le panneau desktop : sans le nom, déjà dans le titre) ; total, validité et raretés centrés ; le badge de validité est un bouton (`aria-haspopup="dialog"`) | `openSettings` → `ArOverlayService` « Réglages du deck » ; `showLegality` → « Légalité du deck » (règles du format ✓ / ✗) | éditeur desktop et mobile |
| `app-new-deck` (contenu d'overlay) | héros intégré (`ar-faction-tabs` + `ar-hero-selector`), nom pré-rempli « Deck <héros> », visibilité, formats `compact` ; colonne des héros < 500 px (fenêtres de 768 à ~950 px) : factions en 3 × 2 et héros sur 3 colonnes ; fenêtre 1080 px × (fenêtre − 80 px) via `ArOverlayService` `height: 'fill'`, plein écran en compact | `NewDeckResult` | Nouveau deck (`features/creation-heros-integre.md`) |
| `ar-deck-settings` (contenu d'overlay) | `deck` ; nom (`ar-input`, requis : « Enregistrer » désactivé s'il est vide), héros + « Changer », `ar-segmented` visibilité, description (`ar-textarea`), `ar-radio-card` formats | `save`, `cancel` | réglages desktop / mobile (seul endroit pour renommer en compact) |
| `ar-save-status` | `state: 'idle' \| 'pending' \| 'saving' \| 'saved' \| 'error'`, `iconOnly` (texte réservé aux lecteurs d'écran, `title` au survol, cible 44 px) ; `role=status` ; rien en `idle`, point pulsé + « Enregistrement… », coche verte + « Enregistré », alerte rouge + « Non enregistré » (le motif et « Réessayer » sont affichés par l'écran) | — | éditeur : à côté du titre (desktop), barre d'app (compact) |
| `ar-effect-summary` | `effect: {triggers[], conditions[], effects[]}` (valeurs `{id, text, glyph?}` : le glyphe précède le texte) | `edit`, `remove` | filtres Uniques |
| `ar-effect-editor` (contenu d'overlay) | `effect` ; un `ar-combobox` par critère | `apply`, `clear` | modifier un effet |
| `ar-extension-tile` | `extension`, `selected = model<boolean>()` | — | filtre extensions |
| `ar-hero-tile` | `hero`, `selected`, `unavailableOnBga?` (tag « Indispo. BGA »), `size: 'sm' \| 'md'` (`sm` : nom 13 px, pour le carrousel) ; remplit sa cellule de grille ou un emplacement de largeur fixe, nom sur 2 lignes max. ; `aria-pressed` | `choose` | Nouveau deck, choisir un héros |
| `ar-faction-tabs` | `active = model()`, `size: 'sm' \| 'md'` (`sm` : pastilles de 36 px, cible 44 px en touch), `layout: 'scroll' \| 'grid'` (`grid` : `columns` colonnes égales, 6 sur une ligne ou 3 sur deux lignes quand la place manque ; `scroll` : une ligne qui défile et garde l'onglet actif visible, marge de défilement via `--ar-faction-tabs-bleed`), `controls` (id du panneau) ; `role=tablist`, flèches / Début / Fin | — | Nouveau deck, choisir un héros |
| `ar-hero-selector` | `heroes: ArHeroOption[] \| null` (`null` = chargement : squelettes), `faction` (filtre), `selected = model()`, `layout: 'grid' \| 'carousel'`, `columns` (grille, et nombre de squelettes ; 3 en carrousel), `error` (message « Impossible de charger les héros… »), `panelId`, `ariaLabel` ; carrousel : tuiles 112 px, gap 12, `scroll-snap`, héros sélectionné ramené dans la vue, débord via `--ar-hero-selector-bleed` | `selectedChange` | Nouveau deck (grille 4 col. / carrousel), choisir un héros (grille 6 / 2 col.) |
| `ar-deck-card` | `deck` (format, légalité, visibilité, héros + logo de faction, compteurs, auteur) ; `layout: 'grid' \| 'row'` (row en compact) ; `variant: 'mine' \| 'community' \| 'contest'` (`contest` : badge Légal, nombre de cartes et raretés, badge « Gagnant » (`deck.winner`) ; `community` : auteur, « Modifié il y a 2 h » (`updatedAt`, sinon la date de création ; en bas de la carte sous un filet) et `ar-like-button` à la place de la visibilité, du badge Légal, du nombre de cartes et des raretés ; le cœur est en haut à droite du visuel en grille, en bas à gauche en ligne, hors du lien ; `mine` : badge « Brouillon » (`deck.draft`) ; `mine` et `contest` : badge « Non légal » quand `deck.legality` a des règles en échec, bouton hors du lien, à la suite des badges en grille, en bas à gauche du visuel en ligne) | `likeToggle` (clic sur le cœur), `legalityClick` (clic sur « Non légal ») ; lien `routerLink` | Decks (Mes decks, Communauté, Concours) |
