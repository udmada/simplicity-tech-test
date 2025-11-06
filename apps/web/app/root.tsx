import type { LinksFunction } from "@remix-run/cloudflare";
import {
  Links,
  Meta,
  NavLink,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useLocation,
  useRouteError,
} from "@remix-run/react";
import { useState } from "react";

import stylesheet from "~/tailwind.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
  { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NZ">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

const navigation = [
  {
    to: "/accounts",
    label: "Accounts",
    description: "Connected institutions & balances",
    icon: (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m3 11 9-7 9 7" />
        <path d="M4 10v10h16V10" />
        <path d="M10 14h4" />
      </svg>
    ),
  },
  {
    to: "/insights/cashflow",
    label: "Cashflow",
    description: "Inflow vs outflow insights",
    icon: (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 3v18h18" />
        <path d="M7 14c1.667-2 3.333-2 5 0s3.333 2 5-1" />
        <path d="m16 10 3-3" />
      </svg>
    ),
  },
];

export default function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const sidebarWidthClass = isSidebarCollapsed ? "lg:w-24" : "lg:w-72";
  const mainPaddingClass = isSidebarCollapsed ? "lg:pl-24" : "lg:pl-72";

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex min-h-screen flex-1 flex-col lg:flex-row">
        <aside
          className={`border-b border-gray-200 bg-white transition-all duration-200 lg:fixed lg:inset-y-0 lg:flex lg:flex-col lg:border-b-0 lg:border-r ${sidebarWidthClass}`}
        >
          <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 lg:h-20 lg:px-6">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold uppercase tracking-wide text-white">
                SF
              </span>
              <div className={`block ${isSidebarCollapsed ? "lg:hidden" : "lg:block"}`}>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  Simplicity Finance
                </p>
                <p className="text-sm font-medium text-gray-900">KiwiSaver Companion</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-6 lg:px-4">
            {navigation.map((item) => (
              <NavLink
                prefetch="intent"
                key={item.to}
                to={item.to}
                className={({ isActive }) => {
                  const base =
                    "group flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition hover:border-blue-300 hover:bg-blue-50";
                  const collapsed = isSidebarCollapsed ? "lg:justify-center lg:px-3 lg:py-3" : "";
                  const state = isActive
                    ? "border-blue-400 bg-blue-50 text-blue-700"
                    : "border-transparent bg-white text-gray-700";
                  return [base, collapsed, state].filter(Boolean).join(" ");
                }}
              >
                <span className="rounded-lg bg-blue-50 p-2 text-blue-500 group-hover:bg-blue-100">
                  {item.icon}
                </span>
                <span
                  className={`flex flex-col text-left ${isSidebarCollapsed ? "lg:hidden" : "lg:flex"}`}
                >
                  <span className="font-semibold">{item.label}</span>
                  <span className="text-xs text-gray-500">{item.description}</span>
                </span>
              </NavLink>
            ))}
          </nav>
          <div className="border-t border-gray-200 px-4 py-4">
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((value) => !value)}
              className="hidden w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-100 lg:inline-flex"
              aria-label={isSidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {isSidebarCollapsed ? (
                  <>
                    <path d="M9 18 15 12 9 6" />
                    <path d="M4 6v12" />
                  </>
                ) : (
                  <>
                    <path d="m15 18-6-6 6-6" />
                    <path d="M20 6v12" />
                  </>
                )}
              </svg>
              {!isSidebarCollapsed && <span>Collapse sidebar</span>}
            </button>
          </div>
        </aside>

        <main className={`flex-1 transition-all duration-200 ${mainPaddingClass}`}>
          <div className="border-b border-gray-200 bg-white px-6 py-4 lg:hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  Simplicity Take Home
                </p>
                <p className="text-sm font-medium text-gray-900">Tech Test Companion</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              {navigation.map((item) => (
                <NavLink
                  prefetch="intent"
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex-1 rounded-lg border px-3 py-2 text-center text-xs font-medium transition ${
                      isActive
                        ? "border-blue-400 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-white text-gray-600"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>

          <div className="px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const location = useLocation();

  if (
    isRouteErrorResponse(error) &&
    error.status === 401 &&
    error.data &&
    typeof error.data === "object" &&
    "code" in error.data &&
    (error.data as { code?: string }).code === "PLAID_TOKEN_MISSING"
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
          <div className="mb-6 space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">Plaid sandbox token required</h1>
            <p className="text-sm text-gray-600">
              Provide the Plaid sandbox access token so the demo can hydrate account and cashflow
              data. The token will be stored in a browser cookie for this session only.
            </p>
          </div>

          <p className="text-sm text-gray-600">
            SANDBOX_ACCESS_TOKEN is not configured. Update your Cloudflare Pages/Workers env or local
            <code className="ml-1 rounded bg-gray-100 px-1 py-0.5">.dev.vars</code> and restart the dev
            server.
          </p>
          <a
            href={location.pathname}
            className="mt-6 inline-flex w-full items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Retry
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
          <svg
            className="w-6 h-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Oops! Something went wrong
        </h1>

        <p className="text-gray-600 text-center mb-6">
          {isRouteErrorResponse(error)
            ? `${error.status} ${error.statusText}`
            : error instanceof Error
              ? error.message
              : "Unknown error occurred"}
        </p>

        {error instanceof Error && error.stack && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              Show error details
            </summary>
            <pre className="mt-2 p-4 bg-gray-50 rounded text-xs overflow-auto max-h-64">
              {error.stack}
            </pre>
          </details>
        )}

        <div className="mt-6">
          <a
            href="/"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-2 px-4 rounded-md transition-colors"
          >
            Go back home
          </a>
        </div>
      </div>
    </div>
  );
}
