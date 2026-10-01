# Altered Re:Builder — plugin `rebuilder` du site AlteredCore (Angular)

## Produit

Section decks d'Altered Re:Builder (liste, page de deck, nouveau deck, éditeur), plugin du site AlteredCore servi
sur les pages decks du site avec « Beta Deckbuilder » (`/pages/decks`, `/pages/deck?id=`, `/pages/deckbuilder?id=`, base
href `/pages/` ; Shadow DOM, contrat `window.AlteredCore` : voir `../README.md`). Re:Builder n'existe plus que comme
plugin du site : pas d'app autonome, pas de `index.html`, pas d'authentification propre (session du site). Les mêmes
composants s'adaptent à la taille d'écran et à la densité : pas d'écrans « mobile » et « desktop » séparés.

## Références de conception

- Design system du site : `design-system/` à la racine du repo. Lire
  [README](../../../design-system/README.md) et [WORKFLOW](../../../design-system/WORKFLOW.md) avant de toucher
  à l'interface.
- `design-system/tokens/tokens.css` : tokens `--ac-*`, seules valeurs autorisées pour couleurs, espacements,
  rayons, ombres, typo, hauteurs. Une valeur propre au plugin qu'aucun token ne couvre va dans la section
  `/* rebuilder */` de ce fichier (`--ac-rebuilder-<rôle>`, avec sa valeur sombre).
- `design-system/css/components/` : styles des composants génériques `ac-*` (bouton, champ, puce, badge,
  onglets…), injectés par le shell dans le shadow root avant les styles du plugin.
- `design/COMPONENTS.md` : inventaire des composants Angular `ac-*` du plugin et de leur API.

## Règles de code

- Angular 22, zoneless (pas de `zone.js`), selon les bonnes pratiques officielles
  (https://angular.dev/assets/context/best-practices.md) :
  - Standalone et `OnPush` sont les défauts : ne jamais écrire `standalone: true` ni
    `changeDetection: ChangeDetectionStrategy.OnPush`. L'état change par signals, jamais en comptant sur une
    détection de changements globale.
  - Signals : `input()`, `output()`, `model()` pour le two-way binding, `computed()` pour l'état dérivé,
    `linkedSignal()` pour un état dérivé qui reste modifiable ; `set()` / `update()`. Observables dans les
    templates via le pipe `async`.
  - Services : `@Service()` (Angular 22), jamais `@Injectable({ providedIn: 'root' })` (ESLint
    `prefer-service-decorator`). Service fourni explicitement (`providers` d'un composant, `useClass`) :
    `@Service({ autoProvided: false })`. Classe abstraite avec implémentation par défaut :
    `@Service({ factory: () => inject(Impl) })`. `@Injectable` seulement quand la classe de base prend ses
    dépendances par constructeur (erreur NG2028, ex. `ShadowStylesHost`), avec un commentaire.
  - Dépendances par `inject()`, jamais par le constructeur (ESLint `prefer-inject`).
  - Pas de `@HostBinding` / `@HostListener` : objet `host` du décorateur. Pas de `ngClass` / `ngStyle` : bindings
    `[class.x]` / `[style.x]`. Pas de `CommonModule` : importer seulement les directives et pipes utilisés.
  - Control flow natif (`@if`, `@for`, `@switch`), templates simples, routes chargées à la demande
    (`loadComponent`). Variables de contexte de `@for` (`$index`, `$last`…) sans alias. Tout `@switch` a un
    `@default` ; sur une union, `@default never;` sur une variable `@let` (le compilateur ne restreint pas le
    type d'un appel de signal) pour vérifier que tous les cas sont traités.
  - Nouveaux formulaires : Signal Forms (`@angular/forms/signals`), sinon Reactive Forms.
  - Images statiques : `NgOptimizedImage` (`ngSrc`), sauf images en base64.
  - TypeScript strict, inférence quand le type est évident, `unknown` plutôt que `any`.
  - `eslint.config.js` impose ces règles (règles angular-eslint, linting typé) : corriger plutôt que désactiver,
    et toute désactivation locale porte un commentaire qui la justifie.
- Un composant par dossier, jamais de `template:` ni de `styles:` en ligne, même pour un petit composant (choix du
  projet, là où Angular suggère le template en ligne) : `<nom>/<nom>.ts` + `<nom>.html`
  (`templateUrl`) + `<nom>.scss` (`styleUrl`, seulement s'il y a des styles). Les fonctions `open…()` d'un overlay
  restent dans le `.ts` du composant ; types et helpers partagés entre plusieurs composants vont dans un fichier
  à part au niveau du groupe (ex. `ui/chips/rarity.ts`, `features/decks/deck-filters.ts`).
- Textes : sources en français, tout texte affiché (y compris `aria-label`, `title`, placeholders, messages d'erreur,
  titres d'overlay) marqué `i18n="@@zone.cle"` / `` $localize`:@@zone.cle:Texte` `` avec un id explicite, et sa
  traduction ajoutée à `src/locale/messages.en.json` (`npm run i18n:check`, lancé par `npm run lint`). Pluriels : ICU
  dans les templates, deux messages en TypeScript. `Intl` et `toLocale…` avec `uiLocale()` ; données de cartes avec
  `contentLocale()`.
- Préfixe `ac-` partout (sélecteurs, classes CSS, classes `Ac*`, tokens `--ac-*`), comme le design system du
  site. Un écran n'utilise que des composants `ac-*` et du layout.
- Composant générique (il a une classe dans `design-system/css/components/`) : le composant Angular pose le
  balisage et les classes du design system (`ac-button ac-button--secondary`, `<button class="ac-chip">`…) et
  n'a pas de SCSS pour ce que le design system dessine. Pour le changer ou en ajouter un, modifier d'abord le
  design system (CSS, `design-system/docs/components/`, page `/pages/design-system`), puis le composant Angular.
  Le SCSS du composant ne garde que ce que le design system ne couvre pas (ex. bouton Effacer de `ac-input`).
  Pas de règle `:host` qui redessine une classe du design system : le SCSS du composant passe après et l'écrase.
- Composants `ac-*` interactifs : partir du CDK Angular (`@angular/cdk`) plutôt que de réécrire le comportement à la
  main : `overlay` (listes déroulantes, popovers : position, clic extérieur, Échap, scroll), `listbox` / `menu`
  (clavier, option active, ARIA), `dialog`, `a11y` (focus, `FocusTrap`, `LiveAnnouncer`). Le code du composant se
  limite alors au rendu et à ce qui lui est propre. Le plugin monte les overlays du CDK dans son shadow root
  (`ShadowOverlayContainer`).
- Composant métier (`ui/metier/`, overlays, combobox, radio-card, stepper…) : SCSS propre, en tokens.
- Tout composant `ac-*` ajouté ou modifié met à jour `design/COMPONENTS.md`.
- Styles : aucune valeur en dur (pas de couleur hex / `rgb()` / `hsl()`, vérifié par `php tests/run.php`).
  Couleurs, rayons, ombres, espacements via `var(--ac-*)` ; hauteurs de contrôle via `--ac-control-sm|md|lg`.
  Jamais de sélecteur `data-theme` ni `data-density` (ni `:host-context` sur ces attributs) : une valeur qui change
  avec la densité est un token (`--ac-control-*`, `--ac-hit-min`, `--ac-field-font-size`, `--ac-select-font-size`,
  `--ac-segment-height`, `--ac-segment-font-size`, `--ac-icon-button-segment`, `--ac-page-padding`).
- Responsive : `AcBreakpointService` (compact < 768, medium 768–1199, expanded ≥ 1200 ; `BREAKPOINTS` importé de
  `design-system/tokens/breakpoints.ts`) et `AcDensityService` (lecture seule de `data-density`, que le shell pose
  sur `<html>`). Overlays via `AcOverlayService` (fenêtre ≥ 768 px, feuille en dessous).
  Jamais une fenêtre ouverte par-dessus une autre : depuis un contenu d'overlay, ouvrir l'écran suivant comme étape
  (`ref.openStep(...)`, même fenêtre, flèche retour).
- Accessibilité : passer les contrôles AXE et les minimums WCAG AA (focus, contrastes, ARIA). Vrais
  `<button>`/`<a>`/`<input>` avec label, `aria-label` sur les boutons icône, cibles ≥ 44 px en touch, focus visible.
- Icônes : `ac-icon` (`src/app/ui/icon/icon.ts`), noms Lucide (les mêmes que `ac_icon()` / `acIcon()` sur le site :
  `trash-2`, `ellipsis`, `sliders-horizontal`, `brand-discord`…), balisage copié de
  `design-system/icons/node_modules/lucide-static` (`lucide-angular` ne supporte pas encore Angular 22) ; rend
  `<svg class="ac-icon">`. Icônes de rareté et de terrain : `public/assets/icons/` (servies sous `assets/icons/`) ; gemmes, factions, terrains et logos d'extension : `public/assets/` (voir son `README.md`).
- Backend : **réutiliser les services, modèles et intercepteurs existants** pour les appels API. Ne pas dupliquer
  un client ; si un modèle ne correspond pas à l'UI, écrire un mapper plutôt que de modifier le contrat.
- Session : pas d'accès au token Keycloak (session du site, appels decks par le relais
  `AlteredCore.services.decks`, `HostAuthSession`), connexion par `AlteredCore.login()`. Styles et overlays dans le
  shadow root ; en-tête, menu et pied de page sont ceux du site.

## Vérification avant de terminer une tâche

1. `npm run build` et `npm run lint` sans erreur, `npm test` vert ; `php tests/run.php` à la racine du repo
   (couleurs en dur, points de rupture).
2. E2E dans le site (`tests/e2e` + `plugins/rebuilder/e2e`) sur la stack `docker-compose.stack.yml` : voir
   `../README.md`.
3. Capture Playwright de l'écran embarqué à 1440×900 et 390×844.
4. Recherche de valeurs en dur (`#[0-9a-f]{3,6}`, `px` de hauteur de contrôle) hors `design-system/tokens/tokens.css`.

## Structure du repo

| Emplacement | Contenu |
|---|---|
| `design/COMPONENTS.md` | Inventaire des composants Angular `ac-*`. |
| `src/app/ui/` | Composants Angular `ac-*`, un dossier par groupe avec un `index.ts` (barrel, à utiliser depuis les écrans) et un sous-dossier par composant : `buttons/`, `fields/` (champs, `ac-radio-card`), `chips/`, `containers/`, `nav/` (dont `ac-back-button` et `navigation-history.ts`), `metier/` (composants métier : tuiles de carte / héros, onglets de faction, sélecteur de héros…), `overlay/` (`AcOverlayService` dans `overlay.ts`, `overlay-container/`), `icon/` ; `layout.services.ts` (`AcBreakpointService`, `AcDensityService`). |
| `src/app/features/` | Écrans, un sous-dossier par composant (`decks-page/`, `import-deck/`…) : `search/` (recherche de cartes de l'éditeur : `card-search/`, filtres, résultats, `CardSearchStore`), `decks/` (Mes decks, `/decks/new`, import), `deck/` (consultation), `editor/` (édition), `shared/` (overlays partagés : Nouveau deck, Choisir un héros, Réglages du deck). |
| `src/app/core/` | Services backend et logique : `cards-api.service.ts`, `decks-api.service.ts`, `uniques-api.service.ts`, `auth-session.ts` (invité par défaut, sans hôte : tests unitaires), `guest-deck.service.ts` (mode invité, `localStorage`), `deck-store.ts`, modèles (`models.ts`), formats, règles de deck, `i18n.ts`. |
| `src/main.ts`, `src/app/embed/` | Démarrage : lecture de `window.AlteredCore`, langue, routes de la section decks, session du site, overlays et styles dans le shadow root. |
| `src/embed/` | Styles globaux : `embed.scss` (shadow root, après le design system), `document.scss` (`<head>` : polices des cartes imprimées). |
| `src/locale/messages.en.json` | Traductions anglaises (`npm run i18n:check`). |
| `scripts/embed-manifest.mjs` | Écrit `../dist/embed-manifest.json` (fichiers chargés par le site) après `ng build`. |
| `../e2e/` | Scénarios Playwright du plugin, lancés par le site sur la stack complète (desktop 1440×900 et mobile 390×844). |
| `docs/backend-api.md` | Contrat des API consommées. |
| `docs/api-limitations/` | Manques des API, contournements côté front et corrections backend à faire (un fichier par API). |

Commandes npm :

| Commande | Rôle |
|---|---|
| `npm run build` | Build → `../dist/browser` + `../dist/embed-manifest.json` (ce que le site sert ; appelé par `plugin.json`). |
| `npm test` | Tests unitaires (Vitest via `@angular/build:unit-test`, fichiers `*.spec.ts`). |
| `npm run lint` | ESLint (`angular-eslint`, configuration `eslint.config.js`) et `i18n:check`. |


## Comportement

Lorsque tu répond à l'utilisateur après avoir terminé une tâche de code, montre toujours le résultat sous forme de screenshot si c'est visuel, ou bien de la manière aproprié si ce n'est pas visuel.

Propose toujours un lien vers l'application pour que l'utilsateur puisse vérifier lui même le travail également.