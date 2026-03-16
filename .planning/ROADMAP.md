# Roadmap: micro-ffmpeg

## Overview

Four phases from zero to a fully working client-side video editor. Phase 1 lays the technical chassis (React 19 + Zustand + Comlink worker). Phase 2 delivers the full timeline editing experience including import, clip operations, undo/redo, and thumbnails. Phase 3 adds the per-clip settings panel (filters, crop, resize). Phase 4 wires in export rendering and download.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Project scaffold with Zustand store, Comlink/ffmpeg worker, and @xzdarcy/react-timeline-editor wired up but empty
- [ ] **Phase 2: Timeline Core** - Import clips, display on two-track timeline, trim/split/delete/reorder, undo/redo, static thumbnails
- [ ] **Phase 3: Clip Settings** - Per-clip filter panel (blur/brightness/contrast/saturation), crop rectangle, and output resize
- [ ] **Phase 4: Export** - ffmpeg.wasm render of timeline to video file with progress display and download

## Phase Details

### Phase 1: Foundation
**Goal**: The technical chassis is assembled and all moving parts can communicate before any user-facing feature is built
**Depends on**: Nothing (first phase)
**Requirements**: None (pure infrastructure — all v1 requirements land in Phases 2-4)
**Success Criteria** (what must be TRUE):
  1. Vite dev server starts and renders a React 19 app with TailwindCSS applied
  2. Zustand store is initialised with `tracks`, `clips`, and `clipSettings` slices; Zundo temporal middleware is wired and excludes `ui` and `export` slices
  3. Comlink-wrapped ffmpeg.wasm Web Worker loads and responds to a `ping` call from the main thread without blocking the UI
  4. @xzdarcy/react-timeline-editor renders an empty two-row (video + audio) timeline component on screen
**Plans:** 4 plans

Plans:
- [ ] 01-01-PLAN.md — Project scaffold: Vite + React 19 + TypeScript + TailwindCSS v4, all dependencies, Vitest, COOP/COEP headers
- [ ] 01-02-PLAN.md — Zustand store + Zundo: store types, five slices, temporal middleware with partialize, unit tests
- [ ] 01-03-PLAN.md — Comlink ffmpeg worker: worker file, proxy factory, ping smoke test
- [ ] 01-04-PLAN.md — Timeline shell: AppShell layout, TopBar, TimelinePanel with two empty rows, render test

### Phase 2: Timeline Core
**Goal**: Users can import video and audio files, see them on the timeline, edit clips (trim, split, delete, reorder), undo/redo every operation, and see thumbnail previews
**Depends on**: Phase 1
**Requirements**: IMPT-01, IMPT-02, TIME-01, TIME-02, TIME-03, TIME-04, TIME-05, TIME-06, UNDO-01, UNDO-02, PREV-01
**Success Criteria** (what must be TRUE):
  1. User can drag-and-drop or file-pick a video or audio file and see it appear as a clip on the correct track
  2. User can drag a clip edge to trim it and the clip immediately updates its bounds in the timeline
  3. User can activate the blade tool and click a clip to split it into two independent clips at that point
  4. User can delete a clip and reorder clips within a track by dragging
  5. User can press Cmd+Z to undo any clip operation and Cmd+Shift+Z to redo it; UI state is never affected by undo
  6. Video clips display a static frame thumbnail extracted from the source file via ffmpeg.wasm
**Plans**: TBD

Plans:
- [ ] 02-01: Import — drag-and-drop + file-picker, read file into store, assign to video or audio track
- [ ] 02-02: Timeline display — map store clips to timeline-editor row/action model, controlled display contract
- [ ] 02-03: Clip editing — trim (drag edges), split (blade), delete, reorder; all dispatched through store actions
- [ ] 02-04: Undo/redo — keyboard handlers for Cmd+Z / Cmd+Shift+Z, verify Zundo partialize excludes ui/export
- [ ] 02-05: Thumbnails — extract single representative frame per video clip via ffmpeg worker, store URL, render in timeline

### Phase 3: Clip Settings
**Goal**: Users can select any clip and apply per-clip visual filters, a crop rectangle, and output resize dimensions; all settings persist in the store and are undo-able
**Depends on**: Phase 2
**Requirements**: CLIP-01, CLIP-02, CLIP-03, CLIP-04, CLIP-05, CLIP-06
**Success Criteria** (what must be TRUE):
  1. Selecting a clip opens a settings panel showing its current filter values (blur, brightness, contrast, saturation)
  2. Adjusting any filter slider immediately updates the store value for that clip
  3. User can draw or enter a crop rectangle for the selected clip and the value is stored per-clip
  4. User can enter output resize dimensions (width × height) for the selected clip and the value is stored per-clip
  5. Clip settings changes are included in undo/redo history via Zundo
**Plans**: TBD

Plans:
- [ ] 03-01: ClipSettings store slice — add blur, brightness, contrast, saturation, crop, resize fields; include in Zundo tracked state
- [ ] 03-02: Settings panel UI — selected-clip context, filter sliders, crop input, resize input, wired to store actions

### Phase 4: Export
**Goal**: Users can render the full timeline to a video file, watch export progress, and download the result
**Depends on**: Phase 3
**Requirements**: EXPO-01, EXPO-02, EXPO-03
**Success Criteria** (what must be TRUE):
  1. User can trigger export from a button and the ffmpeg.wasm worker begins rendering the timeline clips in order
  2. A progress indicator updates in real time (percentage) while rendering is in progress
  3. When rendering completes the user can download the output video file from the browser
**Plans**: TBD

Plans:
- [ ] 04-01: Export pipeline — build ffmpeg filter graph from store (clips, settings, order), run via Comlink worker, emit progress events
- [ ] 04-02: Export UI — export button, progress bar wired to worker events, download link on completion

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/4 | Planning complete | - |
| 2. Timeline Core | 0/5 | Not started | - |
| 3. Clip Settings | 0/2 | Not started | - |
| 4. Export | 0/2 | Not started | - |
