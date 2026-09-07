# APEX ACADEMY LMS
# SECURITY & ARCHITECTURE REMEDIATION BLUEPRINT

**Date:** 2026-09-07
**Phase:** Validation & architecture only — no remediation performed
**Inputs:** `AUDIT_REPORT.md` (47 findings), `YOUTUBE_INTEGRATION_REPORT.md`, direct re-inspection of source, migrations and live schema
**Constraint:** no source edits, no migrations, no RLS changes, no database writes, no secret rotation, no git init, no YouTube import. `REMEDIATION_BLUEPRINT.md` is the only file created.

---

## 1. Executive Summary

The audit recorded 47 findings; this phase re-validated the highest-risk ones against the actual implementation and added one new finding from the YouTube investigation.

**The single structural defect from which most critical findings follow:** the browser holds a Supabase anon key and can write directly to PostgREST, while the Express API uses the service-role key and therefore bypasses RLS entirely. Neither layer backstops the other. The completion engine reads two tables — `lesson_progress` and `assessment_attempts` — that the client can write both *directly* (via PostgREST) and *indirectly* (via an API endpoint that validates almost nothing). Certificates are issued from that data.

**APX-48 is CONFIRMED, and is worse than originally described.** The 90 %-watched threshold is computed entirely in the browser, but the resulting request carries *no evidence whatsoever* — no watch percentage, no position, no player state, no body at all. The server does not receive the claim it is supposedly trusting; it simply marks the lesson complete because it was asked to. There is nothing for the server to validate under the current contract.

**Consequence for the YouTube work:** the 34 pending video lessons must not be imported before the completion architecture is fixed. Importing them today would add 34 new one-request-to-complete lessons across five career paths, each feeding certificate eligibility.

**Key architectural conclusion:** YouTube watch percentage is **not server-verifiable**. No YouTube API surfaces per-user watch data to a third-party server. Any watch-based signal is a client assertion. Therefore video engagement may drive *progress UX* but must never, on its own, satisfy *credential eligibility*.

**Scoreboard after validation:** 11 confirmed critical (10 original + APX-48), 14 high, 16 medium, 7 low. Nine items require runtime verification that could not be performed without writing to production or querying as `anon`.

---

## 2. Current Architecture

```
                        BROWSER (React 19 / Vite 6 SPA)
  +-------------------------------------------------------------------+
  |  AuthProvider — supabase-js with ANON KEY                          |
  |  RequireAuth / RequireAdmin  (presentation only)                   |
  |  services/api.ts — fetch('/api/*') + Bearer <access_token>         |
  +--------------+---------------------------------+------------------+
                 | /api/*                          | PostgREST + GoTrue
                 v                                 | DIRECT — anon key
  +-----------------------------------+            | RLS is the ONLY control
  | EXPRESS (single process)          |            |
  |  requireAuth / requireAdmin       |            |
  |  controllers -> services          |            |
  |  supabaseAdmin = SERVICE ROLE     |            |
  |    -> BYPASSES ALL RLS            |            |
  +--------------+--------------------+            |
                 | service_role                    | anon + user JWT
                 v                                 v
  +-------------------------------------------------------------------+
  |  SUPABASE — 27 tables, 2 RLS-bypassing views, 3 functions          |
  |  Storage: course-materials, lesson-resources, certificates, avatars|
  +-------------------------------------------------------------------+
```

Content hierarchy (verified against the live database):

```
categories (11 career domains) --1:1-- programs (11 "… Career Path")
                                          |
                                          +-- program_courses --> courses (11, SHARED across programs)
                                                                    +-- modules (112)
                                                                          +-- lessons (229, 78 with video_url)
```

---

## 3. Current Trust Model

| Actor | What it can assert | What the system believes |
|---|---|---|
| Browser (anon key + user JWT) | Any row content in `lesson_progress`, `assessment_attempts`, `student_answers`, `enrollments` for its own `user_id` | Everything — RLS checks ownership, never content |
| Browser (API path) | `POST .../complete` with no body at all | That the lesson is complete |
| Browser (API path) | `answers[]` on assessment submit | Only the answers — grading is genuinely server-side ✅ |
| Express API | — | Runs as service role; RLS provides no backstop |
| Completion engine | Reads `lesson_progress` + `assessment_attempts` | Treats both as authoritative |
| Certificate service | Reads completion engine | Issues a verifiable credential |

**The trust boundary is inverted.** The client is authoritative for the two inputs that decide whether a credential is issued.

---

## 4. Critical Security Findings (validated)

| ID | Status | Validation basis |
|---|---|---|
| **APX-01** Service-role key hardcoded + committed | **CONFIRMED** | `supabaseAdmin.ts:7` `DEFAULT_SERVICE_ROLE_KEY`; `.env.example`; present in `dist/server.cjs`, absent from the browser chunk. Runtime proof: `/api/health` reports all four Supabase env vars `MISSING` yet `supabase.status: "connected"` and 11 real courses were served — the fallback is live |
| **APX-02** Client can write completion inputs | **CONFIRMED** | `00002_rls_policies.sql:195-207`. `lesson_progress` `FOR ALL USING/WITH CHECK (auth.uid() = user_id)`; `assessment_attempts` `FOR INSERT WITH CHECK (auth.uid() = user_id)`. No column restriction. Verified there are **no triggers** on `assessment_attempts` and only an `updated_at` trigger on `lesson_progress`; the only DB functions are `update_updated_at_column`, `handle_new_user`, `is_admin` — **no RPC guards either table**. CHECK constraints are range-only (`status IN (...)`, `percentage 0-100`) and constrain format, never authenticity |
| **APX-03** Empty courses complete vacuously | **CONFIRMED** | `courseCompletion.service.ts:320,341,367` — all three predicates default `true` on zero requirements |
| **APX-04** Certificates without enrollment | **CONFIRMED** | `courseCompletion.service.ts:375` fetches enrollment only to update it; `certificate.service.ts:36` never requires one; `certificates.enrollment_id` never written |
| **APX-05** Certificate PII view | **PARTIALLY CONFIRMED** | View created without `security_invoker` (`00001:381`); zero `GRANT`/`REVOKE`/`security_invoker` statements anywhere in `supabase/`. Anonymous read **not** empirically confirmed — the probe was declined. See §35 |
| **APX-06** World-readable curriculum | **CONFIRMED (static)** | `00002:119-158` — `modules`, `lessons`, `lesson_resources`, `questions` all `FOR SELECT USING (true)`; `lessons` has no `is_published` and its policy does not join `courses` |
| **APX-07** `/api/learn/*` ignores enrollment | **CONFIRMED** | `learning.controller.ts:78,205` reject only when `!enrollment && !course.is_published && !isAdmin`. `content.controller.ts:519-535` implements the correct gate and has zero callers |
| **APX-08** Auto-generated quizzes trivially passable | **CONFIRMED** | `moduleAssessment.service.ts:51-71` — 10 identical questions, correct option always `display_order: 1`, served ordered by `display_order` |
| **APX-09** GET performs unbounded privileged writes | **CONFIRMED** | `moduleAssessment.service.ts:26-81` invoked from `GET .../modules/:id/assessment`; no unique constraint on `assessments(module_id, assessment_type)`; `moduleId` never checked against the course |
| **APX-10** Ingested HTML rendered as text | **CONFIRMED** | `LessonRenderer.tsx:305,393` render `{lesson.content}` as an escaped JSX child; `AdminMaterialsPage.tsx:1177` previews the same string via `dangerouslySetInnerHTML` |
| **APX-48** YouTube completion is client-authoritative | **CONFIRMED** | §5 |

High findings `APX-11`–`APX-24` were re-checked against source and stand as written in `AUDIT_REPORT.md`. No finding was withdrawn. **No false positives were identified**, with the single qualification that APX-05's *exploitability* rests on Supabase default grants rather than direct observation.

---

## 5. APX-48 — YouTube Completion Finding

### Classification: **CONFIRMED**

### 5.1 Answers to the fifteen validation questions

| # | Question | Answer | Evidence |
|---|---|---|---|
| 1 | What triggers `onCompleteLesson()`? | Four independent client paths | `YouTubeLessonPlayer.tsx:214` (`watchPct >= 90`), `:178` (video ended), `LessonRenderer.tsx:133` (correct checkpoint answer), `:170`/`:185`/`:352`/`:509` (native-video 90 %, and two manual "Mark complete" buttons) |
| 2 | Is the 90 % threshold client-side? | **Yes, entirely** | `YouTubeLessonPlayer.tsx:199-202` — `getCurrentTime()` / `getDuration()` from the IFrame API, computed in the browser, polled every 1 s |
| 3 | What request is sent? | `POST /api/learn/:courseSlugOrId/lessons/:lessonId/complete` with **no body** | `api.ts` `completeLesson()` sends `method: 'POST'` and headers only |
| 4 | What can the browser control? | The two URL params only | There is no body; the client cannot even *send* a watch percentage on this call |
| 5 | Does the backend verify the video was watched? | **No** | `completeLesson` never reads `watch_percentage`, never inspects prior progress, and hardcodes `watch_percentage: 100` |
| 6 | Does it verify enrollment? | **No** | The enrollment row is fetched, then used only for `last_accessed_lesson_id`. A null enrollment does not block the write |
| 7 | Does it verify lesson ∈ course? | **No** | `lessonId` is taken from the URL and written straight into the upsert; no module/course join is performed |
| 8 | Does it verify the lesson/course is published? | **No** | Only `course` existence is checked |
| 9 | Any legitimate completion condition? | **None** | The only guards are "user authenticated" and "course exists" |
| 10 | What row is written? | `lesson_progress` upsert on `(user_id, lesson_id)` → `status:'COMPLETED'`, `watch_percentage:100`, `completed_at: now()` | `learning.controller.ts` `completeLesson` |
| 11 | What RLS controls that write? | None effectively — the write is performed by the **service role**, bypassing RLS | `supabaseAdmin` |
| 12 | Can a student call the endpoint without watching? | **Yes** | One authenticated POST with no body completes any lesson |
| 13 | Can a student write `lesson_progress` directly? | **Yes** | `00002:195-198` `FOR ALL` policy with only an ownership predicate |
| 14 | Can that satisfy `evaluateCourseCompletion()`? | **Yes** | `courseCompletion.service.ts:311-320` counts exactly those rows |
| 15 | Can that produce a certificate? | **Yes** | `courseCompletion.service.ts:433` → `issueCertificateForUser` |

### 5.2 The finding is stronger than first stated

The original wording implied the server trusts a client-reported 90 %. It does not — **the server never receives that number at all.** The completion call is an unconditional command with an empty body. Two consequences:

1. There is no claim to validate; the contract itself must change before any validation is possible.
2. A student needs neither the player nor the video. `curl -X POST -H "Authorization: Bearer <token>" /api/learn/<slug>/lessons/<uuid>/complete` is sufficient.

Separately, `updateLessonProgress` *does* accept a client-supplied `watch_percentage` and persists it (monotonic via `Math.max`), so the one watch figure the database does store is itself client-authored — and `completeLesson` overwrites it with `100` regardless.

### 5.3 Impact on the pending import

The 34 lessons in `supabase/seed/youtube_resources.json` are `lesson_type: 'VIDEO'` with `is_required: true`. On import they become required lessons across five career paths, each completable by a single request. Combined with `APX-03` (a course whose requirements are all trivially satisfiable) and `APX-04` (no enrollment needed), importing before remediation measurably widens the certificate-forgery surface.

---

## 6. Authentication Architecture

**Current (validated, largely sound):** Supabase GoTrue; two roles (`STUDENT` via the `handle_new_user` trigger, `ADMIN` only by manual SQL). `requireAuth` verifies the bearer token by calling `supabaseAdmin.auth.getUser(token)` — a real network verification, not local JWT decoding — so revocation is immediate. `requireAdmin` re-reads `profiles.role` and never trusts JWT claims. Role escalation via PostgREST is genuinely blocked by the `profiles` UPDATE policy's pre-update snapshot comparison.

**Target changes (small):**

| Change | Rationale |
|---|---|
| Reuse the profile `requireAuth` already attached instead of re-querying in `requireAdmin` | Removes a third round-trip per admin request; no security change |
| Remove the redundant `requireAuth, requireAdmin` route pairs | `requireAdmin` already calls `requireAuth`; the pair doubles auth calls |
| Fix `AuthContext.fetchProfile`'s client-side INSERT fallback | There is no INSERT policy on `profiles`, so the fallback always fails; a failed trigger leaves a user permanently profile-less |
| Stop reading the legacy `apex_token` key in `getAuthToken` | It survives `signOut` |
| Add rate limiting on auth routes | None exists beyond GoTrue defaults |
| Decide and document email-confirmation policy | Dashboard setting; **requires runtime verification** |

**Not changing:** the token-verification model. It is correct.

---

## 7. Authorization Architecture

**Principle:** because the API runs as service role, *every* authorization decision on the API path must be explicit in TypeScript, and RLS must independently secure the direct PostgREST path. Two enforcement points, no shared assumptions.

**Target: a single reusable guard chain for learner content.**

```
requireAuth
  -> resolveCourse(courseSlugOrId)            // one implementation, not six inline regexes
  -> requireEnrollment(course)                // unless is_preview lesson, or caller is ADMIN
  -> requireLessonBelongsToCourse(lessonId)   // module.course_id === course.id
  -> requirePublished(course)                 // unless ADMIN preview
  -> handler
```

`getStudentLessonContentAccess` (`content.controller.ts:519-535`) already implements enrollment + published checks correctly and has **zero callers**. It should be promoted to shared middleware rather than rewritten, and `/api/lessons/:lessonId/content-access` either adopted by the UI or retired once `/learn/*` is gated.

The identifier-resolution duplication (six inline slug-vs-UUID regexes, plus a weaker seventh in `issueCertificateHandler`) collapses into `resolveCourse`.

---

## 8. RLS Target Architecture

**Design rule:** RLS secures the *direct PostgREST channel*. It must be tight enough that a holder of the anon key plus a student JWT can do nothing that affects credential eligibility. Server-mediated writes go through the service role and are governed by §7.

| Table | Public SELECT | Student SELECT | Student INSERT | Student UPDATE | Student DELETE | Server / Admin |
|---|---|---|---|---|---|---|
| `profiles` | ✗ | own only | ✗ (trigger only) | own, role immutable | ✗ | admin all |
| `categories` | active only | active only | ✗ | ✗ | ✗ | admin all |
| `institutions` | active only | active only | ✗ | ✗ | ✗ | admin all |
| `programs` | published only | published only | ✗ | ✗ | ✗ | admin all |
| `courses` | published only | published only | ✗ | ✗ | ✗ | admin all |
| `program_courses` | published parents only | same | ✗ | ✗ | ✗ | admin all |
| `modules` | **published course only** | published course only | ✗ | ✗ | ✗ | admin all |
| `lessons` | **preview lessons of published courses only** | **enrolled course, or preview** | ✗ | ✗ | ✗ | admin all |
| `lesson_resources` | ✗ | **enrolled course only** | ✗ | ✗ | ✗ | admin all |
| `assessments` | ✗ | enrolled + published | ✗ | ✗ | ✗ | admin all |
| `questions` | ✗ | **✗ — server-mediated only** | ✗ | ✗ | ✗ | admin all |
| `question_options` | ✗ | ✗ (already correct) | ✗ | ✗ | ✗ | admin all |
| `lesson_progress` | ✗ | own only | **✗ — revoke** | **✗ — revoke** | ✗ | service role only |
| `assessment_attempts` | ✗ | own only | **✗ — revoke** | ✗ | ✗ | service role only |
| `student_answers` | ✗ | own only | **✗ — revoke** | ✗ | ✗ | service role only |
| `enrollments` | ✗ | own only | **✗ — revoke** | **✗ — revoke** | ✗ | service role only |
| `certificates` | ✗ | own only | ✗ (already correct) | ✗ | ✗ | service role only |
| `course_materials` | ✗ | ✗ | ✗ | ✗ | ✗ | admin only (already correct) |
| `lesson_checkpoints` | ✗ | enrolled only | ✗ | ✗ | ✗ | admin all |
| `lesson_checkpoint_options` | ✗ | **✗ — `is_correct` must never be exposed** | ✗ | ✗ | ✗ | admin all |
| `student_checkpoint_attempts` | ✗ | own only | ✗ — server-mediated | ✗ | ✗ | service role only |
| `success_stories` / `articles` / `career_resources` | published only | published only | ✗ | ✗ | ✗ | admin all |
| `counselor_leads` / `enterprise_inquiries` | ✗ | ✗ | **rate-limited, server-mediated** | ✗ | ✗ | admin SELECT |
| `public_question_options` (view) | **drop** | — | — | — | — | — |
| `public_certificate_verifications` (view) | **drop** | — | — | — | — | — |

### Why each material change exists

- **Revoke student INSERT/UPDATE on `lesson_progress`, `assessment_attempts`, `student_answers`, `enrollments`.** These four tables decide credential eligibility. Ownership predicates cannot express "this value was legitimately earned", so the only sound boundary is: the client may never author them. All writes move behind the API, where business rules can be applied. This single change closes `APX-02` and removes the direct-write half of `APX-48`.
- **`lessons` gated on enrolment, `modules` on published course.** `USING (true)` currently exposes unpublished drafts and the full curriculum to anyone with the anon key (`APX-06`). Public marketing pages read curriculum through the API (service role) and are unaffected.
- **`questions` revoked from students.** Question text is currently world-readable even for unpublished assessments; the API already serves questions during an attempt.
- **`lesson_checkpoint_options` restricted.** Migration `00007:42` grants public SELECT on a table containing `is_correct` (`APX-22`). Latent today because the tables are empty, but it is a trap armed for whoever migrates checkpoints off the in-memory store.
- **Both views dropped.** Neither is referenced by any code. `public_certificate_verifications` is an unfiltered join of certificates, learner names and course titles executing with owner rights (`APX-05`); rebuilding it with `security_invoker = true` and a code predicate is optional and only if a product need appears.
- **`is_admin()` gains `SET search_path = public, pg_temp`** (`APX-42`).

**Sequencing constraint:** revoking writes (row 13–16) *must* land in the same change as, or after, the server-side write paths exist — otherwise legitimate progress stops working. See §28 Phase 3.
---

## 9. Lesson Progress Target Architecture

### Model comparison

| Model | Security | Practicality | Verdict |
|---|---|---|---|
| **A.** Client writes `completed=true` directly | None — current state | Trivial | **Reject.** This is `APX-02` |
| **B.** Client calls completion endpoint; server validates enrollment / lesson↔course / published | Closes impersonation and cross-course writes, but still accepts "I finished" on the client's word | Small change | **Insufficient alone** — necessary but not sufficient |
| **C.** Server records *learning events*; completion is derived | Client asserts observations, never conclusions. Auditable, replayable | Moderate — new event table + derivation | **Core of the recommendation** |
| **D.** Completion requires a server-verifiable assessment/checkpoint | Strongest — the artifact is graded server-side and cannot be forged | Changes pedagogy: every lesson needs a check | **Required for credential-bearing completion** |
| **E.** Hybrid: B + C for progress, D for credential eligibility | Strong where it matters, light where it doesn't | Moderate | **RECOMMENDED** |

### Recommended: Model E

Two distinct concepts, deliberately separated:

| Concept | Meaning | Authority | Consequence if forged |
|---|---|---|---|
| **Engagement progress** | "This learner appears to have worked through this lesson" | Client-reported events, server-validated for shape/rate/ownership | Cosmetic — a wrong progress bar |
| **Credential-bearing completion** | "This learner demonstrably met the requirement" | Server-graded artifact only | None — cannot be forged |

**Engagement progress** drives the sidebar ticks, the resume position and the percentage. It is explicitly *not* trusted for certificates.

**Credential eligibility** counts only lessons whose requirement was satisfied by a server-graded artifact, plus assessment passes computed by the server grader.

### Target write path

```
Client  --POST /api/learn/:course/lessons/:lesson/events--> { type, position_seconds, client_ts }
                 |
                 +-- requireAuth
                 +-- resolveCourse
                 +-- requireEnrollment
                 +-- requireLessonBelongsToCourse
                 +-- requirePublished
                 +-- rate limit + monotonic position + wall-clock sanity check
                 v
        lesson_progress_events (append-only, service role)
                 |
                 v
        derive lesson_progress.status / watch_percentage  (server-computed)
                 |
                 v
        evaluateCourseCompletion reads DERIVED state + graded artifacts only
```

Properties: append-only events give an audit trail (currently absent everywhere); derivation is idempotent and re-runnable; concurrency is handled because events are inserts, not read-modify-write; a replayed event is a no-op by `(user, lesson, client_ts)` uniqueness.

**`lesson_progress` becomes a server-owned projection.** No client write path, direct or indirect.

---

## 10. YouTube Completion Target Architecture

### 10.1 The hard constraint, stated plainly

**Server-side verification of YouTube watch percentage is impossible with an embedded player.** This is not an implementation gap:

- The IFrame API (`getCurrentTime`, `getDuration`, player state) executes in the learner's browser. Every value is client-controlled.
- YouTube provides **no server-side callback, webhook or per-user watch record** to a third-party application. YouTube Analytics data belongs to the *channel owner*, not the embedder, and is not per-viewer.
- The Data API v3 yields video *metadata* (duration, title, embeddability) — never who watched what.

Therefore: **any statement about how much of a YouTube video a learner watched is a client assertion, and always will be.** The blueprint does not pretend otherwise, and no design below claims exact watch time is server-verifiable.

### 10.2 What the server *can* legitimately do

| Control | Server-verifiable? | Value |
|---|---|---|
| Learner is authenticated and enrolled | ✅ Yes | Blocks unenrolled completion |
| Lesson belongs to the course and is published | ✅ Yes | Blocks cross-course and draft writes |
| Video duration (from Data API at import time, stored on `lessons.duration_seconds`) | ✅ Yes | Gives a real denominator instead of `0` |
| Wall-clock elapsed between first and last event ≥ a plausible fraction of duration | ✅ Yes | Defeats naive instant-completion; **not** proof of watching |
| Event cadence is plausible (rate-limited, monotonic position) | ✅ Yes | Raises forgery cost; **not** proof |
| Actual pixels watched | ❌ **No** | — |

Elapsed-time and cadence checks raise the cost of forgery from *one request* to *a scripted session*. That is a real improvement and worth doing — but it is anti-abuse hardening, not proof, and must be documented as such.

### 10.3 Recommended model for video lessons

1. **Video engagement is a signal.** Player events flow to the §9 events endpoint. The server derives `IN_PROGRESS` / `COMPLETED (engagement)` for UX. `onCompleteLesson()` as an unconditional command is removed.
2. **Credential eligibility requires a server-graded artifact.** Every *required* video lesson carries a checkpoint — the `lesson_checkpoints` tables from migration `00007` already model this and are unused. The learner answers; the server grades; the graded pass is the completion evidence.
3. **Optional lessons need no checkpoint** — mark them `is_required = false` and let engagement alone drive their UX state.
4. **The player keeps every hardening already applied:** `youtube-nocookie.com`, `origin` parameter, error codes `101`/`150` → "cannot be embedded by its owner", `100` → removed/private, no application redirect to YouTube, native fullscreen and branding untouched, responsive sizing.

This satisfies Part 26: the LMS gains video learning without adding a client-authoritative completion mechanism — and removes the one it already had.

### 10.4 Effect on the 34 pending lessons

Import only after Phases 3–4. Each of the 34 needs either a checkpoint (if required) or `is_required = false`. This is a content decision for the product owner (§35).

---

## 11. Assessment Target Architecture

Server-side grading already exists and is correct (`moduleAssessment.service.ts:93-98` and `finalAssessment.service.ts:570-575` deliberately exclude `is_correct` from student-facing queries). The failures are around it.

| Stage | Target |
|---|---|
| **Attempt creation** | Explicit `POST .../attempts` creates a server-owned attempt with `started_at` from the server clock. Replaces today's fabricated `Date.now() - 300000`. Enforces `max_attempts` (`APX-11`) before issuing one |
| **Answer submission** | Client submits `{question_id, option_id}[]` only — the sole legitimate client input in the whole credential chain |
| **Grading** | Unchanged in spirit: server loads `is_correct`, computes score. Extend to true multi-select (`correctMap` is currently one option per question, so `MULTIPLE_CHOICE` grades incorrectly) |
| **Score / pass** | Server-derived exclusively. `passed`, `percentage`, `score` become non-writable by the client (§8) |
| **Attempt limits** | `assessments.max_attempts` enforced; attempt number allocated inside a transaction, ending the `count+1` race |
| **Retakes** | Permitted while under the cap; best-attempt semantics defined explicitly |
| **Answer-key disclosure** | Withhold `correct_option_id` and `explanation` until the learner has passed **or** exhausted attempts. Today they are returned after every submission, which with unlimited attempts makes any quiz brute-forceable (`APX-11`) |
| **Audit trail** | Attempt + answers written in one transaction (RPC). Today they are two statements with the second error ignored |
| **Auto-generation** | Removed (`APX-08`, `APX-09`). A module with no authored quiz has no quiz requirement, surfaced to admins as an authoring gap |
| **Timing** | Honour `duration_minutes` server-side against the server-issued `started_at` |

---

## 12. Course Completion Target Architecture

### Derived from the existing implementation, not invented

`evaluateCourseCompletion` already encodes the intended three-way rule: all required lessons complete **AND** all `MODULE_QUIZ` assessments passed **AND** the final assessment passed. The structure is right; the inputs and the empty-set semantics are wrong.

### Target rule

```
course_completed :=
      enrollment EXISTS and is active                      -- new, closes APX-04
  AND course has at least one required element             -- new, closes APX-03
  AND every required lesson has a server-verified completion
  AND every required MODULE_QUIZ has a passing server-graded attempt
  AND (final assessment absent AND not required)
       OR (final assessment present AND passed)
```

### Edge cases, resolved explicitly

| Case | Current | Target |
|---|---|---|
| Zero assessments **and** zero required lessons | Completes instantly (`APX-03`) | **Not completable.** `certificateEligible = false`; surfaced to admins as an incomplete course |
| Lessons but no quizzes | Completes on lessons alone | Allowed **only** if lesson completions are server-verified (§9/§10). Otherwise not credential-bearing |
| Modules but no assessments | Same as above | Same |
| Incomplete lessons | Not complete ✅ | Unchanged |
| Completed lessons, failed assessment | Not complete ✅ | Unchanged |
| Completed lessons, passed assessments | Complete ✅ | Unchanged |
| Missing final assessment | Treated as passed (`APX-12`) | New `courses.requires_final_assessment` flag: if true and absent → **not completable** |
| Duplicate module assessments | Denominator inflates; module becomes uncompletable | Prevented by `UNIQUE(module_id, assessment_type)` (`APX-09`) |
| Unpublished / deleted content | Silently changes the denominator | Snapshot the requirement set at completion time into the certificate record |
| Historical completions | — | Never retroactively invalidated; audited read-only (§27) and annotated, not deleted |

**Side-effect removal:** `getCourseCompletionSummaryHandler` is a `GET` that writes `enrollments` and can issue a certificate. Evaluation becomes pure; persistence and issuance move to explicit `POST` paths.

**Performance:** the engine runs 7–9 sequential queries on every lesson completion and every submission (≈400 queries for a 50-lesson course). Target: one Postgres function returning the full requirement set — which also gives the transaction that §13 needs.

---

## 13. Certificate Target Architecture

| Requirement | Target |
|---|---|
| Server-derived eligibility | Only from §12; no client input reaches it |
| Enrollment verification | Mandatory; `certificates.enrollment_id` populated, then `NOT NULL` after backfill (`APX-04`) |
| Completion verification | Re-evaluated inside the issuing transaction, not read from a cached flag |
| Assessment verification | Included in §12 |
| Duplicate prevention | `UNIQUE (user_id, course_id)` + `INSERT … ON CONFLICT DO NOTHING`, replacing today's read-then-write race (`APX-19`) |
| Stable certificate ID | Keep `certificate_code` as the public identifier; widen entropy beyond `randomBytes(4)` (32 bits against a UNIQUE column) and handle 23505 with a retry. Drop the hardcoded `APEX-STAT-` prefix — it stamps every course in every domain as "STAT" |
| Public verification | §14 |
| Privacy | Verification returns only what a verifier needs, for one code at a time |
| Revocation | `verification_status = 'REVOKED'` is honoured by the verifier but unreachable — add an admin endpoint |
| Auditability | Record the requirement snapshot, evaluator version and issuing timestamp |
| Identity | Fix `certificate.service.ts:57` selecting the non-existent `profiles.email`, which silently nulls the profile and stamps every new certificate `'Apex Academy Student'` (`APX-14`) |

**Synchronous, asynchronous or transactional?** → **Synchronous and transactional**, via a single Postgres function that re-evaluates eligibility, inserts under the unique constraint and returns the certificate. Rationale: issuance is low-volume and user-visible (the learner expects it immediately); the correctness requirement is exactly-once under concurrency, which a transaction gives and a queue would only complicate; and today's failure mode is *two* certificates from two concurrent triggers, which a unique constraint inside a transaction eliminates outright. PDF rendering — currently absent, with `pdf_url` and the `certificates` bucket unused — is the part that should be **asynchronous**, since it is slow and non-critical to eligibility.

---

## 14. Public Certificate Verification

**Current:** `GET /api/certificates/verify/:code` works for the happy path but interpolates unsanitised input into a PostgREST `.or()` filter (`APX-25`), hardcodes the year `2026` and a `APEX-STAT-2026-` prefix, and falls back to the literal course title `'Statistics for Data & Analytics'`. Separately, `public_certificate_verifications` bypasses RLS entirely (`APX-05`).

**Target:**

- Drop the view; verification happens only through the API.
- Parameterised lookup by exact `certificate_code` — no string interpolation, no year assumption.
- Response limited to: learner display name, course title, issue date, status. No user id, no course id, no enrollment id.
- Rate-limited and non-enumerable: high-entropy codes plus throttling, so codes cannot be walked.
- Honour `REVOKED`.
- Delete `VerifyCertificatePage.tsx` (`APX-36`) — an unrouted page that returns `AUTHENTIC & VERIFIED` for any input, with a hardcoded learner name.

---

## 15. Curriculum Visibility

Three distinct tiers, currently collapsed into one:

| Tier | Contains | Audience | Current | Target |
|---|---|---|---|---|
| **Public catalogue** | Course title, description, module titles, lesson titles, durations, preview lessons | Anyone | Exposed *plus* everything below | Published courses only; lesson **titles** but not bodies |
| **Authenticated learning content** | Lesson bodies, resources, signed URLs, assessments, questions | Enrolled learners | Exposed to anyone with the anon key | Enrolment-gated at both RLS and API |
| **Admin / draft** | Unpublished courses, draft lessons, answer keys, materials | Admins | Draft lessons/modules/questions publicly readable | Admin-only |

`lessons` has no `is_published` column and its policy does not join `courses`, so drafts leak today. Two options: add `lessons.is_published`, or scope the policy through `modules → courses.is_published`. **The join is preferable** — one source of truth, no new column to keep in sync, and it matches how the publish guard already reasons.

---

## 16. Content / Resource Architecture

**The format contradiction (`APX-10`):** ingestion writes HTML into `lessons.content`; `LessonRenderer.tsx:305,393` renders it as an escaped JSX child, so students see literal `<h2>` tags — while `AdminMaterialsPage.tsx:1177` previews the same string through `dangerouslySetInnerHTML` and looks correct. That asymmetry is why it survived.

**Recommendation: store Markdown, render sanitised.** Not `dangerouslySetInnerHTML` as a blind fix.

- `convertTextToHtml` becomes `convertTextToMarkdown`; existing HTML rows are migrated by a one-off, reversible conversion.
- Render through a Markdown renderer with an allow-list, no raw HTML passthrough.
- If HTML must be retained instead, then rendering **must** go through a sanitiser (DOMPurify or equivalent) with an explicit allow-list — never raw `dangerouslySetInnerHTML`. The same applies to `ResourceDetailPage.tsx:121`, which renders `articles.content` unsanitised today (`APX-35`) while session tokens sit in `localStorage`.

**Resource pipeline fixes:** `lesson_resources.url` does not exist — both insert sites must use `file_url`, and both currently ignore the error (`APX-16`). Storage-path collisions break replace/versioning (`APX-17`). MIME allow-list is declared and never applied; the upload-existence check is computed and discarded (`APX-30`). Signed URLs minted for one year and intended for database persistence should be short-lived and generated on demand.

---

## 17. Existing Database Contract Problems

| Field | In migration? | In `database.types.ts`? | Queried by | Runtime impact | Correct source |
|---|---|---|---|---|---|
| `profiles.email` | ❌ No | ❌ No | `certificate.service.ts:57`; `admin.controller.ts:33` | Admin certificates page 500s; every new certificate stamped `'Apex Academy Student'` | `auth.users.email` via the admin API, or drop the field |
| `courses.status` | ❌ No | ❌ No | `materials.controller.ts` `getBulkImportSummary` | Endpoint 500s | Derive from `is_published` |
| `assessments.type` | ❌ No (`assessment_type`) | ❌ No | `learning.controller.ts:145` | `hasFinalAssessment` permanently false; header hides the exam while the sidebar offers it | `assessment_type = 'FINAL_ASSESSMENT'` |
| `lesson_resources.url` | ❌ No (`file_url`) | ❌ No | `materials.controller.ts:689,949` | Source PDF never attached; error unchecked, so failure is invisible | `file_url` |

**Why the hand-written types failed:** `database.types.ts` is authored by hand, so it encodes the developer's belief rather than the schema. It never contained these four fields, so it could not contradict them — and because API responses are consumed as `any` (70 occurrences in `api.ts` alone) with `strict` disabled, nothing downstream objected either. The type system was never connected to the database.

**Recommendation: generated types become mandatory.** Replace the file with `supabase gen types typescript` output, regenerate in CI, and fail the build on drift. This converts an entire class of production incidents into compile errors. Enable `strict` behind a per-directory ratchet rather than repo-wide, since it will surface many pre-existing errors at once.

---

## 18. Existing Data Integrity Problems

| Problem | Cause | Target |
|---|---|---|
| Duplicate certificates | No `UNIQUE(user_id, course_id)`; read-then-write | Unique constraint + `ON CONFLICT` |
| Duplicate module assessments | No `UNIQUE(module_id, assessment_type)`; auto-creation from a GET | Constraint + remove auto-creation |
| Attempt-number races | `count+1` then insert | Allocate inside a transaction |
| Attempt without answers | Two statements, second error ignored | Single RPC |
| `lesson_progress` with mismatched `course_id` | No FK or CHECK ties the lesson to the course | Validate server-side; add a CHECK or derive `course_id` |
| Orphaned storage objects / rows | Non-transactional delete ordering, unverified uploads | Reconciliation job + verify-before-register |
| Certificates blocked by `ON DELETE RESTRICT` | FK choice | Blocks GDPR erasure; needs an explicit retention decision |
| Migration `00004` mass-deletes learner data | Unconditional `DELETE FROM` on 17 tables | Neutralise; move to a guarded script (`APX-18`) |
| Migrations `00007`/`00009` not replayable | Bare `CREATE POLICY` | Guard with `DROP POLICY IF EXISTS` (`APX-32`) |
| Missing indexes | — | `lesson_progress(user_id, course_id, status)`, `assessment_attempts(user_id, passed)`, `certificates(user_id, course_id)`, `assessments(module_id)` |
---

## 19. YouTube Integration Architecture

**Confirmed: the existing hierarchy is sufficient. No new schema hierarchy is required.**

```
courses  ->  modules  ->  lessons  ->  lessons.video_url
```

| Requested concept | Existing entity | Verdict |
|---|---|---|
| Course | `courses` | Reuse |
| Section | `modules` | Reuse |
| Subsection | `lessons` | Reuse |
| Video | `lessons.video_url` | Reuse — already rendered by `LessonRenderer` → `YouTubeLessonPlayer` |

**No `youtube_resources` table is warranted.** Cross-domain sharing is already solved structurally: a skill course belongs to several programs via `program_courses`, so one lesson serves every domain that includes that course. A canonical-video table would create a second source of truth for something `lessons.video_url` already models. All 107 provided IDs are unique — there is no duplication to deduplicate.

**Five specialisation courses** attach to the five gap domains through the existing `program_courses` relationship — the same pattern the six complete domains already use.

**Player architecture (already implemented, to be preserved):** `youtube-nocookie.com/embed` with `origin`, `enablejsapi=1`, `rel=0`, error codes `101`/`150` → "cannot be embedded by its owner", `100` → removed/private, native fullscreen and branding untouched, responsive sizing, no application redirect to YouTube, nothing downloaded or rehosted, no restriction bypassed.

**The one architectural change:** the player must stop calling `onCompleteLesson()` as an unconditional command and instead emit events (§9/§10).

---

## 20. YouTube Import Architecture

**Status: built, dry-run verified, NOT executed. It must remain unexecuted until after Phase 4.**

| Property | Implementation |
|---|---|
| Dry run by default | Writes only with `--apply` |
| Idempotent | Natural keys: `courses.slug`, module title within course, lesson title within module |
| Non-destructive | Never overwrites a lesson holding a different video; never deletes; never touches `enrollments`, `lesson_progress`, `assessment_attempts`, `certificates` |
| Validated | Video IDs checked against `^[A-Za-z0-9_-]{11}$`; manifest duplicate check before any database call |
| Safe publish posture | Courses created `is_published = false`, so they must pass the existing publish guard — deliberately avoiding the `publish-all` bypass (`APX-23`) |
| Verifies prior state | Warns if any of the 72 already-integrated IDs have disappeared |

**Planned writes: 78** — 5 courses, 5 `program_courses` links, 34 modules, 34 lessons.

**Why it must wait for Phase 4:** the 34 lessons are `lesson_type: 'VIDEO'`, `is_required: true`. Importing before the completion fix adds 34 new one-request-to-complete required lessons across five career paths, each feeding certificate eligibility (`APX-48` × 34). After Phase 4, each needs either a checkpoint or `is_required = false` — a product decision (§35).

---

## 21. Market Analytics M5 Conflict

| Field | Value |
|---|---|
| Domain | Market Analytics & Research |
| Module | M5 Survey Design & Primary Data Collection |
| Provided | `YfH24K_YjHw` — *Masterclass in Survey Design Best Practices* (Sawtooth Software) |
| Already in database | `NBbY_blKEHQ` — *Survey Methodology & Primary Data Collection Best Practices* |
| Importer behaviour | `SKIP_CONFLICT` — **neither video is overwritten** |
| Status | **REQUIRES PRODUCT-OWNER CONFIRMATION** |

Options: (a) replace the existing video with the provided one; (b) add the provided video as a second lesson in M5; (c) keep the existing and drop the provided. **Not guessed.** Recorded under `conflicts` in `supabase/seed/youtube_resources.json`.

---

## 22. Existing Course / Data Pollution

**Observation:** `statistics-data-analytics` contains modules M12–M19 titled *Machine Learning Foundations*, *Model Validation & Optimization*, *Market Research Foundations*, *Market Sizing*, *Competitive Analysis*, *Customer Segmentation*, *Survey Research*, *Market Research Capstone* — subject matter belonging to the Applied ML and Market Research domains.

**Classification attempts:**

| Hypothesis | Evidence for | Evidence against |
|---|---|---|
| Confirmed data corruption | Titles duplicate modules that exist in `applied-machine-learning-mlops` and `market-research-consumer-analytics` | No corrupting code path was found; nothing writes cross-domain modules |
| Incorrect course mapping | The Statistics course is shared by Data Scientist, MLE, Market Analytics, Data Analyst and BI Analyst paths — appending their content here would make it reachable from each | Also makes it reachable from paths where it does not belong |
| Legacy content | The orphaned `seedStatisticsLessons.ts` / `seedCurriculumBatch1.ts` scripts are the only definition of this catalogue and are not invoked by anything | Neither script was executed during this audit, so authorship cannot be traced |
| Intentional shared content | Would explain reachability from several paths | Contradicts the pattern used everywhere else, where domain content lives in a specialisation course |

**No corrupting code path exists in the repository, and the current database contents are not reproducible from it** (`APX-40`). Therefore:

### **REQUIRES PRODUCT / DATA VERIFICATION**

Nothing was moved, deleted or modified. Read-only detection queries are specified in §27.

---

## 23. Proposed Five Specialisation Courses

**Status: PROPOSED — REQUIRES PRODUCT OWNER CONFIRMATION.** These five course titles are the only invented strings in the entire import plan; every module and lesson title is taken verbatim from the supplied curriculum.

| # | Proposed title | Slug | Domain | Modules | Videos |
|---|---|---|---|---|---|
| 1 | Data Science Applied Track | `data-science-applied-track` | Data Scientist | 7 | 7 |
| 2 | AI Engineering & LLM Systems | `ai-engineering-llm-systems` | AI Engineer | 6 | 6 |
| 3 | AI Backend Engineering | `ai-backend-engineering` | AI Backend Engineer | 7 | 7 |
| 4 | ETL Development & Orchestration | `etl-development-orchestration` | ETL Developer | 6 | 6 |
| 5 | BI Analytics & Reporting | `bi-analytics-reporting` | BI Analyst | 8 | 8 |

Titles are recorded unchanged, as instructed.

---

## 24. Testing Strategy

No test file, runner, CI configuration or coverage tooling exists anywhere in the repository. Tests are written **before** each remediation phase lands, so the phase has a failing test to turn green.

| Layer | Tool | Purpose |
|---|---|---|
| RLS policy | pgTAP or an integration harness authenticating as a **real non-privileged user** | The only way to test the direct PostgREST channel. Must not use the service role |
| Schema contract | `supabase gen types` + diff in CI | Fails the build on drift; mechanically covers `APX-13`–`APX-16` |
| Service unit | Vitest | `evaluateCourseCompletion` edge cases |
| API integration | Vitest + supertest | Authorization boundaries per endpoint |
| E2E | Playwright | Register → enrol → learn → assess → certificate → verify |
| Component | Vitest + Testing Library | `LessonRenderer` content rendering; player error states |

---

## 25. Security Test Matrix

### Authentication
| Test | Expected |
|---|---|
| Anonymous access to `/api/learn/*` | 401 |
| Expired session token | 401 |
| Malformed / forged token | 401 |
| Token for a deleted user | 401 |

### Authorization
| Test | Expected |
|---|---|
| Student calls any `/api/admin/*` | 403 |
| Student reads another student's progress / attempts / certificates | Empty or 403 |
| **Unenrolled** student opens a published course lesson | **403** (fails today) |
| Any student reads an unpublished course's lessons | 403 |
| Student submits a `lessonId` from a different course | 400 (fails today) |

### Progress
| Test | Expected |
|---|---|
| Direct PostgREST insert of `lesson_progress` with `status='COMPLETED'` | **Denied** (succeeds today) |
| `POST .../complete` with no watch evidence | **Rejected** (succeeds today) |
| Cross-user progress write | Denied |
| Duplicate progress rows | Prevented by `UNIQUE(user_id, lesson_id)` |
| Concurrent completion of the same lesson | Exactly one row, no error |

### YouTube completion (APX-48 regression suite)
| Test | Expected |
|---|---|
| `curl -X POST .../lessons/:id/complete` with no body, never opening the player | **Rejected** |
| Replay of a captured completion request | Rejected / idempotent no-op |
| Forged event stream at implausible cadence | Rejected by rate/monotonicity checks |
| Events for a lesson in another course | Rejected |
| Events from an unenrolled learner | Rejected |
| Engagement completion alone on a required lesson | **Does not** grant credential eligibility |

### Assessment
| Test | Expected |
|---|---|
| Direct insert of an attempt with `passed=true` | **Denied** (succeeds today) |
| Forged `score` / `percentage` in a submission | Ignored — server-derived |
| Answer key present in the pre-submission payload | Absent (correct today) |
| Answer key present in the post-submission payload before pass/exhaustion | **Absent** (present today) |
| Attempts beyond `max_attempts` | Rejected (unlimited today) |
| Replayed submission | No new attempt |
| First option always correct in a generated quiz | **No generated quizzes exist** |

### Certificate
| Test | Expected |
|---|---|
| Issue without enrollment | **Denied** (succeeds today) |
| Issue without completion | Denied |
| Issue after a failed final assessment | Denied |
| Two concurrent issuance triggers | Exactly one certificate |
| Sequential-code enumeration | Not feasible |
| Revoked certificate verification | Reports revoked |

### RLS by role
| Role | Must NOT be able to |
|---|---|
| `anon` | Read `lessons`, `modules`, `questions`, `certificates`, either view |
| `authenticated` (student) | Write `lesson_progress`, `assessment_attempts`, `student_answers`, `enrollments`; read `question_options`, `lesson_checkpoint_options`, other users' rows |
| `admin` | — (full access expected; verify it still works) |

---

## 26. Migration Strategy

**Forward-only, additive, reversible-by-design.** Existing migrations `00001`–`00009` are never edited except to neutralise `00004`'s destructive `DELETE` block (`APX-18`), which is a safety fix, not a schema change.

| New migration | Contents | Reversible |
|---|---|---|
| `00010_rls_lockdown` | Revoke student INSERT/UPDATE on the four credential tables; scope `lessons`/`modules`/`questions`/`lesson_resources`; restrict `lesson_checkpoint_options`; `SET search_path` on `is_admin()` | Yes — policies are re-creatable |
| `00011_drop_public_views` | Drop both RLS-bypassing views | Yes — definitions preserved in `00001` |
| `00012_integrity_constraints` | `UNIQUE(user_id, course_id)` on certificates; `UNIQUE(module_id, assessment_type)` and `UNIQUE(course_id, assessment_type)` on assessments; missing indexes | Yes — but **requires de-duplication first** (§27) |
| `00013_progress_events` | `lesson_progress_events` append-only table | Yes |
| `00014_completion_rpc` | Postgres functions for completion evaluation, attempt creation, certificate issuance | Yes |
| `00015_certificate_provenance` | `enrollment_id` populated + `NOT NULL`; requirement snapshot | Requires backfill first |

Every migration guards policies with `DROP POLICY IF EXISTS` — fixing the `00007`/`00009` replay defect (`APX-32`) by example.

---

## 27. Data Remediation Strategy

**Read-only audit first. No record is modified in this phase, and no cleanup runs before the constraints that prevent recurrence.**

### Detection queries (read-only, safe to run any time)

| Target | Detects |
|---|---|
| `lesson_progress` rows `COMPLETED` for a user with **no enrollment** in that course | Progress without entitlement |
| `lesson_progress` rows whose `course_id` ≠ the lesson's actual course | Cross-course corruption |
| `assessment_attempts` with `passed = true` and **zero** `student_answers` | Forged or partially-written attempts |
| `assessment_attempts` whose recomputed score contradicts `passed` | Forged pass state |
| `certificates` with no matching enrollment | `APX-04` exploitation |
| `certificates` whose course fails a re-evaluation of §12 | Issued under the broken rule |
| Duplicate `(user_id, course_id)` in `certificates` | `APX-19` |
| Duplicate `(module_id, assessment_type)` in `assessments` | `APX-09` |
| Modules whose subject matter does not match their course | §22 pollution — **manual review, not automated** |

### Sequence

1. **Snapshot** the affected tables to an offline export before any write.
2. **Run detection**, produce counts and a per-record report. Decide nothing yet.
3. **Classify** with the product owner: legitimate / ambiguous / clearly invalid.
4. **Annotate, do not delete.** Add a provenance column recording that a record predates the fixed engine. Historical completions are never silently revoked.
5. **De-duplicate** only where a unique constraint requires it, keeping the earliest record.
6. **Then** apply `00012`.

**Certificates already issued under the broken rules are a business decision, not a technical one** (§35).

---

## 28. Implementation Phases

The proposed order is sound in outline; three changes are needed, explained below.

| Phase | Work | Why here |
|---|---|---|
| **0** | Git baseline | Nothing else is safely reversible without it. Zero risk, purely additive |
| **1** | Credential remediation (`APX-01`) | The key must be assumed compromised; every later phase touches production with it. Rotate, remove both hardcoded constants, fail fast at startup, purge `.env.example`, rebuild `dist/` |
| **2** | **Read-only data audit (§27)** — *moved earlier* | Must run **before** RLS lockdown. Once writes are revoked the current exploitation footprint becomes harder to characterise, and Phase 6's constraints will fail against undetected duplicates |
| **3** | Authorization + RLS model (`APX-02`, `APX-06`, `APX-22`, `APX-42`) — **paired with the server-side write paths** | Revoking client writes without server endpoints breaks legitimate progress. These must ship together |
| **4** | Lesson-progress authority (§9) | Depends on Phase 3's write path |
| **5** | **APX-48 YouTube completion (§10)** | Depends on Phase 4's event pipeline. Cannot be fixed independently |
| **6** | Assessment authority (§11) + integrity constraints | Depends on Phase 2 de-duplication |
| **7** | Course completion engine (§12) | Depends on Phases 4–6 supplying trustworthy inputs |
| **8** | Certificate issuance (§13) | Depends on Phase 7 |
| **9** | Secure `/api/learn/*` (`APX-07`) | Could land with Phase 3; kept separate because it touches many handlers |
| **10** | Curriculum visibility (§15) | Follows the Phase 3 RLS model |
| **11** | Certificate verification exposure (§14) | Independent; can run in parallel from Phase 3 |
| **12** | Database contracts + generated types (§17) | **Recommended earlier than proposed** — it is cheap, low-risk, and turns a class of defects into build failures that would otherwise recur during Phases 4–8 |
| **13** | Content rendering / resource pipeline (§16) | Independent |
| **14** | Quiz generation removal (`APX-08`, `APX-09`) | Folds into Phase 6 |
| **15** | Institutions lead persistence (`APX-24`) | Fully independent; can run any time |
| **16** | **YouTube import** | **Must follow Phase 5.** Importing 34 required video lessons before then multiplies `APX-48` |
| **17** | Data cleanup (§27 steps 4–6) | Needs Phases 6–8 to define what "valid" means |
| **18** | Automated security + regression testing (§24–25) | Tests are written *per phase*; this phase is the consolidated suite and CI gate |

### Deviations from the proposed order

1. **Data audit moved from 16 → 2.** Evidence of exploitation must be captured before the doors close, and constraint migrations need a clean dataset.
2. **Database contracts moved from 11 → early (12, ideally alongside 3).** Generated types are cheap and prevent the same defect class from recurring throughout the security work.
3. **RLS and the server write paths are one phase, not two.** Sequencing them separately guarantees a window where learners cannot record progress.

---

## 29. File Impact Map

| Phase | File | Purpose | Change | Risk | Dependencies |
|---|---|---|---|---|---|
| 1 | `src/backend/database/supabaseAdmin.ts` | Remove hardcoded key, fail fast | Modify | Low — app stops without config, intended | Rotation done |
| 1 | `.env.example` | Purge credential | Modify | None | — |
| 2 | `scripts/auditLearnerData.ts` | Read-only detection | Create | None | — |
| 3 | `supabase/migrations/00010_rls_lockdown.sql` | Revoke + scope policies | Create | **High** — can break legitimate reads/writes | Server write paths in same phase |
| 3 | `src/backend/middleware/authorization.middleware.ts` | `resolveCourse`, `requireEnrollment`, `requireLessonBelongsToCourse` | Create | Medium | — |
| 3 | `src/backend/controllers/learning.controller.ts` | Apply guards to all `/learn/*` | Modify | Medium | Middleware |
| 3 | `src/backend/controllers/content.controller.ts` | Promote existing gate to shared middleware | Modify | Low | — |
| 4 | `supabase/migrations/00013_progress_events.sql` | Event table | Create | Low — additive | — |
| 4 | `src/backend/services/progress.service.ts` | Event ingestion + derivation | Create | Medium | Migration |
| 5 | `src/components/learning/YouTubeLessonPlayer.tsx` | Emit events; remove unconditional `onCompleteLesson` | Modify | Medium — UX change | Progress service |
| 5 | `src/components/learning/LessonRenderer.tsx` | Same for native video + checkpoint paths | Modify | Medium | — |
| 5 | `src/pages/student/LearningInterfacePage.tsx` | Optimistic-update reconciliation | Modify | Low | — |
| 6 | `src/backend/services/moduleAssessment.service.ts` | Remove auto-generation; enforce `max_attempts`; withhold key | Modify | **High** — changes completion state for in-flight learners | Phase 2 de-dup |
| 6 | `supabase/migrations/00012_integrity_constraints.sql` | Unique constraints + indexes | Create | High — fails on existing duplicates | Phase 2 |
| 7 | `src/backend/services/courseCompletion.service.ts` | Enrollment + non-empty requirement; remove GET side effects | Modify | High | Phases 4–6 |
| 8 | `src/backend/services/certificate.service.ts` | Transactional issuance; fix `profiles.email`; drop `STAT` prefix | Modify | Medium | Phase 7 |
| 8 | `supabase/migrations/00015_certificate_provenance.sql` | `enrollment_id` + snapshot | Create | Medium | Backfill |
| 10 | `supabase/migrations/00011_drop_public_views.sql` | Drop both views | Create | Low — unreferenced | — |
| 12 | `src/types/database.types.ts` | Replace with generated output | Replace | Medium — surfaces latent errors | — |
| 12 | `tsconfig.json` | Enable `strict` (ratcheted) | Modify | Medium | Generated types |
| 13 | `src/components/learning/LessonRenderer.tsx` | Markdown render or sanitised HTML | Modify | Medium | Format decision |
| 13 | `src/pages/public/ResourceDetailPage.tsx` | Sanitise article HTML | Modify | Low | — |
| 15 | `src/pages/public/InstitutionsPage.tsx` + new endpoint | Persist partnership leads | Modify/Create | Low | — |
| 16 | `scripts/importYouTubeResources.ts` | Run with `--apply` | Execute | Medium — 78 production rows | Phase 5 + §35 decisions |
| 18 | `tests/**`, CI config | Test suite | Create | None | All |

---

## 30. Dependency Graph

```
Phase 0 (git)
   |
Phase 1 (credentials) ── independent of everything below, but first
   |
Phase 2 (read-only data audit) ──────────────┐
   |                                          |
Phase 3 (RLS + authz + server write paths)    |
   |         |                                |
   |         +--> Phase 9  (/api/learn/*)     |
   |         +--> Phase 10 (curriculum vis.)  |
   |         +--> Phase 11 (cert verification) — parallel
   |                                          |
Phase 4 (progress authority)                  |
   |                                          |
Phase 5 (APX-48 YouTube completion)           |
   |                                          |
   |    Phase 6 (assessment authority) <──────+ (needs de-dup)
   |       |
   +-------+--> Phase 7 (completion engine)
                   |
                Phase 8 (certificates)
                   |
                Phase 17 (data cleanup)

Phase 12 (contracts/types) ── early, feeds 4-8
Phase 13 (content rendering) ── independent
Phase 15 (institutions leads) ── fully independent
Phase 16 (YouTube import) ── REQUIRES Phase 5
Phase 18 (tests) ── per-phase, consolidated last
```

**Critical path:** 0 → 1 → 2 → 3 → 4 → 5 → 7 → 8. Phases 11, 13 and 15 can run in parallel by a second contributor without conflict.

---

## 31. Regression Risks

| Change | Risk | Mitigation |
|---|---|---|
| RLS lockdown (Phase 3) | Legitimate reads break if any browser code queries these tables directly | Audit found only `profiles` read directly by `AuthContext`; verify with a full client-side query inventory before shipping |
| Revoking client writes | Progress recording stops if server paths are incomplete | Ship both halves in one phase; E2E test before merge |
| Curriculum scoping | Public catalogue pages could go blank | They read via the API (service role) and are unaffected — confirm with an E2E pass |
| Removing quiz auto-generation (Phase 6) | Modules relying on generated quizzes lose them; in-flight learners' completion state changes | Inventory affected modules first; communicate; consider grandfathering |
| Completion rule tightening (Phase 7) | Learners who "completed" under the old rule may become incomplete | Never retroactively revoke; annotate historical records (§27 step 4) |
| Unique constraints (Phase 6) | Migration fails on existing duplicates | Phase 2 de-duplication is a hard prerequisite |
| `strict` TypeScript (Phase 12) | Large error surface at once | Per-directory ratchet |
| Markdown migration (Phase 13) | Existing HTML rows render as literal text — the same defect inverted | Convert rows in the same change; verify a sample |
| YouTube import (Phase 16) | 78 rows in production; 5 new courses visible | Created unpublished; publish guard applies; dry run first |
| Player event refactor (Phase 5) | Progress stops updating if events fail silently | Surface errors instead of the current silent optimistic update |

---

## 32. Rollback Strategy

| Layer | Mechanism |
|---|---|
| Code | Git revert — **available only after Phase 0**, which is why it is first |
| RLS policies | Every policy is `DROP POLICY IF EXISTS` + `CREATE`; a down-migration restores the prior definition verbatim from `00002` |
| Dropped views | Definitions preserved in `00001`; recreate if needed |
| New tables (`lesson_progress_events`) | Additive; drop with no data loss to existing tables |
| Constraints | Droppable; the data they reject must be resolved first |
| Data annotations | Additive columns only — no destructive edit, so rollback is a column drop |
| YouTube import | No down-script exists. Rollback is manual deletion of 78 identifiable rows (5 slugs, their modules and lessons). **A pre-import snapshot is mandatory** |
| Credential rotation | Not rollback-able by design; the old key must stay revoked |

**Universal precondition:** an offline export of `enrollments`, `lesson_progress`, `assessment_attempts`, `student_answers` and `certificates` before Phase 3.

---

## 33. Definition of Done

| Phase | Must change | Must remain unchanged | Security condition | Functional condition | Tests | Rollback |
|---|---|---|---|---|---|---|
| 0 | Repo under git | All files | — | Working tree committed | — | n/a |
| 1 | Key rotated; constants gone | App behaviour with correct config | Old key revoked; startup fails without env | Server starts with valid config | Startup assertion test | Re-issue key |
| 2 | Audit script exists | **All data** | Read-only proven | Report produced | Script runs clean | Delete script |
| 3 | RLS + guards + write paths | Public catalogue | Student cannot write the four tables via PostgREST; unenrolled cannot read lessons | Enrolled learners record progress | RLS suite + authz suite green | Down-migration |
| 4 | Progress is server-derived | Progress UX | No client-authored progress | Sidebar, resume, percentage correct | Progress suite green | Down-migration |
| 5 | Player emits events | Embed, nocookie, error codes, no redirect | `curl` completion rejected; engagement ≠ credential | Video plays; progress advances | APX-48 suite green | Revert component |
| 6 | Server-owned attempts | Server-side grading | Forged attempts rejected; key withheld; limits enforced | Learners can take and retake quizzes | Assessment suite green | Down-migration |
| 7 | Completion requires enrollment + non-empty requirements | Three-way rule shape | Empty course not completable | Legitimate learners still complete | Completion unit tests | Revert service |
| 8 | Transactional issuance | Verification endpoint contract | No certificate without enrollment/completion; no duplicates | Eligible learners receive one certificate | Certificate suite green | Down-migration |
| 16 | 78 rows imported | The 72 existing mappings | No new client-authoritative completion | 5 courses appear unpublished; videos embed | Import idempotency test | Manual deletion from snapshot |

---

## 34. Recommended First Implementation Task

> **Phase 0 — initialise git and commit the working tree as the audit baseline.**

It has no dependencies, zero risk, and is purely additive. Critically, it is the precondition for every rollback path in §32: without it, none of the security work below can be safely reverted.

The immediate follow-on is **Phase 1** — rotate the service-role key, delete `DEFAULT_SERVICE_ROLE_KEY` from `supabaseAdmin.ts`, replace it with a startup assertion, and purge `.env.example`. This addresses the one finding that no amount of application-layer work can mitigate, and it was proven live: `/api/health` reports all four Supabase environment variables `MISSING` while still serving real data.

**Explicitly not first:** the RLS lockdown. It is the highest-value security change but also the highest-risk, and it depends on the Phase 2 data audit and on server-side write paths existing.

---

## 35. Items Requiring My Decision

| # | Decision | Why it cannot be decided from the repository | Blocks |
|---|---|---|---|
| 1 | **Five specialisation course titles** (§23) | The only invented strings in the import plan | Phase 16 |
| 2 | **Market Analytics M5 conflict** (§21) — replace, add alongside, or drop | Two legitimate videos for one slot; editorial choice | Phase 16 |
| 3 | **`statistics-data-analytics` M12–M19 pollution** (§22) | Cannot be classified from the repository; the catalogue is not reproducible from source | Phase 17 |
| 4 | **Are the 34 video lessons required or optional?** | If required, each needs a server-graded checkpoint (§10.3); if optional, engagement alone suffices | Phases 5, 16 |
| 5 | **Certificates already issued under the broken rules** — honour, annotate, or revoke | Business and reputational decision, not technical | Phase 17 |
| 6 | **Anon exposure of `public_certificate_verifications`** — confirm empirically | The verification probe was declined. Safe read-only check: a `HEAD` request to `/rest/v1/public_certificate_verifications?select=id` with `Prefer: count=exact` and the anon key returns a `content-range` count and **zero rows** — no learner data is retrieved. Remediate regardless, since the view is unreferenced | Sizing the incident |
| 7 | **Email confirmation policy** | A Supabase dashboard setting, not in the repository | Phase 1 |
| 8 | **`ON DELETE RESTRICT` on certificates vs GDPR erasure** | Retention policy decision | Phase 8 |
| 9 | **Payment model** — remove the dead `paymentCompleted` flag or build the gate | `programs.fee` exists; enrollment ignores `is_free` | Later |

---

*Remediation blueprint for the Apex Academy LMS, 7 September 2026. Architecture and validation only — no remediation was performed. Claims are traced to specific files, lines, migrations and live-schema observations; where a conclusion depends on runtime state, product intent or Supabase project configuration, it is marked as requiring verification rather than asserted.*
