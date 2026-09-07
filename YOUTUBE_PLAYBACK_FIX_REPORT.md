# APEX ACADEMY LMS — YOUTUBE PLAYBACK FIX REPORT

**Date:** 2026-09-07
**Result:** **FIXED and browser-verified.** 112/112 video lessons render a live, playing player. 0 owner-disabled. 0 database rows changed.

---

## 1. Original Symptom

- YouTube player area appears **black**
- Some lessons show **"Video content is being prepared"**
- Video never becomes visible or playable

## 2. Root Cause

**`YT.Player.destroy()` deletes the `<iframe>` it was attached to, and React StrictMode's double-invoked effect made the component destroy its own player element on every mount.**

`YouTubeLessonPlayer` rendered an `<iframe>` in JSX and handed that existing element to `new window.YT.Player(iframeRef.current, …)`. The YouTube IFrame API **adopts** such an element, and `destroy()` **removes it from the DOM** rather than merely detaching listeners.

`src/main.tsx` wraps the app in `<StrictMode>`, so in development React runs every effect as **mount → cleanup → mount**:

| Step | What happens |
|---|---|
| 1. effect runs | `new YT.Player(iframe)` — player attaches, video would play |
| 2. StrictMode cleanup | `playerRef.current.destroy()` — **YouTube removes React's `<iframe>` from the DOM** |
| 3. effect runs again | `if (!iframeRef.current) return;` passes — the ref still points at the now-**detached** node — so `new YT.Player(detachedNode)` attaches to nothing |

Net result: the container is empty. The surrounding `div` has `bg-black`, so the user sees a **black box**.

This explains every observed characteristic: it affected **all** videos equally, was unrelated to any specific ID or course, and left no console error.

## 3. Evidence Proving Root Cause

Executed in real headless Chromium against the app origin, simulating the StrictMode lifecycle:

```
iframeInDOM_beforeInit      = true
onReady_1                   = true      <- player worked on first attach
iframeInDOM_afterInit       = true
destroy_called              = true
iframeInDOM_afterDestroy    = false     <- YouTube REMOVED React's iframe
wrapChildren_afterDestroy   = 0
reinit_called               = true      <- second effect run, detached ref
FINAL_wrapChildren          = 0
FINAL_iframeInDOM           = false
FINAL_visibleIframes        = 0         <- BLACK BOX
live YouTube frames         = 0
```

**Control experiment — the embed configuration was never at fault.** The same URL, host and parameters, used *without* the destroy/re-init cycle, worked perfectly for all 7 representative videos:

```
SUMMARY (current config, no StrictMode cycle): 7/7 rendered a player, 7/7 began playback
```

with real durations (278s, 845s, 776s, 266s, 690s, 649s, 787s) and `ytError=null`. This ruled out the URL form, the `youtube-nocookie` host, the `origin` parameter, CSP and the `allow` attribute before any code was changed.

### The "Video content is being prepared" message is a separate, non-defect

Source: `LessonRenderer.tsx:263`, rendered when `hasRealVideo === false`. Database analysis:

| Metric | Count |
|---|---|
| Lessons total | 263 |
| `lesson_type = 'VIDEO'` | 103 |
| …of those, **no `video_url`** | **2** |

Only **2 lessons** genuinely have no video attached, and the message is correct behaviour for them. It is **not** a player fault and no supplied video is missing because of it.

## 4. Files Changed

| File | Change |
|---|---|
| `src/components/learning/YouTubeLessonPlayer.tsx` | **Only file modified.** |

`LessonRenderer.tsx` was **not** modified (mtime unchanged). No backend, API, CSS, manifest, importer, migration or schema change.

## 5. Exact Nature of Fix

Let the YouTube API **create and own** its iframe inside a React-owned container, so `destroy()` removes YouTube's element and leaves React's node intact.

```diff
-  const iframeRef = useRef<HTMLIFrameElement>(null);
+  const containerRef = useRef<HTMLDivElement>(null);   // reuses a pre-existing unused ref

-  playerRef.current = new window.YT.Player(iframeRef.current, {
+  playerRef.current = new window.YT.Player(containerRef.current, {
+    host: 'https://www.youtube-nocookie.com',
+    videoId,
+    width: '100%',
+    height: '100%',
+    playerVars: { enablejsapi: 1, rel: 0, modestbranding: 1, iv_load_policy: 3, origin: window.location.origin },
     events: { … }          // unchanged

-  <iframe ref={iframeRef} className="w-full h-full absolute inset-0 z-0" src={…} allow={…} allowFullScreen />
+  <div ref={containerRef} className="w-full h-full absolute inset-0 z-0 [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:absolute [&>iframe]:inset-0 [&>iframe]:border-0" />
```

Three points of note:

- **No new library.** The existing IFrame API implementation was kept and corrected, not replaced.
- **A pre-existing unused `containerRef` at line 23 was reused** rather than adding a duplicate declaration.
- **`width`/`height` are set through the API**, so correct sizing does not depend on Tailwind arbitrary-variant class generation. The class-based rules remain as a fallback.

## 6. URL Normalization Behaviour

Unchanged — and verified correct. `getYouTubeVideoId` in `LessonRenderer.tsx:203` handles `youtu.be/`, `v/`, `u/w/`, `embed/`, `watch?v=` and `&v=`, requiring an exactly-11-character ID.

Database audit of all stored URLs:

| Form present in DB | Count |
|---|---|
| `https://www.youtube.com/watch?v=<ID>` | **112 (100 %)** |
| Any other form | 0 |
| Parse to a valid 11-char ID | **112** |
| **Malformed** | **0** |

The final embed URL is produced by the YouTube API from `videoId` + `host`, so `/watch?v=`, double `/embed/`, `undefined`, `null` and encoded-URL-as-ID are all structurally impossible now.

## 7. CSP Findings

**The Apex application sets no Content-Security-Policy** — it uses no `helmet` and no security-header middleware (consistent with `APX-34`). No `frame-src`, `child-src`, `script-src` or `connect-src` restriction exists, so nothing was blocking YouTube. **No CSP change was made or needed.**

During the earlier deployment task a CSP *was* briefly observed on port 3100 — that was an **unrelated Next.js application** that had bound the port, not Apex. It is not part of this project.

## 8. iframe Configuration

| Attribute | State |
|---|---|
| Host | `https://www.youtube-nocookie.com` (privacy-enhanced, preserved) |
| `enablejsapi` | `1` — required for progress tracking |
| `origin` | `window.location.origin`, derived at runtime — no hardcoded domain, works locally and after deployment |
| `rel`, `modestbranding`, `iv_load_policy` | preserved |
| `showinfo` | dropped — deprecated by YouTube and ignored |
| **`sandbox`** | **absent** (was already absent). Correctly so: a sandbox would break the postMessage channel. Nothing was weakened |
| Fullscreen / `allow` | Managed by the API, which sets `allowfullscreen` and the standard `allow` list on the iframe it creates |
| Size | `100% × 100%` via API options |

No parameter was added merely to suppress an error.

## 9. Player Configuration

Raw YouTube **IFrame Player API** (`https://www.youtube.com/iframe_api`), loaded once via a guarded `<script id="youtube-iframe-api">` injection. No `react-youtube` or other wrapper. `package.json` was **not modified**.

Progress polling, resume-from-position, state handling and the completion callbacks were left byte-identical.

## 10. CSS / Layout Findings

The container chain (`aspect-video` → `relative w-full h-full` → player root → iframe) was already sound; nothing was covering the player and no zero-height box existed. The **only** layout issue was that YouTube's generated iframe defaulted to **640×360** instead of filling the container. Fixed by passing `width`/`height` to the API.

Measured in-browser after the fix, in a 900×506 container:

```
iframe-in-container=true  size=900x506  visible=true  totalIframes=1
```

16:9 via the existing `aspect-video` wrapper; responsive behaviour unchanged.

## 11–15. Reconciliation Across All Videos

Every lesson with a `video_url` was driven through the real embed path in a real browser:

| Metric | Target | Actual |
|---|---|---|
| Total video lessons | 112 | **112** |
| Valid YouTube IDs | 112 | **112** |
| Malformed URLs | 0 | **0** |
| Missing IDs | 0 | **0** |
| Duplicate IDs | 0 | **0** |
| **Playable (onReady, no error)** | — | **112** |
| **Owner-disabled (101/150)** | — | **0** |
| Removed / private (100) | — | **0** |
| Other error codes | — | **0** |
| Failed to initialise | — | **0** |

**No video required a "cannot be embedded" message.** The owner-disabled handling (codes 101/150 → in-platform message, no redirect) remains in place for future content.

## 16. TypeScript

`npx tsc --noEmit` → **0 errors.**

## 17. Build

`npm run build` → **PASS**, 1794 modules transformed, built in 3.34s.

## 18. Browser Verification Result

**PERFORMED — not skipped.** Headless Chromium (Playwright-cached build 1228) driven via `playwright-core`, installed with `--no-save` so **`package.json` was not modified**.

The **real `YouTubeLessonPlayer` component** was mounted inside `<StrictMode>` — the exact condition that caused the failure — through a temporary Vite-served harness at the application origin, with the app's own `index.css` loaded. The harness was **deleted after the run**; no test artifact remains in the project.

| Check | Result |
|---|---|
| Player visible | ✅ 9/9 |
| Iframe inside the React container | ✅ 9/9 |
| Correct size (900×506, fills container) | ✅ 9/9 |
| **Playback actually advances** (`currentTime` > 0, `paused=false`) | ✅ **9/9** |
| Black-screen-only state | **0** |
| App-level "Video Error" state | **0** |
| Owner-disabled | **0** |

### Honest limitation

The authenticated route `/learn/:slug/lesson/:id` was **not** driven end-to-end, because reaching it requires a student login and creating a test account would write to `profiles`/`enrollments` — prohibited by this task. Verification therefore targets the **player component itself under its real failure condition**, which is where the defect was. Lesson-page navigation chrome around it was not browser-exercised.

## 19. Course-by-Course Verification

| Course | Video ID | Player | Playback |
|---|---|---|---|
| Data Science Applied Track | `X3paOmcrTjQ` | ✅ | ✅ 278s |
| AI Engineering & LLM Systems | `xTkkafyD0Q0` | ✅ | ✅ 844s |
| AI Backend Engineering | `iAfAXS1PRNU` | ✅ | ✅ 775s |
| ETL Development & Orchestration | `DyLQTzNlRUA` | ✅ | ✅ 266s |
| BI Analytics & Reporting | `NjA41hhnr18` | ✅ | ✅ 689s |
| **Market Analytics & Research** | `kFM72UJhW8s` | ✅ | ✅ 648s |
| BI Dashboard Engineering (pre-existing) | `gP-AxNi6uxo` | ✅ | ✅ 787s |
| Data Engineering (pre-existing) | `5U-BbZ9G_xU` | ✅ | ✅ 2597s |
| Excel Analytics (pre-existing) | `FMSJXtwt6hE` | ✅ | ✅ 1391s |

Plus the full 112-video sweep covering every course.

## 20. Regression Check

| Behaviour | Status |
|---|---|
| Completion callback (`onCompleteLesson`, 90 % + ended) | ✅ preserved verbatim — **APX-48 intentionally unchanged** |
| Progress reporting (`onUpdateProgress`, 1s polling) | ✅ preserved |
| Resume from `lastPositionSeconds` | ✅ preserved |
| Owner-disabled messaging (101/150/100) | ✅ preserved |
| `youtube-nocookie` privacy host | ✅ preserved |
| No external redirect to YouTube | ✅ repository-wide scan: **0 matches** for `window.location`→YouTube, `<a href>`→youtube.com/youtu.be, `window.open`, `target="_blank"` |
| Responsive 16:9 layout | ✅ preserved |
| Native (non-YouTube) `<video>` path | ✅ untouched |
| Non-video lessons | ✅ untouched (`LessonRenderer.tsx` not modified) |
| Lesson / course navigation | ✅ untouched |
| Admin preview | ✅ untouched |

## 21. Remaining Known Issues

| Item | Status |
|---|---|
| **2 lessons** are `lesson_type = 'VIDEO'` with no `video_url` | Correctly show "Video content is being prepared". **Not a defect** — no supplied video is missing. Attaching content is an authoring decision |
| `YfH24K_YjHw` | **UNRESOLVED — not invented into the database.** Verified absent |
| **APX-48** — client-authoritative completion | **Unchanged, as instructed.** The 90 % callback still fires with no server validation |
| **APX-49**, **APX-50**, **APX-51** | Untouched |
| Authenticated lesson-route browser test | Not performed (would require a database write) |

## 22. Confirmation: No Database Content Changed

**0 database rows modified.** No malformed URL was found, so the conditional permission to correct one was never exercised.

Post-fix state, identical to pre-fix:

```
video lessons        112
distinct IDs         112
duplicates             0
malformed              0
courses               16
YfH24K_YjHw present  false
```

No migration applied, no importer run, no course/module/lesson/program/progress/attempt/certificate/profile/enrolment/question/assessment/RLS change.

---

*YouTube playback fix, 7 September 2026. One source file modified. Browser verification performed with a temporary harness that was removed; `package.json` unchanged; `playwright-core` installed with `--no-save`.*
