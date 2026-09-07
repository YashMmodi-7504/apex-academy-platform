# APEX ACADEMY LMS — PHASE 0A: SECRET SCRUB & GIT BASELINE PREPARATION

**Date:** 2026-09-07
**Scope:** remove the committed service-role credential from repository files and make privileged configuration fail closed.
**Outcome:** **Repository is now SAFE FOR INITIAL GIT BASELINE.** Git was not initialized.

No credential value appears anywhere in this document.

---

## 1. Files Changed

| File | Change | Status |
|---|---|---|
| `.env.example` | All real secret values replaced with placeholders; variable names and documentation preserved and expanded | ✅ Complete |
| `src/backend/database/supabaseAdmin.ts` | Hardcoded URL and service-role fallbacks removed; fail-closed validation added before `createClient()` | ✅ Complete |
| `PHASE_0A_SECRET_SCRUB_REPORT.md` | This report | Created |

**Not modified:** `.gitignore`, any migration, controller, service, frontend file, the YouTube importer, `package.json`, or any database record.

### Path correction

The task specified `src/backend/config/supabaseAdmin.ts`. **That file does not exist.** `src/backend/config/` contains only `env.ts`. The service-role client lives at **`src/backend/database/supabaseAdmin.ts`**, which is the file that was edited. Confirmed by direct listing before any change.

---

## 2. Credential Locations — BEFORE

| Location | Occurrences | Reachable by browser |
|---|---|---|
| `src/backend/database/supabaseAdmin.ts` (line 7, `DEFAULT_SERVICE_ROLE_KEY`) | 1 | No |
| `.env.example` (line 11, tracked by an explicit `.gitignore` exception) | 1 | No |
| `dist/server.cjs` | 1 | No |
| `dist/server.cjs.map` | 1 | No |
| `dist/assets/index-*.js` (browser bundle) | 0 | — |

---

## 3. Credential Locations — AFTER

| Location | Occurrences | Note |
|---|---|---|
| `src/` (entire tree, recursive) | **0** | ✅ |
| `src/backend/database/supabaseAdmin.ts` | **0** | ✅ |
| `.env.example` | **0** | ✅ |
| Repository root `*.ts` `*.cjs` `*.md` `*.json` | **0** | ✅ Includes every audit report |
| `scripts/` and `supabase/` | **0** | ✅ |
| `dist/assets/index-*.js` (browser bundle) | **0** | ✅ |
| **`dist/server.cjs`** | **1** | ⚠️ Stale build artifact — see §6 |
| **`dist/server.cjs.map`** | **1** | ⚠️ Stale build artifact — see §6 |

**The credential is eliminated from every file that Git would track.** Two occurrences remain in generated output that `.gitignore` excludes. This is stated explicitly rather than claiming the repository is clean.

---

## 4. `.env.example` Status

**SCRUBBED.** Every real value replaced with a self-describing placeholder:

- `SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here`
- `SUPABASE_URL` / `VITE_SUPABASE_URL` → `https://your-project-ref.supabase.co` (the real project ref is no longer disclosed)
- `VITE_SUPABASE_ANON_KEY=your_anon_publishable_key_here`
- `JWT_SECRET=your_jwt_secret_here` (previously a real-looking literal)
- `GEMINI_API_KEY=your_gemini_api_key_here`

All variable names retained, so the file still functions as setup documentation. Added: a header warning that the file is version-controlled, a note that the service-role key bypasses all RLS and must never carry a `VITE_` prefix, and a note that `JWT_SECRET`/`JWT_EXPIRES_IN` are currently unused because authentication is handled entirely by Supabase GoTrue.

---

## 5. `supabaseAdmin` Fallback Status

**REMOVED.** Both `DEFAULT_SUPABASE_URL` and `DEFAULT_SERVICE_ROLE_KEY` are deleted. Configuration is now environment-only.

### Diff summary

```
- const DEFAULT_SUPABASE_URL = '<project url>';
- const DEFAULT_SERVICE_ROLE_KEY = '<live service-role JWT>';
...
- const supabaseUrl = isValidHttpUrl(rawUrl) ? rawUrl!.trim() : DEFAULT_SUPABASE_URL;
- const supabaseServiceKey = rawKey && ... ? rawKey.trim() : DEFAULT_SERVICE_ROLE_KEY;
+ if (!isValidHttpUrl(rawUrl))  throw new Error('...SUPABASE_URL (or VITE_SUPABASE_URL) is missing or is not a valid http(s) URL...');
+ if (!rawKey || rawKey.trim().length === 0 || rawKey.trim() === 'YOUR_SUPABASE_SERVICE_ROLE_KEY')
+                               throw new Error('...SUPABASE_SERVICE_ROLE_KEY is missing, empty, or still set to the placeholder value...');
+ const supabaseUrl = rawUrl!.trim();
+ const supabaseServiceKey = rawKey.trim();
```

### Preserved unchanged

`createClient` import · `dotenv` import · `dotenv.config()` · `isValidHttpUrl()` (still used, now by the validation) · `createClient()` call and its `auth: { autoRefreshToken: false, persistSession: false }` options · **`checkSupabaseConnectivity()` — verified byte-identical by diff**. No new dependency was introduced.

`checkSupabaseConnectivity()` remains defective under `APX-26` (it calls `auth.getSession()`, which makes no network request, so it always reports connected). That is a **separate finding, deliberately out of scope**, and was not touched.

---

## 6. `dist/` Status

**`dist/` is generated output and is already excluded by `.gitignore` line 3.** It therefore cannot enter a Git baseline, which is the preferred approach named in the task and is already the project's convention.

Evidence that it is generated, not source:
- `package.json` → `"build": "vite build && esbuild server.ts ... --outfile=dist/server.cjs"`
- `"clean": "rm -rf dist server.cjs"`
- `.gitignore` line 3 → `dist/`

**The two stale occurrences were not removed.** Rationale: `dist/` is gitignored, so it presents no version-control exposure; deleting or regenerating it is unnecessary for the stated objective and would destroy the artifact that the currently running dev server was built from. Regeneration was not performed because it is not required to make the repository safe to commit.

**Residual local-disk exposure is real but bounded.** The credential must be rotated regardless (§11), after which the stale artifacts become inert. If you prefer the local copies gone before rotation, either is safe:

```bash
npm run clean          # removes dist/ entirely
npm run build          # regenerates dist/ from the now-scrubbed source
```

---

## 7. `.gitignore` Recommendation

**No change made.** The existing file already implements the intended policy correctly:

| Line | Rule | Effect |
|---|---|---|
| 1 | `node_modules/` | ignored |
| 2 | `build/` | ignored |
| 3 | `dist/` | ignored — keeps the two stale credential copies out of Git |
| 4 | `coverage/` | ignored |
| 5 | `.DS_Store` | ignored |
| 6 | `*.log` | ignored |
| 7 | `.env*` | ignores `.env`, `.env.local`, `.env.production`, every environment file |
| 8 | `!.env.example` | re-includes the example — **now safe, because it has been scrubbed** |

Line 7's `.env*` glob is broader than `.env` alone and already covers the `.env.*` and `*.env` patterns requested. Line 8 was the exception that made the credential committable; it is now safe and is worth keeping, because the file is genuine setup documentation.

**One suggested addition** (not applied, as it is outside the approved scope): `db_out.txt`, which `script.cjs` writes into the repository root.

---

## 8. Sensitive-Report Git Recommendation

**Recommendation: TRACK the audit documents. Do not add them to `.gitignore`.** Not applied — `.gitignore` was left unmodified.

| Consideration | Assessment |
|---|---|
| Do they contain secrets? | **No.** All five were scanned: 0 occurrences of the service-role credential, 0 JWTs. Credential values were deliberately never printed during any phase |
| Do they contain exploitation detail? | **Yes** — `AUDIT_REPORT.md` §14.3 contains a step-by-step certificate-forgery chain, and the gate review documents live database state |
| Value of tracking | High. They are the engineering record driving remediation. Untracked, their history is lost and reviewers cannot see what changed between phases |

**Decision rests on repository visibility, which I cannot determine from the codebase:**

- **Private repository → track them.** This is the recommended default. The findings are working documents, and access control is the correct mechanism.
- **Public repository, or one that may ever become public → exclude them**, or move them to a private location. Publishing a working exploitation chain against a live system with a compromised credential and unremediated RLS would be actively harmful.

Flagged for your decision rather than resolved unilaterally.

---

## 9. Secret Scan Results

Performed with exact in-memory comparison against the value recovered from a pre-edit backup, plus structural pattern matching. **No secret was printed at any point.**

| File | Credential type | Occurrences | Severity |
|---|---|---|---|
| `dist/server.cjs` | Supabase **service_role** JWT | 1 | **HIGH** — stale generated artifact, gitignored, local disk only |
| `dist/server.cjs.map` | Supabase **service_role** JWT | 1 | **HIGH** — same |
| `src/lib/supabaseClient.ts` | Supabase **anon / publishable** key | 1 | **INFORMATIONAL** — anon keys are designed to be public and ship in the browser bundle. Pre-existing, unchanged, correct by design |

Structural sweeps across `src/`:

| Pattern | Result |
|---|---|
| `eyJ`-prefixed JWTs | **0 files** |
| `sb_publishable` / `sb_secret` keys | 1 file — `src/lib/supabaseClient.ts` (anon key, expected) |
| Service-role fallback pattern | **0 occurrences** |
| Bearer tokens / API tokens | **0** beyond the above |

`GEMINI_API_KEY` is environment-only and appears in no source file.

---

## 10. Configuration Fail-Closed Behaviour

Validation occurs at **module load**, inside `src/backend/database/supabaseAdmin.ts`, **before `createClient()` is reached**. Because `server.ts` imports the route tree, which transitively imports this module, a misconfigured process throws during startup and never binds a port. No request can be served by a degraded privileged client.

### Verified behaviour — all four branches executed

| Scenario | Expected | Observed |
|---|---|---|
| URL missing/invalid | throw naming `SUPABASE_URL (or VITE_SUPABASE_URL)` | ✅ **PASS** — threw |
| URL valid, key missing/empty | throw naming `SUPABASE_SERVICE_ROLE_KEY` | ✅ **PASS** — threw |
| URL valid, key = `YOUR_SUPABASE_SERVICE_ROLE_KEY` | throw naming `SUPABASE_SERVICE_ROLE_KEY` | ✅ **PASS** — threw |
| Both present (dummy values) | client constructs | ✅ **PASS** — `supabaseAdmin` created |

Tests ran as isolated module imports with explicit environment overrides. **No production credential was used, no server was started against production, and no network call was made** — branch 4 used a dummy key and only asserts object construction. `dotenv` reported `injected env (0)` in every run, confirming no `.env` was read.

### Error-message safety

Both messages name the environment variable and the required format only. No value, prefix, suffix, length or hash of any secret is included. Neither branch logs.

### Acceptance checklist

| Criterion | Result |
|---|---|
| No `DEFAULT_SERVICE_ROLE_KEY` remains | ✅ |
| No hardcoded service-role JWT remains in source | ✅ |
| No `DEFAULT_SUPABASE_URL` remains | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` is environment-only | ✅ |
| Missing service-role configuration throws | ✅ verified |
| Invalid/missing URL configuration throws | ✅ verified |
| Errors contain variable names only | ✅ |
| `createClient()` unreachable when configuration invalid | ✅ throws before line 41 |
| `checkSupabaseConnectivity()` unchanged | ✅ byte-identical diff |
| No unrelated code changed | ✅ diff limited to lines 6–7 and 24–25 of the original |
| TypeScript compilation | ✅ `npx tsc --noEmit` → **0 errors** |

---

## 11. Remaining Operational Action

| # | Action | Owner | Why |
|---|---|---|---|
| 1 | **Rotate the Supabase service-role key** | Account owner | Removing the hardcoded copy does not invalidate the exposed credential. It exists in this working tree's history-less state, in `dist/server.cjs`, in the sourcemap, and in any prior copy of the project. **Until rotated it must be treated as compromised.** Not performed — rotation is explicitly an account-owner action |
| 2 | **Create a real `.env`** with `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Operator | **The application will no longer start without it.** The dev server currently running on port 3100 was launched from the removed fallback; it will not restart until `.env` exists |
| 3 | Decide the audit-report tracking policy (§8) | Owner | Depends on repository visibility |
| 4 | Optionally `npm run clean` or `npm run build` | Operator | Clears the two stale `dist/` credential copies from local disk |

**Recommended order:** create `.env` → confirm the server starts → rotate the key → update `.env` → confirm again → clean/rebuild `dist/`.

---

## 12. Git Baseline Readiness

### **SAFE FOR INITIAL GIT BASELINE** ✅

| Check | Status |
|---|---|
| `.env` / `.env.*` / production env files ignored | ✅ `.gitignore` line 7 (`.env*`) |
| `.env.example` tracked but contains only placeholders | ✅ 0 credential occurrences |
| No credential in any trackable file | ✅ 0 across `src/`, root, `scripts/`, `supabase/`, reports |
| `dist/` excluded from Git | ✅ `.gitignore` line 3 — stale credential copies cannot be committed |
| Generated artifacts not treated as source | ✅ `dist/` gitignored; `package.json` defines `build` and `clean` |
| Audit reports contain no secrets | ✅ verified — visibility decision pending (§8) |
| Source compiles | ✅ 0 TypeScript errors |

**Git was NOT initialized**, as instructed. The blocker identified in the Phase 0/1/9 report — that committing would write a live credential into Git history permanently — **is now resolved.**

---

*Phase 0A secret scrub, 7 September 2026. Two files changed. No migration applied, no database write performed, no YouTube import executed, no credential rotated, no Git repository initialized. No secret value appears in this document or in any command output produced during this phase.*
