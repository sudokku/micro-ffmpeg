---
phase: 06-filter-graph
plan: 02
subsystem: export
tags: [ffmpeg, audio, speed, volume, atempo, useExport, buildAfFilter]

# Dependency graph
requires:
  - phase: 06-01
    provides: buildAfFilter function in buildFilterGraph.ts
provides:
  - Speed-scaled -t argument for video clips in export pipeline
  - Speed-scaled -t argument for audio clips in export pipeline
  - Audio -af filter wired from buildAfFilter into audio encode path
affects: [export, audio-processing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "audioArgs built incrementally so -af is conditionally appended only when filter string is non-empty"
    - "sourceDuration = duration * speed passed as -t to correctly window the source file for speed-altered clips"

key-files:
  created: []
  modified:
    - src/hooks/useExport.ts
    - src/hooks/useExport.test.ts

key-decisions:
  - "sourceDuration = duration * speed is the correct -t value: at 2x speed FFmpeg reads 2x more source frames to fill the same output duration"
  - "-af is only appended when buildAfFilter returns non-empty string, avoiding unnecessary filter overhead for clips at default speed/volume"

patterns-established:
  - "Speed-scaling pattern: const speed = settings?.speed ?? 1; const sourceDuration = duration * speed"
  - "Conditional audio filter: const afFilter = buildAfFilter(speed, volume); if (afFilter) { args.push('-af', afFilter) }"

requirements-completed: [CLIP-01, CLIP-03]

# Metrics
duration: 8min
completed: 2026-03-18
---

# Phase 06 Plan 02: Filter Graph Export Wiring Summary

**Speed-scaled -t and atempo/volume -af filters wired into the export pipeline for both video and audio clip encode paths**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-18T01:22:00Z
- **Completed:** 2026-03-18T01:30:00Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Video clip encode uses `sourceDuration = duration * speed` for `-t`, so FFmpeg reads the correct number of source frames at the requested playback speed
- Audio clip encode uses `audioSourceDuration = duration * audioSpeed` for `-t`, matching the video path
- Audio clip encode conditionally appends `-af` with the `buildAfFilter` output (atempo chain + volume) when the filter string is non-empty
- Added 9 new unit tests covering speed-scaled duration calculations and `buildAfFilter` integration scenarios
- Full test suite: 139 tests, 0 failures

## Task Commits

Per CLAUDE.md: one commit per phase. No per-task commits made.

## Files Created/Modified
- `src/hooks/useExport.ts` - Added `buildAfFilter` import; added `speed`/`sourceDuration` to video path; added `audioSpeed`/`audioVolume`/`audioSourceDuration`/`afFilter` to audio path with conditional `-af` push
- `src/hooks/useExport.test.ts` - Added `buildAfFilter` import; added `describe('speed-scaled source duration')` (5 tests) and `describe('buildAfFilter integration for useExport')` (4 tests)

## Decisions Made
- `sourceDuration = duration * speed` is correct: at 2x speed, FFmpeg needs to read 2x more source frames in the given output window, so `-t` must be the larger source window
- Audio `-af` is omitted entirely when filter is empty (speed=1, volume=1.0) to avoid passthrough filter overhead

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CLIP-01 (speed) and CLIP-03 (volume) export integration complete
- Export pipeline now faithfully applies clip speed and volume settings from the store
- Ready for Phase 06 Plan 03 if it exists, or Phase 07

## Self-Check: PASSED

- FOUND: src/hooks/useExport.ts
- FOUND: src/hooks/useExport.test.ts
- FOUND: .planning/phases/06-filter-graph/06-02-SUMMARY.md
- Commit 4165e6ea verified in git log

---
*Phase: 06-filter-graph*
*Completed: 2026-03-18*
