---
phase: 02-timeline-core
plan: 01
subsystem: store
tags: [zustand, zundo, typescript, vitest, tdd]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Zustand store with Zundo partialize pattern, base Clip/Track/StoreState types

provides:
  - All 7 clip mutation actions (addClip, moveClip, trimClip, splitClip, deleteClip, selectClip, setActiveTool)
  - Clip type with color and thumbnailUrls fields
  - CLIP_COLORS 8-color rotating palette constant
  - Full TDD test coverage (29 tests) for all actions and undo/redo behavior
affects:
  - 02-timeline-core (all remaining plans depend on store actions)
  - 03-export (deleteClip, splitClip shape used during export rendering)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Module-level colorIndex counter outside store for color rotation that persists across undo/redo
    - All clip mutations use set(state => ...) form for Zundo capture
    - selectClip and setActiveTool mutate ui slice only (excluded from Zundo partialize)
    - TrackedState omits StoreActions via keyof StoreActions to keep partialize clean

key-files:
  created:
    - src/constants/clipColors.ts
  modified:
    - src/store/types.ts
    - src/store/index.ts
    - src/store/store.test.ts

key-decisions:
  - "Module-level colorIndex counter is intentionally outside store — persists across undo/redo cycles; resetColorIndex() exported for test isolation"
  - "TrackedState omits StoreActions keys in addition to ui/export to avoid functions in partialize snapshot"
  - "splitClip edge-guard threshold is 0.01s on each side to prevent degenerate zero-duration clips"

patterns-established:
  - "Clip mutations: all use set(state => ...) so Zundo captures them atomically"
  - "UI-only actions: use get() then set({ui: ...}) pattern — Zundo partialize excludes ui slice"

requirements-completed: [TIME-03, TIME-04, TIME-05, TIME-06, UNDO-01, UNDO-02]

# Metrics
duration: 3min
completed: 2026-03-17
---

# Phase 2 Plan 01: Store Actions Summary

**Zustand store extended with 7 clip actions (add/move/trim/split/delete/select/tool), CLIP_COLORS palette, and Clip type updated with color + thumbnailUrls — TDD coverage 29 tests all green**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-17T00:12:11Z
- **Completed:** 2026-03-17T00:14:18Z
- **Tasks:** 2 (TDD: 1 RED + 1 GREEN)
- **Files modified:** 4

## Accomplishments

- All 7 store actions implemented through Zustand `set()` so Zundo captures clip mutations for undo/redo
- `selectClip` and `setActiveTool` correctly mutate only the `ui` slice, which is excluded from Zundo history
- CLIP_COLORS 8-color palette in `src/constants/clipColors.ts` with rotating index counter
- Clip type updated: `thumbnailUrl: string | null` replaced with `thumbnailUrls: string[]`, `color: string` added
- Full TDD coverage: 29 tests across store shape, Zundo partialize, and all 7 actions

## Task Commits

Each task was committed atomically:

1. **Task 1: Write tests for all store actions and undo/redo (RED)** - `ce70d6e` (test)
2. **Task 2: Implement store actions and update Clip type (GREEN)** - `e25a0d3` (feat)

_Note: TDD tasks have separate test (RED) and implementation (GREEN) commits_

## Files Created/Modified

- `src/constants/clipColors.ts` - 8-color CLIP_COLORS palette constant; `resetColorIndex()` exported for test isolation
- `src/store/types.ts` - Clip type updated (color, thumbnailUrls); StoreActions interface added; StoreState extends StoreActions; TrackedState omits action keys
- `src/store/index.ts` - All 7 actions implemented; module-level colorIndex counter; CLIP_COLORS import
- `src/store/store.test.ts` - 20 new tests added in `describe('Store actions')`; mockClip updated; resetColorIndex() called in beforeEach

## Decisions Made

- Module-level `colorIndex` counter lives outside the store so it is not affected by undo/redo; `resetColorIndex()` is exported exclusively for test isolation in `beforeEach`.
- `TrackedState` omits `keyof StoreActions` in addition to `ui` and `export` — otherwise Zundo would attempt to snapshot function references.
- `splitClip` edge guard uses `0.01s` threshold on each side to prevent degenerate zero-duration clips from being created at exact boundaries.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Color rotation test failed due to shared module-level counter across tests**
- **Found during:** Task 2 (GREEN verification)
- **Issue:** `colorIndex` is module-level and persists across test runs; the "rotating colors" test received CLIP_COLORS[5] instead of CLIP_COLORS[0] because prior tests had advanced the counter.
- **Fix:** Exported `resetColorIndex()` from `src/store/index.ts`; added `resetColorIndex()` call to `beforeEach` in `store.test.ts`.
- **Files modified:** `src/store/index.ts`, `src/store/store.test.ts`
- **Verification:** All 29 tests pass including the rotating colors test.
- **Committed in:** `e25a0d3` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Fix was necessary for test correctness with no scope change. Production behavior unchanged.

## Issues Encountered

None beyond the color counter isolation fix documented above.

## Next Phase Readiness

- All store actions available via `useStore.getState().actionName(...)` — Plans 02-01 through 02-N can wire timeline callbacks immediately
- Undo/redo verified: clip mutations tracked, UI state changes excluded
- `CLIP_COLORS` and `resetColorIndex` exported for use by any component needing consistent clip coloring

---
*Phase: 02-timeline-core*
*Completed: 2026-03-17*
