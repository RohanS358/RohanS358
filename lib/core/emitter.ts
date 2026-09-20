/**
 * A tiny event emitter.
 *
 * `on` hands back its own unsubscribe rather than needing a matching
 * `off` call with the same function reference — the reference bundle
 * does this too, and it is what makes teardown in `destroy()` a list of
 * calls instead of a bookkeeping exercise.
 */
export type Unsubscribe = () => void;
type Handler = (...args: never[]) => void;

export function createEmitter() {
  const events = new Map<string, Handler[]>();

  return {
    emit(name: string, ...args: unknown[]) {
      const list = events.get(name);
      if (!list) return;
      /* Iterated over a copy: a handler that unsubscribes itself would
         otherwise shorten the array mid-loop and skip its neighbour. */
      for (const fn of [...list]) (fn as (...a: unknown[]) => void)(...args);
    },

    on(name: string, fn: Handler): Unsubscribe {
      const list = events.get(name);
      if (list) list.push(fn);
      else events.set(name, [fn]);
      return () => {
        const current = events.get(name);
        if (current) events.set(name, current.filter((f) => f !== fn));
      };
    },
  };
}

export type Emitter = ReturnType<typeof createEmitter>;
