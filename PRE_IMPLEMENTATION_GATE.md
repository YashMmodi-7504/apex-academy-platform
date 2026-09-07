# APEX ACADEMY LMS
# PRE-IMPLEMENTATION GATE REVIEW

**Date:** 2026-09-07
**Inputs:** `AUDIT_REPORT.md` (47 findings), `REMEDIATION_BLUEPRINT.md` (35 sections), `YOUTUBE_INTEGRATION_REPORT.md`
**Method:** independent re-inspection of source plus **read-only** runtime probes against the live database (counts and schema only — no rows containing learner data were printed, nothing was written)
**Constraint:** no source, migration, database, credential, git or dependency change. `PRE_IMPLEMENTATION_GATE.md` is the only file created.

---

## 1. Executive Assessment

The blueprint is **directionally correct but not safe to implement as written.** Its trust model, RLS target and phase ordering hold up under scrutiny. Three things invalidate parts of it, all discovered during this gate review, and one of them changes the risk picture materially.

**Verdict: 4 RED, 6 YELLOW, 8 GREEN.** Implementation may begin immediately on the GREEN phases. The blueprint requires one new phase inserted before several others.

### The three new findings

| ID | Severity | Finding |
|---|---|---|
| **APX-49** | **CRITICAL** | **Migration drift.** Migrations `00007` and `00008` have **never been applied** to the live database. `course_materials`, `lesson_checkpoints`, `lesson_checkpoint_options` and `student_checkpoint_attempts` all return HTTP 404 from PostgREST. |
| **APX-50** | **CRITICAL** | **Every single question in the database has its correct answer at `display_order = 1`.** Histogram across all correct options: `{"1": 560}` — 560 of 560. This is not limited to auto-generated quizzes (only 10 match that template); it includes the seeded 30-question final exam. |
| **APX-51** | **HIGH — requires verification** | **12 passed attempts hold zero `student_answers`**, all scoring 100 %, across 12 distinct assessments, belonging to **one** user. This is the exact signature of direct `assessment_attempts` insertion (`APX-02`). It may equally be seeded test data. |

### Why APX-49 matters most

The blueprint's §10.3 recommends resolving APX-48 by grading checkpoints, "using the `lesson_checkpoints` tables from migration `00007`, which already exist and are unused." **They do not exist.** The blueprint's central remedy for its central finding rests on absent infrastructure. And `00007` is itself one of the two migrations that cannot be replayed (`APX-32`, bare `CREATE POLICY`), so applying it requires fixing it first.

APX-49 also reclassifies a swathe of the audit: the entire course-materials subsystem — 9 admin endpoints, `AdminMaterialsPage.tsx` (1,198 lines), bulk import, PDF extraction, AI quiz generation — queries a relation that does not exist. Those features are **Broken at runtime**, not "Partial" as the audit recorded.

### Why APX-50 matters

`APX-08` was scoped to auto-generated quizzes. The real scope is the entire assessment corpus. Every module quiz and the only final exam are passable by selecting the first option every time, because options are served ordered by `display_order`. Fixing quiz *generation* does not fix this; the seeded content carries the same defect. Any completion architecture built on these assessments inherits a worthless gate.

---

## 2. Blueprint Strengths

- **The trust-boundary analysis is correct and now independently confirmed.** The claim that no frontend code writes the credential tables directly was verified: `grep` across all of `src/` excluding `src/backend/` finds Supabase table access in exactly one file, `AuthContext.tsx`, touching only `profiles` (select :31, insert :48, update :247). Revoking student INSERT/UPDATE on `lesson_progress`, `assessment_attempts`, `student_answers` and `enrollments` **cannot break any existing UI path.** This was the single largest risk in the plan and it is retired.
- **APX-48's classification and boundary analysis are sound.** The refusal to treat client-side watch percentage as server-verifiable is the correct call and is stated without hedging.
- **The RLS target table is well-formed** and correctly separates public catalogue, authenticated learning content and admin/draft tiers.
- **Pairing the RLS revoke with the server-side write paths in one phase** avoids a window where learners cannot record progress. This was right.
- **Moving the data audit to Phase 2** was right, and this review's probes demonstrate why — the evidence found (APX-51) would have been much harder to characterise after lockdown.
- **The certificate architecture's synchronous-transactional choice is justified** and the reasoning is correct: exactly-once under concurrency is a transaction problem, not a queue problem.

---

## 3. Blueprint Weaknesses

| # | Weakness | Impact |
|---|---|---|
| W1 | **Assumes `lesson_checkpoints` exists** (§10.3, §8) | The primary APX-48 remedy has no infrastructure. Requires a new phase |
| W2 | **Assumes the four contract mismatches are complete** (§17) | A conservative sweep confirms those four as the only genuine *schema* mismatches, but missed that `course_materials` is not a schema mismatch at all — it is an entirely absent relation (APX-49) |
| W3 | **`APX-08` scoped too narrowly** | §11 removes auto-generation but never addresses the 560 seeded questions with the answer always first (APX-50) |
| W4 | **No provenance mechanism wired into §12** | §12 requires "server-verified" lesson completions, but no column distinguishes the 198 existing `COMPLETED` rows from future verified ones. §27 mentions a provenance column in passing; §12's rule cannot be implemented without it |
| W5 | **§10.3 would make every current course uncompletable** | If required lessons need a graded checkpoint and zero checkpoints exist, all 11 courses become uncompletable on the day Phase 5 ships. No transition rule is specified |
| W6 | **`student_checkpoint_attempts` omitted from the revoke list** | §8's table marks it server-mediated, but the prose names only four tables. Migration `00007` grants `FOR ALL USING (auth.uid() = user_id)` — a fifth client-writable credential-adjacent table |
| W7 | **`APX-12` overstated** | A populated 30-question `FINAL_ASSESSMENT` **does** exist for `statistics-data-analytics`. The finding should be re-scoped |
| W8 | **No rollback script for the YouTube import** | §32 admits this and calls a snapshot mandatory, but no snapshot procedure is specified |

---

## 4. Missing Dependencies

| Missing | Required before | Why |
|---|---|---|
| **Apply migrations `00007` + `00008`** (after fixing their replay defects) | Phase 5 (checkpoints), Phase 13 (materials pipeline) | The tables do not exist (APX-49) |
| **Fix `00007`/`00009` idempotency** (`APX-32`) | Applying `00007` | Bare `CREATE POLICY` fails on a database where policies may partially exist |
| **Answer-position randomisation or re-authoring** (APX-50) | Phase 6, Phase 7 | Otherwise the completion gate remains worthless after the security work |
| **Completion provenance column** | Phase 7 (§12's rule) | No way to distinguish verified from legacy completions |
| **Checkpoint content for 34 new + existing required video lessons** | Phase 16 | §10.3 requires a graded artifact per required lesson |
| **`.env` file / deployment configuration** | Phase 1 | Removing the hardcoded fallback stops the app without configured env vars |
| **Offline snapshot procedure** | Phases 3, 16 | Named as mandatory in §32 but never specified |
| **Test harness authenticating as a real non-privileged user** | Phase 3 verification | RLS cannot be tested with the service role |

---

## 5. Security Risks

### Where client-controlled state can still influence credential state, after the blueprint

| Path | Addressed by blueprint? | Residual risk |
|---|---|---|
| Direct PostgREST write to `lesson_progress` | ✅ §8 revoke | None |
| Direct write to `assessment_attempts` / `student_answers` | ✅ §8 revoke | None |
| Direct write to `enrollments` | ✅ §8 revoke | None |
| `POST .../complete` with no evidence | ✅ §9/§10 | None once events replace the command |
| **`student_checkpoint_attempts` direct write** | ⚠️ Table lists it; prose omits it (W6) | **A student could self-report a passed checkpoint — the very artifact §10.3 makes authoritative.** Must be in the revoke set |
| **Answer position is predictable (APX-50)** | ❌ Not addressed | Client "knowledge" of the answer key without reading it. Server-side grading is intact, but the gate is defeated by guessing |
| **Self-enrollment** | Considered by design | Enrollment is free and self-service, so "enrollment required" is a provenance control, not an access control. Correct, but worth stating |
| Client-supplied `watch_percentage` on `updateLessonProgress` | ⚠️ Partially | §9 makes progress server-derived; the endpoint must also stop accepting the field |
| Admin-authored stored XSS → token theft → session impersonation | ⚠️ §16 addresses rendering | Tokens remain in `localStorage`; an admin remains able to reach any learner session |

**Conclusion:** with W6 and APX-50 closed, no remaining path lets client input determine lesson completion, assessment passing, course completion or certificate issuance. Without them, two paths survive.

---

## 6. Data Migration Risks

Live volumes (read-only, counts only):

| Table | Rows | Table | Rows |
|---|---|---|---|
| `profiles` | 12 | `assessments` | 54 |
| `enrollments` | 25 | `questions` | 560 |
| `lesson_progress` | 253 (198 `COMPLETED`) | `question_options` | 2,240 |
| `assessment_attempts` | 42 (36 `passed`) | `lessons` | 229 |
| `student_answers` | 330 | `modules` | 112 |
| `certificates` | 3 (all `VALID`) | `courses` | 11 |

**This is a small pre-production dataset.** Remediation is far more tractable than the blueprint assumed.

### Evidence that must be captured before RLS tightening — status

| Evidence | Result | Implication |
|---|---|---|
| Certificates without a matching enrollment | **0 of 3** | `APX-04` is real but **not exploited**. No certificate revocation dilemma |
| Certificates with NULL `enrollment_id` | **3 of 3** | Provenance gap confirmed; backfill is trivial at this size |
| Duplicate `(user_id, course_id)` certificates | **0** | **`UNIQUE` constraint can be added with no de-duplication** |
| Duplicate `(module_id, assessment_type)` assessments | **0** | **`UNIQUE` constraint can be added with no de-duplication** |
| `enrollments` marked `COMPLETED` | 3 | Matches the 3 certificates — internally consistent |
| **Passed attempts with zero `student_answers`** | **12** — one user, 12 assessments, all 100 % | **APX-51.** Either exploitation or seeded test data |
| Auto-generated questions present | 10, in 1 assessment | `APX-09` write amplification fired **once**, not repeatedly |
| YouTube manifest integrity | **72 / 72 intact** | Import baseline unchanged |

**The two constraint migrations the blueprint marked as high-risk are now low-risk**, because the duplicate counts are zero. That is a direct RED→GREEN reclassification.

**APX-51 is the one genuine unknown.** Twelve perfect scores with no answer records, concentrated in a single user, including the 30-question final exam. Distinguishing exploitation from test data requires knowing whether that account is a developer account — a product question, not a technical one.

---

## 7. RLS Risks

| Table | Students can do today | Should be able to | Server needs | Admin needs | Risk of the change |
|---|---|---|---|---|---|
| `profiles` | SELECT own; UPDATE own (role blocked); INSERT **fails** (no policy) | SELECT/UPDATE own | Service role | Full | **Low.** But the failing client INSERT fallback must be fixed in the same phase or a failed trigger still strands users |
| `enrollments` | SELECT/INSERT/UPDATE own | SELECT own only | INSERT/UPDATE | Full | **Low** — verified no frontend writes |
| `lesson_progress` | SELECT/INSERT/UPDATE/DELETE own (`FOR ALL`) | SELECT own only | All writes | Full | **Low** — verified no frontend writes |
| `assessment_attempts` | SELECT/INSERT own | SELECT own only | All writes | Full | **Low** |
| `student_answers` | SELECT/INSERT own | SELECT own only | All writes | Full | **Low** |
| **`student_checkpoint_attempts`** | **`FOR ALL` own** (migration `00007`) | SELECT own only | All writes | Full | **Table does not exist yet** — fix the policy *before* applying `00007` |
| `lessons` / `modules` | SELECT **all**, incl. unpublished | Enrolled or preview / published course | Service role | Full | **Medium.** Public pages read via the API (service role) so are unaffected — but the anon-key path must be re-tested |
| `questions` | SELECT **all** | None — server-mediated | Service role | Full | **Low** |
| `question_options` | Admin only ✅ | Unchanged | Service role | Full | None |
| `lesson_resources` | SELECT all | Enrolled only | Service role | Full | Low |
| `certificates` | SELECT own ✅ | Unchanged | INSERT | Full | None |
| `public_*` views | Readable, RLS-bypassing | **Dropped** | — | — | **Low** — zero code references |

**No proposed RLS change prevents a legitimate learning operation**, on the evidence that all learner writes already flow through the API. The one caveat is `lessons`/`modules` scoping, which should be validated against an anon-key session before merge.

---

## 8. Completion Architecture Risks

| Risk | Severity | Detail |
|---|---|---|
| **§10.3 makes all 11 courses uncompletable** | **HIGH** | Requiring a graded checkpoint per required lesson, with zero checkpoints in existence, halts every learner. A transition rule is mandatory: either treat lessons without a checkpoint as engagement-completable during a defined migration window, or author checkpoints before enforcing |
| **No provenance column** | **HIGH** | §12 counts "server-verified" completions; the 198 existing `COMPLETED` rows carry no marker. Without one, either all legacy rows are trusted (defeating the fix) or all are discarded (resetting 12 learners) |
| **APX-50 defeats the gate** | **CRITICAL** | Even a perfectly implemented completion engine gates on assessments whose answer is always first |
| Removing auto-generation changes state | Medium | Only 1 assessment (10 questions) is generated — far smaller blast radius than feared |
| `getCourseCompletionSummaryHandler` side effects | Medium | A GET that writes and can issue certificates; addressed in §12 but easy to miss during refactor |

---

## 9. Certificate Risks

**Is there any remaining Student → manipulated state → completion → certificate path the blueprint has not addressed?**

**Yes — two.**

1. **Via `student_checkpoint_attempts` (W6).** If checkpoints become the authoritative artifact (§10.3) while migration `00007`'s `FOR ALL USING (auth.uid() = user_id)` policy stands, a student inserts their own passed checkpoint and re-opens the entire chain. This is the same defect as `APX-02`, one table over, and the blueprint's prose does not close it.

2. **Via answer-position predictability (APX-50).** No state manipulation is needed at all. The student answers option 1 on every question, passes legitimately by the server's own grading, and the certificate is issued correctly. The system behaves exactly as designed; the design is defeated by the content.

Path 2 is the more serious, because **no security control can detect it** — the attempt is genuine, the grading is honest, and the audit trail is clean. It is a content-integrity problem masquerading as a security one.

Everything else — enrollment, duplicates, provenance, transactional issuance, revocation, enumeration — is addressed.

---

## 10. YouTube Integration Risks

Confirmations requested:

| Item | Status |
|---|---|
| 72 existing videos remain intact | ✅ **Verified 72/72** against the manifest, 78 distinct YouTube IDs on lessons |
| 35 missing videos have identified homes | ✅ 34 in five proposed specialisation courses; 1 is the M5 conflict |
| No schema migration required | ✅ Confirmed — `courses → modules → lessons → video_url` suffices |
| Common-resource handling correct | ✅ All 107 IDs unique; sharing is structural via `program_courses` |
| Market Analytics M5 unresolved | ✅ Still `SKIP_CONFLICT`; neither video overwritten |
| Five course titles remain product decisions | ✅ Recorded unchanged |
| Importer remains dry-run | ✅ `--apply` never executed |
| APX-48 fixed before importing the 34 | ✅ Gated as Phase 16, RED until Phase 5 |

**Additional risk found:** the 34 lessons are written with `is_required: true`. Under §10.3 each then needs a graded checkpoint — 34 more content artifacts that do not exist, on top of the existing gap. Either the import sets `is_required: false`, or checkpoint authoring is scoped into Phase 16. **This is a decision, not a bug.**
---

## 11. Phase-by-Phase Implementation Gate

Each phase is assessed against the ten required criteria. **GREEN** = safe now · **YELLOW** = needs a decision or verification first · **RED** = a prerequisite is incomplete.

### 🟢 P0 — Git baseline
**Preconditions** none · **Dependencies** none · **Files** repo-wide (additive) · **DB objects** none · **Preserve** every file byte-for-byte · **Boundary changed** none · **Regression** none · **Tests** working tree committed · **Rollback** n/a · **Independent** ✅ Yes

### 🟢 P1 — Credential remediation (APX-01)
**Preconditions** a rotated key and a configured `.env` or deployment secret · **Dependencies** P0 for revertability · **Files** `src/backend/database/supabaseAdmin.ts`, `.env.example`, `dist/` rebuild · **DB objects** none · **Preserve** app behaviour when correctly configured · **Boundary** removes a baked-in production credential · **Regression** the app will refuse to start without env vars — intended, but will break any environment relying on the fallback (verified: the running dev server does exactly that today) · **Tests** startup assertion; health check with and without env · **Rollback** re-issue a key · **Independent** ✅ Yes

### 🟢 P2 — Read-only data audit
**Preconditions** none · **Dependencies** none · **Files** one new script · **DB objects** read-only · **Preserve** all data · **Boundary** none · **Regression** none · **Tests** script runs clean · **Rollback** delete the script · **Independent** ✅ Yes — **partially executed during this gate review**; §6 already answers most of it

### 🔴 P-NEW — Resolve migration drift (APX-49) · *inserted by this review*
**Preconditions** fix `00007`/`00009` replay defects (`APX-32`) first; snapshot · **Dependencies** P0, P2 · **Files** `supabase/migrations/00007`, `00009` · **DB objects** creates `course_materials`, `lesson_checkpoints`, `lesson_checkpoint_options`, `student_checkpoint_attempts` · **Preserve** all existing tables · **Boundary** `00007` ships a `FOR ALL` policy on `student_checkpoint_attempts` and public SELECT on `lesson_checkpoint_options` — **both must be corrected before application, not after** · **Regression** applying `00008` activates 9 admin endpoints that currently 500; they will begin executing real logic with known defects (`APX-17`, `APX-30`) · **Tests** relation existence; RLS suite on the new tables · **Rollback** drop the four tables (no data yet) · **Independent** ❌ **RED — blocks P5 and P13**

### 🟡 P3 — RLS + authorization + server write paths
**Preconditions** P2 snapshot; anon-key regression harness · **Dependencies** P0, P2, P-NEW (for checkpoint policies) · **Files** new `00010_rls_lockdown.sql`, new authorization middleware, `learning.controller.ts`, `content.controller.ts` · **DB objects** policies on ~10 tables · **Preserve** public catalogue, enrolled learning, admin console · **Boundary** the central one — client loses write authority over credential state · **Regression** **materially lower than the blueprint assumed** — verified that no frontend code writes these tables · **Tests** full RLS matrix as anon / student / admin; E2E learner journey · **Rollback** down-migration restoring `00002` definitions · **Independent** ⚠️ Only after P-NEW, and must include `student_checkpoint_attempts` (W6)

### 🟡 P4 — Lesson-progress authority
**Preconditions** P3 · **Dependencies** P3 · **Files** `00013_progress_events.sql`, new `progress.service.ts`, `learning.controller.ts` · **DB objects** new append-only table; `lesson_progress` becomes a projection · **Preserve** sidebar ticks, resume position, percentage · **Boundary** progress becomes server-derived · **Regression** progress silently stops if event posting fails — today's optimistic update hides errors · **Tests** progress suite; concurrency; replay idempotency · **Rollback** down-migration · **Independent** ❌ Needs P3 · **Decision required:** provenance for the 198 existing `COMPLETED` rows (W4)

### 🔴 P5 — APX-48 YouTube completion
**Preconditions** P4 event pipeline; `lesson_checkpoints` existing (P-NEW); checkpoint content authored · **Dependencies** P3, P4, P-NEW · **Files** `YouTubeLessonPlayer.tsx`, `LessonRenderer.tsx`, `LearningInterfacePage.tsx` · **DB objects** checkpoint tables · **Preserve** nocookie host, `origin`, error codes 101/150/100, no redirect, responsive player, native fullscreen · **Boundary** player events become signals; graded checkpoints become authority · **Regression** **all 11 courses become uncompletable** unless a transition rule exists (W5) · **Tests** the APX-48 regression suite in blueprint §25 · **Rollback** revert components · **Independent** ❌ **RED**

### 🟡 P6 — Assessment authority + integrity constraints
**Preconditions** P2 · **Dependencies** P3 · **Files** `moduleAssessment.service.ts`, `finalAssessment.service.ts`, `00012_integrity_constraints.sql` · **DB objects** `UNIQUE(module_id, assessment_type)`, `UNIQUE(course_id, assessment_type)`, indexes · **Preserve** server-side grading, which is already correct · **Boundary** attempts become server-owned; answer key withheld; limits enforced · **Regression** **far smaller than feared** — 0 duplicate assessment groups, and only 1 generated assessment exists · **Tests** assessment suite · **Rollback** drop constraints · **Independent** ⚠️ **Does not fix APX-50** — that needs separate content work

### 🔴 P7 — Course completion engine
**Preconditions** P4, P5, P6 supplying trustworthy inputs; provenance column · **Dependencies** P3–P6 · **Files** `courseCompletion.service.ts`, `00014_completion_rpc.sql` · **DB objects** completion RPC · **Preserve** the three-way rule shape · **Boundary** completion derived only from verified artifacts · **Regression** learners "complete" under the old rule may become incomplete · **Tests** completion unit matrix from §12 · **Rollback** revert service · **Independent** ❌ **RED**

### 🔴 P8 — Certificate issuance
**Preconditions** P7 · **Dependencies** P7 · **Files** `certificate.service.ts`, `00015_certificate_provenance.sql` · **DB objects** `UNIQUE(user_id, course_id)`, `enrollment_id NOT NULL` · **Preserve** the verification endpoint contract · **Boundary** issuance transactional and enrollment-bound · **Regression** **low** — 0 duplicates and 0 enrollment-less certificates exist, so both constraints apply cleanly; only the 3 NULL `enrollment_id` values need backfill · **Tests** certificate suite · **Rollback** drop constraints · **Independent** ❌ **RED**

### 🟢 P9 — Secure `/api/learn/*` (APX-07)
**Preconditions** none · **Dependencies** none — **this is pure server-side guard logic and needs no RLS change** · **Files** `learning.controller.ts`, new middleware; adopt the existing `getStudentLessonContentAccess` logic · **DB objects** none · **Preserve** admin preview, `is_preview` lessons · **Boundary** enrollment enforced on the API path · **Regression** unenrolled users lose content access — intended; verify the player's enrollment gate is repaired at the same time, since `res.notEnrolled` is currently dead · **Tests** authorization matrix · **Rollback** revert · **Independent** ✅ **Yes — the highest-value independently shippable security fix**

### 🟡 P10 — Curriculum visibility
**Preconditions** anon-key regression check · **Dependencies** P3 · **Files** `00010` · **DB objects** `lessons`, `modules`, `questions`, `lesson_resources` policies · **Preserve** public catalogue pages · **Boundary** draft and paid content no longer world-readable · **Regression** low — public pages read via the API · **Tests** anon read matrix · **Rollback** down-migration · **Independent** ⚠️ Ships with P3

### 🟢 P11 — Certificate verification exposure (APX-05)
**Preconditions** none · **Dependencies** none · **Files** `00011_drop_public_views.sql`, `certificate.service.ts` (parameterise the `.or()`), delete `VerifyCertificatePage.tsx` · **DB objects** drops two views · **Preserve** `/api/certificates/verify/:code` behaviour · **Boundary** removes an RLS-bypassing bulk read path · **Regression** **none — zero code references either view** · **Tests** verification happy path; enumeration attempt · **Rollback** recreate from `00001` · **Independent** ✅ Yes

### 🟢 P12 — Database contracts + generated types
**Preconditions** none · **Dependencies** none · **Files** `database.types.ts`, `tsconfig.json`, callers · **DB objects** none (read-only generation) · **Preserve** runtime behaviour · **Boundary** none · **Regression** `strict` surfaces many latent errors — use a per-directory ratchet · **Tests** CI drift check · **Rollback** revert · **Independent** ✅ Yes. **This review confirms the four known mismatches are the complete set of *column* mismatches**; a conservative sweep of every `.from().select()` and write body across `src/backend` found no fifth. The only additional contract break is an absent *relation* (APX-49)

### 🟡 P13 — Content rendering + resource pipeline
**Preconditions** format decision (Markdown vs sanitised HTML); P-NEW for `course_materials` · **Dependencies** P-NEW · **Files** `LessonRenderer.tsx`, `materials.controller.ts`, `ResourceDetailPage.tsx` · **DB objects** `lessons.content` rows converted · **Preserve** admin preview fidelity · **Boundary** sanitisation on render · **Regression** an unconverted row renders as literal text — the same defect inverted · **Tests** render tests both formats · **Rollback** revert + reverse conversion · **Independent** ❌ Needs P-NEW and a decision

### 🟢 P14 — Institutions lead persistence (APX-24)
**Preconditions** none · **Dependencies** none · **Files** `InstitutionsPage.tsx`, new endpoint, reuse `enterprise_inquiries` or a new table · **DB objects** possibly one table · **Preserve** page layout · **Boundary** adds a public write path — must be rate-limited and validated like `submitCounselorLead` · **Regression** none · **Tests** validation + rate limit · **Rollback** revert · **Independent** ✅ Yes

### 🔴 P15 — YouTube import
**Preconditions** P5 complete; five titles approved; M5 resolved; required-vs-optional decided; snapshot · **Dependencies** P5, product decisions · **Files** none — executes `scripts/importYouTubeResources.ts --apply` · **DB objects** 78 new rows · **Preserve** the 72 existing mappings (verified intact) · **Boundary** none if P5 landed · **Regression** 5 new unpublished courses appear in admin · **Tests** dry run, then idempotency re-run · **Rollback** **manual deletion of 78 identifiable rows — snapshot mandatory** · **Independent** ❌ **RED**

### 🟡 P16 — Data cleanup
**Preconditions** P6–P8 define validity; APX-51 classified · **Dependencies** P6, P7, P8 · **Files** audit + annotation scripts · **DB objects** additive provenance columns only · **Preserve** all historical records — annotate, never delete · **Boundary** none · **Regression** none if additive · **Tests** before/after counts · **Rollback** drop columns · **Independent** ❌ Needs the completion rules

### 🟢 P17 — Automated security + regression testing
**Preconditions** none · **Dependencies** none — **tests should be written first, per phase** · **Files** `tests/**`, CI config · **DB objects** a test project or seeded schema · **Preserve** n/a · **Boundary** none · **Regression** none · **Tests** self · **Rollback** delete · **Independent** ✅ **Yes — start immediately, in parallel with everything**

---

## 12. Required Decisions

| # | Decision | Blocks | Why it cannot be decided from the repository |
|---|---|---|---|
| D1 | **Is the APX-51 account a developer/test account?** 12 perfect attempts, zero answers, one user | P16, incident scope | Determines whether `APX-02` has been exploited in production |
| D2 | **Transition rule for existing completions.** Trust the 198 legacy `COMPLETED` rows, or require re-verification? | P4, P7 | Affects 12 real learners |
| D3 | **Are the 34 new video lessons required or optional?** | P5, P15 | If required, each needs a graded checkpoint |
| D4 | **APX-50 remedy:** randomise `display_order` at serve time, re-author 560 questions, or both? | P6, P7 | Serve-time shuffling is cheap and immediate; re-authoring is correct but slow |
| D5 | **Five specialisation course titles** | P15 | The only invented strings in the import |
| D6 | **Market Analytics M5 conflict** — replace / add / drop | P15 | Editorial |
| D7 | **`statistics-data-analytics` M12–M19 pollution** | P16 | Cannot be classified from source |
| D8 | **Certificates issued under broken rules** — honour / annotate / revoke | P16 | 3 certificates; all have enrollments, so "honour and annotate" is defensible |
| D9 | **Content format:** Markdown or sanitised HTML | P13 | Product/authoring preference |
| D10 | **Email confirmation policy** | P1 | Supabase dashboard setting |

---

## 13. Required Runtime Verification

| # | Item | Status after this gate | How to verify safely |
|---|---|---|---|
| R1 | Migrations `00007`/`00008` applied? | ✅ **ANSWERED — they are not.** All four relations return HTTP 404 | Done |
| R2 | Duplicate certificates / assessments? | ✅ **ANSWERED — zero of both** | Done |
| R3 | Certificates without enrollment? | ✅ **ANSWERED — zero of three** | Done |
| R4 | 72 YouTube videos intact? | ✅ **ANSWERED — 72/72** | Done |
| R5 | Correct-answer position distribution? | ✅ **ANSWERED — 560/560 at position 1** | Done |
| R6 | Forged-attempt indicators? | ✅ **ANSWERED — 12 found**, classification pending (D1) | Done |
| R7 | `anon` can read `public_certificate_verifications`? | ❌ **OPEN** | `HEAD /rest/v1/public_certificate_verifications?select=id` with the **anon** key and `Prefer: count=exact`. Returns a `content-range` count and **zero rows** — no learner data retrieved |
| R8 | `anon` can read `lessons` / `questions`? | ❌ **OPEN** | Same count-only technique per table |
| R9 | Email confirmation enabled? | ❌ **OPEN** | Supabase dashboard |
| R10 | Does the app start without the hardcoded key? | ❌ **OPEN** | Set env vars, remove fallback in a branch, start |
| R11 | Player behaviour after the nocookie change | ❌ **OPEN** | Browser session — not yet exercised |

R7 and R8 remain the only unanswered security questions, and both are answerable with count-only requests that return no rows.

---

## 14. Recommended Implementation Order

```
P0  Git baseline ────────────────────────────────────┐
P1  Credentials                                       │  independent, do first
P2  Data audit (largely done)                         │
P17 Test harness  ── start now, run in parallel ──────┘
        |
P9  Secure /api/learn/*  ── GREEN, independent, highest immediate value
P11 Drop public views    ── GREEN, independent, zero references
P12 Generated types      ── GREEN, independent, prevents recurrence
P14 Institutions leads   ── GREEN, independent
        |
P-NEW  Fix + apply migrations 00007/00008   <── NEW, blocks P5 and P13
        |
P3  RLS + authz + write paths  (incl. student_checkpoint_attempts)
        |
P4  Progress authority  ──(needs D2 provenance)
        |
P6  Assessment authority + constraints ──(needs D4 for APX-50)
        |
P5  APX-48 completion   ──(needs D3, checkpoint content)
        |
P7  Completion engine
        |
P8  Certificates
        |
P15 YouTube import ──(needs D3, D5, D6)
        |
P13 Content pipeline ──(needs D9)
        |
P16 Data cleanup ──(needs D1, D7, D8)
```

### Changes from the blueprint's order

1. **P-NEW inserted** before P5 and P13 — the checkpoint and materials tables do not exist.
2. **P9 promoted to the first security fix.** It requires no RLS change, no migration and no dependency, and it closes a CRITICAL finding (`APX-07`) on its own. The blueprint buried it at position 9.
3. **P6 moved ahead of P5.** The blueprint ordered assessment authority after the YouTube fix, but P5's checkpoint grading depends on the assessment machinery being trustworthy first.
4. **P17 runs continuously**, not last. Every phase needs its failing test before the fix.

---

## 15. First Implementation Task

> **P0 — `git init`, review `.gitignore`, and commit the working tree as the audit baseline.**

Unchanged from the blueprint, and this review reinforces it: every rollback path in §32 depends on it, and it is the only task with zero risk and zero prerequisites.

**Then, in immediate succession and safely parallelisable:**

- **P1** — rotate the key, delete `DEFAULT_SERVICE_ROLE_KEY`, fail fast at startup. Proven live: `/api/health` reports all four Supabase env vars `MISSING` while serving real data from the fallback.
- **P9** — enforce enrollment on `/api/learn/*` by promoting the already-correct, never-called `getStudentLessonContentAccess` logic into shared middleware. **This is the single highest-value change that can ship today**: it closes a CRITICAL finding, needs no migration, no RLS change and no product decision, and carries verified-low regression risk.

---

## 16. Definition of Safe-to-Proceed

Implementation may begin when **all** of the following hold:

| # | Condition | Status |
|---|---|---|
| 1 | Repository under version control | ❌ Not yet — P0 |
| 2 | Offline snapshot of the six learner tables | ❌ Not yet |
| 3 | Service-role key rotated; no hardcoded fallback | ❌ Not yet — P1 |
| 4 | Data audit evidence captured **before** RLS tightening | ✅ **Largely complete** (§6) |
| 5 | No frontend code writes credential tables | ✅ **Verified** |
| 6 | Duplicate counts known to be zero before constraints | ✅ **Verified — 0 and 0** |
| 7 | Migration drift resolved (APX-49) | ❌ Not yet — P-NEW |
| 8 | D1–D4 answered | ❌ Product owner |
| 9 | Test harness able to authenticate as a non-privileged user | ❌ Not yet — P17 |
| 10 | R7/R8 anon exposure confirmed or accepted | ❌ Open |

**Conditions 4, 5 and 6 are met.** Conditions 1, 2, 3 and 9 are mechanical and can be completed today. Condition 7 is a new phase. Condition 8 needs you. Condition 10 needs two count-only requests.

**Phases that are safe to implement right now, with no further input:** P0, P1, P2, P9, P11, P12, P14, P17.

---

## Summary

### 🔴 RED — unsafe until a prerequisite completes
`P-NEW` migration drift · `P5` APX-48 completion · `P7` completion engine · `P8` certificates · `P15` YouTube import

### 🟡 YELLOW — needs a decision or verification
`P3` RLS lockdown · `P4` progress authority · `P6` assessment authority · `P10` curriculum visibility · `P13` content pipeline · `P16` data cleanup

### 🟢 GREEN — safe to implement now
`P0` git baseline · `P1` credentials · `P2` data audit · `P9` secure `/api/learn/*` · `P11` drop public views · `P12` generated types · `P14` institutions leads · `P17` test harness

### Decisions required from the product owner
**D1** APX-51 account classification · **D2** legacy completion provenance · **D3** required vs optional video lessons · **D4** APX-50 remedy · **D5** five course titles · **D6** Market Analytics M5 · **D7** statistics-course pollution · **D8** existing certificates · **D9** content format · **D10** email confirmation

### Recommended first implementation task
**P0 — establish the git baseline**, then **P1 (credentials)** and **P9 (enrollment enforcement on `/api/learn/*`)** in parallel.

---

*Pre-implementation gate review, 7 September 2026. Validation and architecture only — no source, migration, credential, dependency or database change was made, and the YouTube importer was not executed. Runtime probes were read-only and returned counts and schema metadata only; no row containing learner-identifying data was printed.*
