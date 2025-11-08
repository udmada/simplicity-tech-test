import { createRequestHandler } from "react-router";

interface FinanceEnv {
  PLAID_CLIENT_ID: string;
  PLAID_SECRET: string;
  PLAID_ENV: "sandbox" | "development" | "production";
  SANDBOX_ACCESS_TOKEN: string;
}

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: {
      env: FinanceEnv;
      ctx: ExecutionContext;
    };
  }
}

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  async fetch(request: Request, env: FinanceEnv, ctx: ExecutionContext) {
    return requestHandler(request, {
      cloudflare: { env, ctx },
    });
  },
} satisfies ExportedHandler<FinanceEnv>;
