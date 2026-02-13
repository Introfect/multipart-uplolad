import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  // Auth layout (shared left panel)
  layout("routes/auth-layout.tsx", [
    index("routes/login.tsx"),
    route("onboarding", "routes/onboarding.tsx"),
  ]),

  // Dashboard
  route("dashboard", "routes/dashboard.tsx"),

  // Form submission
  route("form/:formId", "routes/form.tsx"),

  // Design system reference
  route("components", "routes/components.tsx"),
] satisfies RouteConfig;
