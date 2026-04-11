# North Bridge Digital -- Fix Plan

> Comprehensive remediation plan covering all 15 issues identified in the production audit.
> Last updated: 2026-04-11

---

## Priority Order (Top to Bottom)

| # | Issue | Severity | Status | Owner |
|---|-------|----------|--------|-------|
| 1 | 3-minute cold-start on deploy | Critical | Fixed | DevOps |
| 2 | Missing robots.txt | High | Fixed | SEO / DevOps |
| 3 | Missing sitemap.xml | High | Fixed | SEO / DevOps |
| 4 | No Dockerfile for dashboard | High | Fixed | DevOps |
| 5 | Supabase RLS policies incomplete | Critical | Planned | Backend |
| 6 | No rate limiting on API routes | Critical | Planned | Backend |
| 7 | Missing error boundaries in React tree | High | Planned | Frontend |
| 8 | No health-check endpoint | High | Planned | Backend |
| 9 | Environment variable validation missing | High | Planned | DevOps |
| 10 | No automated database backups | High | Planned | DevOps |
| 11 | Missing loading/skeleton states | Medium | Planned | Frontend |
| 12 | No logging or observability pipeline | Medium | Planned | DevOps |
| 13 | SEO meta tags incomplete | Medium | Planned | Frontend / SEO |
| 14 | No CI/CD pipeline | Medium | Planned | DevOps |
| 15 | Accessibility (a11y) audit needed | Low | Planned | Frontend |

---

## Detailed Breakdown

### 1. 3-Minute Cold-Start on Deploy

- **Severity:** Critical
- **Status:** Fixed
- **Owner:** DevOps
- **Description:** Every VPS restart clones the repo, runs pnpm install, and runs next build from scratch, causing a 3-minute downtime window on each deploy or reboot.
- **Steps to fix:**
  1. Create a multi-stage Dockerfile that pre-builds the Next.js app into a production image.
  2. Push the image to a container registry (Docker Hub or GitHub Container Registry).
  3. Update the VPS deploy script to pull and run the pre-built image instead of building on the server.
  4. Add a health check so the load balancer only routes traffic once the container is ready.
- **Resolution:** Dockerfile created at `apps/web/Dockerfile`.

---

### 2. Missing robots.txt

- **Severity:** High
- **Status:** Fixed
- **Owner:** SEO / DevOps
- **Description:** No robots.txt served at the root, so search engine crawlers have no guidance on what to index. Authenticated dashboard routes were being indexed.
- **Steps to fix:**
  1. Create `apps/web/public/robots.txt` with Allow for public pages and Disallow for all authenticated dashboard routes.
  2. Point to the sitemap URL.
  3. Deploy and verify via `curl https://thenorthbridgemi.com/robots.txt`.
- **Resolution:** robots.txt created with disallow rules for /api/, /overview, /leads, /proposals, /agents, /seo, /campaigns, /approvals, /billing, /companies.

---

### 3. Missing sitemap.xml

- **Severity:** High
- **Status:** Fixed
- **Owner:** SEO / DevOps
- **Description:** No sitemap.xml for search engines to discover the public-facing pages.
- **Steps to fix:**
  1. Create `apps/web/public/sitemap.xml` with entries for /, /login, and /signup.
  2. Set appropriate priority and changefreq values.
  3. Submit sitemap URL to Google Search Console.
- **Resolution:** sitemap.xml created with 3 URLs and correct priorities.

---

### 4. No Dockerfile for Dashboard

- **Severity:** High
- **Status:** Fixed
- **Owner:** DevOps
- **Description:** No containerization for the Next.js dashboard, forcing bare-metal builds on every deploy.
- **Steps to fix:**
  1. Create a multi-stage Dockerfile (build stage + production stage).
  2. Use node:22-slim as base for minimal image size.
  3. Pass NEXT_PUBLIC_* env vars as build args.
  4. Test locally with `docker build` and `docker run`.
- **Resolution:** Dockerfile created at `apps/web/Dockerfile`.

---

### 5. Supabase RLS Policies Incomplete

- **Severity:** Critical
- **Status:** Planned
- **Owner:** Backend
- **Description:** Several tables are missing Row Level Security policies, meaning any authenticated user can read or modify any row regardless of ownership.
- **Steps to fix:**
  1. Audit every table in the public schema for RLS status.
  2. Enable RLS on all tables that store user/company data.
  3. Write SELECT/INSERT/UPDATE/DELETE policies scoped to `auth.uid()` or company membership.
  4. Test with multiple user accounts to confirm isolation.
  5. Add a CI check that fails if any new table lacks RLS.

---

### 6. No Rate Limiting on API Routes

- **Severity:** Critical
- **Status:** Planned
- **Owner:** Backend
- **Description:** API routes under /api/ have no rate limiting, exposing the app to brute-force and abuse attacks.
- **Steps to fix:**
  1. Add an upstash/ratelimit or similar middleware to Next.js API routes.
  2. Set sensible limits (e.g., 60 requests/minute per IP for general routes, 5/minute for auth endpoints).
  3. Return 429 status with Retry-After header when limits are exceeded.
  4. Add rate limit headers to all API responses.

---

### 7. Missing Error Boundaries in React Tree

- **Severity:** High
- **Status:** Planned
- **Owner:** Frontend
- **Description:** No React error boundaries, so a single component crash takes down the entire page with a white screen.
- **Steps to fix:**
  1. Create a reusable `ErrorBoundary` component with a user-friendly fallback UI.
  2. Wrap the main dashboard layout with an error boundary.
  3. Add granular error boundaries around each major feature section (leads, proposals, etc.).
  4. Add error reporting to capture boundary hits (e.g., Sentry or a Supabase edge function).

---

### 8. No Health-Check Endpoint

- **Severity:** High
- **Status:** Planned
- **Owner:** Backend
- **Description:** No /api/health endpoint for the load balancer or monitoring to verify the app is alive and database-connected.
- **Steps to fix:**
  1. Create `/api/health/route.ts` that checks Next.js is responding.
  2. Add a Supabase connection check (simple query like `SELECT 1`).
  3. Return 200 with JSON status when healthy, 503 when degraded.
  4. Wire up the Docker HEALTHCHECK to hit this endpoint.
  5. Add uptime monitoring (e.g., UptimeRobot or Checkly).

---

### 9. Environment Variable Validation Missing

- **Severity:** High
- **Status:** Planned
- **Owner:** DevOps
- **Description:** No build-time or runtime validation of required environment variables. Missing vars cause cryptic runtime errors.
- **Steps to fix:**
  1. Add a `env.ts` schema using zod or t3-env to validate all required env vars at startup.
  2. Fail fast with a clear error message listing which vars are missing.
  3. Document all required env vars in `docs/env-reference.md` (already exists, may need updating).
  4. Add `.env.example` with placeholder values.

---

### 10. No Automated Database Backups

- **Severity:** High
- **Status:** Planned
- **Owner:** DevOps
- **Description:** No automated backup schedule for the Supabase/Postgres database. A data loss event would be unrecoverable.
- **Steps to fix:**
  1. If using Supabase hosted: verify the project plan includes daily backups, enable point-in-time recovery if on Pro plan.
  2. If self-hosted: set up pg_dump cron job writing to an S3 bucket or equivalent.
  3. Test restore procedure from a backup at least once.
  4. Document the backup and restore runbook in `docs/runbooks/`.

---

### 11. Missing Loading/Skeleton States

- **Severity:** Medium
- **Status:** Planned
- **Owner:** Frontend
- **Description:** Data-fetching pages show a blank screen or spinner instead of skeleton placeholders, leading to a perceived slow experience.
- **Steps to fix:**
  1. Create reusable Skeleton components matching each data table/card layout.
  2. Use Next.js `loading.tsx` files in each route segment.
  3. Add Suspense boundaries around async server components.
  4. Test on throttled connections to verify the loading experience.

---

### 12. No Logging or Observability Pipeline

- **Severity:** Medium
- **Status:** Planned
- **Owner:** DevOps
- **Description:** No structured logging, no error tracking, no performance monitoring. Issues are only discovered when users report them.
- **Steps to fix:**
  1. Add structured JSON logging (e.g., pino) to API routes and server actions.
  2. Set up an error tracking service (Sentry free tier or Supabase edge function logger).
  3. Add basic performance metrics (response times, error rates).
  4. Create a simple dashboard or alerts for critical errors.

---

### 13. SEO Meta Tags Incomplete

- **Severity:** Medium
- **Status:** Planned
- **Owner:** Frontend / SEO
- **Description:** Public pages (landing, login, signup) are missing Open Graph tags, Twitter cards, canonical URLs, and structured data.
- **Steps to fix:**
  1. Add a shared metadata config in the root layout using Next.js Metadata API.
  2. Set og:title, og:description, og:image, twitter:card for all public pages.
  3. Add canonical URLs to prevent duplicate content issues.
  4. Add JSON-LD structured data for the organization.
  5. Test with Facebook Sharing Debugger and Twitter Card Validator.

---

### 14. No CI/CD Pipeline

- **Severity:** Medium
- **Status:** Planned
- **Owner:** DevOps
- **Description:** No automated testing, linting, or deployment pipeline. All deployments are manual.
- **Steps to fix:**
  1. Create a GitHub Actions workflow for PR checks: lint, typecheck, build.
  2. Add a deploy workflow that builds the Docker image and pushes to the VPS on merge to main.
  3. Add branch protection rules requiring CI to pass before merge.
  4. Add automated Lighthouse CI checks for performance regression.

---

### 15. Accessibility (a11y) Audit Needed

- **Severity:** Low
- **Status:** Planned
- **Owner:** Frontend
- **Description:** No accessibility audit has been performed. Dashboard likely has contrast, focus, and ARIA issues.
- **Steps to fix:**
  1. Run axe-core or Lighthouse accessibility audit on all pages.
  2. Fix critical issues: missing alt text, insufficient contrast, missing form labels.
  3. Ensure keyboard navigation works for all interactive elements.
  4. Add aria-labels to icon-only buttons.
  5. Test with a screen reader (VoiceOver on macOS).

---

## Timeline

| Phase | Issues | Target |
|-------|--------|--------|
| Phase 1 (Immediate) | #1, #2, #3, #4 | Done |
| Phase 2 (This week) | #5, #6, #8 | Security + health check |
| Phase 3 (Next week) | #7, #9, #10 | Stability + env safety |
| Phase 4 (Week 3) | #11, #12, #13 | UX + observability |
| Phase 5 (Week 4) | #14, #15 | CI/CD + accessibility |
