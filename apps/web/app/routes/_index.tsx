import { redirect } from "@remix-run/cloudflare";
import type { LoaderFunctionArgs } from "@remix-run/cloudflare";

export function loader(_: LoaderFunctionArgs) {
  return redirect("/accounts");
}
