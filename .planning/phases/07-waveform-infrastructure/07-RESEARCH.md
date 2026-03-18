# Phase 7: Waveform Infrastructure - Research

**Researched:** 2026-03-18
**Domain:** Web Audio API peak extraction + HTML Canvas waveform rendering
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Shape:** Filled bars — one vertical bar per peak sample, filled with semi-transparent color. Bars grow downward from the top (top-anchored), not mirrored.
- **Color:** White at 60% opacity (`rgba(255,255,255,0.6)`) over the clip's existing background color.
- **Height:** Full clip height — waveform fills the entire clip row. No thumbnail competing for space.
- **Loading state:** While `waveformPeaks` is `null`, audio clips show existing appearance (label + duration + solid background) — no shimmer needed.
- **Extraction hook:** Follow the `useThumbnailExtractor` side-effect hook pattern — a separate `useWaveformExtractor` hook that watches for audio clips with `waveformPeaks === null`.
- **Do NOT** trigger extraction inside `useFileImport` / `addClip` — keep import fast and synchronous.
- **ArrayBuffer detachment:** Always call `file.arrayBuffer()` independently for waveform extraction — do not reuse the same buffer ffmpeg consumes.
- **Scope:** No waveform on video clips, even if they have audio. `trackId === 'audio'` is the guard.
- **Excluded libraries:** `wavesurfer.js` and `peaks.js` are explicitly out of scope (shadow DOM conflicts with the timeline library).

### Claude's Discretion
- Exact peak count (200 fixed vs width-proportional)
- Canvas element sizing and `devicePixelRatio` handling
- Whether to use `OfflineAudioContext` or `AudioContext.decodeAudioData` (either works)
- Bar gap between samples (1px gap is fine)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WAVE-01 | User can see audio waveforms rendered on audio clips in the timeline | Web Audio API `OfflineAudioContext` + `decodeAudioData` for peak extraction; HTML Canvas for rendering; `useWaveformExtractor` side-effect hook stores peaks in `clip.waveformPeaks`; `ClipAction.tsx` renders a `<canvas>` for audio clips when peaks are available |
</phase_requirements>

---

## Summary

Phase 7 delivers static waveform bars on audio clips in the timeline. Peaks are extracted once on import via the Web Audio API, stored in `clip.waveformPeaks: number[] | null` (already typed and initialized in the store), and drawn as filled top-anchored bars via an HTML Canvas element in `ClipAction.tsx`. All three implementation components — hook, store action, and renderer — are straightforward to build given the project's existing patterns.

The architecture mirrors `useThumbnailExtractor` exactly: a `useWaveformExtractor` hook subscribes to the store, detects audio clips with `waveformPeaks === null`, runs async extraction via `OfflineAudioContext`, and dispatches `setWaveformPeaks(clipId, peaks)`. The store already has the field typed; only the action and partialize exclusion need verification and addition.

The only meaningful technical hazard is the `decodeAudioData` ArrayBuffer detachment, which the CONTEXT.md has already called out — always call `file.arrayBuffer()` freshly before passing to `decodeAudioData`. The test strategy must mock both `OfflineAudioContext` and `AudioContext` because happy-dom (the test environment) provides neither.

**Primary recommendation:** Implement `useWaveformExtractor` as a direct structural clone of `useThumbnailExtractor`, use `OfflineAudioContext` for offline peak extraction, normalize by the channel's max amplitude, then draw with `canvas.getContext('2d')` using a simple bar-fill loop.

---

## Standard Stack

### Core

| Library / API | Version | Purpose | Why Standard |
|---------------|---------|---------|--------------|
| `OfflineAudioContext` (Web Audio API) | Browser built-in | Decode compressed audio to PCM samples without a speaker/output | Designed for offline decoding; no real-time output required; widely supported in all modern browsers |
| `AudioBuffer.getChannelData()` | Browser built-in | Access raw PCM float32 samples after decode | Only API to read decoded audio samples from an `AudioBuffer` |
| `HTMLCanvasElement` + `CanvasRenderingContext2D` | Browser built-in | Draw waveform bars | No dependency; clip container already has `overflow: hidden` |
| React `useRef<HTMLCanvasElement>` | React 19 (already in project) | Stable canvas handle inside functional component | Standard pattern for imperative DOM access in React |

### Supporting

| Library / API | Version | Purpose | When to Use |
|---------------|---------|---------|-------------|
| `File.arrayBuffer()` | Browser built-in | Read raw bytes from the source File for Web Audio decode | Always use independently (separate call from any ffmpeg buffer) |
| `window.devicePixelRatio` | Browser built-in | Scale canvas for HiDPI/Retina displays | When canvas physical pixels should match screen DPI |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `OfflineAudioContext` | `AudioContext` + `decodeAudioData` | Functionally identical for offline extraction — `OfflineAudioContext` is marginally cleaner since it never needs a real output device, but either works |
| Canvas bar drawing | SVG `<polyline>` or `<path>` | Canvas is faster for many bars (100–200), works inside the timeline's clip slot without shadow DOM issues |
| 200 fixed peaks | Width-proportional peaks | 200 fixed is simpler, re-renders cleanly on resize without re-extraction, no need to store width at extraction time |

**Installation:** No new packages needed. All required APIs are browser built-ins or already in the project.

---

## Architecture Patterns

### Recommended File Structure

```
src/
├── hooks/
│   ├── useThumbnailExtractor.ts   (existing — model to replicate)
│   └── useWaveformExtractor.ts    (NEW — mirrors useThumbnailExtractor)
├── store/
│   ├── types.ts                   (existing — Clip.waveformPeaks already typed; add setWaveformPeaks to StoreActions)
│   └── index.ts                   (existing — add setWaveformPeaks action; exclude from partialize)
└── components/
    └── ClipAction.tsx             (existing — add audio branch with canvas)
```

### Pattern 1: Side-Effect Extraction Hook (mirrors useThumbnailExtractor)

**What:** A hook that mounts once in `AppShell`, subscribes to the store, and fires async extractions for clips that need processing.

**When to use:** Whenever a background async enrichment task needs to run for new clips without blocking import.

**Structure:**
```typescript
// src/hooks/useWaveformExtractor.ts
export function useWaveformExtractor() {
  const processedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const unsubscribe = useStore.subscribe((state) => {
      const newClipIds = state.tracks.audio.clipIds.filter(
        (id) =>
          state.clips[id] &&
          state.clips[id].trackId === 'audio' &&
          state.clips[id].waveformPeaks === null &&
          !processedRef.current.has(id)
      )

      for (const clipId of newClipIds) {
        const clip = state.clips[clipId]
        if (!clip) continue

        processedRef.current.add(clipId)

        ;(async () => {
          try {
            const arrayBuffer = await clip.sourceFile.arrayBuffer()
            // OfflineAudioContext requires sampleRate — 22050 is sufficient for peaks
            const ctx = new OfflineAudioContext(1, 1, 22050)
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
            const peaks = extractPeaks(audioBuffer, 200)

            useStore.setState((prev) => {
              const existing = prev.clips[clipId]
              if (!existing) return prev
              return {
                clips: { ...prev.clips, [clipId]: { ...existing, waveformPeaks: peaks } },
              }
            })
          } catch (err) {
            console.error(`Waveform extraction failed for clip ${clipId}:`, err)
          }
        })()
      }
    })

    return unsubscribe
  }, [])
}
```

Key differences from `useThumbnailExtractor`:
- Filters `tracks.audio.clipIds` instead of `tracks.video.clipIds`
- Guards on `waveformPeaks === null` instead of `thumbnailUrls.length === 0`
- Uses Web Audio API instead of ffmpeg — no `enqueueFFmpegJob` needed
- No WASM FS writes; extraction is pure JS

### Pattern 2: Peak Extraction Utility

**What:** A pure function that downsamples an `AudioBuffer` to N amplitude peaks, peak-normalized.

**When to use:** Called inside `useWaveformExtractor` after `decodeAudioData`.

```typescript
// Pure function — easy to unit test
function extractPeaks(audioBuffer: AudioBuffer, peakCount: number): number[] {
  const channelData = audioBuffer.getChannelData(0) // mono mix from channel 0
  const blockSize = Math.floor(channelData.length / peakCount)
  const peaks: number[] = []

  for (let i = 0; i < peakCount; i++) {
    const start = i * blockSize
    let max = 0
    for (let j = start; j < start + blockSize; j++) {
      const abs = Math.abs(channelData[j])
      if (abs > max) max = abs
    }
    peaks.push(max)
  }

  // Peak-normalize: divide by the highest value so bars use full clip height
  const globalMax = Math.max(...peaks, 0.0001) // avoid divide-by-zero
  return peaks.map((p) => p / globalMax)
}
```

### Pattern 3: Canvas Waveform Renderer in ClipAction

**What:** A `useEffect` that draws bars onto a canvas ref whenever `waveformPeaks` changes.

**When to use:** Inside `ClipAction.tsx`, for audio clips with non-null peaks.

```tsx
// Inside ClipAction.tsx — audio branch
{!isVideoClip && clip.waveformPeaks && (
  <WaveformCanvas peaks={clip.waveformPeaks} />
)}
```

```tsx
// Extracted component or inline — canvas draw pattern
function WaveformCanvas({ peaks }: { peaks: number[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.offsetWidth
    const h = canvas.offsetHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = 'rgba(255,255,255,0.6)'

    const barCount = peaks.length
    const barWidth = w / barCount
    const gap = 1
    const effectiveBarWidth = Math.max(barWidth - gap, 1)

    for (let i = 0; i < barCount; i++) {
      const barH = peaks[i] * h
      ctx.fillRect(
        i * barWidth,
        0,           // top-anchored
        effectiveBarWidth,
        barH
      )
    }
  }, [peaks])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
}
```

### Pattern 4: Store Action Addition

The store currently has `waveformPeaks: null` set in `addClip` but no `setWaveformPeaks` action declared in `StoreActions`. This must be added.

```typescript
// types.ts — add to StoreActions interface
setWaveformPeaks: (clipId: string, peaks: number[]) => void

// store/index.ts — add action implementation
setWaveformPeaks: (clipId, peaks) => {
  set((state) => {
    const existing = state.clips[clipId]
    if (!existing) return state
    return {
      clips: { ...state.clips, [clipId]: { ...existing, waveformPeaks: peaks } },
    }
  })
},

// partialize — waveformPeaks is inside clips (tracked state) — already covered
// setWaveformPeaks is an action — must be destructured out in partialize
// Current partialize already spreads all actions out via named destructure —
// add setWaveformPeaks to the destructure list alongside the other actions
```

**Partialize impact:** `waveformPeaks` lives on each `Clip` object inside `clips`, which is tracked. This means undo/redo WILL revert `waveformPeaks` back to `null`. The `processedRef` in `useWaveformExtractor` prevents infinite re-extraction loops: once a clipId is in `processedRef`, it is never re-queued even if `waveformPeaks` resets to `null` via undo.

Wait — this is a subtle bug to avoid. After undo, the peaks are gone from the store but `processedRef` still has the clipId, so peaks won't be re-extracted. Two mitigations:
1. Accept it: peaks reappear on next page load / session, or
2. Filter by `waveformPeaks === null` at render time but use a Map from clipId to "peaks stored" instead of "extraction started" as the dedup guard.

The simplest correct approach: use `processedRef` only to track in-flight extractions (remove from the set on completion/failure), not as a permanent dedup. This ensures re-extraction fires after undo.

### Anti-Patterns to Avoid

- **Reusing the ffmpeg ArrayBuffer for decodeAudioData:** `decodeAudioData` detaches (transfers) the buffer. Call `file.arrayBuffer()` afresh — two separate calls if both ffmpeg and waveform need the data.
- **Triggering extraction in `addClip` or `useFileImport`:** Keeps import synchronous. Side effects belong in `useWaveformExtractor`.
- **Using `AudioContext` (live context) for offline decoding:** Works but creates a dangling audio graph. `OfflineAudioContext` is cleaner for headless decode.
- **Drawing canvas without `devicePixelRatio` scaling:** Results in blurry waveform on Retina displays.
- **Placing canvas on video clips:** Guard with `!isVideoClip` (or `clip.trackId === 'audio'`) before rendering any canvas.
- **Putting `setWaveformPeaks` inside the `partialize` tracked state:** It is an action, not data — exclude it from tracked state just like all other actions.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Decoding compressed audio (MP3/AAC/OGG) to PCM samples | Custom decoder | `OfflineAudioContext.decodeAudioData()` | Browser handles all codec specifics, container formats, multi-channel downmix |
| Downsampling PCM to waveform peaks | Complex DSP library | A simple block-max loop over `getChannelData()` | Peak extraction is a 10-line loop; no library needed |
| HiDPI canvas scaling | Custom polyfill | `window.devicePixelRatio` + `canvas.width = logical * dpr` | Standard browser API, no dependency |

**Key insight:** Web Audio API was designed for exactly this use case. `OfflineAudioContext` + `decodeAudioData` handles every audio format the browser supports natively, including formats ffmpeg.wasm might also handle. No custom codec work is needed.

---

## Common Pitfalls

### Pitfall 1: ArrayBuffer Detachment After decodeAudioData
**What goes wrong:** `decodeAudioData` transfers ownership of the `ArrayBuffer`, making it zero-length and unusable. If ffmpeg later tries to read the same buffer, it silently processes empty input.
**Why it happens:** The Web Audio spec intentionally detaches the buffer to avoid copying large audio data.
**How to avoid:** Always call `file.arrayBuffer()` as a fresh await for waveform extraction. Never pass the same buffer reference that ffmpeg consumed or will consume.
**Warning signs:** ffmpeg produces silent/corrupt output on audio clips after waveform extraction runs.

### Pitfall 2: processedRef Not Re-Triggering After Undo
**What goes wrong:** After the user undoes an import (or undo resets `waveformPeaks` to `null`), the hook never re-extracts because `processedRef` still contains the clipId.
**Why it happens:** `processedRef` is used as a permanent dedup guard, not just an in-flight tracker.
**How to avoid:** Remove the clipId from `processedRef` after extraction completes (or fails), so that a subsequent `waveformPeaks === null` state triggers re-extraction.
**Warning signs:** After undo+redo cycle, audio clips show no waveform bars even though `waveformPeaks` is `null` in the store.

### Pitfall 3: OfflineAudioContext sampleRate / length Parameters
**What goes wrong:** `new OfflineAudioContext(channels, length, sampleRate)` — the `length` parameter is the number of frames to render. If passed incorrectly (e.g., 0 or a duration in seconds instead of frames), decoding fails or truncates.
**Why it happens:** For offline decoding, we don't actually need to render frames — we just need `decodeAudioData`. The `OfflineAudioContext` constructor requires valid non-zero values but the decoded buffer length is determined by the file, not the constructor.
**How to avoid:** Use `new OfflineAudioContext(1, 1, 22050)` — `length=1` is the minimum valid length. `decodeAudioData` decodes the full file regardless.
**Warning signs:** `decodeAudioData` throws `DOMException: failed to decode audio data`.

### Pitfall 4: Canvas Size Not Set Before Drawing
**What goes wrong:** If `canvas.offsetWidth` / `canvas.offsetHeight` are 0 (because the canvas hasn't been laid out yet or is in a display:none ancestor), all bars draw with zero height and nothing appears.
**Why it happens:** Canvas draws happen in a `useEffect`, which runs after render — but the element must be in the DOM and have layout for `offsetWidth` to return non-zero values.
**How to avoid:** Guard with `if (!w || !h) return` before drawing. The `ClipAction` container uses `h-full w-full`, so once visible in the timeline it will have dimensions.
**Warning signs:** Waveform appears only after a resize event triggers a re-draw, never on initial load.

### Pitfall 5: Zundo / Undo Tracking of waveformPeaks
**What goes wrong:** `waveformPeaks` lives on `Clip` which is in the tracked `clips` state. Every time peaks are dispatched, Zundo records a history entry. Repeated undo steps could step back through intermediate extraction states.
**Why it happens:** `setWaveformPeaks` calls `useStore.setState` which triggers Zundo recording.
**How to avoid:** Accept that peaks are tracked — this is actually correct behavior (undo of an addClip should undo the peaks too). The extraction hook handles re-queuing if peaks reset to null (see Pitfall 2).
**Warning signs:** Unexpectedly large undo history depth when clips are imported.

---

## Code Examples

Verified patterns from project source:

### Zustand store subscription pattern (from useThumbnailExtractor.ts)
```typescript
// Source: src/hooks/useThumbnailExtractor.ts (lines 9-68)
useEffect(() => {
  const unsubscribe = useStore.subscribe((state) => {
    // filter clips needing work, run async extraction, dispatch setState
  })
  return unsubscribe
}, [])
```

### Store state update from async context (from useThumbnailExtractor.ts)
```typescript
// Source: src/hooks/useThumbnailExtractor.ts (lines 52-58)
useStore.setState((prev) => {
  const existing = prev.clips[clipId]
  if (!existing) return prev
  return {
    clips: { ...prev.clips, [clipId]: { ...existing, thumbnailUrls: [url] } },
  }
})
```

### ClipAction audio branch insertion point (from ClipAction.tsx)
```tsx
// Source: src/components/ClipAction.tsx — after the {isVideoClip && ...} block, before Label + duration
{!isVideoClip && clip.waveformPeaks && (
  <WaveformCanvas peaks={clip.waveformPeaks} />
)}
```

### OfflineAudioContext peak decode (Web Audio API — browser built-in)
```typescript
// Correct constructor call for pure offline decoding
const ctx = new OfflineAudioContext(1, 1, 22050)
const audioBuffer = await ctx.decodeAudioData(await clip.sourceFile.arrayBuffer())
const channelData = audioBuffer.getChannelData(0)
```

### Partialize destructure (from store/index.ts lines 186-190) — must include setWaveformPeaks
```typescript
const {
  ui, export: _export,
  addClip, moveClip, trimClip, splitClip, deleteClip,
  selectClip, setActiveTool, updateClipSettings,
  setExportStatus, setExportProgress,
  setWaveformPeaks,  // ADD THIS
  ...tracked
} = state
return tracked
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `wavesurfer.js` / `peaks.js` for waveform rendering | Custom canvas rendering over Web Audio API peaks | Always — external libs have shadow DOM conflicts with `@xzdarcy/react-timeline-editor` | No external waveform library; pure canvas |
| `AudioContext` (live) for decoding | `OfflineAudioContext` for offline/headless decode | Web Audio Level 1 spec (2013, widely supported) | No speaker output device needed; works in workers |

**Deprecated/outdated:**
- `webkitAudioContext`: Legacy prefix — no longer needed; `AudioContext` / `OfflineAudioContext` are universally supported without prefix in all modern browsers as of 2020.

---

## Open Questions

1. **processedRef semantics: permanent dedup vs in-flight tracker**
   - What we know: `useThumbnailExtractor` uses `processedRef` as a permanent dedup (never removes from Set). This means undo-then-redo leaves `thumbnailUrls: []` on video clips too.
   - What's unclear: Whether the project accepts this as-is for thumbnails, implying waveform extraction can follow the same pattern.
   - Recommendation: Match `useThumbnailExtractor` behavior exactly for consistency. If the user undoes clip import, peaks and thumbnails are gone; re-importing the file starts fresh. This is acceptable for v1.1.

2. **WaveformCanvas: separate component vs inline in ClipAction**
   - What we know: `ClipAction.tsx` is already a focused presentational component.
   - What's unclear: Whether the canvas draw logic is complex enough to warrant extraction.
   - Recommendation: Extract as a `WaveformCanvas` sub-component in the same file — keeps `ClipAction` readable and makes the canvas draw logic easier to reason about.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.0 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm run test` |
| Full suite command | `npm run test` |
| Test environment | `happy-dom` (no Web Audio API — must mock) |

### Critical Test Environment Constraint

**happy-dom does NOT implement `OfflineAudioContext` or `AudioContext`.** This is confirmed by inspection of the installed `happy-dom@20.8.4` package. Any test that touches `useWaveformExtractor` must mock the Web Audio API. Similarly, `canvas.getContext('2d')` returns a real function reference in happy-dom but the 2D drawing methods are no-ops (no actual pixels are produced).

**Implication for test strategy:** Unit-test the pure `extractPeaks` utility function directly with synthetic `Float32Array` data. Test the store action (`setWaveformPeaks`) in isolation. Test the hook behavior by mocking `OfflineAudioContext`.

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| WAVE-01 | `extractPeaks` returns normalized array of correct length | unit | `npm run test -- src/utils/extractPeaks.test.ts` | ❌ Wave 0 |
| WAVE-01 | `extractPeaks` normalizes output so max value is 1.0 | unit | `npm run test -- src/utils/extractPeaks.test.ts` | ❌ Wave 0 |
| WAVE-01 | `setWaveformPeaks` action updates `clip.waveformPeaks` in store | unit | `npm run test -- src/store/store.test.ts` | ❌ add to existing |
| WAVE-01 | `setWaveformPeaks` is reverted by undo (waveformPeaks is tracked) | unit | `npm run test -- src/store/store.test.ts` | ❌ add to existing |
| WAVE-01 | `setWaveformPeaks` action is excluded from partialize (actions not tracked) | unit | `npm run test -- src/store/store.test.ts` | ❌ add to existing |
| WAVE-01 | `useWaveformExtractor` detects audio clip with `waveformPeaks === null` and dispatches peaks | unit (mocked Web Audio) | `npm run test -- src/hooks/useWaveformExtractor.test.ts` | ❌ Wave 0 |
| WAVE-01 | `useWaveformExtractor` does NOT process video clips | unit (mocked) | `npm run test -- src/hooks/useWaveformExtractor.test.ts` | ❌ Wave 0 |
| WAVE-01 | `ClipAction` renders canvas when `!isVideoClip && waveformPeaks` | unit (React Testing Library) | `npm run test -- src/components/ClipAction.test.tsx` | ❌ Wave 0 |
| WAVE-01 | `ClipAction` does NOT render canvas for video clips | unit | `npm run test -- src/components/ClipAction.test.tsx` | ❌ Wave 0 |
| WAVE-01 | `ClipAction` does NOT render canvas when `waveformPeaks === null` | unit | `npm run test -- src/components/ClipAction.test.tsx` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test`
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green (currently 139 tests) before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/utils/extractPeaks.test.ts` — unit tests for `extractPeaks` pure function (covers WAVE-01 extraction logic)
- [ ] `src/hooks/useWaveformExtractor.test.ts` — hook tests with mocked `OfflineAudioContext` (covers WAVE-01 extraction dispatch)
- [ ] `src/components/ClipAction.test.tsx` — rendering tests for canvas presence/absence (covers WAVE-01 render branch)
- [ ] New test cases appended to `src/store/store.test.ts` — covers `setWaveformPeaks` action and undo behavior

**Mock setup needed for Web Audio tests:**
```typescript
// In test file or vitest setup — mock OfflineAudioContext
vi.stubGlobal('OfflineAudioContext', class MockOfflineAudioContext {
  decodeAudioData(buffer: ArrayBuffer): Promise<AudioBuffer> {
    const channelData = new Float32Array(1000).fill(0.5)
    return Promise.resolve({
      getChannelData: () => channelData,
      numberOfChannels: 1,
      length: 1000,
      sampleRate: 22050,
      duration: 1000 / 22050,
    } as unknown as AudioBuffer)
  }
})
```

---

## Sources

### Primary (HIGH confidence)
- Direct inspection of `src/hooks/useThumbnailExtractor.ts` — hook pattern to replicate
- Direct inspection of `src/store/types.ts` — confirms `waveformPeaks: number[] | null` already typed; `setWaveformPeaks` NOT yet in `StoreActions`
- Direct inspection of `src/store/index.ts` — confirms `waveformPeaks: null` in `addClip`; no `setWaveformPeaks` action yet; partialize destructure pattern confirmed
- Direct inspection of `src/components/ClipAction.tsx` — confirms `isVideoClip` guard pattern; canvas insertion point after thumbnail block
- Direct inspection of `src/components/AppShell.tsx` — confirms `useThumbnailExtractor()` mounting pattern; `useWaveformExtractor()` goes on line after it
- Web Audio API spec — `OfflineAudioContext`, `decodeAudioData`, `getChannelData` are long-stable browser APIs
- happy-dom@20.8.4 runtime inspection — confirmed `OfflineAudioContext: undefined`, `canvas.getContext: function`

### Secondary (MEDIUM confidence)
- MDN Web Audio API documentation — `OfflineAudioContext(channels, length, sampleRate)` constructor; `decodeAudioData` ArrayBuffer detachment behavior

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all APIs are browser built-ins; no new npm packages needed
- Architecture: HIGH — directly derived from existing `useThumbnailExtractor` pattern in the codebase
- Pitfalls: HIGH — ArrayBuffer detachment is documented in CONTEXT.md; processedRef dedup and canvas sizing pitfalls are directly observable from the existing code
- Test strategy: HIGH — happy-dom limitation confirmed by runtime inspection

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable browser APIs; no npm dependency churn)
