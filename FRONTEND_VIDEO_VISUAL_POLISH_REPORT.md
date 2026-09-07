# Apex Academy — Final Visual Polish, Video Correction & Responsive Pass

**Date:** 2026-09-07
**Scope:** Player/black-surface polish, typography retune, video content correction, full video re-audit, YouTube redirect audit, responsive verification.
**No secrets appear in this report.**

---

## 1. The headline finding — and a correction to my previous report

**The Avengers Doomsday video was real, and my previous report was wrong to say otherwise.**

In the prior pass I concluded it "does not exist in your data — I could not reproduce it." That conclusion was a **scope failure on my part**: I audited only `lessons.video_url` and never checked the `lesson_resources` table. `LessonRenderer` gave attached resources **precedence** over the lesson's own video, so the offending record was invisible to my audit while being exactly what rendered on screen.

**What was actually there:**

| Field | Value |
|---|---|
| Table | `lesson_resources` |
| Row ID | `bf1d14f3-7d48-4e86-9155-ba7c0f0a0aba` |
| Lesson | Descriptive vs Inferential Statistics (`f0206c01-0300-…`) |
| Title / type | `"video"` / `LINK` |
| URL | `https://youtu.be/D7rqGuPYET0?si=…` |
| **Video** | **"Avengers Doomsday New Trailer Breakdown!"** — channel **ComicVerse** |
| Confirmed by | YouTube oEmbed **and** a live IFrame player reading `getVideoData()` |

You were right both times you reported it. I apologise for the incorrect all-clear.

---

## 2. Root cause and the systemic fix

The precedence logic read:

```js
const attachedVideoResource = resources?.find(r =>
  r.resource_type === 'VIDEO' || r.file_url?.includes('.mp4') || getYouTubeVideoId(r.file_url));
const ytVideoId = getYouTubeVideoId(attachedVideoResource?.file_url) || getYouTubeVideoId(lesson.video_url);
```

Any resource row containing a YouTube link **silently overrode the lesson's real video**. Three defects followed:

1. The Avengers link hijacked the statistics lesson.
2. `r.resource_type === 'VIDEO'` is **unreachable** — the column's CHECK constraint allows only PDF/PPT/NOTE/CODE/DATASET/LINK.
3. A second lesson, **"Why Statistics Matters in Data & Analytics"**, had its valid YouTube video masked by a resource holding a **relative storage path** (`courses/…/01_RAN_1.MP4`). Used as `<video src>` that resolves against the current route and 404s — a broken player where a working video existed.

**Fix (frontend, systemic — no data deleted):** `lessons.video_url` is now authoritative; a resource is only a fallback when the lesson has none, and only when its URL is an **absolute http(s)** YouTube link or real video file.

```js
const isPlayableVideoUrl = (url) => absolute http(s) && (youtube || .mp4|.webm|.ogg|.mov|.m4v)
const attachedVideoResource = resources?.find(r => isPlayableVideoUrl(r.file_url));
const ytVideoId = getYouTubeVideoId(lesson.video_url) || getYouTubeVideoId(attachedVideoResource?.file_url);
```

**Verified in a browser:** with a stray Avengers-style LINK resource deliberately re-attached, the iframe still served `OqoWtOvD8w0`. Lessons are now immune to this class of hijack.

---

## 3. Descriptive vs Inferential Statistics — final state

| | |
|---|---|
| Removed | `lesson_resources` row holding `D7rqGuPYET0` (Avengers Doomsday) — **deleted** |
| Video now | `OqoWtOvD8w0` — **"Lesson 3 - What is Descriptive Statistics vs Inferential Statistics?"**, channel *Math and Science* |
| Source | `lessons.video_url` (authoritative path) |
| Title relevance | overlap **1.00** → `VALID` |
| Verified | Playing in a real browser; embeddable; title, channel and topic all match the lesson |

This is Option A of your Phase 5 — a genuinely relevant, verified educational video, not a filler.

---

## 4. Database rows changed (2 total, both authorised corrections)

| # | Table | Operation | Detail |
|---|---|---|---|
| 1 | `lessons` | UPDATE `video_url` | Off-topic Hindi "EDA Part 15" video → verified descriptive/inferential lesson *(previous pass)* |
| 2 | `lesson_resources` | DELETE 1 row | The Avengers Doomsday LINK *(this pass)* |

Both writes ran precondition checks that aborted unless the current value matched the audited value. Post-write verification confirmed lesson `title`, `display_order`, `lesson_type` and `module_id` unchanged, the total lesson-with-video count still 112, and the one remaining resource row untouched. **No other data was modified.**

---

## 5. Full video audit results

Audited by **effective rendered video** under the corrected precedence — both tables, not just `lessons`.

| Metric | Count |
|---|---|
| Lesson rows considered | 114 |
| Lessons with an effective video | **112** |
| VIDEO-type lessons with **no** video | **2** *(pre-existing gaps — listed below)* |
| Valid YouTube IDs | **112 / 112** |
| Distinct IDs — **duplicates** | 112 — **0** |
| Malformed URLs | **0** |
| Missing IDs | **0** |
| Videos now sourced from `lesson_resources` | **0** |
| Non-playable resource rows (now correctly ignored) | 1 |
| **Unavailable** | **0** |
| **Embed-blocked** | **0** |
| **Unrelated / entertainment** | **0** |
| Corrected | **1** |
| Intentionally removed | **1** (the Avengers resource) |

### Relevance classification (112)

| Class | Count |
|---|---|
| VALID (strong title match) | **39** |
| PROBABLY_RELEVANT | **43** |
| AMBIGUOUS — reported, **not** modified | **30** |

### Browser playability sweep (real IFrame players)

| Check | Result |
|---|---|
| iframe created | **112 / 112** |
| Player reached READY | **112 / 112** |
| `onError` (100 / 101 / 150) | **0** |
| Playback advanced first pass | 111 / 112 |
| Remaining 1 re-tested longer | **playing** |

### Entertainment sweep (Phase 16)

Searched all 112 titles and channels for *Avengers, Doomsday, Marvel, trailer, movie, episode, season, reaction, Netflix, comic…*

- **Avengers / ComicVerse references remaining: 0**
- 2 keyword hits, both manually reviewed and **legitimate**:
  - "Maintain Data Pipelines Like **Netflix** and Airbnb — DataExpert.io" (Netflix as a case study)
  - "Use Case Diagrams Explained | UML | **Season 2**" (series label)

### The 2 lessons with no video (not invented — reported)

| Course | Lesson |
|---|---|
| Python Programming Fundamentals | Data Visualization in Python with Matplotlib & Seaborn |
| SQL & Relational Databases | Data Definition Language (DDL) Commands |

Both now render the light "No video for this lesson yet" state and fall through to written material. **I did not invent replacements.**

### The 30 ambiguous videos (reported, untouched)

| Course | Count |
|---|---|
| **Data Engineering & Pipeline Architecture** | **16** |
| SQL & Relational Databases | 3 |
| Statistics for Data & Analytics | 3 |
| Excel Analytics & Advanced Data Cleaning | 2 |
| AI Backend Eng. / BI Analytics / Data & DB Fundamentals / ETL / Market Research / Python | 1 each |

Clear pattern: the Data Engineering course was populated from a **sequential DataExpert.io bootcamp playlist** rather than topic-matched videos, so lesson and video titles drift (e.g. *"AWS Redshift Cloud Data Warehousing"* → *"Job-Ready Capstone Projects for Analytics Engineering"*). All are genuine educational data-engineering content — none is unrelated entertainment — so per your instruction they were **not** guessed at or replaced.

---

## 6. YouTube redirect audit

| Check | Result |
|---|---|
| Apex-created "Watch on YouTube" link/button | **0 — the string does not appear anywhere in source** |
| Apex code navigating to YouTube | **0** |
| `window.open` → YouTube | **0** (the only `window.open` is an admin file download) |
| `youtube.com` references | 2 — the mandatory `iframe_api` script tag and the ID-extraction regex |
| Playback host | `youtube-nocookie.com` |
| Apex YouTube anchors in the rendered lesson | **0** (measured live) |

**Unavoidable platform limitation, measured:** the "Watch on" control belongs to YouTube's own cross-origin iframe. It carries `target="_blank"`, so the Apex page is never navigated away — confirmed live: the top-level URL was unchanged after full player initialisation. `modestbranding`, `rel=0`, `iv_load_policy=3` and the nocookie host are all already set; that is the legitimate maximum. **No hack was attempted.**

---

## 7. Visual changes

### Black surfaces (classified before changing)

| Surface | Class | Action |
|---|---|---|
| Outer player shell (`bg-slate-950` + `border-slate-800`) | **B — UI background** | → white/`slate-100` card, `slate-200` border, `shadow-sm` |
| Area behind the iframe (`bg-black`) | **C — player container** | → `slate-100`; the iframe paints over it once ready |
| Player error state (`bg-slate-900`) | **C** | → white card, slate text |
| "Video being prepared" empty state | **C** | → white surface, light icon chip, clearer copy |
| Actual video pixels inside the iframe | **A — media content** | **untouched** |
| Modal scrims, code blocks, image overlays | **A / D** | **untouched** |

**No white layer was placed over the video.** Measured after the change: shell background `oklch(0.968 0.007 247.896)` = slate-100, border slate-200.

### Typography

| Weight | Before | After |
|---|---|---|
| `font-black` (900) | **147** | **0** |
| `font-extrabold` (800) | **56** | **0** |
| `font-semibold` (600) | 152 | **355** |
| `font-bold` (700) | 415 | 415 *(left deliberately — small labels, badges, buttons)* |

203 declarations retuned across 40 files. CSS-layer weights (`.apex-lesson-html` headings 800→600, `strong` 700→600) tuned to match. Hero heading ladder trimmed from `lg:text-6xl` (60px) to `lg:text-5xl`; mobile remains `text-3xl` (30px), inside your 30–40px target. Measured: rendered `h2` weight is now **600**.

### Accent unification

The homepage still carried a leftover **blue-600** accent from before the palette unification (16 occurrences) plus 1 on ProgramDetailPage — all mapped to the platform indigo. The domain chip strip also **clipped mid-"View All"** on desktop; it now scrolls on narrow screens and **wraps** at `lg` where there is room.

---

## 8. Responsive results

**110 / 110 viewport checks clean** across 320, 360, 375, 390, 414, 768, 1024, 1280, 1440, 1920 covering `/`, `/free-courses`, `/programs`, `/enterprise`, `/career-support`, `/success-stories`, `/resources`, `/courses/*`, `/domains/*`, `/login`, `/verify-certificate`.

**Video player measured at each width:**

| Width | iframe | Aspect | Overflow |
|---|---|---|---|
| 320 | 286×160 | **1.79** | 0 |
| 375 | 341×191 | **1.79** | 0 |
| 390 | 356×199 | **1.79** | 0 |
| 430 | 396×222 | **1.78** | 0 |
| 768 | 718×403 | **1.78** | 0 |
| 1440 | 894×502 | **1.78** | 0 |

Fluid, exact 16:9, no fixed desktop dimensions, no horizontal overflow. The learner sidebar was already a `lg:` persistent panel with a mobile drawer; `min-w-0` + `overflow-x-hidden` were added to `<main>` in the prior pass so wide tables and code blocks scroll internally.

**Dark-surface re-audit: 5/5 pages clean** — no theme regression from this pass.

---

## 9. StrictMode regression — intact

`YouTubeLessonPlayer.tsx` architecture untouched (only `className` values changed; `containerRef` count unchanged at 4). Verified live under the app's real `<StrictMode>`:

| Scenario | iframes | Visible | Error state |
|---|---|---|---|
| After StrictMode double-mount | **1** | 894×502 | none |
| After video swap | **1** | 894×502 | none |
| After swap back | **1** | 894×502 | none |

No duplicate iframe, no empty black container, no detached iframe, 0 page errors.

---

## 10. Files modified in this pass

| File | Change |
|---|---|
| `src/components/learning/LessonRenderer.tsx` | Video-source precedence fix; light player shell; light empty state |
| `src/components/learning/YouTubeLessonPlayer.tsx` | Light error state and container **(class names only)** |
| `src/index.css` | Lesson-HTML heading/strong weights retuned |
| `src/pages/public/HomePage.tsx` | Hero heading size; chip-strip wrap; accent unification |
| `src/pages/public/ProgramDetailPage.tsx` | Accent unification |
| **40 files** | `font-black` / `font-extrabold` → `font-semibold` |

**Deliberately NOT modified:** all backend controllers/services, migrations, `AppRoutes.tsx` (restored to original after harnesses), auth, enrollment, assessment, certificate logic, `package.json`, the YouTube player lifecycle architecture, lesson titles, lesson ordering, course structure.

Three temporary harness routes were used for browser verification; **all were deleted** — no `__*.tsx` file remains and `AppRoutes.tsx` has zero harness references.

---

## 11. Gates

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | **0 errors** |
| `npm run build` | **PASS** — 1804 modules |
| Console errors in verified pages | **0** |
| Dependencies added | **0** |
| Migrations run | **None** |
| YouTube importer run | **None** |
| Git initialised / committed | **No** — still not a repository |
| Credential rotation | **None** |

⚠️ **`@types/react` is still absent.** JSX prop types resolve to `any`, so `tsc --noEmit` performs **no component prop validation**. A clean type check here means modules resolve and non-JSX types agree — nothing more. The assurance for this pass came from live browser measurement, not the type gate.

---

## 12. Remaining known limitations

1. **30 ambiguous videos remain** — 16 in Data Engineering. Untouched by instruction; each needs a human content decision.
2. **2 VIDEO-type lessons have no video.** I did not invent replacements.
3. **The authenticated lesson page was not browser-tested end-to-end** — `/learn/*` redirects to `/login`, and creating an account would be an unauthorised write. `LessonRenderer` (with real lesson HTML), the player under StrictMode, the precedence fix and the sanitiser were each verified live via temporary harnesses instead.
4. **YouTube's "Watch on YouTube" cannot be removed** — cross-origin, ToS-protected. It opens in a new tab, so no redirect occurs.
5. **Pre-roll ads may still play** before lesson videos; not suppressible by an embedder.
6. **One non-playable `lesson_resources` row remains** (the relative MP4 path). It is now correctly ignored rather than breaking the lesson. I left the row in place because it may reference a genuinely uploaded asset that needs signed-URL resolution — deleting it could lose that reference. Flagged for a backend-scoped fix.
7. **`courses` table has no `status` column** while `AdminCoursesPage` reads `course.status === 'PUBLISHED'` — pre-existing contract mismatch, documented not fixed.
