---
phase: 10-preview-panel
plan: 03
subsystem: ui
tags: [react, typescript, canvas, raf, video, audio, preview, filters]

# Dependency graph
requires:
  - phase: 10-preview-panel-01
    provides: buildCanvasFilter, findClipAt, computeTotalDuration, formatTimecode utilities
  - phase: 10-preview-panel-02
    provides: setPlayheadTime, setIsPlaying store actions, bidirectional cursor sync
provides:
  - usePreview: rAF loop, video/audio element management, canvas drawing with filters
  - PreviewPanel: canvas + controls bar UI component
  - AppShell: PreviewPanel mounted in main area replacing Phase 3 placeholder
affects:
  - All future phases that display preview or read playback state

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hidden video/audio elements appended to document.body — object URLs created on clip add, revoked on clip remove"
    - "rAF loop with dt clamp (1/15s) to prevent tab-blur jumps"
    - "Canvas sized to offsetWidth/Height * devicePixelRatio on each draw for retina sharpness"
    - "ctx.save/restore + translate/rotate/scale transforms for rotation and flip"
    - "seeked event listener (once: true) for scrub-mode frame drawing"
    - "useStore.subscribe with selector for playheadTime to avoid re-renders during rAF ticks"

key-files:
  created:
    - src/hooks/usePreview.ts
    - src/components/PreviewPanel.tsx
  modified:
    - src/components/AppShell.tsx

key-decisions:
  - "usePreview called inside PreviewPanel (not AppShell) — hook needs canvasRef which lives in PreviewPanel"
  - "Video elements: muted=false so video audio plays naturally through the video element"
  - "Audio elements only for audio-track clips; video-track audio plays through video element"
  - "During playback: seek only if drift > 0.3s to avoid interrupting natural video playback"
  - "During scrub: use seeked event (once:true) for frame-accurate drawing"
  - "dt clamped to 1/15s to prevent large jumps after tab blur/focus"
  - "EmptyState component no longer imported in AppShell; PreviewPanel owns the empty state UI"

patterns-established:
  - "rAF loop defined inside useEffect watching isPlaying — clean start/stop on play/pause"
  - "pauseAllMedia helper centralized — called on pause, end-of-timeline, and unmount"

requirements-completed: [PREV-01, PREV-02, PREV-03, PREV-04]

# Metrics
duration: 10min
completed: 2026-03-19
---

# Phase 10 Plan 03: Preview Panel UI and rAF Playback Engine Summary

**usePreview hook (rAF loop, video/audio element pool, canvas drawing with transforms and CSS filters) + PreviewPanel component + AppShell integration**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-19
- **Completed:** 2026-03-19
- **Tasks:** 2 of 3 complete (Task 3 is human-verify checkpoint)
- **Files modified:** 3

## Accomplishments

- `usePreview` hook manages hidden video/audio elements (one per clip), runs rAF loop with dt clamp, draws filtered frames to canvas with rotation/flip/crop transforms, syncs audio playback, handles play/pause/scrub correctly
- `PreviewPanel` renders canvas + controls bar with MM:SS timecodes, play/pause button, and "Import clips to preview" empty state
- `AppShell` updated to mount `PreviewPanel` in the main area, replacing the Phase 3 placeholder

## Files Created/Modified

- `src/hooks/usePreview.ts` — rAF loop, video/audio element lifecycle, canvas drawing with buildCanvasFilter, syncAudio; 227 lines
- `src/components/PreviewPanel.tsx` — canvas + controls bar UI, delegates to usePreview hook; 57 lines
- `src/components/AppShell.tsx` — replaced placeholder main area with PreviewPanel; EmptyState import removed

## Decisions Made

- `usePreview` is called inside `PreviewPanel` (not `AppShell`) — the hook needs `canvasRef` which lives in `PreviewPanel`; mounting in AppShell would require prop threading
- Video elements are not muted — audio from video clips plays naturally through the `<video>` element
- Audio elements are only created for audio-track clips; video-track audio uses the video element
- Scrub mode uses `el.addEventListener('seeked', ..., { once: true })` for frame-accurate canvas draw
- Playback mode only seeks if drift > 0.3s to avoid interrupting natural video decode

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next Steps (Task 3 — human verify)

Task 3 is a `checkpoint:human-verify`. The dev server needs to be started and the user verifies:
- Empty state shows "Import clips to preview"
- Frame renders correctly on scrub
- Play/pause works with timecode
- Audio plays from video and audio clips
- Filters visible in canvas preview
- Timeline cursor sync

## Self-Check: PASSED

- src/hooks/usePreview.ts: FOUND
- src/components/PreviewPanel.tsx: FOUND
- src/components/AppShell.tsx: contains PreviewPanel
- All 224 tests pass (no regressions)
- No console.log in usePreview.ts
- AppShell does NOT contain "Clip settings — Phase 3"

---
*Phase: 10-preview-panel*
*Completed: 2026-03-19*
