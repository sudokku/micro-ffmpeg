# Pitfalls Research

**Domain:** Browser video editor — adding preview canvas, waveforms, multi-clip selection, speed ramp, and new ffmpeg filters to an existing React 19 + Zustand + @ffmpeg/ffmpeg codebase
**Researched:** 2026-03-17
**Confidence:** HIGH (all critical claims verified against official docs or known codebase behavior)

---

## Critical Pitfalls

### Pitfall 1: atempo Chaining Required Outside 0.5x–2.0x Range

**What goes wrong:**
Passing `atempo=0.25` or `atempo=4.0` directly to ffmpeg produces a runtime error or silently applies 0.5 / 2.0 as a clamp. Older ffmpeg-core builds (including the ffmpeg.wasm-bundled core) enforce the 0.5–2.0 constraint strictly. The requested speed is silently wrong or the filter graph rejects entirely.

**Why it happens:**
Developers add a volume/speed slider, map values directly to `atempo=N`, and test only the presets that happen to fall in range (0.5×, 1×, 2×). The presets 0.25× and 4× silently fail or clamp.

**How to avoid:**
Build a helper that decomposes the target tempo into a chain of atempo instances, each within [0.5, 2.0]:
- 0.25× → `atempo=0.5,atempo=0.5`
- 4× → `atempo=2.0,atempo=2.0`
- 0.5× → `atempo=0.5` (single, no chain needed)
- 2× → `atempo=2.0` (single)

Keep the helper in `buildFilterGraph.ts` alongside the existing `buildVfFilter`. Add unit tests for the edge presets before wiring to UI.

**Warning signs:**
- Export produces correct-length audio at wrong pitch for 0.25× or 4× clips
- FFmpeg log shows `[atempo] tempo 0.250000 is not within [0.500000, 2.000000]`
- Silent audio output despite non-zero volume setting

**Phase to address:** Phase adding per-clip speed settings (CLIP-01). Must be in `buildAfFilter` from day one; do not add it incrementally.

---

### Pitfall 2: setpts Filter Order Breaks When Placed After Crop/Scale in vf Chain

**What goes wrong:**
`setpts=0.5*PTS` is a video filter and must be placed in the `-vf` chain. If the existing filter order is `scale → crop → boxblur → eq → normalizeScale` and `setpts` is appended at the end, the PTS reset happens after the normalize/pad step. This causes the concat demuxer to see non-zero-starting PTS on the second clip, producing audio-video sync drift in the final output.

**Why it happens:**
Speed is an afterthought appended to the existing `buildVfFilter` string. The PTS reset needs to happen at the start of the chain, before any other filter, so subsequent filters operate on reset timestamps.

**How to avoid:**
Prepend `setpts=(1/SPEED)*PTS` as the *first* filter in the vf chain, before scale/crop. In `buildVfFilter`, accept `speed` as a parameter and always emit `setpts=...` first if speed != 1.0. Also include `fps=source_fps` or at minimum ensure the frame rate normalization (`-r 30`) is still applied after setpts to avoid variable frame rate issues.

**Warning signs:**
- First clip plays at correct speed; second clip drifts out of sync
- Export with single clip looks fine but multi-clip export has sync issues
- FFmpeg concat log shows non-monotonic DTS warnings

**Phase to address:** Per-clip speed phase (CLIP-01). Must be handled in `buildVfFilter`/`buildAfFilter` together.

---

### Pitfall 3: Zundo Partialize Broken by Adding New Store Slices

**What goes wrong:**
When adding new fields to the store (e.g., `selectedClipIds: Set<string>`, `pixelsPerSecond: number`), developers forget to verify whether these belong in the `ui` slice (excluded from undo) or the tracked slice (included). A common mistake is placing `selectedClipIds` at the top level of the store instead of inside `ui`, which silently adds it to the Zundo undo history. Multi-selection then becomes undoable, which feels wrong and bloats the undo stack.

A second mistake: using a JavaScript `Set` as the value for `selectedClipIds`. Zundo's shallow equality check cannot diff Sets — two different `Set` instances with identical contents are not equal, so every selection change creates an undo history entry even when nothing meaningful changed.

**Why it happens:**
The existing `TrackedState = Omit<StoreState, 'ui' | 'export' | keyof StoreActions>` type makes this safe only if new fields are explicitly added to the `UiState` interface rather than the top-level store. Developers add the field at the wrong level under time pressure.

**How to avoid:**
- Place `selectedClipIds: Set<string>` inside `UiState` — it is transient selection state, not document state
- Store the selection as a plain array `string[]` or a plain object `Record<string, true>` instead of a `Set` to keep Zundo's equality check working. Convert to `Set` at the use site if needed
- After adding any new store field, verify `TrackedState` contains only the correct fields by inspecting the inferred type

**Warning signs:**
- Cmd+Z undoes a selection change instead of a clip edit
- Undo stack grows during normal browsing without clip edits
- TypeScript doesn't catch this at compile time unless `TrackedState` is explicitly typed

**Phase to address:** Multi-clip selection phase (SEL-01). Design the `UiState` extension before writing any action.

---

### Pitfall 4: requestAnimationFrame Loop Not Cancelled on Unmount Causes Memory/CPU Leak

**What goes wrong:**
The preview panel renders video frames to a `<canvas>` using a `requestAnimationFrame` loop. If the loop is not cancelled when the component unmounts (or when playback stops), it keeps running indefinitely. Each iteration calls `ctx.drawImage(videoEl, ...)` on a potentially detached video element. In React 19 Strict Mode, components mount-unmount-remount in development, triggering double-start with no cancellation.

**Why it happens:**
The `rAF` handle returned by `requestAnimationFrame` is stored in a local variable inside the `useEffect` callback rather than in a `useRef`. When the cleanup function runs, it can't cancel the loop because the handle is out of scope.

**How to avoid:**
Store the rAF handle in a `useRef<number>`:
```typescript
const rafRef = useRef<number>(0)
// inside start:
rafRef.current = requestAnimationFrame(tick)
// cleanup:
cancelAnimationFrame(rafRef.current)
```
Also cancel on video `pause` event, not just on unmount. Gate the `drawImage` call with a `isPlaying` ref to prevent stale renders.

**Warning signs:**
- CPU usage stays elevated after navigating away from preview panel
- Canvas renders frames after the video has been paused
- React DevTools shows the component unmounting but performance stays high

**Phase to address:** Preview panel phase (PREV-01/PREV-02). Must be in the first rAF implementation.

---

### Pitfall 5: Video Blob URL Not Revoked When Clip Is Deleted

**What goes wrong:**
When a `<video>` element is created for preview (using `URL.createObjectURL(clip.sourceFile)`), that blob URL must be revoked when the clip is removed or the component unmounts. If it is not revoked, the original `File`'s underlying buffer is retained by the browser for the lifetime of the page, accumulating for every clip the user imports and deletes.

The existing `thumbnailUrls` mechanism creates blob URLs for thumbnails and stores them in the clip — these also need cleanup on `deleteClip`. This was not required in v1.0 because the thumbnails are long-lived, but per-preview or per-waveform blob URLs created in component render cycles are at higher risk.

**Why it happens:**
`URL.createObjectURL` is called in a component's render or effect body without a corresponding `URL.revokeObjectURL` in cleanup.

**How to avoid:**
- Create video src blob URLs inside a `useEffect` with a cleanup function that calls `revokeObjectURL`
- Never create blob URLs directly in JSX expressions (`src={URL.createObjectURL(...)}` is always wrong)
- For the store-held `thumbnailUrls`, call `URL.revokeObjectURL` inside the `deleteClip` action before removing the clip from the map

**Warning signs:**
- `performance.memory.usedJSHeapSize` grows after import/delete cycles
- Chrome DevTools Memory tab shows retained Blob entries
- Opening many large clips causes page slowdown

**Phase to address:** Preview panel phase (PREV-01). Establish the pattern before waveform phase adds more blob URLs.

---

### Pitfall 6: OfflineAudioContext Peak Extraction Detaches the ArrayBuffer

**What goes wrong:**
`BaseAudioContext.decodeAudioData(arrayBuffer)` transfers ownership of `arrayBuffer` to the audio subsystem, detaching it from JavaScript. If the same `ArrayBuffer` (obtained via `file.arrayBuffer()`) is passed to both `decodeAudioData` and later to `fetchFile` (for ffmpeg), the second call receives a detached buffer and throws a `TypeError`.

A separate issue: rendering a full-resolution `AudioBuffer` for a long audio file uses enormous memory. A 10-minute stereo 48 kHz file renders ~115 MB of float32 data in the `OfflineAudioContext` result.

**Why it happens:**
Developers read the file once with `file.arrayBuffer()`, use it for waveform extraction, then try to reuse the same buffer for ffmpeg processing. The Web Audio spec mandates transfer semantics.

**How to avoid:**
- Read the file twice with separate `file.arrayBuffer()` calls: one for waveform, one for ffmpeg
- Downsample the waveform extraction: use an `OfflineAudioContext` with a low sample rate (e.g., 8000 Hz) and short channel count (mono) to cap memory usage
- For very long files (> 5 min), extract peaks by reading in chunks rather than decoding the whole file at once
- Wrap waveform extraction in a `try/catch` and log errors — audio decode failures should degrade gracefully (no waveform shown, not a crash)

**Warning signs:**
- `TypeError: Cannot perform %TypedArray%.prototype.set on a detached ArrayBuffer`
- Blank waveform on second import of the same file
- Browser tab crash or OOM on long audio files

**Phase to address:** Audio waveform phase (WAVE-01). Establish the double-read pattern immediately.

---

### Pitfall 7: FFmpeg WASM Heap Exhaustion From Writing Full-Resolution Source Files for Speed/Filter Preview

**What goes wrong:**
Adding per-clip speed (setpts + atempo) means the existing export pipeline now also needs to handle the audio re-sampling. If a developer adds a "preview quality export" or thumbnail update that calls ffmpeg on the full-resolution source file instead of the trimmed segment, the WASM heap (capped at ~2 GB in browser environments) can be exhausted. This was already identified as a known bug in the previous milestone.

The risk increases in v1.1 because new filters (rotation, hue, volume, flip) add arguments to the same ffmpeg call, and the temptation to decode the full file for a preview frame re-introduces the full-res decode pattern.

**Why it happens:**
A "quick preview" implementation passes the full `sourceFile` to ffmpeg with `-vf hue=h=90` to show what the filter looks like, not realizing that the full decode path loads the entire video into the WASM heap.

**How to avoid:**
- Never add a new ffmpeg call path that doesn't use `-ss <trimStart> -t <duration>` to limit I/O
- For filter previews, render via Canvas + CSS filter approximations rather than calling ffmpeg
- Keep all ffmpeg paths routed through `enqueueFFmpegJob` to prevent concurrent calls
- Add a file size guard: if `clip.sourceFile.size > 500MB`, warn the user before export

**Warning signs:**
- `RuntimeError: memory access out of bounds` in the browser console during export
- Export succeeds on short clips but fails on 4K or long clips
- WASM worker terminates with pthread abort error

**Phase to address:** Per-clip speed phase (CLIP-01) and any phase touching filter preview. The pattern must be locked at export time, not loosened for convenience.

---

### Pitfall 8: hue Filter in ffmpeg Uses `h=` Named Param, Not a Bare Degree Value

**What goes wrong:**
`buildVfFilter` already chains filter strings. Adding hue as `hue=90` (bare positional value) uses the deprecated positional syntax where the first argument is interpreted as saturation, not hue. The correct named-param syntax is `hue=h=90`. Using the bare form either silently applies the wrong filter or fails depending on ffmpeg-core version.

**Why it happens:**
ffmpeg docs show both `hue=90` (positional, deprecated) and `hue=h=90` (named, current) forms. Example searches return the deprecated form because older tutorials dominate search results.

**How to avoid:**
Always use `hue=h=<degrees>` in `buildVfFilter`. Unit test that the generated filter string contains `h=` and not a bare integer. The existing `buildFilterGraph.test.ts` should cover this.

**Warning signs:**
- Hue control appears to adjust saturation instead of hue
- ffmpeg log: `[hue] Option 'h' not found` if the wrong key is used
- No effect visible when the slider is moved to non-zero

**Phase to address:** Enhanced clip settings phase (CLIP-04). Add to `buildVfFilter` with an explicit unit test.

---

### Pitfall 9: Multi-Clip Bulk Move Is Not Natively Supported by @xzdarcy/react-timeline-editor

**What goes wrong:**
The `@xzdarcy/react-timeline-editor` library fires `onActionMoveEnd` for a single action at a time. There is no native event for "moved a group of selected actions". Implementing SEL-04 (move selected clips together) by wiring a single `onActionMoveEnd` handler will only move the clicked clip; the other selected clips remain in place.

**Why it happens:**
The multi-select issue (#74 on the library's tracker, opened 2026-02-07) is an open feature request. The library's action model is inherently single-action.

**How to avoid:**
Implement bulk move at the store layer, not the timeline layer:
1. In `onActionMoveEnd`, detect if the moved clip is in `selectedClipIds`
2. Compute the delta (new start − old start) for the moved clip
3. Call `moveClip` for all other selected clips, shifting each by the same delta
4. Gate this on a minimum delta threshold to avoid jitter

Do NOT attempt to re-render the `editorData` mid-drag to show all clips moving together — this will cause a React render loop fighting the library's internal drag state.

**Warning signs:**
- Only the dragged clip moves; others snap back
- Console shows React render warnings during drag
- Selected state visually desyncs from actual clip positions

**Phase to address:** Multi-clip selection phase (SEL-01 through SEL-04). Plan the delta-based approach before writing any drag code.

---

### Pitfall 10: Timeline Zoom `scaleWidth` Must Stay Within Bounds to Avoid Layout Collapse

**What goes wrong:**
`@xzdarcy/react-timeline-editor` accepts a `scaleWidth` prop (pixels per scale unit) and a `scale` prop (seconds per scale unit). Setting `scaleWidth` to a very small value (< 1 px) or 0 causes the timeline to collapse to zero width and become non-interactive. Setting it too large causes the timeline to overflow its container without a scrollbar if `autoScroll` is not enabled. Neither case is caught by the library with an error or warning.

**Why it happens:**
The zoom store value (`pixelsPerSecond`) is mapped directly to `scaleWidth` without bounds. The user clicks `-` zoom at minimum zoom and the value decrements below the safe floor.

**How to avoid:**
- Define hard min/max for `pixelsPerSecond` in the store (e.g., min: 20 px/s, max: 500 px/s)
- Clamp the value in the zoom action, not in the render path
- Expose the current `pixelsPerSecond` value to `deriveEditorData` or directly to `TimelinePanel` as a prop so the timeline re-renders correctly on change
- Test at minimum and maximum values before shipping

**Warning signs:**
- Timeline disappears or renders as a single pixel column
- Timeline overflows its container and clips are unreachable
- `scaleWidth` prop logged as `NaN` or `Infinity`

**Phase to address:** Timeline zoom phase (ZOOM-01). The bounds must be constants defined upfront.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Storing `selectedClipIds` as `Set` in Zustand | Familiar API | Zundo equality check fails; every selection creates undo history entry | Never — use `string[]` or `Record<string, true>` |
| Appending new vf filters to end of existing chain | Easy to add | `setpts` placed after normalization causes PTS drift in multi-clip exports | Never for `setpts`; acceptable for leaf visual filters like `hue` |
| One `buildVfFilter` function for both preview and export | Reduces duplication | Preview canvas filters (CSS-based) and export filters (ffmpeg syntax) have different semantics | Acceptable if functions are kept separate and clearly named |
| Calling `file.arrayBuffer()` once and sharing across uses | Fewer reads | `decodeAudioData` detaches the buffer; second use fails | Never — always create separate reads |
| Adding filter preview via ffmpeg.wasm call | Accurate preview | Full-res WASM decode, blocks main thread, exhausts heap | Never — use CSS/Canvas approximation for preview |
| Placing new transient UI state at top-level store | Simpler typing | Included in Zundo undo history; Cmd+Z undoes UI state | Never — always route through `UiState` |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| @xzdarcy/react-timeline-editor + multi-select | Try to use library's built-in selection for bulk move | Handle bulk move via delta calculation in `onActionMoveEnd` at the store layer |
| @xzdarcy/react-timeline-editor + zoom | Map `pixelsPerSecond` directly to `scaleWidth` without validation | Clamp store value to [20, 500]; pass clamped value as `scaleWidth` prop |
| @ffmpeg/ffmpeg + speed filter | Apply `setpts` at end of vf chain | Prepend `setpts` before all other vf filters so PTS reset applies to the whole chain |
| @ffmpeg/ffmpeg + new audio filters | Chain volume filter directly with atempo chain | Order: `atempo` chain first, then `volume` — atempo changes the frame rate context; volume just scales amplitude |
| Web Audio `decodeAudioData` + ffmpeg | Reuse the same `ArrayBuffer` for both | Call `file.arrayBuffer()` twice, independently, for each use |
| `URL.createObjectURL` + React effects | Create blob URL in JSX render | Create in `useEffect`, store result in ref or state, return `revokeObjectURL` cleanup |
| Canvas + `requestAnimationFrame` + React Strict Mode | Assume single mount | Always store rAF handle in `useRef`; React Strict Mode remounts in dev, creating two loops |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Full-res audio decode for waveform (OfflineAudioContext at source sample rate) | Tab freeze or OOM crash for audio > 2 min | Decode at 8000 Hz mono in OfflineAudioContext; only extract peak envelope | Audio files > ~3 min at 48 kHz |
| Drawing waveform on every store subscription update | Timeline stutters on any state change | Compute waveform peaks once, cache in a ref or module-level map keyed by clip ID | From the first clip onwards |
| `useMemo` on `deriveEditorData` with `clips` as a dependency | Re-derives on every clip setting change, not just structure changes | The existing `useMemo` in `TimelinePanel` is correct; do not add `clipSettings` as a dep | When clipSettings updates become frequent (per-frame during slider drag) |
| Multiple concurrent waveform extractions for all clips on import | Multiple OfflineAudioContext instances decode simultaneously, competing for memory | Queue waveform extractions through a simple promise chain or the existing `enqueueFFmpegJob` pattern | When 3+ audio clips are imported at once |
| Canvas `drawImage` with no dirty-rect check | Redraws entire canvas 60fps even when video is paused | Gate `drawImage` on `isPlaying` ref; draw once on seek/pause events | Immediately — wastes CPU from frame one |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| None specific to this domain | This is a fully client-side editor with no server, no auth, no network calls beyond loading the page | N/A |

_No domain-specific security concerns. All data stays in the browser. The only external resource is `ffmpeg-core.js` / `ffmpeg-core.wasm` served from `public/` — these must remain the ESM build (dist/esm/) to prevent silent failures._

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Waveform extraction blocks the UI thread | Timeline freezes for several seconds after audio import | Run peak extraction in a Web Worker or use the existing `enqueueFFmpegJob` mechanism to serialize async work off the critical path |
| Speed presets visually show "1×" after split | A split clip inherits the speed of the original; the settings panel shows the correct value only if `clipSettings` is correctly copied to both halves in `splitClip` | Copy `clipSettings[clipId]` to both `leftId` and `rightId` in the `splitClip` action |
| Multi-select doesn't clear on background click | Users can't easily deselect all clips | Handle `onClickRow` (timeline background) and document click to clear `selectedClipIds` |
| Timecode display shows fractional seconds with too many decimals | `1:23.456789` is unreadable | Format as `MM:SS.ff` (frames at 30fps) or `MM:SS.s` (tenths) — never raw float seconds |
| Zoom resets when editorData changes | Timeline jumps back to default zoom on any clip operation | Store `pixelsPerSecond` in the `ui` Zustand slice (excluded from undo history) so it persists across clip edits |

---

## "Looks Done But Isn't" Checklist

- [ ] **Speed (0.25×):** `atempo` chain generates `atempo=0.5,atempo=0.5` — verify by inspecting ffmpeg args log, not just visual inspection of output video
- [ ] **Speed with audio:** Export of a sped-up clip that has embedded audio includes the atempo chain on the audio stream — verify with an audio clip that has audible content
- [ ] **Multi-select delete:** `deleteClip` is called for every ID in `selectedClipIds`, not just the active one — verify by selecting 3 clips and pressing Delete
- [ ] **Multi-select settings apply:** `updateClipSettings` is called for every selected clip, not just `selectedClipId` — verify by selecting 2 clips and changing brightness, then inspecting `clipSettings` for both
- [ ] **Split clip preserves settings:** After splitting a clip with speed=0.25×, both halves have the speed setting — verify `clipSettings` for leftId and rightId
- [ ] **Waveform cleanup:** Waveform peaks are cleared from cache when a clip is deleted, not retained indefinitely — verify memory usage after many import/delete cycles
- [ ] **Timeline zoom bounds:** Zoom does not collapse timeline at minimum, does not overflow container at maximum — verify both extremes
- [ ] **Preview canvas cleanup:** Navigating away from the app (or hiding the preview panel) stops the rAF loop — verify CPU drops to idle
- [ ] **hue filter syntax:** Generated ffmpeg arg contains `hue=h=90` not `hue=90` — verify in the args log for a clip with non-zero hue
- [ ] **Blob URL revocation:** After deleting a clip, `thumbnailUrls` blob URLs are revoked — verify by checking `URL.createObjectURL` call count vs revoke count

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| atempo chain missing — wrong speed exported | LOW | Add `buildAfFilter` helper, add unit tests for all presets, re-export |
| setpts placement wrong — sync drift | MEDIUM | Refactor `buildVfFilter` to accept `speed` param and prepend setpts, re-test all multi-clip exports |
| Zundo undo history polluted by selection state | MEDIUM | Move `selectedClipIds` into `UiState`, convert from `Set` to `string[]`, test undo stack depth |
| rAF loop not cancelled — memory/CPU leak | LOW | Add `useRef` handle storage, add cleanup in `useEffect` return |
| ArrayBuffer detached — waveform breaks on second use | LOW | Add second `file.arrayBuffer()` call for waveform path |
| WASM OOM on large file | HIGH | Guard all ffmpeg paths with `-ss`/`-t` trimming, add file size warning in UI, never add preview ffmpeg calls |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| atempo chaining for 0.25×/4× | Per-clip speed (CLIP-01) | Unit test `buildAfFilter(0.25)` === `'atempo=0.5,atempo=0.5'` |
| setpts must be first in vf chain | Per-clip speed (CLIP-01) | Inspect ffmpeg args log for multi-clip speed export |
| Zundo polluted by selection state | Multi-clip selection (SEL-01) | Verify Cmd+Z after multi-select does not undo the selection change |
| rAF loop not cancelled | Preview panel (PREV-01/PREV-02) | CPU profiler: CPU drops after pause/unmount |
| Blob URL leak on clip delete | Preview panel (PREV-01) | Heap snapshot before and after import+delete cycle |
| OfflineAudioContext ArrayBuffer detach | Audio waveforms (WAVE-01) | Import same audio file twice; second waveform renders correctly |
| WASM heap exhaustion via new filter calls | Per-clip filters: rotation, hue, flip (CLIP-02 through CLIP-05) | Export a 1080p 3-min clip with all filters enabled; no OOM error |
| hue filter syntax | Enhanced clip settings (CLIP-04) | Unit test `buildVfFilter({ hue: 90 })` contains `hue=h=90` |
| Multi-clip bulk move not native to library | Multi-clip selection (SEL-04) | Delta-based move: move one of three selected clips; verify all three shift by same delta |
| Timeline zoom scaleWidth bounds | Timeline zoom (ZOOM-01) | Click `-` zoom at minimum; timeline does not disappear |
| Split clip should inherit settings | Per-clip speed (CLIP-01) + any settings phase | Split a clip with blur=5; both halves retain blur=5 in clipSettings |

---

## Sources

- ffmpeg.wasm GitHub issues: memory access out of bounds, OOM on large files — https://github.com/ffmpegwasm/ffmpeg.wasm/issues/704
- ffmpeg atempo docs (v7.1 and v8.0): confirmed 0.5–100.0 range in modern builds, but ffmpeg.wasm bundles an older core — https://ayosec.github.io/ffmpeg-filters-docs/7.1/Filters/Audio/atempo.html
- ffmpeg hue filter docs (v8.0): named param `h=` required — https://ayosec.github.io/ffmpeg-filters-docs/8.0/Filters/Video/hue.html
- Web Audio API `decodeAudioData` ArrayBuffer transfer/detach: https://github.com/WebAudio/web-audio-api/issues/1175
- OfflineAudioContext memory issue with long files: https://github.com/WebAudio/web-audio-api/issues/2445
- `requestAnimationFrame` memory leak pattern: https://konvajs.org/docs/performance/Avoid_Memory_Leaks.html
- Blob URL lifecycle and `revokeObjectURL`: https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Schemes/blob
- Zustand state immutability contract (Set vs plain object): https://github.com/pmndrs/zustand/discussions/2611
- @xzdarcy/react-timeline-editor — multi-select issue open as of 2026-02-07: https://github.com/xzdarcy/react-timeline-editor/issues
- setpts filter + PTS reset: https://ffmpeg.run/posts/how-to-speed-up-or-slow-down-video-using-ffmpeg
- Direct codebase inspection: `src/store/index.ts`, `src/utils/buildFilterGraph.ts`, `src/utils/ffmpegSingleton.ts`, `src/hooks/useExport.ts`

---
*Pitfalls research for: micro-ffmpeg v1.1 Preview & Polish milestone*
*Researched: 2026-03-17*
