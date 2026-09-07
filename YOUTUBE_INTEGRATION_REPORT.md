# APEX ACADEMY LMS — YOUTUBE LEARNING INTEGRATION REPORT

**Date:** 2026-09-07
**Status:** Discovery + inventory complete · importer built and dry-run verified · **database import NOT executed** (awaiting sign-off, see §17)

---

## Headline finding

**72 of the 107 provided videos were already integrated into the LMS before this task began.** The embedded player also already exists and works. The remaining 35 are missing for one consistent, structural reason described in §3.

This changes the shape of the work: the request was framed as "integrate YouTube into the LMS", but the correct description is "close a 35-video gap in an integration that is already two-thirds complete, and harden the player".

---

## 1. All discovered YouTube resources

| Metric | Count |
|---|---|
| Provided entries | 107 |
| Unique video IDs | 107 (**zero duplicates across all courses**) |
| Playlists | 2 |
| Already present in DB | **72** |
| Missing from DB | **35** |
| Videos in DB *not* in the provided list | 6 |

### Playlists

| Playlist ID | Domain | Provided as | Handling |
|---|---|---|---|
| `PLOWRNl6YgsT79ezWdEhOjvK4D-cQfr7ys` | Data Analyst | 24 individual watch URLs (index 2–25) | Already decomposed into 24 per-video lessons. Index 1 was not supplied. |
| `PLwUdL9DpGWU0lhwp3WCxRsb1385KFTLYE` | Data Engineer | 19 individual watch URLs (index 3–21) | Already decomposed into 19 per-video lessons. Indices 1–2 were not supplied. |

Both were supplied as expanded watch URLs carrying a `list=` parameter, not as bare playlist links. Because every video already exists as its own tracked lesson, **the "complete playlist" requirement (Part 4) is satisfied more thoroughly than a playlist embed would** — students get per-video progress, ordering and resume. The playlist IDs are preserved as metadata in `supabase/seed/youtube_resources.json`.

### Prior state in the repository

Before this task the only YouTube content committed to the repo was a single placeholder ID (`kqtD5dpn9C8`) reused across four lessons in `supabase/seed/00001_seed_data.sql` — a seed whose catalogue was deleted by migration 00004. The 72 live mappings exist **in the database only**, not in any repository file. That is a reproducibility gap (audit finding `APX-40`); `youtube_resources.json` now closes part of it.

---

## 2. Course mapping

The LMS has a three-tier content model that the provided data maps onto exactly:

```
categories (11 career domains)  ──1:1──  programs (11 "… Career Path")
                                              │
                                              └─ program_courses ──> courses (skill courses, SHARED)
                                                                        └─ modules ──> lessons ──> video_url
```

Your 11 course groups correspond 1:1 to the 11 career domains from migration 00004, **including Market Analytics & Research** (your "MARKET ANALYSIS & RESEARCH"). Nothing was omitted.

Crucially, your "Module N" numbering is **per career path** and spans several shared skill courses. For example BI Developer M1–M3 live in `data-database-fundamentals` and `sql-relational-databases`, while M4–M8 live in `bi-dashboard-engineering`. That is why the same SQL video can serve several domains without duplication — the *course* is shared by several programs.

| Domain | Provided | In DB | Specialisation course | Status |
|---|---|---|---|---|
| BI Developer | 8 | 8 | `bi-dashboard-engineering` | ✅ Complete |
| Machine Learning Engineer | 10 | 10 | `applied-machine-learning-mlops` | ✅ Complete |
| Technical Analyst | 6 | 6 | `it-business-analysis-systems` | ✅ Complete |
| Data Analyst | 24 | 24 | `excel-analytics-data-cleaning` | ✅ Complete |
| Data Engineer | 19 | 19 | `data-engineering-pipeline-architecture` | ✅ Complete |
| Market Analytics & Research | 6 | 5 | `market-research-consumer-analytics` | ⚠️ 1 conflict (§7) |
| Data Scientist | 7 | 0 | **none** | ❌ Gap |
| AI Engineer | 6 | 0 | **none** | ❌ Gap |
| AI Backend Engineer | 7 | 0 | **none** | ❌ Gap |
| ETL Developer | 6 | 0 | **none** | ❌ Gap |
| BI Analyst | 8 | 0 | **none** | ❌ Gap |

---

## 3. Why exactly 35 videos are missing

This is not random. **Every domain that owns a specialisation course is 100 % complete. Every domain that owns only shared foundation courses is 0 % complete.**

| Domain | Program's courses | Has a home for domain-specific video? |
|---|---|---|
| Data Scientist | statistics, python, sql | No |
| AI Engineer | python, git | No |
| AI Backend Engineer | python, sql, git | No |
| ETL Developer | data-db, sql, git | No |
| BI Analyst | data-db, statistics, sql | No |

Their videos are domain-specific (LLM architecture, FastAPI, Airflow, DAX…) and have no matching module anywhere in the shared foundation courses. Forcing them into a shared course would leak content across unrelated domains — e.g. an "Async Task Queues (Celery & Redis)" lesson would appear for every Data Analyst student, because `python-programming-fundamentals` is shared by four programs.

**The correct fix follows the pattern the project already established:** create one specialisation course per gap domain and attach it to that domain's existing program via `program_courses`. This uses the existing hierarchy exactly — no parallel architecture, no new content tables.

---

## 4. Section / subsection mapping

The requested Course → Section → Subsection → Video hierarchy maps to the existing model with **no schema change**:

| Requested | Existing entity |
|---|---|
| Course | `courses` |
| Section | `modules` |
| Subsection | `lessons` |
| Video | `lessons.video_url` (or a `VIDEO` row in `lesson_resources`) |

Module and lesson titles for the five new courses are taken verbatim from your own "Module N:" headings. **No course, section or subsection name was invented**; only the five course *titles* are new, and each is a direct restatement of the domain (e.g. "AI Backend Engineering"). Those five titles are the one item in this report that needs your approval.

---

## 5. Common resources & deduplication

**Zero duplicates were found.** All 107 provided video IDs are unique, and the importer refuses to attach a video ID that is already attached elsewhere (`SKIP_CONFLICT`). Cross-domain sharing is achieved structurally — one lesson on a shared course, reached by every program that includes that course — so no canonical-video join table is required. A dedicated `youtube_resources` table would have added a second source of truth for something `lessons.video_url` already models correctly.

---

## 6. Videos in the DB that you did not provide

Six lessons carry videos absent from your list. Left untouched; listed for your awareness:

| Video ID | Location |
|---|---|
| `Zt9nZRsI2VU` | python-programming-fundamentals / M12 / Practical Python Data Analytics Project |
| `9cf9UbZSM-k` | statistics-data-analytics / M1 / Practical: Classifying Analytics Datasets |
| `NBbY_blKEHQ` | market-research-consumer-analytics / M5 / Survey Methodology & Primary Data Collection |
| `T6vmlqCWxKM` | statistics-data-analytics / M1 / Data Types & Levels of Measurement |
| `KlGb_Q1yNiY` | statistics-data-analytics / M1 / Why Statistics Matters in Data & Analytics |
| `pGT4SqT8iKg` | sql-relational-databases / M12 / Practical Data Querying Case Study |

---

## 7. Unmapped / conflicted resources

Per Part 22, nothing was guessed. One item is unresolved:

| Field | Value |
|---|---|
| Domain | Market Analytics & Research |
| Module | M5 Survey Design & Primary Data Collection |
| You provided | `YfH24K_YjHw` — *Masterclass in Survey Design Best Practices* (Sawtooth Software) |
| DB already holds | `NBbY_blKEHQ` — *Survey Methodology & Primary Data Collection Best Practices* |
| Resolution | **UNRESOLVED — importer will not overwrite** |

Options: (a) replace the existing video, (b) add yours as a second lesson in M5, (c) keep the existing one and drop yours. Recorded under `conflicts` in `youtube_resources.json`.

**No resource was left unmapped for lack of confidence** — the other 34 all have an unambiguous home once the five specialisation courses exist.

---

## 8. Database changes

**No migration was created and none is needed.** The existing schema already supports everything required. The five new courses, 34 modules and 34 lessons are *content*, not schema, and belong in the seed/import layer rather than a migration — consistent with how the existing 72 videos were loaded.

Planned writes (from the verified dry run): **78 rows** — 5 courses, 5 `program_courses` links, 34 modules, 34 lessons. New courses are created with `is_published = false` so they must pass the existing admin publish guard, deliberately avoiding the `publish-all` bypass (`APX-23`).

---

## 9. Backend changes

**None.** The existing `/api/learn/*` endpoints already serve `lesson.video_url`, and `getLessonContent` already returns it. No new route, controller or service was required.

---

## 10. Frontend changes

Two changes to `src/components/learning/YouTubeLessonPlayer.tsx`:

1. **Privacy-enhanced host.** Embed switched from `youtube.com/embed` to `youtube-nocookie.com/embed`, with an explicit `origin` parameter (required by the IFrame API when using the nocookie host).
2. **Embedding-restriction handling.** `onError` now distinguishes API error codes: `101`/`150` → *"This video cannot be embedded by its owner, so it cannot be played inside Apex Academy."*; `100` → removed/private; anything else → the previous generic message. The student stays inside the platform — no redirect, no attempt to circumvent the restriction.

Deliberately **not** changed: the completion logic (see §13), the layout, and the design system. Navigation never leaves Apex Academy; the only YouTube-hosted surface is the iframe itself, whose native branding is untouched.

---

## 11. Admin changes

**None required.** The existing admin curriculum editor (`/admin/curriculum/courses/:courseId` → `updateAdminLesson`) already edits `video_url`, lesson titles and ordering, and `createLessonResource` already accepts `VIDEO` resources. Once imported, all 34 new lessons are manageable through the existing UI with no new screens.

---

## 12. Import process

| File | Role |
|---|---|
| `supabase/seed/youtube_resources.json` | Canonical manifest: 5 new courses, 34 videos, 2 playlist records, 1 conflict, and the 72 already-integrated IDs for verification |
| `scripts/importYouTubeResources.ts` | Idempotent reconciler |

**Properties:**

- **Dry run by default.** Writes only with `--apply`.
- **Idempotent.** Matches on natural keys (`courses.slug`, module title within course, lesson title within module). Converged runs report `OK` and change nothing.
- **Non-destructive.** Never overwrites a lesson holding a different video, never deletes, never touches `enrollments`, `lesson_progress`, `assessment_attempts` or `certificates`.
- **Validates before writing.** Every video ID is checked against `^[A-Za-z0-9_-]{11}$` and the manifest is checked for internal duplicates before any database call.
- **Verifies the existing 72** and warns if any have disappeared.

```bash
npx tsx scripts/importYouTubeResources.ts            # dry run — prints the full 78-row plan
npx tsx scripts/importYouTubeResources.ts --apply    # performs the writes
```

URL parsing helpers (`parseYouTubeVideoId`, `parseYouTubePlaylistId`) accept `watch?v=`, `youtu.be/`, `embed/`, `v/`, `u/w/` and `list=` forms.

---

## 13. Security considerations

- **No RLS was weakened.** No policy was touched.
- **No new authorization surface.** No endpoint was added; the importer is a server-side script requiring the service-role key.
- **Students cannot modify curriculum.** Content mutation remains behind `requireAdmin`, unchanged.
- **No client-authoritative completion was introduced** (Part 26 honoured).

### ⚠️ Pre-existing issue this feature inherits — `APX-48`

`YouTubeLessonPlayer.tsx` calls `onCompleteLesson()` when watch percentage reaches 90 %, and again on video end. That flows to `POST /api/learn/.../complete`, which performs **no server-side validation** (audit finding `APX-02`). **The client-authoritative completion mechanism Part 26 forbids is already present in the YouTube path** — it predates this task and was not introduced or worsened here.

Every video imported by this task inherits it. A student can mark any video lesson complete with a single request, without watching. This is recorded as `APX-48` and should be resolved by the completion-architecture work in the remediation plan before video progress is treated as meaningful.

---

## 14. Testing performed

| Test | Result |
|---|---|
| Manifest validation (ID format, internal duplicates) | ✅ 34 unique IDs, all valid |
| Importer dry run | ✅ 78 planned writes, no errors |
| Duplicate-import safety | ✅ By construction (natural-key matching); **not yet observed on a real second run** |
| TypeScript compile after all edits | ✅ `npx tsc --noEmit` → 0 errors |
| Dev server health after edits | ✅ HTTP 200 on `/api/health` |
| Cross-reference of 107 provided vs DB | ✅ 72 matched, 35 gap, 6 extra, 0 duplicates |
| Player rendering / playback | ❌ **Not performed** — requires a browser session |
| Embed-restriction error path | ❌ **Not performed** — needs a video with embedding disabled |
| Responsive / fullscreen | ❌ **Not performed** |
| Regression (auth, enrolment, assessments, certificates) | ❌ **Not performed** |

Anything marked ❌ is untested, not passing. The two edited player behaviours are compile-verified only.

---

## 15. Files modified

| File | Change |
|---|---|
| `src/components/learning/YouTubeLessonPlayer.tsx` | nocookie host + `origin`; error-code-aware `onError` |

## 16. Files created

| File | Purpose |
|---|---|
| `supabase/seed/youtube_resources.json` | Canonical YouTube manifest |
| `scripts/importYouTubeResources.ts` | Idempotent importer (dry run by default) |
| `YOUTUBE_INTEGRATION_REPORT.md` | This report |

No migration, no `package.json` change, no dependency added, no file deleted.

---

## 17. Known limitations & open decisions

1. **The import has not been run.** It would create 78 rows in the live production database, which has no version control (`APX-45`) and no rollback path. Five course *titles* are new and need your approval. Run `--apply` yourself, or tell me to.
2. **Market Analytics M5 conflict** (§7) needs a decision.
3. **Five new course titles** are the only invented strings in this work.
4. **Playlist embedding is not implemented.** Both provided playlists were already expanded to per-video lessons, which is strictly better. If you also want a "watch the whole playlist" embed, that is a separate small addition.
5. **`lessons.duration_seconds` is 0** for the new lessons — real durations need the YouTube Data API (`YOUTUBE_API_KEY`), which is not configured.
6. **No thumbnails are stored.** YouTube serves them inside the iframe; storing `i.ytimg.com` URLs would only matter for a video-list sidebar.
7. **`APX-48`** — the inherited client-authoritative completion problem (§13).
8. **Data pollution observed:** `statistics-data-analytics` contains modules M12–M19 titled *Machine Learning Foundations*, *Market Research Foundations*, *Market Sizing*, *Competitive Analysis*, *Customer Segmentation*, *Survey Research*, *Market Research Capstone* — content belonging to other domains appended to the Statistics course. Not caused by this task; flagged for cleanup.
