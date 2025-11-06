/**
 * Domain Events
 *
 * Demonstrates:
 * - Discriminated unions for type-safe event handling
 * - Type-level event maps requiring total handlers
 * - Event extraction by tag
 * - Compile-time exhaustiveness checking
 */

import type { AccountId } from "./ids.js";
import type { Money } from "./money.js";
import { Effect } from "effect";

/**
 * Domain events as discriminated union
 *
 * All events must have:
 * - _tag: unique discriminant for type narrowing
 * - timestamp: when the event occurred
 * - relevant domain data
 */
export type DomainEvent =
  | {
      readonly _tag: "AccountLinked";
      readonly timestamp: number;
      readonly accountId: AccountId;
      readonly provider: "plaid" | "akahu";
      readonly institutionName: string;
    }
  | {
      readonly _tag: "BalanceUpdated";
      readonly timestamp: number;
      readonly accountId: AccountId;
      readonly newBalance: Money;
      readonly previousBalance: Money;
    }
  | {
      readonly _tag: "TransactionsSynced";
      readonly timestamp: number;
      readonly accountId: AccountId;
      readonly count: number;
      readonly dateRange: {
        start: string;
        end: string;
      };
    }
  | {
      readonly _tag: "PortfolioUpdated";
      readonly timestamp: number;
      readonly accountId: AccountId;
      readonly totalValue: Money;
      readonly holdingsCount: number;
    }
  | {
      readonly _tag: "HoldingUpdated";
      readonly timestamp: number;
      readonly accountId: AccountId;
      readonly securityId: string;
      readonly quantity: number;
      readonly value: Money;
    };

/**
 * Extract event type by tag using conditional types
 *
 * Example: EventByTag<'AccountLinked'> = { _tag: 'AccountLinked', ... }
 */
export type EventByTag<Tag extends DomainEvent["_tag"]> = Extract<DomainEvent, { _tag: Tag }>;

/**
 * Total event handler - requires ALL events to be handled
 *
 * Compiler enforces:
 * - Every event type has a handler
 * - No extra handlers for non-existent events
 * - Handler signature matches event type
 */
export type TotalEventHandler = {
  [K in DomainEvent["_tag"]]: (event: EventByTag<K>) => Effect.Effect<void>;
};

/**
 * Partial event handler - only handle specific events
 */
export type PartialEventHandler = {
  [K in DomainEvent["_tag"]]?: (event: EventByTag<K>) => Effect.Effect<void>;
};

/**
 * Helper to create event with timestamp
 */
export const createEvent = <E extends DomainEvent>(event: Omit<E, "timestamp">): E =>
  ({
    ...event,
    timestamp: Date.now(),
  }) as E;

/**
 * Event handler utilities
 */

/**
 * Match on event type and execute appropriate handler
 */
export const matchEvent =
  (handlers: TotalEventHandler) =>
  (event: DomainEvent): Effect.Effect<void> => {
    switch (event._tag) {
      case "AccountLinked":
        return handlers.AccountLinked(event);
      case "BalanceUpdated":
        return handlers.BalanceUpdated(event);
      case "TransactionsSynced":
        return handlers.TransactionsSynced(event);
      case "PortfolioUpdated":
        return handlers.PortfolioUpdated(event);
      case "HoldingUpdated":
        return handlers.HoldingUpdated(event);
    }
  };

/**
 * Match with fallback for partial handlers
 */
export const matchEventPartial =
  (handlers: PartialEventHandler, fallback: (event: DomainEvent) => Effect.Effect<void>) =>
  (event: DomainEvent): Effect.Effect<void> => {
    switch (event._tag) {
      case "AccountLinked":
        return handlers.AccountLinked ? handlers.AccountLinked(event) : fallback(event);
      case "BalanceUpdated":
        return handlers.BalanceUpdated ? handlers.BalanceUpdated(event) : fallback(event);
      case "TransactionsSynced":
        return handlers.TransactionsSynced ? handlers.TransactionsSynced(event) : fallback(event);
      case "PortfolioUpdated":
        return handlers.PortfolioUpdated ? handlers.PortfolioUpdated(event) : fallback(event);
      case "HoldingUpdated":
        return handlers.HoldingUpdated ? handlers.HoldingUpdated(event) : fallback(event);
    }
  };
