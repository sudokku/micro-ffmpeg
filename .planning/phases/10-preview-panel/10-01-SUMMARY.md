---
phase: 10-preview-panel
plan: 01
subsystem: ui
tags: [react, typescript, vitest, canvas, css-filters, preview]

# Dependency graph
requires:
  - phase: 06-filter-graph
    provides: ClipSettings type with blur/brightness/contrast/saturation/hue fields
provides:
  - buildCanvasFilter: maps ClipSettings visual fields to CSS filter strings for canvas preview
  - findClipAt: looks up which clip is active at a given timeline position
  - computeTotalDuration: returns max endTime across all clips
  - formatTimecode: formats seconds as MM:SS string
affects:
  - 10-preview-panel (plans 02 onward: usePreview hook, PreviewPanel component depend on these utils)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - CSS filter string builder (blur*2px, brightness(1+offset), contrast, saturate, hue-rotate)
    - Pure utility functions with no side effects for easy TDD
    - endTime-exclusive clip boundary check (startTime <= t < endTime)

key-files:
  created:
    - src/utils/buildCanvasFilter.ts
    - src/utils/buildCanvasFilter.test.ts
    - src/utils/previewUtils.ts
    - src/utils/previewUtils.test.ts
  modified: []

key-decisions:
  - "buildCanvasFilter uses blur*2 for CSS blur (1 unit blur = 2px radius), matching visual weight of ffmpeg boxblur)"
  - "buildCanvasFilter brightness uses 1+offset form: 0 offset = brightness(1) = no change; -0.5 = brightness(0.5) = half"
  - "formatTimecode uses MM:SS format with no hours column — user decision from plan (formatTimecode(3600) = 60:00)"
  - "findClipAt uses endTime-exclusive boundary (startTime <= t < endTime) for gap-free clip lookup"
  - "computeTotalDuration reduces to max endTime, returns 0 for empty record"

patterns-established:
  - "CSS filter order: blur -> brightness -> contrast -> saturate -> hue-rotate (space-separated)"
  - "Default test fixture pattern: const defaults: ClipSettings = { ... all defaults ... } used as spread base"

requirements-completed: [PREV-01, PREV-03, PREV-04]

# Metrics
duration: 10min
completed: 2026-03-19
---

# Phase 10 Plan 01: Preview Utility Functions Summary

**CSS filter string builder and preview helpers (findClipAt, computeTotalDuration, formatTimecode) with 37 passing TDD tests**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-19T01:48:00Z
- **Completed:** 2026-03-19T01:49:30Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- `buildCanvasFilter` converts ClipSettings filter fields to a CSS filter string for canvas preview; returns 'none' for defaults
- `findClipAt` looks up the active clip on a given track at a given playhead time using endTime-exclusive boundary
- `computeTotalDuration` computes timeline length as max endTime across all clips
- `formatTimecode` formats seconds as zero-padded MM:SS with no hours column

## Task Commits

Per project rules (CLAUDE.md), no per-task commits are made. All source files will be committed in the single phase commit when phase 10 is complete.

## Files Created/Modified

- `src/utils/buildCanvasFilter.ts` - CSS filter string builder from ClipSettings; 14 tests, all pass
- `src/utils/buildCanvasFilter.test.ts` - 14 test cases covering each filter field and multi-filter combination
- `src/utils/previewUtils.ts` - findClipAt, computeTotalDuration, formatTimecode utilities; 23 tests, all pass
- `src/utils/previewUtils.test.ts` - 23 test cases covering boundary conditions, empty inputs, timecode formatting

## Decisions Made

- `buildCanvasFilter` maps `blur` to `blur(N*2px)` — factor of 2 gives CSS blur radius that visually matches the ffmpeg `boxblur` effect
- `brightness` uses `1 + offset` form so `brightness: 0` (default) maps to CSS `brightness(1)` (identity)
- `formatTimecode` produces MM:SS with no hours column as specified by plan; `formatTimecode(3600)` returns `'60:00'`
- `findClipAt` uses exclusive endTime boundary (`time < clip.endTime`) so clips can abut without overlap ambiguity

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All pure utility functions for the preview panel are implemented and fully tested
- `buildCanvasFilter` and `previewUtils` exports are ready for import by the `usePreview` hook (plan 02) and `PreviewPanel` component (plan 03)
- Full test suite remains green: 224 tests pass

## Self-Check: PASSED

- src/utils/buildCanvasFilter.ts: FOUND
- src/utils/buildCanvasFilter.test.ts: FOUND
- src/utils/previewUtils.ts: FOUND
- src/utils/previewUtils.test.ts: FOUND
- .planning/phases/10-preview-panel/10-01-SUMMARY.md: FOUND
- All 37 tests pass (14 buildCanvasFilter + 23 previewUtils)
- Full suite: 224 tests pass

---
*Phase: 10-preview-panel*
*Completed: 2026-03-19*
