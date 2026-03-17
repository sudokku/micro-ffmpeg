# Phase 4: Export - Research

**Researched:** 2026-03-17
**Domain:** ffmpeg.wasm export pipeline, filter graph construction, progress tracking, browser download
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Output format**
- User can choose output format from a dropdown in the TopBar, next to the Export button
- Format options: MP4 / H.264, WebM / VP9, MOV / H.264, GIF
- Default format: MP4 / H.264 (most compatible)
- Encoding quality: `-preset fast -crf 23` for H.264 (fast preset, medium quality — WASM encoding is slow; faster preset helps noticeably)
- Output filename: `export-<timestamp>.<ext>` (e.g. `export-2026-03-17T14-32-00.mp4`) — avoids overwriting previous exports

**Export button + UI lockout**
- Export button lives in TopBar, right side, next to the format dropdown
- Format dropdown (`<select>`) sits inline next to the Export button in TopBar
- During export, the UI is fully locked — timeline and clip settings panel are dimmed/disabled; no store mutations allowed mid-export
- The Export button becomes a Cancel button during rendering (label changes to "Cancel", clicking it aborts the ffmpeg job and resets ExportState to idle)

**Progress display**
- Full-width thin progress bar appears below TopBar during export, spanning the full app width
- Shows percentage only (no "Rendering clip N of M" text — simpler for v1)
- Bar disappears when export completes or is cancelled
- On completion: bar disappears and Export button changes to a Download button

**Error state**
- On ffmpeg failure: the full-width bar turns red (e.g. `bg-red-500`) and a short error message appears underneath it (e.g. "Export failed. Try again.")
- Export button resets to its normal state, allowing retry
- Error message persists until user clicks Export again or the error is dismissed

**Download behavior**
- On export success: Export button changes to a "Download" button
- User clicks Download to trigger the browser file save (using `URL.createObjectURL` + `<a download>` click)
- The download blob stays available until the user triggers a new export or refreshes the page
- No auto-download — explicit user click required

### Claude's Discretion
- Exact Tailwind classes for the progress bar animation and red error state
- Whether GIF encoding uses a palette filter or a simpler approach
- How "Cancel" aborts the ffmpeg job (terminate + reinitialize vs. flag-based abort check between clips)
- Exact layout of TopBar right section (spacing between format dropdown and Export/Cancel/Download button)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EXPO-01 | User can trigger export to concatenate the timeline into a video via ffmpeg.wasm | Filter graph construction, per-clip ffmpeg invocation pattern, singleton reuse from `ffmpegSingleton.ts` |
| EXPO-02 | User can see export progress (percentage) during rendering | `ffmpeg.on('progress', ...)` API, per-clip progress math as fallback for concat unreliability |
| EXPO-03 | User can download the exported video file after rendering completes | `URL.createObjectURL` + `<a download>` click pattern, `Uint8Array` from `ff.readFile()` |
</phase_requirements>

---

## Summary

Phase 4 is the final phase of v1. It wires the complete export pipeline: reading the Zustand store snapshot at export start, constructing an ffmpeg filter graph from clip settings (blur, brightness, contrast, saturation, crop, resize), running concatenation via `@ffmpeg/ffmpeg` 0.12.x, reporting real-time progress, and offering the output blob for download.

The biggest technical concern is **progress accuracy**. The `ffmpeg.on('progress', ...)` callback reports `{ progress: number, time: number }` but is documented as experimental and known to be unreliable with the `concat` filter — the reported ratio can overshoot or mis-calculate when inputs have different durations. The most reliable workaround is a **per-clip processing loop** (process clips sequentially, one `ff.exec()` per clip, then concatenate with a concat demuxer). This approach lets you derive accurate progress as `(clipsProcessed / totalClips)`, supplemented by the `onProgress` event for sub-clip granularity.

The second concern is **cancellation**. `@ffmpeg/ffmpeg` 0.12.x has no native per-exec abort signal (a PR was proposed in Sept 2023 but never merged). The only supported cancellation path is `ffmpeg.terminate()` followed by re-calling `ff.load()` to reinitialize the singleton. This is the correct approach for Cancel: terminate + reinitialize the module-level instance, then reset `ExportState` to `idle`.

**Primary recommendation:** Use a per-clip processing loop (encode each clip individually to intermediate files, then concatenate with the concat demuxer text file approach). This gives deterministic progress, avoids filter_complex quote-escaping pitfalls in WASM, and keeps each `ff.exec()` call short enough that cancel is responsive.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @ffmpeg/ffmpeg | 0.12.15 (already installed) | WASM FFmpeg runtime | Only viable client-side video encoder |
| @ffmpeg/util | 0.12.2 (already installed) | `fetchFile`, `toBlobURL` helpers | Official companion package |
| @ffmpeg/core | 0.12.10 (already installed) | WASM binary (ESM build in public/) | Required by @ffmpeg/ffmpeg load() |
| zustand | 5.0.12 (already installed) | Store read at export start + ExportState updates | Established project store |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React 19 | already installed | ExportProgressBar, TopBar additions | Component layer |
| Tailwind v4 | already installed | Progress bar styling, UI lockout overlay | All styling |

**No new dependencies needed.** All required packages are already installed.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Per-clip loop + concat demuxer | Single filter_complex concat | filter_complex more complex, progress unreliable with concat, quote escaping issues in WASM |
| terminate() + re-load for cancel | AbortController signal | AbortController not yet merged in @ffmpeg/ffmpeg 0.12.x |
| Native `<select>` for format | Custom dropdown component | Native select is sufficient for v1, no extra dependency |

---

## Architecture Patterns

### Recommended Project Structure

New files this phase produces:
```
src/
├── utils/
│   ├── ffmpegSingleton.ts     # Extract getFFmpeg() + enqueueFFmpegJob() from useThumbnailExtractor.ts
│   └── buildFilterGraph.ts    # Construct per-clip vf filter string from ClipSettings
├── hooks/
│   └── useExport.ts           # Export pipeline hook: orchestrates encode loop, cancel, store updates
└── components/
    └── ExportProgressBar.tsx  # Full-width thin bar, shown during rendering and on error
```

Modified files:
```
src/hooks/useThumbnailExtractor.ts  # Import getFFmpeg/enqueueFFmpegJob from ffmpegSingleton.ts
src/store/types.ts                  # Add setExportStatus / setExportProgress to StoreActions
src/store/index.ts                  # Implement setExportStatus / setExportProgress actions
src/components/TopBar.tsx           # Add onExport, onCancel, onDownload props + format dropdown
src/components/AppShell.tsx         # Mount ExportProgressBar, wire useExport hook
```

### Pattern 1: FFmpeg Singleton Extraction

The module-level `getFFmpeg()` and `enqueueFFmpegJob()` currently live in `useThumbnailExtractor.ts`. Both the thumbnail extractor and the export pipeline need the SAME instance. Extract to `src/utils/ffmpegSingleton.ts`:

```typescript
// src/utils/ffmpegSingleton.ts
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL } from '@ffmpeg/util'

let ffmpegInstance: FFmpeg | null = null
let ffmpegLoadPromise: Promise<FFmpeg> | null = null

export async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance
  if (ffmpegLoadPromise) return ffmpegLoadPromise
  ffmpegLoadPromise = (async () => {
    const ff = new FFmpeg()
    const base = window.location.origin
    await ff.load({
      coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
    })
    ffmpegInstance = ff
    return ff
  })()
  return ffmpegLoadPromise
}

export function resetFFmpegInstance() {
  // Called after terminate() to allow re-initialization
  ffmpegInstance = null
  ffmpegLoadPromise = null
}

let ffmpegQueue: Promise<void> = Promise.resolve()

export function enqueueFFmpegJob<T>(job: () => Promise<T>): Promise<T> {
  const result = ffmpegQueue.then(() => job())
  ffmpegQueue = result.then(() => undefined, () => undefined)
  return result
}
```

### Pattern 2: Per-Clip Encode Loop with Progress

Process each video clip individually, tracking `clipsProcessed / totalClips` for reliable progress:

```typescript
// Conceptual skeleton — src/hooks/useExport.ts
async function runExport(format: ExportFormat, cancelledRef: React.MutableRefObject<boolean>) {
  const { tracks, clips, clipSettings } = useStore.getState()
  const videoClipIds = tracks.video.clipIds
  const totalClips = videoClipIds.length

  const intermediateFiles: string[] = []

  for (let i = 0; i < videoClipIds.length; i++) {
    if (cancelledRef.current) break

    const clipId = videoClipIds[i]
    const clip = clips[clipId]
    const settings = clipSettings[clipId]

    await enqueueFFmpegJob(async () => {
      const ff = await getFFmpeg()
      // ... writeFile, exec with per-clip vf filter, readFile intermediate
    })

    intermediateFiles.push(`clip_${i}.mp4`)
    // Reliable progress from clip count
    useStore.setState(s => ({ export: { ...s.export, progress: Math.round(((i + 1) / totalClips) * 90) } }))
  }

  if (!cancelledRef.current) {
    // Final concat pass (10% of progress)
    await runConcatPass(intermediateFiles, format)
    useStore.setState(s => ({ export: { ...s.export, progress: 100, status: 'done' } }))
  }
}
```

### Pattern 3: Filter String Construction per Clip

Each clip's `ClipSettings` maps to a `-vf` filter chain. Build this as a pure function:

```typescript
// src/utils/buildFilterGraph.ts
export function buildVfFilter(settings: ClipSettings | undefined, clip: Clip): string {
  const filters: string[] = []

  if (settings?.resize) {
    filters.push(`scale=${settings.resize.width}:${settings.resize.height}`)
  }
  if (settings?.crop) {
    const { x, y, width, height } = settings.crop
    filters.push(`crop=${width}:${height}:${x}:${y}`)
  }
  if (settings?.blur && settings.blur > 0) {
    filters.push(`boxblur=${settings.blur}:${settings.blur}`)
  }
  if (settings?.brightness !== undefined || settings?.contrast !== undefined || settings?.saturation !== undefined) {
    const b = settings.brightness ?? 0
    const c = settings.contrast ?? 1
    const s = settings.saturation ?? 1
    filters.push(`eq=brightness=${b}:contrast=${c}:saturation=${s}`)
  }

  return filters.length > 0 ? filters.join(',') : 'copy'
}
```

Filter ordering matters: scale/crop before color grading is the ffmpeg convention.

### Pattern 4: Trim via -ss / -to on Input

Each clip has `trimStart` and `trimEnd` from the store. Apply trim using input-side seeking + output-side `-to`:

```typescript
// Within the per-clip exec call:
const startSec = clip.trimStart
const durationSec = (clip.endTime - clip.startTime)  // = sourceDuration - trimStart - trimEnd
const args = [
  '-ss', String(startSec),
  '-i', inputName,
  '-t', String(durationSec),
  '-vf', vfFilter,
  '-c:v', videoCodec,  // 'libx264' for MP4/MOV, 'libvpx-vp9' for WebM
  ...(format === 'mp4' || format === 'mov' ? ['-preset', 'fast', '-crf', '23'] : []),
  '-an',  // strip audio from intermediate; audio handled in separate pass
  outputName,
]
```

Note: audio track handling in v1 scope (single audio track) means audio clips need a parallel pass. If audio clips exist on the audio track, process them similarly and mux in the final concat step.

### Pattern 5: Concat Demuxer (Final Pass)

After per-clip intermediates, concatenate using the concat demuxer (text file listing inputs). This is the most reliable ffmpeg concatenation method and does not require re-encoding if all intermediates share the same codec/resolution:

```typescript
// Build a concat list file in WASM FS
const concatContent = intermediateFiles.map(f => `file '${f}'`).join('\n')
await ff.writeFile('concat_list.txt', concatContent)

await ff.exec([
  '-f', 'concat',
  '-safe', '0',
  '-i', 'concat_list.txt',
  '-c', 'copy',   // stream copy — no re-encode needed
  outputFilename,
])
```

If intermediate clips use the same codec (they should, since we control encoding in the per-clip pass), `-c copy` makes the final concat pass near-instantaneous.

### Pattern 6: Cancel via terminate() + resetFFmpegInstance()

```typescript
function cancelExport() {
  cancelledRef.current = true
  getFFmpeg().then(ff => {
    ff.terminate()
    resetFFmpegInstance()  // clears module-level refs so next getFFmpeg() re-loads
  })
  useStore.setState({ export: { status: 'idle', progress: 0 } })
  // Clean up any partial WASM FS files is not possible post-terminate — ok
}
```

The singleton reset means the next export re-loads WASM. Re-load takes ~1-2 seconds but is the only safe approach.

### Pattern 7: ExportState Actions in Store

Add to `StoreActions` in `types.ts`:
```typescript
setExportStatus: (status: ExportState['status']) => void
setExportProgress: (progress: number) => void
```

These are already excluded from Zundo partialize via the `export: _export` destructuring pattern. No change to partialize needed.

### Pattern 8: Download via createObjectURL

```typescript
function triggerDownload(data: Uint8Array, filename: string, mimeType: string) {
  const blob = new Blob([data], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  // Keep URL alive until next export (do not revoke immediately)
}
```

Store the `objectURL` in a module-level ref in `useExport.ts`. On new export start, revoke the old URL if present.

### Pattern 9: GIF Encoding (Claude's Discretion)

GIF with palette generation produces better quality but requires two ffmpeg passes. For v1 simplicity, use the single-pass approach:

```
-vf "fps=15,scale=480:-2:flags=lanczos" -loop 0 output.gif
```

The palette filter approach (`palettegen` + `paletteuse`) is higher quality but doubles encoding time. For v1, single-pass GIF is the correct choice.

### Anti-Patterns to Avoid

- **Creating a second FFmpeg instance:** Will exhaust WASM heap. Always use `getFFmpeg()` from the shared singleton.
- **Using filter_complex for concat directly:** Known unreliable progress with concat in ffmpeg.wasm, plus complex quote escaping.
- **Mutating store during export:** UI is locked during rendering — never call `addClip`, `trimClip`, etc. Export pipeline reads state snapshot at start.
- **Reading clip state reactively during render loop:** Take snapshot with `useStore.getState()` once at export start, iterate the snapshot.
- **Not cleaning up WASM FS files:** Always `ff.deleteFile()` intermediate files after reading them to prevent WASM heap exhaustion on large timelines.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Video concatenation | Custom raw byte merging | ffmpeg concat demuxer (`-f concat`) | Handles codec, container, timing correctly |
| Per-clip filter application | Custom WebGL/Canvas pipeline | ffmpeg `-vf` filter chain | Already in the WASM runtime; consistent with thumbnail extraction |
| File download | Custom HTTP endpoint | `URL.createObjectURL` + `<a download>` | Standard browser API, no backend needed |
| Progress interpolation | Complex time-math extrapolation | Per-clip count progress + `ffmpeg.on('progress')` event | Clip count is always accurate; onProgress fills sub-clip detail |
| Format MIME types | Custom lookup table | Hardcoded map (4 formats only) | Minimal, no library warranted |

**Key insight:** ffmpeg.wasm already has all filters needed (eq, boxblur, crop, scale, concat). The export pipeline is primarily orchestration code, not new filter logic.

---

## Common Pitfalls

### Pitfall 1: progress event unreliable with concat
**What goes wrong:** `ffmpeg.on('progress', ...)` reports values > 1.0 or oscillates when using the concat filter across clips of different durations.
**Why it happens:** Progress is computed from `time / output_duration` — but ffmpeg doesn't know total output duration when concat is involved.
**How to avoid:** Use per-clip processing loop. Track progress as `(clipsProcessed / totalClips)`. Register and unregister `onProgress` per clip exec for sub-clip granularity.
**Warning signs:** Progress jumps from 0.3 directly to 1.0 or reports > 100%.

### Pitfall 2: Stale WASM FS files after failed export
**What goes wrong:** A failed export leaves intermediate files (e.g. `clip_0.mp4`, `clip_1.mp4`) in the WASM virtual FS. The next export attempt hits `RuntimeError: FS file already exists`.
**Why it happens:** `deleteFile` is never called when an exception is thrown mid-loop.
**How to avoid:** Wrap the clip-processing loop in try/finally. In the finally block, attempt to delete all intermediate filenames (swallow errors if they don't exist).
**Warning signs:** Second export attempt crashes immediately.

### Pitfall 3: terminate() leaves singleton in broken state
**What goes wrong:** After calling `ff.terminate()` for Cancel, subsequent calls to `getFFmpeg()` return the dead instance (since `ffmpegInstance` is still set) and all operations fail.
**Why it happens:** `terminate()` stops the worker but does not null the module-level `ffmpegInstance`.
**How to avoid:** Call `resetFFmpegInstance()` immediately after `terminate()`. This nulls both `ffmpegInstance` and `ffmpegLoadPromise`, so the next `getFFmpeg()` call re-loads WASM cleanly.
**Warning signs:** Export button triggers no progress after first cancel.

### Pitfall 4: Audio-less output when video + audio clips both exist
**What goes wrong:** The per-clip video encode loop uses `-an` (strip audio). If audio clips exist, they must be encoded separately and muxed in the final pass.
**Why it happens:** Each video intermediate is audio-stripped for simplicity; final concat must mux audio.
**How to avoid:** After video clip loop, run a separate audio concat pass (audio clips from `tracks.audio.clipIds`). Pass `-map 0:v -map 1:a` in the final mux step if audio track has content.
**Warning signs:** Output file has no audio even though audio clips were on the timeline.

### Pitfall 5: UI mutation during export lock
**What goes wrong:** User triggers undo (Cmd+Z) or drag-to-trim while export is in progress — store mutates mid-render, producing corrupted output.
**Why it happens:** Export reads a snapshot, but undo restores previous state, making the snapshot inconsistent with what's on screen.
**How to avoid:** During `rendering` status, block store mutation actions and keyboard shortcuts. Check `export.status === 'rendering'` in `useKeyboardShortcuts` before dispatching undo/redo.
**Warning signs:** Output video clips are in wrong order or use pre-edit settings.

### Pitfall 6: VP9 encoding extremely slow in WASM
**What goes wrong:** WebM / VP9 export takes 10-50x longer than H.264 in WASM due to VP9's reference frame complexity and lack of SIMD optimization in the WASM build.
**Why it happens:** libvpx-vp9 in WASM does not benefit from hardware acceleration.
**How to avoid:** No mitigation — it's a known VP9 limitation. Users should be informed or VP9 quality settings can be lowered (`-deadline realtime -cpu-used 8`). For v1, this is acceptable.
**Warning signs:** A 30-second WebM export takes several minutes.

---

## Code Examples

### Registering and unregistering the progress handler per clip

```typescript
// Source: https://ffmpegwasm.netlify.app/docs/api/ffmpeg/classes/ffmpeg/
const handler = ({ progress }: { progress: number; time: number }) => {
  const clipBase = clipsProcessed / totalClips
  const clipFraction = 1 / totalClips
  const pct = Math.round((clipBase + progress * clipFraction) * 90) // 0-90%, final 10% for concat
  useStore.setState(s => ({ export: { ...s.export, progress: pct } }))
}

ff.on('progress', handler)
try {
  await ff.exec(args)
} finally {
  ff.off('progress', handler)
}
```

### Building the output filename from format

```typescript
const FORMAT_MAP = {
  mp4:  { ext: 'mp4',  mime: 'video/mp4',  codec: 'libx264',    args: ['-preset', 'fast', '-crf', '23'] },
  webm: { ext: 'webm', mime: 'video/webm', codec: 'libvpx-vp9', args: ['-deadline', 'realtime', '-cpu-used', '8'] },
  mov:  { ext: 'mov',  mime: 'video/quicktime', codec: 'libx264', args: ['-preset', 'fast', '-crf', '23'] },
  gif:  { ext: 'gif',  mime: 'image/gif',  codec: null,          args: ['-vf', 'fps=15,scale=480:-2:flags=lanczos', '-loop', '0'] },
}

function buildOutputFilename(format: keyof typeof FORMAT_MAP): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  return `export-${ts}.${FORMAT_MAP[format].ext}`
}
```

### ExportProgressBar component structure

```typescript
// src/components/ExportProgressBar.tsx
// Full-width, thin bar mounted in AppShell between TopBar and flex-row content
export function ExportProgressBar() {
  const status = useStore(s => s.export.status)
  const progress = useStore(s => s.export.progress)

  if (status !== 'rendering' && status !== 'error') return null

  return (
    <div className="flex-none w-full">
      <div className={`h-1.5 w-full transition-colors ${status === 'error' ? 'bg-red-500' : 'bg-zinc-800'}`}>
        <div
          className={`h-full transition-all duration-300 ${status === 'error' ? 'bg-red-400' : 'bg-blue-500'}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      {status === 'error' && (
        <p className="text-xs text-red-400 px-4 py-1">Export failed. Try again.</p>
      )}
    </div>
  )
}
```

### TopBar extension pattern (follows existing prop pattern)

```typescript
// Additions to TopBarProps — follows existing onImportClick pattern
interface TopBarProps {
  onImportClick?: () => void
  fileInputRef?: React.RefObject<HTMLInputElement | null>
  onFileInputChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  exportFormat?: ExportFormat
  onExportFormatChange?: (format: ExportFormat) => void
  onExport?: () => void
  onCancel?: () => void
  onDownload?: () => void
  exportStatus?: ExportState['status']
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| filter_complex concat for all clips | Per-clip encode + concat demuxer | ffmpeg.wasm 0.12.x era | Reliable progress, no quote-escaping |
| CDN-served WASM | Locally-served WASM via `toBlobURL` | Phase 2 decision | No CORP header issues |
| Comlink worker for ffmpeg | Main-thread singleton | Phase 2 decision | import.meta.url resolution works correctly |

**Deprecated/outdated:**
- `ffmpeg.run()`: Pre-0.12 API. Project uses `ff.exec([])` (array form).
- Passing filter strings with embedded single quotes to ffmpeg.wasm: Known to fail. Use separate `-vf` arg.

---

## Open Questions

1. **Audio mux in final pass**
   - What we know: The store has `tracks.audio.clipIds`. Audio clips are `File` objects with `sourceDuration`.
   - What's unclear: Whether v1 audio should be included in export or silently skipped. The CONTEXT.md decisions and EXPO-01 requirement ("concatenate the timeline") implies video-only is acceptable for v1 since no playback exists.
   - Recommendation: Planner should include audio handling as a task but mark it as best-effort. If `tracks.audio.clipIds.length === 0`, output is video-only (fine for most use cases). If audio clips exist, include a basic audio concat pass.

2. **GIF palette quality**
   - What we know: Single-pass GIF (`fps=15,scale=480:-2`) works but produces dithered output. Two-pass palette approach is significantly better.
   - What's unclear: How slow two-pass GIF is in WASM for a 30-second timeline.
   - Recommendation: Start with single-pass for v1. Two-pass can be a v2 improvement.

3. **Intermediate file codec for concat-copy**
   - What we know: For `-c copy` to work in the final concat pass, all intermediates MUST share the same codec, resolution, and frame rate.
   - What's unclear: If clips have different source resolutions (e.g. 1080p and 720p mixed), `-c copy` will fail or produce broken output unless a resize is forced.
   - Recommendation: Always apply a normalize resize in the per-clip pass when output format is not GIF. The planner should include a "compute max output resolution" step that picks the first video clip's dimensions (or user-set resize from ClipSettings) as the normalization target.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.0 |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run src/utils/buildFilterGraph.test.ts src/store/store.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EXPO-01 | `buildVfFilter()` produces correct ffmpeg filter string for each ClipSettings field | unit | `npx vitest run src/utils/buildFilterGraph.test.ts` | Wave 0 |
| EXPO-01 | `setExportStatus` / `setExportProgress` store actions update export slice correctly | unit | `npx vitest run src/store/store.test.ts` | ✅ (extend existing file) |
| EXPO-01 | `setExportStatus('rendering')` does NOT create undo history entry | unit | `npx vitest run src/store/store.test.ts` | ✅ (extend existing file) |
| EXPO-02 | Progress calculation: `(clipsProcessed / totalClips) * 90` gives correct value for 3-clip timeline | unit | `npx vitest run src/utils/buildFilterGraph.test.ts` | Wave 0 |
| EXPO-03 | `triggerDownload()` or equivalent calls `URL.createObjectURL` and sets `<a>.download` | unit | `npx vitest run src/hooks/useExport.test.ts` | Wave 0 |
| EXPO-03 | `ExportState.status === 'done'` causes TopBar to show "Download" button label | unit (React) | `npx vitest run src/components/TopBar.test.tsx` | Wave 0 |

**Note:** ffmpeg.wasm itself cannot be unit-tested in happy-dom (WASM not available). Integration of the actual encode loop is manual-only.

### Sampling Rate
- **Per task commit:** `npx vitest run src/utils/buildFilterGraph.test.ts src/store/store.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/utils/buildFilterGraph.test.ts` — covers EXPO-01 filter string generation
- [ ] `src/hooks/useExport.test.ts` — covers EXPO-03 download trigger (mock `URL.createObjectURL`)
- [ ] `src/components/TopBar.test.tsx` — covers EXPO-03 button label states (idle/rendering/done)

---

## Sources

### Primary (HIGH confidence)
- https://ffmpegwasm.netlify.app/docs/api/ffmpeg/classes/ffmpeg/ — `on()`, `off()`, `exec()`, `terminate()` API; progress event shape `{ progress, time }`
- https://ffmpegwasm.netlify.app/docs/getting-started/usage/ — canonical usage patterns
- `src/hooks/useThumbnailExtractor.ts` (codebase) — established `getFFmpeg()`, `enqueueFFmpegJob()`, `toBlobURL` patterns
- `src/store/types.ts` (codebase) — `ExportState`, `ClipSettings`, filter value ranges locked in prior phases
- `src/store/index.ts` (codebase) — `partialize` pattern, `set(state => ...)` action convention

### Secondary (MEDIUM confidence)
- https://github.com/ffmpegwasm/ffmpeg.wasm/issues/572 — confirms no native AbortController support; terminate() + reinitialize is the accepted pattern
- https://github.com/ffmpegwasm/ffmpeg.wasm/issues/600 — progress event unreliable with concat filter (confirms per-clip approach as workaround)
- https://www.gumlet.com/learn/ffmpeg-concat/ — concat demuxer text file approach, `-f concat -safe 0` flags

### Tertiary (LOW confidence)
- https://github.com/ffmpegwasm/ffmpeg.wasm/issues/152 — progress parsing issues (older version, pattern still applies)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already installed, versions confirmed from package.json
- Architecture: HIGH — patterns derive directly from existing codebase (getFFmpeg, enqueueFFmpegJob, partialize pattern, prop-based TopBar)
- ffmpeg filter strings: HIGH — filter syntax (boxblur, eq, crop, scale, concat demuxer) is stable ffmpeg convention, verified against official docs
- Progress tracking: MEDIUM — onProgress unreliability with concat is documented in GitHub issues; per-clip count approach is a community workaround
- Cancel behavior: HIGH — terminate() + reinitialize confirmed as only option by GitHub issues and API docs

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable domain; @ffmpeg/ffmpeg 0.12.x is mature)
