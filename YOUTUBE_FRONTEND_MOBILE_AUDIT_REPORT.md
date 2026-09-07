# YouTube, Frontend & Mobile Production-Readiness Audit

**Date:** 2026-09-07
**Scope:** Forensic video audit (112 lessons), one authorized data correction, YouTube-redirect audit, lesson-content rendering fix, responsive verification.
**No secrets appear in this report.** No credential, key, token or connection string was printed at any stage.

---

## 1. Executive summary

| Outcome | Result |
|---|---|
| Lessons with a video | **112** |
| Structurally valid YouTube IDs | **112 / 112** |
| Distinct IDs (no duplicates) | **112 / 112** |
| Malformed URLs | **0** |
| Player reaches READY in a real browser | **112 / 112** |
| YouTube playback errors (100/101/150) | **0** |
| Videos unavailable / embed-blocked | **0 / 0** |
| Database records modified | **1** (one `video_url`) |

Four things were established or fixed:

1. **The reported "Avengers Doomsday" video could not be reproduced** — the ID stored on that lesson serves an educational data-analytics video, verified twice. Detail and the most probable explanation are in §3.
2. **The lesson's video was still objectively wrong** for an independent, verifiable reason, and was replaced with a high-confidence match (§4).
3. **Apex contains no "Watch on YouTube" link and no YouTube redirect of any kind.** The control the user saw belongs to YouTube's own cross-origin player and opens in a new tab (§8).
4. **The real readability bug was found:** lesson content is HTML but was being printed as literal text — learners saw raw `<h2>` and `<div style=…>` markup. It is now sanitised and rendered (§10).

---

## 2. Files modified

| File | Why | Change | Risk | Verification |
|---|---|---|---|---|
| `src/utils/sanitizeHtml.ts` *(new)* | Lesson HTML must be rendered, which requires `dangerouslySetInnerHTML` | Allowlist sanitiser — tags, attributes, CSS properties; strips `on*`, `javascript:`, script/iframe/style/form/svg | Low — deny-by-default | 9 XSS vectors tested live, all neutralised |
| `src/components/learning/LessonRenderer.tsx` | Content rendered as literal text at 2 sites | Added `renderLessonBody()`; both sites now render sanitised HTML, with a plain-text fallback | Low — pure presentation | Browser: markup renders, `literalMarkupVisible: false` |
| `src/index.css` | Rendered HTML needed light-theme typography and contrast guarantees | Added `.apex-lesson-html` block (headings, lists, tables, code, callouts) | Low — scoped to one class | Computed colours measured (§10) |
| `src/pages/student/LearningInterfacePage.tsx` | Flex child defaulted to `min-width:auto`; wide tables/code could push the page sideways | Added `min-w-0` + `overflow-x-hidden` to `<main>` | Low | 0 horizontal overflow at all widths |

**Database:** one `UPDATE` on one `lessons` row (§4).

**Deliberately untouched:** `YouTubeLessonPlayer.tsx` (StrictMode fix — verified intact, §12), all backend, migrations, auth, importer, course/module structure, lesson titles, lesson ordering.

Two temporary harness routes were created for browser verification and **both were deleted**; `AppRoutes.tsx` is back to its original route list, and no `__*.tsx` file remains.

---

## 3. The reported problem — what was actually found

**Reported:** lesson *"Descriptive vs Inferential Statistics"* plays *"Avengers Doomsday New Trailer Breakdown!"*.

**Found:** the lesson held ID `czDQqnQT3yQ`. Checked two independent ways:

| Method | Result |
|---|---|
| YouTube oEmbed metadata | `Data Analytics Hindi Full Course 2026 \| Exploratory Data Analysis (EDA) \| Part 15` — channel *Top VarSity* |
| Real Chromium + IFrame API `getVideoData()` | Same title; player state `1` (PLAYING) |

**I could not reproduce an Avengers video, and I will not claim I removed one.** YouTube IDs are immutable, so a stored ID cannot silently become a different video.

**Most probable explanation:** what appeared was almost certainly **YouTube's own pre-roll advertisement or a suggested-video overlay**, not lesson data. A Marvel trailer ad is entirely consistent with the reported title and exclamation mark. Neither ads nor suggestion overlays live in the Apex database, and neither can be disabled through the embed API — `rel=0` has only limited related videos to the same channel since 2018, and ad suppression is not available to embedders. The player already sets every legitimate mitigation (`rel=0`, `modestbranding=1`, `iv_load_policy=3`, `youtube-nocookie` host).

If the Avengers content recurs, it is an **ad impression**, and the only supported remedies are outside this codebase (YouTube Premium for viewers, or licensed/self-hosted video).

---

## 4. The correction applied

The stored video was nevertheless wrong on its own merits, independent of the Avengers report:

- Lesson-title ↔ video-title token overlap: **0.00**
- A **Hindi-language** "Part 15 / EDA" video inside an English-language course
- Topic is exploratory data analysis, not descriptive vs inferential statistics

| Field | Value |
|---|---|
| Lesson | Descriptive vs Inferential Statistics |
| Course / Module | Statistics for Data & Analytics / Statistical Thinking & Data |
| Lesson ID | `f0206c01-0300-0000-0000-000000000000` |
| **Old ID** | `czDQqnQT3yQ` — "Data Analytics Hindi Full Course 2026 … EDA … Part 15" |
| **New ID** | `OqoWtOvD8w0` — **"Lesson 3 - What is Descriptive Statistics vs Inferential Statistics?"**, channel *Math and Science* |
| New overlap | **1.00** — classification `VALID` |

**Why this candidate.** Five title-matching candidates were found and every one was verified embeddable and playing in a real browser before choosing:

| ID | Channel | Verified |
|---|---|---|
| **`OqoWtOvD8w0`** | **Math and Science** | READY, playing — **selected** |
| `dRUnDNIRTF0` | Math and Science | READY, playing |
| `e0IqWXl79TY` | Learn2Stats | READY, playing |
| `xl7YrCyo14s` | Jovian | READY, playing |
| `bvUZ1NH_quA` | Alanis Business Academy | READY, playing |

*Math and Science* is an established educational channel publishing numbered lesson series, which suits a structured course module. The ID was confirmed not already in use, so no duplicate was created.

**Write safety.** The update script asserted the current value matched the audited value before writing and aborted otherwise. Post-write verification confirmed `title`, `display_order`, `lesson_type` and `module_id` were all unchanged, and the total lesson-with-video count stayed at 112.

---

## 5–11. 112-video audit results

Metadata was retrieved for every video via YouTube's public oEmbed endpoint (no API key), then each was instantiated as a **real IFrame player in Chromium** using the app's exact host and `playerVars`.

| Classification | Count |
|---|---|
| VALID (strong title match) | **39** |
| PROBABLY_RELEVANT (partial match, on-topic) | **43** |
| AMBIGUOUS (reported, **not** modified) | **30** |
| REPLACED | **1** |
| UNAVAILABLE | **0** |
| EMBED_BLOCKED | **0** |
| OBVIOUS_MISMATCH remaining | **0** |
| **Total** | **112** |

### Playability (real browser)

| Check | Result |
|---|---|
| iframe created | 112 / 112 |
| Player reached READY | 112 / 112 |
| `onError` fired (codes 100/101/150) | **0** |
| `currentTime` advanced on first pass | 104 / 112 |
| Remaining 8 re-tested with a longer window | **8 / 8 playing** |

The 8 slow starters (`eAHAKowv6hk`, `PR7xz5vQKGg`, `XD2b8V_RfFc`, `ZRmBIktFyDI`, `emQM9gYh0Io`, `ja7VOqDVkuo`, `N7Av1YwB1K4`, `T6vmlqCWxKM`) were buffering or serving a pre-roll, not failing.

### A correction to my own method

My first heuristic flagged 3 videos as entertainment. **All three were false positives** — triggered by the words *breakdown*, *Netflix* and *Season* inside legitimate educational titles. After manual review:

| Video title | Lesson | Verdict |
|---|---|---|
| "Karpathy's Intro to LLMs — The Complete Visual **Breakdown**" | Intro to LLMs — The Complete Visual Breakdown | **VALID** — near-exact |
| "Use Case Diagrams Explained \| UML for Business Analysts \| **Season 2**" | Process Modeling with UML Use Case Diagrams | **VALID** — exact topic |
| "Maintain Data Pipelines Like **Netflix** and Airbnb — DataExpert.io Week 6" | Docker & Containerization for Pipeline Deployment | **AMBIGUOUS** — on-domain, off-topic |

Notably, that heuristic did **not** flag the reported lesson — consistent with §3, where no entertainment video exists.

### Ambiguous videos — reported, not guessed

30 lessons carry genuine educational content that does not match the lesson topic closely. Per instruction these were **left untouched**.

| Course | Ambiguous |
|---|---|
| Data Engineering & Pipeline Architecture | **16** |
| SQL & Relational Databases | 3 |
| Statistics for Data & Analytics | 3 |
| Excel Analytics & Advanced Data Cleaning | 2 |
| AI Backend Engineering / BI Analytics / Data & Database Fundamentals / ETL Development / Market Research / Python Fundamentals | 1 each |

**Clear pattern:** the Data Engineering course was populated with a *sequential* DataExpert.io bootcamp playlist rather than topic-matched videos, so lesson titles and video titles drift apart. Examples:

| Lesson | Current video |
|---|---|
| AWS Redshift Cloud Data Warehousing | Job-Ready Capstone Projects for Analytics Engineering |
| dbt (Data Build Tool) Analytics Engineering | Data Engineering like a Product Manager — KPIs & Experiments |
| PySpark DataFrames & Large-Scale Transformation | Master Data Contracts in 25 minutes! |
| Apache Airflow DAG Authoring & Orchestration | High Performance Spark in 1 hour |

Fixing these is a curriculum-curation decision, not an automated one. Recommendation in §16.

---

## 8. YouTube redirect audit & "Watch on YouTube"

Repository-wide scan for `youtube.com`, `youtu.be`, `youtube-nocookie`, `window.open`, `window.location`, `target="_blank"`, and the literal string "Watch on YouTube":

| Finding | Result |
|---|---|
| Apex-created "Watch on YouTube" link/button | **None — zero occurrences of the string anywhere in the source** |
| Apex code navigating to YouTube | **None** |
| `window.open` calls | 1 — `AdminMaterialsPage.tsx:387`, an admin file download. Not YouTube. |
| `youtube.com` references | 2 — the mandatory `iframe_api` script tag, and the ID-extraction regex |
| Playback host | `youtube-nocookie.com` (privacy-enhanced) |
| `target="_blank"` pointing at YouTube | **None** |

### The unavoidable limitation, measured

Inside the running player, the embed's own DOM was inspected:

```
embed anchors: 3
  { text: "Lesson 3 - What is Descripti…", target: "(none)" }
  { text: "Watch on",                      target: "_blank", rel: "nofollow" }
top-level URL unchanged → stayed on Apex: true
```

The **"Watch on YouTube" control is rendered by YouTube inside its own cross-origin iframe.** It is not Apex markup, cannot be removed or restyled by us, and removing it is not permitted under YouTube's Terms of Service. I did not attempt to hack around it.

**The learner is not redirected.** That anchor carries `target="_blank"`, so it opens a new tab and the Apex page remains loaded — confirmed: the top-level URL was unchanged after the player fully initialised.

`modestbranding=1` is already set; note YouTube deprecated its effect in August 2023, so the branding renders regardless. Every legitimate mitigation is already in place.

---

## 10. Lesson notes contrast — root cause and fix

**Root cause (not a CSS problem).** Lesson `content` is stored as well-formed HTML — across all lessons: 495 `<h2>`, 631 `<li>`, 326 `<p>`, 178 `<code>`, 42 `<pre>`, 22 `<table>`. `LessonRenderer` rendered it with `{lesson.content}` inside a `whitespace-pre-line` div, i.e. **as literal text**. Learners saw raw tags and `style="…"` strings on the page. **61 of 112** lessons are affected.

**Security assessment before rendering:** no `<script>`, `<iframe>`, or `on*` handler exists in any lesson content — it is admin-authored, not user-generated. It is still sanitised, because rendering requires `dangerouslySetInnerHTML`.

**Fix:**
- `sanitizeLessonHtml()` parses into an inert document, then **allowlists** tags, attributes and CSS properties. Everything else is removed; unknown structural elements are unwrapped so text survives, while script/style/iframe/object/form/svg are deleted outright. `javascript:` URLs are stripped and external links get `rel="noopener noreferrer nofollow"`.
- `.apex-lesson-html` supplies light-theme typography and **guarantees contrast regardless of the inline colours stored in the content** — the legacy off-palette blue `#026adb` is re-pointed at the indigo token in CSS rather than by editing lesson data, and any authored near-white text on a light surface is forced back to the body colour (except inside dark code blocks, where light text is correct).
- Tables and `<pre>` scroll inside their own box, so wide content cannot widen the page.

**Measured in the browser after the fix:**

| Check | Result |
|---|---|
| 9 XSS vectors (script, `onerror`, `javascript:` href, CSS `url(javascript:)`, iframe, svg `onload`, form, `onclick`, style) | **All neutralised** — no `__XSS*` flag set, 0 network attempts |
| Script / iframe / form / style tags surviving | 0 / 0 / 0 / 0 |
| `onclick` attributes surviving | 0 |
| Benign text preserved alongside stripped tags | Yes |
| Literal markup still visible | **false** |
| Heading colour | `rgb(15,23,42)` on white — strong contrast |
| Body/list colour | `rgb(51,65,85)` on white — strong contrast |
| Callout accent | `rgb(79,70,229)` — indigo token |
| Horizontal overflow | 0 |

**No lesson content was altered to solve CSS.**

---

## 12. Regression protection — StrictMode

`YouTubeLessonPlayer.tsx` was **not modified** (confirmed: no write in this session; `containerRef` and the explanatory comment intact). Verified live under the app's real `<StrictMode>`:

| Scenario | iframes | Visible | Error state |
|---|---|---|---|
| After StrictMode double-mount | **1** | 768×432 (16:9) | none |
| After switching video | **1** | 768×432 | none |
| After switching back | **1** | 768×432 | none |

Page errors: **0**. No duplicate iframe, no empty black container, remount works, React-owned container survives while the YouTube-owned iframe is destroyed and recreated. Progress polling, completion callbacks and resume-position code paths are untouched.

---

## 16–17. Responsive results

**180 / 180 viewport checks clean** across 10 widths — 1920, 1440, 1280, 1024, 768, 414, 390, 375, **360**, 320 — covering `/`, `/free-courses`, `/enterprise`, `/career-support`, `/success-stories`, `/programs`, `/programs/genai-leaders`, `/domains/data-scientist`, `/courses/statistics-data-analytics`, `/resources`, `/institutions`, `/search`, `/search?q=data`, `/verify-certificate`, `/login`, `/register`, 404.

Each check asserts: no document horizontal overflow (walking ancestors so legitimately-clipped decoration is not falsely flagged), no CTA icon/text baseline break on single-line controls, and no console or page errors.

**Dark-theme re-audit after the CSS additions: 6/6 pages clean** — no regression to the light theme.

**Learning interface:** already uses a persistent `lg:` sidebar with a mobile drawer below `lg`, and the video keeps `aspect-video` (16:9 — measured 768×432). The one gap found and fixed was the missing `min-w-0` on `<main>`.

---

## 18–21. Gates

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | **0 errors** |
| `npm run build` | **PASS** — 1804 modules |
| Browser verification | Performed throughout — real Chromium, not build-passing-as-proof |
| Database writes | **1 row, 1 column** (`lessons.video_url`) |
| Migrations run | **None** |
| YouTube importer run | **None** |
| Git initialised / committed | **No** — still not a git repository |
| Credential rotation | **None** |
| Secrets printed | **None** |
| Dependencies added | **None** |

⚠️ **`@types/react` is still absent.** JSX prop types resolve to `any`, so `tsc --noEmit` performs **no component prop checking**. A clean type check here means modules resolve and non-JSX types agree — nothing more. The real assurance for this task came from live browser measurement.

---

## 23. Remaining limitations

1. **The Avengers video was not reproducible** (§3). Most likely a YouTube advertisement or suggestion overlay, which cannot be suppressed by an embedder.
2. **30 ambiguous videos remain** (§5–11), 16 of them in Data Engineering. Left untouched by instruction.
3. **The authenticated lesson page was not browser-verified end-to-end** — `/learn/*` redirects to `/login` and creating an account would be an unauthorized database write. The player, the sanitiser and the rendered content were each verified live via temporary harnesses instead; the full authenticated page was verified by build, type check and code review.
4. **`courses` table has no `status` column** — `AdminCoursesPage` reads `course.status === 'PUBLISHED'`, which is always false against the raw table. A pre-existing backend/frontend contract mismatch, **documented not fixed** (out of scope).
5. **YouTube's "Watch on YouTube" cannot be removed** (§8). It opens in a new tab, so no redirect occurs.
6. Ads may still play before lesson videos; that is inherent to free YouTube embedding.

---

## 24. Recommended next steps

1. **Curate the 30 ambiguous videos** — highest value is the 16 Data Engineering lessons, where a sequential bootcamp playlist was mapped onto topic-specific lesson titles. Needs a human content decision per lesson.
2. **Install `@types/react` and `@types/react-dom`** — restores prop checking; expect an initial backlog of genuine errors.
3. **If ads are unacceptable**, the only real options are licensed/self-hosted video or a YouTube paid arrangement; no embed parameter removes them.
4. **Fix the `courses.status` contract mismatch** in a backend-scoped task.
5. **Consider a lesson-content authoring guide** so future HTML uses semantic markup and inherits `.apex-lesson-html` styling instead of inline colours.
