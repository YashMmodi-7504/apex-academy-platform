# APEX ACADEMY LMS — FORENSIC TECHNICAL AUDIT

**Scope:** `d:\Projects\logicrest_stp\apex-academy-lms` (complete repository)
**Date:** 2026-09-07
**Method:** Static inspection. Every source file, all 9 migrations, seed data, build output and configuration were read. Important findings were traced across at least two layers before being recorded.
**Constraint:** No application code, migration, configuration or database record was modified. `AUDIT_REPORT.md` is the only file created.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Technology Stack](#3-technology-stack)
4. [Repository Structure](#4-repository-structure)
5. [Feature Inventory](#5-feature-inventory)
6. [Frontend Audit](#6-frontend-audit)
7. [Backend Audit](#7-backend-audit)
8. [API Inventory](#8-api-inventory)
9. [Database Architecture](#9-database-architecture)
10. [RLS & Supabase Security Audit](#10-rls--supabase-security-audit)
11. [Authentication & Authorization](#11-authentication--authorization)
12. [Learning Engine](#12-learning-engine)
13. [Assessment Engine](#13-assessment-engine)
14. [Certificate System](#14-certificate-system)
15. [Content, Materials & Storage](#15-content-materials--storage)
16. [AI System](#16-ai-system)
17. [Data Flow — Critical User Journeys](#17-data-flow--critical-user-journeys)
18. [Frontend ↔ Backend Contract Issues](#18-frontend--backend-contract-issues)
19. [Database Integrity Issues](#19-database-integrity-issues)
20. [Performance & Scalability](#20-performance--scalability)
21. [Code Quality & Technical Debt](#21-code-quality--technical-debt)
22. [Testing & QA Assessment](#22-testing--qa-assessment)
23. [Security Threat Model](#23-security-threat-model)
24. [Findings Register](#24-findings-register)
25. [Risk Heatmap](#25-risk-heatmap)
26. [What Is Actually Working](#26-what-is-actually-working)
27. [What Is Incomplete](#27-what-is-incomplete)
28. [Dead, Duplicate & Legacy Code](#28-dead-duplicate--legacy-code)
29. [Production Readiness](#29-production-readiness)
30. [Recommended Engineering Roadmap](#30-recommended-engineering-roadmap)
31. [Baseline for Future Work](#31-baseline-for-future-work)

---

## 1. Executive Summary

Apex Academy is a career-track EdTech platform: a public marketing catalogue, a student learning portal with lessons, quizzes and certificates, and an admin console for curriculum management and PDF-based content ingestion. It runs as a **single Express process** that serves both the React SPA (Vite middleware in dev, static `dist/` in production) and a `/api` surface of 61 routes. Persistence, authentication and file storage are all Supabase.

The system is best characterised as **a well-shaped skeleton carrying a large amount of demo scaffolding that was never removed, wrapped in a security model that was designed but never closed**. The route taxonomy, the controller/service split and the *intent* behind the RLS policies show genuine architectural thinking. Three structural problems undercut it:

1. The browser holds a Supabase anon key that can write directly to the two tables the completion engine treats as authoritative.
2. Four code paths query columns that exist in no migration — two fail as HTTP 500s, two fail silently and degrade features.
3. A significant share of user-facing surface is hardcoded mock data presented as live.

### Headline risk

> A registered student can award themselves a verifiable certificate for a course they never enrolled in, by writing `lesson_progress` and `assessment_attempts` rows directly through PostgREST using the public anon key. The completion engine reads exactly those two tables and treats them as the source of truth. For a course with no quizzes, no writes are needed at all — completion evaluates to `true` immediately.

### Strengths

- **Server-side grading is genuine.** Module and final assessment answers are graded on the server; `is_correct` is explicitly excluded from student-facing option queries (`src/backend/services/moduleAssessment.service.ts:93-98`). The intent was correct.
- **Clean route taxonomy.** `api.routes.ts` is a single readable manifest with consistent `requireAuth` / `requireAdmin` placement.
- **A real publish guard.** `toggleCoursePublish` blocks publishing courses with empty modules or contentless lessons and returns structured blockers.
- **Best-in-repo input validation** on the counselor lead form (`src/backend/controllers/counselor.controller.ts`) — a good template for the rest of the codebase.
- **Direct-to-storage uploads** via short-lived signed URLs — the correct pattern, avoiding proxying large files through Node.
- **The service-role key does not reach the browser.** Verified against the committed `dist/assets/index-C5_WJdlh.js`: zero occurrences.
- **Role escalation is genuinely blocked.** The `profiles` UPDATE policy compares the new role against the pre-update snapshot; a student cannot self-promote to ADMIN via PostgREST.

### Weaknesses

- **RLS permits self-service progress and attempt writes.** Policies check row *ownership* but never row *content*; `passed = true` is a client-writable field.
- **Enrollment is decorative.** The endpoint the UI actually uses (`/api/learn/*`) never requires an enrollment. The endpoint that does (`/api/lessons/:id/content-access`) is called by nothing.
- **Silent schema drift.** `profiles.email`, `courses.status`, `assessments.type` and `lesson_resources.url` are all queried and none exist.
- **The content pipeline produces HTML the student viewer escapes.** Ingestion writes HTML into `lessons.content`; `LessonRenderer` renders it as plain text, so students see literal `<h2>` tags.
- **Mock data in production paths.** `/programs/:slug`, the admin Programs/Students/Dashboard pages, `/student/assessment/:id` and the institutions partnership form are all fabricated client-side.
- **Zero tests, zero version control.** No test file of any kind exists, and the working tree is not a git repository.

### Scores

| Dimension | Score | Rationale |
|---|---|---|
| Architecture | **5 / 10** | Sound layering intent, applied unevenly; two uncoordinated data channels to the browser |
| Security | **2 / 10** | Certificate forgery, PII enumeration, world-readable curriculum, leaked service-role key |
| Database | **4 / 10** | Reasonable relational model; missing constraints, a destructive migration, non-replayable migrations |
| Backend | **4 / 10** | Consistent shape; missing authorization gates, no transactions, no validation layer |
| Frontend | **5 / 10** | Coherent and complete-looking; broken contracts and substantial mock surface |
| Testing | **0 / 10** | No tests, no CI, no coverage, no runner |
| Maintainability | **4 / 10** | Oversized files, duplicated logic, two conflicting type systems, no version control |
| Production Readiness | **1 / 10** | Blocking security and correctness defects in the core value proposition |

**Verdict:** Not deployable to real students in its current state. The blocking issues are concentrated and fixable — roughly a two-to-three-week Phase 0 — but they are load-bearing: certificate integrity, content gating and credential hygiene all fail today.

---

## 2. Architecture Overview

One Node process does everything. `server.ts` mounts `express.json()`, a request logger, the `/api` router, a 404 handler and the global error handler, then either attaches Vite middleware (dev) or serves `dist/` with an SPA catch-all (production). There is no separate API service, no worker, no queue, no cache.

Critically, the browser talks to **two backends**: the Express API, and Supabase PostgREST/GoTrue directly via the anon key in `src/lib/supabaseClient.ts`. Authentication and profile reads go straight to Supabase; everything else goes through Express. That second channel is the one the security model forgot about.

```text
                          BROWSER (React 19 + Vite 6 SPA)
  +----------------------------------------------------------------------+
  |  AuthProvider - supabase-js (ANON KEY)                                |
  |  AppRoutes -- RequireAuth / RequireAdmin   (client-side only)         |
  |    |- public/   Home Programs Courses Domains Institutions Search     |
  |    |            SuccessStories Resources Enterprise VerifyCertificate |
  |    |- auth/     Login Register ForgotPassword                         |
  |    |- student/  Dashboard MyLearning LearningInterface Certificates   |
  |    +- admin/    Curriculum CourseEditor Materials BulkImport ...      |
  |  services/api.ts -- fetch /api/* + Bearer <supabase access_token>     |
  +-----------+--------------------------------------+-------------------+
              | /api/*                               | PostgREST + GoTrue
              |                                      | (DIRECT - anon key)
              v                                      |
  +--------------------------------------------+     |
  |  EXPRESS (server.ts, single process)       |     |
  |   express.json() -> logger -> /api         |     |
  |   +--------------------------------------+ |     |
  |   | middleware/auth.middleware.ts        | |     |
  |   |   optionalAuth | requireAuth |       | |     |
  |   |   requireAdmin (profiles.role)       | |     |
  |   +--------------------------------------+ |     |
  |   | controllers/  health courses         | |     |
  |   |   enrollments learning certificates  | |     |
  |   |   curriculum content materials       | |     |
  |   |   admin public counselor             | |     |
  |   +--------------------------------------+ |     |
  |   | services/  courseCompletion          | |     |
  |   |   moduleAssessment finalAssessment   | |     |
  |   |   certificate  checkpoint (IN-MEM)   | |     |
  |   |   ai (Gemini 2.5 Flash)              | |     |
  |   +--------------------------------------+ |     |
  |   | database/ supabaseAdmin SERVICE ROLE | |     |
  |   |            - bypasses ALL RLS        | |     |
  |   |           connection.ts (pg Pool,    | |     |
  |   |            unused: no DATABASE_URL)  | |     |
  |   +--------------------------------------+ |     |
  |   middleware/error.middleware.ts           |     |
  +-----------+--------------------------------+     |
              | service_role                         | anon + user JWT
              v                                      v
  +----------------------------------------------------------------------+
  |  SUPABASE PROJECT                                                     |
  |   auth.users --trigger handle_new_user()--> public.profiles           |
  |   PostgreSQL: 27 tables + 2 views, RLS on all public tables           |
  |   Storage: course-materials . lesson-resources . certificates(unused) |
  |            avatars . 7 legacy public buckets from migration 00002     |
  +----------------------------------------------------------------------+
              |
              v  outbound only
        Google Gemini API (generateContent, gemini-2.5-flash)
```

### Architectural observations

- **Layer boundaries are inconsistent.** `admin.controller.ts` and `public.controller.ts` query Supabase directly with no service layer. `learning.controller.ts` properly delegates to services. `materials.controller.ts` (1,061 lines) embeds PDF parsing, HTML conversion, AI orchestration, bulk-import loops and content templating with no service extraction at all.
- **Every backend database call uses the service-role client**, which bypasses RLS. RLS therefore provides *zero* defence-in-depth for API traffic; it governs only the browser's direct PostgREST channel. Every authorization decision on the API path must be made in TypeScript, and several are missing.
- **Neither layer backstops the other.** The API relies entirely on TypeScript checks because the service role bypasses RLS; the browser relies entirely on RLS because it bypasses the API. A single omission in either is a full breach.
- **AI architecture** is a single 86-line service with one function, called from one admin-only controller. The key is server-side only.
- **Storage architecture** is correct in shape: private buckets with no RLS policies, reachable only through server-minted signed URLs.

---

## 3. Technology Stack

Verified from `package.json`, `vite.config.ts`, `tsconfig.json` and the import graph. Nothing below is inferred.

| Layer | Technology | Version | Notes |
|---|---|---|---|
| UI framework | React | ^19.0.1 | StrictMode; no state library, no data-fetching library |
| Routing | react-router-dom | ^7.18.2 | BrowserRouter, 40 routes, no lazy loading |
| Build | Vite | ^6.2.3 | Listed in both `dependencies` and `devDependencies` |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) | ^4.1.14 | Plus a 203-line CSS token layer in `src/index.css` |
| Icons | lucide-react | ^0.546.0 | Used throughout |
| Animation | motion | ^12.23.24 | **Imported nowhere — unused dependency** |
| Server | Express | ^4.21.2 | No helmet, no cors, no rate limiter, no body-size cap |
| Dev runtime | tsx | ^4.21.0 | `npm run dev` = `tsx server.ts` |
| Prod bundle | esbuild | ^0.25.0 | `dist/server.cjs`, `--packages=external` |
| DB / auth / storage | @supabase/supabase-js | ^2.112.0 | Two clients: anon (browser), service_role (server) |
| Direct SQL | pg | ^8.22.0 | Pool configured but no `DATABASE_URL`; used only by the health check |
| AI | @google/genai | ^2.4.0 | `gemini-2.5-flash`, structured JSON output |
| PDF | pdf-parse | ^2.4.5 | `PDFParse` class API, parsing inside the request |
| Language | TypeScript | ~5.8.2 | `noEmit`; **no `strict`, no `noImplicitAny`** |

### Build & tooling gaps

- **Two lockfiles** — `package-lock.json` (169 KB) and `bun.lock` (79 KB). No declared package manager, no `engines` field; installs are non-deterministic across contributors.
- **`node_modules/` is absent**, so `npm run lint` (`tsc --noEmit`) and `npm run build` could not be executed. Type-check and build status: **requires runtime verification**.
- `tsconfig.json` omits `strict`. The `@/*` path alias maps to the repo root but every import uses explicit relative `.ts`/`.tsx` extensions instead — the alias is effectively unused.
- `vite.config.ts` carries an AI Studio-specific `DISABLE_HMR` branch with a comment instructing not to modify it — platform coupling that will not make sense to a future maintainer.
- **`dist/` inspection:** contains a build dated 2026-09-07 — `index.html`, a single 952 KB JS chunk (`index-C5_WJdlh.js`, no code splitting), a 105 KB CSS file, `server.cjs` (230 KB) and `server.cjs.map` (427 KB). It is **generated output, correctly gitignored**, and not committed source. It is not stale relative to source. However it **embeds the hardcoded service-role key** (verified: 1 occurrence in `server.cjs`, 0 in the browser chunk), so the build artifact is itself a credential-bearing file.
- **The working tree is not a git repository.** No `.git` directory exists: no history, no branching, no rollback, no blame, no review path.

---

## 4. Repository Structure

| Path | Responsibility | Assessment |
|---|---|---|
| `server.ts` | Express bootstrap, Vite middleware, static serving | Clean, 71 lines |
| `src/backend/routes/` | Single route manifest (255 lines) | Readable; one duplicate route pair |
| `src/backend/middleware/` | auth (137 ln), error (39 ln) | Correct token verification; error handler leaks stacks outside production |
| `src/backend/controllers/` | 11 controllers, 4,100+ lines | `materials` (1,061) and `curriculum` (955) are oversized |
| `src/backend/services/` | 5 services, 2,100+ lines | ~1,050 of those lines are hardcoded question banks |
| `src/backend/database/` | Supabase admin client, pg pool, 2 seed scripts | Seed scripts (636 ln) are orphaned — never imported |
| `src/backend/config/` | `env.ts` | Three of seven exported values are never read |
| `src/pages/` | 18 public, 3 auth, 6 student, 12 admin | Several are static mockups (§28) |
| `src/components/` | admin(1) common(6) layout(6) learning(7) student(1) | Thin layer; most logic lives in pages |
| `src/context/` | `AuthContext.tsx` (299 ln) | Only context in the app |
| `src/services/api.ts` | Single 1,080-line fetch client | ~60 near-identical wrappers, 70 `any` |
| `src/lib/supabaseClient.ts` | Browser Supabase client + token scraping | Hardcoded URL/anon-key fallbacks |
| `src/types/` | `index.ts` (legacy) + `database.types.ts` (hand-written) | Two conflicting type systems; both stale |
| `src/utils/` | `resourceType.ts` (109 ln) | Only utility module |
| `src/data/` | `domainsData.ts`, `programsData.ts` | Static content that shadows real DB tables |
| `src/assets/images/` | 2 JPEGs | Committed binaries (~6 MB combined lines) |
| `supabase/migrations/` | 9 forward-only SQL files | Not all replayable; 00004 is destructive |
| `supabase/seed/` | `00001_seed_data.sql` (618 ln) | Obsolete — its catalogue is deleted by 00004 |
| root `*.ts` / `*.cjs` | checkTables, fix_constraint, query_db, script, seed, createBuckets | Ad-hoc debug scripts committed to the repo root |
| `scratch/` | — | Empty directory |
| `assets/.aistudio/` | `.gitignore` only | Platform residue |
| `dist/` | Build output | Generated, gitignored, contains the service-role key |
---

## 5. Feature Inventory

Status reflects what the code actually does, not what it is named. **Mock** means the surface renders hardcoded client-side data with no backend involvement.

| Feature | Frontend | Backend | Database | Auth | Status | Risk |
|---|---|---|---|---|---|---|
| Registration / login / password reset | Yes | Supabase direct | `auth.users`, `profiles` | GoTrue | Working | Low |
| Profile view / edit | Yes | Supabase direct | `profiles` | RLS | Working | Low |
| Course catalogue & filters | Yes | `getCourses` | `courses`, `categories` | Public | Working | Medium |
| Course detail + curriculum | Yes | `getCourseBySlug` | courses/modules/lessons | Optional | Working | Low |
| Enrollment | Yes | `enrollInCourse` | `enrollments` | Required | Partial | **High** |
| My Learning dashboard | Yes | `getMyEnrollments` | `enrollments` | Required | Working | Low |
| Student dashboard | Yes | Partial | — | Required | Partial | Low |
| Learning player | Yes | `getCourseLearningOverview`, `getLessonContent` | modules/lessons/progress | Required | Partial | **Critical** |
| Lesson HTML rendering | Yes | n/a | `lessons.content` | — | **Broken** | **High** |
| Lesson progress / complete | Yes | `updateLessonProgress`, `completeLesson` | `lesson_progress` | Required | Partial | **Critical** |
| Knowledge checkpoints | Yes | In-memory service | Tables exist, unused | Required | Partial | Medium |
| Module assessments | Yes | `moduleAssessment.service` | assessments/questions/options | Required | Partial | **Critical** |
| Final assessment | Yes | `finalAssessment.service` | No rows ever created | Required | **Broken** | **High** |
| Course completion engine | Reads it | `courseCompletion.service` | enrollments/progress/attempts | Required | Partial | **Critical** |
| Certificate issuance | Auto only | `certificate.service` | `certificates` | Required | Partial | **Critical** |
| Certificate viewer / "download" | Yes | n/a | — | Required | Partial | Low |
| Public certificate verification | Yes | `verifyPublicCertificate` | `certificates` | Public | Working | **High** |
| Admin dashboard | Static shell | None | — | Admin | **Not built** | Low |
| Curriculum management | Yes | `curriculum.controller` | modules/lessons/resources | Admin | Working | Medium |
| Course publish guard | Yes | `toggleCoursePublish` | `courses` | Admin | Working | Medium |
| Publish-all catalogue | Not wired | `publishAllCatalogCourses` | `courses` | Admin | Partial | **High** |
| Materials repository (PDF) | Yes | `materials.controller` | `course_materials` | Admin | Partial | **High** |
| PDF extraction → lesson | Yes | `extract`, `save-to-lesson` | `lessons.content` | Admin | Partial | **High** |
| Bulk import | Yes | `executeBulkImport` | `lessons` | Admin | Partial | **High** |
| Bulk import summary | Yes | `getBulkImportSummary` | — | Admin | **Broken** | Medium |
| Mass lesson population | Yes | `populateMassLessonContent` | `lessons` | Admin | Partial | **High** |
| Lesson asset manager | Yes | `content.controller` | `lesson_resources` | Admin | Partial | Medium |
| AI quiz generation | Yes | `ai.service` + Gemini | questions/options | Admin | Partial | **High** |
| Admin certificates list | Yes | `getAdminCertificates` | `certificates` | Admin | **Broken** | Medium |
| Admin assessments list | Yes | `getAdminAssessments` | `assessments` | Admin | Working | Low |
| Admin students | **Mock** | Endpoint unused | `profiles` | Admin | **Mock** | Medium |
| Admin programs | **Mock** | Endpoint unused | `programs` | Admin | **Mock** | Medium |
| Career paths mapping | Yes | `getCareerPaths` et al. | `program_courses` | Admin | Working | Low |
| Career domains (public) | Static + API | `getDomainLearningPath` | `categories`, `programs` | Public | Partial | Medium |
| Programs (public) | **Fabricated** | Not called | `programs` ignored | Public | **Mock** | **High** |
| Institutions list | Static page | Endpoint unused | `institutions` | Public | **Mock** | Medium |
| Institutions demo form | Static | **No endpoint** | — | Public | **Mock** | **High** |
| Institution detail | Yes | `getInstitutionBySlug` | `institutions` | Public | Working | Low |
| Articles / resources | Yes | `getArticles` | `articles` | Public | Working | Medium |
| Success stories | Yes | `getSuccessStories` | `success_stories` | Public | Working | Low |
| Global search | Yes | `searchPublic` | 4 tables, 5 rows each | Public | Working | Medium |
| Counselor leads | Yes | `submitCounselorLead` | `counselor_leads` | Optional | Working | Medium |
| Enterprise inquiries | `mailto:` only | **No endpoint** | Table exists, unused | — | **Not built** | Low |
| Payments / paid courses | Dead flag | Ignored | No table | — | **Not built** | Medium |

---

## 6. Frontend Audit

A single-bundle React 19 SPA. `main.tsx` mounts `App`, which wraps `AppRoutes` in `BrowserRouter` and `AuthProvider`. All 40 routes are declared eagerly in one file; there is no lazy loading and no route-level code splitting, producing the 952 KB single chunk observed in `dist/`.

### 6.1 Routing

- 18 public routes, 3 auth routes, 8 student routes (2 aliases for the player), 12 admin routes, plus a `*` fallback.
- Three separate routes point at the same certificate verification page: `/verify-certificate`, `/verify-certificate/:code`, `/verify/:verificationCode`. Only the last matches the `verification_url` the backend generates.
- Two player routes exist: `/student/learning/:courseId` and `/learn/:courseSlug/lesson/:lessonId`. The component reads `courseSlug || courseId` and defaults to a hardcoded slug `'python-programming-fundamentals'` (`LearningInterfacePage.tsx:34`).
- `VerifyCertificatePage` is **imported at `AppRoutes.tsx:19` but never routed** — dead import.

### 6.2 State management

There is no state library and no query cache. Every page owns `useState` for data, `loading` and `error`, and calls `services/api.ts` from a `useEffect`. Consequences:

- **No request deduplication or caching.** Navigating between My Learning and the player re-fetches everything.
- **No cancellation.** No `AbortController` anywhere; fast navigation can set state on an unmounted component or apply a stale response over a fresh one.
- **Stale closure in the player.** `LearningInterfacePage.loadOverview` reads `currentLessonId` but omits it from its dependency array, and its `useEffect` uses a different dependency list again (`[slugOrId, token]`).

### 6.3 Authentication & authorization (client)

- `AuthContext` is the single source of session state. It subscribes to `onAuthStateChange` and re-fetches the profile on every event.
- `RequireAuth` checks `isAuthenticated`; `RequireAdmin` additionally checks `role === 'ADMIN'`. This is **presentation-only and correctly so** — the backend re-verifies with `requireAdmin`.
- If the profile row is missing, `role` is `null` and admin routes deny. **Fail-closed, which is right.**
- **Broken fallback:** `AuthContext.fetchProfile` falls back to `supabase.from('profiles').insert(...)` when no row is found. **There is no INSERT policy on `profiles`** in migration 00002, so RLS denies this insert. If the `handle_new_user` trigger ever fails, the user is permanently profile-less; the error is logged and `null` returned.
- **Three token-retrieval patterns coexist:** `session?.access_token` from context, `await getAuthTokenAsync()`, and the synchronous `getAuthToken()` fallback inside `api.ts`. The last iterates every `localStorage` and `sessionStorage` key looking for anything containing `auth-token` or starting with `sb-`, JSON-parsing each — fragile and easily broken by a Supabase storage-key change.
- `signOut` clears the Supabase session but **not** the legacy `apex_token` key that `getAuthToken` still reads.

### 6.4 API calls & error handling

- Every `api.ts` function does `return await res.json()` **without checking `res.ok`**, so 401, 403 and 500 are indistinguishable from success at the call site. Callers branch only on the body's `success` field.
- Three different error response shapes must be handled (`{error: string}`, `{error: {message, statusCode}}`, `{verified, error}`); some render as `[object Object]`.
- **No error boundary anywhere in the tree.** A single render exception blanks the entire application.
- Error presentation is inconsistent: `ModuleAssessmentModal` and `FinalAssessmentModal` use `alert()`; every other surface uses inline banners.
- **Optimistic completion is not reconciled on failure.** `handleCompleteLesson` writes `COMPLETED` into local state before the request; on failure it calls `loadOverview(true)` but never surfaces an error, so a failed write looks identical to a successful one.

### 6.5 Forms & validation

- `RegisterPage` validates: non-empty name, password ≥ 6 characters, password confirmation match. Reasonable but minimal — no complexity requirement, no email format check client-side.
- `LoginPage` and `ForgotPasswordPage` rely on browser `type="email"` validation and server errors.
- The counselor lead form on `ProgramDetailPage` posts to a well-validated endpoint — the strongest validation path in the app.
- **`InstitutionsPage` "Request a Demo" form discards every submission.** `onSubmit` calls `preventDefault()`, shows `alert('Thank you for your interest! Our academic partnerships team will contact you within 24 hours.')` and resets the form. No fetch, no endpoint, no persistence. The `institutions` partnership lead is silently dropped while the user is told they will be contacted (`InstitutionsPage.tsx:59-63`).
- `EnterprisePage` has no form at all — a `mailto:` link only — despite an `enterprise_inquiries` table and RLS insert policy existing.
- **No schema validation library** on either side of the stack.

### 6.6 Accessibility

- Only 12 of 60 page/component files contain any `aria-*`, `role=` or `alt=` attribute.
- No skip links, no `aria-live` on async regions.
- Modals (`ModuleAssessmentModal`, `FinalAssessmentModal`, `CertificateViewerModal`) do not trap focus, do not restore focus on close, and do not close on Escape.
- Heavy reliance on very small type (`text-[10px]`, `text-xs`) throughout the admin console and player chrome.

### 6.7 Responsiveness

- 37 of the page files use Tailwind breakpoints; the layout system is consistently applied.
- The player has a proper desktop sidebar plus a mobile drawer implementation.
- Wide admin tables are not wrapped in horizontal scroll containers in several places — likely overflow on narrow viewports (**requires runtime verification**).

### 6.8 Mock and fabricated surfaces

| Surface | Evidence | What it renders |
|---|---|---|
| `/programs/:slug` | `data/programsData.ts:329` `getProgramDataBySlug` | For any unknown slug it clones the `genai-leaders` template and re-titles it. Fees, ratings, review counts, cohort dates and curriculum are invented. The `programs` table is never queried. |
| `/programs` | `ProgramsPage.tsx:46` | Lists the 11 static `CAREER_DOMAINS`, not database programs |
| `/institutions` | `InstitutionsPage.tsx` | Fully static. `fetchInstitutions` exists and is never called, so the list cannot link to the working `/institutions/:slug` detail page |
| `/student/assessment/:id` | `AssessmentPage.tsx:8` `mockQuizData` | Three hardcoded questions with `correctAnswer` indices in the client bundle, graded in the browser, never persisted. Routed and reachable |
| `/admin/programs` | `AdminProgramsPage.tsx:9` `mockPrograms` | Four fake programs with fake prices and enrollment counts |
| `/admin/students` | `AdminStudentsPage.tsx:9` `mockStudents` | Fake student roster |
| `/admin/dashboard` | `AdminDashboardPage.tsx` | Static shell; every KPI renders a literal em-dash placeholder |
| `/enterprise` | `EnterprisePage.tsx` | Hardcoded metrics ("300% Average ROI", "10k+ Employees Trained", "95% Completion Rate") |
| Home page ratings | `HomePage.tsx:687-703` | Course ratings 4.9 / 4.85 / 4.88 and "3,300+ hiring partner placement drives" are literals. No ratings table exists |

### 6.9 XSS sinks

- `ResourceDetailPage.tsx:121` renders `article.content` with `dangerouslySetInnerHTML` **without sanitisation**.
- `AdminMaterialsPage.tsx:1177` renders extracted PDF HTML with `dangerouslySetInnerHTML` — safe, because `convertTextToHtml` escapes `& < > "` before emitting markup.
- Session tokens live in `localStorage` (supabase-js default), so a stored-XSS payload in an article body could harvest reader sessions.

---

## 7. Backend Audit

Express with a controller/service split applied unevenly. **Every database call uses `supabaseAdmin` — the service-role client, which bypasses RLS entirely.**

### 7.1 Middleware

- `requireAuth` verifies the bearer token via `supabaseAdmin.auth.getUser(token)` — a real network verification against GoTrue, not local JWT decoding. **Correct.** It then attaches `req.profile` if a row exists.
- `requireAdmin` wraps `requireAuth` and re-queries `profiles.role`, requiring `'ADMIN'`. **Correct**, and role is never read from JWT claims.
- Both incur **two round-trips per request** (GoTrue + profiles), and `requireAdmin` makes a third by re-fetching the profile `requireAuth` already fetched.
- Routes are inconsistently declared: `/admin/courses` uses `requireAdmin` alone; `/admin/content` uses `requireAuth, requireAdmin`. Functionally identical but doubles the auth round-trips.
- **Absent entirely:** helmet/security headers, CORS policy, rate limiting, request body size limits, request IDs, structured logging.

### 7.2 Validation

- **No schema validation library** (no zod/joi/yup). Bodies are destructured and passed to the database.
- Validation quality varies dramatically:
  - `counselor.controller.ts` — full field-by-field validation with allow-lists, length bounds and format checks. **Excellent.**
  - `curriculum.controller.ts` — checks required fields and validates `lesson_type` / `resource_type` against constants. **Adequate.**
  - `materials.controller.ts`, `content.controller.ts` — presence checks only; enum values passed straight through, so invalid values surface as raw CHECK-constraint errors.
  - `learning.controller.ts` — presence checks only.

### 7.3 Error handling

- Controllers use per-handler `try/catch` with direct `res.status().json()`. The global `errorHandler` is effectively dead — **no controller calls `next(err)`**.
- **Raw database errors are forwarded to clients.** `res.status(500).json({error: error.message})` appears throughout `curriculum.controller.ts`, `content.controller.ts` and `materials.controller.ts`, leaking Postgres constraint and column names.
- `public.controller.ts` and `admin.controller.ts` use `if (error) throw error` then catch and return a generic 500 — which is why the `profiles.email` and `courses.status` column errors surface as opaque failures rather than actionable ones.
- **Many writes ignore their error result entirely:** the reorder loops in `curriculum.controller.ts`, the `lesson_resources` insert in `saveContentToLesson` and `executeBulkImport`, and the `student_answers` insert in both assessment services.
- The error handler returns stack traces whenever `NODE_ENV !== 'production'` — a deployment that forgets the variable leaks internals.

### 7.4 Transactions

**There are no transactions anywhere in the codebase.** Every multi-step write is a sequence of independent PostgREST calls. There is no RPC, no stored procedure and no `BEGIN`/`COMMIT` in any migration. Multi-step mutations that need atomicity and do not have it:

- Assessment attempt + student answers (attempt inserted, answers inserted separately, second error ignored)
- Certificate issuance (read-then-write with no locking)
- Material delete (storage object removed, then DB row updated)
- Material replace (old row patched, new row inserted)
- Module/lesson reorder (N sequential updates)
- Content asset detach (row deleted, then storage object removed)

### 7.5 Logging

- 105 `console.*` calls across `src/backend/`. No log levels, no structured fields, no request correlation, no redaction.
- The request logger in `server.ts` prints method and path for `/api` routes only — no status code, no duration, no user.
- **No audit log of any kind.** There is no record of who published a course, edited a lesson, deleted a material, generated a quiz or was granted admin.
- No error tracking service, no alerting.

### 7.6 Business logic placement

- Learning/assessment/certificate logic is correctly extracted into `src/backend/services/`.
- Content ingestion logic is **not** extracted — `convertTextToHtml`, the bulk-import loop and the 2 KB lesson content template all live inside `materials.controller.ts`.
- Admin and public read paths have no service layer at all.
---

## 8. API Inventory

All 61 routes from `src/backend/routes/api.routes.ts`. **Consumer** is the frontend function that calls it; *none* means no caller exists anywhere in `src/`.

### 8.1 Public & system

| Method / Route | Handler | Auth | Tables | Consumer | Notes |
|---|---|---|---|---|---|
| `GET /health` | `getHealth` | None | — | `checkApiHealth` | Always reports connected; leaks env-var presence |
| `GET /info` | inline | None | — | none | Hardcoded "phase 4" feature list |
| `GET /courses` | `getCourses` | None | courses, categories | `fetchCourses` | No pagination; category filtered in JS; `.or()` injection |
| `GET /courses/categories` | `getCategories` | None | categories | `fetchCategories` | — |
| `GET /courses/:slug` | `getCourseBySlug` | Optional (inline) | courses, modules, lessons, instructors, enrollments | `fetchCourseBySlug` | Re-implements `optionalAuth` inline instead of using the middleware |
| `GET /courses/:slug/curriculum` | `getCourseCurriculum` | None | modules, lessons | none | Unused — duplicates data already in `/courses/:slug` |
| `GET /domains/:slug/learning-path` | `getDomainLearningPath` | None | categories, programs, program_courses | `fetchDomainLearningPath` | `maybeSingle()` on programs breaks if a domain has 2+ programs |
| `GET /success-stories`, `/:id` | `public.controller` | None | success_stories | yes | — |
| `GET /institutions` | `getInstitutions` | None | institutions | **none** | Dead — list page is static |
| `GET /institutions/:slug` | `getInstitutionBySlug` | None | institutions, programs | yes | Unreachable from the static list page |
| `GET /articles`, `/:slug` | `public.controller` | None | articles, categories | yes | Body rendered with `dangerouslySetInnerHTML` |
| `GET /search?q=` | `searchPublic` | None | 4 tables | `searchPublic` | Unescaped term in four `.or()` filters; unauthenticated |
| `POST /counselor-leads` | `submitCounselorLead` | Optional | counselor_leads | `submitCounselorLeadApi` | Strong validation; no rate limit or CAPTCHA |
| `GET /certificates/verify/:code` | `verifyPublicCertificateHandler` | None | certificates, profiles, courses | `verifyCertificatePublic` | Code interpolated into `.or()`; hardcoded `APEX-STAT-2026-` prefix |

### 8.2 Authenticated student

| Method / Route | Handler | Enrollment enforced? | Consumer | Notes |
|---|---|---|---|---|
| `GET /auth/me` | inline | n/a | none | Dead |
| `POST /courses/:courseId/enroll` | `enrollInCourse` | n/a | `enrollInCourse` | Idempotent; `paymentCompleted` parsed and discarded |
| `GET /courses/:courseId/enrollment` | `getEnrollmentStatus` | n/a | none | Dead — UI reads `isEnrolled` off the course payload |
| `GET /me/enrollments` | `getMyEnrollments` | n/a | `fetchMyEnrollments` | — |
| `GET /learn/:course` | `getCourseLearningOverview` | **No** | `fetchCourseLearningOverview` | Queries `assessments.type` — column does not exist |
| `GET /learn/:course/lessons/:id` | `getLessonContent` | **No** | `fetchLessonContent` | Returns full content + signed resource URLs to any logged-in user |
| `POST .../lessons/:id/progress` | `updateLessonProgress` | **No** | `updateLessonProgress` | Does not verify the lesson belongs to the course |
| `POST .../lessons/:id/complete` | `completeLesson` | **No** | `completeLesson` | No watch/time gate; triggers certificate issuance |
| `GET .../lessons/:id/checkpoint` | `getLessonCheckpointHandler` | No | `LessonRenderer` | Returns `null` for all but 44 hardcoded lesson IDs |
| `POST .../checkpoint/attempt` | `submitCheckpointAttemptHandler` | No | `LessonRenderer` | Attempts lost on restart; correct answer auto-completes the lesson |
| `GET .../modules/:id/assessment` | `getModuleAssessmentHandler` | **No** | `ModuleAssessmentModal` | **A GET that writes** — creates a 10-question quiz if none exists, for any module ID |
| `POST .../modules/:id/assessment/submit` | `submitModuleAssessmentHandler` | No (lessons gate only) | `ModuleAssessmentModal` | Server-graded; `max_attempts` ignored; reveals the answer key |
| `GET /learn/:course/final-assessment` | `getFinalAssessmentHandler` | No | `FinalAssessmentModal` | Falls back to a fabricated UUID → zero questions |
| `POST .../final-assessment/submit` | `submitFinalAssessmentHandler` | No | `FinalAssessmentModal` | Eligibility gate is real; fails with "not found" when no row exists |
| `GET .../completion-summary` | `getCourseCompletionSummaryHandler` | No | none | **GET with side effects** — updates enrollment, can issue a certificate |
| `GET /lessons/:id/content-access` | `getStudentLessonContentAccess` | **Yes** | **none** | The only correctly gated content endpoint — and it is never called |
| `GET /me/certificates` | `getMyCertificatesHandler` | n/a | `fetchMyCertificates` | — |
| `GET /me/certificates/:id` | `getCertificateByIdHandler` | n/a | none | Ownership check correct; dead route |
| `POST /courses/:courseId/certificate` | `issueCertificateHandler` | **No** | none | Manual claim path exists but no UI calls it |

### 8.3 Admin

| Route group | Count | Notes |
|---|---|---|
| `GET /admin/verify`, `/admin/courses` | 2 | `/verify` unused |
| `GET /admin/{content,certificates,assessments,inquiries,programs,students}` | 6 | `/certificates` 500s (`profiles.email`); `/programs` and `/students` unused; **`/inquiries` returns counselor leads, not enterprise inquiries** |
| `/admin/curriculum/*` (summary, courses, modules, lessons, resources, career-paths, publish) | 14 | Create + update only — **no delete endpoints** for modules, lessons or resources; **no course-create endpoint** |
| `/admin/content/*` (upload init/complete, assets, attach, update, detach) | 6 | MIME allow-list defined but never applied; upload-existence check computed and discarded |
| `/admin/course-materials/*` (list, upload, patch, delete, download, extract, generate-quiz, save-to-lesson ×2) | 9 | `save-to-lesson` registered at two paths for one handler; PDF attach insert always fails |
| `/admin/bulk-import/{summary,execute}`, `/admin/catalog/publish-all`, `/admin/lessons/mass-populate` | 4 | Long-running synchronous loops in-request; `summary` 500s (`courses.status`); `publish-all` bypasses the publish guard |

### 8.4 Cross-cutting API observations

- **Unused endpoints (11):** `/info`, `/auth/me`, `/admin/verify`, `/courses/:slug/curriculum`, `/courses/:id/enrollment`, `/institutions`, `/me/certificates/:id`, `/courses/:id/certificate`, `/admin/programs`, `/admin/students`, `/lessons/:id/content-access`.
- **Duplicated:** `POST /admin/course-materials/:id/save-to-lesson` and `POST /admin/course-materials/save-to-lesson` map to the same handler with differing ID sources.
- **Inconsistent identifier handling:** six handlers each re-implement the same slug-vs-UUID regex inline. `issueCertificateHandler` uses a different, weaker heuristic (`!id.includes('-') || id.length < 32`).
- **No endpoint paginates.** Every list route returns the full table, subject to Supabase's silent 1,000-row cap.
- **Endpoints that expose more than needed:** `/admin/students` returns full profile rows; `getMyEnrollments` returns nested course objects including `is_published`.
- **Endpoints that trust client values:** `completeContentUpload` accepts an arbitrary `storagePath`; `generateQuizFromMaterial` accepts an arbitrary `assessment_id`; `initContentUpload` trusts a client-supplied `fileSize`.

---

## 9. Database Architecture

Effective schema after replaying 00001→00009: **27 tables, 2 views, 1 trigger function on `auth.users`, 1 `SECURITY DEFINER` helper, 22 indexes, 17 `updated_at` triggers.** All primary keys are UUID with `gen_random_uuid()` defaults except `profiles.id` (FK to `auth.users`) and two composite join tables.

### 9.1 Relationship graph

```text
auth.users --1:1--> profiles (role: STUDENT | ADMIN)
   |
   +--< enrollments >-- courses             UNIQUE (user_id, course_id)
   +--< lesson_progress >-- lessons         UNIQUE (user_id, lesson_id)
   +--< assessment_attempts >-- assessments UNIQUE (user_id, assessment_id, attempt_number)
   |        +--< student_answers >-- questions, question_options
   +--< certificates >-- courses, enrollments    (NO unique on user+course)
   +--< student_checkpoint_attempts >-- lesson_checkpoints   [TABLES UNUSED]

categories --< courses --< modules --< lessons --< lesson_resources
     |            |            |          +--- lesson_checkpoints (1:1, UNUSED)
     |            |            +--< course_materials (course_id AND module_id)
     |            +--< assessments --< questions --< question_options
     |            +--< course_instructors >-- instructors
     |            +--< program_courses >-- programs
     +--< programs --< program_courses
                 +--- institutions

standalone: articles, career_resources, success_stories,
            counselor_leads, enterprise_inquiries

views: public_question_options            (question_options minus is_correct)
       public_certificate_verifications   (certificates + learner name + course)
```

### 9.2 Table reference

| Table | Purpose | Key constraints | RLS read | RLS write |
|---|---|---|---|---|
| `profiles` | User identity + role | PK → auth.users; role CHECK (STUDENT, ADMIN) | Self or admin | Self UPDATE only; role change blocked; **no INSERT policy** |
| `categories` | 11 career domains (00004) | slug UNIQUE | Public if active | Admin |
| `institutions` | Partner institutions | slug UNIQUE | Public if active | Admin |
| `programs` | Career learning paths | slug UNIQUE; program_type CHECK | Public if published | Admin |
| `courses` | Course catalogue | slug UNIQUE; difficulty CHECK; **no `status` column** | Public if published | Admin |
| `program_courses` | Path→course mapping | Composite PK, cascade both ways | **Public, unconditional** | Admin |
| `instructors`, `course_instructors` | Faculty | Composite PK on join | Public, unconditional | Admin |
| `modules` | Course sections | FK course cascade; `display_order` not unique | **Public, unconditional** | Admin |
| `lessons` | Learning units | lesson_type CHECK; +3 JSONB cols (00006) | **Public, unconditional** | Admin |
| `lesson_resources` | Attachments | `file_url` NOT NULL; +8 cols (00005); **no `url` column** | **Public, unconditional** | Admin |
| `enrollments` | Student↔course | UNIQUE(user,course); course FK RESTRICT | Own or admin | **Self INSERT + UPDATE, unrestricted columns** |
| `lesson_progress` | Per-lesson state | UNIQUE(user,lesson); **no constraint tying lesson to course_id** | Own or admin | **Self ALL, unrestricted columns** |
| `assessments` | Quizzes / final exam | assessment_type CHECK; **no unique on (module_id, type)** | Public if published | Admin |
| `questions` | Question bank | marks > 0 | **Public, unconditional** | Admin |
| `question_options` | Answers + `is_correct` | is_correct NOT NULL default false | **Admin only — correct** | Admin |
| `assessment_attempts` | Attempt records | UNIQUE(user,assessment,attempt_number) | Own or admin | **Self INSERT; `passed`/`percentage` client-settable** |
| `student_answers` | Per-question answers | UNIQUE(attempt,question,option) | Own or admin | Self INSERT via attempt ownership |
| `certificates` | Issued credentials | certificate_code UNIQUE; **no UNIQUE(user,course)**; FK RESTRICT | Own or admin | **No policy — service role only. Correct.** |
| `course_materials` | PDF repository (00008) | **`storage_path` UNIQUE**; status CHECK | Admin only | Admin only |
| `lesson_checkpoints` + options + attempts | Inline checks (00007) | lesson_id UNIQUE | **Public, unconditional — including `is_correct`** | Self for attempts |
| `success_stories`, `articles`, `career_resources` | Marketing content | slug UNIQUE on articles | Public if published | **No write policy at all** — service role only |
| `counselor_leads` | Consultation leads | +2 cols (00003), 4 indexes | Admin only | **Public INSERT, unconditional** |
| `enterprise_inquiries` | B2B leads | — | Admin only | Public INSERT — never used |

### 9.3 Migration history audit (00001 → 00009)

| # | Change | Replayable? | Debt introduced |
|---|---|---|---|
| 00001 | 24 tables, 2 views, profile trigger, 17 `updated_at` triggers, 22 indexes | **Yes** — `IF NOT EXISTS` / `OR REPLACE` throughout | Both views created without `security_invoker`. An `ALTER TABLE ... ADD COLUMN IF NOT EXISTS new_role` patch is already embedded, signalling the file was edited after first application |
| 00002 | RLS enable + ~40 policies, `is_admin()`, 10 storage buckets | **Yes** — every policy guarded by `DROP POLICY IF EXISTS` | `is_admin()` is `SECURITY DEFINER` with no `SET search_path`. Seven buckets created here are never used by any code |
| 00003 | 2 columns + backfill + 4 indexes on `counselor_leads` | Yes | None |
| 00004 | **Unconditional `DELETE FROM` on 17 tables**, then inserts the 11 career domains | Yes, but **destructively** | **CRITICAL.** Replaying against production erases every enrollment, certificate, attempt and progress row. It also orphans `supabase/seed/00001_seed_data.sql`, whose category IDs (`10000000-...`) no longer exist |
| 00005 | 8 columns + widened CHECK + trigger + 2 indexes on `lesson_resources` | Yes | The new columns (`file_path`, `mime_type`, `is_primary`, `upload_status`, `uploaded_by`) are written by **no** code path |
| 00006 | 3 columns on `lessons` (JSONB objectives, takeaways, instructions) | Yes | Read by `getLessonContent` but written by no admin UI field |
| 00007 | 3 checkpoint tables + 3 indexes + 3 policies | **No** — bare `CREATE POLICY` fails on replay (42710) | **Public SELECT on `lesson_checkpoint_options` exposes `is_correct`.** The tables are referenced by zero lines of TypeScript |
| 00008 | `course_materials` + trigger + 3 indexes + RLS + bucket | Yes | `storage_path UNIQUE` combined with soft-delete makes path reuse impossible (§19) |
| 00009 | 4 bucket upserts, RLS on `storage.objects`, 3 avatar policies | **No** — bare `CREATE POLICY` fails on replay | Re-creates `course-materials` already created in 00008. No policies for `lesson-resources` or `certificates` — correct, since only the service role touches them |

**Migration debt summary:** the sequence is not safely replayable end-to-end (00007 and 00009 fail; 00004 destroys data). A fresh environment cannot be provisioned from these files without manual intervention.

### 9.4 Seed data & data consistency

- **`supabase/seed/00001_seed_data.sql` (618 lines)** seeds 10 categories, 4 institutions, 6 instructors, 5 programs, courses, modules, lessons, one MODULE_QUIZ and **the only `FINAL_ASSESSMENT` row that exists anywhere in the repository**. Its categories are deleted by migration 00004, so applying it after 00004 either fails on foreign keys or reintroduces a catalogue the application no longer expects.
- All IDs are hardcoded with `ON CONFLICT DO UPDATE`, so re-running is idempotent in isolation — but ID namespaces collide semantically: `c0000000-...-01` is a *success story* in the seed and a *category* in migration 00004.
- Seed answer keys are correctly distributed (correct option is not always first) — unlike the runtime-generated quizzes.
- **`seed.ts` (root)** duplicates a subset of the same institutions/stories/articles as TypeScript upserts. Two sources of truth for the same seed data.
- **`src/backend/database/seedCurriculumBatch1.ts` (360 ln)** and **`seedStatisticsLessons.ts` (276 ln)** define the *real current* catalogue — including the `f0200000-...-02` statistics course that the hardcoded checkpoint and final-assessment banks target. **Neither is imported by anything, exposed by any route, or referenced by an npm script.** The current database contents are therefore **not reproducible from the repository**.
- Production code depends on seed-era identifiers: `checkpoint.service.ts` keys 44 checkpoints by literal lesson UUIDs; `finalAssessment.service.ts` hardcodes `courseId = 'f0200000-0000-0000-0000-000000000002'`; `certificate.service.ts` falls back to the course title `'Statistics for Data & Analytics'`.
---

## 10. RLS & Supabase Security Audit

RLS is enabled on all 27 public tables and roughly 40 policies are defined. The important question is not whether it is on, but **what the policies actually permit for a holder of the public anon key plus a normal student JWT** — because `src/lib/supabaseClient.ts` ships exactly that to every browser, and PostgREST is directly reachable at the project URL.

> **Threat surface note.** Everything in this section is reachable with `curl` against `https://<project>.supabase.co/rest/v1/` using the anon key embedded in the client bundle. No part of it requires going through the application.

### 10.1 What the policies get right

- **Answer keys are protected at the table level.** `question_options` has `FOR SELECT USING (public.is_admin())`. A student querying it directly gets zero rows. This is the single most important policy in the schema and it is correct.
- **Role escalation via profile update is blocked.** The UPDATE policy's `WITH CHECK` compares the new `role` against `(SELECT role FROM public.profiles WHERE id = auth.uid())`, which reads the pre-update snapshot (migration 00002, lines 51–54). A student cannot set `role='ADMIN'` on themselves through PostgREST.
- **Certificates have no INSERT or UPDATE policy**, so rows can only be created by the service role. Students cannot fabricate a certificate row directly.
- **No policy recursion.** `is_admin()` is `SECURITY DEFINER` and runs as the table owner, so the `profiles` policies that call it do not re-enter policy evaluation.
- **Cross-student isolation holds on read** for `enrollments`, `lesson_progress`, `assessment_attempts`, `student_answers` and `certificates`.

### 10.2 Ownership is checked; content is not

The learning-data policies verify *who owns the row* and stop there. They never constrain *what the row says*. Combined with a completion engine that reads those same rows as authoritative, this is the core defect of the system.

| Policy (migration 00002) | Effect | Abuse |
|---|---|---|
| `"Users insert/update own lesson progress"` — `FOR ALL USING/WITH CHECK (auth.uid() = user_id)` | Student may write any `lesson_progress` row for themselves | `POST /rest/v1/lesson_progress` with `status: 'COMPLETED'` for every lesson in a course — one request |
| `"Users insert own assessment attempts"` — `FOR INSERT WITH CHECK (auth.uid() = user_id)` | Student may insert an attempt with arbitrary `score`, `percentage`, `passed` | `{assessment_id, user_id, attempt_number: 1, passed: true, percentage: 100}` — the grader is bypassed entirely |
| `"Users update own enrollments"` — `FOR UPDATE (auth.uid() = user_id)` | Student may set `status='COMPLETED'`, `progress_percentage=100`, `completed_at` | Cosmetic alone (the engine recomputes), but the dashboard reads these fields directly |

**Traced end to end:** `courseCompletion.service.ts:311` counts `lesson_progress` rows with `status='COMPLETED'`; line 332 counts `assessment_attempts` with `passed=true`; line 371 ANDs the two with `finalPassed`; line 433 calls `issueCertificateForUser`. **Every input is client-writable.**

### 10.3 Course content is world-readable

`modules`, `lessons`, `lesson_resources`, `questions`, `program_courses`, `instructors` and `course_instructors` all carry `FOR SELECT USING (true)` — no published check, no enrollment check, no authentication check. An unauthenticated visitor with the anon key can dump:

- Every lesson body of every course, **including unpublished drafts** (`lessons` has no `is_published` and its policy does not join to `courses`).
- Every question text of every assessment, including the final exam and unpublished assessments (`questions` is `USING (true)` even though `assessments` is gated on `is_published`).
- Every `lesson_resources.file_url` — the storage object paths inside the private `lesson-resources` bucket. The objects themselves still require a signed URL, so this is path disclosure rather than content disclosure.

Enrollment gating is therefore meaningless at the data layer regardless of what the API does.

### 10.4 Checkpoint answer keys are public

Migration 00007 line 42: `CREATE POLICY "Allow read access to lesson_checkpoint_options" ... FOR SELECT USING (true)`. That table has an `is_correct BOOLEAN NOT NULL` column. Anyone can read the correct answer for every checkpoint.

The impact is currently theoretical — grep confirms no TypeScript writes to these tables, so they are empty — but the policy is a trap armed for whoever migrates checkpoints to the database.

### 10.5 Both views bypass RLS

Migration 00001 creates `public_question_options` (line 320) and `public_certificate_verifications` (line 381) as plain views. Neither declares `security_invoker = true`, and **no migration issues any `GRANT` or `REVOKE`** (verified: zero matches for `GRANT|REVOKE|security_invoker` across `supabase/`). Under Supabase's default privileges, views created by `postgres` in `public` are readable by `anon` and `authenticated`, and they execute with the **view owner's** rights — bypassing the underlying tables' RLS.

- **`public_certificate_verifications`** joins `certificates → profiles → courses` with **no filter**. A single unauthenticated request returns every certificate code, every learner's full name, and the course each completed. Bulk PII disclosure, and it defeats the design of the verification endpoint, which is meant to require knowledge of a specific code.
- **`public_question_options`** exposes `option_text` for every assessment, bypassing the admin-only policy on the base table. It correctly omits `is_correct`, so the answer key is not directly leaked — but for auto-generated quizzes (§13) the correct option is identifiable from its text alone.

> **Verification note.** The privilege conclusion rests on Supabase's standard default grants rather than an explicit `GRANT` in the repository. Confirm with one query as `anon` before or alongside remediation — but remediate regardless, since neither view is referenced by any code.

### 10.6 `is_admin()` has a mutable search_path

`CREATE FUNCTION public.is_admin() ... SECURITY DEFINER` with no `SET search_path` (00002:32-40). This is the standard Supabase linter finding `function_search_path_mutable`. Exploitation requires the ability to create objects in a schema earlier in the resolved `search_path`, which modern Supabase restricts for `authenticated`. Real but low-probability.

### 10.7 Storage policies

- RLS is enabled on `storage.objects` with policies only for the public `avatars` bucket. `lesson-resources`, `course-materials` and `certificates` have no policies, so only the service role reaches them — **this is correct and deliberate**, and the backend mediates access via short-lived signed URLs.
- The avatar INSERT/UPDATE policies use `auth.uid() = owner OR auth.uid()::text = (storage.foldername(name))[1]`. The `OR` means a user may write to a path prefixed with their own UUID *or* to any object they own — acceptable, though the folder check alone would be tighter. There is no DELETE policy, so users cannot remove their own avatars.
- Migration 00002 creates **seven public buckets** (`course-thumbnails`, `program-images`, `institution-logos`, `instructor-images`, `profile-images`, `article-images`, `success-story-images`) that no code writes to or reads from. Unused public write surface should not exist.
- `saveContentToLesson` and `executeBulkImport` mint signed URLs with `86400 * 365` seconds — **one-year credentials** — and intend to persist them in the database. Long-lived bearer URLs in a table defeat the private bucket. (The insert itself fails for an unrelated reason; see §18.)

### 10.8 Explicit isolation questions

| Can a student reach… | Verdict | Path |
|---|---|---|
| Answer keys (`question_options.is_correct`) | **No** directly | Blocked by RLS. But revealed post-submission in the grading response, with unlimited retries |
| Option text for unpublished assessments | **Yes** | `public_question_options` view bypasses RLS |
| Checkpoint answer keys | **Yes** (tables empty today) | `lesson_checkpoint_options` `USING (true)` |
| Other students' progress / attempts / answers | **No** | Ownership predicates are correct |
| Other students' certificates and names | **Yes** | `public_certificate_verifications` view — without authenticating at all |
| Unpublished course content | **Yes** | `lessons`/`modules` `USING (true)` |
| Content of courses they are not enrolled in | **Yes** | Both via RLS and via `/api/learn/*` |
| Private storage objects | **No** | No policies on those buckets; signed URLs only |
| Counselor leads / enterprise inquiries | **No** | Admin-only SELECT; but anyone may INSERT unbounded rows |
| Admin-only data (`course_materials`) | **No** | `is_admin()` gate on all operations |

---

## 11. Authentication & Authorization

Two roles only: `STUDENT` (the trigger default) and `ADMIN`, enforced by a CHECK constraint on `profiles.role`. There is no instructor, reviewer or support role, and no team/tenant concept.

### 11.1 How a user becomes an admin

**There is no code path that grants ADMIN.** `handle_new_user()` hardcodes `'STUDENT'`; the profiles UPDATE policy blocks self-promotion; no API endpoint writes `role`; no admin UI exposes it. Promotion happens only by manual SQL in the Supabase console (or by any holder of the service-role key).

That is secure by omission, but it also means **there is no audit trail for privilege grants** and no way to revoke admin through the product.

### 11.2 Session lifecycle

1. `signInWithPassword` → GoTrue returns a session; supabase-js persists it in `localStorage`.
2. `AuthContext` subscribes to `onAuthStateChange` and re-fetches the profile on every event.
3. `api.ts` attaches `Authorization: Bearer <access_token>`, resolved from context or scraped from storage.
4. `requireAuth` verifies the token against GoTrue on **every** request — no local caching, no JWT-signature shortcut. Revocation is immediate, at the cost of a round-trip.
5. `signOut` clears the Supabase session and local state. It does **not** clear the legacy `apex_token` key that `getAuthToken` still reads.

### 11.3 Findings

- **Authorization is not layered.** The API relies entirely on TypeScript checks because the service role bypasses RLS; the browser relies entirely on RLS because it bypasses the API. Neither layer backstops the other, so a single omission is a full breach — which is exactly what §10.2 and §12 describe.
- **Ownership checks are done correctly where they exist.** `getCertificateForOwner` fetches then compares `cert.user_id !== userId` and returns 403. Every learning handler derives identity from `req.user.id`, never from the body or params. **There is no IDOR in the certificate or enrollment handlers.**
- **No CSRF exposure.** Authentication is a bearer header, not a cookie, so cross-site form posts cannot authenticate.
- **Tokens live in `localStorage`**, which is XSS-readable. Given the unsanitised `dangerouslySetInnerHTML` on article content, an admin who publishes malicious HTML could harvest reader sessions.
- **No password policy, no MFA, no lockout, no enforced email verification** in application code. Whether email confirmation is required is a Supabase dashboard setting — **requires runtime verification**. `signUp` handles both the session and no-session responses, implying confirmation may be enabled.
- **No rate limiting on login** beyond whatever GoTrue applies by default.
- `JWT_SECRET` and `JWT_EXPIRES_IN` are defined in `config/env.ts` and `.env.example` but **are never used** — the app does not mint its own tokens. Dead config that implies a security control which does not exist.

---

## 12. Learning Engine

The intended chain is Enrollment → Lesson → Progress → Checkpoint → Module Assessment → Final Assessment → Completion → Certificate. Traced against the code, most links are present but the gates between them are not.

### 12.1 Enrollment

`POST /api/courses/:courseId/enroll` derives identity from the verified JWT, checks the course exists and is published, checks for an existing row, inserts, and handles the 23505 race by re-reading. **This handler is correct.**

Two gaps: `is_free` is never consulted and the `paymentCompleted` body field is destructured and discarded (`enrollments.controller.ts:13`), so every published course is free; and enrollment is not actually required for anything downstream.

### 12.2 Lesson access — the gate that is not there

`getLessonContent` rejects only when `!enrollment && !course.is_published && !isAdmin` (`learning.controller.ts:205`). For a **published** course, `enrollment` being null is irrelevant — the handler proceeds to return the full lesson body, learning objectives, key takeaways and signed URLs for every attached resource. The same is true of `getCourseLearningOverview` (line 78), `updateLessonProgress` and `completeLesson`, neither of which loads an enrollment at all before writing progress.

Meanwhile `getStudentLessonContentAccess` in `content.controller.ts:519-535` implements exactly the right check — published course AND an enrollment row, else 403 — and **no component calls it** (`fetchStudentLessonContentAccess` has zero consumers). The correct implementation exists and is unwired.

The frontend gate is also inert: `LearningInterfacePage.tsx:69` branches on `res.notEnrolled`, a field the backend never returns. The "Enrollment Required" screen is unreachable, and its enroll button would fail anyway because it reads `overview?.courseId` while the response provides `course.id`.

### 12.3 Progress

- `updateLessonProgress` upserts on `(user_id, lesson_id)` and monotonically raises `watch_percentage` via `Math.max` — sensible. It never verifies the lesson belongs to the course in the URL, so a mismatched `course_id`/`lesson_id` pair can be written; no FK or CHECK prevents it.
- `completeLesson` upserts `status='COMPLETED'`, `watch_percentage=100` with **no precondition whatsoever** — no minimum watch time, no scroll depth, no dwell time, no check that the lesson was ever opened. A loop over the lesson IDs returned by `/learn/:course` completes an entire course in seconds. This is the intended UX ("Mark as complete"), but it means lesson completion carries no evidentiary weight.
- A `lesson_progress` row is auto-created with `IN_PROGRESS` on first lesson view, but **only when an enrollment exists** (`learning.controller.ts:246`) — so unenrolled viewers read content without leaving a trace.

### 12.4 Checkpoints

Entirely in-memory and entirely hardcoded. `checkpoint.service.ts` builds a `checkpointsMap` keyed by 44 literal lesson UUIDs belonging to the statistics course, with deterministic UUIDv5 option IDs. Attempts are pushed to a module-level array (`attemptsStore`).

- Every other lesson in the catalogue returns `{checkpoint: null}` — the feature is invisible for the rest of the platform.
- Attempt history is lost on restart and is not shared across instances, so the service **cannot be horizontally scaled** without changing behaviour. The array also grows unbounded — a slow memory leak.
- In all 44 definitions the correct option is the first one (`display_order: 1`), and options are served in that order.
- Migration 00007 created purpose-built tables for exactly this feature, which the service ignores. **Schema and implementation have diverged completely.**
- Answering a checkpoint correctly triggers `onCompleteLesson()` client-side (`LessonRenderer.tsx:132`), so the checkpoint doubles as the completion trigger for those 44 lessons.

### 12.5 Completion

`evaluateCourseCompletion` is the declared single source of truth and its three-way structure is sound: all required lessons complete, all MODULE_QUIZ assessments passed, final assessment passed. The problems are in the details:

- **Vacuous truth on empty courses.** Lines 320, 341 and 367: if a course has zero required lessons, zero module quizzes and no final assessment, all three predicates default to `true` and the course is instantly complete for anybody. Given `publishAllCatalogCourses` can publish the entire catalogue in one call, empty published courses are a realistic state.
- **Enrollment is not required.** The enrollment row is fetched at line 375 only to be updated; if it is null the update is skipped but `courseCompleted` is still returned `true`, and the caller still issues a certificate.
- **Module-quiz counting relies on a fragile join.** It counts distinct `assessment_id`s with `passed=true` against the count of MODULE_QUIZ rows for the course. Because nothing prevents duplicate assessments per module (§19), the denominator can silently inflate and completion becomes unreachable.
- **It writes and issues certificates from GET requests.** `getCourseCompletionSummaryHandler` is a `GET` that updates `enrollments` and can insert a certificate. Any prefetcher, crawler or double-render triggers it.
- The progress formula (75% lessons / 20% quizzes / 5% final, capped at 99) is reasonable, but the player's sidebar computes an *unrelated* lessons-only percentage, so two different numbers describe "progress".

---

## 13. Assessment Engine

Grading is genuinely server-side and `is_correct` is deliberately excluded from student-facing queries (`moduleAssessment.service.ts:93-98`, `finalAssessment.service.ts:570-575`). That part is right. Everything around it is not.

### 13.1 Auto-generated module quizzes

`loadModuleAssessmentFromDB` (lines 26–81) fires when a student opens a module with no quiz. On a **GET request**, using the **service role**, it inserts an assessment plus 10 questions plus 40 options:

```text
question_text : "Question N: What is the primary objective of {Module Title}?"   x10, identical
options       : 1. "Standardized, fault-tolerant execution pattern for {Module}"  is_correct: TRUE
                2. "Unvalidated direct execution without error handling"          false
                3. "Storing unindexed data in plaintext files"                    false
                4. "Overwriting historical snapshots without backups"             false
passing_percentage : 70
```

Three failures compound:

1. **The quiz is trivially passable.** The correct option is always `display_order: 1`, and options are returned ordered by `display_order`. Selecting the first option ten times scores 100%. Even without that, the correct answer is the only one phrased positively.
2. **The content is not an assessment.** Ten identical filler questions measure nothing, yet passing them is a hard requirement for course completion and certificate issuance.
3. **Uncontrolled write amplification.** There is no unique constraint on `assessments(module_id, assessment_type)`. Two concurrent opens create two assessments; from then on `.maybeSingle()` errors on multiple rows, returns null, and *a new assessment plus 10 questions plus 40 options is created on every subsequent request*. `hasPassedModuleAssessment` uses the same `.maybeSingle()`, so it starts returning `false` permanently and **the module can never be completed**. The handler also never checks that `moduleId` belongs to the course in the URL, so any authenticated user can force creation against arbitrary module IDs platform-wide.

### 13.2 Grading and attempts

- **`max_attempts` is never enforced.** The column exists with a default of 3 and a `> 0` CHECK; neither submit path reads it. Attempts are unlimited.
- **The answer key is returned after every submission.** Both services build a `details` array containing `correct_option_id` and `explanation` for every question. With unlimited attempts, one deliberate wrong submission yields a perfect score on the next.
- **`duration_minutes` is decorative.** No timer is enforced server-side; `started_at` is fabricated as `Date.now() - 300000` (module) or `-600000` (final), so `time_taken_seconds` is meaningless.
- **Multi-select is unsupported despite the schema.** `question_type` allows `MULTIPLE_CHOICE` and AI-generated questions are inserted with that type, but `correctMap` is `question_id → single option_id`; with several correct options the last one read wins and every other answer is graded wrong.
- **Attempt numbering races.** `count(*) + 1` then insert, against `UNIQUE(user_id, assessment_id, attempt_number)`. Two concurrent submissions produce a 23505 surfaced as "Failed to save attempt".
- **Partial persistence.** The attempt is inserted first, then `student_answers` in a second statement whose error is ignored. No transaction, so a failure leaves a scored attempt with no answer detail.
- **Unanswered questions are silently graded wrong** (empty `option_id` never matches) rather than rejected — a submit-empty-to-see-answers path.

### 13.3 Final assessment

The most broken subsystem in the codebase.

- **No code path ever creates a `FINAL_ASSESSMENT` row.** Grepping the whole repository, the only `INSERT` with that type is in the obsolete `supabase/seed/00001_seed_data.sql`, whose course was deleted by migration 00004. No admin UI, no controller, no service creates one.
- **The service falls back to a fabricated ID.** `getStudentFinalAssessment` sets `assessmentId = assessment?.id || finalAssessmentId`, where `finalAssessmentId` is a UUIDv5 derived from the hardcoded statistics course ID. Questions are then queried by that ID and none match, so the modal renders an exam with **zero questions**. Submitting fails with "Final assessment not found."
- **The UI entry point is inconsistent.** `getCourseLearningOverview` computes `hasFinalAssessment` with `.eq('type', 'FINAL')` — the column is `assessment_type` and the value is `FINAL_ASSESSMENT`, so the query errors and the flag is always `false`. `CoursePlayerHeader` honours the flag and hides its button; `CurriculumSidebar` ignores it and always renders one. Students can reach a broken exam from the sidebar while the header claims none exists.
- **Completion treats a missing final as passed** (`courseCompletion.service.ts:367`). No course in the current catalogue has a final exam, so every course silently satisfies that requirement.
- **~410 lines of dead question bank.** `rawFinalQuestions` (30 questions) and `finalAttemptsStore` are compiled into `finalAssessmentObj`, which is used only for four title/percentage fallbacks. In all 30, the correct option is listed first — so if this bank is ever seeded verbatim, the exam inherits the same first-option-is-correct flaw.
---

## 14. Certificate System

Issuance is idempotent-by-lookup, ownership-checked on read, and verifiable by code. The eligibility gate in front of it is only as strong as the tables described in §10 and §12 — which is to say, not strong.

### 14.1 Issuance path

1. `issueCertificateForUser(userId, courseId)` calls `evaluateCourseCompletion(..., {skipAutoCert: true})` and refuses unless both `courseCompleted` and `certificateEligible` are true.
2. It looks up an existing certificate for `(user_id, course_id)` and returns it with `newlyIssued: false` if found.
3. Otherwise it generates `APEX-STAT-{year}-{8 hex}` from `crypto.randomBytes(4)` and inserts.
4. The only automatic trigger is `evaluateCourseCompletion` itself (line 433), reached from `completeLesson`, both assessment submits, and the completion-summary GET.

### 14.2 Findings

- **Certificates can be issued without enrollment.** Nothing in `issueCertificateForUser` or `evaluateCourseCompletion` requires an `enrollments` row. The `certificates.enrollment_id` column is never populated, despite `database.types.ts:305` typing it as a non-nullable `string`.
- **The student's name is always wrong on newly issued certificates.** Line 57 selects `full_name, email` from `profiles` — **`profiles` has no `email` column** in any migration. PostgREST returns an error, `profile` is undefined, and `studentName` falls back to the literal `'Apex Academy Student'`. The two sibling functions (`getMyCertificates`, `getCertificateForOwner`) select only `full_name` and work correctly — so the certificate list shows the right name while the issuance response shows the placeholder.
- **Duplicate certificates are possible.** There is no `UNIQUE (user_id, course_id)` on `certificates`; the guard is a read-then-write with no transaction. Two concurrent completion triggers — entirely plausible, since `completeLesson` and the summary GET both fire — produce two certificates for one course.
- **Code collisions are unhandled.** `randomBytes(4)` is 32 bits of entropy against a `UNIQUE` column, and a 23505 on insert is returned to the user as a raw error string rather than retried.
- **The code prefix is wrong for the platform.** `APEX-STAT-` is hardcoded for the statistics pilot; every certificate for every course, in every domain, is stamped `STAT`.
- **The verification lookup is filter-injectable.** `verifyPublicCertificate` builds ``.or(`certificate_code.eq.${cleanCode},certificate_code.eq.APEX-STAT-2026-${cleanCode}`)`` from unsanitised input. A code containing `,` or `.` injects additional PostgREST filter terms. The year is also hardcoded to 2026, so the bare-suffix convenience form silently stops working in 2027.
- **Course title falls back to a literal.** Line 252: `|| 'Statistics for Data & Analytics'`. A certificate for a course whose join fails is verified as a statistics certificate.
- **Revocation is unreachable.** `verification_status` supports `REVOKED` and `verifyPublicCertificate` honours it, but no endpoint or UI can set it.
- **There is no PDF.** `certificates.pdf_url` is never written and the `certificates` storage bucket is never used. "Download" in `CertificateViewerModal` is `window.print()` with print CSS. `metadata.json` promises "downloadable certificates".
- **The manual claim endpoint is orphaned.** `POST /courses/:id/certificate` and its client `claimCourseCertificate` exist; no component calls either.
- **A second, fake verifier exists in the source.** `VerifyCertificatePage.tsx` returns `status: 'AUTHENTIC & VERIFIED'` for any input, with a hardcoded learner "Alex Morgan". It is imported by `AppRoutes.tsx:19` but not routed — all three verify routes use the real `PublicCertificateVerificationPage`. Dangerous dead code.

### 14.3 Attack chain — certificate forgery, fully traced

1. Register normally.
2. `GET /api/courses` to find a published course; `GET /api/learn/<slug>` to list its lesson IDs (**no enrollment needed**).
3. Either loop `POST /api/learn/<slug>/lessons/<id>/complete` for each lesson, or write the `lesson_progress` rows in one PostgREST call.
4. For each module quiz, either answer option 1 ten times, or `POST /rest/v1/assessment_attempts` with `passed: true`.
5. No final assessment exists, so that requirement auto-passes.
6. The last completion trigger issues a real, verifiable certificate.

Total elapsed time: under a minute. For a course with no modules, steps 3–5 are unnecessary.

---

## 15. Content, Materials & Storage

Two parallel ingestion systems exist with no shared abstraction: `content.controller.ts` (lesson assets → `lesson-resources` bucket) and `materials.controller.ts` (course PDFs → `course-materials` bucket). Both use the same three-step pattern — server mints a signed upload URL, browser PUTs directly to storage, server registers metadata — which is the right architecture.

### 15.1 Material pipeline

```text
Admin UI --initMaterialUpload--> signed PUT URL
     |                              path = {domain}/foundation/{course-slug}/module-NN/{file}
     +--PUT binary--> Supabase Storage (course-materials, private)
     +--completeMaterialUpload--> INSERT course_materials  (storage_path UNIQUE)
     +--extract--> download blob -> PDFParse.getText() -> convertTextToHtml() -> HTML
     +--saveContentToLesson--> UPDATE lessons.content = HTML
                            -> INSERT lesson_resources {url: ...}   <-- ALWAYS FAILS
     |
     v
LessonRenderer renders lessons.content as ESCAPED TEXT   <-- HTML shown as literal tags
```

### 15.2 Confirmed defects

- **The extracted HTML is never rendered as HTML.** The ingestion chain writes markup into `lessons.content`; `LessonRenderer.tsx:305` renders `{lesson.content}` as a JSX child, which React escapes, inside `whitespace-pre-line`. Students see literal `<h2>Introduction</h2><p>Welcome to…`. The admin preview at `AdminMaterialsPage.tsx:1177` uses `dangerouslySetInnerHTML`, so it looks correct to the person who imported it — which is why this has survived.
- **Attaching the source PDF always fails silently.** Both `saveContentToLesson` (line 689) and `executeBulkImport` (line 949) insert into `lesson_resources` with a `url` key. That column does not exist; `file_url` does, and it is `NOT NULL`. Neither insert destructures an error, so the failure is invisible and students never receive the original PDF.
- **Replace / versioning is structurally broken.** `initMaterialUpload` builds a deterministic path with no timestamp, while `course_materials.storage_path` is `UNIQUE` and deletes are soft. Uploading version 2 of the same filename therefore (a) targets an object that already exists, which `createSignedUploadUrl` refuses without upsert, and (b) if it got that far, violates the unique constraint because the v1 row still holds the path. The same constraint makes re-uploading any previously deleted filename permanently impossible.
- **Upload verification is computed and thrown away.** `completeContentUpload` lists the storage folder and finds `uploadedFile`… then never references it. The `lesson_resources` row is inserted whether or not the object exists.
- **The MIME allow-list is dead.** `ALLOWED_MIME_TYPES` in `content.controller.ts:22-31` is defined and never read. Type is inferred from the filename via `detectResourceType`. Size limits are checked only `if (fileSize)` — a client that omits the field skips the check entirely, and the value is client-supplied regardless.
- **"Mass AI lesson content population" contains no AI.** `populateMassLessonContent` writes one hardcoded ~2 KB template into every empty lesson across every course, interpolating only the lesson title, and reports success as "Mass AI lesson content population complete". Any course filled this way is generic filler presented to paying learners as curriculum.
- **Bulk operations run synchronously inside the request.** `executeBulkImport` downloads and parses each PDF (up to 100 MB) in a sequential loop with no timeout, no queue, no job record and no resume. A partial failure leaves some lessons updated and no way to identify or retry the rest. `populateMassLessonContent` loops over every lesson in the database the same way.
- **Delete ordering creates orphans.** `deleteMaterial` removes the storage object first and only then soft-deletes the row; a failure between the two leaves an `ACTIVE` row pointing at a deleted file. `detachContentAsset` does the reverse (row first, then optional storage removal), leaking files. Neither is transactional and there is no reconciliation job.
- **Signed URLs degrade silently.** `resolveSignedAssetUrl` returns the raw storage path when signing fails, so the frontend receives a string that is not a URL and the media simply does not load, with no error surfaced.
- **No pagination or server-side search.** `getAdminMaterials` fetches all materials with joins, then filters by search term in JavaScript.

### 15.3 What is sound

- Direct-to-storage uploads keep large payloads out of Node.
- Filenames are sanitised to `[a-zA-Z0-9.-]`; path traversal is not reachable because `/` is replaced with `_`.
- `convertTextToHtml` escapes `& < > "` before emitting markup, so PDF-sourced content cannot inject script into the admin preview.
- Private buckets have no RLS policies, so storage objects are reachable only through server-minted signed URLs.

### 15.4 Idempotency / recoverability assessment

| Property | Verdict |
|---|---|
| Secure | Partially — admin-gated and private buckets, but no MIME enforcement and client-trusted sizes |
| Reliable | No — silent failures on PDF attach, silent failure on signed-URL generation |
| Scalable | No — synchronous parsing, no queue, no pagination |
| Idempotent | No — re-import overwrites; replace is impossible; duplicate resource rows guarded only by a title match that never runs |
| Recoverable after failure | No — no job records, no resume, no reconciliation for orphans |

---

## 16. AI System

One file, 86 lines: `src/backend/services/ai.service.ts`. It exposes `generateQuizFromText(text, count)`, called only by `generateQuizFromMaterial` in `materials.controller.ts`, itself reachable only via `POST /api/admin/course-materials/:id/generate-quiz` behind `requireAdmin`.

| Aspect | Finding |
|---|---|
| Provider / model | Google Gemini, `gemini-2.5-flash`, hardcoded. Structured output via `responseSchema`, `temperature: 0.2` |
| Key handling | `process.env.GEMINI_API_KEY` only, server-side. Not prefixed `VITE_`, cannot reach the browser bundle. **Verified:** zero occurrences of the key or `@google/genai` in `dist/assets/index-*.js`. **Correct.** |
| Input | Raw PDF text, truncated to 30,000 characters, interpolated into the prompt |
| Output trust | **Not validated.** The response is `JSON.parse`d and each item inserted straight into `questions` and `question_options`. Nothing checks that exactly one option has `is_correct: true`. A question with zero correct options is permanently ungradable; with several, only one is honoured by the grader |
| Target validation | `assessment_id` comes from the request body and is never verified to belong to the material's course. An admin can inject generated questions into any assessment on the platform |
| Idempotency | None. Calling twice appends a second set; `display_order` restarts at 1, producing duplicate ordering |
| Prompt injection | Real but bounded — PDF text is untrusted content in the prompt, and admins may upload third-party material. A crafted PDF can steer question and explanation text shown to students. Structured output limits the blast radius to content, not code |
| Reliability | No timeout, no retry, no backoff, no circuit breaker. A Gemini failure surfaces as a 500 with the provider's raw message. The loop `continue`s past a failed question insert, so an assessment can end up with fewer questions than requested and no report of which failed |
| Cost control | None — no rate limit, no per-admin quota, no usage logging. Each call ships up to 30,000 characters |
| Prompt hygiene | The comment `// Limiting text length to avoid token limits just in case` sits *inside* the template literal, so that sentence is sent to the model as part of the prompt |
| Naming | The separate "AI lesson population" feature (§15) uses **no AI at all** despite its name and success message |

---

## 17. Data Flow — Critical User Journeys

### Journey 1 — New student to first lesson

```text
RegisterPage --signUp--> GoTrue --trigger handle_new_user--> profiles (role STUDENT)
   |  AuthContext.fetchProfile reads profiles via anon key + user JWT (RLS: self)
   |  [if trigger failed -> fallback INSERT is DENIED by RLS -> profile stays null forever]
   v
HomePage/FreeCoursesPage --GET /api/courses--> courses+categories (all rows, no paging)
   v
CourseDetailPage --GET /api/courses/:slug--> course + modules + lessons + instructors
   |                                          + isEnrolled (inline token check)
   +-- not logged in --> navigate /login?redirect=...   <-- LoginPage IGNORES ?redirect
   +-- logged in --> POST /api/courses/:id/enroll --> enrollments row
   v
navigate /learn/:slug/lesson/:id --> GET /api/learn/:slug  (NO enrollment check)
                                 --> GET /api/learn/:slug/lessons/:id
                                     -> lesson + signed resource URLs
                                     -> auto-create lesson_progress (only if enrolled)
                                     -> update enrollments.last_accessed_lesson_id
```

**Failure points:** the `?redirect=` parameter is written by `CourseDetailPage.tsx:131` and never read by `LoginPage`, which uses `location.state.from` instead — so "enroll → log in → return" drops the user on the dashboard and the enrollment intent is lost. A failed profile trigger is unrecoverable. Steps 3–4 work identically without ever enrolling.

### Journey 2 — Course completion to certificate

```text
LessonRenderer "Mark complete" --POST .../complete--> upsert lesson_progress COMPLETED
                                                   --> evaluateCourseCompletion()
ModuleAssessmentModal --GET .../assessment--> [CREATES a quiz if none exists]
                      --POST .../submit--> grade server-side -> attempts + student_answers
                                        -> returns correct_option_id for every question
                                        --> evaluateCourseCompletion()
FinalAssessmentModal --GET .../final-assessment--> falls back to fabricated ID -> 0 questions
                                                   (header hides the button; sidebar shows it)
evaluateCourseCompletion:
   lessons  : count lesson_progress COMPLETED  in required lessons   [client-writable]
   modules  : count attempts passed=true       in MODULE_QUIZ ids    [client-writable]
   final    : passed attempt, OR true if no FINAL_ASSESSMENT exists  [always true today]
   -> all true -> UPDATE enrollments COMPLETED/100 -> issueCertificateForUser()
      -> insert certificates (no enrollment required, no unique on user+course)
```

### Journey 3 — Admin creates a course

`/admin/curriculum` → `fetchAdminCurriculumCourses` → open editor → `createModule` / `createLesson` / `createLessonResource` → `toggleCoursePublish`, which enforces a real guard (modules exist, no empty modules, every lesson has video or content).

**Gaps:** there is no endpoint to create a *course* — only to edit an existing one; there are no delete endpoints for modules, lessons or resources; there is no assessment authoring UI at all; and `publishAllCatalogCourses` flips `is_published` on every row while bypassing the guard entirely.

### Journey 4 — Content ingestion

Covered in §15. Failure points in order: no MIME enforcement → optional size check → deterministic path collides with the UNIQUE constraint on re-upload → no verification the object landed → synchronous PDF parse in-request → HTML written to `lessons.content` → source-PDF attachment insert fails silently → student viewer escapes the HTML.

### Journey 5 — Certificate verification

`/verify/:code` → `PublicCertificateVerificationPage` → `GET /api/certificates/verify/:code` → `.or()` lookup (injectable, year hardcoded) → profile name lookup → returns name, course title, issue date, status. **Works.** Separately, the `public_certificate_verifications` view lets anyone enumerate the same data in bulk without a code.
---

## 18. Frontend ↔ Backend Contract Issues

Every row was confirmed by reading both sides plus the migrations.

| # | Issue | Frontend | Backend / schema | Effect | Severity |
|---|---|---|---|---|---|
| 1 | `notEnrolled` flag does not exist | `LearningInterfacePage.tsx:69` | No handler returns it | Enrollment gate screen is unreachable | **High** |
| 2 | `overview.courseId` vs `overview.course.id` | `LearningInterfacePage.tsx:220` | Returns nested `course.id` | Gate's enroll button returns early, always | Medium |
| 3 | `assessments.type` / value `'FINAL'` | Consumes `hasFinalAssessment` | Column is `assessment_type`, value `FINAL_ASSESSMENT` | Query errors; flag permanently false; header hides final exam | **High** |
| 4 | `profiles.email` selected (2 sites) | Admin certificates page | Column never existed | `GET /admin/certificates` 500s; new certificates show a placeholder name | **High** |
| 5 | `courses.status` selected | Bulk import page | Column never existed | `GET /admin/bulk-import/summary` 500s | **High** |
| 6 | `lesson_resources.url` inserted (2 sites) | — | Column is `file_url NOT NULL` | Source PDF never attached; error not checked | **High** |
| 7 | HTML content rendered as text | `LessonRenderer.tsx:305,393` | Ingestion writes HTML | Students see raw tags | **Critical** |
| 8 | `?redirect=` written, never read | `CourseDetailPage:131` / `LoginPage:20` | n/a | Post-login return path lost | Medium |
| 9 | `paymentCompleted` threaded 3 layers | `CourseDetailPage` → `api.ts` | Destructured, never used | Implies a payment gate that does not exist | Medium |
| 10 | `hasFinalAssessment` honoured inconsistently | Header hides / sidebar always shows | — | Contradictory UI for the same state | Medium |
| 11 | Three response shapes for errors | Branches on `success` only | `{error:string}`, `{error:{...}}`, `{verified,error}` | Some errors render as `[object Object]` | Medium |
| 12 | HTTP status discarded | Every `api.ts` function | Correct codes are sent | 401 vs 500 indistinguishable; no re-auth prompt | Medium |
| 13 | Progress percentage computed twice | Player uses lessons-only | Engine uses 75/20/5 | Two different numbers for "progress" | Medium |
| 14 | `Certificate.enrollment_id` typed non-null | `database.types.ts:305` | Never written | Type asserts a value that is always null | Low |
| 15 | `ResourceType` missing 3 values | `database.types.ts:13` | 00005 added SUBTITLE, NOTEBOOK, VIDEO | Valid rows fail the declared type | Low |
| 16 | `LessonResource` missing 8 columns | `database.types.ts:197` | 00005 added them | Stale hand-written types | Low |
| 17 | No types for `course_materials` or checkpoints | `database.types.ts` | Tables exist since 00007/00008 | Those flows are entirely `any` | Low |

### TypeScript / type-safety assessment

**Critical type-safety problems** — these are what allowed the defects above to ship:

- `tsconfig.json` has **no `strict`, no `noImplicitAny`, no `strictNullChecks`**.
- `database.types.ts` is **hand-written, not generated** by `supabase gen types`, and has drifted from migrations 00005–00008. It cannot catch the four column-mismatch bugs — which is precisely why they survived.
- **Every API response is consumed as `any`.** `api.ts` returns `await res.json()` untyped; pages destructure fields that may not exist. This is the root cause of contract issues 1, 2, 10 and 13.
- **Two conflicting type systems.** `types/index.ts` declares camelCase mock-era shapes (`Course.rating`, `learnerCount`, `instructorName` — none of which exist in the database) while `types/database.types.ts` declares snake_case DB shapes. Both export `UserRole`, `ProgramType`, `Institution`, `Program` and `Course` with different definitions.

**Cosmetic type issues** — lower priority: implicit `any` on callback parameters, missing return type annotations, `any` used for React event handlers. Highest `any` counts: `services/api.ts` (70), `curriculum.controller.ts` (32), `materials.controller.ts` (25), `courses.controller.ts` (22).

---

## 19. Database Integrity Issues

Applying the "what if this request runs twice, concurrently?" test to every significant mutation:

| Mutation | Guard | Double-submit outcome | Severity |
|---|---|---|---|
| Enroll | `UNIQUE(user_id, course_id)` + 23505 handler | **Safe** — returns the existing row | — |
| Lesson progress upsert | `UNIQUE(user_id, lesson_id)` + `onConflict` | **Safe** | — |
| Certificate issuance | Read-then-write, **no unique constraint** | Two certificates, two codes, one course | **High** |
| Module assessment auto-create | **None** | Duplicate assessments → `maybeSingle()` errors → a new quiz on every request → module can never be passed | **Critical** |
| Assessment attempt insert | `count+1` then `UNIQUE(user,assessment,number)` | 23505 surfaced as "Failed to save attempt" | Medium |
| Attempt + answers | Two statements, no transaction, second error ignored | Scored attempt with no answer rows | Medium |
| Material upload complete | `storage_path UNIQUE` | 23505 with a raw error message; replace flow cannot work at all | **High** |
| Material delete | Storage first, DB second | ACTIVE row pointing at a deleted object | Medium |
| Bulk import | None | Re-imports and re-overwrites `lessons.content`; not idempotent | Medium |
| Module / lesson reorder | Sequential loop, errors ignored | Partial reorder, duplicate `display_order` values | Medium |
| Counselor lead | None | Unbounded duplicate leads; no rate limit on a public endpoint | Medium |

### Structural gaps

- **No transactions anywhere.** Every multi-step write is a sequence of independent PostgREST calls. There is no RPC or stored procedure in the schema.
- **Missing constraints:**
  - `UNIQUE(user_id, course_id)` on `certificates`
  - `UNIQUE(module_id, assessment_type)` and `UNIQUE(course_id, assessment_type)` on `assessments`
  - `UNIQUE(course_id, display_order)` on `modules`, `(module_id, display_order)` on `lessons`
  - A constraint tying `lesson_progress.course_id` to the lesson's actual course
  - A CHECK that each question has exactly one correct option
- **`ON DELETE RESTRICT` on `certificates` → `profiles`/`courses`/`enrollments`** means a user with a certificate cannot be deleted — a GDPR erasure request cannot be satisfied without manual intervention.
- **Orphan classes:** storage objects whose registration failed after PUT; `lesson_resources` rows pointing at absent objects; `lesson_progress` rows whose `course_id` does not match the lesson's course; auto-generated assessments for modules the user never had access to.
- **Missing indexes** for the hottest completion queries: `lesson_progress(user_id, course_id, status)`, `assessment_attempts(user_id, passed)`, `certificates(user_id, course_id)`, `enrollments(user_id, course_id)` composite, `assessments(module_id)`.

---

## 20. Performance & Scalability

Nothing here needs optimising today. These are the constraints that decide whether the platform survives growth.

### Real bottlenecks

- **Two auth round-trips on every authenticated request** (`auth.getUser` + a `profiles` lookup), rising to three on admin routes where `requireAdmin` re-fetches the profile `requireAuth` already attached. At 10k concurrently active students this doubles or triples Supabase auth-API load for zero functional benefit. **Highest-value fix.**
- **`evaluateCourseCompletion` issues 7–9 sequential queries** and runs on *every* lesson completion and every assessment submission. A student completing a 50-lesson course triggers roughly 400 queries. It should be one RPC or a single view.
- **`getCourseLearningOverview` is N+1 by construction:** after fetching modules it maps over them with `await hasPassedModuleAssessment(...)`, which itself performs two queries per module. An 11-module course costs 22 extra round-trips per page load.
- **No pagination on any list endpoint.** `/api/courses`, `/api/admin/course-materials`, `/api/admin/students`, `/api/admin/certificates` and the curriculum listings all return complete tables. Supabase silently caps responses at 1,000 rows, so these endpoints do not error as they grow — **they quietly start returning incomplete data**, which is worse.
- **Client-side filtering of server data.** Category filtering in `getCourses` and search in `getAdminMaterials` both fetch everything then filter in JavaScript.
- **Signed-URL fan-out.** `getLessonContent` and `getLessonAssets` call `createSignedUrl` per resource inside `Promise.all` — each is a network call to the storage API.
- **PDF parsing inside the request loop.** `executeBulkImport` holds every 100 MB buffer in memory sequentially and blocks the event loop during parsing. On a single Node process this stalls all other requests.
- **In-memory checkpoint store** forbids running more than one instance without behaviour changes, and grows without bound.
- **952 KB single JS chunk, no code splitting**, no lazy routes. Every visitor to the marketing homepage downloads the entire admin console.
- **No caching layer of any kind** — no HTTP cache headers, no CDN strategy, no in-process memoisation. The public catalogue, identical for every visitor, is recomputed per request.

### Projected behaviour

| Scale | Expected state |
|---|---|
| **1,000 students** | Functional. Auth round-trips and completion re-evaluation are noticeable but tolerable. Admin list pages start feeling slow |
| **10,000 students** | Row caps begin truncating admin lists silently. Bulk import and mass-populate reliably time out. Single-process CPU saturates during PDF work. Checkpoint state is lost on every deploy |
| **100,000 students** | Not viable without re-architecture: job queue for ingestion, cursor pagination everywhere, completion moved into a database function, profile caching, code splitting, and a horizontally scalable session/checkpoint store |

---

## 21. Code Quality & Technical Debt

### Files that are dangerous to modify

| File | Lines | Problem |
|---|---|---|
| `controllers/materials.controller.ts` | 1,061 | Twelve handlers spanning storage, PDF parsing, HTML generation, AI orchestration, bulk loops and a 2 KB content template. No service layer. 25 `any` |
| `pages/admin/AdminMaterialsPage.tsx` | 1,198 | Largest component in the codebase: upload wizard, extraction preview, lesson picker, bulk actions, filters — one function |
| `pages/public/ProgramDetailPage.tsx` | 1,132 | Renders fabricated data; a real implementation must replace it wholesale |
| `services/api.ts` | 1,080 | ~60 near-identical fetch wrappers. 70 `any`. No shared request helper, so a change to auth or error handling means 60 edits |
| `pages/public/HomePage.tsx` | 1,047 | Marketing copy, hardcoded ratings and layout in one component |
| `controllers/curriculum.controller.ts` | 955 | Fourteen handlers; each re-implements ordering and validation |
| `services/finalAssessment.service.ts` | 744 | ~410 lines of dead question data plus a dead in-memory store, wrapped around ~200 lines of live logic |
| `services/checkpoint.service.ts` | 626 | ~540 lines of hardcoded content; the whole feature is single-course |

### Cross-cutting debt

- **Duplicated inline logic:** the slug-vs-UUID regex appears six times; the JWT-shape validator is copy-pasted between `supabaseClient.ts` and `api.ts`; `isValidHttpUrl` is duplicated between `supabaseClient.ts` and `supabaseAdmin.ts`; the auth-header construction block is repeated ~60 times in `api.ts`.
- **Six one-off scripts in the repository root.** Two read `.env` by regex; `script.cjs` writes `db_out.txt` into the repo; `fix_constraint.ts` calls an RPC named `run_sql` that no migration defines, and duplicates work migration 00005 already did.
- **Phase labels are stale documentation.** Comments cite "Phase 4", "Phase 6D", "Phase 10A & 10B", "Phase 11A & 11C.4" while `/api/info` reports `phase: 4` and advertises features from later phases. `health.controller.ts` reports `version: '1.0.0-phase1'`.
- **No linter, no formatter, no pre-commit hooks, no CI.** `npm run lint` is `tsc --noEmit`, and with `strict` off it catches very little.
- **Coupling:** `learning.controller.ts` imports `resolveSignedAssetUrl` from `content.controller.ts` — a controller importing from another controller.
- **Testability:** services take no injected dependencies; every one imports the module-level `supabaseAdmin` singleton directly, so unit testing requires module mocking throughout.

### Documentation audit

| Source | Claim | Reality |
|---|---|---|
| `README.md` | "Run and deploy your AI Studio app"; prerequisites Node.js; set `GEMINI_API_KEY` in `.env.local`; run `npm run dev` | Describes a generic AI Studio starter. **No mention of Supabase, migrations, seed data, the LMS, or the required `SUPABASE_*` / `VITE_SUPABASE_*` variables.** Following it produces a non-functional app |
| `metadata.json` | "downloadable certificates" | `window.print()` only; `pdf_url` never populated |
| `/api/info` | `phase: 4`, lists "Secure Token-Based Enrollment" | Enrollment is not enforced anywhere downstream |
| Migration name `00009_storage_buckets` | Storage bucket configuration | Also enables RLS on `storage.objects` and adds three avatar policies |
| Comment in `moduleAssessment.service.ts:1-7` | "Hard-coded arrays are NOT used at runtime — they exist only in seed_assessments.mjs" | There is no `seed_assessments.mjs` in the repository; the comment describes a file that does not exist |
| Comment `// is_correct intentionally NOT selected` | Answer key not exposed | Accurate for the query — but the key is returned in the grading response |
| Comment in `content.controller.ts` "Direct-to-storage upload initialization" | — | Accurate |
| `populateMassLessonContent` response | "Mass AI lesson content population complete" | No AI is involved |

**Undocumented functionality:** the entire content-ingestion pipeline, the bulk-import engine, the AI quiz generator, the checkpoint system, the career-domain model and the certificate engine are absent from all documentation.

---

## 22. Testing & QA Assessment

**Testing maturity: zero.** There is no test file, no test runner, no test script, no fixture directory, no CI configuration and no coverage tooling anywhere in the repository. No Vitest, Jest, Playwright or Cypress dependency is declared.

### Genuine tests vs. debugging utilities

| Artifact | Classification | Assessment |
|---|---|---|
| `checkTables.ts` | Debug script | Prints `success_stories` and `articles` to stdout. **Not a test** — no assertions, no exit code |
| `query_db.cjs` | Debug script | Reads `.env` by regex; queries two hardcoded statistics lesson titles |
| `script.cjs` | Debug script | Same query as above, different implementation; writes `db_out.txt` into the repo |
| `fix_constraint.ts` | One-off migration hack | Calls a nonexistent `run_sql` RPC; duplicates migration 00005 |
| `createBuckets.ts` | Ops script | Reasonable and legitimately useful — duplicates migration 00009 imperatively |
| `seed.ts` | Seed script | Partial duplicate of the SQL seed |
| `src/backend/database/seed*.ts` | Seed modules | Orphaned — not imported, not scripted |
| `GET /api/health` | Monitoring endpoint | **Actively misleading.** `checkSupabaseConnectivity` calls `supabaseAdmin.auth.getSession()`, which reads local state and makes **no network request**, so it returns `connected: true` unconditionally — even with Supabase fully down. The overall status ORs it with the Postgres check, so `database.status` is always `"connected"` |

**No file in the repository qualifies as a production-quality automated test.**

### The tests that would have caught this audit's findings

1. **RLS policy tests as a non-privileged user.** A pgTAP or seeded-integration suite asserting that a student JWT cannot insert `assessment_attempts` with `passed=true`, cannot read `lessons` of unpublished courses, and cannot select from `public_certificate_verifications`. **This single suite covers four of the ten critical findings.**
2. **A schema-contract test.** Regenerate types from the live database and fail the build on drift. Catches all four column-mismatch bugs mechanically.
3. **Certificate-eligibility unit tests** over `evaluateCourseCompletion`: empty course, no enrollment, partial completion, duplicate module assessments, concurrent issuance.
4. **An end-to-end journey test** (register → enroll → complete → certificate → verify) against a seeded database.
5. **A render test for `LessonRenderer`** asserting that HTML in `lessons.content` produces elements rather than text nodes.
6. **Contract tests for every `api.ts` function** asserting the response shape the caller assumes.

---

## 23. Security Threat Model

### Unauthenticated attacker

| Capability | Severity |
|---|---|
| Enumerate all certificates, learner names and courses via `public_certificate_verifications` with the anon key alone | **CRITICAL** |
| Read every lesson body, module structure and question text — including unpublished drafts — via `USING (true)` policies | **CRITICAL** |
| Read all option text for every assessment via `public_question_options` | **HIGH** |
| Inject PostgREST filter terms through `/api/search?q=` and `/api/certificates/verify/:code` | **MEDIUM** |
| Flood `counselor_leads` — no rate limit, no CAPTCHA, on both the API and the direct INSERT policy | **MEDIUM** |
| Fingerprint the deployment via `/api/health` (environment name, which env vars are set) and `/api/info` | **LOW** |

### Authenticated student attacker

| Capability | Severity |
|---|---|
| Self-issue a verifiable certificate for any course, without enrolling (full chain §14.3) | **CRITICAL** |
| Consume any published course's full content and resource downloads without enrolling | **CRITICAL** |
| Force creation of assessments, questions and options for arbitrary module IDs, unbounded, via a GET — cheap write-amplification DoS | **CRITICAL** |
| Pass any auto-generated module quiz by always choosing option 1 | **HIGH** |
| Brute-force any hand-written quiz: unlimited attempts, answer key returned each time | **HIGH** |
| Write `lesson_progress` rows with mismatched `course_id`, corrupting analytics | **MEDIUM** |
| Role escalation, reading other students' data, reading `question_options.is_correct` directly, reading private storage objects | **BLOCKED** |

### API attacker (bypassing the UI)

Every gate the UI appears to enforce — enrollment, module locks, the final-exam entry point — is either absent server-side or trivially satisfiable. The one genuine server-side gate is `checkFinalAssessmentEligibility`, and it guards a feature that does not work. **Direct API use is strictly more capable than the UI.**

### Malicious or compromised admin

- No audit log of any kind. No record of who published a course, edited a lesson, deleted a material or generated a quiz.
- No confirmation or guard on destructive bulk operations: `publish-all` and `mass-populate` rewrite the entire catalogue in one click.
- An admin can inject AI-generated questions into any assessment on the platform, including other courses' finals.
- Articles are rendered with `dangerouslySetInnerHTML`, so an admin can plant stored XSS that harvests `localStorage` session tokens from every reader.
- Admin promotion has no in-product path, so it also has no in-product revocation and no trail.

### Database attacker

RLS provides meaningful protection **only** for cross-student data isolation (§10.1) and the `question_options` answer key. It provides none for course content, certificates-in-aggregate, or the integrity of completion data. The service-role key bypasses all of it.

### Storage attacker

Private buckets have no RLS policies, so objects are reachable only via server-minted signed URLs. `lesson_resources.file_url` path disclosure (§10.3) reveals object *paths* but not content. **This is the best-defended layer in the system.** The exceptions: one-year signed URLs intended for database persistence, and seven unused public buckets.

### Credential exposure

| Secret | Location | Reaches browser? | Severity |
|---|---|---|---|
| Supabase **service_role** JWT | `.env.example` (committed, explicitly un-ignored) and `src/backend/database/supabaseAdmin.ts:7` as a hardcoded fallback constant | **No** — verified absent from `dist/assets/index-*.js`; present in `dist/server.cjs` | **CRITICAL** |
| Supabase project URL + anon key | `.env.example`, `src/lib/supabaseClient.ts:6-7` | Yes — by design | INFORMATIONAL |
| `JWT_SECRET` | `.env.example`, `config/env.ts` default | No | LOW — never used, but implies a control that does not exist |
| `GEMINI_API_KEY` | Environment only | No | **Correct** |

The service-role key defeats every RLS policy in the database and can read, modify or delete all user data. It is committed in `.env.example` and hardcoded as a fallback so that the server starts *successfully* without configuration — meaning a misconfigured deployment silently uses the baked-in production credential instead of failing. **It must be treated as compromised and rotated.**

### Infrastructure

| Gap | Severity |
|---|---|
| No `helmet`: no HSTS, CSP, `X-Content-Type-Options` or frame protections | MEDIUM |
| No CORS configuration — same-origin by deployment accident, not by policy | MEDIUM |
| No rate limiting on any route, including login, lead submission and the AI endpoint | MEDIUM |
| `express.json()` with no `limit`; bulk-import body is unbounded in item count | MEDIUM |
| Error handler returns stack traces whenever `NODE_ENV !== 'production'` | MEDIUM |
| No request IDs, no structured logs, no error tracking, no alerting | LOW |
---

## 24. Findings Register

Stable IDs for cross-referencing in follow-up work. Every finding was traced across at least two layers before being recorded.

| ID | Severity | Finding | Evidence | Impact | Recommended direction |
|---|---|---|---|---|---|
| **APX-01** | CRITICAL | Live service-role key hardcoded in source and committed | `supabaseAdmin.ts:7`; `.env.example`; compiled into `dist/server.cjs` | Full read/write/delete on all data, bypassing RLS; misconfigured deploy silently uses the production credential | Rotate the key; remove both constants; fail fast at startup when the env var is absent |
| **APX-02** | CRITICAL | RLS lets students write the rows the completion engine trusts | `00002_rls_policies.sql:195-207` vs `courseCompletion.service.ts:311,332` | Student sets `passed=true` / `status='COMPLETED'` via PostgREST; grading bypassed entirely | Revoke direct INSERT/UPDATE from `authenticated`; route all writes through the API |
| **APX-03** | CRITICAL | Empty courses complete instantly for anyone | `courseCompletion.service.ts:320,341,367` | Any published course with no requirements issues a certificate on first trigger | Require a non-zero requirement count; block certificate-enabled publishing for such courses |
| **APX-04** | CRITICAL | Certificates issued without an enrollment | `courseCompletion.service.ts:375`; `certificate.service.ts:36`; `enrollment_id` never written | Unenrolled user receives a verifiable credential; untraceable to an enrollment | Require an active enrollment; populate `enrollment_id`; make it `NOT NULL` after backfill |
| **APX-05** | CRITICAL | Certificate-verification view leaks all learner PII to anonymous users | `00001_initial_schema.sql:381`; no `GRANT`/`REVOKE`/`security_invoker` anywhere | Unfiltered join of certificates, full names and course titles readable with the anon key | Drop both views (neither is used) or set `security_invoker = true` and revoke from `anon` |
| **APX-06** | CRITICAL | All course content is world-readable, including unpublished drafts | `00002_rls_policies.sql:119-158` | Anyone dumps the entire curriculum and question bank with the anon key | Scope reads to published courses plus an enrollment check; revoke `questions` from `anon` |
| **APX-07** | CRITICAL | Learning API never enforces enrollment; the endpoint that does is unwired | `learning.controller.ts:78,205` vs `content.controller.ts:519-535` | Any logged-in user reads full content and signed resource URLs for any published course | Add a shared `requireEnrollment(courseId)` guard to all `/learn/*` handlers |
| **APX-08** | CRITICAL | Auto-generated module quizzes are trivially passable and content-free | `moduleAssessment.service.ts:51-71` | The only real completion gate is defeated by clicking option 1 ten times | Remove auto-generation; treat a module with no authored quiz as having no quiz requirement |
| **APX-09** | CRITICAL | A GET endpoint performs unbounded privileged writes | `moduleAssessment.service.ts:26-81`; no unique constraint; `moduleId` ownership unchecked | Any user creates assessments for arbitrary modules; duplicates make modules permanently uncompletable | Never write from a GET; add the unique constraint; verify module↔course |
| **APX-10** | CRITICAL | Ingested HTML is rendered as escaped text to students | `LessonRenderer.tsx:305,393`; `AdminMaterialsPage.tsx:1177` previews it correctly | Every imported lesson shows literal markup to learners while looking correct to admins | Settle on one content format; render sanitised HTML or convert the pipeline to Markdown |
| **APX-11** | HIGH | Unlimited attempts + answer key returned on every submission | `moduleAssessment.service.ts:240,292`; `max_attempts` unread | Any quiz is brute-forceable to 100% | Enforce `max_attempts`; withhold correct answers until a pass or the final attempt |
| **APX-12** | HIGH | No `FINAL_ASSESSMENT` row is ever created; service falls back to a fabricated ID | Repo-wide grep; `finalAssessment.service.ts:534` | Final exam renders zero questions; completion treats it as passed | Build assessment authoring; make a missing required final block completion |
| **APX-13** | HIGH | `assessments.type` column does not exist | `learning.controller.ts:145` | `hasFinalAssessment` always false; header and sidebar disagree | Use `assessment_type = 'FINAL_ASSESSMENT'`; honour the flag in both components |
| **APX-14** | HIGH | `profiles.email` column does not exist (2 sites) | `certificate.service.ts:57`; `admin.controller.ts:33` | Admin certificates page 500s; issued certificates show a placeholder name | Select only real columns; source email from `auth.users` via the admin API if needed |
| **APX-15** | HIGH | `courses.status` column does not exist | `materials.controller.ts` `getBulkImportSummary` | Bulk-import summary endpoint 500s | Derive status from `is_published` |
| **APX-16** | HIGH | `lesson_resources.url` column does not exist; error unchecked (2 sites) | `materials.controller.ts:689,949` | Source PDF never attached to imported lessons; failure invisible | Use `file_url`; check every insert error |
| **APX-17** | HIGH | Material replace / versioning cannot work | Deterministic path in `initMaterialUpload` vs `storage_path UNIQUE` + soft delete | Version 2 uploads fail; deleted filenames can never be reused | Add a version or timestamp segment; scope the unique constraint to active rows |
| **APX-18** | HIGH | Migration 00004 mass-deletes all learner data | `00004_catalog_reset_and_career_domains.sql:7-24` | Replaying migrations erases enrollments, progress, attempts and certificates | Neutralise the file; move resets to a guarded, separately-invoked script |
| **APX-19** | HIGH | Duplicate certificates possible | No `UNIQUE(user_id, course_id)`; read-then-write, no transaction | Two credentials for one course completion | Add the unique constraint; upsert on conflict |
| **APX-20** | HIGH | Public program pages serve fabricated data | `data/programsData.ts:329` | Invented fees, ratings, review counts and cohort dates presented as real | Back the pages with the API, or remove the fabricated fields until real data exists |
| **APX-21** | HIGH | "AI lesson population" writes an identical hardcoded template | `materials.controller.ts` `populateMassLessonContent` | Filler text delivered as curriculum; success message claims AI | Remove or rename and gate it; never overwrite authored content |
| **APX-22** | HIGH | Checkpoint answer keys world-readable | `00007_lesson_checkpoints.sql:42` | Latent: `is_correct` exposed the moment the tables are populated | Restrict SELECT to non-answer columns via a view or column grants |
| **APX-23** | HIGH | `publish-all` bypasses the publish guard | `courses.controller.ts` `publishAllCatalogCourses` | Publishes empty courses, which then auto-complete (APX-03) | Route it through the same validation, or delete it |
| **APX-24** | HIGH | Institutions "Request a Demo" form discards every submission | `InstitutionsPage.tsx:59-63` | Partnership leads silently dropped while the user is told they will be contacted within 24 hours | Wire it to a real endpoint or remove the form |
| **APX-25** | MEDIUM | PostgREST filter injection in 5 `.or()` calls | `public.controller.ts:138-141`; `courses.controller.ts:57`; `certificate.service.ts:237` | Unescaped input alters query filters; unauthenticated reachable | Escape/quote values or use `textSearch` / parameterised RPC |
| **APX-26** | MEDIUM | Health check always reports "connected" | `supabaseAdmin.ts:48` uses `auth.getSession()` | Monitoring cannot detect a database outage | Issue a real `SELECT` against a known table |
| **APX-27** | MEDIUM | Login ignores `?redirect=` | `CourseDetailPage:131` vs `LoginPage:20` | Enroll → login → return journey breaks | Read the query param; keep `location.state.from` as fallback |
| **APX-28** | MEDIUM | Completion banner asserts unearned achievements | `LearningInterfacePage.tsx:297-307` | Claims module and final assessments passed based on lesson count alone | Drive the banner from the completion summary |
| **APX-29** | MEDIUM | Checkpoint attempts stored in process memory | `checkpoint.service.ts:31` | Lost on restart; blocks horizontal scaling; unbounded growth | Move to the `student_checkpoint_attempts` table created in 00007 |
| **APX-30** | MEDIUM | Upload validation gaps | `content.controller.ts:22-31,80`; discarded `uploadedFile` | MIME allow-list unused; size check skippable; unverified objects registered | Enforce MIME server-side; require `fileSize`; assert the object exists |
| **APX-31** | MEDIUM | No transactions; partial writes across the board | Attempt+answers, delete flows, reorder loops | Inconsistent state after any mid-sequence failure | Move multi-step mutations into Postgres RPCs |
| **APX-32** | MEDIUM | Migrations 00007 and 00009 are not replayable | Bare `CREATE POLICY` statements | Fresh-environment provisioning fails partway | Guard each with `DROP POLICY IF EXISTS` |
| **APX-33** | MEDIUM | Mock surfaces presented as functional features | Admin programs/students/dashboard, `/student/assessment/:id`, institutions list, enterprise metrics | Operators may act on fabricated numbers | Wire the existing endpoints or mark the pages unavailable |
| **APX-34** | MEDIUM | Missing infrastructure middleware | `server.ts` | No helmet, CORS, rate limiting or body cap; stacks leak when `NODE_ENV` is unset | Add helmet, explicit CORS, rate limits on auth/leads/AI, and a body limit |
| **APX-35** | MEDIUM | Unsanitised article HTML rendered to the public | `ResourceDetailPage.tsx:121` | Stored XSS by an admin; session tokens live in `localStorage` | Sanitise on render |
| **APX-36** | MEDIUM | Fake certificate verifier in the source | `VerifyCertificatePage.tsx`, imported at `AppRoutes.tsx:19`, not routed | Returns "AUTHENTIC & VERIFIED" for any input if ever wired | Delete the file and the import |
| **APX-37** | MEDIUM | AI output inserted without validation | `materials.controller.ts` `generateQuizFromMaterial` | Questions with zero or multiple correct options become ungradable; any `assessment_id` accepted | Validate exactly one correct option; verify the assessment belongs to the material's course |
| **APX-38** | MEDIUM | Enrollment ignores `is_free`; `paymentCompleted` is dead | `enrollments.controller.ts:13` | No monetisation path despite fee fields in `programs` | Decide explicitly: remove the flag, or build the gate |
| **APX-39** | MEDIUM | No pagination on any list endpoint | All list controllers | Silent truncation at Supabase's 1,000-row cap | Cursor pagination on catalogue and admin lists |
| **APX-40** | MEDIUM | Current database contents are not reproducible | Orphaned `seedCurriculumBatch1.ts` / `seedStatisticsLessons.ts`; seed SQL invalidated by 00004 | No way to stand up an equivalent environment | Promote the TS seeds to invocable scripts and reconcile with migrations |
| **APX-41** | LOW | No error boundary in the React tree | Repo-wide grep | One render exception blanks the app | Add a top-level boundary with a recovery path |
| **APX-42** | LOW | `is_admin()` has a mutable `search_path` | `00002:32-40` | Standard Supabase lint; low exploitability | `SET search_path = public, pg_temp` |
| **APX-43** | LOW | Seven unused public storage buckets | `00002:271-282` | Unnecessary public surface | Remove |
| **APX-44** | LOW | Two lockfiles, no declared package manager | `package-lock.json` + `bun.lock` | Non-deterministic installs | Pick one; add `packageManager` and `engines` |
| **APX-45** | LOW | Repository is not under version control | No `.git` directory | No history, no rollback, no review | `git init` before any remediation work begins |
| **APX-46** | LOW | README describes a different project | `README.md` | Documents an AI Studio starter with no mention of Supabase, migrations or the LMS | Rewrite with real setup, migration order and env requirements |
| **APX-47** | LOW | Accessibility largely absent | 12 of 60 component files have any a11y attribute | Modals lack focus traps; no skip links; no `aria-live` | Accessibility pass on the player and admin console |

---

## 25. Risk Heatmap

### 🔴 Critical — must be resolved before any real student uses the platform

`APX-01` leaked service-role key · `APX-02` client-writable completion inputs · `APX-03` empty courses auto-complete · `APX-04` certificates without enrollment · `APX-05` certificate PII view · `APX-06` world-readable curriculum · `APX-07` unenforced enrollment · `APX-08` trivially passable quizzes · `APX-09` write-amplification via GET · `APX-10` HTML rendered as text

### 🟠 High — broken journeys and integrity gaps; address immediately after

`APX-11` unlimited attempts · `APX-12` no final assessment exists · `APX-13`–`APX-16` four column mismatches · `APX-17` broken versioning · `APX-18` destructive migration · `APX-19` duplicate certificates · `APX-20` fabricated program pages · `APX-21` filler content · `APX-22` checkpoint answer keys · `APX-23` publish-all bypass · `APX-24` discarded partnership leads

### 🟡 Medium — important, not launch-blocking

`APX-25`–`APX-40`: filter injection, false health signal, lost redirect, misleading banner, in-memory checkpoints, upload validation, transactions, migration replay, mock surfaces, missing middleware, article XSS, fake verifier, AI validation, payment ambiguity, pagination, seed reproducibility

### 🟢 Low — quality and hygiene

`APX-41`–`APX-47`: error boundary, function search_path, unused buckets, lockfiles, version control, documentation, accessibility

---

## 26. What Is Actually Working

Classified by evidence strength, **not** by whether code exists.

### Confirmed working — logic traced end to end

- Registration, login, password reset and session persistence via Supabase GoTrue.
- Automatic profile creation through the `handle_new_user` trigger, with `STUDENT` hardcoded.
- Token verification in `requireAuth` and role verification in `requireAdmin` — correct, network-verified, never trusting client claims.
- Role-escalation prevention on `profiles` — the UPDATE policy's snapshot comparison genuinely blocks self-promotion.
- Enrollment creation: idempotent, race-safe, identity from the JWT.
- Server-side grading of module and final assessments, with `is_correct` excluded from student-facing queries.
- Certificate ownership enforcement in `getCertificateForOwner` — no IDOR.
- Public certificate verification by code (the happy path).
- Course publish guard in `toggleCoursePublish`, with structured blockers.
- Counselor-lead validation — the most rigorous input handling in the codebase.
- Curriculum CRUD for modules, lessons and resources (create and update).
- Career-path mapping: `program_courses` add, remove and list.
- Direct-to-storage signed-URL upload for both materials and lesson assets.
- PDF text extraction and HTML conversion, including HTML escaping of PDF content.
- The service-role key does not reach the browser bundle.

### Probably working — correct by inspection, unverified at runtime

- Public catalogue, course detail, articles, success stories, search and institution detail — all query real tables with plausible queries, subject to the row cap.
- My Learning and student certificate lists.
- Signed-URL generation for lesson resources (fails open to a raw path, so failures are silent).
- AI quiz generation — the call is well-formed; output correctness is unverified and unvalidated.
- Admin curriculum, courses, content, assessments and inquiries listings.

### Partially implemented

- **Learning player** — renders and navigates, but without enrollment enforcement, with escaped HTML, and with a completion banner that overstates progress.
- **Checkpoints** — work for 44 hardcoded lessons, in memory only.
- **Module assessments** — the grading engine is real; the content it grades is auto-generated filler.
- **Certificates** — issued and verifiable, but under the wrong preconditions and with a placeholder name on issuance.
- **Materials repository** — upload, list, download and extract work; replace, versioning and PDF attachment do not.
- **Bulk import** — the execute path works; the summary endpoint that drives its UI returns 500.

### Broken

- `GET /api/admin/certificates` — nonexistent `profiles.email`.
- `GET /api/admin/bulk-import/summary` — nonexistent `courses.status`.
- Final assessment, end to end — no row is ever created; zero questions; submission fails.
- `hasFinalAssessment` — permanently false.
- Source-PDF attachment to lessons — nonexistent `lesson_resources.url`.
- Material replace and versioning.
- Student name on newly issued certificates.
- Lesson HTML rendering for students.
- The enrollment gate screen and its enroll button in the player.
- Post-login redirect back to a course.
- The health endpoint's database signal.
- The institutions partnership demo form.

### Unknown — requires runtime verification

- Whether `tsc --noEmit` and `vite build` currently succeed (`node_modules/` is absent).
- Whether `anon` actually holds SELECT on the two views — the conclusion follows from Supabase defaults plus the absence of any `GRANT`/`REVOKE`, but one query would confirm it.
- Which migrations have actually been applied to the live project, and in what order.
- Whether the live database contains any `FINAL_ASSESSMENT` row, and how many duplicate module assessments already exist.
- Whether email confirmation is enabled in the Supabase dashboard.
- How much of the catalogue currently holds the hardcoded filler template.
- Whether the 44 checkpoint lesson IDs still match live lesson rows.
- Whether orphaned storage objects already exist.
- Whether admin tables overflow on narrow viewports.

---

## 27. What Is Incomplete

- **Assessment authoring.** No UI or endpoint creates an assessment, a question or an option. Content arrives only via auto-generation, AI generation, or the obsolete SQL seed. **This is the single largest functional gap: the LMS cannot author the thing it certifies.**
- **Course creation and deletion.** Curriculum management can edit an existing course but cannot create one, and there are no delete endpoints for modules, lessons or resources.
- **Admin dashboard.** Static shell with em-dash placeholders; no aggregate query exists.
- **Student management.** The endpoint exists, the page uses mock data.
- **Program management.** Same — endpoint exists, page is mock, and public program pages are fabricated.
- **Enterprise inquiries.** Table and RLS policy exist; no endpoint, no form. The admin "Inquiries" page shows counselor leads instead.
- **Institution partnership leads.** Form exists, discards input, no table target.
- **Lead lifecycle.** `counselor_leads.status` supports four states; nothing can change it.
- **Certificate revocation.** Supported by the schema and honoured by verification; unreachable.
- **Certificate PDFs.** `pdf_url` and the `certificates` bucket are unused; "download" is browser print.
- **Checkpoints as a platform feature.** Tables exist and are unused; content is hardcoded for one course.
- **Lesson standard-model fields.** `learning_objectives`, `key_takeaways` and `practical_instructions` (migration 00006) are read by the API but no admin field writes them.
- **Lesson resource metadata.** The eight columns from migration 00005 are written by nothing.
- **Payments.** A `paymentCompleted` flag threaded through three layers and discarded; `programs.fee` and `is_free` are never enforced.
- **Notifications, email, discussions, instructor tooling, analytics.** Not present in any form.

---

## 28. Dead, Duplicate & Legacy Code

Inventory only — **no deletion is recommended until the intended behaviour of each area is settled.**

| Item | Size | Classification |
|---|---|---|
| `services/finalAssessment.service.ts` — `rawFinalQuestions`, `finalAttemptsStore` | ~410 ln | Dead data; only four title/percentage fallbacks are read |
| `services/checkpoint.service.ts` — `rawCheckpoints` | ~540 ln | Live but single-course and in-memory; superseded by migration 00007's unused tables |
| `database/seedCurriculumBatch1.ts`, `seedStatisticsLessons.ts` | 636 ln | Orphaned — not imported, not scripted, yet they define the current catalogue |
| `supabase/seed/00001_seed_data.sql` | 618 ln | Obsolete — its categories and courses are deleted by migration 00004 |
| `pages/public/VerifyCertificatePage.tsx` | 112 ln | Imported but unrouted; a fake verifier that approves any input |
| `pages/student/AssessmentPage.tsx` | 192 ln | Routed and reachable; entirely mock, client-graded |
| `pages/admin/AdminProgramsPage.tsx`, `AdminStudentsPage.tsx` | 176 ln | Mock data; their real endpoints are unused |
| `types/index.ts` | 81 ln | Legacy mock-era types conflicting with `database.types.ts` |
| Root scripts × 6 | ~180 ln | Debug and one-off ops scripts committed to the repo root |
| `backend/config/env.ts` — `jwtSecret`, `jwtExpiresIn`, `databaseUrl` | — | Never read; implies controls that do not exist |
| `backend/database/connection.ts` | 65 ln | pg Pool with no `DATABASE_URL`; used only by the health check, which always fails on it |
| Unused API endpoints | 11 | Listed in §8.4 — including the correctly-gated `content-access` route |
| Unused `api.ts` exports | 8 | `fetchApiInfo`, `fetchInstitutions`, `updateContentAsset`, `fetchStudentLessonContentAccess`, `fetchCertificateById`, `claimCourseCertificate`, `fetchAdminPrograms`, `fetchAdminStudents` |
| `ALLOWED_MIME_TYPES`, `uploadedFile`, `paymentCompleted` | — | Computed and discarded — each represents a control the reader would assume exists |
| Seven public storage buckets from 00002 | — | Created, never referenced |
| `motion` dependency | — | Declared, imported nowhere |
| `scratch/`, `assets/.aistudio/` | — | Empty / platform residue |
| `dist/` | 1.7 MB | Generated, gitignored, **not stale** (dated with source). Contains the service-role key |

---

## 29. Production Readiness

**If this were deployed to real students tomorrow, in order of how quickly it would hurt:**

1. **Certificates would be worthless within days.** The first student who opens developer tools — or reads the anon key in the bundle — can mint credentials for any course. Once issued they are indistinguishable from legitimate ones and cannot be revoked through the product.
2. **Every learner's name and completed course would be publicly enumerable.** A single unauthenticated request against the verification view returns the full roster. That is a reportable data-protection incident, not just a bug.
3. **Imported lessons would display raw HTML tags.** Highly visible, immediately embarrassing, and it affects every lesson populated through the ingestion pipeline.
4. **Course content would leak wholesale.** The entire curriculum, including unpublished drafts and every question, is readable with the public key.
5. **The final assessment would be broken for every student who reaches it** — the sidebar offers it, the exam has no questions, submission errors out.
6. **Two admin pages would show a 500.** Certificates and bulk-import summary.
7. **Module quizzes would be revealed as meaningless** — ten identical questions with the answer always first.
8. **The database would accumulate duplicate assessments** under concurrent load, at which point affected modules become permanently uncompletable and support has no diagnostic path.
9. **Materials could not be replaced** once uploaded, and deleted filenames could never be reused.
10. **Any deploy would lose checkpoint attempt history**, and running more than one instance would make it random.
11. **Bulk operations would time out** on any realistic catalogue, leaving partial state with no resume.
12. **Partnership and enterprise leads would be silently lost** while users are told they will be contacted.
13. **No monitoring signal would be trustworthy** — the health endpoint reports "connected" during a total database outage.
14. **There would be no way to diagnose anything.** No audit log, no request IDs, no structured logs, no error tracking, no tests, and no version history to bisect.

Two constraints compound all of the above: **the service-role key must be assumed compromised**, and **the repository has no version control**, so remediation would begin without the ability to review or roll back changes.
---

## 30. Recommended Engineering Roadmap

Ordered by dependency, not by ease. Each phase assumes the previous one is complete.

### Phase 0 — Blockers

**Nothing else should start before this phase lands.** Two prerequisites come first, in this order.

#### 0.a — Initialise version control

- **Problem:** the working tree is not a git repository (`APX-45`).
- **Why it matters:** every change below needs a baseline to diff against and revert to.
- **Files affected:** none — purely additive.
- **Dependencies:** none.
- **Risk of changing it:** zero.
- **Approach:** `git init`, add a `.gitignore` review pass, commit the tree as-is as the audit baseline.
- **Priority:** P0.

#### 0.b — Rotate and remove the service-role key

- **Problem:** a live service-role JWT is hardcoded in source and committed to `.env.example` (`APX-01`).
- **Why it matters:** it defeats every RLS policy and can read, modify or delete all user data. It must be assumed compromised.
- **Files affected:** `src/backend/database/supabaseAdmin.ts`, `.env.example`, deployment configuration, `dist/` (rebuild).
- **Dependencies:** 0.a.
- **Risk of changing it:** the app stops starting without correct configuration — which is the intended behaviour.
- **Approach:** rotate in the Supabase dashboard; delete `DEFAULT_SERVICE_ROLE_KEY`; replace with a startup assertion that throws when `SUPABASE_SERVICE_ROLE_KEY` is absent; scrub `.env.example`; rebuild.
- **Priority:** P0.

#### 0.1 — Close the direct-database write channel (`APX-02`)

- **Problem:** students can write `lesson_progress` and `assessment_attempts` rows that the completion engine trusts.
- **Why it matters:** it invalidates every credential the platform issues.
- **Files affected:** a new migration under `supabase/migrations/`.
- **Dependencies:** confirm no frontend code writes these tables directly — this audit found none; all writes already go through the API.
- **Risk of changing it:** low, and directly testable.
- **Approach:** revoke `INSERT`/`UPDATE` on both tables from `authenticated` so only the service role writes them; keep the ownership-scoped `SELECT` policies intact.
- **Priority:** P0.

#### 0.2 — Fix the completion contract (`APX-03`, `APX-04`)

- **Problem:** empty courses complete vacuously, and completion does not require an enrollment.
- **Files affected:** `src/backend/services/courseCompletion.service.ts`, `certificate.service.ts`, a migration for `enrollment_id`.
- **Risk of changing it:** medium — certificates already issued under the old rules stay valid; decide explicitly whether to audit and revoke them.
- **Approach:** require an active enrollment and at least one satisfied requirement; return `certificateEligible: false` for courses with no requirements; populate `certificates.enrollment_id`.
- **Priority:** P0.

#### 0.3 — Remove the two RLS-bypassing views (`APX-05`)

- **Problem:** `public_certificate_verifications` exposes all learner PII to anonymous users; `public_question_options` bypasses the answer-key policy.
- **Files affected:** a new migration.
- **Dependencies:** run one query as `anon` first, both to confirm exposure and to size the incident.
- **Risk of changing it:** very low — both views are referenced by zero lines of code.
- **Approach:** drop both. If verification-by-view is wanted later, rebuild with `security_invoker = true` and a code predicate.
- **Priority:** P0.

#### 0.4 — Scope content reads (`APX-06`)

- **Problem:** `modules`, `lessons`, `lesson_resources` and `questions` are readable by anyone with the anon key, including unpublished drafts.
- **Files affected:** a new migration.
- **Risk of changing it:** medium — public course-detail pages read curriculum metadata via the API (service role) and are unaffected, but verify no browser-side query depends on the old policies.
- **Approach:** replace `USING (true)` with predicates joining to `courses.is_published`, plus an enrollment check for non-preview lessons; revoke `questions` from `anon`.
- **Priority:** P0.

#### 0.5 — Enforce enrollment in the learning API (`APX-07`)

- **Problem:** `/learn/*` returns full content to any logged-in user.
- **Files affected:** `learning.controller.ts`, `content.controller.ts`.
- **Dependencies:** none — the correct logic already exists in `getStudentLessonContentAccess`.
- **Risk of changing it:** low.
- **Approach:** extract that check into a shared `requireEnrollment(courseId)` guard and apply it to all `/learn/*` handlers, allowing `is_preview` lessons and admin preview.
- **Priority:** P0.

#### 0.6 — Stop auto-generating assessments (`APX-08`, `APX-09`)

- **Problem:** a GET creates trivially passable quizzes, unbounded, for arbitrary module IDs.
- **Files affected:** `moduleAssessment.service.ts`, `learning.controller.ts`, a migration for the unique constraints.
- **Dependencies:** run a cleanup query first to find and merge modules that already have duplicate assessments.
- **Risk of changing it:** **high** — modules that relied on generated quizzes lose them, which changes completion state for in-flight students. Handle deliberately, with a communication plan.
- **Approach:** delete the creation block; return `null` when no quiz exists and treat that module as having no quiz requirement; add `UNIQUE(module_id, assessment_type)` and `UNIQUE(course_id, assessment_type)`; verify `moduleId` belongs to the course.
- **Priority:** P0.

#### 0.7 — Neutralise migration 00004 (`APX-18`)

- **Problem:** replaying migrations erases all learner data.
- **Files affected:** `supabase/migrations/00004_catalog_reset_and_career_domains.sql`, a new guarded reset script.
- **Risk of changing it:** none to running systems; prevents a catastrophic replay.
- **Approach:** move the `DELETE` block into a separately-invoked, guarded script; leave only the category upserts in the migration.
- **Priority:** P0.

---

### Phase 1 — Critical Stability

Broken journeys that Phase 0 does not touch. Mostly small, high-confidence fixes with visible payoff.

| Item | Findings | Files | Risk | Priority |
|---|---|---|---|---|
| Fix the four column mismatches | `APX-13`–`APX-16` | `learning.controller.ts`, `certificate.service.ts`, `admin.controller.ts`, `materials.controller.ts` | Minimal | P1 |
| Render lesson content correctly | `APX-10` | `LessonRenderer.tsx`, `materials.controller.ts` | Medium — existing `lessons.content` rows must be audited for which format they hold | P1 |
| Enforce `max_attempts`; withhold the answer key until a pass or the final attempt | `APX-11` | Both assessment services | Low | P1 |
| Add `UNIQUE(user_id, course_id)` to `certificates`; upsert on conflict | `APX-19` | Migration + `certificate.service.ts` | Medium — de-duplicate existing rows first | P1 |
| Fix the material path scheme (version segment; scope the unique constraint to active rows) | `APX-17` | `materials.controller.ts` + migration | Medium | P1 |
| Route `publish-all` through the publish guard, or delete it | `APX-23` | `courses.controller.ts` | Low | P1 |
| Fix the login redirect | `APX-27` | `LoginPage.tsx` | Minimal | P1 |
| Drive the completion banner from the completion summary | `APX-28` | `LearningInterfacePage.tsx` | Low | P1 |
| Make the health check real | `APX-26` | `supabaseAdmin.ts` | Minimal — do this before anything else is monitored | P1 |
| Escape the five `.or()` interpolations | `APX-25` | `public.controller.ts`, `courses.controller.ts`, `certificate.service.ts` | Low | P1 |
| Add helmet, CORS, rate limits and a body cap | `APX-34` | `server.ts` | Low — verify CORS does not break the SPA origin | P1 |
| Wire or remove the institutions demo form | `APX-24` | `InstitutionsPage.tsx` | Low | P1 |

---

### Phase 2 — Architecture

Structural corrections that make the rest of the work cheaper. Highest value first.

1. **Generate database types and enforce them at the API boundary.** Replace hand-written `database.types.ts` with `supabase gen types` output, enable `strict`, and type every `api.ts` response. *Why first:* all four column-mismatch bugs were type-detectable. This converts a class of production incidents into build failures. *Risk:* enabling `strict` surfaces many errors at once — do it behind a per-directory ratchet rather than repo-wide.
2. **Introduce a single request helper in `api.ts`** that checks `res.ok`, normalises the three error shapes and attaches auth once. Collapses ~60 duplicated wrappers and makes 401 handling possible. *Affects:* `services/api.ts` and every caller.
3. **Move multi-step mutations into Postgres RPCs** (`APX-31`): attempt+answers, certificate issuance, material replace. Gets real transactions without adding infrastructure.
4. **Collapse `evaluateCourseCompletion` into one query or RPC** — it is both the correctness centre and the performance centre of the system.
5. **Reuse the profile from `requireAuth` in `requireAdmin`**; remove the redundant `requireAuth, requireAdmin` route pairs.
6. **Split `materials.controller.ts`** into storage, extraction and import services. It is the file most likely to be edited next and the most dangerous to edit.
7. **Move checkpoints to the database** (`APX-29`) using the tables migration 00007 already created, with a restricted read path that excludes `is_correct` (`APX-22`).
8. **Build assessment authoring** — the largest functional gap. Without it the platform cannot produce the assessments its certificates depend on. *Dependency:* Phase 0.6, which removes the auto-generation that currently masks the gap.

---

### Phase 3 — UX & Product Quality

- **Resolve the mock surfaces** (`APX-20`, `APX-33`). Back `/programs/*` with the `programs` table or strip the fabricated fees, ratings and cohort dates. Wire the admin students and programs pages to their existing endpoints. Build the admin dashboard's aggregate query. Remove or clearly mark `/student/assessment/:id`.
- **Replace the filler-content generator** (`APX-21`) with genuine authoring, and never let it overwrite authored content.
- **Delete the fake verifier** (`APX-36`) and its import.
- **Add an error boundary** (`APX-41`), consistent loading and empty states, and replace `alert()` with the inline pattern used elsewhere.
- **Sanitise article HTML** (`APX-35`).
- **Certificate PDFs** — generate server-side into the unused `certificates` bucket and populate `pdf_url`, so "download" means what the product says it means.
- **Add certificate revocation** — the schema supports it and verification already honours it.
- **Accessibility pass** (`APX-47`) on the player and admin console: focus traps in modals, `aria-live` on async regions, keyboard navigation, and a review of the very small type sizes.
- **Build the enterprise inquiry endpoint** so the existing table and RLS policy are used.

---

### Phase 4 — Performance & Scalability

Only the bottlenecks that are real (§20). Do not optimise anything not listed here.

- **Cursor pagination** on the catalogue and all admin lists (`APX-39`) — the row cap causes silent data loss, not errors, so this is a correctness fix as much as a performance one.
- **Eliminate the N+1 in `getCourseLearningOverview`** — batch the per-module assessment lookups.
- **Move bulk import and mass-populate to a job queue** with per-item records, resume and idempotency keys.
- **Add the missing indexes** listed in §19.
- **Route-level code splitting** to break up the 952 KB bundle; the admin console should not ship to marketing visitors.
- **Cache headers on public catalogue endpoints.**

---

### Phase 5 — Testing

Written against the fixes above so they cannot silently regress. Ordered by the value each suite would have delivered against this audit.

1. **RLS policy suite** executed as a real non-privileged user — covers `APX-02`, `APX-05`, `APX-06`, `APX-22` in one place.
2. **Schema-contract check in CI** — regenerate types, fail on drift. Covers the entire `APX-13`–`APX-16` class mechanically.
3. **Completion and certificate unit tests** — empty course, no enrollment, duplicate assessments, concurrent issuance.
4. **End-to-end journey test**: register → enroll → complete → certificate → verify, against a seeded database.
5. **Render test for `LessonRenderer`** asserting HTML produces elements, not text.
6. **API contract tests** for every `api.ts` function.
7. **CI pipeline**: install, typecheck, test, build on every change.

---

### Phase 6 — Cleanup

Deliberately last — deleting code before the behaviour is settled destroys evidence.

- Remove the dead question banks in `finalAssessment.service.ts` once real authoring exists.
- Delete `types/index.ts` after all consumers move to generated types.
- Move the six root scripts into `scripts/` with documented npm entries, or delete them.
- Reconcile seeds: promote the two orphaned TypeScript seeds to invocable scripts, retire the obsolete SQL seed (`APX-40`).
- Remove the seven unused public buckets (`APX-43`) and the `motion` dependency.
- Delete unused endpoints and `api.ts` exports — **except** `content-access`, which Phase 0.5 should adopt rather than remove.
- Remove unused `JWT_SECRET`/`DATABASE_URL` config, or wire the pg pool if direct SQL is genuinely wanted.
- Choose one package manager (`APX-44`); add `packageManager` and `engines`.
- Guard migrations 00007 and 00009 for replay (`APX-32`).
- Rewrite the README (`APX-46`) and purge the stale phase labels.

---

## 31. Baseline for Future Work

The reference state as of this audit. Everything below describes what **is**, not what should be.

### Current architecture

Single Express process serving a React 19 / Vite 6 SPA and a 61-route `/api` surface. All backend data access uses the Supabase **service-role** client, bypassing RLS. The browser holds a Supabase anon key and reaches PostgREST and GoTrue **directly** for auth and profile reads — a second, unguarded channel. Storage is Supabase; the only external service is Google Gemini, called server-side.

### Current database model

27 tables, 2 RLS-bypassing views, 1 auth trigger, 1 `SECURITY DEFINER` helper, 22 indexes, 17 `updated_at` triggers. Spine: `profiles → enrollments → courses → modules → lessons → lesson_progress`, with `assessments → questions → question_options → assessment_attempts → student_answers` and `certificates`. `course_materials` is admin-only. The three checkpoint tables from migration 00007 exist and are referenced by no code. **Four columns queried by application code do not exist in any migration.**

### Current authentication model

Supabase GoTrue; two roles (`STUDENT` default via trigger, `ADMIN` by manual SQL only). `requireAuth` verifies tokens over the network; `requireAdmin` re-reads `profiles.role`. Frontend guards are presentational. Role escalation via PostgREST is blocked by the profiles UPDATE policy. No MFA, no password policy, no audit trail, no in-product admin grant or revoke.

### Current learning flow

Enroll (idempotent, free, no payment) → open any lesson of any published course **with or without enrollment** → mark complete with no precondition → module quiz, auto-generated if absent → final assessment, which no course has → completion evaluated from client-writable tables → certificate issued automatically.

### Current admin flow

Curriculum edit only (no course create, no deletes) → publish guard on individual courses, bypassed by publish-all → PDF upload → extract → save to lesson. No assessment authoring. Dashboard, students and programs pages are mock.

### Current content flow

Signed-URL PUT to a private bucket → metadata row → server-side PDF parse → HTML → `lessons.content` → **rendered to students as escaped text**. Source-PDF attachment always fails silently. Replace and versioning are non-functional.

### Current assessment flow

Server-side grading, answer key excluded from student queries — then returned in full after every submission, with unlimited attempts. Module quizzes are auto-generated boilerplate whose correct option is always first. The final assessment does not exist in data.

### Current certificate flow

Auto-issued by the completion engine (the manual claim endpoint is unwired). No enrollment required, no `enrollment_id` recorded, no uniqueness constraint, placeholder student name on issuance, `APEX-STAT-` prefix regardless of course, no PDF, no revocation path. Verification by code works; the same data is also enumerable in bulk by anyone.

### Known issues by severity

- **Critical (10):** `APX-01`–`APX-10`
- **High (14):** `APX-11`–`APX-24`
- **Medium (16):** `APX-25`–`APX-40`
- **Low (7):** `APX-41`–`APX-47`

### Unknowns requiring runtime verification

- Whether `tsc --noEmit` and `vite build` pass (`node_modules/` absent).
- `anon` privileges on the two views — one query settles it.
- Which migrations are actually applied to the live project.
- Existing duplicate assessments, duplicate certificates and orphaned storage objects.
- How many lessons currently hold the hardcoded filler template.
- Whether email confirmation is enabled in the Supabase dashboard.
- Whether the 44 hardcoded checkpoint lesson IDs still match live rows.
- Whether admin tables overflow on narrow viewports.

### Recommended first implementation task

> **Initialise git, commit the tree as-is, then rotate the service-role key and remove the hardcoded fallback** (Phase 0.a and 0.b).

It is the only task with no dependencies, it is prerequisite to safely doing anything else, and it addresses the one finding that cannot be mitigated by any amount of application-layer work. The immediate follow-on is Phase 0.1 — revoking direct write access to `lesson_progress` and `assessment_attempts` — which is a small, self-contained migration that closes the certificate-forgery chain at its source.

---

*Forensic technical audit of the Apex Academy LMS, 7 September 2026. Produced by static inspection of the complete repository. No files were modified other than the creation of this report. Claims are traced to specific files and lines; where a conclusion depends on runtime state or Supabase project configuration, it is labelled as requiring verification rather than asserted.*
