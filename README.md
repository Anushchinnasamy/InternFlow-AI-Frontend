# Intern Flow — Frontend

Client for the [Intern Flow backend](../InternFlow-AI) — the internship lifecycle app covering referral through closure and certificate, with server-side RBAC, an NDA hard gate, and AI-assisted resume parsing/evaluation/chatbot. This app is a separate client of that API, not a monolith with it (see the backend's `CLAUDE.md` for why).

React + TypeScript + Vite, Tailwind + shadcn/ui, TanStack Query, react-router-dom, react-hook-form + Zod.

## Local setup

```bash
npm install
cp .env.example .env   # points at the backend, defaults to http://localhost:4000
npm run dev
```

Requires the backend running and seeded (`npm run prisma:seed` in the backend repo) — login with any of the 9 seeded role accounts, password `Password123!` (see the backend's `prisma/seed.ts` for the exact emails).

### Environment variables

| Variable | Required | Notes |
|---|---|---|
| `VITE_API_BASE_URL` | yes | Backend base URL, no trailing slash (e.g. `http://localhost:4000`) |

## RBAC — one source of truth

`src/config/navigation.ts`'s `NAV_ITEMS` array is the single source of truth for the sidebar, the router, and route guarding (`ProtectedRoute` reads `allowedRoles` straight from here). It's meant to mirror the backend's actual permission matrix (`src/middleware/rbac.ts` in the backend repo) — the backend is what's authoritative per its CLAUDE.md rule 2; this file only controls what the UI *offers* to click. If a nav-level role list drifts from what an endpoint really allows, the backend still enforces its own rule correctly, but the UI will either hide something a role could otherwise reach, or show a page that 403s server-side (caught by the query hooks below) — both are correctness bugs worth fixing on sight, not "acceptable frontend/backend skew."

## Which day built what

| Day | What it built |
|---|---|
| F1 | Shell, auth (login/register), RBAC-filtered nav/router/route-guard, 19 placeholder routes, react-query/api-client/authStorage plumbing |
| F2 | Dashboard, Insights, SLA Monitoring, Notifications, AI Copilot |
| F3 | Referral Intake, AI Resume Analyzer, Candidates, Candidate Evaluation |
| F4 | Onboarding, NDA Management, Non-Worker ID, Access Provisioning |
| F5 | Intern Lifecycle, Closure, Certificates, Workflow Tracking (drag-and-drop Kanban), Admin, Settings — closes out the full 19-page build |

## Handling a 403 vs. a real failure

`src/lib/dashboardApi.ts` exports `isForbidden()`/`queryProblem()` — a 403 from a query means "this widget/tab isn't visible to your role," not "something broke." Any page with a role-gated sub-resource (e.g. Admin's Users tab is SYSADMIN-only even though LEGAL can open the Admin page for Audit Logs) should distinguish the two rather than showing a generic error or, worse, a misleading empty/zero state — see `AdminPage.tsx` and `InternLifecyclePage.tsx` for the pattern.

## Tests

```bash
npm test
```

Runs `vitest` against `src/**/*.spec.ts` — currently pure-function unit tests only (`src/lib/internshipProgress.spec.ts`), no component-rendering infra (jsdom/Testing Library) set up yet. Business logic worth pulling out of a page component and testing in isolation, the way `internshipProgress.ts` and the backend's `exitChecklist.ts` were, is the intended pattern going forward.

## Build

```bash
npm run build
```

Type-checks (`tsc -b`) then builds with Vite. `npm run lint` runs Oxlint.
