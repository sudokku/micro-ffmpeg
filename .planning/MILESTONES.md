# Milestones

## v1.1 Preview & Polish (Shipped: 2026-03-21)

**Phases completed:** 7 phases, 14 plans, 23 tasks

**Key accomplishments:**

- Extended Zustand store schema with 11 new typed fields across UiState, ClipSettings, and Clip — all 103 tests pass with zero regressions
- Extended buildVfFilter with five new filter segments and added buildAfFilter for atempo chaining and volume, with 43 unit tests verifying all filter orderings and edge cases.
- Speed-scaled -t and atempo/volume -af filters wired into the export pipeline for both video and audio clip encode paths
- `setWaveformPeaks` Zustand action and peak-normalized `extractPeaks` utility with 9 new tests covering undo behavior, normalization, and silence safety
- `useWaveformExtractor` drives Web Audio API peak extraction into Zustand; `WaveformCanvas` renders an Audacity-style dual-layer waveform (min/max envelope + RMS fill, log-scale) on audio clips in the timeline
- Zustand `setPixelsPerSecond` action with [50, 400] clamping added to store, excluded from Zundo undo history, verified by 6 passing tests
- Timeline header strip with +/−/fit zoom buttons and Cmd/Ctrl+scroll cursor-anchored zoom wired to scaleWidth prop
- Four new Zustand store actions for multi-clip selection (toggleClipSelection, clearSelection, deleteSelectedClips, bulkUpdateClipSettings) with atomic Zundo undo support and 13 new unit tests
- Cmd/Ctrl+click multi-select, bulk delete, and settings fan-out wired into TimelinePanel, useKeyboardShortcuts, and ClipSettingsPanel
- CSS filter string builder and preview helpers (findClipAt, computeTotalDuration, formatTimecode) with 37 passing TDD tests
- Zustand setPlayheadTime/setIsPlaying actions wired to xzdarcy timeline cursor with bidirectional sync and Space bar play/pause toggle
- usePreview hook (rAF loop, video/audio element pool, canvas drawing with transforms and CSS filters) + PreviewPanel component + AppShell integration
- PLAYBACK (speed presets + volume slider) and TRANSFORM (rotation presets + flip H/V + hue slider) sections added to ClipSettingsPanel with audio guard; sidebar widened to 280px; timeline reduced to 28vh

---

## v1.0 MVP (Shipped: 2026-03-17)

**Phases completed:** 4 phases, 13 plans, 1 tasks

**Stats:** 93 commits, 103 files, ~2,489 LOC TypeScript | Timeline: 2026-03-16 → 2026-03-17

**Key accomplishments:**

1. Scaffolded Vite + React 19 + TypeScript + TailwindCSS v4 with all dependencies; ffmpeg.wasm + @xzdarcy/react-timeline-editor wired up
2. Zustand store + Zundo temporal middleware with correct partialize — ui/export excluded from undo history (core correctness requirement)
3. Full timeline editing: drag-and-drop/file import, two-track display, trim/split/delete/reorder clips
4. Static thumbnail extraction from video clips via ffmpeg.wasm worker
5. Per-clip settings panel: blur/brightness/contrast/saturation, crop rectangle, output resize — all undo-able via Zundo
6. Export pipeline: FFmpeg singleton + full filter graph (`buildVfFilter` with 16 unit tests), progress bar, cancel, and download

---
