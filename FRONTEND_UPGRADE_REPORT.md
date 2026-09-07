# Apex Academy LMS — Frontend UI/UX Upgrade Report

**Date:** 2026-09-07
**Scope:** Complete frontend UI/UX upgrade — design system, shared primitives, global shells, public site, learner portal, learning interface, assessment UI, certificate UI, admin console.
**Constraints honoured:** No new framework or library. No backend, database, schema, migration, auth or authorization change. No change to the YouTube playback implementation. No fabricated statistics, testimonials, company logos or ratings introduced. APX-48/49/50/51 not touched.

---

## 1. Executive summary

The frontend was upgraded from a visually inconsistent, partly mock-driven interface into a coherent, production-shaped product with one design language across public, learner and admin surfaces.

Two classes of work were done:

1. **Design and UX** — a unified token system, a shared primitive library, rebuilt global shells with working mobile navigation, and a full pass over every page for hierarchy, spacing, responsiveness, loading, empty and error states.
2. **Truthfulness** — removal of a substantial layer of fabricated content that was live in the product: invented testimonials with stock-photo portraits, invented named faculty at real universities, invented placement and salary statistics, invented star ratings, a Google/Microsoft/Amazon "alumni work at" row, and — most seriously — a certificate-verification screen that returned "AUTHENTIC & VERIFIED" for any input without contacting the server.

**Verification:** `npx tsc --noEmit` → 0 errors. `npm run build` → PASS (1803 modules). Browser sweep across 9 viewports (1920/1440/1280/1024/768/414/390/375/320) on every public and auth route → **all checks clean**.

---

## 2. Design foundation

A single token layer in `src/index.css` drives the whole application.

| Token group | Value |
|---|---|
| Primary | `#4f46e5` (indigo 600) |
| Radius scale | sm 6px · md 10px · lg 14px · xl 18px · 2xl 24px |
| Shadow scale | xs → lg |
| Container | `--container-max: 1280px` |
| Motion | `--ease-out`, with a `prefers-reduced-motion` block |
| Type | Poppins 400–900, single global family |

Legacy `--color-*` aliases were retained so nothing that referenced them broke.

**Palette unification.** A second, off-system blue (`#026adb`) was hardcoded via inline `style` attributes in 17 places across the home page, course detail page and lesson renderer. All were mapped onto the indigo token. Zero occurrences remain.

**Font.** Three files carried a redundant inline `fontFamily: 'Poppins, sans-serif'` override on top of the global body font. All removed; typography is now owned in one place.

---

## 3. Shared primitives

### Existing, rebuilt
- **`Button`** — `iconRight`, `fullWidth`, `loading`, `success` variant, fixed heights (`h-9`/`h-11`/`h-13`). Children are wrapped in `inline-flex items-center gap-2 min-w-0`, which is what keeps label and icon on one baseline under Tailwind's `svg { display: block }` preflight.
- **`Badge`** — see §9; semantic variants added to fix a live rendering bug.
- **`Card`, `Input`, `SectionHeader`, `EmptyState`, `Skeleton`** — carried forward and used consistently.

### New
| Component | Purpose |
|---|---|
| `common/Modal.tsx` | Shared dialog: backdrop + Escape close, body-scroll lock, focus moved into the panel, mobile sheet / desktop centred. |
| `admin/AdminPageHeader.tsx` | One heading treatment for every admin screen. |
| `admin/AdminStatCard.tsx` | Stat tile that renders an em dash when a value is genuinely unavailable rather than inviting a placeholder number. |
| `admin/AdminTable.tsx` | Table chrome: toolbar, horizontal scroll region, header/body/row/cell, footer, icon-button. |
| `auth/AuthCard.tsx` | Shared auth shell + `AuthError`, `AuthSuccess`, `PasswordInput`. |

---

## 4. Global shells

### Public header / footer
Rebuilt earlier in the engagement: data-driven `NAV_LINKS`, scroll elevation, body-scroll lock, Escape and route-change close, a responsive search that swaps to a compact icon in the xl–2xl band, and a full mobile drawer. The footer now derives its domain list from `CAREER_DOMAINS` and links only to routes that exist.

### Admin shell — `AdminLayout`
- **Fixed: no mobile navigation.** The sidebar was `hidden md:flex` with no alternative, so below 768px the admin console had no way to navigate. A full mobile drawer was added (backdrop, Escape/route-change close, scroll lock).
- ~200 lines of repeated per-link JSX replaced with a `NAV_SECTIONS` array. All 10 admin routes preserved and verified present.
- Header shows the current section name; `handleLogout` (`await signOut(); navigate('/login')`), `displayName`, the Public Site link and the `{children}` slot are unchanged.
- `main` given `overflow-x-hidden` so wide admin tables scroll inside their own container.

### Learner shell — `StudentLayout`
- **Same mobile-navigation gap fixed** the same way.
- **Removed a fake notification indicator** — a bell button with an unread dot that had no handler and no notification system behind it.
- Nav made data-driven; the dark sidebar identity was kept deliberately to distinguish the learner workspace from the light admin console, while both use the same tokens, spacing and radii.

---

## 5. Learning interface

Per the brief, **the YouTube player implementation was not touched**. Only the surrounding UI changed.

- **`CoursePlayerHeader`** — the component already received `progressPercentage`, `completedLessons` and `totalLessons` and rendered none of them. It now shows a real progress readout and bar on desktop plus a progress rail on mobile. The crowded three-link left cluster was reduced so long course titles truncate instead of pushing the layout sideways.
- **`CurriculumSidebar`** —
  - **Fixed:** the final-assessment block rendered unconditionally, so courses with no final assessment still showed "Take final assessment". It is now gated on the `hasFinalAssessment` prop the component already accepted.
  - **Fixed:** copy read "covering all 11 modules" regardless of the course. Now derived from `modules.length`.
  - **Fixed:** module expansion state was seeded once from `modules`, so modules arriving after the first render defaulted to collapsed. Inverted to store only explicit collapses.
  - Palette moved off the hardcoded blue; module/lesson rows, locks and progress rewritten.
- **`LessonRenderer`** — the lesson title and the "Mark as complete" control shared one non-wrapping row; they now stack below `sm`. Button restyled to the token palette.
- **`LessonResources`** — a download icon was shown for external links; link resources now show an external-link affordance and label.
- **`LearningInterfacePage`** —
  - **Removed a false completion claim.** At 100% lesson progress the banner asserted `✓ N/N Module Assessments` and `✓ Final Assessment Passed` with no data behind either, and fell back to a hardcoded course title. It now states only what is true: lessons completed, and module assessments actually passed (derived from `modules[].assessmentPassed`).
  - Bottom lesson navigation rebuilt — long lesson titles previously stretched the Previous control off-screen; it now truncates and stacks on mobile.
  - Mobile curriculum drawer, loading and empty states restyled.

---

## 6. Assessment UI

- **Hardcoded question counts and pass marks replaced with real values.** Both modals displayed "Answer all 30 questions. Passing score is 70% (21 out of 30)" and "Answer all 10 questions" regardless of the actual assessment, while `totalQuestions` and `assessment.passing_percentage` were already available. A learner taking a 12-question assessment was told to answer 30. Now derived throughout, including the results panel.
- **Submit failures no longer use `window.alert`.** Both modals now render an inline, dismissible error region with the server's message.

### `/student/assessment/:assessmentId` — replaced
This route was live and served a **fully mocked quiz**: three hardcoded machine-learning questions, **the answer key shipped in the client bundle**, grading performed in the browser, and a results screen that claimed *"Backend verification recorded"* and offered a **"Claim Certificate"** button. None of it was real.

It has been replaced with an honest pointer to the actual flow — assessments are served and graded by the server inside the course player. The route is preserved.

---

## 7. Certificate UI

- **`VerifyCertificatePage` — neutralised.** This component reported **"AUTHENTIC & VERIFIED"** for any certificate ID typed in, **without making a network request**, and filled the result card with a fabricated learner name, a fabricated course, and an issuing authority of *"Apex Academy & UT Austin McCombs Partner Hub"* — naming a real university as co-issuer. It was imported but never routed (all three `/verify*` routes already went to the real page), so it was not user-reachable; it is now a redirect to the real verification page so it cannot validate a forged credential if it were ever wired up.
- **`PublicCertificateVerificationPage` (the real one)** — rebuilt. Reaching `/verify-certificate` without a code previously showed "CERTIFICATE NOT FOUND"; it now presents a lookup form. The not-found state offers a retry field. The footer line "Powered by Supabase PostgreSQL" was removed (public infrastructure disclosure).
- **`StudentCertificatesPage`** — rebuilt with skeletons, a proper empty state, and clearer certificate cards.

---

## 8. Learner portal

- **`StudentDashboardPage`** — welcome panel rebuilt on real derived figures; skeleton loading; "continue where you left off" now picks the most sensible in-progress course rather than `enrollments[0]`; progress bars given `role="progressbar"` and labels; long course titles no longer blow out the CTA.
- **`MyLearningPage`** — tabs now scroll horizontally instead of wrapping on mobile; `CourseGridSkeleton` while loading; per-tab empty states. Removed internal jargon ("Retrieving your enrolled courses from database…") and a claim that the catalogue contains specific named bootcamps.
- **`StudentProfilePage`** — grouped into Identity / Background sections, `role="status"`/`role="alert"` feedback, `loading` button state, proper `htmlFor` on the bio field.

---

## 9. Admin console

### A live rendering bug, fixed
Five admin pages passed `variant="success" | "warning" | "danger" | "primary"` to `Badge`, whose union only accepted hue names. `variantStyles[variant]` resolved to `undefined`, so those badges rendered **completely unstyled**. `Badge` now supports semantic aliases alongside hue names, falls back to neutral for anything unknown, and gained an optional status dot.

This was not caught by the type checker — see §12.

### Pages rebuilt
| Page | Change |
|---|---|
| **Dashboard** | Was four `—` placeholders. Now shows real counts (students, courses, published, certificates, inquiries, open inquiries) fetched in parallel from existing admin endpoints, each failing independently so one bad endpoint cannot blank the rest. Plus a "jump to" grid. |
| **Programs** | **Was four hardcoded fake programs** ("Data Science Career Track, 1250 enrolled, $2,999"). Now reads the real `/api/admin/programs` endpoint, which already existed and was unused. |
| **Students** | **Was four fake students** ("Eleanor Shellstrop", "Chidi Anagonye" …). Now reads the real `/api/admin/students` endpoint, also already present and unused. Columns match the actual `profiles` schema (which has no email column). |
| **Assessments** | **Removed three fabricated stat cards** ("45 Total Assessments", "84% Average Pass Rate", "1,200+ Questions in Bank") and two hardcoded `0` / `0%` table columns. Replaced with counts derived from the loaded rows. The AI quiz generator's `window.prompt` + `alert` flow became a proper modal — the same `generateQuizFromMaterial(token, materialId, assessmentId, 5)` call, unchanged. |
| **Certificates** | Rebuilt on the shared table; removed non-functional Filter / Export CSV / Revoke / pagination controls that had no handlers. |
| **Content** | Rebuilt; removed a hardcoded `0` "Views" column that was not backed by any data. |
| **Inquiries** | Rebuilt; the hardcoded "1 Open Ticket" is now derived, and the dead "Reply" button became a working `mailto:` link. |
| **Courses** | Rebuilt on the shared table; removed the internal "Phase 6A Foundation" badge. |
| **Curriculum / Bulk Import / Materials / Course Editor** | Business logic untouched. Headers moved to `AdminPageHeader` for a consistent shell; internal-jargon titles ("Bulk Course Content Population Engine") replaced with plain names; unused imports cleaned. All four already wrapped their tables in `overflow-x-auto` and were left structurally alone. |

---

## 10. Public site

| Page | Change |
|---|---|
| **Home** | **Removed three fabricated testimonials** — named people with Unsplash stock portraits, employers (Microsoft/Deloitte/Flipkart), salary-hike figures, and "Verified Alumni · LinkedIn Confirmed" labels. Replaced with real published learner stories fetched from the existing endpoint; the section hides entirely when there are none. **Removed three hardcoded featured courses with invented ★4.9/4.85/4.88 ratings** and stock images — now real free courses from the catalogue. Removed "mentorship from practitioners at Google, OpenAI, and Deloitte" and a certificate "QR codes" claim the platform does not implement. (An earlier pass had already removed the `EMPLOYER_LOGOS` "Our Learners Work At" row and replaced the hardcoded platform stats with derived counts.) |
| **Programs** | Rebuilt. Removed "salary benchmarks" (no such field exists), "11 industry-approved" hardcoded counts (now derived), two invalid `bg-slate-55` classes, the off-palette blue, an unused `selectedBadge` state and six unused imports. Domain images given error fallbacks. |
| **Program detail** | See §11 — the largest fabrication cluster. |
| **Career support** | **Removed four fabricated placement statistics** ("92% Placement Rate within 6 months", "$95k Average Starting Salary", "200+ Active Hiring Partners", "Lifetime Career Support Access") and a "View Hiring Partners" button that scrolled to a `#hiring-partners` section that did not exist. Rewritten around what the platform actually offers. |
| **Institutions** | **Removed a form that pretended to submit** — it collected name, work email and institution, then ran `alert('…our team will contact you within 24 hours')` and reset, discarding the data. Replaced with a real `mailto:` contact route. Also removed a "verifiable blockchain credentials" claim and links to non-existent Terms/Privacy pages. |
| **Success stories** | Rebuilt; removed "Join thousands of students who have accelerated their careers". |
| **Resources** | **Fixed a real bug:** the featured-article slice was applied to the filtered list, so selecting any category silently hid one article. Categories are now derived from the articles that exist rather than a hardcoded list that mostly matched nothing. Broken images get a fallback. |
| **Resource detail** | **Removed fabricated tags** — every untagged article was decorated with the same four invented topics. Dead Share/Save buttons replaced with one working share control (Web Share API with clipboard fallback). |
| **Institution detail** | **Removed fabricated boilerplate** asserting "centuries of academic excellence" and "designed by world-renowned faculty" for whatever institution row was loaded. Now shows the institution's own description, or says none is published. |
| **Search** | Rebuilt. Removed two filter groups (`topic`, `level`) that were defined but never rendered. Type filters became a horizontal chip row with live per-type counts, replacing a sidebar that collapsed out of reach on mobile. Added a distinct pre-search state. |
| **404** | Rebuilt on the palette; three competing CTAs reduced to a clear primary/secondary pair plus a tertiary back link. |
| **Enterprise, Domain detail, Free courses, Course detail** | Rebuilt earlier in the engagement (fabricated "300% ROI / 10k+ Employees / 95% Completion" removed; derived stats; sort and mobile filter drawer; curriculum toolbar overflow fix at 320px). |

---

## 11. `ProgramDetailPage` — the largest fabrication cluster

`src/data/programsData.ts` contained a marketing record presented as fact:

- **Named faculty with stock-photo portraits** — "Dr. Ramesh K. Sharma, Professor, IIT Bombay", "Dr. Sarah Chen, Ex-Google Brain, Co-Author Transformer Papers", "Arjun Mehta, Principal Engineer, Anthropic AI" — each with an Unsplash portrait presented as their photograph.
- **A joint-programme claim with a real university** — "Joint Executive Education Program with IIT Bombay".
- **4.92 ★ / 3,420 reviews**, **"92% Transitioned to AI Roles within 6 Months"**, **"54% average salary hike"**, a hiring-partner list (Google, Amazon, Microsoft, McKinsey, Goldman Sachs…), and **"Ranked #1 GenAI Program in 2026"**.
- An **"Alumni Working At Top Global Tech Firms"** company row.
- A **"100% money-back guarantee within 7 days"**, a **"Strict No-Spam Policy… 100% confidential"** promise, "Limited Seats", and a "Verified Cryptographic Certificate" claim.

**Worse, this record leaked onto every program URL.** `getProgramDataBySlug` spread the `genai-leaders` record over *any* unknown slug, so `/programs/<anything>` — including links generated from real institution records — rendered another programme's faculty, ratings and partner claims as if they belonged to it.

**Actions taken:**
1. `getProgramDataBySlug` now returns `null` for an unknown slug instead of synthesising a record. The page renders a proper "Program not found" state (guard placed after all hooks).
2. The faculty section was removed entirely, with a comment recording why.
3. Rating/review card replaced with the programme's real `format` field; the "Ranked #1" chip, the alumni company row, the money-back guarantee, the confidentiality promise, "Limited Seats" and the unverifiable fee inclusions were removed or replaced with values derived from the record (`curriculum.length` modules, `projects.length` projects).

Genuine content — curriculum, tools, projects, certificate, FAQs, fees — was left intact. **No replacement figures were invented.**

---

## 12. Verification, and an honest limit on it

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | **0 errors** |
| `npm run build` | **PASS** — 1803 modules, `index.js` 1,747 kB (gzip 338 kB), `index.css` 111 kB (gzip 17 kB) |
| Browser sweep, 9 viewports | **All clean** across `/`, `/free-courses`, `/enterprise`, `/programs`, `/programs/genai-leaders`, `/programs/unknown-slug`, `/career-support`, `/success-stories`, `/resources`, `/institutions`, `/domains/data-scientist`, `/courses/statistics-data-analytics`, `/search`, `/search?q=data`, `/verify-certificate`, `/verify/NOPE-123`, `/login`, `/register`, `/forgot-password`, 404 |

The sweep checks document overflow (walking ancestors to discount elements legitimately clipped by an `overflow` container), CTA icon/text baseline alignment on single-line controls, and console/page errors.

### ⚠️ The type check is weaker than it appears

**`@types/react` and `@types/react-dom` are not installed.** JSX prop types therefore resolve to `any`, and `tsc --noEmit` validates no component props at all. I confirmed this directly: a deliberately invalid `<Badge variant="success">` probe passes cleanly.

This is exactly how the unstyled-badge bug in §9 survived. Installing dependencies was out of scope for this task, so it is reported rather than fixed. **Recommended:** `npm i -D @types/react @types/react-dom`, then expect a first-run backlog of genuine prop errors.

### ⚠️ Authenticated screens were not browser-verified

Admin and learner pages redirect to `/login` without a session. I have no credentials, and creating an account would be a database write that was not authorized. Those pages were verified by build, type check and code review only. A sweep with an admin and a student session is the recommended follow-up.

---

## 13. Not done, and why

| Item | Reason |
|---|---|
| APX-48 / 49 / 50 / 51 | Explicitly excluded by the brief. |
| Git baseline commit, service-role key rotation | Carried over from earlier phases; operational, not frontend. |
| `YfH24K_YjHw` video mapping conflict | Unresolved from the YouTube integration; needs a human decision. |
| ~25 `window.alert` calls in admin pages | Internal tooling, all functional. Replacing them needs a toast provider threaded through several large files; deferred as a contained follow-up rather than churned late in this pass. |
| `getCourseLearningOverview` queries `.eq('type', 'FINAL')` | The `assessments` table column is `assessment_type` with value `FINAL_ASSESSMENT`, so `hasFinalAssessment` is likely always false. **This is a backend bug** and backend changes were out of scope — reported only. It matters now that the sidebar correctly honours the flag. |
| 1.75 MB JS bundle | Route-level code splitting would help materially, but it changes the loading architecture; flagged for a dedicated pass. |
| `programsData.ts` marketing copy | Fabricated claims were removed from the rendered page. The underlying data file still holds the faculty and outcome records; the page no longer reads them. Deleting the data is a business decision. |

---

## 14. Fabrication inventory — everything removed

For audit purposes, the complete list of fabricated content taken out of the live product:

1. Certificate verification returning "AUTHENTIC & VERIFIED" without any server call *(unrouted, now redirected)*
2. "Apex Academy & UT Austin McCombs Partner Hub" as issuing authority
3. A mock quiz with client-side answer keys, "Backend verification recorded", and "Claim Certificate" *(live route)*
4. "✓ Final Assessment Passed" shown on lesson completion alone
5. Three named faculty at IIT Bombay / Google Brain / Anthropic with stock portraits
6. "Joint Executive Education Program with IIT Bombay"
7. 4.92★ / 3,420 reviews; ★4.9 / ★4.85 / ★4.88 course ratings
8. "92% placement rate", "54% salary hike", "$95k average starting salary", "200+ hiring partners"
9. Alumni-employer rows naming Google, Microsoft, Amazon, Meta, McKinsey, Deloitte, Goldman Sachs
10. Three testimonials with stock portraits, employers and salary hikes, labelled "Verified Alumni · LinkedIn Confirmed"
11. Four mock programs and four mock students in the admin console
12. "45 assessments", "84% pass rate", "1,200+ questions", "1 Open Ticket", "0 Views"
13. "100% money-back guarantee", "Strict No-Spam Policy", "Limited Seats"
14. "Ranked #1 GenAI Program in 2026"
15. Four invented topic tags on every untagged article
16. "Centuries of academic excellence… world-renowned faculty" for any institution
17. "Verifiable blockchain credentials" and certificate "QR codes"
18. An institution demo form that discarded submissions while promising a 24-hour callback
19. Hardcoded "30 questions / 21 of 30" and "10 questions" assessment copy
20. "Covering all 11 modules" on every course

Where a fabricated element had a real counterpart available, it was wired to real data. Where none existed, the element was removed. **No figure, name, logo or quote was invented as a replacement.**
