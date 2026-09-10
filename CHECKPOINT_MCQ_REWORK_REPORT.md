# "Check Your Understanding" — Single-Attempt Rework

Scope: the in-lesson checkpoint MCQ only. Module assessments, final assessments,
progress, completion and certificates are untouched.

---

## 1. Root cause

"Try Again" was not a stray button — it was the only thing the old design had.
Three defects stacked:

| # | Defect | Consequence |
|---|---|---|
| 1 | `setSubmissionResult(null)` on "Try Again" reset the question to answerable | Unlimited retries until correct |
| 2 | Attempts were kept in a module-level array (`attemptsStore`) | Lost on Lambda cold start; not shared between concurrent instances |
| 3 | `attemptsStore.push()` had **no duplicate check** | Even in-process, a second submission was accepted |

There was no server-side notion of "already answered", so removing the button
alone would have fixed nothing — the endpoint would still have re-graded any
resubmission. Migration `00007` had declared a checkpoint schema but **was never
applied to this project**, so no persistence existed at all.

## 2. Architecture as found

- 44 checkpoint questions are **hardcoded in application code**
  (`src/backend/services/checkpoint.service.ts`), not in the database.
- IDs are deterministic `uuidv5` values generated at module load.
- Two routes, both already behind `requireAuth`:
  - `GET  /learn/:course/lessons/:lessonId/checkpoint`
  - `POST /learn/:course/lessons/:lessonId/checkpoint/attempt`
- Module/final assessments are a **completely separate** subsystem and are
  properly DB-backed (`assessment_attempts`, `student_answers`). They were not
  in scope and were not modified.

## 3. What changed

The question bank stays in code. Only *attempts* were moved into the database —
that is the minimum needed for a durable one-attempt guarantee.

| File | Change |
|---|---|
| `supabase/migrations/00009_checkpoint_attempt_persistence.sql` | **New.** Creates the attempts table. Additive, idempotent. |
| `src/backend/services/checkpoint.service.ts` | Attempts persisted; duplicate submissions rejected; answer key withheld until answered; deterministic per-learner option order. |
| `src/backend/controllers/learning.controller.ts` | Awaits the now-async service; propagates the 409 status. |
| `src/components/learning/LessonRenderer.tsx` | "Try Again" removed; options lock after submit; recorded answer restored on load; 409 handled as a locked result. |

## 4. Backend enforcement

Grading and the lock are both server-side and both derive from server data only:

- `user_id` comes from `req.user.id` (verified access token). The request body is
  read for **`selected_option_id` and nothing else** — no score, no `passed`, no
  `is_correct`, no `user_id`.
- Correctness is resolved from the server's own `is_correct` flag on the matched
  option. The browser never supplies or influences it.
- A recorded attempt is looked up before insert and returns **409
  `already_answered`**. The `UNIQUE (user_id, checkpoint_id)` constraint is the
  real guard: two concurrent submissions raise Postgres `23505` and the loser is
  also rejected. This cannot be bypassed from the browser.
- `correct_option_id` and `explanation` are `undefined` in the GET response until
  an answer exists. `is_correct` is never sent per-option.

## 5. Database

One additive table, no changes to any existing object:

```
public.student_checkpoint_attempts
  id, user_id -> auth.users, checkpoint_id, lesson_id,
  selected_option_id, is_correct, attempted_at
  CONSTRAINT ... UNIQUE (user_id, checkpoint_id)
```

RLS is enabled with **SELECT and INSERT policies only** — deliberately no UPDATE
and no DELETE policy, so a recorded answer is final at the storage layer too.
`checkpoint_id` / `selected_option_id` are intentionally not foreign keys because
the question bank lives in code.

> **Action required:** this migration has **not** been applied. See §11.

## 6. Frontend

- "Try Again" is gone. Nothing re-opens an answered question.
- All four option buttons carry `disabled={Boolean(submissionResult)}`.
- On load, `checkpoint.answered` (server-authoritative) restores the recorded
  answer as a locked result, so refresh or re-navigation cannot reset it.
- A 409 renders the stored outcome rather than an error.
- The result panel states **Correct** / **Incorrect**, reveals the correct answer
  when the learner was wrong, shows the explanation, and closes with
  "Answer recorded. Each question allows one submission."
- The frontend displays; it does not decide. It has no access to the answer key
  before submission.

## 7. Question bank audit (44 questions)

| Check | Result |
|---|---|
| Duplicate questions | 0 |
| Exactly 4 options | 44/44 |
| Exactly 1 correct answer | 44/44 |
| Missing / stub explanations | 0 |
| Blank or duplicate option text | 0 |
| "All/none of the above" | 0 |
| **Correct answer stored at position A** | **44/44 — 100% bias** |
| Correct answer is the longest option | 30/44 |

**The position bias was the one serious defect.** Every key was stored first, so
a learner who always picked option A scored 100%. Fixed by ordering options with
a deterministic per-learner shuffle seeded on `(userId, checkpointId)` — stable
across refreshes for one learner, different between learners. Measured over 1,760
renders: **24.5% / 27.6% / 23.6% / 24.2%**, with no option ever dropped or
duplicated. The stored answer key was not touched.

The length cue (30/44) is a softer test-construction weakness — correct answers
tend to be the most fully-worded option. It is flagged, not auto-corrected: no
question text or answer key was rewritten, per instruction.

*(One earlier "duplicate option" hit was a bug in my own audit script — it
stripped `=`, `>`, `<`, collapsing "Mean = Median = Mode" and "Mean > Median >
Mode" into the same string. The options are genuinely distinct; the real count is
zero.)*

## 8. GeeksforGeeks

Used as a conceptual reference only, to sanity-check that the statistics
definitions in the existing explanations are standard. **No question, option, or
explanation text was copied.** No content was imported from it.

## 9. Testing

**Server-side, against the real service (22/22 passed):**

| Assertion | Result |
|---|---|
| Answer key / explanation withheld before submitting | pass |
| No `is_correct` on any option pre-submit | pass |
| Option order stable across reloads, differs per learner | pass |
| Incorrect answer graded false, key + explanation revealed | pass |
| **Second submission rejected — HTTP 409** | pass |
| Retry did **not** flip the recorded result to correct | pass |
| Recorded answer returned as locked on re-read | pass |
| Another learner unaffected, and locked after their own submit | pass |
| Invalid option id rejected (400) | pass |

**In-browser, mounting the real `LessonRenderer` (39/39 passed):**

Tested with the exact question from the report — *"What is the primary purpose of
a measure of central tendency?"*

| Assertion | Result |
|---|---|
| Answer key not present in the DOM before submitting | pass |
| **No "Try Again" — before, after, or following refresh** | pass |
| Wrong answer -> "Incorrect" + correct answer + explanation | pass |
| All 4 option buttons `disabled` after submit | pass |
| Selection cannot be changed after submit | pass |
| Submit control removed after submit | pass |
| After refresh: still locked, result preserved | pass |
| Correct answer -> "Correct", triggers lesson completion | pass |
| No JS errors | pass |
| 375 / 390 / 768 / 1024 / 1440 — no horizontal overflow, panel visible | pass |

Position-bias distribution was measured separately over 40 synthetic learners x
44 questions (§7).

## 10. Regression

- `tsc --noEmit`: 0 errors. `npm run build:client`: succeeds.
- Assessment, certificate and progress code: **zero diff** (verified with
  `git diff --stat` over those paths).
- Correct checkpoint answers still trigger `onCompleteLesson()`.
- YouTube player, lesson resources and the duration formatter untouched —
  "8m 34s" still renders correctly in the harness screenshots.
- Only three source files changed (227 insertions, 39 deletions) plus one new
  migration file.

## 11. Status

The code is complete, type-checks, builds, and every behavioural guarantee above
is proven by test rather than asserted.

**One step remains that I cannot perform.** This environment has no DDL channel
to the database — no `exec_sql`/`exec`/`query` RPC, no `DATABASE_URL`, no
`PGHOST` — so I cannot create the table. Run
`supabase/migrations/00009_checkpoint_attempt_persistence.sql` in the Supabase
SQL Editor.

Until it is applied the service degrades **by design** to the old in-memory
store and logs `[checkpoint] attempts table missing; recording in memory only`.
In that state the single-attempt rule holds within one warm Lambda instance but
**is lost on cold start and is not shared across instances** — so it is not a
real guarantee in production. Applying the migration is what makes the lock and
the refresh-persistence durable. No code change is needed afterwards.
