---
phase: 01-foundation
plan: 03
subsystem: workers
tags: [comlink, web-worker, ffmpeg, typescript, vitest, tdd]

# Dependency graph
requires:
  - phase: 01-foundation plan 01
    provides: Vite project scaffold with COOP/COEP headers, Vitest with jsdom config, all npm dependencies including comlink

provides:
  - Comlink-wrapped ffmpeg Web Worker file exposing typed ping API (src/workers/ffmpeg.worker.ts)
  - Main-thread singleton proxy factory for worker (src/workers/ffmpeg.proxy.ts)
  - FfmpegWorkerApi type for type-safe Comlink.Remote usage
  - Passing ping smoke test verifying API contract

affects:
  - Phase 2 (ffmpeg operations): extend worker with load() and transcode() methods via same Comlink pattern
  - Any component needing ffmpeg access must use getFfmpegProxy() not direct @ffmpeg/ffmpeg import

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Comlink.expose(api) in worker file + Comlink.wrap<T>(worker) in proxy factory"
    - "Type-only import of FfmpegWorkerApi in proxy (import type) — worker types cross the module boundary safely"
    - "Singleton _proxy pattern in proxy factory to avoid spawning multiple workers"
    - "new Worker(new URL('./ffmpeg.worker.ts', import.meta.url), { type: 'module' }) — portable Vite worker import"
    - "// @vitest-environment node comment on worker tests to avoid jsdom ESM conflict"

key-files:
  created:
    - src/workers/ffmpeg.worker.ts
    - src/workers/ffmpeg.proxy.ts
    - src/workers/ffmpeg.worker.test.ts
  modified: []

key-decisions:
  - "Phase 1 worker exposes only ping() — no @ffmpeg/ffmpeg import until Phase 2 to keep worker boundary testable without WASM"
  - "Test uses @vitest-environment node to avoid jsdom/html-encoding-sniffer CJS-ESM conflict in jsdom 29"
  - "Worker test validates API contract directly (not via Comlink transport) — true RPC round-trip requires real browser, verified manually"

patterns-established:
  - "Pattern: Worker boundary — only src/workers/ffmpeg.worker.ts may import @ffmpeg/ffmpeg; all other files use getFfmpegProxy()"
  - "Pattern: Singleton proxy — getFfmpegProxy() lazily creates one worker instance and reuses it"

requirements-completed:
  - SC-4

# Metrics
duration: 3min
completed: 2026-03-16
---

# Phase 1 Plan 03: Comlink Worker and Proxy Factory Summary

**Comlink-wrapped Web Worker exposing a typed ping API, singleton proxy factory for main-thread access, and TDD-verified API contract — ffmpeg.wasm boundary established for Phase 2**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-16T19:33:16Z
- **Completed:** 2026-03-16T19:34:20Z
- **Tasks:** 1 (TDD: RED + GREEN commits)
- **Files modified:** 3

## Accomplishments

- Worker file (`ffmpeg.worker.ts`) exposes typed `ping(): Promise<'pong'>` API via `Comlink.expose`
- Proxy factory (`ffmpeg.proxy.ts`) provides `getFfmpegProxy()` singleton — main thread never imports `@ffmpeg/ffmpeg` directly
- `FfmpegWorkerApi` type exported from worker for full type-safety on `Comlink.Remote<FfmpegWorkerApi>`
- Two passing tests confirm API contract (ping returns 'pong') and proxy module export shape

## Task Commits

Each task was committed atomically using TDD flow:

1. **RED — Failing tests** - `adb3624` (test)
2. **GREEN — Worker and proxy implementation** - `ccba611` (feat)

## Files Created/Modified

- `src/workers/ffmpeg.worker.ts` - Worker file; exposes `ping()` API via `Comlink.expose`, exports `FfmpegWorkerApi` type
- `src/workers/ffmpeg.proxy.ts` - Main-thread proxy factory; singleton `_proxy` created with `Comlink.wrap<FfmpegWorkerApi>`
- `src/workers/ffmpeg.worker.test.ts` - TDD tests for API contract and proxy module shape

## Decisions Made

- Phase 1 worker intentionally omits `@ffmpeg/ffmpeg` import — only the ping smoke test is needed to prove the Comlink RPC channel. FFmpeg import and `load()` are Phase 2 work.
- Test environment switched to `node` via `// @vitest-environment node` comment because `jsdom` 29.0.0 triggers a CJS-ESM conflict in its dependency `html-encoding-sniffer` (which requires `@exodus/bytes`, a pure ESM module). The worker tests need no DOM APIs so `node` environment is correct.
- Worker test validates the API object contract directly (not via actual Comlink transport). True Worker + MessageChannel round-trip requires a real browser and will be validated manually via `npm run dev` or in Phase 2 when the worker is first used for real work.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added `// @vitest-environment node` to test file**
- **Found during:** Task 1 (TDD RED phase)
- **Issue:** jsdom 29.0.0 has a transitive dependency (`html-encoding-sniffer`) that uses CJS `require()` to load `@exodus/bytes`, which is a pure ESM module. This caused an `ERR_REQUIRE_ESM` error that prevented any tests from running.
- **Fix:** Added `// @vitest-environment node` as the first line of the test file. The worker tests have no DOM dependency, so the node environment is both correct and avoids the conflict.
- **Files modified:** `src/workers/ffmpeg.worker.test.ts`
- **Verification:** `npx vitest run src/workers/ffmpeg.worker.test.ts` exits 0 with 2 tests passing
- **Committed in:** `adb3624` (RED phase test commit)

---

**Total deviations:** 1 auto-fixed (1 blocking environment issue)
**Impact on plan:** Necessary fix to make tests runnable. No scope change; test semantics unchanged.

## Issues Encountered

- jsdom 29 `ERR_REQUIRE_ESM` from `html-encoding-sniffer` → resolved by using node environment for worker tests (see Deviations above)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Worker boundary is established and tested; Phase 2 can extend `api` in `ffmpeg.worker.ts` with `load()` and transcode methods
- `getFfmpegProxy()` is ready for use in React components and hooks
- COOP/COEP headers already in place in vite.config.ts — SharedArrayBuffer will be available for multi-thread ffmpeg.wasm
- Verify nested worker behavior (ffmpeg.wasm spawns its own internal worker from inside a Comlink worker) during Phase 2 `load()` implementation; fallback plan noted in RESEARCH.md Open Question 1

---
*Phase: 01-foundation*
*Completed: 2026-03-16*

## Self-Check: PASSED

- src/workers/ffmpeg.worker.ts: FOUND
- src/workers/ffmpeg.proxy.ts: FOUND
- src/workers/ffmpeg.worker.test.ts: FOUND
- .planning/phases/01-foundation/01-03-SUMMARY.md: FOUND
- Commit adb3624 (RED test): FOUND
- Commit ccba611 (GREEN implementation): FOUND
