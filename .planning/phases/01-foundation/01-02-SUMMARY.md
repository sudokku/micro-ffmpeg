---
phase: 01-foundation
plan: 02
subsystem: infra
tags: [zustand, zundo, typescript, vitest, happy-dom, store, undo-redo]

# Dependency graph
requires:
  - phase: 01-foundation-01
    provides: Vite scaffold with all deps installed (zustand, zundo, vitest, jsdom)
provides:
  - Zustand store with five slices: tracks, clips, clipSettings, ui, export
  - Zundo temporal middleware with partialize excluding ui and export slices
  - src/store/types.ts — all store type definitions (Clip, Track, ClipSettings, UiState, ExportState, StoreState, TrackedState)
  - src/store/index.ts — useStore with temporal middleware
  - src/hooks/useTemporalStore.ts — reactive hook for undo/redo UI
  - 9-test suite verifying store shape and Zundo partialize behavior
affects: [03-worker, 04-ui, all-subsequent-plans]

# Tech tracking
tech-stack:
  added:
    - happy-dom (replaced jsdom@29 in Vitest due to CJS/ESM conflict with @exodus/bytes)
  patterns:
    - Zundo partialize: destructure ui and export out, spread rest — never omit this
    - useTemporalStore hook wraps useStore.temporal for reactive undo/redo access in components
    - Store reset + temporal clear in beforeEach for isolated unit tests

key-files:
  created:
    - src/store/types.ts
    - src/store/index.ts
    - src/store/store.test.ts
    - src/hooks/useTemporalStore.ts
  modified:
    - vitest.config.ts (environment: jsdom → happy-dom)
    - package.json (added happy-dom devDependency)
    - package-lock.json

key-decisions:
  - "Switched Vitest environment from jsdom to happy-dom: jsdom@29 has a CJS/ESM conflict where html-encoding-sniffer requires an ESM-only @exodus/bytes module; happy-dom has no such conflict"
  - "Partialize uses destructuring pattern const { ui, export: _export, ...tracked } = state; return tracked — this is the locked anti-bug pattern"

patterns-established:
  - "Pattern: Zundo partialize — always destructure ui and export out of state; return only tracks/clips/clipSettings"
  - "Pattern: useTemporalStore — single hook for reactive temporal state access; do not call useStore.temporal directly in components"

requirements-completed: [SC-2, SC-3]

# Metrics
duration: 2min
completed: 2026-03-16
---

# Phase 1 Plan 02: Zustand Store with Zundo Temporal Middleware Summary

**Zustand store with five slices (tracks/clips/clipSettings/ui/export) wired through Zundo temporal middleware; partialize verified by tests to exclude ui and export from undo history**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-16T17:33:16Z
- **Completed:** 2026-03-16T17:35:07Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Defined all store types in src/store/types.ts matching locked CONTEXT.md decisions (Clip with 9 fields, Track, ClipSettings stub, UiState, ExportState, StoreState, TrackedState)
- Implemented Zustand store with Zundo temporal middleware and correct partialize — partialize excludes ui and export slices, preventing the #1 bug from the prior project attempt
- Created useTemporalStore hook and 9-test suite that proves partialize correctness: ui changes survive undo, clip changes revert on undo

## Task Commits

Each task was committed atomically:

1. **Task 1: Create store types and test file (RED phase)** - `ea550e1` (test)
2. **Task 2: Implement Zustand store with Zundo temporal middleware (GREEN phase)** - `6c28ffd` (feat)

## Files Created/Modified

- `src/store/types.ts` — All store type definitions: Clip, Track, ClipSettings, UiState, ExportState, StoreState, TrackedState
- `src/store/index.ts` — Zustand store with temporal() middleware and partialize function
- `src/store/store.test.ts` — 9 tests covering store shape (Tests 1–7) and Zundo partialize (Tests 8–9)
- `src/hooks/useTemporalStore.ts` — Reactive hook wrapping useStore.temporal for undo/redo UI access
- `vitest.config.ts` — environment changed from jsdom to happy-dom
- `package.json` — happy-dom added as devDependency

## Decisions Made

- Switched Vitest test environment from `jsdom` to `happy-dom`: jsdom@29 has a CJS/ESM conflict where `html-encoding-sniffer` (a jsdom transitive dep) uses `require()` to load `@exodus/bytes/encoding-lite.js` which is ESM-only. happy-dom avoids this entirely and is faster.
- Partialize uses the explicit destructuring form `const { ui, export: _export, ...tracked } = state; return tracked` — this is the documented anti-bug pattern from CONTEXT.md.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Switched Vitest environment from jsdom to happy-dom**
- **Found during:** Task 1 (running RED phase tests)
- **Issue:** jsdom@29 fails to load because `html-encoding-sniffer` (a jsdom CJS dependency) tries to `require()` `@exodus/bytes/encoding-lite.js` which is ESM-only. This raised `ERR_REQUIRE_ESM` before any test code ran.
- **Fix:** Installed `happy-dom` devDependency; changed `vitest.config.ts` `environment: 'jsdom'` to `environment: 'happy-dom'`. happy-dom is a modern, ESM-native DOM implementation with no CJS conflicts.
- **Files modified:** `package.json`, `package-lock.json`, `vitest.config.ts`
- **Verification:** Tests ran cleanly after switch; 9/9 passed GREEN after implementation
- **Committed in:** `ea550e1` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking)
**Impact on plan:** jsdom version incompatibility with newer ESM-only transitive deps; happy-dom is the recommended Vitest alternative. No API changes, no scope creep.

## Issues Encountered

- jsdom@29 CJS/ESM conflict blocked test execution before any test code ran — fixed by switching to happy-dom (see Deviations above).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Store is the single source of truth for all application state — Plans 03 and 04 can import `useStore` immediately
- All type definitions are stable and exported from `src/store/types.ts`
- `useTemporalStore` hook is ready for undo/redo keyboard shortcut wiring in Plan 04 (UI shell)
- Vitest environment is confirmed working with happy-dom; future test files (workers, components) will work cleanly

## Self-Check: PASSED

All files confirmed present: src/store/types.ts, src/store/index.ts, src/store/store.test.ts, src/hooks/useTemporalStore.ts
All commits confirmed: ea550e1 (RED), 6c28ffd (GREEN)

---
*Phase: 01-foundation*
*Completed: 2026-03-16*
