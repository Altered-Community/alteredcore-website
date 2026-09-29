import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArButton, ArIconButton } from '../../../ui/buttons';
import { ArCardSurface } from '../../../ui/containers';
import { ArIcon, type ArIconName } from '../../../ui/icon';
import { ArBreakpointService } from '../../../ui/layout.services';
import { ArCardArt } from '../../../ui/metier';
import { ArAppBar, ArSiteFooter } from '../../../ui/nav';
import { SiteMenuService } from '../../shared/site-menu/site-menu';

interface Feature {
  icon: ArIconName;
  title: string;
  text: string;
  link: { label: string; route: string };
}

/** Landing page: what the project is, and the way into the card browser and the deck editor. */
@Component({
  selector: 'app-home-page',
  imports: [RouterLink, ArAppBar, ArButton, ArIconButton, ArCardSurface, ArIcon, ArCardArt, ArSiteFooter],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
})
export class HomePage {
  protected readonly bp = inject(ArBreakpointService);
  protected readonly menu = inject(SiteMenuService);

  /** Real cards from three factions, shown as a fan next to the introduction. */
  protected readonly showcase = [
    { reference: 'ALT_CORE_B_OR_21_R2', faction: 'LY' },
    { reference: 'ALT_CORE_B_OR_17_R1', faction: 'OR' },
    { reference: 'ALT_CORE_B_YZ_17_R1', faction: 'YZ' },
  ];

  protected readonly features: Feature[] = [
    {
      icon: 'search',
      title: 'Toutes les cartes',
      text: 'Filtrez par faction, extension, rareté, type et coût. Les Uniques se cherchent aussi par effet : « Quand … Si … Alors … ».',
      link: { label: 'Parcourir les cartes', route: '/cartes' },
    },
    {
      icon: 'layers',
      title: 'Un éditeur qui connaît les règles',
      text: 'Héros obligatoire, trois exemplaires au plus, compteurs de rareté et courbe de coût : le deck est vérifié pendant que vous le construisez.',
      link: { label: 'Créer un deck', route: '/decks/new' },
    },
    {
      icon: 'eye',
      title: 'Consulter et partager',
      text: 'Chaque deck a sa page en lecture seule, avec les visuels, la decklist et un lien à envoyer. Importez aussi une liste existante.',
      link: { label: 'Voir les decks', route: '/decks' },
    },
    {
      icon: 'grid',
      title: 'Ordinateur et téléphone',
      text: 'La même interface s’adapte à l’écran : panneaux et fenêtres sur ordinateur, feuilles et navigation au pouce sur mobile.',
      link: { label: 'Mes decks', route: '/decks' },
    },
  ];

  protected readonly steps = [
    { title: 'Choisissez un héros', text: 'Il fixe la faction du deck ; le format se règle au même endroit.' },
    { title: 'Ajoutez des cartes', text: 'Touchez « + » sur une carte, puis ajustez le nombre d’exemplaires.' },
    { title: 'Vérifiez et partagez', text: 'L’aperçu indique si le deck est légal et affiche ses statistiques.' },
  ];
}
