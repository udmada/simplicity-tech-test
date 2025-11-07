import type { Route } from "./+types/accounts";
import { Effect } from "effect";
import {
  PlaidClient,
  type Account,
  mapPlaidAccountToDomain,
  ItemId,
  InstitutionId,
} from "@udmada/finance-client";
import { createRuntimeLayer, getPlaidConfig } from "~/lib/runtime.server";

export async function loader({ context }: Route.LoaderArgs) {
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

  const plaidConfig = getPlaidConfig(env);
  const runtimeLayer = createRuntimeLayer(plaidConfig);

  const program = Effect.Do.pipe(
    Effect.tap(() => Effect.log("Fetching accounts from Plaid")),
    Effect.bind("client", () => PlaidClient),
    Effect.bind("response", ({ client }) => client.accountsGet({ access_token: accessToken })),
    Effect.bind("accounts", ({ response }) => {
      const plaidContext = {
        itemId: ItemId(response.item.item_id),
        institutionId: InstitutionId(response.item.institution_id ?? "unknown"),
        institutionName: response.item.institution_name ?? "Unknown Institution",
        syncedAt: Date.now(),
      };

      return Effect.all(
        response.accounts.map((account) => mapPlaidAccountToDomain(account, plaidContext)),
        { concurrency: "unbounded" },
      );
    }),
    Effect.tap(({ accounts }) =>
      Effect.log(`Successfully mapped accounts. count=${accounts.length}`),
    ),
    Effect.map(({ accounts }) => accounts),
  );

  const accounts = await Effect.runPromise(program.pipe(Effect.provide(runtimeLayer)));

  return { accounts };
}

export default function Accounts({ loaderData }: Route.ComponentProps) {
  const { accounts } = loaderData;

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Your accounts</h1>
            <p className="mt-1 text-sm text-gray-600">
              {accounts.length} {accounts.length === 1 ? "account" : "accounts"} connected
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Powered by</span>
            <svg className="h-8 w-8 text-gray-900" viewBox="0 0 68 68" aria-hidden="true">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M29.033 7.6 14.177 11.452 10.084 26.243l5.12 5.205L10 36.568l3.853 14.856 14.791 4.092 5.204-5.12 5.12 5.204 14.855-3.852 4.093-14.794-5.119-5.203L58 26.632 54.148 11.776 39.355 7.684 34.153 12.803 29.033 7.6Zm-9.119 6.7 7.826-2.03 3.422 3.478-4.99 4.91-6.258-6.358Zm17.186 1.492 3.477-3.421 7.792 2.155-6.359 6.256-4.91-5.99ZM14.77 25.033l2.156-7.79 6.254 6.358-4.99 4.91-3.42-3.478Zm30.17-1.265 6.358-6.257 2.028 7.826-3.476 3.422-4.91-4.991ZM29.113 23.643l4.99-4.91 4.91 4.991-4.99 4.91-4.91-4.991Zm-7.974 7.849 4.99-4.91 4.91 4.99-4.99 4.91-4.91-4.99Zm15.826.138 4.99-4.91 4.91 4.991-4.99 4.91-4.91-4.99ZM14.67 37.86l3.478-3.422 4.909 4.992-6.357 6.255-2.03-7.825Zm14.32 1.613 4.991-4.91 4.91 4.99-4.99 4.91-4.91-4.99Zm15.826.13 4.99-4.91 3.422 3.478-2.156 7.791-6.256-6.359ZM19.639 48.676l6.358-6.257 4.91 4.991-3.477 3.422-7.791-2.156Zm17.197-1.216 4.99-4.91 6.256 6.358-7.824 2.029-3.422-3.477Z"
                fill="currentColor"
              />
            </svg>
            <span>Plaid Sandbox</span>
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-sm text-gray-600">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt
          ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation
          ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in
          reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur
          sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id
          est laborum.
        </p>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        {accounts.length === 0 ? (
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No accounts</h3>
            <p className="mt-1 text-sm text-gray-500">
              Connect a sandbox item to see balances and metadata.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {accounts.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function AccountCard({ account }: { account: Account }) {
  const typeColor = getAccountTypeColor(account.type);
  const stateColor = getAccountStateColor(account.state);

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 truncate">{account.name}</h2>
          {account.officialName && account.officialName !== account.name && (
            <p className="text-sm text-gray-500 truncate">{account.officialName}</p>
          )}
        </div>
        <span className={`ml-2 px-2 py-1 text-xs font-medium rounded ${typeColor}`}>
          {account.type}
        </span>
      </div>

      {/* Balance */}
      <div className="space-y-3">
        <div>
          <p className="text-sm text-gray-500">Current Balance</p>
          <p className="text-2xl font-bold text-gray-900">{formatMoney(account.currentBalance)}</p>
        </div>

        {account.availableBalance && (
          <div>
            <p className="text-sm text-gray-500">Available</p>
            <p className="text-lg text-gray-700">{formatMoney(account.availableBalance)}</p>
          </div>
        )}

        {account.creditLimit && (
          <div>
            <p className="text-sm text-gray-500">Credit Limit</p>
            <p className="text-lg text-gray-700">{formatMoney(account.creditLimit)}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
        <div className="text-xs text-gray-500">
          <span className="font-medium">{account.institutionName}</span>
          <span className="mx-1">•</span>
          <span>••••{account.mask}</span>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded ${stateColor}`}>
          {account.state}
        </span>
      </div>

      {/* Subtype */}
      <div className="mt-2">
        <span className="inline-block px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded">
          {account.subtype}
        </span>
        {account.holderCategory && (
          <span className="ml-2 inline-block px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded">
            {account.holderCategory}
          </span>
        )}
      </div>
    </div>
  );
}

// Helper functions
function formatMoney(money: { amount: number; currency: string }): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: money.currency,
  }).format(money.amount);
}

function getAccountTypeColor(type: string): string {
  const colors: Record<string, string> = {
    depository: "bg-blue-100 text-blue-800",
    credit: "bg-purple-100 text-purple-800",
    loan: "bg-red-100 text-red-800",
    investment: "bg-green-100 text-green-800",
  };
  return colors[type] || "bg-gray-100 text-gray-800";
}

function getAccountStateColor(state: string): string {
  const colors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    frozen: "bg-yellow-100 text-yellow-800",
    closed: "bg-gray-100 text-gray-800",
  };
  return colors[state] || "bg-gray-100 text-gray-800";
}
