# Apex Academy LMS — Platform-Wide Layout & Light-Theme Refinement

**Date:** 2026-09-07
**Scope:** Global width system, global header structure, light-theme conversion, responsive verification.
**Not in scope:** Visual identity redesign (the previous frontend upgrade stands), database, migrations, backend APIs, authentication, YouTube mappings, course content.

---

## 1. Executive summary

Three architectural problems were fixed centrally rather than page by page.

| Problem | Root cause | Fix |
|---|---|---|
| ~320px of dead gutter per side at 1920px | `max-w-7xl` (1280px) hardcoded **45×** across every page, Header, Footer, MegaMenu | One responsive width system in `index.css`; all 45 call sites now use `.apex-container` |
| Brand not anchored left | Header confined to the same 1280px box | Header uses a wider app-chrome container (1728px at ≥1536px) |
| Dark navy page themes | 16 page-level `bg-slate-900` sections + a dark footer on every page | `.apex-hero` / `.apex-cta-panel` light treatments; all converted |

**Measured result at 1920px:** brand moved from **360px → 136px** from the left edge; page content width **1280px → 1512px**; header width **1280px → 1728px**; gutter **320px → 96px**.

**Verification:** `tsc --noEmit` 0 errors · `npm run build` PASS · **140/140** viewport checks clean across 10 widths · **17/17** pages free of dark page-level surfaces.

An `.apex-container` utility already existed in `index.css` from the previous upgrade but was used **zero times** — every page hardcoded its own shell. That was the lever.

---

## 2. Global header changes

**FILE:** `src/components/layout/Header.tsx`, `src/components/layout/MegaMenu.tsx`
**WHY:** Brand sat 360px inside the viewport at 1920px because the header shared the 1280px content box.
**CHANGE:** Both now use `.apex-container-wide` (1728px at ≥1536px). Structure was already Brand → nav → `ml-auto` account cluster; no reordering was needed.
**RISK:** Low — a container swap, no DOM restructuring.
**VERIFICATION:** Measured leftmost and rightmost header controls in a real browser:

| Viewport | Leftmost control | Rightmost control |
|---|---|---|
| 1920px | `Apex Academy — home` @ **136px** | `Register Free` @ **136px from right** |
| 1440px | `Apex Academy — home` @ **112px** | `Register Free` @ **112px from right** |
| 1280px | `Apex Academy — home` @ **32px** | `Register Free` @ **32px from right** |

Brand and account anchor symmetrically to the container edges at every width.

**Deliberate design decision:** the header (1728px) is intentionally wider than page content (1512px), the standard app-chrome pattern. This is what puts the brand hard left as the brief's diagram requires. If you would rather they align exactly, change one token: `--container-wide: 1512px`.

---

## 3. Global width / container system

**FILE:** `src/index.css`
**CHANGE:** Three tokens and three utilities, replacing per-page decisions.

```
--container-max   : 1280px  → 1512px at ≥1536px   /* standard page shell */
--container-wide  : 1280px  → 1728px at ≥1536px   /* global header chrome */
--container-prose : 1120px                        /* reading measure */
```

`.apex-container`, `.apex-container-wide`, `.apex-container-prose` — each `width:100%; margin-inline:auto`, padding stepping 1rem → 1.5rem (640px) → 2rem (1024px) → 2.5rem (1536px).

**A cascade bug found and fixed during implementation:** the `@media (min-width: 1536px)` block redefining `:root` was first placed inside `@layer components`. Unlayered CSS beats layered CSS, so the base `:root` won and the step-up silently did nothing — the browser still measured 1280px. Moved to an unlayered `@media` block at the same specificity as the base `:root`. Caught by measuring, not by reading the code.

**Measured widths:**

| Viewport | Header | Content | Gutter | Overflow |
|---|---|---|---|---|
| 1920 | 1728 | 1512 | 96 | 0 |
| 1536 | 1536 | 1536 | 0 | 0 |
| 1440 | 1280 | 1280 | 80 | 0 |
| 1280 | 1280 | 1280 | 0 | 0 |
| 1024 | 1024 | 1024 | 0 | 0 |

Prose stays readable: article bodies, auth cards and modals keep their own narrower measures. Nothing was blanket-stretched to 1500px.

---

## 4. Light-theme conversion

Two reusable treatments defined once in `index.css`:

- **`.apex-hero`** — soft indigo radial washes over a `indigo-50 → slate-50 → white` gradient, subtle bottom border. Replaces every dark page hero.
- **`.apex-cta-panel`** — an indigo brand gradient for closing CTA blocks. A *contained card*, never a page background.

Converted surfaces:

| File | What was dark |
|---|---|
| `Footer.tsx` | `bg-slate-900`, 423px tall, on **every page** |
| `CareerSupportPage`, `EnterprisePage` | hero + closing CTA panel |
| `ProgramsPage`, `SuccessStoriesPage`, `ResourcesPage`, `FreeCoursesPage`, `SearchPage`, `DomainDetailPage` | hero sections, hero inputs, stat cards |
| `CourseDetailPage` | hero + the enrolment card (`bg-slate-950`), now a white sticky card |
| `PublicCertificateVerificationPage` | the entire page |
| `InstitutionDetailPage`, `ResourceDetailPage`, `SuccessStoryDetailPage` | heroes, chips, sidebar cards |
| `StudentLayout` | learner sidebar (`bg-slate-900`) — now matches the light admin shell |
| `MegaMenu` | dark domain-preview panel inside the global header |
| `ProtectedRoutes` | full-screen loading and "Access Denied" screens |
| `LearningInterfacePage` | full-screen loading and error states |

**Palette used:** page `slate-50`, surfaces `white`, secondary `indigo-50`/`slate-50`, borders `slate-200`, text `slate-900`, muted `slate-500/600`, accent the existing Apex indigo. No second colour system, no new one-off hexes.

---

## 5. Public page changes

Every public route was inspected. Beyond the container and theme work above:

- **Home** — 4-up stat row now 2-up below `sm` (it wrapped awkwardly at 390px). Announcement strip and all sections on the shared container.
- **Free courses** — hero search restyled for a light ground; catalogue grid gains a 4th column (below).
- **Programs / Resources / Success stories** — grids widened; hero inputs lightened.
- **Domain detail** — hero stat card converted from `bg-slate-800/50` to a white surface; breadcrumb, target-role chips and stats lightened.
- **Course detail** — enrolment card is now `lg:sticky lg:top-24`, per §9.
- **Certificate verification** — full page converted; it is a public-facing trust surface and was the only remaining all-dark page.

---

## 6. Course catalog

**FILE:** `CourseCard.tsx` (`CourseGrid`), `Skeleton.tsx`, `ProgramsPage`, `ResourcesPage`, `SuccessStoriesPage`, `MyLearningPage`
**CHANGE:** `2xl:grid-cols-4` added. Column progression: 1 (mobile) → 2 (sm/md) → 3 (lg/xl) → **4 (2xl)**.
**RISK:** None to behaviour — filtering, sorting and search are untouched.
**VERIFICATION:** Screenshot at 1920px confirms 4 columns with cards at a comfortable ~318px, not narrow slivers.

---

## 7. Domain pages
Hero keeps its two-column composition (content left, derived-stats card right) and now spans the wider shell. The domain chip row retains its intentional horizontal scroll.

## 8. Course detail
Two-column layout preserved; the right-hand enrolment card became a light sticky card. Curriculum and content columns use the wider shell without stretching prose.

## 9. Learning interface
**Deliberately minimal.** The shell max-width moved from 1280px to 1728px so the player and sidebar use the viewport; `CoursePlayerHeader` uses `.apex-container-wide`. Full-screen loading/error states converted to light. **No third column was added.** YouTube playback, lesson completion, progress, resume state, module navigation and assessments are untouched.

## 10. Admin
Shell already light from the previous upgrade. Added `2xl:p-8` to the main region so wide tables breathe; three large admin pages picked up the shared header via the earlier container sweep. Mobile drawer preserved. **No permission changes.**

## 11. Responsive
Tested at **1920, 1536, 1440, 1280, 1024, 768, 414, 390, 375, 320**. Navigation collapses to the drawer rather than shrinking; no wrapping into multiple rows; no horizontal overflow anywhere.

---

## 12. Dark-theme audit

**Live audit: 17/17 pages free of dark page-level surfaces.**

⚠️ **A detector bug worth recording.** My first audit pass reported every page clean while pages were demonstrably dark. Tailwind v4 emits `oklch()`, and the luminance parser only handled `rgb()` — it returned "unparseable" and skipped every element. Had I trusted it, this report would have claimed a clean result that was false. The detector now parses both, and the numbers above come from the corrected version.

**Dark colours intentionally retained** (per §20 — these are not page themes):

| Surface | Why |
|---|---|
| Modal/drawer backdrops (`bg-slate-900/50–80`, `position: fixed`) | Standard scrim |
| `YouTubeLessonPlayer`, `LessonRenderer` video frame (`bg-black`, `bg-slate-950`) | Video letterboxing |
| Image container backgrounds (Home, Programs, ProgramDetail cards) | Sit behind photos |
| Badges over images (`bg-slate-900/80`) | Legibility on photography |
| `Button` `secondary` variant | A control, not a surface |
| Active filter chip (`ResourcesPage`) | Selected state |
| `AdminMaterialsPage` extracted-content textarea | Code/monospace block |
| `CertificateViewerModal` header bar | Contained dialog chrome — **flagged as a judgement call**, convertible on request |

---

## 13. Files modified (34)

**Central (these produced most of the effect):**
`src/index.css` · `layout/Header.tsx` · `layout/Footer.tsx` · `layout/MegaMenu.tsx` · `layout/StudentLayout.tsx` · `layout/AdminLayout.tsx` · `common/CourseCard.tsx` · `common/Skeleton.tsx` · `common/ProtectedRoutes.tsx`

**Public pages:** `HomePage` · `FreeCoursesPage` · `ProgramsPage` · `ProgramDetailPage` · `CourseDetailPage` · `DomainDetailPage` · `EnterprisePage` · `CareerSupportPage` · `SuccessStoriesPage` · `SuccessStoryDetailPage` · `ResourcesPage` · `ResourceDetailPage` · `InstitutionsPage` · `InstitutionDetailPage` · `SearchPage` · `PublicCertificateVerificationPage`

**Learner / learning:** `LearningInterfacePage` · `MyLearningPage` · `CoursePlayerHeader` · `LessonRenderer` · `FinalAssessmentModal` · `ModuleAssessmentModal`

**Admin:** `AdminCurriculumPage` · `AdminBulkImportPage` · `AdminMaterialsPage` (container/header only)

**Intentionally untouched:** all backend (`src/backend/**`), `supabase/migrations/**`, `supabase/seed/**`, `services/api.ts`, `AuthContext.tsx`, `AppRoutes.tsx`, `YouTubeLessonPlayer.tsx`, `scripts/**`, `package.json`.

---

## 14–16. Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | **0 errors** |
| `npm run build` | **PASS** — 1803 modules; JS 1,744.61 kB (gzip 337 kB), CSS 106.83 kB (gzip 16.9 kB) |
| Browser — width/anchoring | Measured live at 1920/1536/1440/1280/1024 (table in §2, §3) |
| Browser — dark audit | 17/17 pages clean |
| Browser — responsive | 140/140 viewport checks clean |
| Screenshots | Home @1920, catalogue @1920, home @390 — reviewed |

⚠️ **TypeScript confidence is limited. `@types/react` is NOT installed** (confirmed: `node_modules/@types/react` absent). JSX prop types resolve to `any`, so `tsc --noEmit` validates no component props at all. A clean type check here means *modules resolve and non-JSX types agree* — nothing more. The real safety net for this task was the browser measurement and sweep. Recommendation stands: `npm i -D @types/react @types/react-dom`.

**Viewports tested:** 1920 · 1536 · 1440 · 1280 · 1024 · 768 · 414 · 390 · 375 · 320
**Routes tested:** `/` `/free-courses` `/programs` `/programs/genai-leaders` `/enterprise` `/career-support` `/success-stories` `/resources` `/institutions` `/search` `/search?q=data` `/courses/statistics-data-analytics` `/domains/data-scientist` `/verify-certificate` `/login` `/register` `/forgot-password` `/nonexistent`

---

## 17. Change-control summary

| Question | Answer |
|---|---|
| Database changed? | **No** |
| Migrations changed? | **No** |
| Backend/API changed? | **No** |
| Authentication changed? | **No** |
| YouTube data or playback changed? | **No** |
| Course content changed? | **No** |
| Dependencies changed? | **No** — 17 deps / 9 devDeps, unchanged |
| Git initialised or committed? | **No** |
| Previous frontend upgrade undone? | **No** |
| Fabricated data reintroduced? | **No** |

---

## 18. Remaining issues

1. **`@types/react` missing** — the type gate is largely inert (§14).
2. **Header is 216px wider than content at ≥1536px** — a deliberate app-chrome choice (§2). One token flips it if you disagree.
3. **Authenticated screens not browser-verified** — admin and learner pages redirect to `/login` without a session, and creating an account would be an unauthorized database write. Verified by build, type check and code review only. The learner sidebar and admin shell changes are the ones that would benefit most from a signed-in pass.
4. **`CertificateViewerModal` header bar remains dark** — flagged in §12 as a judgement call.
5. **1.74 MB JS bundle** — unchanged by this task; route-level code splitting remains a separate piece of work.
6. **Free-courses hero is left-weighted at 1920px** — the right half is open space since the hero has no companion element. Adding one would mean inventing content, so it was left alone.
