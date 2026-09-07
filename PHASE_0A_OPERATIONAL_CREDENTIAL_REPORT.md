# APEX ACADEMY LMS — PHASE 0A: OPERATIONAL CREDENTIAL STEP

**Date:** 2026-09-07
**Outcome:** Local configuration **COMPLETE and VERIFIED**. Credential rotation **BLOCKED** — it cannot be automated on this machine and requires one manual dashboard action.

No credential value — old or new — appears in this document, in any command output produced during this phase, or in any source file.

---

## 1. Environment Status

| Check | Result |
|---|---|
| `.env` existed before this phase | **No** |
| `.env` created | **Yes** — mode `0600`, gitignored by `.gitignore` line 7 (`.env*`) |
| Variables loaded at startup | **9** (previously `0`) |

### How each value was obtained

| Variable | Source | Sensitivity |
|---|---|---|
| `SUPABASE_URL`, `VITE_SUPABASE_URL` | Recovered from `src/lib/supabaseClient.ts` | Non-secret — a project URL |
| `VITE_SUPABASE_ANON_KEY` | Recovered from `src/lib/supabaseClient.ts` | Public by design — anon/publishable keys ship in the browser bundle and are protected by RLS, not by secrecy |
| `SUPABASE_SERVICE_ROLE_KEY` | Recovered from the local build artifact | **⚠️ This is the previously exposed credential** — see §5 |
| `GEMINI_API_KEY` | Left empty | Optional; only AI quiz generation uses it |
| `PORT`, `NODE_ENV`, `FRONTEND_URL`, `APP_URL` | Set to local development defaults | Non-secret |

Values were copied programmatically in memory and written directly to `.env`. None was echoed to a terminal.

### ⚠️ Important: `.env` currently holds the compromised key

The only service-role credential that exists on this machine is the one that was exposed. It was placed in `.env` **solely so the application could start and the fail-closed change could be verified** — which is step 2 of the agreed operational sequence, before rotation at step 3.

This introduces **no new exposure**: the value already existed on this disk, `.env` is gitignored, and the copies in `dist/` have since been removed (§8). But it does mean **`APX-01` is not yet closed.** It closes only when §5 is completed and the value in `.env` is replaced.

---

## 2. Supabase CLI Status

**NOT INSTALLED.**

| Check | Result |
|---|---|
| `supabase` on `PATH` | Not found |
| `node_modules/.bin/supabase` | Absent |
| Declared in `package.json` | No — the only match is `@supabase/supabase-js`, the client **library**, not the CLI |
| `npx supabase` | Would need to download `supabase@2.116.0`; **not installed**, per the no-new-dependencies constraint |

## 3. Authentication Status

**NOT AUTHENTICATED — not applicable.**

No Supabase CLI configuration or credential directory exists on this machine (`~/.supabase`, `%APPDATA%/supabase`, `%USERPROFILE%/.supabase` all absent). With no CLI installed there is no authenticated session to inspect.

## 4. Linked Project Status

**NOT LINKED.**

No `supabase/config.toml` and no `supabase/.temp` directory. The `supabase/` folder contains only `migrations/` and `seed/` — SQL files authored by hand. This project has never been linked to a Supabase project through the CLI.

---

## 5. Rotation Status

### **BLOCKED — automatic rotation is not possible.**

Two independent reasons, either of which alone is sufficient:

1. **No tooling.** The Supabase CLI is not installed, not authenticated, and this project is not linked. Installing it would add a dependency, which is outside the approved scope.

2. **Even a fully installed, authenticated, linked CLI could not do this.** The Supabase CLI provides no command to rotate a project's `service_role` key. The legacy `service_role` and `anon` keys are JWTs signed with the project's **JWT secret**; rotating them means rotating that secret, which invalidates every existing key at once. That operation is exposed only through the Supabase dashboard, deliberately — it is destructive to all existing integrations and is gated behind interactive confirmation.

This is a genuine platform constraint, not a missing step in this project's setup.

### The ONE manual action required

> **In the Supabase dashboard, open your project → **Settings** → **API** → find the **JWT Settings** section → click **Generate new JWT secret** and confirm.**

That single action invalidates the exposed `service_role` key and issues a replacement. The page will then display a new `service_role` key.

**Do not paste it into this chat.** When you have done it, just say *"rotation complete"* and I will read the new value from the dashboard-provided location you point me to, or you can paste it directly into `.env` yourself — the line to replace is `SUPABASE_SERVICE_ROLE_KEY=`.

Two consequences to expect, so nothing surprises you:

- The **anon key also changes.** `VITE_SUPABASE_ANON_KEY` in `.env` and the fallback in `src/lib/supabaseClient.ts` will both need updating, or the frontend will stop authenticating.
- Any other system using this project's keys will break until updated. On the evidence of this repository, there is none.

---

## 6. Startup Status

### **SUCCESS — verified on a fresh process.**

The previously running server (PID 40068 and a second listener, 37348) was started **before** the fail-closed change and still held the old fallback in memory. Both were terminated and port 3100 confirmed free before restarting, so this is a genuine cold start against the new code and the new `.env`.

```
> tsx server.ts
◇ injected env (9) from .env        <-- previously "injected env (0)"
⚡ Vite dev middleware mounted (HMR: enabled)
🚀 Apex Academy LMS server running on http://0.0.0.0:3100
```

**The application is provably using environment configuration, not a fallback** — the fallback constants no longer exist in the source, so a successful start is only possible from `.env`.

## 7. Health Status

### **SUCCESS.**

| Variable | Before this phase | After |
|---|---|---|
| `SUPABASE_URL` | `MISSING` | **`CONFIGURED`** |
| `SUPABASE_SERVICE_ROLE_KEY` | `MISSING` | **`CONFIGURED`** |
| `VITE_SUPABASE_URL` | `MISSING` | **`CONFIGURED`** |
| `VITE_SUPABASE_ANON_KEY` | `MISSING` | **`CONFIGURED`** |

`GET /api/health` → `200`, `success: true`. `GET /api/courses` → `success`, `count=11`, confirming the privileged client is functional against the real project.

**Caveat, carried forward:** `health.database.supabase.status` reports `connected`, but that signal is unreliable under `APX-26` — `checkSupabaseConnectivity()` calls `auth.getSession()`, which makes no network request and therefore always reports success. The meaningful evidence here is the `envCheck` transition and the successful `/api/courses` query, not the `connected` flag.

---

## 8. Stale `dist/` Status

### **REMOVED.**

`npm run clean` (the project's own script: `rm -rf dist server.cjs`) was run. This eliminated the two remaining copies of the exposed credential in `dist/server.cjs` and `dist/server.cjs.map`.

Safe because `dist/` is generated output, gitignored, and regenerable with `npm run build`. The dev server is unaffected — it serves through Vite middleware, not `dist/`, and remained healthy (`/api/health` → `200`) after the clean. A production build will need `npm run build`, which will now produce artifacts containing **no** service-role credential, since it is no longer in the source.

---

## 9. Secret Scan Counts

Exact in-memory comparison against the value recovered from a pre-edit backup. Nothing printed.

| Location | Old credential occurrences |
|---|---|
| `src/` (recursive) | **0** |
| `.env.example` | **0** |
| Repository root `*.ts` `*.cjs` `*.md` `*.json` | **0** |
| `scripts/` and `supabase/` | **0** |
| `dist/` | **0** — directory removed |
| Browser bundle | **0** — no bundle exists |
| **Entire tree excluding `node_modules` and `.env`** | **0** |
| `.env` (gitignored runtime config) | **1** — expected; this is the pending-rotation value |

**New credential exposed outside `.env`/runtime: NO** — no new credential exists yet.

---

## 10. Git Readiness

### **SAFE FOR INITIAL GIT BASELINE** ✅

| Check | Status |
|---|---|
| No credential in any trackable file | ✅ 0 across the whole tree |
| `.env` ignored | ✅ `.gitignore` line 7 (`.env*`) |
| `.env.example` tracked, placeholders only | ✅ 0 occurrences |
| `dist/` ignored, and now absent entirely | ✅ |
| Source compiles | ✅ `tsc --noEmit` → 0 errors (previous phase, unchanged since) |

**Git was NOT initialized and nothing was committed**, as instructed.

Note: a baseline taken now is safe with respect to secrets, but the exposed key remains **live until §5 is completed**. Committing does not increase risk; it simply does not reduce it either.

---

## 11. Remaining Operational Action

| # | Action | Owner | Status |
|---|---|---|---|
| 1 | Create local `.env` | Automated | ✅ Done |
| 2 | Verify startup under fail-closed config | Automated | ✅ Done |
| 3 | **Rotate the service-role credential** | **You — dashboard only** | ⏳ **BLOCKED** (§5) |
| 4 | Replace `SUPABASE_SERVICE_ROLE_KEY` and `VITE_SUPABASE_ANON_KEY` in `.env` | You, or me once available | ⏳ Waiting on 3 |
| 5 | Update the anon-key fallback in `src/lib/supabaseClient.ts` | Waiting on 3 | ⏳ Not started — a source change requiring separate approval |
| 6 | Clean stale `dist/` | Automated | ✅ Done |

---

*Phase 0A operational credential step, 7 September 2026. One file created (`.env`, gitignored) and one directory removed (`dist/`, generated). No source file modified, no migration applied, no database write performed, no YouTube import executed, no Git repository initialized, nothing committed. No credential value appears in this document.*
