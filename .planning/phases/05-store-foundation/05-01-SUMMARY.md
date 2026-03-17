---
phase: 05-store-foundation
plan: 01
subsystem: store
tags: [zustand, zundo, typescript, vitest]

requires:
  - phase: 04-export
    provides: Zundo partialize pattern excluding ui+export; ClipSettings schema baseline

provides:
  - Extended UiState with playheadTime, isPlaying, pixelsPerSecond, selectedClipIds
  - Extended ClipSettings with speed, rotation, volume, hue, flipH, flipV
  - Extended Clip with waveformPeaks
  - Store initial defaults for all new fields
  - Updated test coverage for all new fields and Zundo exclusion

affects: [06-filter-graph, 07-waveform, 08-timeline-zoom, 09-multi-selection, 10-preview-panel, 11-clip-settings-ui]

tech-stack:
  added: []
  patterns:
    - "UiState fields auto-excluded from Zundo history because partialize excludes the entire ui object — no per-field handling needed"
    - "ClipSettings fallback uses full default object literal with all required fields so partial updateClipSettings calls always produce a valid record"

key-files:
  created: []
  modified:
    - src/store/types.ts
    - src/store/index.ts
    - src/store/store.test.ts
    - src/utils/buildFilterGraph.test.ts

key-decisions:
  - "selectedClipIds is string[] in UiState (not top-level) to keep it out of Zundo history automatically"
  - "updateClipSettings fallback object now includes all 13 ClipSettings fields so any first-time partial patch produces a complete valid record"
  - "waveformPeaks: null on addClip — waveform extraction happens in Phase 7, not on import in this phase"

patterns-established:
  - "Extend both interface and initial state together — types.ts and index.ts are always in sync"
  - "All ClipSettings literals (test and store) must include new fields to satisfy TypeScript strict mode"

requirements-completed: [PREV-01, PREV-02, PREV-03, PREV-04, ZOOM-01, ZOOM-02, ZOOM-03, SEL-01, SEL-02, SEL-03, SEL-04, CLIP-01, CLIP-02, CLIP-03, CLIP-04, CLIP-05]

duration: 10min
completed: 2026-03-17
---

# Phase 5 Plan 01: Store Foundation Summary

**Extended Zustand store schema with 11 new typed fields across UiState, ClipSettings, and Clip — all 103 tests pass with zero regressions**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-17T22:10:00Z
- **Completed:** 2026-03-17T22:20:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added `playheadTime`, `isPlaying`, `pixelsPerSecond`, `selectedClipIds` to `UiState` with correct defaults (0, false, 100, [])
- Added `speed`, `rotation`, `volume`, `hue`, `flipH`, `flipV` to `ClipSettings` with correct literal types and defaults
- Added `waveformPeaks: number[] | null` to `Clip`, defaulting to `null` on `addClip`
- Updated `updateClipSettings` fallback to a complete 13-field object — no partial default objects
- Added 14 new test cases: UiState defaults, ClipSettings new fields, waveformPeaks on addClip, Zundo exclusion of new UiState fields

## Files Created/Modified

- `src/store/types.ts` — Extended UiState (4 fields), ClipSettings (6 fields), Clip (1 field)
- `src/store/index.ts` — Updated ui initial state, addClip literal, updateClipSettings fallback
- `src/store/store.test.ts` — Updated mockClip, beforeEach reset, Test 6, added 14 new tests
- `src/utils/buildFilterGraph.test.ts` — Updated baseClip and defaultSettings, two inline literals

## Decisions Made

- `selectedClipIds` placed in `UiState` (not top-level) so it is automatically excluded from Zundo undo history via the existing `partialize` function — no partialize change needed
- `updateClipSettings` fallback now contains all 13 fields so downstream code can safely spread the result without TypeScript errors about missing required fields

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `node_modules` was empty (dependencies not installed). Installed via `npm install` before running type check and tests. Treated as environment setup, not a plan deviation.

## Next Phase Readiness

- Store schema is complete for all v1.1 features — Phases 6-11 can consume new fields immediately
- No UI changes were made; app behavior is identical to v1.0
- Phase 6 (Filter Graph) can now read `speed`, `rotation`, `volume`, `hue`, `flipH`, `flipV` from `ClipSettings`

---
*Phase: 05-store-foundation*
*Completed: 2026-03-17*
