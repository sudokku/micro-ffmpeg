---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Preview & Polish
status: unknown
stopped_at: Completed 11-01-PLAN.md
last_updated: "2026-03-21T23:56:54.005Z"
progress:
  total_phases: 7
  completed_phases: 7
  total_plans: 14
  completed_plans: 14
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-17)

**Core value:** Timeline + store work perfectly: clip edits reflect instantly, undo/redo is flawless, export faithfully renders what the timeline shows
**Current focus:** Phase 11 — clip-settings-ui-polish

## Current Position

Phase: 11
Plan: Not started

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
| Phase 07-waveform-infrastructure P01 | 10 | 2 tasks | 5 files |
| Phase 07-waveform-infrastructure P02 | 8 | 2 tasks | 5 files |
| Phase 08-timeline-zoom P01 | 5 | 1 tasks | 3 files |
| Phase 08-timeline-zoom P02 | 8 | 2 tasks | 2 files |
| Phase 09-multi-clip-selection P01 | 7 | 2 tasks | 3 files |
| Phase 09-multi-clip-selection P02 | 12 | 2 tasks | 3 files |
| Phase 10-preview-panel P02 | 15 | 2 tasks | 5 files |
| Phase 11-clip-settings-ui-polish P01 | 8 | 2 tasks | 2 files |

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
- [Phase 07-waveform-infrastructure]: setWaveformPeaks stores WaveformBar[] on Clip directly so Zundo undo/redo automatically reverts waveform data with clip edits
- [Phase 07-waveform-infrastructure]: WaveformBar { min, max, rms } per bar (not number[]) — enables dual-layer Audacity-style rendering: faint min/max envelope + bright RMS fill
- [Phase 07-waveform-infrastructure]: BARS_PER_SECOND=10 (duration-proportional) replaces fixed 200 — short and long clips get consistent visual density
- [Phase 07-waveform-infrastructure]: Log-scale amplitude with −60 dB floor (ampToHeight) — quiet signals stay visible, loud signals don't blow out
- [Phase 07-waveform-infrastructure]: inFlightRef.delete in finally block allows undo to re-trigger extraction correctly
- [Phase 07-waveform-infrastructure]: WaveformCanvas co-located in ClipAction.tsx — internal component, no separate file needed
- [Phase 07-waveform-infrastructure]: ResizeObserver drives WaveformCanvas redraws so bars stay sharp when clip is resized on timeline
- [Phase 08-timeline-zoom]: setPixelsPerSecond clamps to [50, 400]: ui slice excluded from Zundo partialize so zoom is never reverted by undo
- [Phase 08-timeline-zoom]: scale={1} + scaleWidth={pixelsPerSecond} makes scaleWidth directly equal pixels-per-second
- [Phase 08-timeline-zoom]: START_LEFT=20 matches DEFAULT_START_LEFT in @xzdarcy library for correct cursor-time calculation
- [Phase 08-timeline-zoom]: onWheel on outer container div for reliable modifier+scroll interception with e.preventDefault()
- [Phase 09-multi-clip-selection]: toggleClipSelection keeps selectedClipId set to toggled id even on deselection (anchor for range-select)
- [Phase 09-multi-clip-selection]: deleteSelectedClips is no-op when selectedClipIds empty (avoids spurious Zundo history entry)
- [Phase 09-multi-clip-selection]: selectClip now clears selectedClipIds to enforce single-click single-select invariant
- [Phase 09-multi-clip-selection]: onClickRow cast as never for untyped @xzdarcy prop — runtime supports it but TS types don't export it
- [Phase 09-multi-clip-selection]: Fan-out pattern in ClipSettingsPanel: check selectedClipIds.length > 1 then bulk, else single
- [Phase 10-preview-panel P01]: buildCanvasFilter maps blur to blur(N*2px), brightness to brightness(1+offset), saturation to saturate(N), hue to hue-rotate(Ndeg); returns 'none' for defaults
- [Phase 10-preview-panel P01]: findClipAt uses endTime-exclusive boundary (startTime <= t < endTime) so clips can abut without overlap ambiguity
- [Phase 10-preview-panel P01]: formatTimecode uses MM:SS with no hours column (3600s = 60:00 not 1:00:00) — per plan spec
- [Phase 10-preview-panel]: setPlayheadTime/setIsPlaying use get()+set({ui:...}) pattern — excluded from Zundo via partialize
- [Phase 10-preview-panel]: onClickTimeArea seeks + pauses (setIsPlaying(false)) per plan spec
- [Phase 10-preview-panel]: useEffect(setTime, [playheadTime]) for store-to-cursor sync — no feedback loop
- [Phase 10-preview-panel]: usePreview called inside PreviewPanel (not AppShell) — hook needs canvasRef which lives in PreviewPanel
- [Phase 10-preview-panel]: Video elements not muted — audio from video clips plays naturally through the video element; audio-track clips use HTMLAudioElement
- [Phase 10-preview-panel]: Scrub mode uses seeked event (once:true) for frame-accurate canvas draw; playback mode only seeks if drift > 0.3s
- [Phase 11]: Volume stored as float (1.0=100%) but displayed as integer percent (0-200); divide by 100 on commit
- [Phase 11]: Audio guard (isAudio = clip.trackId === 'audio') wraps TRANSFORM+FILTERS+CROP+RESIZE in one !isAudio block

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 9 / SEL-04]: `@xzdarcy/react-timeline-editor` has no native group drag (issue #74 open). Delta-based `onActionMoveEnd` workaround is unvalidated against this library version. Consider deferring SEL-04 to v2 if delta approach is unstable.

## Session Continuity

Last session: 2026-03-21T22:26:07.838Z
Stopped at: Completed 11-01-PLAN.md
Resume file: None
