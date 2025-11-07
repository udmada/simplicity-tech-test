import { type RouteConfig, route } from "@react-router/dev/routes";

export default [
  route("/", "routes/accounts.tsx"),
  route("/insights/cashflow", "routes/insights.cashflow.tsx"),
] satisfies RouteConfig;
