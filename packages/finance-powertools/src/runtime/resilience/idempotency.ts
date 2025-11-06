import { Context, Effect, Exit, Layer } from "effect";

export interface IdempotencyService {
  execute<R, E, A>(key: string, effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R>;
  clear(key: string): Effect.Effect<void>;
}

export const Idempotency = Context.GenericTag<IdempotencyService>("finance/IdempotencyService");

export interface InMemoryIdempotencyOptions {
  readonly ttlMs?: number;
  readonly maxEntries?: number;
}

interface StoredExit {
  readonly exit: Exit.Exit<unknown, unknown>;
  readonly expiresAt: number | null;
}

const isExpired = (item: StoredExit) => item.expiresAt !== null && Date.now() > item.expiresAt;

const prune = (store: Map<string, StoredExit>) => {
  for (const [key, record] of store.entries()) {
    if (isExpired(record)) {
      store.delete(key);
    }
  }
};

export const inMemoryIdempotencyLayer = (options?: InMemoryIdempotencyOptions) =>
  Layer.scoped(
    Idempotency,
    Effect.sync(() => {
      const ttlMs = options?.ttlMs ?? 5 * 60 * 1000;
      const maxEntries = options?.maxEntries ?? 1_000;
      const store = new Map<string, StoredExit>();

      const service: IdempotencyService = {
        execute: <R, E, A>(key: string, effect: Effect.Effect<A, E, R>) =>
          Effect.gen(function* (_) {
            prune(store);
            const cached = store.get(key);

            if (cached && !isExpired(cached)) {
              return yield* _(
                Exit.matchEffect(cached.exit as Exit.Exit<A, E>, {
                  onFailure: (cause) => Effect.failCause(cause),
                  onSuccess: (value) => Effect.succeed(value),
                }),
              );
            }

            if (store.size >= maxEntries) {
              const [oldestKey] = store.keys();
              if (oldestKey) {
                store.delete(oldestKey);
              }
            }

            const exit = yield* _(Effect.exit(effect));
            store.set(key, {
              exit,
              expiresAt: ttlMs > 0 ? Date.now() + ttlMs : null,
            });

            return yield* _(
              Exit.matchEffect(exit, {
                onFailure: (cause) => Effect.failCause(cause),
                onSuccess: (value) => Effect.succeed(value),
              }),
            );
          }),

        clear: (key) =>
          Effect.sync(() => {
            store.delete(key);
          }),
      };

      return service;
    }),
  );

export const noOpIdempotencyLayer = Layer.succeed(Idempotency, {
  execute: <R, E, A>(_key: string, effect: Effect.Effect<A, E, R>) => effect,
  clear: () => Effect.void,
});
