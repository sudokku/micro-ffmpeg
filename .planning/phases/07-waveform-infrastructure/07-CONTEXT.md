# Phase 7: Waveform Infrastructure - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Extract audio waveform peaks once on file import using the Web Audio API (`OfflineAudioContext` + `decodeAudioData`), store them in `clip.waveformPeaks: number[] | null`, and render them as filled bars on audio clips in the timeline. No playback, no interactive scrubbing — peaks are cached once and drawn statically. Video clips are not affected.

</domain>

<decisions>
## Implementation Decisions

### Visual style
- **Shape:** Filled bars — one vertical bar per peak sample, filled with semi-transparent color. Bars grow downward from the top (top-anchored), not mirrored.
- **Color:** White at 60% opacity (`rgba(255,255,255,0.6)`) over the clip's existing background color. Matches the clip label/duration text style.
- **Height:** Full clip height — the waveform fills the entire clip row. Audio clips have no thumbnail competing for space.

### Loading state
- While `waveformPeaks` is `null` (extraction in progress), audio clips show their existing appearance (label + duration + solid background color) — no shimmer needed. The waveform appears when peaks arrive.

### Extraction architecture
- Follow the `useThumbnailExtractor` side-effect hook pattern: a separate hook (`useWaveformExtractor`) that watches for audio clips with `waveformPeaks === null` and extracts peaks asynchronously.
- **Do NOT** trigger extraction inside `useFileImport` / `addClip` — keep import fast and synchronous.
- The hook dispatches `setWaveformPeaks(clipId, peaks)` on completion.
- **ArrayBuffer detachment:** `decodeAudioData` detaches the `ArrayBuffer`. Always call `file.arrayBuffer()` independently for waveform extraction — do not reuse the same buffer that ffmpeg might consume.

### Peak resolution
- Claude's discretion — a fixed count proportional to clip display width is fine. Roughly 2 peaks per pixel of minimum clip width is a reasonable starting point, or a fixed 200 peaks per clip. Normalize by peak amplitude (peak-normalized).

### Scope boundary
- No waveform on video clips, even if the video has audio. `trackId === 'audio'` is the guard.
- `wavesurfer.js` and `peaks.js` are explicitly out of scope (shadow DOM conflicts with the timeline library).

### Claude's Discretion
- Exact peak count (200 fixed vs width-proportional)
- Canvas element sizing and `devicePixelRatio` handling
- Whether to use `OfflineAudioContext` or `AudioContext.decodeAudioData` (either works for offline extraction)
- Bar gap between samples (1px gap is fine)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing extraction pattern
- `src/hooks/useThumbnailExtractor.ts` — Model for the side-effect hook pattern: watches for clips needing work, dispatches store update on completion. Replicate this structure for `useWaveformExtractor`.

### Clip rendering
- `src/components/ClipAction.tsx` — Where waveform canvas will be added. Currently has `{isVideoClip && ...}` branch for thumbnails; add `{!isVideoClip && waveformPeaks && ...}` branch for the canvas.

### Store types
- `src/store/types.ts` — `Clip.waveformPeaks: number[] | null` already present (Phase 5). Store action `setWaveformPeaks(clipId, peaks)` needs to be verified/added.

### Requirements
- `WAVE-01`: User can see audio waveforms rendered on audio clips in the timeline — `.planning/REQUIREMENTS.md`

No external specs — requirements fully captured in decisions above and ROADMAP.md § Phase 7 success criteria.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useThumbnailExtractor.ts`: Side-effect hook that iterates clips, detects missing thumbnails, dispatches extractions. Exact pattern to replicate for waveforms.
- `useFileImport.ts`: `addClip` creates the clip with `waveformPeaks: null` (default). Hook watches for `null` to trigger extraction.
- `ClipAction.tsx`: Has `isVideoClip` guard — add parallel audio branch for waveform canvas.

### Established Patterns
- Side-effect hooks run in `AppShell` or equivalent top-level component — `useWaveformExtractor` goes there.
- Store dispatches are via `useStore.getState().setWaveformPeaks(...)` — fire-and-forget after async extraction.
- `!= null` (loose equality) for optional store fields — consistent with `buildVfFilter` pattern.

### Integration Points
- `ClipAction.tsx`: Add `{!isVideoClip && clip.waveformPeaks && <canvas ... />}` after the label block.
- `AppShell.tsx` or top-level: Mount `useWaveformExtractor()` alongside `useThumbnailExtractor()`.
- Store: Verify `setWaveformPeaks` action exists; add if missing.

</code_context>

<specifics>
## Specific Ideas

No specific references or "I want it like X" moments — standard waveform bar rendering applies.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 07-waveform-infrastructure*
*Context gathered: 2026-03-18*
