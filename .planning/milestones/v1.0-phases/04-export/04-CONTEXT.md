# Phase 4: Export - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Render the full timeline to a video file via ffmpeg.wasm, show real-time export progress, and let the user download the result. This phase covers the export pipeline (filter graph construction, ffmpeg invocation, progress tracking) and the export UI (button, format selector, progress bar, download button). Playback, multi-track compositing, and project save/load are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Output format
- User can choose output format from a dropdown in the TopBar, next to the Export button
- Format options: MP4 / H.264, WebM / VP9, MOV / H.264, GIF
- Default format: MP4 / H.264 (most compatible)
- Encoding quality: `-preset fast -crf 23` for H.264 (fast preset, medium quality — WASM encoding is slow; faster preset helps noticeably)
- Output filename: `export-<timestamp>.<ext>` (e.g. `export-2026-03-17T14-32-00.mp4`) — avoids overwriting previous exports

### Export button + UI lockout
- Export button lives in TopBar, right side, next to the format dropdown
- Format dropdown (`<select>`) sits inline next to the Export button in TopBar
- During export, the UI is fully locked — timeline and clip settings panel are dimmed/disabled; no store mutations allowed mid-export
- The Export button becomes a Cancel button during rendering (label changes to "Cancel", clicking it aborts the ffmpeg job and resets ExportState to idle)

### Progress display
- Full-width thin progress bar appears below TopBar during export, spanning the full app width
- Shows percentage only (no "Rendering clip N of M" text — simpler for v1)
- Bar disappears when export completes or is cancelled
- On completion: bar disappears and Export button changes to a Download button

### Error state
- On ffmpeg failure: the full-width bar turns red (e.g. `bg-red-500`) and a short error message appears underneath it (e.g. "Export failed. Try again.")
- Export button resets to its normal state, allowing retry
- Error message persists until user clicks Export again or the error is dismissed

### Download behavior
- On export success: Export button changes to a "Download" button
- User clicks Download to trigger the browser file save (using `URL.createObjectURL` + `<a download>` click)
- The download blob stays available until the user triggers a new export or refreshes the page
- No auto-download — explicit user click required

### Claude's Discretion
- Exact Tailwind classes for the progress bar animation and red error state
- Whether GIF encoding uses a palette filter or a simpler approach
- How "Cancel" aborts the ffmpeg job (terminate + reinitialize vs. flag-based abort check between clips)
- Exact layout of TopBar right section (spacing between format dropdown and Export/Cancel/Download button)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing store types and export slice
- `src/store/types.ts` — `ExportState`, `ClipSettings`, `Clip` interfaces; filter value ranges already locked (blur=boxblur luma_radius 0–10, brightness/contrast/saturation=eq filter, crop=crop filter, resize=scale filter)

### ffmpeg.wasm singleton + serialization queue
- `src/hooks/useThumbnailExtractor.ts` — Contains `getFFmpeg()` singleton loader, `enqueueFFmpegJob()` serialization queue, and `toBlobURL` WASM load pattern. Export pipeline MUST reuse or share this singleton and queue — do NOT create a second FFmpeg instance. The queue prevents concurrent WASM FS interleaving.

### Existing UI structure
- `src/components/TopBar.tsx` — Export button and format dropdown go here (right side)
- `src/components/AppShell.tsx` — Progress bar mounts below TopBar in the flex-col layout

### No external specs
No additional ADRs or design docs — all decisions are captured in this CONTEXT.md.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getFFmpeg()` / `enqueueFFmpegJob()` in `useThumbnailExtractor.ts`: these module-level singletons MUST be extracted to a shared module (e.g. `src/utils/ffmpegSingleton.ts`) so both thumbnail extraction and the export pipeline can share the same FFmpeg instance and queue. Creating a second instance will exhaust WASM heap.
- `src/utils/computeTimestamps.ts`: utility pattern for clip math; export pipeline will need similar per-clip timestamp/offset calculations.
- `ExportState { status: 'idle'|'rendering'|'done'|'error', progress: number }` already in store and excluded from Zundo partialize (correct — export state should not be undo-able).

### Established Patterns
- Store actions use `set(state => ...)` pattern; export pipeline needs `setExportStatus` / `setExportProgress` actions added to `StoreActions`
- `useStore.subscribe()` pattern (used in thumbnail extractor) is the established pattern for reacting to store state outside React render cycles
- FFmpeg WASM files served locally via `toBlobURL` from `public/` — no CDN fetch; same pattern applies for export
- TopBar already receives callbacks as props (e.g. `onImport`) — export trigger should follow the same prop pattern

### Integration Points
- Progress bar mounts in `AppShell.tsx` between TopBar and the flex-row content area (new row in the flex-col)
- Format dropdown + Export/Cancel/Download button wire into `TopBar.tsx` right side
- Export pipeline reads from `useStore.getState()` (snapshot at export start) to get `tracks`, `clips`, `clipSettings` — does NOT subscribe reactively during rendering (UI is locked anyway)
- `ExportState.status` drives TopBar button label (idle → "Export", rendering → "Cancel", done → "Download") and progress bar visibility
- Cancel must call ffmpeg.terminate() and reinitialize the singleton (or use a flag) — planner should decide approach

</code_context>

<specifics>
## Specific Ideas

- The format dropdown in TopBar should be a native `<select>` or a styled wrapper — no custom dropdown component needed for v1
- Progress bar should be thin (4–8px height) and use a smooth CSS transition on width change
- "Download" button replaces "Export" button in-place — not a new element added beside it

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-export*
*Context gathered: 2026-03-17*
