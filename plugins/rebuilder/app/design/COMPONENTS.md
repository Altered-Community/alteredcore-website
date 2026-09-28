# Composants `ar-*` — inventaire et API proposée

Référence visuelle : `mockups/DS-*.dc.html` et `screenshots/DS-*.png`. Tokens : `tokens/tokens.css`.

Principes communs :

- Composants **standalone**, `ChangeDetectionStrategy.OnPush`, entrées/sorties en **signals** (`input()`, `output()`, `model()`).
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
| `ar-icon` | Icône au trait | `name: string`, `size = 16\|18\|20\|22` — SVG Lucide en ligne ; `discord` est un logo plein (sans trait) |

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
| `ar-select` | `options: {value,label}[]`, `label?`, CVA | — | tri, formats (liste Mes decks) |
| `ar-segmented<T>` | `options: {value, label?, icon?, ariaLabel?}[]`, `value = model<T>()`, `fullWidth`, `size` | — | Privé/Public, Environnement, Recherche/Voir le deck, Grille/Liste, Par type/Par coût, Tous/Publics/Privés |
| `ar-radio-card` (dans un conteneur `role=radiogroup`) | `name`, `title`, `description`, `tag?: {label, tone}`, `checked`, `layout: 'row' \| 'stacked' \| 'compact'` (`compact` : radio 18 px / 20 px en touch, titre 14/700 / 15 en touch, description sur une ligne avec points de suspension, tag centré à droite) | `choose` | choix du format (création : `compact`, réglages : `row`) |
| `ar-combobox<T>` | `options: {id, text, glyph?}[]`, `values = model<T[]>()`, `placeholder`, `emptyPlaceholder`, `searchPlaceholder = 'Rechercher…'` | `searchChange` (texte saisi) | éditeur d'effet (déclencheur, condition, effet). Le contrôle « Ajouter… » est un bouton (`role=combobox`) : il ouvre la liste avec un champ de recherche **non focalisé** (pas de clavier tactile tant qu'on ne touche pas le champ) ; une touche lettre sur le bouton démarre la recherche. Aucune option n'est surlignée à l'ouverture (seulement après une flèche ou une recherche) ; après un choix au toucher ou à la souris, la liste se ferme et rien ne garde le focus ; après Entrée, le focus revient au bouton. `glyph` : caractère `Altered Icons` avant le texte, dans la liste et sur la puce (main, réserve, partout). La liste ouverte est ramenée dans la vue (bas de feuille). « ou » entre chaque valeur et avant le bouton « Ajouter… » dès qu'au moins une valeur est choisie ; rien si la liste est vide |
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
| `ar-app-bar` | `appearance: 'auto' \| 'expanded' \| 'compact'`, `title?`, `links: {label, route, exact?}[]` (onglet actif via `routerLinkActive`, `exact` pour l'accueil) ; le nom du site mène à `/` ; slots `[leading]` / `[actions]` | tous |
| `ar-back-button` | `fallback` (route si la page a été ouverte directement), `label = 'Retour'` ; revient à la page précédente de l'app (`ArNavigationHistory`, injecté au démarrage dans `App`) | barres compactes des pages imbriquées : éditeur, consultation, connexion |
| `ar-tabs` | `tabs: {id,label,count?}[]`, `active = model<string>()`, `appearance: 'auto' \| 'underline' \| 'pill'` (`auto` = souligné ≥ medium, pastilles défilantes en compact) | source des cartes, Mes decks / Communauté, Cartes / Decklist |
| `ar-bottom-nav` | `items: {route, icon, label, badge?}[]` — rendu seulement en compact, au-dessus de `env(safe-area-inset-bottom)` | éditeur mobile, consultation mobile |
| `ar-breadcrumb` | `items: {label, route?}[]` | éditeur desktop |
| `ar-site-footer` | `links: ArNavLink[]`, `externalLinks: {label, href}[]`, `disclaimer`, `logoSrc`, `logoAlt` ; `<footer>` + `<nav aria-label="Liens du pied de page">` ; logo Fan Content 48 px, mention légale, liens internes et lien externe (`target="_blank"` `rel="noopener"`, icône `external-link`, « (nouvel onglet) » masqué). Bandeau pleine largeur, non collant. En compact : colonne centrée ; à partir de 768 px : une ligne, liens à droite, retour à la ligne si la mention ne tient pas | Accueil, Actualités, Article, Connexion. Absent de l'éditeur, de la consultation, de Cartes et de Decks |

## 6. Conteneurs — `DS-Conteneurs`

| Composant | Entrées | Écrans |
|---|---|---|
| `ar-card` | `padding: 'md' \| 'sm'` | panneaux, sections de deck |
| `ar-collapsible` | `title`, `open = model<boolean>(false)`, contenu projeté | Stats (ouvertes par défaut : `[(open)]` à `true`) |
| `ar-filter-section` | `title`, `count?`, action projetée (`ng-content select="[action]"`) | panneau de filtres |
| `ArOverlayService` | `open(Component, {title, data, width?, height?: 'auto' \| 'fill', compact?: 'sheet' \| 'drawer' \| 'fullscreen'})` → CDK `Dialog` (`height: 'fill'` : fenêtre = hauteur de l'écran − 80 px) ; **jamais deux fenêtres superposées** : un écran secondaire s'ouvre avec `ref.openStep(Component, {title, data})`, qui remplace le contenu dans la même fenêtre / feuille / tiroir (flèche retour, Échap et bouton retour Android reviennent à l'écran précédent, dont l'état est conservé ; résultat sur `afterClosed` de l'étape) ; en compact : feuille basse par défaut (poignée, coins 20, `--ar-shadow-sheet`), tiroir plein hauteur depuis la gauche (`compact: 'drawer'`, largeur `--ar-drawer-width`, voile `--ar-color-scrim`, `--ar-shadow-drawer`, fermeture au voile, à Fermer et à Échap) ou page plein écran ; ≥ 768 px : fenêtre centrée (rayon 16, `--ar-shadow-dialog`), y compris si `compact: 'drawer'` est demandé ; même composant de contenu, même pied d'actions. Un lien du menu ☰ navigue tout de suite : la navigation `replaceUrl` reprend l'entrée d'historique du tiroir (pas d'attente de la fermeture) | réglages du deck, éditeur d'effet, filtres mobile, nouveau deck, choisir un héros ; menu ☰ (`compact: 'drawer'`) |

Sur Capacitor, la feuille gère le bouton retour Android (`@capacitor/app` → `backButton`) et le clavier (`@capacitor/keyboard`).

## 7. Composants métier — `DS-Metier`

| Composant | Entrées | Sorties | Écrans |
|---|---|---|---|
| `ar-card-tile` | `card`, `quantity`, `max` ; affiche coût main / réserve, nom + type sur bandeau ; anneau `--ar-ring-selected` si `quantity > 0` ; `readonly` (« ×n ») ; `plain` (carte seule, sans « + » ni compteur) ; une référence unique (`…_U_n`) affiche `ar-unique-card` à la place de l'image | `quantityChange` | recherche, uniques, aperçu, Cartes (`plain`) |
| `ar-unique-card` | `card` (réponse `/api/cards`, textes en chaîne ou en table de langues), `eager` ; face d'une Unique dessinée à partir de ses données, car aucune image par Unique n'est publiée : illustration Unique du CDN (`cards/assets/{SET}/{carte}_U.webp`, repli sans cadre puis dos de carte), coûts main / réserve, puissances Forêt / Montagne / Océan (icônes `assets/biome/`), texte (`{J}` `{R}` `{H}` `{D}` `{T}` en pastilles, `[mot-clé]` en gras, capacité de soutien sous un filet), numéro de collection en pied ; couleur de faction via `--ar-faction-*` ; tailles en `cqw`, lisibles comme une image de carte à la même largeur ; le cadre et le texte passent au-dessus de l'illustration ; sans coûts (ligne de deck invité rechargée) : illustration et nom seuls. L'aperçu d'un deck charge le texte imprimé (`mainEffect` / `echoEffect`) : conservé sur la ligne invité, sinon `POST /api/cards/batch` | — | tuiles Uniques (recherche, Cartes, aperçu du deck) |
| `ar-deck-row` | `card`, `quantity`, `max`, `readonly` (consultation : « ×3 » + coûts, sans stepper), `plain` (rareté, nom, coûts, sans quantité) | `quantityChange` | panneau deck, Deck mobile, decklist, Cartes (`plain`) |
| `ar-deck-section` | `title` (Personnages, Sorts…), `count`, `collapsible` | — | panneau deck, aperçu, cartes |
| `ar-cost-chart` | `values: number[7]` (coûts 1…7+), `tone: 'main' \| 'reserve'` | — | Stats |
| `ar-deck-summary` | `deck`, `appearance: 'card' \| 'embedded'` (`embedded` dans le panneau desktop : sans le nom, déjà dans le titre) ; total, validité et raretés centrés | `openSettings` → `ArOverlayService` « Réglages du deck » | éditeur desktop et mobile |
| `app-new-deck` (contenu d'overlay) | héros intégré (`ar-faction-tabs` + `ar-hero-selector`), nom pré-rempli « Deck <héros> », visibilité, formats `compact` ; colonne des héros < 500 px (fenêtres de 768 à ~950 px) : factions en 3 × 2 et héros sur 3 colonnes ; fenêtre 1080 px × (fenêtre − 80 px) via `ArOverlayService` `height: 'fill'`, plein écran en compact | `NewDeckResult` | Nouveau deck (`features/creation-heros-integre.md`) |
| `ar-deck-settings` (contenu d'overlay) | `deck` ; héros + « Changer », `ar-segmented` visibilité, `ar-radio-card` formats | `save`, `cancel` | réglages desktop / mobile |
| `ar-effect-summary` | `effect: {triggers[], conditions[], effects[]}` (valeurs `{id, text, glyph?}` : le glyphe précède le texte) | `edit`, `remove` | filtres Uniques |
| `ar-effect-editor` (contenu d'overlay) | `effect` ; un `ar-combobox` par critère | `apply`, `clear` | modifier un effet |
| `ar-extension-tile` | `extension`, `selected = model<boolean>()` | — | filtre extensions |
| `ar-hero-tile` | `hero`, `selected`, `unavailableOnBga?` (tag « Indispo. BGA »), `size: 'sm' \| 'md'` (`sm` : nom 13 px, pour le carrousel) ; remplit sa cellule de grille ou un emplacement de largeur fixe, nom sur 2 lignes max. ; `aria-pressed` | `choose` | Nouveau deck, choisir un héros |
| `ar-faction-tabs` | `active = model()`, `size: 'sm' \| 'md'` (`sm` : pastilles de 36 px, cible 44 px en touch), `layout: 'scroll' \| 'grid'` (`grid` : `columns` colonnes égales, 6 sur une ligne ou 3 sur deux lignes quand la place manque ; `scroll` : une ligne qui défile et garde l'onglet actif visible, marge de défilement via `--ar-faction-tabs-bleed`), `controls` (id du panneau) ; `role=tablist`, flèches / Début / Fin | — | Nouveau deck, choisir un héros |
| `ar-hero-selector` | `heroes: ArHeroOption[] \| null` (`null` = chargement : squelettes), `faction` (filtre), `selected = model()`, `layout: 'grid' \| 'carousel'`, `columns` (grille, et nombre de squelettes ; 3 en carrousel), `error` (message « Impossible de charger les héros… »), `panelId`, `ariaLabel` ; carrousel : tuiles 112 px, gap 12, `scroll-snap`, héros sélectionné ramené dans la vue, débord via `--ar-hero-selector-bleed` | `selectedChange` | Nouveau deck (grille 4 col. / carrousel), choisir un héros (grille 6 / 2 col.) |
| `ar-deck-card` | `deck` (format, légalité, visibilité, héros + logo de faction, compteurs, auteur) ; `layout: 'grid' \| 'row'` (row en compact) ; `variant: 'mine' \| 'community'` (`community` : auteur, « Modifié il y a 2 h » (`updatedAt`, sinon la date de création ; en bas de la carte sous un filet) et `ar-like-button` à la place de la visibilité, du badge Légal, du nombre de cartes et des raretés ; le cœur est en haut à droite du visuel en grille, en bas à gauche en ligne, hors du lien) | `likeToggle` (clic sur le cœur) ; lien `routerLink` | Decks (Mes decks, Communauté) |
