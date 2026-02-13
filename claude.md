# Multipart Upload - Project Guide

## 🏗️ Project Architecture

**Monorepo Structure:**
- `apps/backend/` - Cloudflare Worker running Hono API
- `apps/web/` - React Router v7 SSR application on Cloudflare Pages
- `packages/ui/` - Shared component library
- `packages/typescript-config/` - Shared TypeScript configurations
- `packages/eslint-config/` - Shared linting rules

**Tech Stack:**
- **Build System:** Turborepo with PNPM workspaces
- **Frontend:** React Router v7 (file-based routing, SSR)
- **Backend:** Hono framework on Cloudflare Workers
- **Runtime:** Cloudflare Workers (V8 isolates, not Node.js)
- **Storage:** R2 (object storage), D1 (SQL), KV (key-value)

---

## 🎯 Frontend Best Practices (React Router v7)

### Data Loading Strategy

**Use Loaders Instead of useEffect:**
React Router v7 provides server-side data loading through loaders. This eliminates the need for `useEffect` for data fetching, reduces client-side waterfalls, and improves performance. Loaders run on the server before rendering, providing data immediately.

**Use Actions for Mutations:**
All form submissions and data mutations should use React Router actions. This provides progressive enhancement (forms work without JavaScript), automatic revalidation, and better error handling. Actions handle POST, PUT, DELETE operations.

**URL as Single Source of Truth:**
Store application state in URL search parameters instead of `useState`. This makes state shareable, bookmarkable, and works with browser back/forward. React Router automatically refetches data when URL changes.

### Component Architecture

**Composition Over Complexity:**
Build small, single-purpose components that compose together. Avoid large components with multiple responsibilities. Each component should do one thing well and accept data via props.

**Highly Reusable Components:**
Design components to be generic and reusable across the application. Use TypeScript generics for type-safe reusable components. Avoid hardcoding values or coupling to specific use cases.

**Prop-Driven Design:**
Components should be stateless when possible, receiving all data via props. Internal state should only be used for UI-specific concerns (open/closed, hover states). Business logic stays in loaders/actions.

**Children Prop Pattern:**
Use the children prop for composition. This allows components to be flexible containers that don't need to know about their content. Enables better reusability and separation of concerns.

### State Management

**Server State vs Client State:**
Server state (data from APIs) lives in loaders. Client state (UI state like modals, dropdowns) uses `useState`. Never use `useEffect` to sync server state - let React Router handle it.

**Optimistic UI:**
Use `useFetcher` for non-navigating mutations with optimistic updates. This provides instant feedback while the server processes the request. Automatically reverts on error.

**Form State:**
Use native HTML form elements with React Router's `<Form>` component. This provides progressive enhancement and automatic pending states via `useNavigation`.

### Error Handling

**Route-Level Error Boundaries:**
Every route should export an `ErrorBoundary` component. This catches errors in loaders, actions, and components, providing graceful degradation. Show user-friendly error messages with recovery options.

**Typed Error Responses:**
Throw `Response` objects with proper status codes from loaders/actions. This allows error boundaries to handle different error types appropriately (404, 401, 500, etc.).

### Code Organization

**File Structure:**
- `routes/` - File-based routing (one file per route)
- `components/` - Organized by feature or shared
- `lib/` - Pure utility functions and API clients
- `types/` - TypeScript type definitions

**Naming Conventions:**
- Components: PascalCase (UserProfile.tsx)
- Utilities: camelCase (formatDate.ts)
- Constants: UPPER_SNAKE_CASE
- Types/Interfaces: PascalCase with descriptive names

### Performance

**Code Splitting:**
React Router automatically code-splits by route. Lazy load heavy components using React.lazy(). Keep initial bundle small.

**Prefetching:**
Use `<Link prefetch="intent">` to prefetch data on hover. This makes navigation feel instant.

**Minimize Client-Side JavaScript:**
Leverage server-side rendering. Use progressive enhancement. Forms should work without JavaScript when possible.

### File Size & Complexity

**120 Line Limit:**
No file should exceed 120 lines of code. If a file grows beyond this limit, refactor it by extracting components, utilities, or types into separate files. This keeps files focused, readable, and maintainable. Only exceed this limit when absolutely necessary and the logic cannot be reasonably decomposed.

---

## 🚀 Backend Best Practices (Hono + Cloudflare Workers)

### API Architecture

**Modular Route Organization:**
Split routes into separate files by resource (uploads, auth, users). Each route file exports a Hono instance. Mount routes in main app file. This keeps code organized and testable.

**RESTful Design:**
Follow REST conventions: GET for reads, POST for creates, PUT/PATCH for updates, DELETE for deletes. Use proper HTTP status codes (200, 201, 400, 401, 404, 500).

**Versioned APIs:**
Prefix routes with version (`/api/v1/uploads`). This allows breaking changes without affecting existing clients.

### Business Logic Separation

**Service Layer Pattern:**
Extract business logic into service classes separate from route handlers. Routes handle HTTP concerns (parsing, validation, responses). Services handle business logic (database operations, external APIs, calculations).

**Repository Pattern:**
Create repository classes for database access. This abstracts storage implementation and makes testing easier. Services call repositories, routes call services.

**Single Responsibility:**
Each service/repository should handle one domain concept. Don't create god classes that do everything.

### Validation & Type Safety

**Input Validation with Zod:**
Validate all incoming data using Zod schemas. Use `@hono/zod-validator` middleware. This provides runtime type safety and automatic error responses for invalid data.

**Type-Safe Bindings:**
Define all Cloudflare bindings (R2, D1, KV, env vars) in `worker-configuration.d.ts`. This provides autocomplete and type checking for environment resources.

**Output Validation:**
Consider validating API responses match expected schemas. This catches bugs where database schema changes break API contracts.

### Error Handling

**Custom Error Classes:**
Create custom error classes extending `HTTPException` for different error types (NotFoundError, ValidationError, UnauthorizedError). This makes error handling consistent and testable.

**Global Error Handler:**
Use Hono's `onError` hook to catch all unhandled errors. Log errors for debugging. Return user-friendly error messages. Never expose internal details in production.

**Graceful Degradation:**
Handle external service failures gracefully. Use try-catch around third-party API calls. Provide fallbacks when possible.

### Middleware

**Authentication Middleware:**
Create reusable auth middleware using `createMiddleware`. Verify tokens, set user context, handle unauthorized requests. Apply to protected routes.

**Logging Middleware:**
Use Hono's logger middleware for request/response logging. Essential for debugging in production.

**CORS Middleware:**
Configure CORS properly for frontend access. Use Hono's cors middleware with appropriate origins.

**Rate Limiting:**
Implement rate limiting to prevent abuse. Use Cloudflare's rate limiting features or implement custom logic with KV.

### Cloudflare-Specific Practices

**Understand Platform Limits:**
- CPU time: 50ms (free), 30s (paid)
- Memory: 128MB per request
- Request size: 100MB
- Subrequest limit: 50 (free), 1000 (paid)

**Use Appropriate Storage:**
- **R2:** Large files, object storage (multipart uploads)
- **D1:** Relational data, complex queries
- **KV:** Fast reads, caching, session data
- **Durable Objects:** Coordination, real-time, stateful logic

**Avoid Node.js Patterns:**
Workers run V8, not Node.js. Use Web APIs (fetch, Request, Response). Some Node.js libraries won't work. Check compatibility.

**Edge-First Design:**
Workers run globally at the edge. Keep responses fast. Minimize database queries. Use caching aggressively.

### Testing

**Unit Tests:**
Test services and utilities in isolation. Mock dependencies. Use Vitest for testing.

**Integration Tests:**
Test route handlers with mock bindings. Verify request/response format. Test error cases.

**Type Tests:**
Use TypeScript's type system to catch errors at compile time. Prefer compile-time safety over runtime checks.

### Security

**Input Sanitization:**
Never trust user input. Validate and sanitize all data. Use Zod for validation. Escape output when necessary.

**Authentication:**
Use Cloudflare Access, JWT, or OAuth. Never roll your own crypto. Store secrets in environment variables, not code.

**Authorization:**
Check permissions on every request. Don't rely on client-side checks. Verify user can access requested resource.

**Rate Limiting:**
Protect endpoints from abuse. Implement per-user and per-IP rate limits.

---

## 📦 Shared Packages

### Component Library (`packages/ui`)

**Atomic Design:**
Organize components by complexity: atoms (buttons, inputs), molecules (form groups), organisms (cards, lists).

**Design System:**
Maintain consistent styling, spacing, and behavior. Use CSS variables for theming. Document component usage.

**Accessibility:**
All components must be keyboard accessible. Use semantic HTML. Include ARIA labels where needed. Test with screen readers.

**Zero Dependencies:**
Keep the component library dependency-free when possible. This reduces bundle size and version conflicts.

### Configuration Packages

**TypeScript Config:**
Maintain base configs that apps extend. Enforce strict mode, consistent module resolution, and proper JSX settings.

**ESLint Config:**
Share linting rules across all packages. Enforce consistent code style. Catch common bugs. Use TypeScript-aware rules.

---

## 🔥 Core Principles

### Frontend
1. **Server-first:** Leverage SSR and loaders for data
2. **Progressive enhancement:** Work without JavaScript when possible
3. **URL-driven state:** Use search params over useState
4. **Composition:** Small, reusable components
5. **Type safety:** Leverage Route types from React Router
6. **Accessibility:** Semantic HTML, keyboard navigation, ARIA
7. **Performance:** Code splitting, prefetching, minimal JS

### Backend
1. **Separation of concerns:** Routes → Services → Repositories
2. **Validation everywhere:** Use Zod for all inputs
3. **Type safety:** Define bindings, use TypeScript strictly
4. **Error handling:** Custom errors, global handler
5. **Platform awareness:** Understand Cloudflare limits
6. **Security first:** Validate, authenticate, authorize
7. **Testability:** Write testable, isolated functions

### Monorepo
1. **DRY:** Share configs and components via packages
2. **Atomic commits:** Small, focused changes
3. **Type-safe imports:** Use workspace protocol
4. **Parallel development:** Turborepo handles caching
5. **Consistent tooling:** Same linters, formatters everywhere

---

## 🏛️ MIST Application (Museum of Innovation Science and Technology)

### Project Overview

**Purpose:**
MIST is a tender management platform for the Museum of Innovation Science and Technology. It provides a secure portal for architectural firms and contractors to submit and manage tenders/proposals for institutional projects.

**Authentication:**
Passwordless authentication via magic links sent to institutional email addresses. No passwords required - users receive a secure, time-limited link to access their portal.

**Tech Stack:**
- **Frontend:** React Router 7 with SSR on Cloudflare Pages
- **UI Framework:** Tailwind CSS 4 (CSS-first configuration)
- **Icons:** Material Symbols Outlined
- **Typography:** Inter (sans-serif) + Playfair Display (serif)
- **Component Architecture:** shadcn/ui with class-variance-authority (cva)

### Route Structure

**Route Constants Location:** `/app/constants/routes.ts`

All routes are defined in a centralized constants file which serves as the single source of truth. Import `ROUTES` and `ROUTE_METADATA` from this file for type-safe navigation.

**Current Routes:**

| Route Key | Path | Layout | Auth Required | Description |
|-----------|------|--------|---------------|-------------|
| LOGIN | `/` | auth | No | Passwordless login with magic link |
| ONBOARDING | `/onboarding` | auth | No | New user onboarding flow |
| DASHBOARD | `/dashboard` | dashboard | Yes | Main tender dashboard |
| TENDERS | `/tenders` | dashboard | Yes | Browse and manage tenders |
| PROFILE | `/profile` | dashboard | Yes | User profile management |
| COMPONENTS | `/components` | none | No | Design system showcase |

**Usage Example:**
```typescript
import { ROUTES, ROUTE_METADATA } from "~/constants/routes";

// Type-safe navigation
<Link to={ROUTES.LOGIN}>Login</Link>

// Access metadata
const metadata = ROUTE_METADATA.LOGIN;
// { title: "Login", description: "...", requiresAuth: false, layout: "auth" }
```

### Layout Patterns

**Auth Layout (Two-Column):**
Used for login, onboarding, and other authentication screens.

**Components:**
- `AuthLayout` - Main wrapper with responsive two-column grid
- `AuthBrandPanel` - Left panel (768px) with MIST branding, logo, and features
- `AuthFormWrapper` - Right panel wrapper with icon, heading, and footer

**Structure:**
```
┌─────────────────────────────────────┬──────────────────┐
│                                     │                  │
│  AuthBrandPanel                     │  AuthFormWrapper │
│  (768px, hidden on mobile)          │  (flexible)      │
│                                     │                  │
│  - Logo + "Mist Tender"             │  - Icon (80px)   │
│  - "Museum of" (60px)               │  - Heading       │
│  - "Innovation..." (60px italic)    │  - Subheading    │
│  - Badge                            │  - Form Content  │
│  - Features (3 columns)             │  - Footer        │
│                                     │                  │
└─────────────────────────────────────┴──────────────────┘
```

**Responsive Behavior:**
- **Mobile (<768px):** Single column, brand panel hidden, full-width form
- **Desktop (≥768px):** Two columns, 768px brand panel + flexible content area

**Reusability:**
The auth layout components are designed to be reused across multiple screens. Pass custom props to customize content while maintaining consistent branding.

### Component Library

**Location:** `/app/components/`

**Auth Components:**
- `auth/auth-layout.tsx` - Two-column responsive layout wrapper
- `auth/auth-brand-panel.tsx` - Left panel with customizable branding
- `auth/auth-form-wrapper.tsx` - Right panel form container

**Form Components:**
- `forms/login-form.tsx` - Login form with email validation

**UI Primitives (shadcn/ui):**
- `ui/input.tsx` - Enhanced input with variants (default, borderless) and states
- `ui/button.tsx` - Button with variants (default, primary, outline, ghost)
- `ui/label.tsx` - Form label component
- `ui/separator.tsx` - Horizontal/vertical divider
- `ui/badge.tsx` - Badge component for tags
- `ui/card.tsx` - Card container
- `ui/alert.tsx` - Alert notifications
- Plus: File upload components, timer, etc.

**Component Patterns:**
- All components accept `className` prop for customization
- Use `cn()` utility from `~/lib/utils` to merge class names
- Props are fully typed with TypeScript interfaces
- Components are composable and reusable

### Form Validation

**Validation Utilities Location:** `/app/lib/validation.ts`

**Email Validation:**
- RFC 5322 compliant regex pattern
- Required field check
- Format validation
- Returns `ValidationResult` object with `isValid` and optional `error` message

**Validation Strategy:**
```typescript
// Client-side validation
import { emailValidation } from "~/lib/validation";

const validation = emailValidation.validate(email);
if (!validation.isValid) {
  // Show error: validation.error
}

// Server-side validation (in route action)
export async function action({ request }) {
  const formData = await request.formData();
  const email = formData.get("email");

  const validation = emailValidation.validate(email as string);
  if (!validation.isValid) {
    return { error: validation.error };
  }
  // Proceed with magic link dispatch
}
```

**Form Behavior:**
- Validate on blur (when user leaves field)
- Validate on submit
- Show errors only after field is "touched"
- Clear errors when user starts typing
- Prevent submission if validation fails
- Server-side validation always occurs (client validation is for UX only)

### Design Tokens

**CRITICAL: All colors must use Tailwind utility classes that reference CSS variables defined in `/app/app.css`.**

**DO:**
- ✅ Use `bg-background`, `bg-card`, `bg-primary`
- ✅ Use `text-foreground`, `text-muted-foreground`, `text-primary`
- ✅ Use `border-input`, `border-strong`, `border-subtle`
- ✅ Use `text-destructive`, `bg-destructive` for errors
- ✅ Add new colors to app.css as CSS variables if needed

**DON'T:**
- ❌ Never use hex codes like `#D4AF37` or `#0A0A0A`
- ❌ Never use generic Tailwind colors like `bg-green-300`, `text-blue-500`
- ❌ Never use arbitrary values like `bg-[#121212]`

**Color Palette:**

| CSS Variable | Value | Tailwind Classes | Usage |
|--------------|-------|------------------|-------|
| `--color-background` | #0A0A0A | `bg-background`, `text-background` | Main dark background |
| `--color-card` | #121212 | `bg-card`, `text-card` | Panel backgrounds |
| `--color-primary` | #D4AF37 | `bg-primary`, `text-primary`, `border-primary` | Gold accent, CTAs, focus states |
| `--color-foreground` | #E5E5E5 | `text-foreground` | Primary text color |
| `--color-muted-foreground` | #A3A3A3 | `text-muted-foreground` | Secondary text, descriptions |
| `--color-destructive` | #EF4444 | `bg-destructive`, `text-destructive`, `border-destructive` | Error states |
| `--color-success` | #22C55E | `bg-success`, `text-success` | Success states |
| `--color-border` | rgba(255,255,255,0.05) | `border`, `border-border` | Default borders |
| `--color-input` | rgba(255,255,255,0.2) | `border-input` | Input field borders |
| (custom utility) | rgba(255,255,255,0.1) | `border-strong` | Emphasized borders |
| (custom utility) | rgba(255,255,255,0.05) | `border-subtle` | Subtle borders |

**Typography:**

| Element | Font | Size | Weight | Tracking | Transform |
|---------|------|------|--------|----------|-----------|
| H1 Large | Inter | 60px | Light (300) | -1.5px | None |
| H2 Large | Playfair Display | 60px | Italic | -1.5px | None |
| H1 Small | Inter | 36px | Light (300) | -0.9px | None |
| Subheading | Playfair Display | 18px | Normal | 0 | None |
| Body | Inter | 14px | Normal | 0 | None |
| Button | Inter | 12px | Bold (700) | 2.4px | Uppercase |
| Small | Inter | 10px | Normal | 0.25px | None |
| Label | Inter | 10px | Bold (700) | 2px | Uppercase |

**Font Classes:**
- Sans-serif: Default Inter (use `font-sans` or no class)
- Serif: Playfair Display (use `font-mono`)

**Spacing:**
Component gaps: 8px, 12px, 16px, 24px, 32px, 48px, 64px, 80px

**Border Radius:**
Sharp corners (0px) throughout - this is a core MIST design principle for the institutional/architectural aesthetic.

### Responsive Design

**Breakpoints:**
- **Mobile:** `< 768px` - Single column, reduced padding, smaller typography
- **Tablet:** `768px - 1024px` - Two-column where applicable
- **Desktop:** `> 1024px` - Full design with proper spacing

**Mobile Adaptations:**
- AuthBrandPanel: Hidden with `hidden md:flex`
- Padding: `p-6` on mobile, `md:p-12` on desktop
- Icon containers: Smaller on mobile
- Typography: Scaled down on mobile (28px vs 36px headings)
- Grid layouts: Stack on mobile, side-by-side on desktop

### Accessibility Implementation

**Form Labels:**
- All inputs have associated labels with explicit `htmlFor` linking
- Use `sr-only` class for screen-reader-only labels when visual label is not needed
- ARIA attributes for error states and descriptions

**ARIA Attributes:**
```tsx
<Input
  id="email"
  aria-describedby={error ? "email-error" : undefined}
  aria-invalid={!!error}
  required
/>
{error && (
  <div id="email-error" role="alert">
    {error}
  </div>
)}
```

**Keyboard Navigation:**
- Proper tab order through all interactive elements
- Enter key submits forms
- Focus indicators visible (gold ring via `focus-visible:ring-2 focus-visible:ring-ring`)
- No keyboard traps

**Screen Reader Support:**
- Semantic HTML (`<form>`, `<label>`, `<input>`, `<button>`)
- ARIA labels for icon-only elements
- Live regions (`role="alert"`) for dynamic content
- Descriptive link text (no "click here")

**WCAG Compliance:**
- Color contrast ≥ 4.5:1 for all text
- Error identification not by color alone (includes icons and text)
- All functionality available via keyboard
- Responsive text sizing

### TypeScript Types

**Location:** `/app/types/auth.ts`

**Auth Types:**
```typescript
export interface LoginFormState {
  email: string;
  isSubmitting: boolean;
  error: string | null;
  touched: boolean;
}

export interface LoginActionData {
  success?: boolean;
  error?: string;
  email?: string;
}
```

**Type Safety Patterns:**
- Define interfaces for all form states
- Use React Router's generated types (`Route.ActionArgs`, `Route.ComponentProps`)
- Type all API responses
- Leverage runtime validation with Zod when needed

### Authentication Flow

**Login Process:**
1. User enters institutional email address
2. Client-side validation on blur and submit
3. Form submitted via React Router `<Form>` component
4. Server-side validation in route action
5. Magic link generated and sent to email (TODO: implement)
6. User clicks link in email
7. User authenticated and redirected to dashboard

**Security Considerations:**
- Client-side validation is for UX only (not security)
- Server always validates input
- Magic links expire after 15 minutes
- Rate limiting on magic link endpoint (backend - TODO)
- Email sanitization before sending
- React Router handles CSRF protection

**Future Enhancements:**
- Session management via cookies/localStorage
- OAuth providers (Google, Microsoft)
- Biometric authentication (WebAuthn)
- Multi-factor authentication

### Testing Checklist

**Visual States:**
- [ ] Input states: default, hover, focus, disabled, error
- [ ] Button states: default, hover, active, disabled, loading
- [ ] Layout: desktop two-column, mobile single-column
- [ ] Typography: correct sizes, weights, line heights
- [ ] Colors: using Tailwind classes from app.css only
- [ ] Spacing: consistent gaps and padding

**Functionality:**
- [ ] Email validation: empty, invalid format, valid format
- [ ] Form submission: valid email succeeds, invalid fails
- [ ] Error handling: displays errors, clears on typing
- [ ] Success state: shows dispatched message with email
- [ ] Loading state: button disabled, shows "Dispatching..."
- [ ] Keyboard navigation: tab order, enter to submit

**Accessibility:**
- [ ] Tab through all interactive elements
- [ ] Focus indicators visible
- [ ] Screen reader announces errors
- [ ] ARIA attributes present
- [ ] Color contrast meets WCAG AA

**Browser Compatibility:**
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers (iOS Safari, Chrome Android)

### Future Development

**Upcoming Routes:**
- `/onboarding` - User onboarding flow (reuses AuthLayout)
- `/dashboard` - Main tender dashboard
- `/tenders` - Browse and manage tenders
- `/profile` - User profile management

**Planned Features:**
- Dashboard layout pattern
- Tender submission workflow
- Document upload with multipart support
- Real-time notifications
- Admin panel

**Component Extensions:**
- Dashboard sidebar navigation
- Tender card components
- File upload with progress
- Status badges and tags
- Data tables

---

## 🛠️ Development Commands

```bash
pnpm install                              # Install all dependencies
pnpm dev                                  # Run all apps in development
pnpm build                                # Build all apps
pnpm lint                                 # Lint all packages
pnpm check-types                          # Type check all packages
cd apps/backend && npx wrangler deploy    # Deploy backend to Cloudflare
cd apps/web && npx wrangler pages deploy  # Deploy frontend to Cloudflare Pages
```

---

## 📚 References & Documentation

### React Router v7
- **Official Docs:** https://reactrouter.com/dev
- **Data Loading:** https://reactrouter.com/dev/guides/data-loading
- **Actions:** https://reactrouter.com/dev/guides/actions
- **Error Handling:** https://reactrouter.com/dev/guides/error-handling

### Hono Framework
- **Official Docs:** https://hono.dev
- **Middleware:** https://hono.dev/docs/guides/middleware
- **Validation:** https://hono.dev/docs/guides/validation
- **Testing:** https://hono.dev/docs/guides/testing

### Cloudflare Platform
- **Workers Docs:** https://developers.cloudflare.com/workers/
- **R2 Storage:** https://developers.cloudflare.com/r2/
- **D1 Database:** https://developers.cloudflare.com/d1/
- **KV Storage:** https://developers.cloudflare.com/kv/
- **Platform Limits:** https://developers.cloudflare.com/workers/platform/limits/
- **Node.js Compatibility:** https://developers.cloudflare.com/workers/runtime-apis/nodejs/

### Turborepo
- **Official Docs:** https://turbo.build/repo/docs
- **Configuration:** https://turbo.build/repo/docs/reference/configuration
- **Caching:** https://turbo.build/repo/docs/core-concepts/caching

### Validation & Types
- **Zod:** https://zod.dev
- **TypeScript:** https://www.typescriptlang.org/docs/

### Testing
- **Vitest:** https://vitest.dev
- **Testing Library:** https://testing-library.com

---

## 🎓 Additional Best Practices

### Git Workflow
- Use conventional commits (feat:, fix:, docs:, refactor:)
- Keep commits atomic and focused
- Write descriptive commit messages
- Use feature branches for development

### Code Review
- Review for logic correctness, not style (use linters)
- Check for security issues
- Verify tests are included
- Ensure types are properly defined

### Documentation
- Document complex business logic
- Keep README files updated
- Document environment variables
- Maintain API documentation

### Monitoring & Observability
- Use Cloudflare Analytics for traffic insights
- Log errors with context for debugging
- Monitor performance metrics
- Set up alerts for critical failures
