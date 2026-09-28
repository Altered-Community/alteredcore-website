import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ArDensityService } from '../../ui/layout.services';
import { ArNavigationHistory } from '../../ui/nav';

/** Root of the embedded editor: no app bar, site menu or footer — the AlteredCore site draws them. */
@Component({
  selector: 'app-rebuilder-embed',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  templateUrl: './embed-app.html',
})
export class EmbedApp {
  constructor() {
    inject(ArDensityService);
    inject(ArNavigationHistory);
  }
}
