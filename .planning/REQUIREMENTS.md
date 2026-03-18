# Requirements: micro-ffmpeg

**Defined:** 2026-03-17
**Core Value:** The timeline + store work perfectly: clip edits reflect instantly in the Zustand store, undo/redo is flawless, and export faithfully renders what the timeline shows.

## v1.0 Requirements (Shipped)

- ✓ **IMPORT-01**: User can drag-and-drop or file-pick video and audio files into the editor
- ✓ **IMPORT-02**: User can see imported clips on a two-track timeline (one video, one audio)
- ✓ **EDIT-01**: User can trim clips by dragging clip edges on the timeline
- ✓ **EDIT-02**: User can split a clip at a point using a blade tool
- ✓ **EDIT-03**: User can delete clips from the timeline
- ✓ **EDIT-04**: User can reorder clips by dragging within a track
- ✓ **EDIT-05**: User can undo/redo all clip operations via Cmd+Z / Cmd+Shift+Z
- ✓ **THUMB-01**: User can see static frame thumbnails for video clips
- ✓ **FILT-01**: User can apply per-clip filters: blur, brightness, contrast, saturation
- ✓ **FILT-02**: User can set a per-clip crop rectangle
- ✓ **FILT-03**: User can set per-clip output resize dimensions
- ✓ **EXP-01**: User can export the timeline to a video file via ffmpeg.wasm with progress shown
- ✓ **EXP-02**: User can download the exported video file

## v1.1 Requirements

### Preview (PREV)

- [ ] **PREV-01**: User can see the current timeline frame rendered in the central preview panel
- [ ] **PREV-02**: User can play/pause timeline playback with audio
- [ ] **PREV-03**: User can see a timecode display (HH:MM:SS) in the preview panel
- [ ] **PREV-04**: User can see per-clip filters (blur/brightness/contrast/saturation/crop) reflected live in the preview canvas

### Waveform (WAVE)

- [x] **WAVE-01**: User can see audio waveforms rendered on audio clips in the timeline

### Timeline Zoom (ZOOM)

- [x] **ZOOM-01**: User can zoom the timeline in/out via +/- buttons
- [x] **ZOOM-02**: User can zoom the timeline via modifier+scroll over the timeline
- [x] **ZOOM-03**: User can reset zoom to fit the full timeline on screen

### Multi-Clip Selection (SEL)

- [ ] **SEL-01**: User can select multiple clips via Cmd/Ctrl+click
- [ ] **SEL-02**: User can delete all selected clips at once (Backspace)
- [ ] **SEL-03**: User can apply clip settings to all selected clips simultaneously
- [ ] **SEL-04**: User can move selected clips together by dragging one

### Clip Settings (CLIP)

- [x] **CLIP-01**: User can set per-clip playback speed (0.25×/0.5×/1×/2×/4× presets)
- [x] **CLIP-02**: User can set per-clip rotation (0°/90°/180°/270° presets)
- [x] **CLIP-03**: User can set per-clip volume (0–200%)
- [x] **CLIP-04**: User can set per-clip hue shift
- [x] **CLIP-05**: User can flip a clip horizontally or vertically

### UI Polish (UI)

- [ ] **UI-01**: User sees a focused iMovie-style UI polish (preview panel layout, sidebar, timeline appearance, buttons)

## v2 Requirements

### Playback
- **PLAY-01**: User can loop preview of a selected region
- **PLAY-02**: User can scrub with arrow keys (← → frame-by-frame)

### Editing
- **EDIT-06**: User can add fade in/out transitions between clips
- **EDIT-07**: User can add text overlays/titles

### Audio
- **AUDIO-01**: User can mute the audio track of a video clip independently

### Project
- **PROJ-01**: User can save a project and reload it in a later session
- **PROJ-02**: User can export/import project as a JSON file

### Export
- **EXP-03**: User can set custom bitrate/quality for export
- **EXP-04**: User can export audio-only (MP3/AAC)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time filter preview via ffmpeg | 5–15s per change on main-thread WASM — anti-feature |
| Multi-track (beyond 1 video + 1 audio) | Out of scope for v1.x |
| Server-side processing | Fully client-side only |
| Mobile app | Web-first |
| OAuth / user accounts | No backend |
| Cloud storage | Local session only |
| wavesurfer.js / peaks.js | Shadow DOM conflicts with timeline slot rendering |
| Keyframe animation | Entirely different data model — v3+ |
| Waveform-based trimming | Conflicts with timeline library's own trim handles |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PREV-01 | Phase 10 | Pending |
| PREV-02 | Phase 10 | Pending |
| PREV-03 | Phase 10 | Pending |
| PREV-04 | Phase 10 | Pending |
| WAVE-01 | Phase 7 | Complete |
| ZOOM-01 | Phase 8 | Complete |
| ZOOM-02 | Phase 8 | Complete |
| ZOOM-03 | Phase 8 | Complete |
| SEL-01 | Phase 9 | Pending |
| SEL-02 | Phase 9 | Pending |
| SEL-03 | Phase 9 | Pending |
| SEL-04 | Phase 9 | Pending |
| CLIP-01 | Phase 6 (filter) / Phase 11 (UI) | Complete |
| CLIP-02 | Phase 6 (filter) / Phase 11 (UI) | Complete |
| CLIP-03 | Phase 6 (filter) / Phase 11 (UI) | Complete |
| CLIP-04 | Phase 6 (filter) / Phase 11 (UI) | Complete |
| CLIP-05 | Phase 6 (filter) / Phase 11 (UI) | Complete |
| UI-01 | Phase 11 | Pending |

**Coverage:**
- v1.1 requirements: 18 total
- Mapped to phases: 18/18 ✓
- Unmapped: 0

**Note on CLIP-01–05:** These requirements span two phases. Phase 6 delivers the export filter logic (testable via unit tests and export); Phase 11 delivers the user-visible UI controls. Phase 11 is the delivery phase for user-observable behavior.

---
*Requirements defined: 2026-03-17*
*Last updated: 2026-03-17 — v1.1 roadmap created, traceability populated*
