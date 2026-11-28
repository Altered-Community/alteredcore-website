import { computed, signal } from '@angular/core';
import { Observable, Subject, of } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';
import type { Deck, DeckWrite } from './models';

export const SAVE_DELAY_MS = 400;

/**
 * Autosave of the open deck: nothing changed yet (`idle`), a change waits for the save delay
 * (`pending`), a request is running (`saving`), everything is written (`saved`), or the last
 * save failed (`error`, message in `saveError`).
 */
export type DeckSaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

export interface DeckAutosavePorts {
  currentDeckId: () => string | null;
  isGuestId: (id: string) => boolean;
  canSaveRemote: () => boolean;
  saveGuest: (id: string) => void;
  buildPayload: () => Partial<DeckWrite>;
  patchRemote: (id: string, payload: Partial<DeckWrite>, options: { keepalive: boolean }) => Observable<Deck | null | undefined>;
  onRemoteSaved: (saved: Deck | null | undefined) => void;
  formatError: (err: unknown) => string;
  unauthorizedError: () => string;
  delayMs?: number;
}

/**
 * Single-flight, revision-tracked autosave state machine for `DeckStore`.
 * Guarantees at most one plain PATCH is in flight at a time, preserves queued saves for decks
 * already navigated away from, supports `keepalive` page-unload resends, and re-sends if an
 * older request overtakes a newer `keepalive` acknowledgment.
 */
export class DeckAutosaveQueue {
  /** A save request to the decks API is running. */
  readonly saving = signal(false);
  /** Last save refused or unreachable: displayable message, with the API's violations. `null` after a save succeeds. */
  readonly saveError = signal<string | null>(null);
  /** Changes not written yet (waiting for the save delay, being sent, or refused). */
  readonly dirty = signal(false);
  /** At least one save of this deck succeeded since it was opened. */
  private readonly saved = signal(false);
  readonly saveState = computed<DeckSaveState>(() => {
    if (this.saving()) return 'saving';
    if (this.saveError()) return 'error';
    if (this.dirty()) return 'pending';
    return this.saved() ? 'saved' : 'idle';
  });

  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  /** Bumped by each change; a save only marks the deck clean when no change came after what it sent. */
  private revision = 0;
  /** Revision carried by the running request, `null` when none runs. */
  private inFlight: number | null = null;
  /** The running request is a `keepalive` one (it survives the page). */
  private inFlightKeepalive = false;
  /**
   * Saves that waited for the running request, by deck: the payload is built when queued, so it
   * still writes that deck after another one is opened meanwhile.
   */
  private readonly queued = new Map<string, { revision: number; payload: Partial<DeckWrite> }>();
  /**
   * Newest revision the decks API confirmed. A `keepalive` save runs next to a plain one: when the
   * older one answers last, it may have been written last too, so the current state is sent again.
   */
  private acked: { id: string; revision: number } | null = null;
  /** A save request answered (and the next queued one, if any, was sent): `saveNow()` checks whether it is done. */
  private readonly settled = new Subject<void>();

  private readonly delayMs: number;

  constructor(private readonly ports: DeckAutosavePorts) {
    this.delayMs = ports.delayMs ?? SAVE_DELAY_MS;
  }

  /** Marks the open deck dirty and schedules a debounced save. */
  touch(): void {
    this.revision++;
    this.dirty.set(true);
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.save();
    }, this.delayMs);
  }

  /**
   * Writes pending changes immediately (navigation away, tests). `keepalive` when the page is
   * being left: whatever is not saved yet (waiting, queued behind a running request, refused, or
   * sent by a plain request the browser would cancel) is sent again as a `keepalive` request,
   * which the browser completes after the page is gone.
   */
  flush(options: { keepalive?: boolean } = {}): void {
    const keepalive = !!options.keepalive;
    if (keepalive) {
      for (const [id, q] of [...this.queued]) {
        if (id === this.ports.currentDeckId()) continue;
        this.queued.delete(id);
        this.send(id, q.revision, q.payload, true);
      }
    }
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
      this.save(keepalive);
    } else if (keepalive && this.dirty()) {
      this.save(true);
    }
  }

  /**
   * The page is being unloaded: flushes with `keepalive`, then tells whether changes may still be
   * lost, so the browser asks before leaving: the last save failed (sending it again may fail too),
   * or the changes could not be sent at all.
   */
  leavePage(): boolean {
    const failed = !!this.saveError();
    this.flush({ keepalive: true });
    return failed || (this.dirty() && !this.saving());
  }

  /**
   * Writes the open deck now, without waiting for the save delay, and emits once: `true` when every change is saved,
   * `false` when the save fails (message in `saveError`). « Partager » and « Terminer » wait for it, so the shared link
   * and the deck page show the latest changes. A failed save is sent again.
   */
  saveNow(): Observable<boolean> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (this.dirty() || this.saveError()) this.save();
    const id = this.ports.currentDeckId();
    // Signed out meanwhile (session expired): the changes cannot be sent, say so instead of failing silently.
    if (this.dirty() && id && !this.ports.isGuestId(id) && !this.ports.canSaveRemote()) {
      this.saveError.set(this.ports.unauthorizedError());
    }
    const done = () => !this.saveTimer && this.inFlight === null;
    const saved = () => !this.saveError() && !this.dirty();
    if (done()) return of(saved());
    return this.settled.pipe(filter(done), take(1), map(saved));
  }

  /** Sends the deck again after a failed save (« Réessayer »). */
  retrySave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = null;
    this.save();
  }

  /** Drops any queued save for a deleted deck. */
  dropQueued(id: string): void {
    this.queued.delete(id);
  }

  /** Cancels a pending debounce timer and clears dirty (used after `moveToAccount()` replaces a guest deck). */
  cancelPending(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = null;
    this.dirty.set(false);
  }

  /** Resets the per-deck UI status signals (in-flight/queued saves for previous decks keep running). */
  resetDeckStatus(): void {
    this.dirty.set(false);
    this.saveError.set(null);
    this.saved.set(false);
  }

  /** Sets `saving` for out-of-band operations (`createDeck`, `moveToAccount`) sharing the indicator. */
  setSaving(value: boolean): void {
    this.saving.set(value);
  }

  /** Sets `saveError` for out-of-band operations (`moveToAccount`) sharing the error channel. */
  setError(message: string | null): void {
    this.saveError.set(message);
  }

  private save(keepalive = false): void {
    const id = this.ports.currentDeckId();
    if (!id) return;
    if (this.ports.isGuestId(id)) {
      this.ports.saveGuest(id);
      this.dirty.set(false);
      this.saved.set(true);
      // Written on this device: a refused move to the account (`moveToAccount`) is no longer the last word.
      this.saveError.set(null);
      return;
    }
    if (!this.ports.canSaveRemote()) return;
    const revision = this.revision;
    if (keepalive && this.inFlight === revision && this.inFlightKeepalive) return;
    const payload = this.ports.buildPayload();
    if (this.inFlight !== null && !keepalive) {
      // One request at a time, so an older state never lands after a newer one.
      this.queued.set(id, { revision, payload });
      return;
    }
    // This request carries the newest state of the deck.
    this.queued.delete(id);
    this.send(id, revision, payload, keepalive);
  }

  private send(id: string, revision: number, payload: Partial<DeckWrite>, keepalive: boolean): void {
    this.inFlight = revision;
    this.inFlightKeepalive = keepalive;
    this.saving.set(true);
    if (this.ports.currentDeckId() === id) this.saveError.set(null);
    this.ports.patchRemote(id, payload, { keepalive }).subscribe({
      next: (saved) => {
        const overtaken = this.acked?.id === id && this.acked.revision > revision;
        if (!overtaken) this.acked = { id, revision };
        if (this.settle(id, revision)) {
          if (overtaken) {
            // A newer save answered first: this older state may have been written last.
            this.queued.set(id, { revision: this.revision, payload: this.ports.buildPayload() });
          } else {
            this.saved.set(true);
            this.ports.onRemoteSaved(saved);
            if (revision === this.revision) this.dirty.set(false);
          }
        }
        // Also when the deck was left meanwhile: a queued save may be another deck's.
        this.sendQueued();
        this.settled.next();
      },
      error: (err: unknown) => {
        if (this.settle(id, revision)) {
          // Changes made meanwhile stay dirty: they go with « Réessayer » or the next change.
          this.queued.delete(id);
          this.saveError.set(this.ports.formatError(err));
        }
        this.sendQueued();
        this.settled.next();
      },
    });
  }

  /**
   * Sends a save that waited for the running request, once none runs: the open deck's current
   * state (unless a change is about to be saved anyway), or the payload queued for a deck left since.
   */
  private sendQueued(): void {
    if (this.inFlight !== null) return;
    const next = this.queued.entries().next();
    if (next.done) return;
    const [id, q] = next.value;
    this.queued.delete(id);
    if (id !== this.ports.currentDeckId()) this.send(id, q.revision, q.payload, false);
    else if (!this.saveTimer) this.save();
    else this.sendQueued();
  }

  /** Ends the running request; `false` when the deck was left meanwhile (its answer is ignored). */
  private settle(id: string, revision: number): boolean {
    if (this.inFlight === revision) {
      this.inFlight = null;
      this.saving.set(false);
    }
    return this.ports.currentDeckId() === id;
  }
}
