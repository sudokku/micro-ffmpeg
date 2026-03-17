# Architecture Research

**Domain:** Browser-based video editor — v1.1 feature integration
**Researched:** 2026-03-17
**Confidence:** HIGH (based on direct codebase analysis, confirmed against @xzdarcy type definitions)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          UI Layer                                    │
│                                                                      │
│  ┌──────────┐  ┌──────────────────┐  ┌─────────────────────────┐    │
│  │  TopBar  │  │   CentralArea    │  │   ClipSettingsPanel     │    │
│  │ (toolbar)│  │  PreviewPanel    │  │ (expanded: speed, rot,  │    │
│  │  zoom btns  │  (video+canvas)  │  │  vol, hue, flip H/V)    │    │
│  └──────────┘  └────────┬─────────┘  └─────────────────────────┘    │
│                         │ (playheadTime read from store)             │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  TimelinePanel  →  @xzdarcy/react-timeline-editor             │    │
│  │  scaleWidth driven by ui.pixelsPerSecond                     │    │
│  │  cursor position driven by ui.playheadTime (via ref.setTime) │    │
│  │  ClipAction: video thumbnails | audio waveform canvas        │    │
│  └──────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
          │ reads / dispatches                │ reads
          ▼                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Zustand Store (+ Zundo)                        │
│                                                                      │
│  clips  │  tracks  │  clipSettings  │  ui  │  export               │
│                                                                      │
│  ui additions:                                                       │
│    pixelsPerSecond: number        (zoom — NOT in undo history)      │
│    playheadTime: number           (playback cursor — NOT in undo)   │
│    isPlaying: boolean             (NOT in undo history)             │
│    selectedClipIds: Set<string>   (multi-select — NOT in undo)      │
│                                                                      │
│  ClipSettings additions (per clipId, in undo history):             │
│    speed: 0.25 | 0.5 | 1 | 2 | 4                                   │
│    rotation: 0 | 90 | 180 | 270                                     │
│    volume: 0.0 – 2.0                                                │
│    hue: -180 – 180                                                   │
│    flipH: boolean                                                    │
│    flipV: boolean                                                    │
│                                                                      │
│  Clip additions (per clip, in undo history):                        │
│    waveformPeaks: number[] | null  (computed once on import)        │
└─────────────────────────────────────────────────────────────────────┘
          │                                  │
          ▼                                  ▼
┌──────────────────────┐       ┌─────────────────────────────────────┐
│   Web APIs           │       │   ffmpegSingleton + buildFilterGraph │
│                      │       │                                      │
│  HTMLVideoElement[]  │       │  buildVfFilter: +setpts, hue=,      │
│  (one per clip,      │       │    hflip, vflip, rotate             │
│  hidden, for preview)│       │  buildAfFilter: atempo=, volume=    │
│                      │       │  export pipeline: per-clip speed    │
│  OfflineAudioContext │       │  adjusts -ss / -t duration          │
│  (waveform peaks,    │       │                                      │
│  computed once on    │       └─────────────────────────────────────┘
│  file import)        │
│                      │
│  Canvas 2D           │
│  (preview compositing│
│  + waveform drawing) │
└──────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Status |
|-----------|----------------|--------|
| `AppShell` | Layout orchestration, hooks wiring | Modify: add `usePlayback` hook |
| `TopBar` | Export controls, tool switching | Modify: add zoom +/- buttons |
| `PreviewPanel` | NEW — canvas frame display, play/pause, timecode | New component |
| `TimelinePanel` | Timeline display, clip interaction | Modify: pass `scaleWidth`, forward cursor events, pass `timelineRef` |
| `ClipAction` | Per-clip timeline cell render | Modify: add waveform canvas for audio clips |
| `ClipSettingsPanel` | Per-clip filter/transform UI | Modify: add speed, rotation, volume, hue, flip controls |
| `usePlayback` | NEW — rAF loop, `playheadTime` sync, video element pool control | New hook |
| `useWaveform` | NEW — OfflineAudioContext peak extraction, called from `useFileImport` after addClip | New hook / util |
| `useKeyboardShortcuts` | Keyboard event dispatch | Modify: Space = play/pause, Delete = delete all selected |
| `buildFilterGraph.ts` | ffmpeg -vf / -af filter string builder | Modify: add `buildAfFilter`, extend `buildVfFilter` |

## Recommended Project Structure

```
src/
├── store/
│   ├── types.ts              # Extend UiState, ClipSettings, Clip
│   └── index.ts              # Extend partialize exclusions if needed (ui already excluded)
├── components/
│   ├── AppShell.tsx          # Add usePlayback hook
│   ├── PreviewPanel.tsx      # NEW — canvas preview
│   ├── TimelinePanel.tsx     # Pass scaleWidth, cursor sync
│   ├── ClipAction.tsx        # Add waveform canvas branch
│   ├── ClipSettingsPanel.tsx # Add speed/rotation/volume/hue/flip sections
│   └── TopBar.tsx            # Add zoom controls
├── hooks/
│   ├── usePlayback.ts        # NEW — rAF loop, playheadTime, video pool
│   ├── useFileImport.ts      # Trigger waveform extraction after addClip
│   └── useKeyboardShortcuts.ts  # Space, multi-delete
└── utils/
    ├── buildFilterGraph.ts   # Extend vf/af builders
    ├── waveformExtractor.ts  # NEW — OfflineAudioContext peaks
    └── deriveEditorData.ts   # Extend: selectedClipIds (multi-select)
```

## Architectural Patterns

### Pattern 1: Store-First for New UI State

**What:** All new UI concepts (playhead, zoom, multi-select, isPlaying) are added to the Zustand store's `ui` slice first, before any component reads them. The `ui` slice is already excluded from Zundo's undo history — no change needed to the partialize config.

**When to use:** Any state that crosses component boundaries (playhead drives both Preview and Timeline; zoom drives Timeline; isPlaying drives Preview and toolbar button state).

**Trade-offs:** Single source of truth; no prop drilling; occasionally over-centralizes transient UI state. Acceptable here — the store is already the design contract for this project.

**Example:**
```typescript
// types.ts — extend UiState
export interface UiState {
  selectedClipId: string | null      // keep for backward compat
  selectedClipIds: Set<string>       // multi-select
  activeTool: 'select' | 'blade'
  pixelsPerSecond: number            // zoom; default 160 (matches scaleWidth default)
  playheadTime: number               // seconds; drives preview + cursor
  isPlaying: boolean
}
```

### Pattern 2: Hidden Video Element Pool for Preview

**What:** One `<video>` element per clip is mounted hidden in the DOM (inside `PreviewPanel` or a sibling `VideoPool` div). Each element has its `src` set to an object URL of the clip's source file. During playback, `PreviewPanel` seeks the active video element and draws its `currentFrame` to a `<canvas>` on each rAF tick.

**When to use:** Browser video decode is hardware-accelerated. Using `<video>` + `drawImage` is far more performant than asking ffmpeg.wasm to decode frames in real time on the main thread.

**Trade-offs:** Object URLs must be revoked on clip removal. Canvas compositing adds one rAF draw per frame. Filter effects (brightness, blur, hue) can be approximated with CSS `filter` on the canvas context or drawn via `CanvasRenderingContext2D.filter` — this is preview-only approximation, not export quality.

**Example (data flow):**
```
usePlayback rAF tick
  → read playheadTime from store
  → find which clip is active at playheadTime (binary search clips by startTime/endTime)
  → seek hidden <video> to (playheadTime - clip.startTime + clip.trimStart)
  → ctx.drawImage(videoEl, 0, 0, canvasW, canvasH)
  → setPlayheadTime(playheadTime + deltaSeconds)  ← writes back to store
```

**Critical constraint:** `<video>.play()` must not be called during the rAF loop — only `currentTime` is set. The video element must have `preload="auto"` to keep frames in decode buffer.

### Pattern 3: Waveform Peaks Computed Once on Import

**What:** When a file is imported (`useFileImport` → `addClip`), audio files (and the audio track of video files if needed) are decoded once via `OfflineAudioContext`. The resulting Float32Array is downsampled to ~200 peak values and stored on the `Clip` object as `waveformPeaks: number[] | null`.

**When to use:** OfflineAudioContext decoding is CPU-intensive (~0.5-2 seconds for typical files) but happens once. Storing peaks in the store means `ClipAction` can draw the waveform synchronously from store data with no async work on render.

**Trade-offs:** Peaks array adds ~1.6KB per clip to store (200 floats × 4 bytes). Acceptable for the target clip count (<20 clips typical). The peak array is in the `clips` slice, which IS tracked by Zundo — this is intentional (undo a clip add → peaks also undone).

**Example:**
```typescript
// waveformExtractor.ts
export async function extractWaveformPeaks(
  file: File,
  numBuckets: number = 200
): Promise<number[]> {
  const arrayBuffer = await file.arrayBuffer()
  const audioCtx = new OfflineAudioContext(1, 1, 44100)
  const decoded = await audioCtx.decodeAudioData(arrayBuffer)
  const data = decoded.getChannelData(0)
  const bucketSize = Math.floor(data.length / numBuckets)
  const peaks: number[] = []
  for (let i = 0; i < numBuckets; i++) {
    let max = 0
    for (let j = 0; j < bucketSize; j++) {
      max = Math.max(max, Math.abs(data[i * bucketSize + j]))
    }
    peaks.push(max)
  }
  return peaks
}
```

### Pattern 4: Timeline Zoom via `scaleWidth` Prop

**What:** The `@xzdarcy/react-timeline-editor` `Timeline` component accepts a `scaleWidth` prop (pixels per scale unit, default 160). The store's `ui.pixelsPerSecond` drives this prop directly. Zoom buttons in TopBar and modifier+scroll in TimelinePanel both dispatch `setPixelsPerSecond`.

**When to use:** This is the correct integration point — the library provides `scaleWidth` precisely for this purpose. Do not try to zoom by scaling a wrapper div.

**Trade-offs:** `scaleWidth` is the width of one `scale` unit (default `scale=1`, meaning 1 second). So `pixelsPerSecond` and `scaleWidth` are the same value when `scale=1`. Keep `scale=1` to preserve this identity.

**Zoom range:** 40–640px/sec (0.25× to 4× of default 160). Step by 2× per click.

### Pattern 5: Multi-Select as Set in UI Slice

**What:** Add `selectedClipIds: Set<string>` to `UiState`. Keep `selectedClipId: string | null` for backward compatibility — update it to always reflect the last-clicked clip. Cmd/Ctrl+click toggles membership in `selectedClipIds`; plain click resets the set to `{clickedId}` and sets `selectedClipId`.

**When to use:** `deriveEditorData` and `ClipAction` both read `selectedClipId` for single-select highlight. Multi-select can extend this by checking `selectedClipIds.has(clip.id)` in `ClipAction.isSelected`. Bulk operations (delete, settings apply) iterate over `selectedClipIds`.

**Critical Zundo constraint:** `UiState` is already excluded from undo via `partialize`. `selectedClipIds` being a `Set` is fine — Zundo only snapshots `clips`, `tracks`, `clipSettings`. The `Set` does not need to be serializable for undo.

### Pattern 6: Speed in ClipSettings + Export Pipeline

**What:** `speed: number` field added to `ClipSettings` (default 1.0). In `buildVfFilter`, speed maps to `setpts=PTS/speed` (video). In a new `buildAfFilter`, speed maps to `atempo=speed` (audio — capped to 0.5–2.0 range; for 0.25× use two `atempo=0.5,atempo=0.5` filters). In export, the `-t` (duration) argument must be adjusted: `adjustedDuration = (clip.endTime - clip.startTime) / speed`.

**When to use:** Speed is a purely export-time filter — it does not affect timeline layout (clip width stays the same as authored). This matches how CapCut-style editors handle speed: the timeline is the "intent" and export handles the tempo change.

**Critical:** `atempo` filter is limited to 0.5–2.0 range per filter instance. For 0.25×: chain `atempo=0.5,atempo=0.5`. For 4×: chain `atempo=2.0,atempo=2.0`.

## Data Flow

### Playback Flow

```
Space key (useKeyboardShortcuts)
    ↓
setIsPlaying(true) → store.ui.isPlaying = true
    ↓
usePlayback (rAF loop starts)
    ↓ each frame
  read playheadTime from store
  determine active clip at playheadTime
  seek hidden <video> element
  drawImage to PreviewPanel <canvas>
  setPlayheadTime(playheadTime + frameDelta)
    ↓
TimelinePanel reads playheadTime
  → timelineRef.current?.setTime(playheadTime)
    ↓ (library moves cursor line)
PreviewPanel reads playheadTime
  → timecode display updates
```

### Zoom Flow

```
TopBar zoom button click / modifier+wheel (TimelinePanel)
    ↓
setPixelsPerSecond(newValue) → store.ui.pixelsPerSecond
    ↓
TimelinePanel re-renders
  → <Timeline scaleWidth={pixelsPerSecond} />
    ↓ (timeline redraws with new zoom)
```

### Waveform Flow

```
useFileImport: file imported (audio or video)
    ↓
addClip(file, trackId, duration, w, h)  — clips entry created, waveformPeaks: null
    ↓
waveformExtractor.extractWaveformPeaks(file)  [async, off critical path]
    ↓
store.setClipWaveformPeaks(clipId, peaks)  — store update triggers re-render
    ↓
ClipAction re-renders: draws peaks on <canvas> for audio clips
```

### Multi-Select + Bulk Delete Flow

```
Cmd+click clip (TimelinePanel.handleClickAction)
    ↓
toggleClipSelection(clipId)  →  selectedClipIds.add/delete in ui slice
    ↓
ClipAction: isSelected = selectedClipIds.has(clip.id)
    ↓
Delete key (useKeyboardShortcuts)
    ↓
if selectedClipIds.size > 0:
  deleteClips([...selectedClipIds])  — new bulk action
  selectedClipIds = new Set()
  selectedClipId = null
```

### Export Pipeline — New Fields

```
useExport: per-clip loop
    ↓
const speed = clipSettings[clipId]?.speed ?? 1.0
const vf = buildVfFilter(settings, clip)   // now includes setpts, hflip, vflip, rotate
const af = buildAfFilter(settings)          // NEW: atempo chain, volume
const adjustedDuration = (clip.endTime - clip.startTime) / speed
execArgs: [..., '-t', String(adjustedDuration), '-vf', vf, '-af', af, ...]
```

## Integration Points

### New vs Modified: Explicit Breakdown

| Item | New or Modified | What Changes |
|------|-----------------|--------------|
| `store/types.ts` — `UiState` | Modified | Add `pixelsPerSecond`, `playheadTime`, `isPlaying`, `selectedClipIds` |
| `store/types.ts` — `ClipSettings` | Modified | Add `speed`, `rotation`, `volume`, `hue`, `flipH`, `flipV` |
| `store/types.ts` — `Clip` | Modified | Add `waveformPeaks: number[] \| null` |
| `store/types.ts` — `StoreActions` | Modified | Add `setPixelsPerSecond`, `setPlayheadTime`, `setIsPlaying`, `toggleClipSelection`, `selectClips`, `deleteClips`, `setClipWaveformPeaks` |
| `store/index.ts` | Modified | Implement new actions; `TrackedState` stays same; `waveformPeaks` is in `clips` (already tracked) |
| `components/PreviewPanel.tsx` | NEW | Hidden video pool + canvas compositing + timecode display |
| `hooks/usePlayback.ts` | NEW | rAF loop, playhead advance, video seek, end-of-timeline stop |
| `utils/waveformExtractor.ts` | NEW | OfflineAudioContext peak extraction |
| `hooks/useFileImport.ts` | Modified | After `addClip`, call `extractWaveformPeaks` async → dispatch `setClipWaveformPeaks` |
| `components/AppShell.tsx` | Modified | Replace central placeholder with `<PreviewPanel>`; mount `usePlayback()` |
| `components/TopBar.tsx` | Modified | Add zoom +/- buttons that dispatch `setPixelsPerSecond` |
| `components/TimelinePanel.tsx` | Modified | Pass `scaleWidth={pixelsPerSecond}` to `<Timeline>`; add ref for cursor control; handle modifier+scroll; Cmd/Ctrl+click for multi-select |
| `components/ClipAction.tsx` | Modified | `isSelected` checks `selectedClipIds.has(clip.id)`; audio branch draws waveform from `clip.waveformPeaks` |
| `components/ClipSettingsPanel.tsx` | Modified | Add Speed, Rotation, Volume, Hue, Flip H/V sections; bulk-apply logic for multi-select |
| `hooks/useKeyboardShortcuts.ts` | Modified | Space → toggle playback; Delete → bulk delete `selectedClipIds` |
| `utils/buildFilterGraph.ts` | Modified | `buildVfFilter`: add `setpts`, `hflip`, `vflip`, `rotate`; add `buildAfFilter` (atempo, volume) |
| `utils/deriveEditorData.ts` | Modified | `selected` field checks `selectedClipIds.has(id)` instead of `selectedClipId === id` |
| `hooks/useExport.ts` | Modified | Pass settings to `buildAfFilter`; adjust `-t` for speed; build `-af` args |

### Internal Boundaries

| Boundary | Communication | Constraint |
|----------|---------------|------------|
| `usePlayback` ↔ `PreviewPanel` | `usePlayback` is mounted in `AppShell`; `PreviewPanel` reads `playheadTime` from store. Video element refs are held by `PreviewPanel` and exposed via a ref callback or a shared context. | Video elements must be in the DOM for `drawImage` to work — they cannot be in a detached tree |
| `TimelinePanel` ↔ store playhead | `TimelinePanel` holds a `timelineRef` (the `TimelineState` ref from `@xzdarcy`). It must call `timelineRef.current.setTime(playheadTime)` when `playheadTime` changes (via `useEffect`). This is the only push path from store → timeline library cursor. | `setTime` is synchronous; call it in a `useEffect` watching `playheadTime` |
| `useFileImport` ↔ `waveformExtractor` | `useFileImport` calls `extractWaveformPeaks` after `addClip`. The peaks are dispatched back via `setClipWaveformPeaks`. This must be fire-and-forget (not block the import). | Audio of video files: extract from the video File directly — OfflineAudioContext can decode video containers with audio tracks |
| `ClipAction` ↔ `waveformPeaks` | `ClipAction` receives the `clip` prop. It reads `clip.waveformPeaks`. If null, shows shimmer. If populated, draws canvas. | Canvas draw must be in a `useEffect` or `useLayoutEffect` after mount; canvas ref required |
| `buildFilterGraph` ↔ export pipeline | `buildVfFilter` and new `buildAfFilter` are pure functions. `useExport` calls them per-clip. | `atempo` range constraint: must chain multiple atempo filters for rates outside 0.5–2.0 |

## Suggested Build Order

The order below minimizes broken intermediate states and respects data dependencies.

### Phase 1 — Store Shape (no UI broken, all new fields get defaults)

1. Extend `types.ts`: `UiState` + `ClipSettings` + `Clip` additions
2. Extend `store/index.ts`: implement new actions, add defaults
3. Extend `deriveEditorData.ts`: multi-select aware `selected` field
4. Extend `partialize` exclusions if needed (only if new `ui` fields break Zundo — they should not, `ui` is already excluded)

Everything still compiles and runs identically after this step.

### Phase 2 — Filter Graph (pure logic, no UI)

5. Extend `buildVfFilter`: add `setpts`, `hflip`, `vflip`, `rotate`, `hue` (`hue=h=X`)
6. Add `buildAfFilter`: `atempo` chain for speed, `volume=` for volume
7. Extend `useExport`: wire new filters, adjust `-t` for speed

Export now handles new settings even before the settings UI exists.

### Phase 3 — Waveform Infrastructure

8. Add `utils/waveformExtractor.ts`
9. Modify `useFileImport.ts`: trigger extraction, dispatch `setClipWaveformPeaks`
10. Modify `ClipAction.tsx`: draw waveform canvas for audio clips

Waveforms now appear on any newly imported audio clip.

### Phase 4 — Timeline Zoom

11. Modify `TopBar.tsx`: zoom +/- buttons dispatching `setPixelsPerSecond`
12. Modify `TimelinePanel.tsx`: pass `scaleWidth`, handle modifier+wheel

### Phase 5 — Multi-Select

13. Modify `TimelinePanel.tsx`: Cmd/Ctrl+click → `toggleClipSelection`
14. Modify `ClipAction.tsx`: `isSelected` from `selectedClipIds`
15. Modify `useKeyboardShortcuts.ts`: Delete bulk-deletes `selectedClipIds`
16. Modify `ClipSettingsPanel.tsx`: "Apply to N clips" bulk path

### Phase 6 — Preview Panel

17. Add `utils/waveformExtractor.ts` video preview helpers if needed
18. Add `hooks/usePlayback.ts`
19. Add `components/PreviewPanel.tsx`
20. Modify `AppShell.tsx`: mount `usePlayback`, replace placeholder with `<PreviewPanel>`
21. Modify `TimelinePanel.tsx`: add `timelineRef`, sync cursor from `playheadTime`
22. Modify `useKeyboardShortcuts.ts`: Space = play/pause

Preview is last because it depends on all store shape changes being stable (playheadTime, isPlaying) and it has the most integration surface area.

### Phase 7 — Enhanced Clip Settings UI

23. Extend `ClipSettingsPanel.tsx`: Speed presets, Rotation picker, Volume slider, Hue slider, Flip H/V toggles

Build order rationale: settings UI is last because it just reads/writes store fields that are already wired to the filter graph (Phase 2). No new integration risk.

## Anti-Patterns

### Anti-Pattern 1: Calling `<video>.play()` in the rAF Loop

**What people do:** Call `videoEl.play()` to advance the video during playback, then draw from it.

**Why it's wrong:** Browser media pipeline and rAF are not synchronized. `play()` starts an async decode pipeline that may emit frames at its own rate (30/60fps), not your rAF rate. The audio output will play through the speaker, conflicting with the editor's intent to be a silent preview. `play()` also requires a user gesture on some browsers.

**Do this instead:** Set `videoEl.currentTime` each rAF tick. Keep the video element muted (`muted` attribute). Live audio during preview can be added later as a distinct opt-in feature, not part of MVP preview.

### Anti-Pattern 2: Storing `waveformPeaks` Outside the Clip Object

**What people do:** Put waveform data in a separate store slice or React ref to keep the `Clip` type "clean."

**Why it's wrong:** If waveforms live outside `clips`, then undoing a clip add (via Zundo) removes the clip from `clips` but leaves orphaned peak data. The waveform also won't re-appear on redo without additional wiring.

**Do this instead:** Store `waveformPeaks: number[] | null` directly on `Clip`. It participates in undo/redo naturally. The cost is ~1.6KB per clip in the Zundo history snapshots — completely acceptable.

### Anti-Pattern 3: Using CSS Zoom on the Timeline Wrapper Div

**What people do:** Wrap `<Timeline>` in a `div` with `transform: scaleX(zoom)` or `zoom: 2` to implement timeline zoom.

**Why it's wrong:** The `@xzdarcy` library uses virtualized row rendering (`react-virtualized`). Transform-based zoom breaks the virtual scroll offset calculations — clips will appear at wrong positions and drag snapping will be off.

**Do this instead:** Pass `scaleWidth={pixelsPerSecond}` directly to the `<Timeline>` prop. This is the documented zoom mechanism.

### Anti-Pattern 4: Draining `selectedClipIds` with Multiple `deleteClip` Calls

**What people do:** For bulk delete, iterate `selectedClipIds` and call `deleteClip(id)` in a loop.

**Why it's wrong:** Each `deleteClip` call creates a separate Zundo history snapshot. Pressing Undo once only undoes the last deletion, not the bulk operation.

**Do this instead:** Add a `deleteClips(ids: string[])` action that performs all removals in a single `set()` call. Zundo captures exactly one snapshot for the entire bulk delete.

### Anti-Pattern 5: Reconciling `selectedClipId` and `selectedClipIds` in Two Places

**What people do:** Update `selectedClipId` and `selectedClipIds` in two separate `set()` calls or in two different actions.

**Why it's wrong:** Components subscribing to `selectedClipId` see a stale render cycle where the multi-set is already updated but the single-id is not (or vice versa).

**Do this instead:** `selectClip` and `toggleClipSelection` always update both `selectedClipId` and `selectedClipIds` in the same `set()` call. Plain click: `selectedClipId = id`, `selectedClipIds = new Set([id])`. Cmd/Ctrl+click toggle: `selectedClipIds.has(id)` ? delete : add; `selectedClipId` = last added or last remaining.

## Scaling Considerations

This is a single-user local browser app — scaling is irrelevant in the traditional sense. The concerns are performance limits within a single browser tab:

| Concern | Practical Threshold | Mitigation |
|---------|--------------------|-----------|
| Waveform extraction blocking import UX | Audio files > 10 min | OfflineAudioContext runs in its own thread; never blocks rAF. Non-issue. |
| Video element pool memory | > 20 clips | Each hidden `<video>` holds a decoded frame buffer. For typical editing sessions (<20 clips) this is fine. If needed, pool size can be limited (LRU eviction). |
| Canvas compositing frame rate | 4K source video | Canvas `drawImage` is GPU-accelerated. 1080p draws at 60fps without issue. 4K at 30fps is borderline — downscale the canvas resolution to 1280×720 for preview. |
| Zundo history size | Each snap includes `waveformPeaks` | 200 floats per clip × 10 clips × 50 history entries ≈ 10MB. Acceptable. |
| ffmpeg.wasm export | Speed filter + complex vf chain | Each new filter adds negligible encode overhead. The bottleneck remains the WASM decode/encode loop, not the filter count. |

## Sources

- Direct analysis of `/Users/radu/Developer/micro-ffmpeg/src/` codebase (HIGH confidence)
- `@xzdarcy/react-timeline-editor` type definitions: `dist/interface/timeline.d.ts` — `scaleWidth`, `TimelineState.setTime`, `onCursorDrag` (HIGH confidence)
- `@xzdarcy/timeline-engine` type definitions: `dist/index.d.ts` (HIGH confidence)
- MDN OfflineAudioContext API — standard Web Audio spec (HIGH confidence)
- ffmpeg `setpts`, `atempo`, `hue`, `hflip`, `vflip`, `rotate` filters — ffmpeg documentation (HIGH confidence, well-established filters)

---
*Architecture research for: micro-ffmpeg v1.1 Preview & Polish milestone*
*Researched: 2026-03-17*
