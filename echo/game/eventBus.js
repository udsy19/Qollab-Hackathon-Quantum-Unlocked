// Small synchronous event bus. A throwing listener is reported and skipped so one broken
// subscriber (a UI panel, an effect) can never stop a quest transition reaching the others.
export function createEventBus({ onError = (err, type) => console.error(`[eventBus] listener for "${type}" threw`, err) } = {}) {
  const listeners = new Map();

  function on(type, fn) {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(fn);
    return () => listeners.get(type)?.delete(fn);
  }

  function emit(type, payload) {
    const set = listeners.get(type);
    if (!set) return;
    // Snapshot: a listener subscribed mid-emit (e.g. by a quest:enter handler) waits for the next emit.
    for (const fn of [...set]) {
      try { fn(payload); } catch (err) { onError(err, type); }
    }
  }

  return { on, emit };
}
