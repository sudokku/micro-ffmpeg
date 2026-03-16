# Requirements: micro-ffmpeg

**Defined:** 2026-03-16
**Core Value:** The timeline + store work perfectly: clip edits reflect instantly in the store, undo/redo is flawless, and export faithfully renders what the timeline shows.

## v1 Requirements

### Import

- [x] **IMPT-01**: User can drag-and-drop video and audio files onto the editor canvas
- [x] **IMPT-02**: User can use a file picker to import video and audio files

### Timeline

- [ ] **TIME-01**: User can see imported video clips on a single video track in the timeline
- [ ] **TIME-02**: User can see imported audio clips on a single audio track in the timeline
- [x] **TIME-03**: User can trim a clip by dragging its left or right edge
- [x] **TIME-04**: User can split a clip at a point using a blade tool
- [x] **TIME-05**: User can delete a clip from the timeline
- [x] **TIME-06**: User can reorder clips by dragging within a track

### Undo / Redo

- [x] **UNDO-01**: User can undo the last clip operation via Cmd+Z
- [x] **UNDO-02**: User can redo an undone operation via Cmd+Shift+Z

### Preview

- [ ] **PREV-01**: User can see static frame thumbnails extracted from video clips via ffmpeg.wasm

### Clip Settings

- [ ] **CLIP-01**: User can apply a blur filter to a selected clip
- [ ] **CLIP-02**: User can adjust brightness of a selected clip
- [ ] **CLIP-03**: User can adjust contrast of a selected clip
- [ ] **CLIP-04**: User can adjust saturation of a selected clip
- [ ] **CLIP-05**: User can set a crop rectangle for a selected clip
- [ ] **CLIP-06**: User can set output resize dimensions for a selected clip

### Export

- [ ] **EXPO-01**: User can trigger export to concatenate the timeline into a video via ffmpeg.wasm
- [ ] **EXPO-02**: User can see export progress (percentage) during rendering
- [ ] **EXPO-03**: User can download the exported video file after rendering completes

## v2 Requirements

### Playback

- **PLAY-01**: User can play/pause a real-time preview of the timeline
- **PLAY-02**: User can scrub a playhead through the timeline

### Multi-track

- **MTRK-01**: User can add additional video tracks
- **MTRK-02**: User can add additional audio tracks

### Project persistence

- **PROJ-01**: User can save a project and reload it in a later session
- **PROJ-02**: User can export/import project as a JSON file

### Clip operations

- **CLOP-01**: User can adjust clip playback speed
- **CLOP-02**: User can add text overlays to clips

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time video playback | MVP scope — thumbnails only; would require video element management and sync logic |
| Multi-track compositing | MVP scope — one video + one audio track only |
| Server-side rendering | Fully client-side only; no backend |
| OAuth / user accounts | No backend exists |
| Cloud storage | Local session only for v1 |
| Mobile app | Web-first; mobile is a later consideration |
| Alternative timeline libraries | Tech decision is final: @xzdarcy/react-timeline-editor v1.x |
| Alternative state managers | Tech decision is final: Zustand + Zundo |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| IMPT-01 | Phase 2 | Complete |
| IMPT-02 | Phase 2 | Complete |
| TIME-01 | Phase 2 | Pending |
| TIME-02 | Phase 2 | Pending |
| TIME-03 | Phase 2 | Complete |
| TIME-04 | Phase 2 | Complete |
| TIME-05 | Phase 2 | Complete |
| TIME-06 | Phase 2 | Complete |
| UNDO-01 | Phase 2 | Complete |
| UNDO-02 | Phase 2 | Complete |
| PREV-01 | Phase 2 | Pending |
| CLIP-01 | Phase 3 | Pending |
| CLIP-02 | Phase 3 | Pending |
| CLIP-03 | Phase 3 | Pending |
| CLIP-04 | Phase 3 | Pending |
| CLIP-05 | Phase 3 | Pending |
| CLIP-06 | Phase 3 | Pending |
| EXPO-01 | Phase 4 | Pending |
| EXPO-02 | Phase 4 | Pending |
| EXPO-03 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0

---
*Requirements defined: 2026-03-16*
*Last updated: 2026-03-16 after roadmap creation*
