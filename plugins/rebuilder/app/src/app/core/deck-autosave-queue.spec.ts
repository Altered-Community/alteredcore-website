import { Subject } from 'rxjs';
import { DeckAutosaveQueue } from './deck-autosave-queue';
import type { Deck, DeckWrite } from './models';

interface PendingPatch {
  id: string;
  payload: Partial<DeckWrite>;
  keepalive: boolean;
  subject: Subject<Deck | null>;
}

describe('DeckAutosaveQueue', () => {
  function setup(initialId: string | null = 'deck-1', loggedIn = true) {
    let deckId: string | null = initialId;
    let canSaveRemote = loggedIn;
    let name = 'Initial';
    const guestSaves: string[] = [];
    const remoteSaved: (Deck | null | undefined)[] = [];
    const patches: PendingPatch[] = [];

    const queue = new DeckAutosaveQueue({
      currentDeckId: () => deckId,
      isGuestId: (id) => id.startsWith('guest-'),
      canSaveRemote: () => canSaveRemote,
      saveGuest: (id) => guestSaves.push(id),
      buildPayload: () => ({ name }),
      patchRemote: (id, payload, { keepalive }) => {
        const subject = new Subject<Deck | null>();
        patches.push({ id, payload, keepalive, subject });
        return subject.asObservable();
      },
      onRemoteSaved: (saved) => remoteSaved.push(saved),
      formatError: () => 'save failed',
      unauthorizedError: () => 'unauthorized',
      delayMs: 50,
    });

    return {
      queue,
      patches,
      guestSaves,
      remoteSaved,
      setName: (v: string) => (name = v),
      setDeckId: (v: string | null) => (deckId = v),
      setLoggedIn: (v: boolean) => (canSaveRemote = v),
    };
  }

  it('saves guest decks synchronously on flush and clears saveError', () => {
    const { queue, guestSaves, patches } = setup('guest-1');
    queue.setError('previous error');
    queue.touch();
    expect(queue.saveState()).toBe('error');
    queue.flush();
    expect(guestSaves).toEqual(['guest-1']);
    expect(patches).toEqual([]);
    expect(queue.dirty()).toBe(false);
    expect(queue.saveError()).toBeNull();
    expect(queue.saveState()).toBe('saved');
  });

  it('serializes plain PATCH requests and sends the latest state last', () => {
    const { queue, patches, setName } = setup('deck-1');
    setName('First');
    queue.touch();
    queue.flush();
    expect(patches.length).toBe(1);
    expect(queue.saveState()).toBe('saving');

    setName('Second');
    queue.touch();
    queue.flush();
    expect(patches.length).toBe(1);

    patches[0].subject.next({ id: 'deck-1', name: 'First', format: 'standard' });
    patches[0].subject.complete();
    expect(queue.dirty()).toBe(true);
    expect(patches.length).toBe(2);
    expect(patches[1].payload).toEqual({ name: 'Second' });

    patches[1].subject.next({ id: 'deck-1', name: 'Second', format: 'standard' });
    patches[1].subject.complete();
    expect(queue.dirty()).toBe(false);
    expect(queue.saveState()).toBe('saved');
  });

  it('re-sends current state if an older plain request answers after a newer keepalive request', () => {
    const { queue, patches, setName } = setup('deck-1');
    setName('V1');
    queue.touch();
    queue.flush();
    const plain = patches[0];

    setName('V2');
    queue.touch();
    queue.flush({ keepalive: true });
    const kept = patches[1];
    expect(kept.keepalive).toBe(true);
    expect(kept.payload).toEqual({ name: 'V2' });

    kept.subject.next({ id: 'deck-1', name: 'V2', format: 'standard' });
    kept.subject.complete();
    plain.subject.next({ id: 'deck-1', name: 'V1', format: 'standard' });
    plain.subject.complete();

    expect(patches.length).toBe(3);
    expect(patches[2].payload).toEqual({ name: 'V2' });
  });

  it('drains queued saves for a previously opened deck after switching decks', () => {
    const { queue, patches, setName, setDeckId } = setup('deck-1');
    setName('D1-A');
    queue.touch();
    queue.flush();
    setName('D1-B');
    queue.touch();
    queue.flush();

    setDeckId('deck-2');
    queue.resetDeckStatus();
    setName('D2');

    patches[0].subject.next({ id: 'deck-1', name: 'D1-A', format: 'standard' });
    patches[0].subject.complete();
    expect(patches.length).toBe(2);
    expect(patches[1].id).toBe('deck-1');
    expect(patches[1].payload).toEqual({ name: 'D1-B' });
  });

  it('saveNow() reports unauthorized error when session expired before sending', () => {
    const { queue, setLoggedIn } = setup('deck-1', true);
    queue.touch();
    setLoggedIn(false);
    const out: boolean[] = [];
    queue.saveNow().subscribe((ok) => out.push(ok));
    expect(out).toEqual([false]);
    expect(queue.saveError()).toBe('unauthorized');
  });

  it('leavePage() returns true when the last save had failed', () => {
    const { queue, patches, setName } = setup('deck-1');
    setName('Unsaved');
    queue.touch();
    expect(queue.leavePage()).toBe(false);
    expect(patches[0].keepalive).toBe(true);
    patches[0].subject.error(new Error('500'));
    expect(queue.saveState()).toBe('error');
    expect(queue.leavePage()).toBe(true);
  });
});
