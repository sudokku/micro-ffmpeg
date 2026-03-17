# Project Research Summary

**Project:** micro-ffmpeg v1.1 — Preview & Polish milestone
**Domain:** Browser-based NLE video editor (client-side, ffmpeg.wasm)
**Researched:** 2026-03-17
**Confidence:** HIGH

## Executive Summary

micro-ffmpeg v1.1 is a polish milestone that transforms a functional but bare-bones video editor into one that feels like a real NLE. The central feature is a live preview panel — a hidden `<video>` element composited to a `<canvas>` via a `requestAnimationFrame` loop, synchronized bidirectionally with the `@xzdarcy/react-timeline-editor` cursor via its `TimelineState` ref. Everything else in the milestone builds on or around this: timeline zoom (already supported via the `scaleWidth` prop), audio waveforms drawn from `OfflineAudioContext` peak data, multi-clip selection via store state, and per-clip speed/rotation/volume/hue/flip settings wired to new ffmpeg filter chains. Zero new runtime dependencies are required — the entire milestone is implementable with native browser APIs and the packages already installed.

The recommended implementation order is strict and dependency-driven. The Zustand store schema must be extended first (new `UiState` and `ClipSettings` fields, `selectedClipIds` migration from single string to array) before any UI work begins. The ffmpeg filter graph comes second because it can be fully wired and unit-tested before the settings UI exists. The preview panel comes last — despite being the headline feature — because it has the highest integration surface area and depends on stable store shape, stable playhead state, and stable waveform infrastructure.

The three biggest risks are (1) the `atempo` chaining requirement for 0.25× and 4× speeds — passing bare values to ffmpeg will silently produce wrong output; (2) `setpts` must be prepended as the first filter in the vf chain to prevent AV sync drift in multi-clip exports; and (3) the Zustand/Zundo partialize constraint — any new transient state added outside the `ui` slice will pollute the undo history. All three are straightforward to avoid if addressed at the start of the relevant phase.

## Key Findings

### Recommended Stack

The locked stack (React 19 + TypeScript + Vite + TailwindCSS v4, `@xzdarcy/react-timeline-editor` v1.0.0, Zustand v5 + Zundo v2.3.0, `@ffmpeg/ffmpeg` main-thread singleton, lucide-react v0.577.0) is sufficient for the entire milestone. No new packages are required. All waveform, preview, and selection features are implementable with native browser APIs (`<video>`, `<canvas>`, `OfflineAudioContext`, `requestAnimationFrame`) and existing installed libraries.

**Core technologies:**
- `<video>` + `<canvas>` + `requestAnimationFrame`: preview panel — native APIs, no abstraction library needed
- `OfflineAudioContext` + `AudioBuffer.getChannelData()`: waveform peak extraction — 30 lines of code vs 28 kB wavesurfer.js
- `@xzdarcy/react-timeline-editor` `scaleWidth` prop: timeline zoom — built-in, documented, zero additional code
- Zustand `ui` slice extension: playhead time, zoom level, multi-select state — all transient, already excluded from Zundo
- `buildFilterGraph.ts` extension: `setpts`, `atempo`, `volume`, `hue`, `hflip`, `vflip`, `transpose` — pure functions, fully testable
- TailwindCSS v4 + lucide-react: UI polish — already installed, no animation library needed

**What NOT to add:** wavesurfer.js (Shadow DOM fights timeline slot rendering), react-player (abstracts `currentTime`), peaks.js (requires Konva + waveform-data), framer-motion (overkill for tool UI), react-selecto (selection is store state, not DOM).

### Expected Features

**Must have (table stakes):**
- Preview panel shows current frame — every NLE has a viewer; missing it makes blind editing unusable
- Play/pause with audio sync — users cannot evaluate edits without playback
- Timecode display — standard in all NLEs
- Playhead syncs to preview position — bidirectional sync between preview and timeline cursor
- Timeline zoom — precision trimming on long clips requires this
- Per-clip volume control — basic audio mixing expected by any tool handling audio
- Clip speed change — CapCut-style audience expects it; 5 presets (0.25×/0.5×/1×/2×/4×)
- Multi-clip delete — batch operations are unusable without this

**Should have (competitive):**
- Audio waveforms on timeline — makes the tool feel professional; iMovie has it, most browser editors omit it
- Multi-clip selection with bulk settings — power-user feature; one-by-one editing is painful
- Per-clip rotation (0°/90°/180°/270°) — handles portrait video from phones
- Flip H/V — common correction and creative tool
- Hue shift slider — differentiation; iMovie lacks it, CapCut has it
- iMovie-style three-panel layout polish — builds user trust; most browser editors look like demos

**Defer (v2+):**
- Real-time filter preview via ffmpeg — too expensive (5–15s per change on the main thread WASM instance)
- Keyframe animation — entirely different data model
- Waveform-based trimming — conflicts with timeline library's own trim handles
- Coordinated multi-clip drag (move together) — feasible but HIGH complexity; `@xzdarcy` does not natively support group drag

### Architecture Approach

The architecture is strictly store-first. All new concepts that cross component boundaries — playhead time, zoom level, playback state, multi-select set — live in the Zustand `ui` slice (already excluded from Zundo). Per-clip settings (speed, rotation, volume, hue, flip) extend the existing `ClipSettings` shape and are tracked by Zundo. The preview panel uses a hidden video element pool (one per clip) composited to a single visible canvas via a `usePlayback` hook running a rAF loop. Waveform peaks are computed once on file import via `OfflineAudioContext`, stored on the `Clip` object as `number[] | null`, and drawn synchronously by `ClipAction` from that cached data.

**Major components:**
1. `PreviewPanel` (new) — hidden video pool, canvas compositing, timecode display, play/pause controls
2. `usePlayback` hook (new) — rAF loop, playhead advancement, active clip selection, video element seek
3. `waveformExtractor` util (new) — `OfflineAudioContext` peak extraction, downsampled to 200 buckets
4. `buildFilterGraph` (extend) — add `buildAfFilter` (atempo chain + volume), extend `buildVfFilter` (setpts, hflip, vflip, transpose, hue)
5. `TimelinePanel` (extend) — pass `scaleWidth`, handle modifier+wheel zoom, cursor sync via `timelineRef`, Cmd/Ctrl+click multi-select
6. `ClipSettingsPanel` (extend) — speed presets, rotation picker, volume slider, hue slider, flip toggles, bulk-apply for multi-select
7. `store/types.ts` (extend) — `UiState` additions, `ClipSettings` additions, `Clip.waveformPeaks`

### Critical Pitfalls

1. **atempo range 0.5–2.0 only** — `atempo=0.25` and `atempo=4.0` are rejected or silently clamped by ffmpeg.wasm's bundled core. Use chained filters: `atempo=0.5,atempo=0.5` for 0.25× and `atempo=2.0,atempo=2.0` for 4×. Add unit tests for edge presets before wiring to UI.

2. **`setpts` must be the first filter in the vf chain** — appending it after scale/crop/normalize causes non-zero-starting PTS on subsequent clips, producing AV sync drift in multi-clip exports. Accept `speed` as a parameter in `buildVfFilter` and always emit `setpts` first if speed != 1.0.

3. **`selectedClipIds` must live in `UiState`, not as a top-level store field** — placing it at the top level silently includes it in Zundo's undo history. Store as `string[]` (not `Set`) to keep Zundo's shallow equality check working; convert to `Set` at the use site.

4. **rAF loop must be cancelled on unmount and on pause** — store the handle in `useRef<number>`; return a cleanup that calls `cancelAnimationFrame`. React 19 Strict Mode double-mounts in development, creating two loops if cleanup is absent.

5. **`decodeAudioData` detaches the `ArrayBuffer`** — calling `file.arrayBuffer()` once and sharing it between waveform extraction and ffmpeg's `fetchFile` causes a `TypeError` on the second use. Always call `file.arrayBuffer()` twice independently.

6. **hue filter syntax is `hue=h=N`, not `hue=N`** — the bare positional form uses the deprecated saturation position. The ffmpeg.wasm-bundled core may interpret it silently wrong. Always use the named param form.

## Implications for Roadmap

Based on the dependency graph from FEATURES.md and the build order from ARCHITECTURE.md, the following phase structure is strongly recommended:

### Phase 1: Store Foundation
**Rationale:** Every other feature reads from or writes to the store. Schema changes must be stable before any UI work — this prevents having to retrofit consumers when the shape shifts. This phase has zero UI risk: after it completes, the app looks and behaves identically to v1.0.
**Delivers:** Extended `UiState` (pixelsPerSecond, playheadTime, isPlaying, selectedClipIds), extended `ClipSettings` (speed, rotation, volume, hue, flipH, flipV), `Clip.waveformPeaks`, new store actions, updated `deriveEditorData` for multi-select.
**Addresses:** All features that touch store state (preview, zoom, multi-select, clip settings)
**Avoids:** Zundo pollution pitfall (Pitfall 3), `selectedClipId` vs `selectedClipIds` inconsistency (Pitfall ARCH-5)

### Phase 2: Filter Graph
**Rationale:** Pure utility functions with no UI surface. Can be written and fully unit-tested before any settings panel or export integration. Catching `setpts` ordering and `atempo` chaining bugs at the test level costs far less than finding them post-integration.
**Delivers:** `buildAfFilter` (atempo chain for all speed presets, volume filter), extended `buildVfFilter` (setpts first, hflip, vflip, transpose, hue=h=N), updated `useExport` with `-t` duration adjustment for speed.
**Uses:** Existing `buildFilterGraph.ts` extension pattern
**Avoids:** atempo range pitfall (Pitfall 1), setpts ordering pitfall (Pitfall 2), hue syntax pitfall (Pitfall 8), WASM OOM pitfall (Pitfall 7)

### Phase 3: Waveform Infrastructure
**Rationale:** File import is the natural trigger for peak extraction. Establishing the double-arrayBuffer pattern and the `waveformExtractor` before the preview panel prevents the ArrayBuffer detach pitfall from appearing mid-integration. Waveforms render in `ClipAction` directly from store data with no async work on render.
**Delivers:** `waveformExtractor.ts`, updated `useFileImport` (async peak extraction → `setClipWaveformPeaks`), updated `ClipAction` (waveform canvas branch for audio clips).
**Implements:** Pattern 3 from ARCHITECTURE.md
**Avoids:** ArrayBuffer detach pitfall (Pitfall 6), full-res audio decode OOM (Performance Trap)

### Phase 4: Timeline Zoom
**Rationale:** Low effort, high value, zero dependencies on preview panel. Wiring `scaleWidth` to the store is 2-3 lines in `TimelinePanel`. Establishing zoom bounds as constants here prevents the layout-collapse pitfall before it can appear in preview testing.
**Delivers:** Zoom +/- buttons in `TopBar`, modifier+wheel in `TimelinePanel`, `pixelsPerSecond` clamped to [40, 640] px/s.
**Addresses:** Timeline zoom (table stakes)
**Avoids:** scaleWidth bounds pitfall (Pitfall 10)

### Phase 5: Multi-Clip Selection
**Rationale:** Depends on Phase 1 store schema. Should come before the preview panel so keyboard shortcuts (Space, Delete) are already wired and don't need retrofitting when playback is added.
**Delivers:** Cmd/Ctrl+click multi-select in `TimelinePanel`, `ClipAction` multi-select highlight, bulk delete via `deleteClips` (single Zundo snapshot), bulk settings apply in `ClipSettingsPanel`, updated `useKeyboardShortcuts` (Delete → bulk delete).
**Implements:** Pattern 5 from ARCHITECTURE.md
**Avoids:** Bulk delete Zundo fragmentation (ARCH anti-pattern 4), selectedClipId/selectedClipIds sync bug (ARCH anti-pattern 5)

### Phase 6: Preview Panel
**Rationale:** Highest integration surface area — depends on stable store shape (Phase 1), stable playhead state, and benefits from waveform infrastructure being in place. Building last means all its dependencies are stable and tested. This is the headline deliverable of the milestone.
**Delivers:** `usePlayback` hook (rAF loop, playhead advance, end-of-timeline stop), `PreviewPanel` component (hidden video pool, canvas compositing, timecode display, play/pause controls), `TimelinePanel` cursor sync from `playheadTime`, Space shortcut for play/pause.
**Implements:** Pattern 2 (hidden video pool) from ARCHITECTURE.md
**Avoids:** rAF leak pitfall (Pitfall 4), blob URL leak pitfall (Pitfall 5), video.play()-in-rAF anti-pattern (ARCH anti-pattern 1)

### Phase 7: Enhanced Clip Settings UI
**Rationale:** All filter graph logic is already wired (Phase 2). This phase is pure UI — adding Speed presets, Rotation picker, Volume slider, Hue slider, and Flip H/V toggles to `ClipSettingsPanel`. No new integration risk; just reading and writing store fields already connected to the export pipeline.
**Delivers:** Full per-clip settings UI in `ClipSettingsPanel` with bulk-apply support for multi-selected clips.
**Addresses:** All CLIP-01 through CLIP-05 features
**Avoids:** WASM OOM via filter preview calls (Pitfall 7) — settings panel must use canvas approximation for preview, never a new ffmpeg call

### Phase Ordering Rationale

- Phase 1 before everything: schema changes have a blast radius across the whole codebase; stabilize once.
- Phase 2 before UI: pure functions are cheapest to test in isolation; filter bugs are found before integration.
- Phase 3 before preview: waveform extraction pattern (double-arrayBuffer, OfflineAudioContext) must be established before the video preview adds more object URL management.
- Phase 4 early: timeline zoom is a 2-line prop change; deferring it costs nothing, but getting it wrong (CSS transform zoom) at the wrong stage causes hard-to-debug layout issues.
- Phase 5 before preview: keyboard shortcuts need a consistent selection model before playback adds Space key behavior.
- Phase 6 last among core features: maximum integration surface; all dependencies stable.
- Phase 7 last: zero integration risk; pure UI over already-wired store/filter layer.

### Research Flags

Phases needing caution during implementation (not additional research — patterns are known, but execution is risky):
- **Phase 6 (Preview Panel):** rAF loop cleanup in React 19 Strict Mode double-mount, bidirectional playhead sync, video element pool memory management. Follow ARCHITECTURE.md Pattern 2 exactly.
- **Phase 2 (Filter Graph):** `setpts` ordering and `atempo` chain are easy to get wrong. Unit test all 5 speed presets × audio/video before connecting to UI.
- **Phase 5 (Multi-Select):** `@xzdarcy` does not support native group drag (Pitfall 9). The delta-based `onActionMoveEnd` workaround must be planned before writing drag code.

Phases with standard, well-documented patterns (low implementation risk):
- **Phase 1 (Store Foundation):** Zustand slice extension is mechanical; main risk is the `UiState` vs top-level placement — verified in PITFALLS.md.
- **Phase 4 (Timeline Zoom):** `scaleWidth` prop is documented in the installed type definitions.
- **Phase 7 (Clip Settings UI):** Pure form controls over established store/filter patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified against installed `node_modules` type definitions and `package.json`; zero new dependencies confirmed |
| Features | HIGH (core) / MEDIUM (UX patterns) | Browser APIs verified via MDN; NLE UX patterns based on iMovie/CapCut comparison (MEDIUM for subjective UX decisions) |
| Architecture | HIGH | Based on direct codebase analysis of `src/`; all integration points verified against `@xzdarcy` type definitions |
| Pitfalls | HIGH | All critical pitfalls verified against official docs, known codebase behavior, or open library issues |

**Overall confidence:** HIGH

### Gaps to Address

- **Coordinated multi-clip drag (SEL-04):** The `@xzdarcy` library has an open feature request for native multi-select (issue #74, opened 2026-02-07). The delta-based workaround in ARCHITECTURE.md is correct in principle but has not been tested against this specific library version. Validate the `onActionMoveEnd` delta approach with a minimal prototype before committing to full implementation. Consider deferring SEL-04 to v2 if the delta approach proves unstable.
- **Preview canvas 4K performance:** The architecture notes that 4K canvas compositing is borderline at 30fps and recommends downscaling to 1280×720 for preview. This threshold has not been empirically measured against the actual ffmpeg.wasm build. Validate with a real 4K test file early in Phase 6.
- **OfflineAudioContext memory for long audio:** Downsampling to 8000 Hz mono is recommended but the exact memory cap for the browser tab has not been measured. For typical editing sessions (<20 clips, <10 min each), this is acceptable; for edge cases, chunk-based extraction may be needed.

## Sources

### Primary (HIGH confidence)
- `node_modules/@xzdarcy/react-timeline-editor/dist/interface/timeline.d.ts` — `scaleWidth`, `TimelineState.setTime/getTime/play/pause` verified
- `src/store/types.ts`, `src/utils/buildFilterGraph.ts`, `src/hooks/useExport.ts` — direct codebase inspection
- MDN Web Audio API / OfflineAudioContext — waveform extraction pattern
- MDN Canvas API — `drawImage`, video compositing pattern
- ffmpeg atempo filter docs (v7.1) — 0.5–2.0 range constraint confirmed
- ffmpeg hue filter docs (v8.0) — `hue=h=N` named param syntax confirmed

### Secondary (MEDIUM confidence)
- Apple iMovie window layout guide — three-panel layout reference
- Creatomate: Building a video editor in JavaScript — general NLE browser patterns
- DEV: Building a TypeScript Video Editor as a Solo Dev — browser NLE implementation patterns
- Shotstack: FFmpeg speed up/slow down — `setpts` + `atempo` usage patterns

### Tertiary (reference only)
- @xzdarcy/react-timeline-editor GitHub issues — multi-select issue #74 (open as of 2026-02-07)
- wavesurfer.js docs — Shadow DOM rendering confirmed; ruled out
- peaks.js GitHub — Konva + waveform-data peer deps confirmed; ruled out

---
*Research completed: 2026-03-17*
*Ready for roadmap: yes*
