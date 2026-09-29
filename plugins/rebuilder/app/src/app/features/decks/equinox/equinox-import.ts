import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, afterRenderEffect, computed, inject, output, signal, viewChild } from '@angular/core';
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
import { type DeckCardRef, type EquinoxDeck, parseEquinoxCsv, sameDeck, withHero } from './equinox-csv';
import { OwnershipApiService } from '../../../core/ownership-api.service';

export type ImportStatus = 'pending' | 'current' | 'imported' | 'skipped' | 'failed' | 'failedFinal' | 'cancelled';

interface ImportRow {
  deck: EquinoxDeck;
  status: ImportStatus;
  /** Failed attempts so far (a deck is given up after `MAX_ATTEMPTS`). */
  attempts: number;
  error?: string;
}

/** `paused`: the current deck finishes, the next one waits. `done`: finished or cancelled. */
type Phase = 'pick' | 'reading' | 'importing' | 'paused' | 'done';

/** One deck per second at most, as the site's importer does (the decks API rate-limits). */
const MIN_INTERVAL_MS = 1000;
/** A failed deck stops the queue until « Réessayer »; after this many failures it is skipped. */
const MAX_ATTEMPTS = 3;
/** The time left is the average of the last imports, times the decks left. */
const ETA_WINDOW = 5;
const MINE_PAGE_SIZE = 100;
const MINE_MAX_PAGES = 20;

const STATUS_LABELS: Record<ImportStatus, string> = {
  pending: $localize`:@@decks.equinox.pending:En attente`,
  current: $localize`:@@decks.equinox.current:En cours…`,
  imported: $localize`:@@decks.equinox.imported:Importé`,
  skipped: $localize`:@@decks.equinox.skipped:Déjà existant`,
  failed: $localize`:@@decks.equinox.failed:Échec`,
  failedFinal: $localize`:@@decks.equinox.failedFinal:Échec définitif`,
  cancelled: $localize`:@@decks.equinox.cancelled:Annulé`,
};

const STATUS_TONES: Record<ImportStatus, 'blue' | 'green' | 'neutral' | 'red' | 'orange'> = {
  pending: 'neutral',
  current: 'blue',
  imported: 'green',
  skipped: 'neutral',
  failed: 'red',
  failedFinal: 'red',
  cancelled: 'orange',
};

const DONE: readonly ImportStatus[] = ['imported', 'skipped', 'failedFinal', 'cancelled'];

/**
 * Import of the decks of an altered.gg personal-data export (Equinox ZIP) into the account, with
 * the behaviour of the site's `equinox-deck-import` plugin: the ZIP is read in the browser, each
 * deck is created private with `POST /api/decks` through the site relay, one per second, after the
 * user's « Global » alt-art preference is applied. A deck already in the account (same name, same
 * cards) is skipped. A failed deck stops the queue until « Réessayer » (3 attempts); the import can
 * be paused or cancelled. Renders the body and the footer of the import window (`display: contents`).
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
  private readonly ownership = inject(OwnershipApiService);
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
  /** « Annuler » asks for a confirmation in place. */
  protected readonly confirmCancel = signal(false);
  protected readonly cancelled = signal(false);
  /** Durations of the last imports, for the time left. */
  private readonly durations = signal<number[]>([]);
  private running = false;
  private destroyed = false;
  private lastStart = 0;
  /** The user's alt-art preference is « Global »: read once per import. */
  private globalAltArts = false;
  /** Account decks by name; `cards` once known (fetched, or created by this import). */
  private existing: { id: string; name: string; cards?: DeckCardRef[] }[] = [];

  protected readonly maxAttempts = MAX_ATTEMPTS;
  protected readonly personalDataUrl = `https://www.altered.gg/${uiLocale() === 'fr' ? 'fr-fr' : 'en-us'}/manage-account/personal-data`;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly statusTones = STATUS_TONES;
  protected readonly isRunning = computed(() => this.phase() === 'importing' || this.phase() === 'paused');
  protected readonly processed = computed(() => this.rows().filter((r) => DONE.includes(r.status)).length);
  protected readonly progress = computed(() => (this.rows().length ? Math.round((100 * this.processed()) / this.rows().length) : 0));
  protected readonly counts = computed(() => {
    const c: Record<ImportStatus, number> = { pending: 0, current: 0, imported: 0, skipped: 0, failed: 0, failedFinal: 0, cancelled: 0 };
    for (const r of this.rows()) c[r.status]++;
    return c;
  });
  protected readonly progressLabel = computed(
    () => $localize`:@@decks.equinox.progress:Import en cours : ${this.processed()}:done: / ${this.rows().length}:total: decks`,
  );
  /** « ~2 min 10 s restantes », hidden under 2 s or before the first import. */
  protected readonly eta = computed(() => {
    const times = this.durations();
    if (this.phase() !== 'importing' || !times.length) return '';
    const perDeck = Math.max(MIN_INTERVAL_MS, times.reduce((a, b) => a + b, 0) / times.length);
    const ms = perDeck * this.counts().pending;
    if (ms < 2000) return '';
    const secs = Math.round(ms / 1000);
    if (secs < 60) return $localize`:@@decks.equinox.etaSec:~${secs}:secs: s restantes`;
    const mins = Math.floor(secs / 60);
    const rest = secs % 60;
    return rest ? $localize`:@@decks.equinox.etaMinSec:~${mins}:mins: min ${rest}:secs: s restantes` : $localize`:@@decks.equinox.etaMin:~${mins}:mins: min restantes`;
  });

  /** « 3 decks importés, 1 déjà existant, 1 échec » (parts at 0 left out, except the first). */
  protected readonly summary = computed(() => {
    const { imported, skipped, failed, failedFinal, cancelled } = this.counts();
    const failures = failed + failedFinal;
    const parts = [
      imported === 0
        ? $localize`:@@decks.equinox.sumImportedNone:Aucun deck importé`
        : imported === 1
          ? $localize`:@@decks.equinox.sumImportedOne:1 deck importé`
          : $localize`:@@decks.equinox.sumImported:${imported}:count: decks importés`,
    ];
    if (skipped) parts.push(skipped === 1 ? $localize`:@@decks.equinox.sumSkippedOne:1 déjà existant` : $localize`:@@decks.equinox.sumSkipped:${skipped}:count: déjà existants`);
    if (failures) parts.push(failures === 1 ? $localize`:@@decks.equinox.sumFailedOne:1 échec` : $localize`:@@decks.equinox.sumFailed:${failures}:count: échecs`);
    if (cancelled) parts.push(cancelled === 1 ? $localize`:@@decks.equinox.sumCancelledOne:1 annulé` : $localize`:@@decks.equinox.sumCancelled:${cancelled}:count: annulés`);
    return parts.join(', ');
  });
  protected readonly doneTitle = computed(() =>
    this.cancelled() ? $localize`:@@decks.equinox.titleCancelled:Import annulé` : $localize`:@@decks.equinox.titleDone:Import terminé`,
  );

  private readonly list = viewChild<ElementRef<HTMLElement>>('list');
  private readonly currentIndex = computed(() => this.rows().findIndex((r) => r.status === 'current'));

  constructor() {
    // The list follows the deck being imported.
    afterRenderEffect(() => {
      const i = this.currentIndex();
      if (i >= 0) this.list()?.nativeElement.children[i]?.scrollIntoView({ block: 'nearest' });
    });
    const guard = (e: BeforeUnloadEvent) => {
      if (this.isRunning()) e.preventDefault();
    };
    window.addEventListener('beforeunload', guard);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('beforeunload', guard);
      this.destroyed = true;
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
      decks = parseEquinoxCsv(csv);
    } catch {
      this.fail($localize`:@@decks.equinox.cantRead:Impossible de lire le fichier ZIP : il doit contenir un fichier decks.csv.`);
      return;
    }
    if (!decks.length) {
      this.fail($localize`:@@decks.equinox.noDecks:Aucun deck valide trouvé dans le fichier decks.csv.`);
      return;
    }
    // A deck without a name or without a valid card cannot be created: given up at once.
    const invalid = $localize`:@@decks.equinox.invalidDeck:Ce deck ne contient aucune carte valide et ne peut pas être importé.`;
    this.rows.set(
      decks.map((deck) =>
        deck.name && deck.cards.length ? { deck, status: 'pending', attempts: 0 } : { deck, status: 'failedFinal', attempts: MAX_ATTEMPTS, error: invalid },
      ),
    );
    this.cancelled.set(false);
    this.durations.set([]);
    this.phase.set('importing');
    [this.existing, this.globalAltArts] = await Promise.all([this.loadMine(), lastValueFrom(this.ownership.globalAltArts())]);
    void this.pump();
  }

  protected retry(index: number): void {
    const row = this.rows()[index];
    if (!row || row.status !== 'failed' || !this.isRunning()) return;
    this.setRow(index, { status: 'pending', error: undefined });
    void this.pump();
  }

  protected togglePause(): void {
    if (this.phase() === 'importing') this.phase.set('paused');
    else if (this.phase() === 'paused') {
      this.phase.set('importing');
      void this.pump();
    }
  }

  protected cancel(): void {
    this.confirmCancel.set(false);
    this.cancelled.set(true);
    this.rows.update((rows) => rows.map((r) => (r.status === 'pending' || r.status === 'current' ? { ...r, status: 'cancelled' } : r)));
    this.phase.set('done');
  }

  /** « Importer un autre fichier ». */
  protected reset(): void {
    this.rows.set([]);
    this.file.set(null);
    this.error.set(null);
    this.dedupWarn.set(false);
    this.cancelled.set(false);
    this.phase.set('pick');
  }

  protected close(): void {
    this.closed.emit();
  }

  private fail(message: string): void {
    this.error.set(message);
    this.phase.set('pick');
  }

  /** Imports the decks in order; stops on a failed deck (waiting for « Réessayer »), a pause or the end. */
  private async pump(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      while (this.phase() === 'importing' && !this.destroyed) {
        const i = this.rows().findIndex((r) => !DONE.includes(r.status));
        if (i < 0) {
          this.phase.set('done');
          return;
        }
        if (this.rows()[i].status === 'failed') return;
        const wait = this.lastStart + MIN_INTERVAL_MS - Date.now();
        if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
        if (this.phase() !== 'importing' || this.destroyed) return;
        this.lastStart = Date.now();
        await this.importRow(i);
      }
    } finally {
      this.running = false;
    }
  }

  private async importRow(i: number): Promise<void> {
    const started = Date.now();
    this.setRow(i, { status: 'current' });
    const row = this.rows()[i];
    try {
      // « Global » alt-art preference: the user's alt arts replace the exported illustrations, as
      // the site's importer does; the hero is added afterwards, as it was exported.
      const exported = this.globalAltArts ? await lastValueFrom(this.ownership.applyAltArts(row.deck.cards)) : row.deck.cards;
      const deck = { name: row.deck.name, cards: withHero(row.deck.hero, exported) };
      let status: ImportStatus = 'skipped';
      if (!(await this.alreadyThere(deck))) {
        const created = await lastValueFrom(
          this.decksApi.create({ name: deck.name, format: row.deck.format as DeckFormat, isPublic: false, isDraft: false, deckCards: deck.cards }),
        );
        this.existing.push({ id: created.id, name: deck.name, cards: deck.cards });
        status = 'imported';
      }
      if (this.cancelled()) return;
      this.durations.update((d) => [...d, Date.now() - started].slice(-ETA_WINDOW));
      this.setRow(i, { status, error: undefined });
    } catch (err) {
      if (this.cancelled()) return;
      const attempts = row.attempts + 1;
      this.setRow(i, { status: attempts >= MAX_ATTEMPTS ? 'failedFinal' : 'failed', attempts, error: errorMessage(err) });
    }
  }

  /** Account decks with the same name, compared card by card (the list does not carry the cards). */
  private async alreadyThere(deck: { name: string; cards: DeckCardRef[] }): Promise<boolean> {
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
