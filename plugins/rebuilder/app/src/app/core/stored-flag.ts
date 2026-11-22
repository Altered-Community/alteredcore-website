import { signal, type WritableSignal } from '@angular/core';

/**
 * A boolean remembered in this browser (`localStorage`), such as a side panel left closed.
 * Falls back to `initial` when storage is empty or blocked (private mode, site data disabled).
 */
export function storedFlag(key: string, initial: boolean): WritableSignal<boolean> {
  let start = initial;
  try {
    const raw = localStorage.getItem(key);
    if (raw === 'true' || raw === 'false') start = raw === 'true';
  } catch {
    start = initial;
  }
  const flag = signal(start);
  const set = flag.set.bind(flag);
  flag.set = (value: boolean) => {
    set(value);
    try {
      localStorage.setItem(key, String(value));
    } catch {
      // Not remembered: the panel still opens and closes for this visit.
    }
  };
  flag.update = (fn: (value: boolean) => boolean) => flag.set(fn(flag()));
  return flag;
}
