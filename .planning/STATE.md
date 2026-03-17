---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Preview & Polish
status: completed
stopped_at: Phase 7 context gathered
last_updated: "2026-03-17T23:47:41.727Z"
last_activity: "2026-03-17 — Phase 5 plan 01 complete: extended store schema for v1.1"
progress:
  total_phases: 7
  completed_phases: 2
  total_plans: 3
  completed_plans: 3
  percent: 14
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-17)

**Core value:** Timeline + store work perfectly: clip edits reflect instantly, undo/redo is flawless, export faithfully renders what the timeline shows
**Current focus:** Milestone v1.1 — Phase 5: Store Foundation

## Current Position

Phase: 5 of 11 overall (1 of 7 in v1.1) — COMPLETE
Plan: 01 of 01 — complete
Status: Phase 5 done, ready for Phase 6
Last activity: 2026-03-17 — Phase 5 plan 01 complete: extended store schema for v1.1

Progress: [█░░░░░░░░░] 14% (v1.1)

## Performance Metrics

**Velocity:**
- Total plans completed: 0 (v1.1)
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 06-filter-graph P01 | 8 | 1 tasks | 2 files |
| Phase 06-filter-graph P02 | 8 | 1 tasks | 2 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Phase 04-export]: Zundo partialize excludes export actions; `partialize` pattern: `const { ui, export: _export, ...tracked } = state; return tracked`
- [Phase 04-export BUG]: `buildVfFilter` must use `!= null` (loose) not `!== null` (strict) for optional fields — store can have `undefined` not `null`
- [Phase 04-export]: FFmpeg singleton requires Promise-chain serialization queue (`enqueueFFmpegJob`) — concurrent clip encodes interleave WASM FS calls
- [v1.1 Store Foundation]: `selectedClipIds` must be `string[]` in `UiState` (not top-level store field) — placing it at top level includes it in Zundo history. Convert to `Set` only at use site.
- [v1.1 Filter Graph]: `atempo` range is 0.5–2.0 only — chain `atempo=0.5,atempo=0.5` for 0.25× and `atempo=2.0,atempo=2.0` for 4×
- [v1.1 Filter Graph]: `setpts` must be the first filter in the vf chain — appending after scale/crop causes AV sync drift in multi-clip export
- [v1.1 Filter Graph]: hue filter syntax is `hue=h=N` (named param), not `hue=N` (positional — deprecated)
- [v1.1 Waveform]: `decodeAudioData` detaches the `ArrayBuffer` — always call `file.arrayBuffer()` twice independently for waveform vs ffmpeg
- [v1.1 Preview]: rAF loop must be cancelled on unmount and pause — store handle in `useRef<number>`; React 19 Strict Mode double-mounts in dev
- [Phase 06-filter-graph]: buildAfFilter takes (speed, volume) primitives not full ClipSettings — cleaner API, easier to test
- [Phase 06-filter-graph]: sourceDuration = duration * speed is correct -t value for speed-altered clips: at 2x speed FFmpeg reads 2x more source frames
- [Phase 06-filter-graph]: -af omitted entirely when buildAfFilter returns empty string (speed=1, volume=1.0) to avoid passthrough filter overhead

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 9 / SEL-04]: `@xzdarcy/react-timeline-editor` has no native group drag (issue #74 open). Delta-based `onActionMoveEnd` workaround is unvalidated against this library version. Consider deferring SEL-04 to v2 if delta approach is unstable.

## Session Continuity

Last session: 2026-03-17T23:47:41.725Z
Stopped at: Phase 7 context gathered
Resume file: .planning/phases/07-waveform-infrastructure/07-CONTEXT.md
