export const ROUTES = {
  LOGIN: "/",
  ONBOARDING: "/onboarding",
  DASHBOARD: "/dashboard",
  TENDERS: "/tenders",
  PROFILE: "/profile",
  FORM: "/form/:submissionId",
  COMPONENTS: "/components",
} as const;

export type RouteKey = keyof typeof ROUTES;
export type RoutePath = typeof ROUTES[RouteKey];

export interface RouteMetadata {
  path: RoutePath;
  title: string;
  description: string;
  requiresAuth: boolean;
  layout?: "auth" | "dashboard" | "none";
}

export const ROUTE_METADATA: Record<RouteKey, RouteMetadata> = {
  LOGIN: {
    path: "/",
    title: "Login",
    description: "Access your MIST portal with a secure passwordless authentication link",
    requiresAuth: false,
    layout: "auth",
  },
  ONBOARDING: {
    path: "/onboarding",
    title: "Onboarding",
    description: "Complete your institutional profile setup",
    requiresAuth: true,
    layout: "auth",
  },
  DASHBOARD: {
    path: "/dashboard",
    title: "Dashboard",
    description: "Overview of your tenders and submissions",
    requiresAuth: true,
    layout: "dashboard",
  },
  TENDERS: {
    path: "/tenders",
    title: "Tenders",
    description: "Browse and manage architectural tenders",
    requiresAuth: true,
    layout: "dashboard",
  },
  PROFILE: {
    path: "/profile",
    title: "Profile",
    description: "Manage your institutional profile and credentials",
    requiresAuth: true,
    layout: "dashboard",
  },
  FORM: {
    path: "/form/:submissionId",
    title: "Tender Submission",
    description: "Submit your tender documents and required files",
    requiresAuth: true,
    layout: "none",
  },
  COMPONENTS: {
    path: "/components",
    title: "Design System",
    description: "MIST component library and design guidelines",
    requiresAuth: false,
    layout: "none",
  },
};
