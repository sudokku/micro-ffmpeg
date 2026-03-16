# micro-ffmpeg

## What This Is

micro-ffmpeg is a deliberately minimal, fully client-side browser-based video editor. Users can import video/audio files, arrange clips on a two-track timeline, trim/split/reorder them, apply per-clip filters and crop/resize settings, and export the result via ffmpeg.wasm — no server required. Target audience: the author and a small group of colleagues who need a stripped-down CapCut-style tool without NLE complexity.

## Core Value

The timeline + store must work perfectly: clip positions and edits are reflected instantly in the Zustand store, undo/redo works flawlessly, and export faithfully renders exactly what the timeline shows.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can drag-and-drop or file-pick video and audio files into the editor
- [ ] User can see imported clips as items on a two-track timeline (one video, one audio)
- [ ] User can trim clips by dragging clip edges on the timeline
- [ ] User can split a clip at the playhead using a blade tool
- [ ] User can delete clips from the timeline
- [ ] User can reorder clips by dragging within a track
- [ ] User can undo/redo all clip operations via Cmd+Z / Cmd+Shift+Z
- [ ] User can see static frame thumbnails for video clips (extracted via ffmpeg.wasm)
- [ ] User can apply per-clip filters: blur, brightness, contrast, saturation
- [ ] User can set a per-clip crop rectangle
- [ ] User can set per-clip output resize dimensions
- [ ] User can export the timeline to a video file via ffmpeg.wasm with progress shown
- [ ] User can download the exported video file

### Out of Scope

- Real-time video playback — thumbnails only; playback is a v2 feature
- Multi-track support (beyond one video + one audio) — v2
- Server-side processing — fully client-side only
- Mobile app — web-first
- OAuth / user accounts — no backend
- Cloud storage / project save/load — local session only (v1)

## Context

This is a React 19 + TypeScript project built with Vite. A previous attempt used Vue and hand-rolled timeline drag logic — that approach failed. This version hard-locks to React and `@xzdarcy/react-timeline-editor` to avoid rebuilding timeline interactions from scratch.

ffmpeg.wasm runs in a dedicated Comlink-wrapped Web Worker; the main thread never imports ffmpeg directly. State is managed by Zustand with Zundo temporal middleware for undo/redo — only `tracks`, `clips`, and `clipSettings` are tracked in undo history (not `ui` or `export` state).

The timeline component is a controlled display: it reads from the store and fires callbacks that dispatch store actions. It never holds its own clip position state.

## Constraints

- **Tech stack**: React 19 + TypeScript + Vite + TailwindCSS — no Vue, no other frameworks
- **Timeline library**: `@xzdarcy/react-timeline-editor` v1.x — do NOT replace or hand-roll timeline interactions
- **State**: Zustand + Zundo — no other state management; Zundo partialize MUST exclude `ui` and `export` slices
- **Processing**: ffmpeg.wasm (`@ffmpeg/ffmpeg` + `@ffmpeg/util`) via Comlink Web Worker — ffmpeg never on main thread
- **MVP scope**: No real-time playback, no multi-track, no server

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React 19 over Vue | Previous Vue attempt failed due to ecosystem mismatch with timeline component | — Pending |
| @xzdarcy/react-timeline-editor v1.x | Battle-tested row/action data model fits video tracks; avoids hand-rolling drag/resize/snap | — Pending |
| Zustand + Zundo temporal middleware | Minimal boilerplate; Zundo <700 bytes with partialize support to isolate undo scope | — Pending |
| Comlink Web Worker for ffmpeg | Main thread never blocks; clean async API without manual postMessage | — Pending |
| Thumbnails via ffmpeg.wasm (not video element) | Lightweight, no real-time playback overhead | — Pending |
| Store-first design rule | Store shape designed before any UI; all components read from store, nothing communicates laterally | — Pending |
| Zundo partialize excludes ui + export | Previous attempt's #1 bug source — UI state in undo history caused broken undo behavior | — Pending |

---
*Last updated: 2026-03-16 after initialization*
