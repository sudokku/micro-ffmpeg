---
phase: 06-filter-graph
plan: 01
subsystem: processing
tags: [ffmpeg, filter-graph, setpts, atempo, transpose, hue, tdd, vitest]

requires:
  - phase: 05-store-foundation
    provides: ClipSettings type with speed, rotation, volume, hue, flipH, flipV fields

provides:
  - Extended buildVfFilter with setpts, rotation (transpose), flip (hflip/vflip), and hue filters
  - New buildAfFilter export for audio speed (atempo chaining) and volume
  - 43 passing unit tests covering all filter segments and chain order

affects:
  - 06-02 (useExport wiring — consumes buildVfFilter and buildAfFilter outputs)

tech-stack:
  added: []
  patterns:
    - "Filter order is locked: setpts -> rotation -> flip -> scale -> crop -> boxblur -> hue -> eq"
    - "atempo chains: 0.25x = atempo=0.5,atempo=0.5; 4x = atempo=2.0,atempo=2.0"
    - "hue uses named-param syntax hue=h=N (positional hue=N is deprecated)"
    - "setpts must be first in vf chain to prevent AV sync drift in multi-clip export"

key-files:
  created: []
  modified:
    - src/utils/buildFilterGraph.ts
    - src/utils/buildFilterGraph.test.ts

key-decisions:
  - "setpts=1/speed*PTS formula correctly handles all 5 speed presets via arithmetic"
  - "rotation=180 uses vflip+hflip (two separate pushes) not a single transpose — maintains correct pixel order"
  - "buildAfFilter takes (speed, volume) params not a ClipSettings object — keeps it pure/testable without a full settings shape"

patterns-established:
  - "TDD RED->GREEN->REFACTOR for all filter logic"
  - "Filter segments use early-return guards (if speed !== 1, if hue !== 0) — no unnecessary filters emitted"

requirements-completed: [CLIP-01, CLIP-02, CLIP-03, CLIP-04, CLIP-05]

duration: 8min
completed: 2026-03-18
---

# Phase 06 Plan 01: Filter Graph — setpts, rotation, flip, hue, atempo, volume

**Extended buildVfFilter with five new filter segments and added buildAfFilter for atempo chaining and volume, with 43 unit tests verifying all filter orderings and edge cases.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-18T01:19:00Z
- **Completed:** 2026-03-18T01:27:00Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 2

## Accomplishments

- Extended `buildVfFilter` with setpts (speed), rotation (transpose/vflip+hflip), flip (hflip/vflip after rotation), and hue=h=N filters in the correct chain order
- Added new `buildAfFilter` export handling all 5 speed presets via atempo chaining and volume != 1.0
- 24 new test cases added, all 43 total tests green; chain-order test verifies the full 8-segment sequence

## Task Commits

Per CLAUDE.md: one commit per phase, not per plan or task. No individual commits created — will be bundled in the phase-complete commit.

## Files Created/Modified

- `src/utils/buildFilterGraph.ts` — Extended with setpts, rotation, flip, hue segments; added buildAfFilter export
- `src/utils/buildFilterGraph.test.ts` — 24 new test cases across 6 new describe blocks; import updated to include buildAfFilter

## Decisions Made

- `buildAfFilter(speed, volume)` takes primitive params rather than the full ClipSettings object — cleaner API, easier to unit test, avoids constructing a full settings fixture in call sites
- rotation=180 implemented as two separate pushes (`vflip` then `hflip`) rather than a single filter, matching the plan spec and preserving correct pixel ordering

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `buildVfFilter` and `buildAfFilter` are ready for `useExport.ts` integration (Plan 06-02)
- All acceptance criteria met: exports present, tests passing, chain order verified

---
*Phase: 06-filter-graph*
*Completed: 2026-03-18*
