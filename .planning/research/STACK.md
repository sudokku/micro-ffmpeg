# Stack Research

**Domain:** Browser-based video editor — v1.1 Preview & Polish milestone
**Researched:** 2026-03-17
**Confidence:** HIGH (all critical decisions verified against type definitions or official documentation)

---

## Existing Stack (Locked — Do Not Re-Research)

React 19 + TypeScript + Vite + TailwindCSS v4, @xzdarcy/react-timeline-editor v1.0.0,
Zustand v5 + Zundo v2.3.0, @ffmpeg/ffmpeg main-thread singleton, lucide-react v0.577.0.
These are locked. No additions required for any of them.

---

## New Capabilities Required

### Preview Panel (HTML5 Video + Canvas)

No new library needed. The preview panel uses native browser APIs only:

- `<video>` element: seekable, `currentTime`, `play()`/`pause()` — HTML5 built-in
- `<canvas>` element: frame-by-frame rendering via `ctx.drawImage(videoEl, ...)` in a `requestAnimationFrame` loop
- `requestAnimationFrame`: drives the canvas render loop during playback
- `useRef<HTMLVideoElement>` and `useRef<HTMLCanvasElement>`: standard React pattern

The timeline component exposes `TimelineState` via `ref` (`setTime`, `getTime`, `play`, `pause`, `isPlaying`) which is the synchronisation bus between the preview and the playhead. This is already installed and available.

**Integration point:** `TimelineState.getTime()` → set `videoEl.currentTime`; on `videoEl.timeupdate` → call `timelineRef.current.setTime(...)`.

**What NOT to add:** react-player, video-react, or any video player library. They abstract away the raw `<video>` element and make canvas frame extraction and precise `currentTime` control harder, not easier.

### Timeline Zoom

No new library needed. Already supported by the installed `@xzdarcy/react-timeline-editor` v1.0.0 via the `scaleWidth` prop (verified in `dist/interface/timeline.d.ts`).

The `EditData` interface exposes:
- `scaleWidth?: number` — pixel width per tick mark (default 160). Increasing this zooms in; decreasing zooms out.
- `scale?: number` — seconds per tick mark (default 1). Can be combined with `scaleWidth` for coarser control.
- `minScaleCount?: number` / `maxScaleCount?: number` — clamp the total number of visible ticks.

**Implementation:** Store `scaleWidth` in the `ui` slice (already excluded from Zundo tracking). +/- buttons and `wheel` handler with modifier key update it. The `ui` slice already exists in the store — just add `timelineScaleWidth: number` to `UiState`.

**What NOT to add:** No third-party zoom library. The built-in prop is sufficient and avoids patching library internals.

### Audio Waveforms

No new library needed. The waveform is computed once per audio clip using native browser APIs:

1. `OfflineAudioContext` — decode the audio file off-thread without blocking UI
2. `AudioBuffer.getChannelData(0)` — returns `Float32Array` of raw PCM samples
3. Peak extraction loop — downsample to ~500 buckets (width of clip in px)
4. `<canvas>` — draw lines from extracted peaks; rendered inside `getActionRender` of the timeline

**Confidence:** HIGH — MDN documents this exact pattern. The `OfflineAudioContext` approach is used by BBC Peaks.js and wavesurfer.js internally; hand-rolling it avoids carrying their full playback/interaction weight.

**Why NOT wavesurfer.js (v7.11.0, actively maintained):** wavesurfer.js renders into its own Shadow DOM container with its own playback engine and scroll behaviour. Embedding it inside a timeline `action` render slot requires fighting its internal layout assumptions. The waveform data extraction is 30 lines of native code; the library is 28 kB gzipped of features we do not use.

**Why NOT peaks.js:** Requires Konva and waveform-data as peer dependencies, adds ~200 kB, and is designed to be the timeline itself — not a drawable inside someone else's timeline.

### Multi-Clip Selection

No new library needed. Pure store + event handler work:

- Extend `UiState.selectedClipId: string | null` → `selectedClipIds: Set<string>`
- `onClickAction` already fires with the clicked action. Add modifier key check (`e.metaKey || e.ctrlKey`) to toggle set membership vs. replace selection.
- Bulk delete: iterate `selectedClipIds` and call existing `deleteClip` action.
- Bulk settings: iterate and call existing `updateClipSettings` action.
- Multi-drag: use `onActionMoveEnd` — when the moved action is in the selection set, compute delta and apply to all selected clips.

**What NOT to add:** No selection library (react-selecto, etc.). The timeline already handles drag events; selection is a store state concern, not a DOM concern.

### Per-Clip Speed / Rotation / Volume / Hue / Flip

No new library needed. These are store fields added to `ClipSettings`:

| Field | Type | Default | FFmpeg filter |
|-------|------|---------|---------------|
| `speed` | `0.25 \| 0.5 \| 1 \| 2 \| 4` | `1` | `setpts=PTS/speed, atempo=speed` |
| `rotation` | `0 \| 90 \| 180 \| 270` | `0` | `transpose` filter (0/1/2/3) |
| `volume` | `number` (0–2) | `1` | `volume=N` |
| `hue` | `number` (-180–180) | `0` | `hue=h=N` |
| `flipH` | `boolean` | `false` | `hflip` |
| `flipV` | `boolean` | `false` | `vflip` |

The `ClipSettingsPanel` component reads from `clipSettings[selectedClipId]` and calls `updateClipSettings`. Adding these fields follows the exact same pattern already proven in v1.0.

**Speed note:** For video, `setpts=PTS/(speed)` changes duration. The `endTime - startTime` of the clip in the store must be recalculated when speed changes to keep the timeline accurate. At `2×`, the clip occupies half the time it would at `1×`.

**What NOT to add:** No audio processing library for real-time volume preview. Volume in the preview is set via `videoEl.volume`; in export via FFmpeg `volume=` filter.

### UI Polish (iMovie-style)

No new library needed. TailwindCSS v4 (already installed) covers all layout and style work. The existing `lucide-react` v0.577.0 icon set covers new UI icons (Play, Pause, ZoomIn, ZoomOut, RotateCw, FlipHorizontal, FlipVertical, etc.).

**What NOT to add:** No animation library (framer-motion, react-spring). Tailwind transitions (`transition-all`, `duration-150`) are sufficient for a focused tool-style UI.

---

## Recommended Stack (New Additions)

**Zero new runtime dependencies are needed for this milestone.**

All features are implementable with:
- Native browser APIs (`<video>`, `<canvas>`, `OfflineAudioContext`, `requestAnimationFrame`)
- Existing installed packages (timeline `scaleWidth` prop, Zustand store extension, lucide-react icons)
- Standard React patterns (`useRef`, `useEffect`, `useCallback`)

| Capability | Implementation | Dependency |
|------------|---------------|------------|
| Preview panel video | `<video>` + `useRef` | None (native) |
| Preview panel canvas | `<canvas>` + `requestAnimationFrame` | None (native) |
| Timecode display | `Date`/string formatting in component | None (native) |
| Timeline zoom | `scaleWidth` prop on `<Timeline>` | Already installed |
| Audio waveforms | `OfflineAudioContext` + `<canvas>` | None (native) |
| Multi-clip selection | Zustand store `Set<string>` | Already installed |
| Speed/rotation/volume/hue/flip | `ClipSettings` extension | Already installed |
| UI polish | TailwindCSS v4 + lucide-react | Already installed |

---

## Installation

No new packages to install.

```bash
# No npm install commands needed for this milestone
```

---

## Alternatives Considered

| Capability | Our Approach | Alternative Considered | Why Alternative Rejected |
|------------|-------------|----------------------|--------------------------|
| Audio waveforms | Native `OfflineAudioContext` + canvas | wavesurfer.js v7.11.0 | Shadow DOM isolation fights timeline `getActionRender`; adds playback engine we don't use |
| Audio waveforms | Native | peaks.js | Requires Konva + waveform-data peer deps; designed to own the timeline, not live inside one |
| Video preview | Native `<video>` + canvas | react-player | Abstracts `currentTime`, makes canvas frame capture and precise seek harder |
| Timeline zoom | `scaleWidth` prop (built-in) | CSS transform/scale | CSS scale distorts hit targets; `scaleWidth` is the documented API |
| UI animation | Tailwind transitions | framer-motion | Overkill for tool UI; increases bundle by ~30 kB |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| wavesurfer.js | Shadow DOM + own playback engine conflicts with timeline slot rendering | Native `OfflineAudioContext` + `<canvas>` |
| peaks.js | Requires Konva, waveform-data peer deps; is a standalone timeline, not an embedded visual | Native `OfflineAudioContext` + `<canvas>` |
| react-player / video-react | Wraps `<video>` in abstraction that hides `currentTime` and blocks canvas access | Native `<video>` ref |
| framer-motion / react-spring | ~30 kB for CSS-replaceable transitions in a tool UI | Tailwind `transition-*` utilities |
| react-selecto or similar DOM-selection libraries | Multi-clip selection is store state, not a DOM lasso; timeline handles all pointer events | Extend `UiState.selectedClipIds: Set<string>` |

---

## Version Compatibility

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| @xzdarcy/react-timeline-editor | 1.0.0 (installed) | React 19 | Peer dep `>=18.0.0`; confirmed working in project |
| lucide-react | 0.577.0 (installed) | React 19 | Active React 19 support tracked in issue #2951; current version works |
| Zustand | 5.0.12 (installed) | React 19 | v5 requires React 18+; React 19 compatible |
| Zundo | 2.3.0 (installed) | Zustand 5 | Already validated in v1.0 |
| OfflineAudioContext | Browser native | All modern browsers | Chromium 35+, Firefox 25+, Safari 14.1+ |
| `requestAnimationFrame` | Browser native | All modern browsers | Universal |

---

## Integration Notes for Key Patterns

### Canvas waveform inside timeline action render

The timeline's `getActionRender` prop receives `(action, row) => ReactNode`. The waveform canvas component mounts inside this slot. It reads peak data pre-computed and cached in a `Map<clipId, Float32Array>` (held in a React ref or module-level cache, NOT in Zustand — waveform data is derived, not editable state).

### Timeline zoom via scaleWidth

`scaleWidth` defaults to 160 px. A zoom level of 0.5× = 80 px, 2× = 320 px. Store `timelineScaleWidth` in `ui` slice (already excluded from Zundo via `partialize`). Wheel handler: `newWidth = clamp(currentWidth * (delta > 0 ? 1.2 : 0.8), 40, 640)`.

### Playhead sync

`Timeline` exposes `TimelineState` via `ref`. The preview panel uses `timelineRef.current.getTime()` on each `requestAnimationFrame` tick to position the `<video>` element. On user seek (click on timeline time area → `onClickTimeArea`), call `videoEl.currentTime = time`.

### Speed-adjusted clip duration

When `speed` changes from 1 to 2, the clip's timeline `endTime` must shrink: `newEnd = startTime + (trimEnd - trimStart) / speed`. The store `updateClipSettings` action (or a new `setClipSpeed` action) must also call `moveClip`/`trimClip` to keep the timeline row data consistent.

---

## Sources

- `node_modules/@xzdarcy/react-timeline-editor/dist/interface/timeline.d.ts` — verified `scaleWidth`, `scale`, `minScaleCount`, `maxScaleCount`, `TimelineState.setTime/getTime/play/pause` (HIGH confidence)
- [MDN Web Audio API Visualizations](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API) — OfflineAudioContext + canvas waveform pattern (HIGH confidence)
- [MDN OfflineAudioContext](https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext) — API surface verified (HIGH confidence)
- [wavesurfer.js npm](https://www.npmjs.com/package/wavesurfer.js?activeTab=versions) — v7.11.0 confirmed latest, published 5 days ago (HIGH confidence)
- [wavesurfer.js docs](https://wavesurfer.xyz/docs/) — Shadow DOM rendering confirmed; ruled out for embedded use (HIGH confidence)
- [peaks.js GitHub](https://github.com/bbc/peaks.js/) — Konva + waveform-data peer deps confirmed (HIGH confidence)
- `src/store/types.ts` — existing `ClipSettings`, `UiState`, `StoreActions` shapes verified for extension plan (HIGH confidence)
- `package.json` — all installed versions verified (HIGH confidence)

---

*Stack research for: micro-ffmpeg v1.1 Preview & Polish milestone*
*Researched: 2026-03-17*
