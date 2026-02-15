import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  // Auth layout (shared left panel)
  layout("routes/auth-layout.tsx", [
    index("routes/login.tsx"),
    route("onboarding", "routes/onboarding.tsx"),
  ]),

  // Dashboard
  route("dashboard", "routes/dashboard.tsx"),
  route("admin", "routes/admin.tsx"),

  // Form submission
  route("form/:submissionId", "routes/form.tsx"),
  route("form/:submissionId/success", "routes/form.success.tsx"),
  route("form-upload", "routes/form-upload.ts"),
  route(
    "api/application/:submissionId/state",
    "routes/api.application.$submissionId.state.ts",
  ),
  route("logout", "routes/logout.ts"),

  // Design system reference
  route("components", "routes/components.tsx"),
] satisfies RouteConfig;
