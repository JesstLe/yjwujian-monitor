# Windows Packaging Route (macOS Development, Windows Build)

## 1. Current Baseline and Constraints

Based on current repository state:

- `electron@40.8.0` and `electron-updater@6.8.3` are installed (`package.json`).
- `electron-builder` is not installed yet.
- `better-sqlite3` is in use and is a native module (`src/backend/db/index.ts`).
- `electron/main.ts` starts backend in production mode and injects `APP_DATA_DIR`.
- No explicit Windows packaging config file currently exists.

Hard constraints (must respect):

1. macOS-compiled native binaries cannot be used as Windows release binaries.
2. Windows installer output must be built on Windows runner/machine (or CI Windows runner).
3. `better-sqlite3` must be rebuilt against Electron target ABI before packaging.
4. Packaging must ensure native `.node` file is loadable (consider `asarUnpack`).

---

## 2. Responsibility Split: macOS vs Windows/CI

### 2.1 macOS can do

- Daily feature development and debugging (`pnpm dev`).
- Unit/integration/e2e checks in development context.
- Frontend build sanity checks.
- Electron process logic development (without claiming final Windows binary validity).
- Commit and push code for CI-triggered Windows build.

### 2.2 Windows/CI must do

- Fresh dependency install for Windows environment.
- Electron-native rebuild for `better-sqlite3` against Electron `40.8.0`.
- Windows installer creation (`.exe`, NSIS).
- First-launch native module validation on real Windows runtime.
- Windows SQLite read/write persistence verification in `%APPDATA%` path.

---

## 3. Stage-1 Scope (what is in / out)

### In scope (Phase 1)

- Stable Windows package build pipeline.
- Native module (`better-sqlite3`) compatibility validation.
- First-launch and DB persistence acceptance checks.

### Out of scope (Phase 2+)

- Code signing certificate integration.
- Production auto-update publishing pipeline.
- Forced rollout/channel strategy.

Notes:

- `electron-updater` exists in codebase, but signing + release feed should be treated as follow-up.
- Phase 1 target is "can build and run reliably on Windows", not "official signed auto-update release".

---

## 4. Windows Build Flow (Executable Command Sequence)

This is the recommended release build path. Run on **Windows 11** or **GitHub Actions `windows-latest`**.

### 4.1 One-time preparation (repo)

Add/maintain these capabilities (if not yet present):

- Install dev dependency: `electron-builder`.
- Install rebuild tool: `@electron/rebuild`.
- Ensure packaging config includes native module unpack rule for `better-sqlite3`.

Suggested config intent (implementation can be in `package.json` build field or `electron-builder.yml`):

- target: `nsis`
- `asar: true`
- `asarUnpack` includes `node_modules/better-sqlite3/**/*`
- include runtime outputs (`dist`, `dist-electron`) and required metadata

### 4.2 Per-build commands (Windows/CI)

```powershell
# 0) clean install
pnpm install --frozen-lockfile

# 1) ensure packager and rebuild tool are available
pnpm add -D electron-builder @electron/rebuild

# 2) compile backend/shared runtime code (if packaging consumes compiled output)
pnpm exec tsc -p tsconfig.build.json

# 3) compile electron main process bundle
pnpm exec tsc -p electron/tsconfig.json

# 4) build frontend assets
pnpm build:frontend

# 5) rebuild native addon for Electron ABI (critical)
pnpm exec electron-rebuild -f -w better-sqlite3 --version 40.8.0

# 6) produce Windows installer + unpacked app
pnpm exec electron-builder --win nsis --x64
```

Expected outputs:

- `dist/*.exe` (NSIS installer)
- `dist/win-unpacked/*` (portable unpacked app for debugging)

### 4.3 CI recommendation

Use CI as source of truth for release artifact generation:

1. macOS developers push tags/commits.
2. CI Windows job runs full sequence above.
3. CI uploads `.exe` and `win-unpacked` artifacts.
4. Optional: a separate manual approval gate before publishing.

Reason:

- Removes machine drift and "works on my PC" variance.
- Guarantees native module build really happened on Windows target.

---

## 5. better-sqlite3 Risk Model and Mandatory Gates

From current desktop guide risk sections (`8.6.1`, `12`):

### Risk signals

- `Cannot find module 'better-sqlite3'`
- `.node` load failure
- `NODE_MODULE_VERSION` mismatch
- dev mode works, packaged app fails DB init

### Mandatory validation gates (release-blocking)

1. Windows build log contains successful `electron-rebuild` execution.
2. Packaged app can load `better-sqlite3` on first launch.
3. SQLite file is created in user data directory, not install directory.
4. Basic write + restart + readback succeeds.
5. No platform-specific native module crash during startup.

---

## 6. Windows Acceptance Checklist (Runbook)

Run this checklist on a clean Windows environment using generated artifact.

### A. Install and first launch

- [ ] Install generated `.exe` from `dist/`.
- [ ] Launch app; main window opens without white screen.
- [ ] App startup has no native module pop-up/crash.

### B. Native module verification (`better-sqlite3`)

- [ ] Launch from `win-unpacked` once for easier diagnostics.
- [ ] Confirm no `NODE_MODULE_VERSION` error in runtime logs.
- [ ] Confirm no `Cannot find module 'better-sqlite3'` error.
- [ ] Confirm `.node` exists in unpacked location (`app.asar.unpacked` path for native module).

Example quick check:

```powershell
Get-ChildItem -Recurse .\dist\win-unpacked\resources\app.asar.unpacked\node_modules\better-sqlite3\build\Release\*.node
```

### C. Backend and API startup validation

- [ ] After app launch, health endpoint returns success:

```powershell
Invoke-WebRequest http://127.0.0.1:3000/api/health
```

- [ ] Core pages load data (Dashboard/Search/Watchlist basic path).

### D. SQLite read/write persistence validation

- [ ] Verify DB path exists under `%APPDATA%\yjwujian-monitor\monitor.db`.
- [ ] In app, add one watchlist item (or change a setting causing DB write).
- [ ] Close app and relaunch.
- [ ] Confirm previous data persists.
- [ ] Confirm WAL behavior is healthy (no startup corruption loop, WAL side files are handled).

### E. Regression smoke (minimum)

- [ ] Search flow works.
- [ ] Watchlist add/edit works.
- [ ] Settings save works.
- [ ] App can restart twice consecutively without DB init failure.

Release decision:

- Any native module loading failure => reject artifact.
- Any DB write/read persistence failure => reject artifact.

---

## 7. Platform Limits and Risk Notes

1. **macOS cannot be trusted as final source of Windows native binary correctness** for `better-sqlite3`.
2. **Windows-target artifact validity must be proven on Windows runtime**, not only by CI green status.
3. **CI can fully replace local Windows machine for build**, but at least one Windows runtime acceptance pass remains mandatory.
4. **Signing and auto-update are phase-2 concerns**; do not block phase-1 packaging acceptance on them.

---

## 8. Practical Go/No-Go Criteria for Phase 1

Go only when all are true:

1. Windows CI build consistently emits `.exe` and `win-unpacked`.
2. `better-sqlite3` native rebuild step is present and green.
3. Windows first-launch + DB read/write checklist is fully passed.
4. No `better-sqlite3`/ABI/native-load errors in logs.

Otherwise: no release.
