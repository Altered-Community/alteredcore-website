import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { setOfReference, uniqueArtSources } from '../../../core/card-art';
import { PEN_GLYPH, cardEffects, linesHtml, printedLength } from '../../../core/card-text';
import type { Card } from '../../../core/models';
import { localizedText } from '../../../core/models';
import { EFFECT_Y, biomeVariants, collectorNumber, cqw, effectFontPx, qrModules, supportFontPx, typeLine, uniqueFrame } from '../../../core/unique-layout';
import { AcCardArt } from '../card-art/card-art';
import { assetUrl } from '../../../core/asset-url';
import { contentLocale } from '../../../core/locale';

const ASSETS = assetUrl('assets/unique-card');
const FACTIONS = ['AX', 'BR', 'LY', 'MU', 'OR', 'YZ'];
const SET_LOGOS = ['ALIZE', 'BISE', 'CORE', 'COREKS', 'CYCLONE', 'DUSTER', 'EOLE'];
const BIOMES = [
  { key: 'forest', file: 'FOREST', label: 'Forêt', row: 'f' },
  { key: 'mountain', file: 'MOUNTAIN', label: 'Montagne', row: 'm' },
  { key: 'ocean', file: 'OCEAN', label: 'Océan', row: 'o' },
] as const;
const BADGE_FILE = { zero: 'ZERO', small: 'SMALL', normal: 'MID', best: 'BIG' } as const;

/**
 * A unique card drawn from its own data, laid out like the Altered site (Altered-Card-Renderer) with
 * its official frames, biome badges and fonts. Nobody publishes a rendered image per unique, only
 * the illustration shared by every unique of a printed card: the stats and effects differ.
 */
@Component({
  selector: 'ac-unique-card',
  imports: [AcCardArt],
  host: {
    '[class.bravos]': "faction() === 'BR'",
    '[style.--main-fs]': 'mainSize()',
    '[style.--support-fs]': 'supportSize()',
    '[style.--effect-y]': 'effectY()',
  },
  templateUrl: './unique-card.html',
  styleUrl: './unique-card.scss',
})
export class AcUniqueCard {
  private readonly sanitizer = inject(DomSanitizer);
  readonly card = input.required<Card>();
  readonly eager = input(false);

  protected readonly pen = PEN_GLYPH;
  protected readonly frame = computed(() => uniqueFrame(this.card()));
  protected readonly faction = computed(() => {
    const code = this.card().faction?.code ?? this.card().reference.split('_')[3];
    return FACTIONS.includes(code) ? code : 'AX';
  });
  protected readonly swirlSrc = `${ASSETS}/logos/Altered-Swirl.svg`;
  protected readonly frameSrc = computed(() => `${ASSETS}/frames/${this.faction()}_${this.frame()}.webp`);
  protected readonly sources = computed(() => uniqueArtSources(this.card().reference, this.frame()));
  protected readonly setLogo = computed(() => {
    const set = setOfReference(this.card().reference);
    return `${ASSETS}/logos/${SET_LOGOS.includes(set) ? set : 'Altered-Swirl'}.svg`;
  });
  protected readonly name = computed(() => localizedText(this.card().name, contentLocale()) || this.card().reference);
  protected readonly type = computed(() => typeLine(this.card()));
  protected readonly hasStats = computed(() => this.card().mainCost != null);
  protected readonly biomes = computed(() => {
    const c = this.card();
    const p = c.displayPowers;
    const values = [c.forestPower ?? p?.forest, c.mountainPower ?? p?.mountain, c.oceanPower ?? p?.ocean].map((v) => Number(v ?? 0));
    const variants = biomeVariants(values);
    return BIOMES.map((b, i) => ({
      ...b,
      value: values[i],
      badge: `${ASSETS}/biomes/ALT_COMPONENT_${b.file}_${BADGE_FILE[variants[i]]}.svg`,
    }));
  });

  protected readonly effects = computed(() => cardEffects(this.card()));
  /** T3 / T4 have no support box: their text runs beside the QR code after two lines. */
  protected readonly narrow = computed(() => this.frame() === 'T3' || this.frame() === 'T4');
  protected readonly showSupport = computed(() => !this.narrow() && this.effects().echo.length > 0);
  protected readonly mainSize = computed(() => `${cqw(effectFontPx(printedLength(this.effects().main)))}cqw`);
  protected readonly supportSize = computed(() => `${cqw(supportFontPx(printedLength(this.effects().echo)))}cqw`);
  protected readonly effectY = computed(() => `${EFFECT_Y[this.frame()]}%`);
  protected readonly mainHtml = computed(() =>
    this.sanitizer.bypassSecurityTrustHtml(
      (this.narrow() ? '<span class="gap-top"></span><span class="gap"></span>' : '') + linesHtml(this.effects().main),
    ),
  );
  protected readonly supportHtml = computed(() => this.sanitizer.bypassSecurityTrustHtml(linesHtml(this.effects().echo)));

  /** `{number} · ` + ` {pen} {artist} · ` + `Altered Fan Content`, spaces kept (`elements.json`, infoLine). */
  protected readonly foot = computed(() => {
    const artist = this.card().artists?.[0]?.name ?? '';
    return artist
      ? { before: `${collectorNumber(this.card())} ·  `, artist: ` ${artist}`, after: ' · Altered Fan Content' }
      : { before: `${collectorNumber(this.card())} · `, artist: '', after: 'Altered Fan Content' };
  });

  /**
   * Printed QR code: the unique's reference, error correction M, no quiet zone (as the site).
   * Modules are cached per reference and drawn as horizontal runs, not one rect per module.
   */
  protected readonly qr = computed(() => qrModules(this.card().reference));
}
