import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, output, signal } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { AuthSession } from '../../../core/auth-session';
import { DecksApiService } from '../../../core/decks-api.service';
import { deckLines, type Deck, type DeckFormat } from '../../../core/models';
import { ZipError, readZipText } from '../../../core/zip';
import { ArButton } from '../../../ui/buttons';
import { ArBadge } from '../../../ui/chips';
import { ArProgressBar } from '../../../ui/containers';
import { ArFileInput } from '../../../ui/fields';
import { uiLocale } from '../../../core/i18n';
import { ArBreakpointService } from '../../../ui/layout.services';
import { type DeckCardRef, type EquinoxDeck, parseEquinoxCsv, sameDeck } from './equinox-csv';

export type ImportStatus = 'pending' | 'current' | 'imported' | 'skipped' | 'failed' | 'cancelled';

interface ImportRow {
  deck: EquinoxDeck;
  status: ImportStatus;
  error?: string;
}

type Phase = 'pick' | 'reading' | 'importing' | 'done';

/** One deck creation per second at most, as the site's importer does (the decks API rate-limits). */
const MIN_INTERVAL_MS = 1000;
const MINE_PAGE_SIZE = 100;
const MINE_MAX_PAGES = 20;

const STATUS_LABELS: Record<ImportStatus, string> = {
  pending: $localize`:@@decks.equinox.pending:En attente`,
  current: $localize`:@@decks.equinox.current:En cours…`,
  imported: $localize`:@@decks.equinox.imported:Importé`,
  skipped: $localize`:@@decks.equinox.skipped:Déjà existant`,
  failed: $localize`:@@decks.equinox.failed:Échec`,
  cancelled: $localize`:@@decks.equinox.cancelled:Annulé`,
};

const STATUS_TONES: Record<ImportStatus, 'blue' | 'green' | 'neutral' | 'red' | 'orange'> = {
  pending: 'neutral',
  current: 'blue',
  imported: 'green',
  skipped: 'neutral',
  failed: 'red',
  cancelled: 'orange',
};

/**
 * Import of the decks of an altered.gg personal-data export (Equinox ZIP) into the account: the
 * ZIP is read in the browser, each deck is created with `POST /api/decks` through the site relay.
 * A deck already in the account (same name, same cards) is skipped. Renders the body and the
 * footer of the import window (`display: contents`).
 */
@Component({
  selector: 'app-equinox-import',
  imports: [ArButton, ArBadge, ArFileInput, ArProgressBar],
  host: { style: 'display: contents' },
  templateUrl: './equinox-import.html',
  styleUrl: './equinox-import.scss',
})
export class EquinoxImport {
  private readonly decksApi = inject(DecksApiService);
  protected readonly auth = inject(AuthSession);
  protected readonly bp = inject(ArBreakpointService);

  /** « Annuler » or « Terminer ». */
  readonly closed = output<void>();
  readonly signIn = output<void>();

  protected readonly phase = signal<Phase>('pick');
  protected readonly file = signal<File | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly rows = signal<ImportRow[]>([]);
  /** The account decks could not be listed: duplicates are not detected. */
  protected readonly dedupWarn = signal(false);
  private cancelled = false;
  /** Account decks by name; `cards` once known (fetched, or created by this import). */
  private existing: { id: string; name: string; cards?: DeckCardRef[] }[] = [];

  protected readonly personalDataUrl = `https://www.altered.gg/${uiLocale() === 'fr' ? 'fr-fr' : 'en-us'}/manage-account/personal-data`;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly statusTones = STATUS_TONES;
  protected readonly processed = computed(() => this.rows().filter((r) => r.status !== 'pending' && r.status !== 'current').length);
  protected readonly progress = computed(() => (this.rows().length ? Math.round((100 * this.processed()) / this.rows().length) : 0));
  protected readonly counts = computed(() => {
    const c: Record<ImportStatus, number> = { pending: 0, current: 0, imported: 0, skipped: 0, failed: 0, cancelled: 0 };
    for (const r of this.rows()) c[r.status]++;
    return c;
  });
  protected readonly progressLabel = computed(
    () => $localize`:@@decks.equinox.progress:Import en cours : ${this.processed()}:done: / ${this.rows().length}:total: decks`,
  );

  /** « 3 decks importés, 1 déjà existant, 1 échec » (parts at 0 left out, except the first). */
  protected readonly summary = computed(() => {
    const { imported, skipped, failed, cancelled } = this.counts();
    const parts = [
      imported === 0
        ? $localize`:@@decks.equinox.sumImportedNone:Aucun deck importé`
        : imported === 1
          ? $localize`:@@decks.equinox.sumImportedOne:1 deck importé`
          : $localize`:@@decks.equinox.sumImported:${imported}:count: decks importés`,
    ];
    if (skipped) parts.push(skipped === 1 ? $localize`:@@decks.equinox.sumSkippedOne:1 déjà existant` : $localize`:@@decks.equinox.sumSkipped:${skipped}:count: déjà existants`);
    if (failed) parts.push(failed === 1 ? $localize`:@@decks.equinox.sumFailedOne:1 échec` : $localize`:@@decks.equinox.sumFailed:${failed}:count: échecs`);
    if (cancelled) parts.push(cancelled === 1 ? $localize`:@@decks.equinox.sumCancelledOne:1 annulé` : $localize`:@@decks.equinox.sumCancelled:${cancelled}:count: annulés`);
    return parts.join(', ');
  });

  constructor() {
    const guard = (e: BeforeUnloadEvent) => {
      if (this.phase() === 'importing') e.preventDefault();
    };
    window.addEventListener('beforeunload', guard);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('beforeunload', guard);
      this.cancelled = true;
    });
  }

  protected pickFile(file: File | null): void {
    this.file.set(file);
    this.error.set(null);
  }

  protected async start(): Promise<void> {
    const file = this.file();
    if (!file) return;
    if (!/\.zip$/i.test(file.name)) {
      this.error.set($localize`:@@decks.equinox.notZip:Le fichier doit être un .zip.`);
      return;
    }
    this.phase.set('reading');
    this.error.set(null);
    let decks: EquinoxDeck[];
    try {
      const csv = await readZipText(file, 'decks.csv');
      if (csv === null) throw new ZipError('no decks.csv');
      if (!csv.trim()) {
        this.fail($localize`:@@decks.equinox.emptyCsv:Le fichier decks.csv est vide.`);
        return;
      }
      decks = parseEquinoxCsv(csv).filter((d) => d.name && d.cards.length);
    } catch {
      this.fail($localize`:@@decks.equinox.cantRead:Impossible de lire le fichier ZIP : il doit contenir un fichier decks.csv.`);
      return;
    }
    if (!decks.length) {
      this.fail($localize`:@@decks.equinox.noDecks:Aucun deck valide trouvé dans le fichier decks.csv.`);
      return;
    }
    this.rows.set(decks.map((deck) => ({ deck, status: 'pending' })));
    this.phase.set('importing');
    this.existing = await this.loadMine();
    await this.runQueue();
  }

  protected async retryFailed(): Promise<void> {
    this.rows.update((rows) => rows.map((r) => (r.status === 'failed' || r.status === 'cancelled' ? { deck: r.deck, status: 'pending' } : r)));
    this.cancelled = false;
    this.phase.set('importing');
    await this.runQueue();
  }

  protected cancel(): void {
    this.cancelled = true;
  }

  protected close(): void {
    this.closed.emit();
  }

  private fail(message: string): void {
    this.error.set(message);
    this.phase.set('pick');
  }

  private async runQueue(): Promise<void> {
    let last = 0;
    for (let i = 0; i < this.rows().length; i++) {
      if (this.rows()[i].status !== 'pending') continue;
      if (this.cancelled) {
        this.setRow(i, { status: 'cancelled' });
        continue;
      }
      this.setRow(i, { status: 'current' });
      const deck = this.rows()[i].deck;
      try {
        if (await this.alreadyThere(deck)) {
          this.setRow(i, { status: 'skipped' });
          continue;
        }
        const wait = last + MIN_INTERVAL_MS - Date.now();
        if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
        last = Date.now();
        const created = await lastValueFrom(
          this.decksApi.create({ name: deck.name, format: deck.format as DeckFormat, isPublic: false, isDraft: false, deckCards: deck.cards }),
        );
        this.existing.push({ id: created.id, name: deck.name, cards: deck.cards });
        this.setRow(i, { status: 'imported' });
      } catch (err) {
        this.setRow(i, { status: 'failed', error: errorMessage(err) });
      }
    }
    this.phase.set('done');
  }

  /** Account decks with the same name, compared card by card (the list does not carry the cards). */
  private async alreadyThere(deck: EquinoxDeck): Promise<boolean> {
    const name = deck.name.trim().toLowerCase();
    for (const candidate of this.existing.filter((d) => (d.name ?? '').trim().toLowerCase() === name)) {
      try {
        candidate.cards ??= deckLines(await lastValueFrom(this.decksApi.get(candidate.id)));
      } catch {
        continue;
      }
      if (sameDeck(deck, { name: candidate.name, cards: candidate.cards })) return true;
    }
    return false;
  }

  private async loadMine(): Promise<{ id: string; name: string }[]> {
    const all: { id: string; name: string }[] = [];
    try {
      for (let page = 1; page <= MINE_MAX_PAGES; page++) {
        const body = await lastValueFrom(this.decksApi.listMine(page, MINE_PAGE_SIZE));
        const decks = Array.isArray(body) ? body : body.member ?? [];
        // The list does not carry the cards: `alreadyThere` fetches each same-name deck.
        all.push(...decks.map((d: Deck) => ({ id: d.id, name: d.name ?? '' })));
        if (decks.length < MINE_PAGE_SIZE) break;
      }
    } catch {
      this.dedupWarn.set(true);
    }
    return all;
  }

  private setRow(i: number, patch: Partial<ImportRow>): void {
    this.rows.update((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }
}

function errorMessage(err: unknown): string {
  const status = err instanceof HttpErrorResponse ? err.status : -1;
  if (status === 0) return $localize`:@@decks.equinox.errNetwork:Impossible de joindre le serveur. Vérifiez votre connexion.`;
  if (status === 401) return $localize`:@@decks.equinox.errSession:Session expirée : reconnectez-vous.`;
  if (status === 429) return $localize`:@@decks.equinox.errRate:Trop de requêtes. Réessayez dans quelques instants.`;
  if (status === 400 || status === 422) return $localize`:@@decks.equinox.errRejected:Le serveur refuse ce deck (carte ou format inconnu).`;
  if (status === 502 || status === 503 || status === 504) return $localize`:@@decks.equinox.errUnavailable:Serveur temporairement indisponible.`;
  return $localize`:@@decks.equinox.errGeneric:Une erreur est survenue lors de l’import de ce deck.`;
}
