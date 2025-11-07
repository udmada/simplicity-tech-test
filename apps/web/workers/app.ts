import { createRequestHandler } from "react-router";

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
    };
  }
}

const serverBuild = () =>
  // @ts-ignore - generated at build time
  import("../build/server/index.js");

const runtimeMode =
  (import.meta as { env?: { MODE?: string } }).env?.MODE ??
  (
    globalThis as typeof globalThis & {
      process?: { env?: { NODE_ENV?: string } };
    }
  ).process?.env?.NODE_ENV ??
  "production";

const requestHandler = createRequestHandler(serverBuild, runtimeMode);

export default {
  fetch(request, env, ctx) {
    return requestHandler(request, {
      cloudflare: { env, ctx },
    });
  },
} satisfies ExportedHandler<Env>;
