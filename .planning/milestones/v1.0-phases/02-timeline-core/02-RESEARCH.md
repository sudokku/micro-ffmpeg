# Phase 2: Timeline Core - Research

**Researched:** 2026-03-16
**Domain:** React timeline editor integration, Zustand store actions, ffmpeg.wasm frame extraction, drag-and-drop file import
**Confidence:** HIGH (all findings verified against installed node_modules type definitions and existing source code)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**File import — Drop zone**
- Full-canvas drag overlay: dragging a file anywhere over the app window triggers a translucent overlay ("Drop video or audio files here")
- Import button in TopBar opens the native file picker as an alternative entry point
- When the timeline is empty, the middle region shows an empty-state prompt: "Drop files or click Import to get started"

**File import — Track routing**
- Auto-detect by MIME type: `video/*` files go to the video track, `audio/*` files go to the audio track
- No manual track assignment prompt — zero friction

**File import — Appending**
- Always append: new clips are placed after the last existing clip on their respective track
- No confirmation dialog when the timeline already has clips — undo handles mistakes

**Toolbar layout**
- Left sidebar strip (narrow vertical column) holds the tool icons, not the TopBar
- Phase 1 AppShell layout will need to be extended: add a left sidebar column alongside the middle region and timeline
- Two tools in Phase 2: Select (←→) and Blade (✂)

**Tool switching**
- Keyboard shortcuts: V = Select tool, B = Blade tool (NLE convention, like Premiere)
- Active tool stored in `ui.activeTool` (already in store as `'select' | 'blade'`)

**Blade tool interaction**
- With Blade active, clicking directly on a clip splits it at the exact click position
- Click position on the clip's time axis determines the split point
- No intermediate playhead-based step — direct click-to-split

**Clip deletion**
- Click to select (in Select mode) → press Delete or Backspace to remove from timeline
- No confirmation dialog — Cmd+Z undoes the deletion

**Clip visual design — Colors**
- One shared rotating color palette cycling across ALL clips (video and audio alike)
- Each new clip imported gets the next color from the array; clips are distinguished individually, not by track
- Suggested palette (Claude's discretion on exact shades): blue, violet, emerald, amber, rose, sky, fuchsia, teal
- Color is assigned at import time and stored on the Clip (new field: `color: string`)

**Clip visual design — Label**
- Show filename + duration on each clip (e.g., `interview.mp4  2:34`)
- Label truncated to fit clip width; prioritize filename, drop duration if too narrow

**Clip visual design — Selection**
- Selected clip shows a white border ring (2px outline)
- Unselected clips show no border

**Thumbnail generation — Timing**
- Extract immediately on import (not lazy) — triggered as soon as the clip is added to the store
- Extraction runs in the Comlink ffmpeg Web Worker (extending the worker API added in Phase 1)

**Thumbnail generation — Frame count**
- Dynamic: 1 frame per 5 seconds of clip duration (min 1 frame)
- Frames tiled horizontally to fill the clip width in the timeline

**Thumbnail generation — Loading state**
- Animated shimmer/pulse skeleton in the clip's color while ffmpeg.wasm extracts frames
- No layout shift: clip occupies full width from the start; thumbnails replace the shimmer in-place
- `thumbnailUrl` field on Clip (already in store as `string | null`) extended to array: `thumbnailUrls: string[]` (or kept as `thumbnailUrl` pointing to a composite — Claude's discretion on storage shape)

**Undo / redo**
- Cmd+Z → `useStore.temporal.getState().undo()`
- Cmd+Shift+Z → `useStore.temporal.getState().redo()`
- Global keyboard listener (window-level), not tied to any specific component
- Already excluded from Zundo history: `ui`, `export` slices

### Claude's Discretion
- Exact color palette hex values / Tailwind shades
- Left sidebar strip width and icon sizing
- How the full-canvas drop overlay animates in/out
- Clip thumbnail storage shape (`thumbnailUrl: string | null` vs `thumbnailUrls: string[]`)
- Whether `color` is added to the `Clip` type or managed as a separate lookup map
- Minimum clip width before label is hidden entirely
- Exact ffmpeg.wasm command for frame extraction (e.g., `-ss`, `-vframes 1`, output as JPEG blob)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| IMPT-01 | User can drag-and-drop video and audio files onto the editor canvas | HTML5 dragover/drop event pattern on window; MIME type detection via `file.type`; store action `addClip` |
| IMPT-02 | User can use a file picker to import video and audio files | `<input type="file" accept="video/*,audio/*">` triggered via ref; same store action as IMPT-01 |
| TIME-01 | User can see imported video clips on a single video track in the timeline | Store → `TimelineRow[]` derivation; `getActionRender` for custom clip rendering |
| TIME-02 | User can see imported audio clips on a single audio track in the timeline | Same derivation path as TIME-01; `effectId` maps to `'default'` effect |
| TIME-03 | User can trim a clip by dragging its left or right edge | `onActionResizeEnd` callback → `trimClip` store action; `flexible: true` on TimelineAction |
| TIME-04 | User can split a clip at a point using a blade tool | `onClickAction` receives `time` param when Blade active → `splitClip` store action |
| TIME-05 | User can delete a clip from the timeline | `keydown` listener: Delete/Backspace → `deleteClip(ui.selectedClipId)` store action |
| TIME-06 | User can reorder clips by dragging within a track | `onActionMoveEnd` callback → `moveClip` store action; `movable: true` on TimelineAction |
| UNDO-01 | User can undo the last clip operation via Cmd+Z | `useStore.temporal.getState().undo()` — Zundo already wired; needs global keydown listener |
| UNDO-02 | User can redo an undone operation via Cmd+Shift+Z | `useStore.temporal.getState().redo()` — same listener as UNDO-01 |
| PREV-01 | User can see static frame thumbnails extracted from video clips via ffmpeg.wasm | `ffmpeg.exec(["-ss", t, "-i", "input", "-vframes", "1", "out.jpg"])` in Comlink worker; result as blob URL |
</phase_requirements>

---

## Summary

Phase 2 builds on a fully wired Phase 1 chassis. The store shape, Zundo temporal middleware, Comlink worker, and AppShell layout contract all exist. The primary work is: (1) wiring `TimelinePanel` to read from the store instead of static data, (2) adding store actions for all clip mutations, (3) implementing file import (drag-and-drop + file picker), (4) extending the Comlink worker with `@ffmpeg/ffmpeg` frame extraction, and (5) adding the left sidebar and keyboard shortcuts.

The `@xzdarcy/react-timeline-editor` library drives all drag-resize-reorder interactions — the app only needs to respond to its callbacks (`onActionMoveEnd`, `onActionResizeEnd`, `onClickAction`) and dispatch store actions. Custom clip rendering is handled via `getActionRender`, which receives the `TimelineAction` and its row, enabling per-clip color, thumbnail display, and shimmer skeleton. The library's `TimelineAction` shape carries `id`, `start`, `end`, `effectId`, `flexible`, and `movable` — matching directly onto the store's `Clip` fields.

For thumbnail extraction, `@ffmpeg/ffmpeg` v0.12.x is already installed. The Comlink worker currently only exposes `ping()`. Phase 2 extends it with `extractFrames(file: File, timestamps: number[]): Promise<string[]>` using `FFmpeg.load()` → `writeFile` → `exec(["-ss", t, "-i", "input.mp4", "-vframes", "1", "frame_N.jpg"])` → `readFile` → `URL.createObjectURL(new Blob([data]))`. The COOP/COEP headers required for SharedArrayBuffer are already set in `vite.config.ts`.

**Primary recommendation:** Wire store → timeline callbacks first (TIME-01 through TIME-06), then add import (IMPT-01, IMPT-02), then undo/redo keyboard listener (UNDO-01, UNDO-02), then thumbnail extraction (PREV-01). This ordering lets each piece be tested independently.

---

## Standard Stack

### Core (all already installed — no new npm installs needed)

| Library | Installed Version | Purpose | Role in Phase 2 |
|---------|-------------------|---------|-----------------|
| `@xzdarcy/react-timeline-editor` | ^1.0.0 | Timeline UI with drag/resize/reorder | Drives TIME-01 through TIME-06 via callbacks |
| `zustand` | ^5.0.12 | Global state store | Holds all clip data; mutations captured by Zundo |
| `zundo` | ^2.3.0 | Undo/redo temporal middleware | Already wired; UNDO-01/02 just need the keyboard listener |
| `@ffmpeg/ffmpeg` | ^0.12.15 | ffmpeg WebAssembly runtime | Frame extraction inside Comlink worker |
| `@ffmpeg/util` | ^0.12.2 | `fetchFile` utility | Convert `File` → `Uint8Array` for `ffmpeg.writeFile` |
| `comlink` | ^4.4.2 | Web Worker RPC | Worker API proxy already set up; extend with `extractFrames` |
| `react` | ^19.2.4 | UI framework | Component rendering |
| `tailwindcss` | ^4.2.1 | Utility CSS | Clip colors, shimmer animation, sidebar layout |

### No New Dependencies

All required libraries are already installed. Phase 2 is pure implementation.

**Verified:** All versions confirmed from `package.json` in the project root.

---

## Architecture Patterns

### Recommended Project Structure Extension

```
src/
├── store/
│   ├── types.ts          # Add `color` field to Clip; rename thumbnailUrl → thumbnailUrls (or keep as string | null)
│   └── index.ts          # Add store actions: addClip, moveClip, trimClip, splitClip, deleteClip
├── workers/
│   └── ffmpeg.worker.ts  # Extend: add extractFrames(file, timestamps) method
├── hooks/
│   ├── useTemporalStore.ts  # Already exists
│   ├── useKeyboardShortcuts.ts  # NEW: global window keydown for V/B/Delete/Cmd+Z/Cmd+Shift+Z
│   └── useFileImport.ts     # NEW: encapsulates drag-and-drop + file picker logic
├── components/
│   ├── AppShell.tsx         # MODIFY: add left sidebar column
│   ├── TopBar.tsx           # MODIFY: add Import button
│   ├── ToolSidebar.tsx      # NEW: narrow icon strip with Select/Blade buttons
│   ├── TimelinePanel.tsx    # MODIFY: wire to store, add all callbacks
│   ├── ClipAction.tsx       # NEW: custom clip renderer for getActionRender
│   ├── DropOverlay.tsx      # NEW: full-canvas translucent drop target overlay
│   └── EmptyState.tsx       # NEW: "Drop files or click Import" placeholder
```

### Pattern 1: Store → Timeline Derivation

**What:** Convert normalized store state (`clips` Record, `tracks.video.clipIds[]`) into `TimelineRow[]` that the library consumes.

**When to use:** Anywhere `TimelinePanel` reads clip data — computed on every render from store subscriptions.

```typescript
// Source: @xzdarcy/timeline-engine/dist/interface/action.d.ts (verified)
// TimelineAction shape: { id, start, end, effectId, flexible?, movable?, selected? }

function deriveEditorData(
  tracks: StoreState['tracks'],
  clips: StoreState['clips'],
  selectedClipId: string | null
): TimelineRow[] {
  return (['video', 'audio'] as const).map((trackId) => ({
    id: trackId,
    actions: tracks[trackId].clipIds
      .filter((id) => clips[id])
      .map((id) => {
        const clip = clips[id]
        return {
          id: clip.id,
          start: clip.startTime,
          end: clip.endTime,
          effectId: 'default',
          flexible: true,
          movable: true,
          selected: clip.id === selectedClipId,
        }
      }),
  }))
}
```

**Confidence:** HIGH — verified against `TimelineAction` and `TimelineRow` interfaces in installed node_modules.

### Pattern 2: Callback → Store Action Dispatch

**What:** `@xzdarcy/react-timeline-editor` callbacks fire on user interaction with finalized data. Map each callback to a specific store action.

**Verified callback signatures (from `timeline.d.ts`):**

```typescript
// onActionMoveEnd — fires after drag completes (use for reorder/move)
onActionMoveEnd?: (params: {
  action: TimelineAction;  // has updated .start/.end ONLY if same-track move
  row: TimelineRow;
  start: number;
  end: number;
}) => void

// onActionResizeEnd — fires after edge-drag trim
onActionResizeEnd?: (params: {
  action: TimelineAction;
  row: TimelineRow;
  start: number;
  end: number;
  dir: 'right' | 'left';
}) => void

// onClickAction — fires on click (not drag); carries `time` = click position in seconds
onClickAction?: (
  e: React.MouseEvent,
  param: { action: TimelineAction; row: TimelineRow; time: number }
) => void

// onChange — fires after any end-of-interaction; receives full updated editorData
onChange?: (editorData: TimelineRow[]) => void | boolean
```

**Mapping to store actions:**

| Callback | Store Action | Notes |
|----------|-------------|-------|
| `onActionMoveEnd` | `moveClip(id, newStart, newEnd)` | Library provides final `start`/`end` |
| `onActionResizeEnd` | `trimClip(id, newStart, newEnd)` | Library handles constraint enforcement |
| `onClickAction` (Blade active) | `splitClip(id, time)` | `time` param = split point in seconds |
| `onClickAction` (Select active) | `selectClip(id)` → `ui.selectedClipId` | Does NOT go into undo history (ui slice) |
| `onChange` | Do NOT use for mutations | Use only if needed for re-sync edge cases |

**Critical:** Do NOT use `onChange` as the primary mutation path — it fires redundantly after every end-callback and would double-mutate the store.

### Pattern 3: Store Action Implementation for Undo Capture

**What:** All clip mutations MUST go through Zustand `set()` so Zundo captures them automatically.

```typescript
// Source: verified against existing store/index.ts pattern
// All actions added as methods inside the create() call

addClip: (file: File, trackId: 'video' | 'audio', duration: number) =>
  set((state) => {
    const id = crypto.randomUUID()
    const lastClipId = state.tracks[trackId].clipIds.at(-1)
    const lastClip = lastClipId ? state.clips[lastClipId] : null
    const startTime = lastClip ? lastClip.endTime : 0
    const newClip: Clip = {
      id,
      trackId,
      sourceFile: file,
      sourceDuration: duration,
      startTime,
      endTime: startTime + duration,
      trimStart: 0,
      trimEnd: 0,
      color: CLIP_COLORS[nextColorIndex % CLIP_COLORS.length],  // managed in action
      thumbnailUrls: [],
    }
    return {
      clips: { ...state.clips, [id]: newClip },
      tracks: {
        ...state.tracks,
        [trackId]: {
          ...state.tracks[trackId],
          clipIds: [...state.tracks[trackId].clipIds, id],
        },
      },
    }
  }),

splitClip: (clipId: string, splitTime: number) =>
  set((state) => {
    const original = state.clips[clipId]
    if (!original || splitTime <= original.startTime || splitTime >= original.endTime) {
      return state  // guard: split point must be inside clip bounds
    }
    const leftId = crypto.randomUUID()
    const rightId = crypto.randomUUID()
    const left: Clip = { ...original, id: leftId, endTime: splitTime }
    const right: Clip = { ...original, id: rightId, startTime: splitTime }
    const track = state.tracks[original.trackId]
    const idx = track.clipIds.indexOf(clipId)
    const newClipIds = [
      ...track.clipIds.slice(0, idx),
      leftId,
      rightId,
      ...track.clipIds.slice(idx + 1),
    ]
    const { [clipId]: _removed, ...remainingClips } = state.clips
    return {
      clips: { ...remainingClips, [leftId]: left, [rightId]: right },
      tracks: {
        ...state.tracks,
        [original.trackId]: { ...track, clipIds: newClipIds },
      },
    }
  }),
```

### Pattern 4: getActionRender — Custom Clip Rendering

**What:** The library calls `getActionRender(action, row)` for every clip. Return a React node to render inside the clip's bounding box on the timeline.

```typescript
// Source: timeline.d.ts line 80 (verified)
// getActionRender?: (action: TimelineAction, row: TimelineRow) => ReactNode

// In TimelinePanel:
const getActionRender = useCallback(
  (action: TimelineAction, _row: TimelineRow): ReactNode => {
    const clip = clips[action.id]
    if (!clip) return null
    return <ClipAction clip={clip} isSelected={selectedClipId === clip.id} />
  },
  [clips, selectedClipId]
)
```

**The ClipAction component** renders the clip's color background, thumbnail images (or shimmer), filename/duration label, and selection border.

### Pattern 5: ffmpeg.wasm Frame Extraction in Comlink Worker

**What:** Extend the existing Comlink worker with frame extraction. `FFmpeg` from `@ffmpeg/ffmpeg` must be instantiated and loaded inside the worker — never on the main thread.

```typescript
// Source: @ffmpeg/ffmpeg/dist/esm/classes.d.ts (verified)
// Worker has access to FFmpeg class, fetchFile from @ffmpeg/util

import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'

let ffmpeg: FFmpeg | null = null

async function ensureLoaded() {
  if (!ffmpeg) {
    ffmpeg = new FFmpeg()
    await ffmpeg.load()  // loads WASM; must be called before any exec()
  }
}

// Exposed via Comlink:
async extractFrames(file: File, timestamps: number[]): Promise<string[]> {
  await ensureLoaded()
  await ffmpeg!.writeFile('input', await fetchFile(file))
  const urls: string[] = []
  for (let i = 0; i < timestamps.length; i++) {
    const outName = `frame_${i}.jpg`
    await ffmpeg!.exec([
      '-ss', String(timestamps[i]),
      '-i', 'input',
      '-vframes', '1',
      '-q:v', '5',         // JPEG quality 1-31 (lower = better); 5 is good for thumbnails
      outName,
    ])
    const data = await ffmpeg!.readFile(outName) as Uint8Array
    const blob = new Blob([data], { type: 'image/jpeg' })
    urls.push(URL.createObjectURL(blob))
    await ffmpeg!.deleteFile(outName)  // clean up WASM virtual FS
  }
  await ffmpeg!.deleteFile('input')
  return urls
}
```

**Timestamp computation** (1 frame per 5 seconds, min 1):
```typescript
function computeTimestamps(duration: number): number[] {
  const count = Math.max(1, Math.floor(duration / 5))
  return Array.from({ length: count }, (_, i) => (i + 0.5) * (duration / count))
}
```

**Confidence:** HIGH — verified against `@ffmpeg/ffmpeg` class interface and `@ffmpeg/util` fetchFile signature in installed node_modules.

### Pattern 6: HTML5 Drag-and-Drop File Import

**What:** Global window-level drag events to detect file drops anywhere on the canvas.

```typescript
// No external library needed — native HTML5 File API
useEffect(() => {
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer?.types.includes('Files')) setShowOverlay(true)
  }
  const handleDragLeave = (e: DragEvent) => {
    // Only hide if leaving the window entirely
    if (e.relatedTarget === null) setShowOverlay(false)
  }
  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setShowOverlay(false)
    const files = Array.from(e.dataTransfer?.files ?? [])
    files.forEach(importFile)
  }
  window.addEventListener('dragover', handleDragOver)
  window.addEventListener('dragleave', handleDragLeave)
  window.addEventListener('drop', handleDrop)
  return () => { /* remove all three */ }
}, [])
```

**MIME detection:**
```typescript
function getTrackId(file: File): 'video' | 'audio' | null {
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'audio'
  return null  // ignore unknown types silently
}
```

### Pattern 7: Global Keyboard Shortcuts

**What:** Single `useEffect` with `window.addEventListener('keydown')` wired once at the AppShell level.

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    const isMac = navigator.platform.includes('Mac')
    const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey

    if (e.key === 'v' || e.key === 'V') { setActiveTool('select'); return }
    if (e.key === 'b' || e.key === 'B') { setActiveTool('blade'); return }
    if (ctrlOrCmd && e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault()
      useStore.temporal.getState().redo()
      return
    }
    if (ctrlOrCmd && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault()
      useStore.temporal.getState().undo()
      return
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedClipId) {
      e.preventDefault()
      deleteClip(selectedClipId)
    }
  }
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [selectedClipId, setActiveTool, deleteClip])
```

**Critical:** Check `Cmd+Shift+Z` BEFORE `Cmd+Z` in the handler — otherwise Cmd+Shift+Z triggers undo first.

### Anti-Patterns to Avoid

- **Using `onChange` as the mutation source:** The library fires `onChange` as a notification after every end-callback. If store actions are dispatched from both `onActionMoveEnd` AND `onChange`, every operation is applied twice. Use only the specific end-callbacks for mutations.
- **Holding timeline position state outside Zustand:** Any clip position computed in a component's local state will diverge from the store after undo. All clip data lives in the store exclusively.
- **Importing `@ffmpeg/ffmpeg` on the main thread:** The COOP/COEP headers are set for the dev server only. FFmpeg must stay in the worker. The existing `ffmpeg.proxy.ts` singleton pattern enforces this correctly.
- **Calling `ffmpeg.load()` on every extraction:** Load once per worker lifetime, guard with a boolean/instance check. Re-loading re-initializes WASM and is very slow.
- **Using `URL.createObjectURL` without cleanup:** Blob URLs for thumbnails are never revoked in Phase 2 (acceptable for v1 given limited clip counts), but Phase 3/4 should revoke them when clips are deleted.
- **Dispatching UI mutations (selectedClipId, activeTool) through Zundo-tracked paths:** These are in the `ui` slice which is explicitly excluded from partialize. Use `useStore.setState({ ui: ... })` or actions that only mutate `ui` — they will NOT be recorded in undo history.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Timeline drag, resize, snap, reorder | Custom drag handlers, mouse position math | `@xzdarcy/react-timeline-editor` callbacks | Library handles pixel→time conversion, snap-to-grid, edge constraints, multi-action collision — 500+ lines of complex math |
| Undo/redo stack | Custom history array with deep clone | Zundo `.undo()` / `.redo()` | Already wired; handles deep equality, partialize, clear — any custom impl will break undo+UI isolation |
| Video frame extraction | Canvas `drawImage` / video element seek | `ffmpeg.exec` with `-vframes 1` | Canvas approach requires browser video decode + seek latency per frame; ffmpeg gives consistent results without video element lifecycle |
| File→Uint8Array conversion | `FileReader.readAsArrayBuffer` callback soup | `fetchFile(file)` from `@ffmpeg/util` | Single async call, handles all input types (File, Blob, URL, base64) |

**Key insight:** The previous Vue attempt failed because it hand-rolled timeline drag interactions. The entire value of `@xzdarcy/react-timeline-editor` is in its drag/resize/snap math — respect the callback contract and never bypass it.

---

## Common Pitfalls

### Pitfall 1: `onChange` double-mutation
**What goes wrong:** Registering both `onActionMoveEnd` (to update store) and `onChange` (to "sync" state) causes every move to apply twice, doubling the position delta or creating duplicate undo entries.
**Why it happens:** Developers assume `onChange` is the "commit" event and `onActionMoveEnd` is a preview. Actually, `onActionMoveEnd` fires at commit time with final data. `onChange` is a post-hoc notification.
**How to avoid:** Use `onActionMoveEnd` / `onActionResizeEnd` exclusively. Only use `onChange` if you need to intercept and return `false` to block an operation.
**Warning signs:** Clips jump to wrong positions after drop; every undo requires two Cmd+Z presses.

### Pitfall 2: `editorData` Stale Closure
**What goes wrong:** `getActionRender` or callback functions capture a stale snapshot of `clips` from before a recent store update.
**Why it happens:** React memoization or callback closures not updated when store changes.
**How to avoid:** Use `useCallback` with `[clips, selectedClipId]` in the deps array for `getActionRender`. Subscribe to store with individual selectors, not full state.
**Warning signs:** Thumbnails don't appear after extraction; selection highlight doesn't update.

### Pitfall 3: ffmpeg.wasm load timing / SharedArrayBuffer
**What goes wrong:** `ffmpeg.load()` is called but WASM fails to initialize because `SharedArrayBuffer` is unavailable.
**Why it happens:** COOP/COEP headers are in `vite.config.ts` for the dev server only. In production builds or preview mode, `vite preview` doesn't automatically apply server headers.
**How to avoid:** The dev server is correctly configured. For production, ensure the hosting environment sets `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`. Phase 2 (dev only) is fine.
**Warning signs:** `ffmpeg.load()` throws `SharedArrayBuffer is not defined` or `TypeError: Cross origin...`.

### Pitfall 4: Zundo records thumbnail URL changes as undo-able
**What goes wrong:** After undoing a clip add, the thumbnail blob URL stored in `clips[id].thumbnailUrls` remains valid but orphaned. After redoing, extraction may run twice (once on import, once on redo if extraction is re-triggered by a store subscription watching `clips`).
**Why it happens:** Thumbnail extraction is triggered by a store subscription watching `clips`. Redo restores the clip → subscription fires → extraction kicks off again for the same clip.
**How to avoid:** Guard extraction by clip ID — track "in-progress" or "done" extractions in a `useRef` Set (outside the store, so it is NOT tracked by Zundo). On add-clip event, check the ref before dispatching extraction.
**Warning signs:** Repeated ffmpeg.exec calls for the same file; multiple shimmer flashes.

### Pitfall 5: Blade split with click outside clip bounds
**What goes wrong:** `onClickAction` fires with a `time` value at the very edge of a clip (within floating-point epsilon of `startTime` or `endTime`). Splitting at `startTime` or `endTime` produces a zero-duration clip.
**Why it happens:** User clicks near the edge; rounding in the library.
**How to avoid:** Guard in `splitClip` store action: only split if `time > startTime + EPSILON && time < endTime - EPSILON` where `EPSILON = 0.01` (seconds).
**Warning signs:** Zero-duration clips appear; timeline renders a clip with `end === start`.

### Pitfall 6: AppShell layout shift from sidebar column
**What goes wrong:** Adding the left sidebar column changes the layout flow, shifting the timeline area's bounding rect. `@xzdarcy/react-timeline-editor` may miscompute pixel positions if it cached container width at mount before the sidebar was added.
**Why it happens:** Library uses `ResizeObserver` internally. If the library's container resizes after mount, it should re-measure — but only if the container has `height: 100%` / `width: 100%` or explicit px dimensions.
**How to avoid:** Keep the timeline container's `style={{ height: '100%', width: '100%' }}` (already set in Phase 1). The sidebar should be a `flex-none` sibling column in the AppShell's flex row, not a parent overlay. The timeline takes `flex-1` or explicit width in the remaining space.

---

## Code Examples

### Store: addClip action signature
```typescript
// types.ts additions
export interface Clip {
  id: string
  trackId: 'video' | 'audio'
  sourceFile: File
  sourceDuration: number
  startTime: number
  endTime: number
  trimStart: number
  trimEnd: number
  color: string          // NEW in Phase 2 — assigned at import
  thumbnailUrls: string[] // CHANGED from thumbnailUrl: string | null
}
```

### Clip color palette (Claude's discretion — recommended Tailwind 500 shades)
```typescript
// src/constants/clipColors.ts
export const CLIP_COLORS = [
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#f43f5e', // rose-500
  '#0ea5e9', // sky-500
  '#d946ef', // fuchsia-500
  '#14b8a6', // teal-500
] as const
```

### TimelinePanel: derived editorData
```typescript
// src/components/TimelinePanel.tsx
import { useStore } from '../store'

export function TimelinePanel() {
  const tracks = useStore((s) => s.tracks)
  const clips = useStore((s) => s.clips)
  const selectedClipId = useStore((s) => s.ui.selectedClipId)
  const { moveClip, trimClip, splitClip, selectClip } = useStore((s) => s.actions)
  const activeTool = useStore((s) => s.ui.activeTool)

  const editorData = useMemo(
    () => deriveEditorData(tracks, clips, selectedClipId),
    [tracks, clips, selectedClipId]
  )

  const effects = useMemo(() => ({ default: {} }), [])

  // ... callbacks + getActionRender
}
```

### Shimmer animation (Tailwind)
```tsx
// ClipAction.tsx — loading state while thumbnailUrls is empty
<div
  className="animate-pulse h-full w-full rounded"
  style={{ backgroundColor: clip.color + '66' }} // 40% opacity
/>
```

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| `thumbnailUrl: string \| null` (single frame) | `thumbnailUrls: string[]` (multiple frames tiled) | Phase 1 stubbed single URL; Phase 2 uses array |
| Static `editorData` in TimelinePanel | Derived from store via `useMemo` | Phase 1 had hardcoded empty rows |
| Worker with only `ping()` | Worker with `ping()` + `extractFrames()` | Phase 1 kept worker boundary clean; Phase 2 adds @ffmpeg/ffmpeg import |
| No store actions | `addClip`, `moveClip`, `trimClip`, `splitClip`, `deleteClip`, `selectClip`, `setActiveTool` | Phase 1 had no actions, just initial state |

---

## Open Questions

1. **Duration detection for audio/video files before ffmpeg.wasm**
   - What we know: `sourceDuration` is needed at import time (before frame extraction) to compute `endTime` and thumbnail count.
   - What's unclear: The cheapest way to get duration without ffmpeg — HTML5 `<video>`/`<audio>` element with `loadedmetadata` event vs. ffprobe inside the worker.
   - Recommendation: Use a temporary `<video>` or `<audio>` element on the main thread at import time (`URL.createObjectURL(file)` → `el.duration` after `loadedmetadata`). This is synchronous with the browser's decode and does not require the WASM worker. For audio files, `<audio>` works the same way. Clean up with `URL.revokeObjectURL` after reading duration.

2. **Comlink transferable: `File` object across Worker boundary**
   - What we know: Comlink transfers arguments via structured clone. `File` extends `Blob` and IS structured-cloneable in modern browsers.
   - What's unclear: Whether `fetchFile(file)` inside the worker receives the file bytes correctly when the `File` was structured-cloned (not transferred as Transferable).
   - Recommendation: Use Comlink's `transfer()` wrapper to transfer the `File` as a Transferable: `proxy.extractFrames(Comlink.transfer(file, []), timestamps)`. If the browser doesn't support `File` as Transferable, fall back to reading `file.arrayBuffer()` on the main thread and passing `Uint8Array` to the worker instead.

3. **`getActionRender` and timeline row label rendering**
   - What we know: `getActionRender` renders inside the clip's bounding box. There is no separate "row header" API in the library's public interface (not visible in `timeline.d.ts` or `common_prop.d.ts`).
   - What's unclear: Whether row labels ("Video", "Audio") can be added as track headers, or whether the library renders them automatically.
   - Recommendation: Check the library's rendered HTML in the browser to see if it produces row labels. If not, the left sidebar or an absolutely positioned overlay can render "Video" / "Audio" track labels aligned with the two rows. This is cosmetic and does not block any requirement.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.x + React Testing Library 16.x + happy-dom 20.x |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| IMPT-01 | Drop event dispatches `addClip` for video and audio files | unit | `npx vitest run src/hooks/useFileImport.test.ts` | ❌ Wave 0 |
| IMPT-02 | File picker onChange dispatches `addClip` | unit | `npx vitest run src/hooks/useFileImport.test.ts` | ❌ Wave 0 |
| TIME-01 | Store clips appear as TimelineRow actions for video track | unit | `npx vitest run src/components/TimelinePanel.test.tsx` | ❌ Wave 0 (existing file needs rewrite) |
| TIME-02 | Store clips appear as TimelineRow actions for audio track | unit | `npx vitest run src/components/TimelinePanel.test.tsx` | ❌ Wave 0 |
| TIME-03 | `onActionResizeEnd` callback dispatches `trimClip` with correct start/end | unit | `npx vitest run src/store/store.test.ts` | ❌ Wave 0 |
| TIME-04 | `splitClip` splits a clip into two at the given time | unit | `npx vitest run src/store/store.test.ts` | ❌ Wave 0 |
| TIME-05 | `deleteClip` removes clip from `clips` and `track.clipIds` | unit | `npx vitest run src/store/store.test.ts` | ❌ Wave 0 |
| TIME-06 | `moveClip` updates startTime/endTime in store | unit | `npx vitest run src/store/store.test.ts` | ❌ Wave 0 |
| UNDO-01 | After `addClip`, `undo()` removes the clip from store | unit | `npx vitest run src/store/store.test.ts` | ❌ Wave 0 |
| UNDO-02 | After undo, `redo()` restores the clip | unit | `npx vitest run src/store/store.test.ts` | ❌ Wave 0 |
| PREV-01 | `extractFrames` returns array of data URLs for a video file | unit (node env) | `npx vitest run src/workers/ffmpeg.worker.test.ts` | ❌ Wave 0 (manual-only for WASM; see note) |

**PREV-01 note:** The `extractFrames` implementation cannot be unit-tested in Vitest without a real WASM environment. Test strategy: (a) test the worker API contract shape (method exists, returns `string[]`); (b) test `computeTimestamps` helper function for correct timestamp count; (c) manual smoke test in dev browser. Mark as manual-only for full WASM path.

**TIME-01/02 note:** The existing `TimelinePanel.test.tsx` tests static Phase 1 data. These tests should be updated in Wave 0 to test store-derived data by populating the store before rendering.

### Sampling Rate
- **Per task commit:** `npx vitest run src/store/store.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/store/store.test.ts` — add tests for `addClip`, `moveClip`, `trimClip`, `splitClip`, `deleteClip` store actions, and undo/redo of each
- [ ] `src/hooks/useFileImport.test.ts` — covers IMPT-01, IMPT-02 (drop event + file picker); mock store `addClip`
- [ ] `src/components/TimelinePanel.test.tsx` — update existing file: populate store before render, assert derived `editorData` rows have correct actions
- [ ] `src/workers/ffmpeg.worker.test.ts` — extend existing file: add contract test for `extractFrames` method signature; add `computeTimestamps` unit test

---

## Sources

### Primary (HIGH confidence)
- `node_modules/@xzdarcy/react-timeline-editor/dist/interface/timeline.d.ts` — All Timeline callback signatures, `EditData` props, `getActionRender` signature
- `node_modules/@xzdarcy/timeline-engine/dist/interface/action.d.ts` — `TimelineAction` fields (`id`, `start`, `end`, `effectId`, `flexible`, `movable`, `selected`), `TimelineRow` fields
- `node_modules/@ffmpeg/ffmpeg/dist/esm/classes.d.ts` — `FFmpeg.load()`, `FFmpeg.exec()`, `FFmpeg.writeFile()`, `FFmpeg.readFile()`, `FFmpeg.deleteFile()` signatures
- `node_modules/@ffmpeg/util/dist/esm/index.d.ts` — `fetchFile(file: File | Blob | string): Promise<Uint8Array>` signature
- `src/store/types.ts` — Current `Clip`, `Track`, `UiState`, `StoreState` shapes (Phase 1)
- `src/store/index.ts` — Zundo wiring, partialize pattern, `TrackedState` type
- `src/workers/ffmpeg.worker.ts` — Current worker exposing only `ping()`
- `src/workers/ffmpeg.proxy.ts` — Singleton worker proxy pattern
- `src/hooks/useTemporalStore.ts` — Zundo temporal hook
- `vite.config.ts` — COOP/COEP headers confirmed present; `@ffmpeg/*` excluded from optimizeDeps
- `package.json` — All installed versions confirmed

### Secondary (MEDIUM confidence)
- Phase 1 CONTEXT.md — Established patterns: controlled display, store-first, test environment choices
- Phase 2 CONTEXT.md — Locked decisions on all user-facing behaviors

### Tertiary (LOW confidence — not needed given direct code inspection)
None required. All findings verified against installed source.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified against installed node_modules and package.json
- Timeline callback API: HIGH — verified against installed .d.ts files
- ffmpeg.wasm API: HIGH — verified against installed classes.d.ts
- Store action patterns: HIGH — extrapolated from existing Phase 1 patterns and verified types
- Architecture layout: HIGH — derived from existing AppShell.tsx and Phase 1 contract
- Thumbnail extraction timing/WASM pitfalls: MEDIUM — known @ffmpeg/ffmpeg patterns; WASM runtime behavior not fully testable offline

**Research date:** 2026-03-16
**Valid until:** 2026-06-16 (stable stack — all deps locked in package.json)
