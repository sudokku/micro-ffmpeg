# Roadmap: micro-ffmpeg

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-03-17) — see [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)
- 🚧 **v1.1 Preview & Polish** — Phases 5-11 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-4) — SHIPPED 2026-03-17</summary>

- [x] Phase 1: Foundation (4/4 plans) — completed 2026-03-16
- [x] Phase 2: Timeline Core (5/5 plans) — completed 2026-03-16
- [x] Phase 3: Clip Settings (2/2 plans) — completed 2026-03-17
- [x] Phase 4: Export (2/2 plans) — completed 2026-03-17

</details>

### 🚧 v1.1 Preview & Polish (In Progress)

**Milestone Goal:** Transform the functional v1.0 editor into a real NLE feel — live preview with playback, timeline zoom, audio waveforms, multi-clip selection, enhanced per-clip settings, and iMovie-style UI polish.

- [x] **Phase 5: Store Foundation** — Extend store schema for all v1.1 features; zero UI changes
- [x] **Phase 6: Filter Graph** — Add speed/rotation/volume/hue/flip to the ffmpeg filter pipeline (completed 2026-03-17)
- [x] **Phase 7: Waveform Infrastructure** — Extract and render audio waveforms on timeline clips (completed 2026-03-18)
- [x] **Phase 8: Timeline Zoom** — Wire +/- buttons and modifier+scroll zoom to the timeline (completed 2026-03-18)
- [x] **Phase 9: Multi-Clip Selection** — Cmd/Ctrl+click multi-select with bulk delete, settings, and drag (completed 2026-03-18)
- [ ] **Phase 10: Preview Panel** — Live canvas preview with play/pause, timecode, and playhead sync
- [ ] **Phase 11: Clip Settings UI + Polish** — Speed/rotation/volume/hue/flip controls and iMovie-style UI

## Phase Details

### Phase 5: Store Foundation
**Goal**: All v1.1 store fields are present, typed, and excluded from / included in Zundo correctly — app still looks and behaves identically to v1.0 after this phase
**Depends on**: Phase 4
**Requirements**: (none directly — this phase unblocks PREV-01–04, ZOOM-01–03, SEL-01–04, CLIP-01–05)
**Success Criteria** (what must be TRUE):
  1. `UiState` contains `playheadTime`, `isPlaying`, `pixelsPerSecond`, and `selectedClipIds` as `string[]`
  2. `ClipSettings` contains `speed`, `rotation`, `volume`, `hue`, `flipH`, `flipV` fields with correct defaults
  3. `Clip` has a `waveformPeaks: number[] | null` field
  4. Zundo `partialize` still excludes all `UiState` fields (no new undo pollution)
  5. All existing v1.0 features work without regression
**Plans**: 1 plan
Plans:
- [x] 05-01-PLAN.md — Extend store types, defaults, and tests for v1.1 fields

### Phase 6: Filter Graph
**Goal**: Every new per-clip property (speed, rotation, volume, hue, flip) is correctly encoded in the ffmpeg filter chain — export produces correct output for all settings combinations, including edge-case speed presets
**Depends on**: Phase 5
**Requirements**: CLIP-01, CLIP-02, CLIP-03, CLIP-04, CLIP-05 (export side — UI comes in Phase 11)
**Success Criteria** (what must be TRUE):
  1. Exported video plays at the correct speed for all five presets (0.25×, 0.5×, 1×, 2×, 4×) with correct AV sync
  2. Exported video is correctly rotated at 0°/90°/180°/270° matching the clip setting
  3. Exported audio has the correct volume level relative to the 0–200% slider range
  4. Exported video has the correct hue shift and horizontal/vertical flip applied
  5. Unit tests cover all 5 speed presets × audio/video and confirm `atempo` chaining for 0.25× and 4×
**Plans**: 2 plans
Plans:
- [ ] 06-01-PLAN.md — Extend buildVfFilter + add buildAfFilter with TDD coverage
- [ ] 06-02-PLAN.md — Wire speed-scaled -t and -af into useExport pipeline

### Phase 7: Waveform Infrastructure
**Goal**: Users can see audio waveforms rendered on audio clips in the timeline — peaks are extracted once on import and drawn from cached store data
**Depends on**: Phase 5
**Requirements**: WAVE-01
**Success Criteria** (what must be TRUE):
  1. After importing an audio file, waveform peaks appear on the clip in the timeline within a few seconds
  2. Waveform peaks persist through undo/redo and across clip operations (trim, split, reorder)
  3. Video clips are unaffected (no waveform canvas branch runs for video clips)
**Plans**: 2 plans
Plans:
- [ ] 07-01-PLAN.md — Store action (setWaveformPeaks) + extractPeaks utility with tests
- [ ] 07-02-PLAN.md — useWaveformExtractor hook + WaveformCanvas renderer + visual verification

### Phase 8: Timeline Zoom
**Goal**: Users can control timeline zoom via keyboard-accessible buttons and modifier+scroll — precision trimming is possible on long clips
**Depends on**: Phase 5
**Requirements**: ZOOM-01, ZOOM-02, ZOOM-03
**Success Criteria** (what must be TRUE):
  1. Clicking + zooms the timeline in; clicking - zooms out; both buttons are visible in the top bar
  2. Holding Cmd/Ctrl and scrolling over the timeline zooms in/out continuously
  3. A reset-to-fit button (or action) restores zoom so the full timeline is visible on screen
  4. Zoom is clamped to safe bounds — the timeline never collapses or overflows its container
**Plans**: 2 plans
Plans:
- [ ] 08-01-PLAN.md — Add setPixelsPerSecond store action with clamping and tests
- [ ] 08-02-PLAN.md — Wire zoom buttons, modifier+scroll, and fit-to-screen into TimelinePanel


### Phase 9: Multi-Clip Selection
**Goal**: Users can select multiple clips at once and operate on all of them — delete, apply settings, and move — as a single undoable action
**Depends on**: Phase 5
**Requirements**: SEL-01, SEL-02, SEL-03, SEL-04
**Success Criteria** (what must be TRUE):
  1. Cmd/Ctrl+clicking clips toggles them in/out of the selection; all selected clips show a visible highlight
  2. Pressing Backspace/Delete with multiple clips selected removes all of them in a single undo step
  3. Changing a setting in ClipSettingsPanel while multiple clips are selected applies the change to all selected clips
  4. Dragging one selected clip moves all selected clips together by the same delta
**Plans**: 2 plans
Plans:
- [ ] 09-01-PLAN.md — Store actions (toggleClipSelection, clearSelection, deleteSelectedClips, bulkUpdateClipSettings) + tests
- [ ] 09-02-PLAN.md — Wire multi-select into TimelinePanel, bulk delete into keyboard shortcuts, fan-out + badge into ClipSettingsPanel

### Phase 10: Preview Panel
**Goal**: Users can see the current timeline frame rendered live in the preview panel and play back the timeline with audio
**Depends on**: Phases 5, 7, 9
**Requirements**: PREV-01, PREV-02, PREV-03, PREV-04
**Success Criteria** (what must be TRUE):
  1. The central panel shows the current frame matching the playhead position — scrubbing the playhead updates the canvas immediately
  2. Clicking play (or pressing Space) starts playback; the playhead advances in sync; audio plays from the correct position
  3. The preview panel displays a timecode (MM:SS) that updates during playback and scrubbing
  4. Per-clip filters (blur, brightness, contrast, saturation, crop) are visually reflected in the preview canvas
**Plans**: 3 plans
Plans:
- [ ] 10-01-PLAN.md — TDD utility functions: buildCanvasFilter + previewUtils (findClipAt, computeTotalDuration, formatTimecode)
- [ ] 10-02-PLAN.md — Store actions (setPlayheadTime, setIsPlaying) + Space bar toggle + timeline cursor sync
- [ ] 10-03-PLAN.md — usePreview hook + PreviewPanel component + AppShell integration + visual verification

### Phase 11: Clip Settings UI + Polish
**Goal**: All per-clip settings from Phase 6 have UI controls in ClipSettingsPanel and bulk-apply to multi-selected clips; the editor UI is polished to an iMovie-style three-panel layout
**Depends on**: Phases 6, 9, 10
**Requirements**: CLIP-01, CLIP-02, CLIP-03, CLIP-04, CLIP-05 (UI side), UI-01
**Success Criteria** (what must be TRUE):
  1. ClipSettingsPanel shows speed preset buttons (0.25x/0.5x/1x/2x/4x), rotation picker (0/90/180/270), volume slider (0-200%), hue slider, and flip H/V toggles for the selected clip
  2. All clip settings controls apply to all selected clips when multiple are selected
  3. The editor presents an iMovie-style three-panel layout: preview (center-top), settings sidebar (right), timeline (bottom) with consistent spacing and button styling
**Plans**: [To be planned]

## Progress

**Execution Order:** 5 → 6 → 7 → 8 → 9 → 10 → 11

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 4/4 | Complete | 2026-03-16 |
| 2. Timeline Core | v1.0 | 5/5 | Complete | 2026-03-16 |
| 3. Clip Settings | v1.0 | 2/2 | Complete | 2026-03-17 |
| 4. Export | v1.0 | 2/2 | Complete | 2026-03-17 |
| 5. Store Foundation | v1.1 | Complete    | 2026-03-17 | 2026-03-17 |
| 6. Filter Graph | 2/2 | Complete   | 2026-03-17 | - |
| 7. Waveform Infrastructure | 2/2 | Complete   | 2026-03-18 | - |
| 8. Timeline Zoom | 2/2 | Complete   | 2026-03-18 | - |
| 9. Multi-Clip Selection | 2/2 | Complete   | 2026-03-18 | - |
| 10. Preview Panel | v1.1 | 0/3 | Not started | - |
| 11. Clip Settings UI + Polish | v1.1 | 0/TBD | Not started | - |
