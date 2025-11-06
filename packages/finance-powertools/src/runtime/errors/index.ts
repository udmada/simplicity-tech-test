import { Cause, Effect } from "effect";

export const renderCause = (cause: Cause.Cause<unknown>) => Cause.pretty(cause);

export interface ErrorEnricher {
  (cause: Cause.Cause<unknown>): Record<string, unknown>;
}

export const enrichError = (cause: Cause.Cause<unknown>, enricher: ErrorEnricher) =>
  Effect.sync(() => ({
    message: Cause.pretty(cause),
    details: enricher(cause),
  }));

export const defaultErrorEnricher: ErrorEnricher = () => ({});
