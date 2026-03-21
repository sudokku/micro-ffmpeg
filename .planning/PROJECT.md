# micro-ffmpeg

## What This Is

micro-ffmpeg is a fully client-side browser-based video editor. Users import video/audio files, arrange clips on a two-track timeline, trim/split/reorder them, apply per-clip filters (blur/brightness/contrast/saturation), set crop rectangles and output resize dimensions, and export the result via ffmpeg.wasm — no server required. Target audience: the author and colleagues who need a stripped-down CapCut-style tool without NLE complexity.

## Core Value

The timeline + store work perfectly: clip edits reflect instantly in the Zustand store, undo/redo is flawless, and export faithfully renders what the timeline shows.

## Requirements

### Validated

- ✓ User can drag-and-drop or file-pick video and audio files into the editor — v1.0
- ✓ User can see imported clips on a two-track timeline (one video, one audio) — v1.0
- ✓ User can trim clips by dragging clip edges on the timeline — v1.0
- ✓ User can split a clip at a point using a blade tool — v1.0
- ✓ User can delete clips from the timeline — v1.0
- ✓ User can reorder clips by dragging within a track — v1.0
- ✓ User can undo/redo all clip operations via Cmd+Z / Cmd+Shift+Z — v1.0
- ✓ User can see static frame thumbnails for video clips (extracted via ffmpeg.wasm) — v1.0
- ✓ User can apply per-clip filters: blur, brightness, contrast, saturation — v1.0
- ✓ User can set a per-clip crop rectangle — v1.0
- ✓ User can set per-clip output resize dimensions — v1.0
- ✓ User can export the timeline to a video file via ffmpeg.wasm with progress shown — v1.0
- ✓ User can download the exported video file — v1.0

### Active

- [ ] User can see a real-time preview of the current timeline frame in the central panel (PREV-01)
- [ ] User can play/pause timeline playback with audio (PREV-02)
- [ ] User can see a timecode display in the preview panel (PREV-03)
- [ ] User can zoom the timeline in and out via +/- buttons and modifier+scroll (ZOOM-01)
- [ ] User can see audio waveforms on audio clips in the timeline (WAVE-01)
- [ ] User can select multiple clips via Cmd/Ctrl+click (SEL-01)
- [ ] User can delete all selected clips at once (SEL-02)
- [ ] User can apply clip settings to all selected clips simultaneously (SEL-03)
- [ ] User can move selected clips together by dragging one (SEL-04)

### Validated in Phase 11: clip-settings-ui-polish

- ✓ User can set per-clip playback speed (0.25×/0.5×/1×/2×/4×) (CLIP-01)
- ✓ User can set per-clip rotation (preset angles: 0°/90°/180°/270°) (CLIP-02)
- ✓ User can set per-clip volume (CLIP-03)
- ✓ User can set per-clip hue shift (CLIP-04)
- ✓ User can flip a clip horizontally or vertically (CLIP-05)
- ✓ User sees a polished iMovie-style UI (wider sidebar 280px, shorter timeline 28vh) (UI-01)

### Out of Scope

- Multi-track support (beyond one video + one audio) — v2
- Server-side processing — fully client-side only
- Mobile app — web-first
- OAuth / user accounts — no backend
- Cloud storage — local session only
- Alternative timeline libraries — @xzdarcy/react-timeline-editor is locked
- Alternative state managers — Zustand + Zundo is locked

## Context

**Shipped v1.0** — ~2,489 LOC TypeScript, 103 files, 93 commits. Built in 2 days (2026-03-16 → 2026-03-17).

Tech stack: React 19 + TypeScript + Vite + TailwindCSS v4. State: Zustand + Zundo temporal middleware. Timeline: `@xzdarcy/react-timeline-editor`. Processing: `@ffmpeg/ffmpeg` main-thread singleton.

`@ffmpeg/ffmpeg` runs on the main thread — its own internal worker handles threading. The `FFmpeg` class spawns `@ffmpeg/ffmpeg/dist/esm/worker.js` which loads `@ffmpeg/core` via dynamic `import()`. `public/ffmpeg-core.js` must be the **ESM build** (`dist/esm/`), not UMD. No Comlink layer is used.

The timeline component is a pure controlled display: reads from Zustand store, fires callbacks that dispatch store actions. Zundo `partialize` excludes `ui` and `export` slices from undo history — this was the root cause of the prior failed attempt.

## Constraints

- **Tech stack**: React 19 + TypeScript + Vite + TailwindCSS — no Vue, no other frameworks
- **Timeline library**: `@xzdarcy/react-timeline-editor` v1.x — do NOT replace or hand-roll timeline interactions
- **State**: Zustand + Zundo — Zundo partialize MUST exclude `ui` and `export` slices
- **Processing**: `@ffmpeg/ffmpeg` (main thread singleton) + `@ffmpeg/util` — no Comlink; `public/ffmpeg-core.js` must be the ESM build
- **MVP scope**: No real-time playback, no multi-track, no server

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React 19 over Vue | Previous Vue attempt failed due to ecosystem mismatch with timeline component | ✓ Good — no friction with the timeline library |
| @xzdarcy/react-timeline-editor v1.x | Battle-tested row/action data model fits video tracks; avoids hand-rolling drag/resize/snap | ✓ Good — worked throughout without issues |
| Zustand + Zundo temporal middleware | Minimal boilerplate; Zundo <700 bytes with partialize support | ✓ Good — undo/redo worked flawlessly |
| @ffmpeg/ffmpeg main-thread singleton | `@ffmpeg/ffmpeg` internally manages its own worker; adding Comlink breaks `import.meta.url` resolution inside the nested worker. Singleton loaded once on first import; reused by thumbnails and export. | ✓ Good — zero singleton-related issues |
| Thumbnails via ffmpeg.wasm (not video element) | Lightweight, no real-time playback overhead | ✓ Good — acceptable performance for MVP |
| Store-first design rule | Store shape designed before any UI; all components read from store, nothing communicates laterally | ✓ Good — made testing and undo straightforward |
| Zundo partialize excludes ui + export | Previous attempt's #1 bug source — UI state in undo history caused broken undo behavior | ✓ Good — zero undo-related bugs in this implementation |

## Current Milestone: v1.1 Preview & Polish

**Goal:** Add real-time preview with playback, timeline zoom, audio waveforms, multi-clip selection, enhanced clip settings, and a focused UI polish pass.

**Target features:**
- Real-time preview panel (HTML5 video + Canvas, play/pause, timecode, playhead sync)
- Timeline zoom (+/- buttons + modifier+scroll)
- Audio waveforms (Web Audio API OfflineAudioContext)
- Multi-clip selection (Cmd/Ctrl+click — delete, bulk settings, move together)
- Per-clip speed presets (0.25×/0.5×/1×/2×/4×)
- Additional clip settings: rotation, volume, hue shift, flip H/V
- Focused UI polish (iMovie-style: preview layout, sidebar, timeline, buttons)

---
*Last updated: 2026-03-22 — Phase 11 complete (clip settings UI polish)*
