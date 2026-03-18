# Phase 10: Preview Panel - Research

**Researched:** 2026-03-19
**Domain:** Canvas-based video preview, rAF playback loop, xzdarcy timeline cursor sync, HTML audio/video element management
**Confidence:** HIGH (all critical APIs verified from installed node_modules type declarations and project source)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Controls bar below canvas: `[MM:SS] [▶/⏸] [MM:SS / total]`
- Timecode format: MM:SS (not HH:MM:SS — user decided MM:SS)
- Canvas aspect ratio: letterbox/pillarbox — video centered with black bars; canvas fills available panel space
- Empty state (no clips): dark canvas + centered hint text ("Import clips to preview")
- End of timeline: stop and hold last frame; play button resets to ▶
- Clicking the timeline ruler (time axis): seeks AND pauses — sets playheadTime + isPlaying = false
- Space bar: global toggle in useKeyboardShortcuts
- Audio gaps between audio clips: silence (HTML audio element paused/unloaded during gaps)
- Video clip audio: plays naturally (video elements unmuted; preview sounds like export)
- Canvas 2D filter API for blur/brightness/contrast/saturation: `ctx.filter = '...'` set before each drawImage
- Crop: source-rect clipping in 9-arg drawImage
- Flip: ctx.save() + ctx.scale(-1,1) / ctx.scale(1,-1) with translate
- Rotation 0/90/180/270: ctx.rotate() with center-translate
- Fidelity goal: visually correct approximation, not pixel-perfect to ffmpeg
- New store actions needed: `setPlayheadTime(time: number)` and `setIsPlaying(playing: boolean)`

### Claude's Discretion
- Implementation of the rAF loop (useRef handle, cancel on unmount and pause)
- Whether hidden video elements are one-per-clip or pooled; lifecycle management
- How to wire the xzdarcy TimelineState ref's cursor/time events to setPlayheadTime
- Exact layout proportions within the `<main>` panel (canvas vs controls bar height ratio)
- Whether a dedicated `usePreview` hook encapsulates all rAF + video element logic or lives in a component

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PREV-01 | User can see the current timeline frame rendered in the central preview panel | rAF loop + hidden video elements + canvas drawImage; clip-local time seek formula; letterbox layout |
| PREV-02 | User can play/pause timeline playback with audio | rAF loop controls; isPlaying store state; audio element management; Space bar in useKeyboardShortcuts; xzdarcy cursor sync during playback |
| PREV-03 | User can see a timecode display (MM:SS) in the preview panel | formatTimecode() helper; updates on every rAF tick and on scrub |
| PREV-04 | User can see per-clip filters (blur/brightness/contrast/saturation/crop) reflected live in the preview canvas | Canvas 2D filter string construction from ClipSettings; 9-arg drawImage for crop; ctx.save/rotate/scale for flip+rotation |
</phase_requirements>

---

## Summary

Phase 10 builds a live canvas preview using a custom rAF loop — no third-party player library. The xzdarcy `TimelineState` ref (already set up in TimelinePanel.tsx) exposes `setTime()` to push playhead position into the timeline cursor bidirectionally, and `onCursorDrag` / `onClickTimeArea` callbacks to receive user seeks. The store gains two new actions (`setPlayheadTime`, `setIsPlaying`) that live in the `ui` slice and are therefore already excluded from Zundo.

Hidden `HTMLVideoElement` instances (one per video clip, following the same objectURL pattern as `useThumbnailExtractor`) are kept alive throughout the preview session. On each rAF tick, the active clip's video element is seeked to the clip-local timestamp and drawn to canvas with Canvas 2D filter transforms applied. Audio clips on the audio track are managed by separate `HTMLAudioElement` instances. Video clip audio plays naturally through the video element; no separate audio element is created for video clips to avoid double-audio.

The entire rAF loop, video element lifecycle, and canvas drawing belong in a `usePreview` hook (Claude's discretion) to keep `PreviewPanel` as a thin rendering component. The hook is mounted once in `AppShell` (alongside `useThumbnailExtractor`, `useWaveformExtractor`) so its video elements survive route changes and panel rerenders.

**Primary recommendation:** One `usePreview` hook mounts video elements once, runs the rAF loop, and exposes nothing to consumers — all state flows through the Zustand store. PreviewPanel reads from the store and renders the canvas + controls bar.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Canvas 2D API | browser built-in | Frame rendering with filters | Only option without ffmpeg roundtrip; `ctx.filter` supports all required CSS filter functions |
| HTMLVideoElement | browser built-in | Source of decoded video frames | Native seek + draw; zero decode overhead vs ffmpeg WASM for preview |
| HTMLAudioElement | browser built-in | Audio-only clip playback | Lightweight; seek to offset; pause during gaps |
| requestAnimationFrame | browser built-in | Playback timing loop | Standard 60fps draw loop; self-cancelling via returned ID |
| Zustand `useStore` | already installed | Playhead time + isPlaying state | Consistent with all other store state in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `URL.createObjectURL` | browser built-in | Create src for hidden video/audio elements | Called once per clip on first preview; revoked on clip deletion |
| `useRef<number>` | React built-in | Store rAF ID for cancellation | Required pattern (STATE.md decision) |
| `useRef<HTMLVideoElement>` | React built-in | Hold live video element outside React render | Video elements must survive React rerenders without being recreated |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom rAF loop | xzdarcy engine play() | Engine fires action callbacks, not frame draw callbacks — not designed for canvas rendering |
| One video element per clip | Single pooled video element | Single element requires seek on every clip boundary; seek latency causes frame gaps. Per-clip elements stay primed at their last position |
| Canvas 2D filter | CSS filter on `<img>` overlay | CSS filter can't access raw frame data for drawImage; canvas is the only option for realtime filter preview |

**Installation:** No new packages required. All APIs are browser built-ins or already in the dependency tree.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── hooks/
│   └── usePreview.ts         # rAF loop + video element lifecycle (new)
├── components/
│   └── PreviewPanel.tsx      # Canvas + controls bar (new)
├── utils/
│   └── buildCanvasFilter.ts  # ClipSettings → CSS filter string (new)
└── store/
    ├── types.ts              # Add setPlayheadTime, setIsPlaying to StoreActions
    └── index.ts              # Implement actions + add to partialize exclusion
```

### Pattern 1: xzdarcy Cursor Sync (bidirectional)

**What:** Two-direction sync between store's `playheadTime` and the xzdarcy timeline cursor.

**Direction A — User drags cursor or clicks time area → store:**
The `Timeline` component already accepts `onCursorDrag`, `onCursorDragEnd`, and `onClickTimeArea` props (confirmed in `timeline.d.ts` lines 202-214).

- `onCursorDrag={(time) => setPlayheadTime(time)}` — live update while dragging
- `onCursorDragEnd={(time) => setPlayheadTime(time)}` — final position on release
- `onClickTimeArea={(time) => { setPlayheadTime(time); setIsPlaying(false); return true }}` — seek+pause on ruler click (user decision)

**Direction B — store.playheadTime changes → timeline cursor:**
`timelineRef.current.setTime(playheadTime)` pushes the new time into the xzdarcy cursor. This must be called from a `useEffect` that watches `playheadTime` in `TimelinePanel`, OR from the `usePreview` rAF tick callback. Prefer calling it from `usePreview` on each tick to keep cursor in sync during playback without triggering a React render cycle.

**Important:** `timelineRef` is already set up in `TimelinePanel.tsx` (`useRef<TimelineState>(null)`). The `setTime` method is on `TimelineState` (confirmed at `timeline.d.ts` line 243). During playback, call `timelineRef.current.setTime(playheadTime)` from within the rAF loop. However, `usePreview` does not have access to `timelineRef` — two approaches:

Option A: Pass `timelineRef` as a parameter to `usePreview` from `TimelinePanel` (creates coupling).
Option B: Subscribe to store `playheadTime` in `TimelinePanel` via `useEffect` and call `timelineRef.current.setTime()` there (clean separation).

**Recommendation:** Option B — keep `usePreview` agnostic of the timeline component. In `TimelinePanel`, add a `useEffect(() => { timelineRef.current?.setTime(playheadTime) }, [playheadTime])`. This fires on every `setPlayheadTime` call, which includes rAF ticks. The effect runs synchronously after render, which is fast enough for 60fps.

**Warning:** Do NOT call `timelineRef.current.setTime()` inside the Timeline's `onCursorDrag` callback — that creates a feedback loop (drag → setPlayheadTime → effect → setTime → triggers drag again).

### Pattern 2: rAF Playback Loop

**What:** requestAnimationFrame loop that advances `playheadTime` and draws frames.

**Implementation in `usePreview.ts`:**
```typescript
// Source: project STATE.md + browser rAF spec
const rafRef = useRef<number>(0)
const lastRealTimeRef = useRef<number>(0)

function tick(realTime: DOMHighResTimeStamp) {
  const store = useStore.getState()
  if (!store.ui.isPlaying) return  // stop condition

  const dt = (realTime - lastRealTimeRef.current) / 1000
  lastRealTimeRef.current = realTime

  const totalDuration = computeTotalDuration(store)
  const newPlayheadTime = store.ui.playheadTime + dt

  if (newPlayheadTime >= totalDuration) {
    // End of timeline: hold last frame, stop
    useStore.getState().setPlayheadTime(totalDuration)
    useStore.getState().setIsPlaying(false)
    drawFrame(totalDuration)
    return
  }

  useStore.getState().setPlayheadTime(newPlayheadTime)
  drawFrame(newPlayheadTime)
  rafRef.current = requestAnimationFrame(tick)
}

// Start on isPlaying=true
useEffect(() => {
  if (isPlaying) {
    lastRealTimeRef.current = performance.now()
    rafRef.current = requestAnimationFrame(tick)
  } else {
    cancelAnimationFrame(rafRef.current)
    // Draw current frame on pause/seek (for scrubbing)
    drawFrame(playheadTime)
  }
  return () => cancelAnimationFrame(rafRef.current)
}, [isPlaying])
```

**React 19 Strict Mode:** Double-mount in dev will start+cancel+start the loop. The cleanup `cancelAnimationFrame` handles this correctly. `lastRealTimeRef` reset on each play start prevents `dt` spike after cancel.

### Pattern 3: Video Element Pool

**What:** One `HTMLVideoElement` per video clip, created on import, kept alive for the preview session.

**Lifecycle:**
```typescript
// Source: project useThumbnailExtractor.ts pattern
const videoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map())

// On new clip detected (subscribe to store):
const el = document.createElement('video')
el.src = URL.createObjectURL(clip.sourceFile)
el.preload = 'auto'
el.muted = false  // video audio plays naturally (user decision)
el.style.display = 'none'
document.body.appendChild(el)  // must be in DOM to decode
videoElementsRef.current.set(clip.id, el)

// On clip removed:
const el = videoElementsRef.current.get(clipId)
if (el) {
  URL.revokeObjectURL(el.src)
  el.remove()
  videoElementsRef.current.delete(clipId)
}
```

**Seek formula:** For a clip at `startTime` with `trimStart` offset, at `playheadTime`:
```typescript
const clipLocalTime = trimStart + (playheadTime - startTime)
// clipLocalTime is the position within the source file to seek to
el.currentTime = clipLocalTime
```

**Note:** `el.currentTime` assignment is asynchronous; the browser may not have the frame ready immediately. For scrubbing (non-playing), listen to `el.seeked` event before drawing. During playback at normal speed, the previous frame is acceptable if the seek hasn't resolved — visible artifact is minimal.

### Pattern 4: Canvas Drawing with Filters + Transform

**What:** Draw the active video clip's current frame to canvas, applying ClipSettings transforms in order: rotate → flip → drawImage with crop rect → filter string.

**Correct transform order for rotation + flip:**
```typescript
// Source: Canvas 2D spec, confirmed via MDN
function drawClipFrame(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  videoEl: HTMLVideoElement,
  settings: ClipSettings,
  clip: Clip
) {
  const cw = canvas.width
  const ch = canvas.height

  // Compute letterbox destination rect
  const srcW = clip.sourceWidth
  const srcH = clip.sourceHeight
  const scale = Math.min(cw / srcW, ch / srcH)
  const dw = srcW * scale
  const dh = srcH * scale
  const dx = (cw - dw) / 2
  const dy = (ch - dh) / 2

  // Source rect (crop)
  const sx = settings.crop ? settings.crop.x : 0
  const sy = settings.crop ? settings.crop.y : 0
  const sw = settings.crop ? settings.crop.width : srcW
  const sh = settings.crop ? settings.crop.height : srcH

  // Apply CSS filter
  ctx.filter = buildCanvasFilter(settings)

  ctx.save()

  // Translate to canvas center for rotation
  ctx.translate(cw / 2, ch / 2)

  // Rotation
  if (settings.rotation !== 0) {
    ctx.rotate((settings.rotation * Math.PI) / 180)
  }

  // Flip (with translate to keep in frame after rotation)
  if (settings.flipH) ctx.scale(-1, 1)
  if (settings.flipV) ctx.scale(1, -1)

  // Draw (offset back from center)
  ctx.drawImage(videoEl, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh)

  ctx.restore()
  ctx.filter = 'none'  // reset filter for next frame
}
```

**For 90°/270° rotation**, source and destination dimensions swap. The letterbox calculation needs to account for the rotated natural dimensions:
```typescript
// When rotation is 90 or 270, swap srcW/srcH for letterbox calc
const effectiveSrcW = (settings.rotation === 90 || settings.rotation === 270) ? srcH : srcW
const effectiveSrcH = (settings.rotation === 90 || settings.rotation === 270) ? srcW : srcH
const scale = Math.min(cw / effectiveSrcW, ch / effectiveSrcH)
```

### Pattern 5: Canvas Filter String Construction

**What:** Map `ClipSettings` store values to a CSS filter string compatible with Canvas 2D `ctx.filter`.

**Mapping (authoritative: buildFilterGraph.ts ranges):**
```typescript
// Source: src/utils/buildFilterGraph.ts ClipSettings ranges
// New util: src/utils/buildCanvasFilter.ts
function buildCanvasFilter(settings: ClipSettings): string {
  const parts: string[] = []

  // blur: 0-10 integer → boxblur in ffmpeg, blur(Npx) in CSS
  // ffmpeg boxblur=N:N — N is luma_radius in pixels of source.
  // Canvas blur operates in display pixels. Use N*2 as a reasonable visual approximation.
  if (settings.blur > 0) {
    parts.push(`blur(${settings.blur * 2}px)`)
  }

  // brightness: -1.0 to 1.0 (ffmpeg eq:brightness, where 0 = no change)
  // CSS brightness(1) = no change; CSS range 0–2
  // Map: cssValue = 1 + settings.brightness
  if (settings.brightness !== 0) {
    parts.push(`brightness(${1 + settings.brightness})`)
  }

  // contrast: 0–2.0 (ffmpeg eq:contrast, default 1.0)
  // CSS contrast() has the same range and default — direct pass-through
  if (settings.contrast !== 1) {
    parts.push(`contrast(${settings.contrast})`)
  }

  // saturation: 0–3.0 (ffmpeg eq:saturation, default 1.0)
  // CSS saturate() has the same range and default — direct pass-through
  if (settings.saturation !== 1) {
    parts.push(`saturate(${settings.saturation})`)
  }

  // hue: degrees (ffmpeg hue=h=N)
  // CSS hue-rotate(Ndeg) — same semantics
  if (settings.hue !== 0) {
    parts.push(`hue-rotate(${settings.hue}deg)`)
  }

  return parts.length > 0 ? parts.join(' ') : 'none'
}
```

**Canvas 2D filter browser support:** The `ctx.filter` property is supported in all modern browsers (Chrome 47+, Firefox 49+, Safari 18+). However, Safari historically had partial support. As of 2025 Safari 18, `ctx.filter` is fully supported. This project targets modern browsers only — HIGH confidence this works.

### Pattern 6: Audio Element Management

**What:** For audio-track clips, use `HTMLAudioElement` (or `HTMLVideoElement` if source is video). Video clips play audio through their own video element (unmuted).

**Architecture:**
- One `HTMLAudioElement` per audio-track clip (created on import, same lifecycle as video elements)
- During rAF tick: find which audio clip (if any) contains `playheadTime`; if found, ensure its element is playing at correct offset; if in a gap, pause all audio elements
- Do not create audio elements for video-track clips — they already produce audio through their video elements

**Gap/transition handling:**
```typescript
// In rAF tick or in a useEffect watching playheadTime:
function syncAudio(playheadTime: number, store: StoreState, audioEls: Map<string, HTMLAudioElement>) {
  const activeAudioClip = findClipAt(store, 'audio', playheadTime)

  // Pause all audio elements first
  for (const [id, el] of audioEls) {
    if (!activeAudioClip || id !== activeAudioClip.id) {
      if (!el.paused) el.pause()
    }
  }

  if (activeAudioClip) {
    const el = audioEls.get(activeAudioClip.id)
    if (!el) return
    const clipLocalTime = activeAudioClip.trimStart + (playheadTime - activeAudioClip.startTime)
    const drift = Math.abs(el.currentTime - clipLocalTime)
    // Only re-seek if drift > threshold (avoids constant interruption)
    if (drift > 0.1) el.currentTime = clipLocalTime
    if (el.paused && store.ui.isPlaying) el.play().catch(() => {})
  }
}
```

**Double-audio prevention:** Video clips are on the `video` track. Audio clips are on the `audio` track. They are tracked separately. A video element's audio = video track audio. An audio element = audio track audio. No clip can be on both tracks simultaneously (store architecture), so no double-audio is possible.

**Volume:** Set `el.volume = settings.volume / 1.0` where `volume` in ClipSettings is `0–2.0` (stored as 0–200% / 100). Wait — actually store has `volume: number` in ClipSettings with `volume: 1.0` as default. The range per types.ts is unconstrained (just `number`). Cross-referencing buildAfFilter: `volume=` ffmpeg filter takes values where 1.0 = 100%. HTMLAudioElement.volume is clamped to 0–1. So for values > 1.0 (amplification), audio element cannot exceed 1.0 — this is a known preview fidelity limitation (acceptable per user decision).

### Pattern 7: Store Actions Addition

**What:** Add `setPlayheadTime` and `setIsPlaying` to `StoreActions` and implement them in `index.ts`.

```typescript
// In types.ts — add to StoreActions:
setPlayheadTime: (time: number) => void
setIsPlaying: (playing: boolean) => void

// In index.ts — implement:
setPlayheadTime: (time) => {
  const state = get()
  set({ ui: { ...state.ui, playheadTime: time } })
},
setIsPlaying: (playing) => {
  const state = get()
  set({ ui: { ...state.ui, isPlaying: playing } })
},

// In partialize — add to excluded list:
const { ui, export: _export, addClip, ..., setPlayheadTime, setIsPlaying, ...tracked } = state
```

**Zundo safety:** Both actions write only to `ui` which is already excluded from `TrackedState` via `partialize`. No changes to partialize logic are needed beyond listing the new action names in the destructure.

### Anti-Patterns to Avoid
- **Setting `el.currentTime` every rAF tick during playback:** Let the video element play naturally via `el.play()` when a video clip is active and seeks are not needed. Only seek explicitly on scrub or when switching clips. Constant `el.currentTime` assignment during playback kills performance.
- **Creating new HTMLVideoElement on every render:** Video elements must be created once and stored in a `useRef<Map>`. React re-renders must not recreate them.
- **Using xzdarcy engine's `play()`/`pause()` for canvas playback:** The engine fires action callbacks at timestamps but does not provide frame draw hooks. The rAF loop is entirely separate from the engine's internal play state.
- **ctx.filter without ctx.restore():** Always pair `ctx.save()` / `ctx.restore()` when applying transforms. Reset `ctx.filter = 'none'` after drawing each clip frame.
- **Subscribing to isPlaying via useStore() in the rAF tick function:** Read store state with `useStore.getState()` (imperative, no subscription overhead) inside tick. Only use the React hook for render-triggering state (isPlaying to start/stop the effect).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Timecode formatting | Custom date formatter | Simple `Math.floor` + `String.padStart` function | One-liner, no library needed |
| Canvas letterbox math | Custom scaling | Standard contain-fit formula (min of w/h ratios) | Well-known pattern, 5 lines |
| Video seek waiting | Custom promise wrapper | `el.seeked` event listener with Promise | Browser-native; `el.fastSeek()` exists too |
| Audio context mixing | Web Audio API graph | HTMLAudioElement + volume | WebAudioAPI overkill for simple per-clip volume; HTMLAudioElement sufficient |

**Key insight:** This phase is 100% browser built-ins orchestrated correctly — no new npm packages needed.

---

## Common Pitfalls

### Pitfall 1: rAF dt Spike on Tab Blur/Focus
**What goes wrong:** Browser throttles rAF when tab is not visible. On refocus, `dt` can be several seconds, causing playheadTime to jump.
**Why it happens:** rAF is paused by browser when tab is backgrounded; timestamps resume from real elapsed time.
**How to avoid:** Clamp `dt` to a max of `1/15` seconds (≈ 4 frames at 15fps) to prevent jumps. `const dt = Math.min(realDt, 1/15)`.
**Warning signs:** Playhead jumping forward on tab switch.

### Pitfall 2: Video Element seeked Event Race
**What goes wrong:** For scrubbing (not playing), `drawImage` is called before the video element has decoded the frame at the new `currentTime`, resulting in a stale or blank frame.
**Why it happens:** `el.currentTime = X` is asynchronous; the frame is not available until the `seeked` event fires.
**How to avoid:** For scrub-only draws (isPlaying = false), await a `seeked` promise before drawing:
```typescript
function seekAndDraw(el: HTMLVideoElement, time: number, drawFn: () => void) {
  if (Math.abs(el.currentTime - time) < 0.01) { drawFn(); return }
  el.addEventListener('seeked', drawFn, { once: true })
  el.currentTime = time
}
```
During active playback, skip the seeked wait — stale frames are imperceptible at normal speed.
**Warning signs:** Black/blank canvas when scrubbing slowly.

### Pitfall 3: ctx.filter on Offscreen Canvas in Safari
**What goes wrong:** Safari has historically had `ctx.filter` issues.
**Why it happens:** Older Safari versions (pre-18) did not support `ctx.filter`.
**How to avoid:** The canvas is an on-screen element, not OffscreenCanvas. Safari 18 supports `ctx.filter`. Add feature detection fallback: if `typeof ctx.filter === 'undefined'`, skip filter application gracefully (show unfiltered preview).
**Warning signs:** Filters not applying on Safari; `ctx.filter` remains at default.

### Pitfall 4: Double-Mount rAF in Strict Mode
**What goes wrong:** React 19 Strict Mode mounts → unmounts → remounts in development. The rAF loop starts, the cleanup cancels it, then it starts again. If `lastRealTimeRef` is not reset on each play start, the first `dt` after remount will be huge.
**Why it happens:** `performance.now()` timestamps from the first mount are stale by the time the second mount fires.
**How to avoid:** Always reset `lastRealTimeRef.current = 0` at the start of the `isPlaying=true` effect, and set it to `performance.now()` on the first rAF tick (when `lastRealTimeRef.current === 0`).
**Warning signs:** Playhead jumping forward instantly when play is pressed in dev.

### Pitfall 5: xzdarcy setTime Feedback Loop
**What goes wrong:** `onCursorDrag → setPlayheadTime → useEffect → setTime → fires onCursorDrag again` infinite loop.
**Why it happens:** `timelineRef.current.setTime()` updates internal cursor state; xzdarcy may fire `onCursorDrag` as a result.
**How to avoid:** Check whether `onCursorDrag` fires for programmatic `setTime` calls by testing with the library. If it does, use a `suppressCursorEventRef = useRef(false)` guard: set to `true` before calling `setTime`, reset after. Alternatively, only call `setTime` from the rAF loop (where no drag is active).
**Warning signs:** Console shows rapid repeated setPlayheadTime calls without user interaction.

### Pitfall 6: Playing Audio Before User Gesture
**What goes wrong:** `el.play()` throws `NotAllowedError` if called before any user interaction.
**Why it happens:** Browser autoplay policy blocks audio without user gesture.
**How to avoid:** Audio elements are only `play()`ed in response to the play button click or Space bar press — both are user gestures. Wrap `el.play()` in `.catch(() => {})` to silently handle any remaining autoplay rejections.
**Warning signs:** Console shows "NotAllowedError: play() failed because the user didn't interact with the document first."

---

## Code Examples

### Timecode Formatter (MM:SS)
```typescript
// PREV-03: MM:SS format (user decision from CONTEXT.md)
function formatTimecode(seconds: number): string {
  const totalSeconds = Math.floor(seconds)
  const mm = Math.floor(totalSeconds / 60)
  const ss = totalSeconds % 60
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}
```

### Find Active Clip at Playhead Time
```typescript
function findClipAt(
  store: { clips: Record<string, Clip>; tracks: { video: Track; audio: Track } },
  trackId: 'video' | 'audio',
  time: number
): Clip | null {
  const track = store.tracks[trackId]
  for (const clipId of track.clipIds) {
    const clip = store.clips[clipId]
    if (clip && time >= clip.startTime && time < clip.endTime) {
      return clip
    }
  }
  return null
}
```

### Total Timeline Duration
```typescript
function computeTotalDuration(clips: Record<string, Clip>): number {
  return Object.values(clips).reduce((max, c) => Math.max(max, c.endTime), 0)
}
```

### xzdarcy Cursor Sync in TimelinePanel
```typescript
// Add to TimelinePanel.tsx Timeline props:
onCursorDrag={(time) => setPlayheadTime(time)}
onCursorDragEnd={(time) => setPlayheadTime(time)}
onClickTimeArea={(time) => {
  setPlayheadTime(time)
  setIsPlaying(false)
  return true  // return true to allow the cursor to move (per xzdarcy docs)
}}

// Add useEffect to sync store playheadTime → timeline cursor:
useEffect(() => {
  timelineRef.current?.setTime(playheadTime)
}, [playheadTime])
```

### PreviewPanel Layout
```tsx
// AppShell.tsx — replace main placeholder:
<main className="flex-1 flex flex-col overflow-hidden">
  <PreviewPanel />
</main>

// PreviewPanel.tsx structure:
<div className="flex flex-col h-full bg-zinc-900">
  {/* Canvas fills remaining space */}
  <div className="flex-1 relative">
    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    {!hasClips && (
      <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-sm">
        Import clips to preview
      </div>
    )}
  </div>
  {/* Controls bar: fixed height */}
  <div className="flex-none flex items-center justify-center gap-4 px-4 py-2 border-t border-zinc-800">
    <span className="text-zinc-400 font-mono text-sm">{formatTimecode(playheadTime)}</span>
    <button onClick={togglePlay}>
      {isPlaying ? '⏸' : '▶'}
    </button>
    <span className="text-zinc-500 font-mono text-sm">
      {formatTimecode(totalDuration)}
    </span>
  </div>
</div>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Using xzdarcy engine's play/pause for canvas | Custom rAF loop separate from engine | N/A (this project) | Engine fires action callbacks only; canvas draw requires own loop |
| CSS filters on overlay image | Canvas 2D `ctx.filter` | N/A | ctx.filter enables per-frame filter without additional DOM elements |
| Polling video readyState for seeks | `seeked` event with `{ once: true }` | ES2015+ | Clean async pattern; no interval polling |

**Browser support note:**
- `ctx.filter` on Canvas 2D: Chrome 47+ (2015), Firefox 49+ (2016), Safari 18 (2024). Effectively universal for modern browsers.
- `el.fastSeek()`: Chrome 43+, Firefox 31+. Faster than `currentTime` for non-exact seeks during playback. Consider for the playing case.

---

## Open Questions

1. **Does xzdarcy `onCursorDrag` fire when `setTime()` is called programmatically?**
   - What we know: The `setTime` method exists on `TimelineState`; `onCursorDrag` is listed as "cursor drag event" in types.
   - What's unclear: Whether programmatic `setTime` fires `onCursorDrag` or only physical drag triggers it.
   - Recommendation: Test in the first implementation task. If it fires, add a `suppressRef` guard.

2. **`el.fastSeek()` vs `el.currentTime` for scrub performance.**
   - What we know: `fastSeek()` seeks to nearest keyframe (faster but imprecise); `currentTime` seeks to exact frame (slower).
   - What's unclear: Whether imprecise seeks are acceptable for scrubbing in this app.
   - Recommendation: Use `currentTime` for scrubbing accuracy (1-frame precision expected by users); use for playback if seek latency is visible.

3. **Canvas sizing — CSS vs canvas.width/height.**
   - What we know: Setting canvas width/height via CSS stretches the bitmap; canvas.width/height must match physical pixel dimensions for crisp output.
   - What's unclear: Whether devicePixelRatio scaling is needed for retina displays.
   - Recommendation: Set `canvas.width = container.offsetWidth * devicePixelRatio` and use CSS `width: 100%` for display. Scale ctx by devicePixelRatio after getting context. This is Claude's discretion.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (vitest.config.ts present) |
| Config file | `/Users/radu/Developer/micro-ffmpeg/vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |
| Environment | happy-dom (configured in vitest.config.ts) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PREV-01 | Canvas draws correct frame for active clip at playheadTime | unit | `npx vitest run src/utils/buildCanvasFilter.test.ts` | ❌ Wave 0 |
| PREV-01 | findClipAt() returns correct clip for given time | unit | `npx vitest run src/utils/previewUtils.test.ts` | ❌ Wave 0 |
| PREV-02 | setPlayheadTime and setIsPlaying update ui slice, excluded from undo | unit | `npx vitest run src/store/store.test.ts` | ✅ extend existing |
| PREV-03 | formatTimecode(0) = "00:00", formatTimecode(65) = "01:05", formatTimecode(3600) = "60:00" | unit | `npx vitest run src/utils/previewUtils.test.ts` | ❌ Wave 0 |
| PREV-04 | buildCanvasFilter maps brightness/contrast/saturation/hue/blur to correct CSS strings | unit | `npx vitest run src/utils/buildCanvasFilter.test.ts` | ❌ Wave 0 |
| PREV-04 | buildCanvasFilter returns 'none' for default ClipSettings | unit | `npx vitest run src/utils/buildCanvasFilter.test.ts` | ❌ Wave 0 |

**Note:** Canvas drawing (drawImage, ctx transforms) and rAF loop behavior are manual-only — happy-dom does not implement Canvas 2D context. HTMLVideoElement and rAF are not available in happy-dom. Integration testing requires a real browser. Functional correctness of PREV-01/02/04 for the canvas draw path must be verified manually.

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/utils/buildCanvasFilter.ts` — covers PREV-04 (create utility + test)
- [ ] `src/utils/buildCanvasFilter.test.ts` — unit tests for filter string construction
- [ ] `src/utils/previewUtils.ts` — findClipAt, computeTotalDuration, formatTimecode
- [ ] `src/utils/previewUtils.test.ts` — covers PREV-01 (clip finding), PREV-03 (timecode formatting)

---

## Sources

### Primary (HIGH confidence)
- `/Users/radu/Developer/micro-ffmpeg/node_modules/@xzdarcy/react-timeline-editor/dist/interface/timeline.d.ts` — TimelineState API (setTime, getTime, listener), onCursorDrag, onCursorDragEnd, onClickTimeArea props
- `/Users/radu/Developer/micro-ffmpeg/node_modules/@xzdarcy/timeline-engine/dist/core/events.d.ts` — EventTypes (setTimeByTick, play, paused, ended)
- `/Users/radu/Developer/micro-ffmpeg/node_modules/@xzdarcy/timeline-engine/dist/core/engine.d.ts` — TimelineEngine internals, rAF (_timerId) confirmation
- `/Users/radu/Developer/micro-ffmpeg/src/store/types.ts` — ClipSettings ranges, UiState fields confirmed present (playheadTime, isPlaying)
- `/Users/radu/Developer/micro-ffmpeg/src/store/index.ts` — Zundo partialize pattern, existing action implementation patterns
- `/Users/radu/Developer/micro-ffmpeg/src/hooks/useThumbnailExtractor.ts` — objectURL pattern for video elements
- `/Users/radu/Developer/micro-ffmpeg/src/utils/buildFilterGraph.ts` — authoritative filter parameter ranges
- `/Users/radu/Developer/micro-ffmpeg/src/components/TimelinePanel.tsx` — timelineRef setup, existing callbacks
- `/Users/radu/Developer/micro-ffmpeg/src/hooks/useKeyboardShortcuts.ts` — pattern for global key handler addition
- `/Users/radu/Developer/micro-ffmpeg/vitest.config.ts` — test framework configuration
- `/Users/radu/Developer/micro-ffmpeg/.planning/STATE.md` — accumulated decisions (rAF in useRef, Strict Mode handling)

### Secondary (MEDIUM confidence)
- Canvas 2D `ctx.filter` browser support: MDN Web Docs (filter property — supported in Chrome 47+, Firefox 49+, Safari 18+)
- `HTMLVideoElement.seeked` event for async seek detection: MDN Web Docs

### Tertiary (LOW confidence)
- Safari 18 full `ctx.filter` support: flagged as needing validation on target Safari version
- `el.fastSeek()` performance benefit vs `currentTime` for playback: anecdotal; needs profiling

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all APIs are browser built-ins or already-installed libraries; verified via node_modules type declarations
- Architecture: HIGH — xzdarcy TimelineState API fully verified; patterns derived from existing project code
- Filter mapping: HIGH — ClipSettings ranges read directly from types.ts; CSS filter semantics are well-specified
- Pitfalls: MEDIUM — rAF dt spike and seeked race are verified patterns; xzdarcy feedback loop is hypothetical pending testing
- Canvas transform order: HIGH — Canvas 2D spec is stable; rotation+flip order is mathematically verifiable

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (browser APIs are stable; xzdarcy API is pinned in node_modules)
