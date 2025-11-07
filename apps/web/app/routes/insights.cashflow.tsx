import { useFetcher } from "react-router";
import { useEffect, useMemo, useState } from "react";
import { Effect } from "effect";
import { PlaidClient, mapPlaidTransactionToDomain } from "@udmada/finance-client";
import type { PlaidTransactionDomain } from "@udmada/finance-client";
import type { Route } from "./+types/insights.cashflow";
import { createRuntimeLayer, getPlaidConfig } from "~/lib/runtime.server";

interface CashflowWindow {
  readonly months: number;
  readonly startDate: string;
  readonly endDate: string;
}

interface CashflowSummary {
  readonly totalInflow: number;
  readonly totalOutflow: number;
  readonly net: number;
  readonly averageDailyNet: number;
  readonly currency: string;
}

interface CashflowMonthlySnapshot {
  readonly month: string;
  readonly label: string;
  readonly inflow: number;
  readonly outflow: number;
  readonly net: number;
}

interface CashflowCategorySnapshot {
  readonly name: string;
  readonly total: number;
  readonly count: number;
  readonly average: number;
}

interface CashflowLoaderData {
  readonly window: CashflowWindow;
  readonly summary: CashflowSummary;
  readonly monthly: ReadonlyArray<CashflowMonthlySnapshot>;
  readonly topCategories: ReadonlyArray<CashflowCategorySnapshot>;
  readonly meta: {
    readonly transactionCount: number;
    readonly hasMore: boolean;
    readonly generatedAt: string;
  };
}

const ALLOWED_WINDOWS = [3, 6, 12] as const;

const clampWindow = (requested: number | null): number => {
  if (requested && ALLOWED_WINDOWS.includes(requested as (typeof ALLOWED_WINDOWS)[number])) {
    return requested;
  }
  return 6;
};

const formatDate = (date: Date): string => date.toISOString().slice(0, 10);

const calculateDateRange = (months: number): { startDate: string; endDate: string } => {
  const end = new Date();
  const start = new Date(end);
  start.setMonth(start.getMonth() - (months - 1));
  start.setDate(1);
  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
};

const formatMonthLabel = (monthKey: string): string => {
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return new Intl.DateTimeFormat("en-NZ", {
    month: "short",
    year: "numeric",
  }).format(date);
};

const aggregateCashflow = (
  transactions: ReadonlyArray<PlaidTransactionDomain>,
  range: CashflowWindow,
  hasMore: boolean,
): CashflowLoaderData => {
  const monthly = new Map<string, { inflow: number; outflow: number; net: number }>();
  const categories = new Map<string, { total: number; count: number }>();

  let currency = transactions[0]?.amount.currency ?? "NZD";
  let totalInflow = 0;
  let totalOutflow = 0;

  for (const transaction of transactions) {
    currency = transaction.amount.currency;
    const amount = transaction.amount.amount;
    const monthKey = transaction.date.slice(0, 7); // YYYY-MM

    const snapshot = monthly.get(monthKey) ?? {
      inflow: 0,
      outflow: 0,
      net: 0,
    };

    if (amount < 0) {
      const inflow = Math.abs(amount);
      snapshot.inflow += inflow;
      totalInflow += inflow;
    } else {
      snapshot.outflow += amount;
      totalOutflow += amount;
      const categoryNames =
        transaction.category.length > 0 ? transaction.category : ["Uncategorized"];
      for (const name of categoryNames) {
        const category = categories.get(name) ?? { total: 0, count: 0 };
        category.total += amount;
        category.count += 1;
        categories.set(name, category);
      }
    }

    snapshot.net = snapshot.inflow - snapshot.outflow;
    monthly.set(monthKey, snapshot);
  }

  const timeline: CashflowMonthlySnapshot[] = [];
  const cursor = new Date(range.startDate);

  for (let i = 0; i < range.months; i += 1) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    const snapshot = monthly.get(key) ?? { inflow: 0, outflow: 0, net: 0 };
    timeline.push({
      month: key,
      label: formatMonthLabel(key),
      inflow: Number(snapshot.inflow.toFixed(2)),
      outflow: Number(snapshot.outflow.toFixed(2)),
      net: Number(snapshot.net.toFixed(2)),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const topCategories = Array.from(categories.entries())
    .map<CashflowCategorySnapshot>(([name, snapshot]) => ({
      name,
      total: Number(snapshot.total.toFixed(2)),
      count: snapshot.count,
      average: Number((snapshot.total / snapshot.count).toFixed(2)),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const net = totalInflow - totalOutflow;
  const start = new Date(range.startDate);
  const end = new Date(range.endDate);
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1);
  const averageDailyNet = days === 0 ? 0 : net / days;

  return {
    window: range,
    summary: {
      totalInflow: Number(totalInflow.toFixed(2)),
      totalOutflow: Number(totalOutflow.toFixed(2)),
      net: Number(net.toFixed(2)),
      averageDailyNet: Number(averageDailyNet.toFixed(2)),
      currency,
    },
    monthly: timeline,
    topCategories,
    meta: {
      transactionCount: transactions.length,
      hasMore,
      generatedAt: new Date().toISOString(),
    },
  };
};

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const windowParam = url.searchParams.get("window");
  const requestedWindow = windowParam ? Number.parseInt(windowParam, 10) : null;
  const months = clampWindow(Number.isNaN(requestedWindow) ? null : requestedWindow);

  const env = context.cloudflare?.env ?? {};
  const accessToken = env.SANDBOX_ACCESS_TOKEN;

  if (!accessToken) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw new Response(JSON.stringify({ code: "PLAID_TOKEN_MISSING" }), {
      status: 401,
      statusText: "Plaid sandbox token missing",
      headers: { "Content-Type": "application/json" },
    });
  }

  const { startDate, endDate } = calculateDateRange(months);
  const plaidConfig = getPlaidConfig(env);
  const runtimeLayer = createRuntimeLayer(plaidConfig);

  const program = Effect.Do.pipe(
    Effect.tap(() =>
      Effect.log(
        `Fetching cashflow insights from Plaid for window=${months} start=${startDate} end=${endDate}`,
      ),
    ),
    Effect.bind("client", () => PlaidClient),
    Effect.bind("response", ({ client }) =>
      client.transactionsGet({
        access_token: accessToken,
        start_date: startDate,
        end_date: endDate,
        options: {
          count: 500,
          offset: 0,
        },
      }),
    ),
    Effect.bind("transactions", ({ response }) =>
      Effect.all(
        response.transactions.map((transaction) => mapPlaidTransactionToDomain(transaction)),
        { concurrency: "unbounded" },
      ),
    ),
    Effect.map(({ response, transactions }) => ({
      transactions,
      hasMore: response.total_transactions > response.transactions.length,
    })),
    Effect.tap(({ transactions }) =>
      Effect.log(`Computed cashflow insights for ${transactions.length} transactions`),
    ),
    Effect.map(({ transactions, hasMore }) =>
      aggregateCashflow(transactions, { months, startDate, endDate }, hasMore),
    ),
  );

  const result = await Effect.runPromise(program.pipe(Effect.provide(runtimeLayer)));

  return result satisfies CashflowLoaderData;
}

export default function CashflowInsights({ loaderData }: Route.ComponentProps) {
  const initialData = loaderData;
  const fetcher = useFetcher<typeof loader>();
  const [selectedWindow, setSelectedWindow] = useState(initialData.window.months);
  const [viewData, setViewData] = useState(initialData);

  useEffect(() => {
    if (fetcher.data) {
      setViewData(fetcher.data);
    }
  }, [fetcher.data]);

  useEffect(() => {
    if (fetcher.state === "idle" && !fetcher.data) {
      setViewData(initialData);
    }
  }, [fetcher.data, fetcher.state, initialData]);

  const isLoading = fetcher.state !== "idle";

  const handleWindowChange = (months: number) => {
    setSelectedWindow(months);
    void fetcher.load(`/insights/cashflow?window=${months}`);
  };

  const trend = useMemo(() => {
    if (viewData.monthly.length < 2) {
      return null;
    }
    const [previous, latest] = [
      viewData.monthly[viewData.monthly.length - 2],
      viewData.monthly[viewData.monthly.length - 1],
    ];
    const delta = latest.net - previous.net;
    const direction: "steady" | "up" | "down" = delta === 0 ? "steady" : delta > 0 ? "up" : "down";
    return {
      delta,
      direction,
    };
  }, [viewData.monthly]);

  return (
    <div className="space-y-8 text-gray-900">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Insights</p>
            <h1 className="text-3xl font-bold text-gray-900">Cashflow Pulse</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              Track inflows, outflows, and category-level spending to prep KiwiSaver conversations
              and coach members toward better savings habits.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-100 p-1">
            {ALLOWED_WINDOWS.map((months) => (
              <button
                key={months}
                type="button"
                onClick={() => handleWindowChange(months)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  selectedWindow === months
                    ? "bg-blue-600 text-white shadow"
                    : "text-gray-600 hover:bg-white"
                }`}
                disabled={isLoading && selectedWindow === months}
              >
                {months}M
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Inflow"
          value={viewData.summary.totalInflow}
          currency={viewData.summary.currency}
          variant="positive"
          loading={isLoading}
        />
        <MetricCard
          title="Total Outflow"
          value={viewData.summary.totalOutflow}
          currency={viewData.summary.currency}
          variant="neutral"
          loading={isLoading}
        />
        <MetricCard
          title="Net Position"
          value={viewData.summary.net}
          currency={viewData.summary.currency}
          variant={viewData.summary.net >= 0 ? "positive" : "negative"}
          loading={isLoading}
          trend={trend}
        />
        <MetricCard
          title="Avg Daily Net"
          value={viewData.summary.averageDailyNet}
          currency={viewData.summary.currency}
          variant="neutral"
          loading={isLoading}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Monthly Net Cashflow</h2>
              <p className="text-xs text-gray-500">
                {viewData.window.startDate} → {viewData.window.endDate}
              </p>
            </div>
            {isLoading ? (
              <LoadingPill label="Refreshing…" />
            ) : (
              <span className="text-xs uppercase tracking-wide text-gray-500">
                {viewData.meta.transactionCount} transactions
              </span>
            )}
          </div>
          <MonthlyBarChart data={viewData.monthly} currency={viewData.summary.currency} />
          {viewData.meta.hasMore && (
            <p className="mt-4 text-xs text-amber-600">
              Showing first 500 transactions. Pull pagination to explore further history.
            </p>
          )}
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Top Spending Categories</h2>
            <p className="text-xs text-gray-500">
              Sorted by outflows. Use to tee up budgeting nudges or KiwiSaver catch-up plans.
            </p>
            <ul className="mt-4 space-y-3">
              {viewData.topCategories.length === 0 ? (
                <li className="text-sm text-gray-500">No outflow categories detected</li>
              ) : (
                viewData.topCategories.map((category) => (
                  <li
                    key={category.name}
                    className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{category.name}</p>
                      <p className="text-xs text-gray-500">{category.count} transactions</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-blue-600">
                        {formatCurrency(category.total, viewData.summary.currency)}
                      </p>
                      <p className="text-xs text-gray-500">
                        avg {formatCurrency(category.average, viewData.summary.currency)}
                      </p>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Narrative Hooks</h2>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              <li>• Compare cash surplus against KiwiSaver contribution gaps.</li>
              <li>• Spot discretionary overspend for targeted coaching.</li>
              <li>• Use month-over-month net swing to frame shortfall risk.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  title,
  value,
  currency,
  variant,
  loading,
  trend,
}: {
  readonly title: string;
  readonly value: number;
  readonly currency: string;
  readonly variant: "positive" | "neutral" | "negative";
  readonly loading: boolean;
  readonly trend?: { readonly delta: number; readonly direction: "up" | "down" | "steady" } | null;
}) {
  const variants = {
    positive: "border-green-100 from-green-50 via-white to-green-100 text-green-900",
    neutral: "border-gray-200 from-white via-white to-gray-100 text-gray-800",
    negative: "border-rose-100 from-rose-50 via-white to-rose-100 text-rose-900",
  } as const;

  return (
    <div className={`rounded-xl border bg-linear-to-br p-6 shadow-sm ${variants[variant]}`}>
      <p className="text-xs uppercase tracking-wide text-gray-600">{title}</p>
      <p className="mt-3 text-2xl font-semibold text-gray-900">
        {loading ? "…" : formatCurrency(value, currency)}
      </p>
      {trend && (
        <p
          className={`mt-1 text-xs ${
            trend.direction === "up"
              ? "text-green-700"
              : trend.direction === "down"
                ? "text-rose-700"
                : "text-gray-600"
          }`}
        >
          {trend.direction === "up" ? "▲" : trend.direction === "down" ? "▼" : "■"}{" "}
          {formatCurrency(Math.abs(trend.delta), currency)} vs prev. month
        </p>
      )}
    </div>
  );
}

function MonthlyBarChart({
  data,
  currency,
}: {
  readonly data: ReadonlyArray<CashflowMonthlySnapshot>;
  readonly currency: string;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-500">No transactions available for this window.</p>;
  }

  const maxVolume = Math.max(...data.map((snapshot) => snapshot.inflow + snapshot.outflow), 1);

  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {data.map((snapshot) => {
        const inflowRatio = snapshot.inflow / maxVolume;
        const outflowRatio = snapshot.outflow / maxVolume;

        return (
          <div
            key={snapshot.month}
            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs uppercase tracking-wide text-gray-500">{snapshot.label}</p>
            <p className="mt-2 text-lg font-semibold text-gray-900">
              {formatCurrency(snapshot.net, currency)}
            </p>
            <div className="mt-3 flex items-end gap-2">
              <div className="flex-1">
                <div className="h-24 rounded bg-green-100">
                  <div
                    className="h-full rounded bg-green-500"
                    style={{ height: `${Math.max(inflowRatio * 100, 4)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-green-700">
                  {formatCurrency(snapshot.inflow, currency)} in
                </p>
              </div>
              <div className="flex-1">
                <div className="h-24 rounded bg-rose-100">
                  <div
                    className="h-full rounded bg-rose-500"
                    style={{ height: `${Math.max(outflowRatio * 100, 4)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-rose-700">
                  {formatCurrency(snapshot.outflow, currency)} out
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LoadingPill({ label }: { readonly label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">
      <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
      {label}
    </span>
  );
}

const currencyFormatterCache = new Map<string, Intl.NumberFormat>();

const getCurrencyFormatter = (currency: string) => {
  if (!currencyFormatterCache.has(currency)) {
    currencyFormatterCache.set(
      currency,
      new Intl.NumberFormat("en-NZ", { style: "currency", currency }),
    );
  }
  return currencyFormatterCache.get(currency)!;
};

const formatCurrency = (value: number, currency: string) =>
  getCurrencyFormatter(currency).format(value);
