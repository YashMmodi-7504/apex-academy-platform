# APEX ACADEMY LMS — PHASE 0 / 1 / 9 IMPLEMENTATION REPORT

**Date:** 2026-09-07
**Outcome:** **HALTED AT THE PHASE 0 GATE — no source code was modified.**
**Reason:** the project is not a Git repository, and the phase instruction is explicit that source modification must not proceed until a Git baseline exists.

> **Git baseline required before code modification.**

This report records the gate result, the read-only analysis completed for Phases 1 and 9, and the exact implementation specification to execute the moment the baseline exists.

---

## 1. Files Modified

**NONE.**

No file under `src/`, `supabase/`, `scripts/`, `server.ts` or `package.json` was changed. No dependency was installed, no migration applied, no database write performed, no credential rotated, and the YouTube importer was not executed.

## 2. Files Created

| File | Purpose |
|---|---|
| `PHASE_0_1_9_IMPLEMENTATION_REPORT.md` | This report — the only file created |

---

## 3. Phase 0 — Git Baseline Gate

### Verification performed

| Check | Result |
|---|---|
| `.git` directory in project root | **Absent** |
| `git rev-parse --is-inside-work-tree` | `fatal: not a git repository (or any of the parent directories)` |
| `git rev-parse --show-toplevel` | `fatal: not a git repository` |
| `.git` anywhere in the parent chain | **Absent** |

**Conclusion: the working tree is not under version control, and is not nested inside any repository.** This confirms `APX-45` at the point of implementation.

### Why this is a hard stop

Every rollback path in `REMEDIATION_BLUEPRINT.md` §32 depends on `git revert`. Without a baseline:

- The Phase 1 credential change removes a fallback the running application currently depends on. If the replacement configuration is wrong, there is no way to return to a known-good state.
- The Phase 9 authorization change alters the behaviour of eleven routes simultaneously. A regression cannot be bisected or reverted.
- There is no diff to review, so no change can be verified as minimal.

### Required operator action

```bash
cd d:/Projects/logicrest_stp/apex-academy-lms
git init
# Review .gitignore first — it currently ignores node_modules/, build/, dist/,
# coverage/, .DS_Store, *.log and .env* while explicitly un-ignoring .env.example.
# .env.example contains a live service-role JWT (APX-01) and WILL be committed
# unless it is scrubbed first or the un-ignore rule is removed.
git add -A
git commit -m "Baseline: pre-remediation state as audited"
```

**Ordering warning.** `.gitignore` line 8 is `!.env.example`, and that file contains a real service-role credential. Committing as-is writes the credential into Git history permanently, where removing it later requires a history rewrite. **Either scrub `.env.example` before the first commit, or remove the `!.env.example` exception.** This is the one place where Phase 1 must partially precede Phase 0.

---

## 4. Phase 1 — Credential Hardening (analysis complete, not implemented)

### Exact security issue

`APX-01` — a live Supabase **service-role** JWT is hardcoded as a fallback constant and committed to the repository. The service role bypasses all Row Level Security and can read, modify or delete every record in the project.

### Credential classification

| Question | Finding |
|---|---|
| Hardcoded? | **Yes** — `src/backend/database/supabaseAdmin.ts:7`, `DEFAULT_SERVICE_ROLE_KEY` |
| Fallback-based? | **Yes** — line 25 selects the constant whenever the env var is missing, empty, or equal to the literal `'YOUR_SUPABASE_SERVICE_ROLE_KEY'` |
| Environment-based? | Partially — `SUPABASE_SERVICE_ROLE_KEY` is read first, but absence is silently tolerated |
| Server-only? | **Yes — verified** |
| Bundled into frontend? | **No — verified** |

### Exposure surfaces (counts only; the value was never printed)

| Location | Occurrences | Assessment |
|---|---|---|
| `src/backend/database/supabaseAdmin.ts` | 1 | Source of the leak |
| `.env.example` | 1 | Committed-by-design file; `.gitignore` explicitly un-ignores it |
| `dist/server.cjs` | 1 | Server build artifact — expected once inlined, still a credential-bearing file |
| `dist/server.cjs.map` | 1 | Sourcemap — same exposure |
| `dist/assets/index-*.js` (**browser bundle**) | **0** | ✅ Does not reach the client |
| Any `.tsx` file | **0** | ✅ No frontend import path |

24 modules import `supabaseAdmin`; **all are server-side** (`src/backend/**`, plus five root/`scripts/` operational scripts). No `.tsx` file imports it. `GEMINI_API_KEY` is likewise env-only and server-side.

### Runtime proof the fallback is active

`GET /api/health` on the running dev server returns:

```
"envCheck": { "SUPABASE_URL": "MISSING", "SUPABASE_SERVICE_ROLE_KEY": "MISSING",
              "VITE_SUPABASE_URL": "MISSING", "VITE_SUPABASE_ANON_KEY": "MISSING" }
"supabase": { "status": "connected" }
```

All four variables are missing, yet the client connected and served real data. That is the hardcoded fallback in use, in a live process, right now.

### Specified change (not applied)

**File:** `src/backend/database/supabaseAdmin.ts` — the only file that needs to change.

1. Delete `DEFAULT_SUPABASE_URL` and `DEFAULT_SERVICE_ROLE_KEY` (lines 6–7).
2. Replace the fallback selection (lines 21–25) with a fail-closed assertion: if `SUPABASE_URL`/`VITE_SUPABASE_URL` is absent or not a valid HTTP(S) URL, **or** `SUPABASE_SERVICE_ROLE_KEY` is absent/empty/placeholder, throw a configuration error naming the missing variable — and never the value.
3. Leave `isValidHttpUrl`, the `createClient` options and `checkSupabaseConnectivity` untouched. (`checkSupabaseConnectivity` is separately defective under `APX-26` — it calls `auth.getSession()`, which makes no network request — but that is **out of scope for this phase** and must not be bundled in.)
4. Scrub `.env.example`: replace the credential with a placeholder, keeping the variable name and a comment.

**Explicitly out of scope:** credential rotation.

### Operational action required from the account owner

**Rotate the service-role key in the Supabase dashboard.** Removing the hardcoded copy does not invalidate the exposed credential — it exists in this working tree, in `dist/`, and in the sourcemap. Until rotated it must be treated as compromised. Rotation is an account-owner action and was not performed.

**Sequence:** scrub `.env.example` → provision a real `.env` (or deployment secrets) → apply the code change → verify startup → **then** rotate.

### Post-change verification checklist (executable once implemented)

| Check | Method |
|---|---|
| Service-role key remains server-side | `grep -rl <key> --include=*.tsx src/` → 0 |
| No credential in frontend source | Same, plus `src/lib/supabaseClient.ts` review |
| No credential in `dist/` | Rebuild, then `grep -cF` the literal in browser chunk and server bundle |
| No credential in logs | `/api/health` `envCheck` reports presence only — already correct |
| Fails safely when missing | Start with the variable unset; expect an explicit configuration error, not a silent connection |

---

## 5. Phase 9 — Secure `/api/learn/*` (analysis complete, not implemented)

### Exact security issue

`APX-07` — every `/api/learn/*` route requires authentication but **none requires enrollment**. Any authenticated user can read full lesson content, learning objectives, key takeaways and signed resource URLs for any published course they have never enrolled in.

### Before — measured authorization state per route

All twelve routes carry `requireAuth`. Beyond that:

| # | Route | Enrollment queried | Enrollment **gates** access | Lesson∈course checked |
|---|---|---|---|---|
| 1 | `GET /learn/:courseSlugOrId` | yes | only if course unpublished | — |
| 2 | `GET /learn/:c/lessons/:lessonId` | yes | only if course unpublished | **yes** ✅ |
| 3 | `GET /learn/:c/lessons/:l/checkpoint` | **no** | **no** | **no** |
| 4 | `POST /learn/:c/lessons/:l/checkpoint/attempt` | **no** | **no** | **no** |
| 5 | `GET /learn/:c/modules/:moduleId/assessment` | **no** | **no** | **no** |
| 6 | `POST /learn/:c/modules/:m/assessment/submit` | **no** | **no** | **no** |
| 7 | `GET /learn/:c/final-assessment` | **no** | **no** | **no** |
| 8 | `POST /learn/:c/final-assessment/submit` | **no** | **no** | **no** |
| 9 | `GET /learn/:c/completion-summary` | **no** | **no** | **no** |
| 10 | `POST /learn/:c/lessons/:l/progress` | **no** | **no** | **no** |
| 11 | `POST /learn/:c/lessons/:l/complete` | yes (unused for gating) | **no** | **no** |
| 12 | `GET /lessons/:lessonId/content-access` | yes | **YES** ✅ | via module → course ✅ |

The gate on routes 1 and 2 is `!enrollment && !course.is_published && !isAdmin` — enrollment is only consulted when the course is *unpublished*, so for any published course a null enrollment is irrelevant.

**Route 12 is the only correctly-authorized endpoint, and it has zero callers** (`fetchStudentLessonContentAccess` in `src/services/api.ts` is exported and never imported).

### The correct authorization boundary

`getStudentLessonContentAccess` (`src/backend/controllers/content.controller.ts:519-535`) already encodes the right rule, but it is a *handler*, not a reusable guard, and it resolves the course from a lesson rather than from the route. The boundary should be centralized — not duplicated — as middleware:

```
requireAuth                     (existing, unchanged)
  → resolveCourse(courseSlugOrId)          replaces 6 inline slug-vs-UUID regexes
  → requireCourseVisible(course)           published, unless caller is ADMIN
  → requireEnrollment(user, course)        unless ADMIN, or the target lesson is is_preview
  → requireLessonInCourse(lessonId, course) module.course_id === course.id
  → handler
```

**Authorization derives from the authenticated identity plus a server-side lookup, never from client-supplied IDs.** The client may name a course and a lesson; the server independently resolves both and verifies the relationship before any content is returned.

`getStudentLessonContentAccess` is then refactored to call the same guards, so one implementation governs both entry points. That satisfies the acceptance criterion that the existing logic be *reused or centralized*, with no duplicate authorization implementation.

### After — target state

Routes 1–11 gain the guard chain. Route 12 keeps its behaviour but delegates to shared code. Preserved unchanged: admin preview (`req.profile.role === 'ADMIN'`), `is_preview` lesson access, and every response shape.

### Critical constraint honoured

This phase adds **only rejection paths**. It introduces no new write, no new completion trigger, and does not alter `lesson_progress`, `evaluateCourseCompletion` or certificate issuance. `APX-48` remains exactly as tracked — a student who *is* enrolled can still complete a lesson with a single request. Phase 9 narrows *who* can reach that endpoint; it does not change what the endpoint does.

### Alternate bypass paths — searched

| Path | Leaks protected content? | Assessment |
|---|---|---|
| `GET /api/courses/:slug` | **No** | Lesson select is `id, title, description, lesson_type, duration_seconds, display_order, is_preview, is_required` — verified zero occurrences of `content` or `video_url` |
| `GET /api/courses/:slug/curriculum` | **No** | Same, verified |
| `GET /api/lessons/:id/content-access` | No | Already gated |
| `GET /api/admin/*` | No | `requireAdmin` |
| **Direct PostgREST with the anon key** | **YES** | `lessons`, `modules`, `lesson_resources`, `questions` are `FOR SELECT USING (true)` (`APX-06`) |

**Honest limitation:** Phase 9 secures the API path only. Because RLS still permits anonymous reads of `lessons`, a client can bypass the API entirely and read lesson bodies straight from PostgREST. **Closing that requires the Phase 3 RLS lockdown.** Phase 9 is necessary but not sufficient for content confidentiality, and should not be reported as closing `APX-06`.

---

## 6. Tests Executed

| Test | Result |
|---|---|
| Git repository detection (4 methods) | ✅ Executed — confirmed absent |
| Service-role reference inventory | ✅ Executed — 24 importers, all server-side |
| Frontend credential exposure | ✅ Executed — 0 in `.tsx`, 0 in browser bundle |
| `dist/` credential presence | ✅ Executed — 1 in `server.cjs`, 1 in `.map`, 0 in browser chunk |
| Per-route authorization mapping | ✅ Executed — table in §5 |
| Alternate-path content-leak search | ✅ Executed — public endpoints clean; PostgREST path open |

**No test of modified code was run, because no code was modified.**

## 7. Tests Not Executable

| Test | Blocker |
|---|---|
| TypeScript compilation of the change | No change exists |
| Startup failure on missing credential | Requires the Phase 1 edit |
| Unenrolled-student 403 on `/learn/*` | Requires the Phase 9 edit **and** a test account. Creating one is a **database write** — prohibited this phase |
| Enrolled-student happy path | Same |
| Cross-student access | Same |
| Anon PostgREST read of `lessons` | Read-only count probe available; **not run** — deferred to the operator (gate review R7/R8) |

**No runtime success is claimed for any change, because no change was made.**

## 8. Regression Analysis

No regression is possible — the codebase is byte-identical to its pre-phase state. Anticipated risk once implemented:

| Change | Risk | Mitigation |
|---|---|---|
| Credential fail-closed | Application refuses to start where the fallback was load-bearing — including the currently running dev server | Provision `.env` before applying |
| `/learn/*` enrollment guard | Unenrolled users lose access — intended. But `LearningInterfacePage.tsx:69` branches on `res.notEnrolled`, a field no handler returns, so the UI's enrollment gate is dead code and users would see a generic failure | Return `notEnrolled: true` on the 403 so the existing gate activates, and repair `overview?.courseId` → `overview.course.id` at line 220 |
| Guard centralization | Six inline regexes replaced by one resolver | Behaviour-preserving; covered by route tests |

---

## 9. Remaining Vulnerabilities (unchanged, separately tracked)

| ID | Status |
|---|---|
| **APX-48** YouTube/lesson completion is client-authoritative | **Open** — not in scope; Phase 5 |
| **APX-49** Migration drift: `00007`/`00008` never applied; `course_materials`, `lesson_checkpoints`, `lesson_checkpoint_options`, `student_checkpoint_attempts` return HTTP 404 | **Open** — not touched; no part of this phase depends on those tables |
| **APX-50** All 560 questions have the correct answer at `display_order = 1` | **Open** — no question, option or ordering was modified |
| **APX-51** 12 passed attempts with zero `student_answers`, one user, all 100 % | **Open — evidence preserved.** No attempt, answer or account was altered. Requires **D1** product/security-owner classification |
| **APX-02** Direct PostgREST writes to credential tables | Open — Phase 3 |
| **APX-06** World-readable curriculum | Open — Phase 3/10; **Phase 9 does not close it** |

---

## 10. Next Recommended Phase

1. **Complete Phase 0** — operator runs `git init` and the baseline commit, **after** scrubbing `.env.example` (§3).
2. **Phase 1** — apply the specified `supabaseAdmin.ts` change; operator rotates the key.
3. **Phase 9** — apply the guard chain, including the two frontend contract repairs in §8.
4. Then **P-NEW** (migration drift) and **Phase 3** (RLS lockdown) per the gate review's order.

---

*Phase 0/1/9 implementation report, 7 September 2026. Halted at the Phase 0 gate as instructed. No source, migration, credential, dependency or database change was made; the YouTube importer was not executed; no learner-identifying data was printed and no credential value appears in this document.*
