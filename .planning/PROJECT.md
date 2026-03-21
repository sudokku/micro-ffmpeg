# micro-ffmpeg

## What This Is

micro-ffmpeg is a fully client-side browser-based video editor. Users import video/audio files, arrange clips on a two-track timeline, trim/split/reorder them, apply per-clip filters and transforms (blur, brightness, contrast, saturation, rotation, hue, flip), set playback speed and volume, see real-time canvas preview with playback, zoom the timeline, view audio waveforms, multi-select clips, and export via ffmpeg.wasm — no server required. Target audience: the author and colleagues who need a stripped-down CapCut-style tool without NLE complexity.

## Core Value

The timeline + store work perfectly: clip edits reflect instantly in the Zustand store, undo/redo is flawless, export faithfully renders what the timeline shows, and real-time preview lets you see exactly what will be exported before you click Export.

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
- ✓ User can see a real-time preview of the current timeline frame in the central panel — v1.1
- ✓ User can play/pause timeline playback with audio — v1.1
- ✓ User can see a timecode display in the preview panel — v1.1
- ✓ User can zoom the timeline in and out via +/- buttons and modifier+scroll — v1.1
- ✓ User can see audio waveforms on audio clips in the timeline — v1.1
- ✓ User can select multiple clips via Cmd/Ctrl+click — v1.1
- ✓ User can delete all selected clips at once — v1.1
- ✓ User can apply clip settings to all selected clips simultaneously — v1.1
- ✓ User can set per-clip playback speed (0.25×/0.5×/1×/2×/4×) — v1.1
- ✓ User can set per-clip rotation (preset angles: 0°/90°/180°/270°) — v1.1
- ✓ User can set per-clip volume — v1.1
- ✓ User can set per-clip hue shift — v1.1
- ✓ User can flip a clip horizontally or vertically — v1.1
- ✓ User sees a polished iMovie-style UI (preview panel, wider sidebar, shorter timeline) — v1.1

### Active

_(None — v1.1 milestone complete. Define v1.2 requirements with /gsd:new-milestone)_

### Out of Scope

- Multi-track support (beyond one video + one audio) — v2
- Server-side processing — fully client-side only
- Mobile app — web-first
- OAuth / user accounts — no backend
- Cloud storage — local session only
- Alternative timeline libraries — @xzdarcy/react-timeline-editor is locked
- Alternative state managers — Zustand + Zundo is locked
- Multi-clip move together by dragging (SEL-04) — deferred; timeline library drag-interaction complexity

## Context

**Shipped v1.1** — ~5,029 LOC TypeScript, 88 files changed since v1.0. Built over 5 days (2026-03-17 → 2026-03-22).

v1.0 shipped 2026-03-16 → 2026-03-17 (~2,489 LOC, phases 1-4).
v1.1 shipped 2026-03-17 → 2026-03-22 (phases 5-11, 14 plans, 23 tasks).

Tech stack: React 19 + TypeScript + Vite + TailwindCSS v4. State: Zustand + Zundo temporal middleware. Timeline: `@xzdarcy/react-timeline-editor`. Processing: `@ffmpeg/ffmpeg` main-thread singleton.

`@ffmpeg/ffmpeg` runs on the main thread — its own internal worker handles threading. The `FFmpeg` class spawns `@ffmpeg/ffmpeg/dist/esm/worker.js` which loads `@ffmpeg/core` via dynamic `import()`. `public/ffmpeg-core.js` must be the **ESM build** (`dist/esm/`), not UMD. No Comlink layer is used.

The timeline component is a pure controlled display: reads from Zustand store, fires callbacks that dispatch store actions. Zundo `partialize` excludes `ui` and `export` slices from undo history.

Preview uses an rAF loop with a pooled HTML5 video/audio element pair. Canvas draws each frame with CSS filter strings built from ClipSettings. The playhead syncs bidirectionally with the timeline cursor via Zustand.

## Constraints

- **Tech stack**: React 19 + TypeScript + Vite + TailwindCSS — no Vue, no other frameworks
- **Timeline library**: `@xzdarcy/react-timeline-editor` v1.x — do NOT replace or hand-roll timeline interactions
- **State**: Zustand + Zundo — Zundo partialize MUST exclude `ui` and `export` slices
- **Processing**: `@ffmpeg/ffmpeg` (main thread singleton) + `@ffmpeg/util` — no Comlink; `public/ffmpeg-core.js` must be the ESM build
- **Real-time playback**: HTML5 video + Canvas (rAF loop) — no Web Video API or MediaStream

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React 19 over Vue | Previous Vue attempt failed due to ecosystem mismatch with timeline component | ✓ Good — no friction with the timeline library |
| @xzdarcy/react-timeline-editor v1.x | Battle-tested row/action data model fits video tracks; avoids hand-rolling drag/resize/snap | ✓ Good — worked throughout without issues |
| Zustand + Zundo temporal middleware | Minimal boilerplate; Zundo <700 bytes with partialize support | ✓ Good — undo/redo worked flawlessly |
| @ffmpeg/ffmpeg main-thread singleton | `@ffmpeg/ffmpeg` internally manages its own worker; adding Comlink breaks `import.meta.url` resolution inside the nested worker | ✓ Good — zero singleton-related issues |
| Thumbnails via ffmpeg.wasm (not video element) | Lightweight, no real-time playback overhead | ✓ Good — acceptable performance for MVP |
| Store-first design rule | Store shape designed before any UI; all components read from store, nothing communicates laterally | ✓ Good — made testing and undo straightforward |
| Zundo partialize excludes ui + export | Previous attempt's #1 bug source — UI state in undo history caused broken undo behavior | ✓ Good — zero undo-related bugs in this implementation |
| rAF loop + HTML5 video pool for preview | MediaStream API has cross-browser gaps; rAF+canvas gives full control over transform/filter rendering | ✓ Good — consistent rendering, CSS filters match export filters |
| buildCanvasFilter separate from buildVfFilter | Canvas preview uses CSS filter strings; export uses ffmpeg vf/af args — same semantics, different syntax | ✓ Good — clean separation, both tested independently |
| atempo chaining for speed < 0.5 or > 2.0 | ffmpeg atempo filter only accepts 0.5–2.0; values outside require chained filters | ✓ Good — all 5 speed presets export correctly |

---
*Last updated: 2026-03-22 — v1.1 milestone complete*
