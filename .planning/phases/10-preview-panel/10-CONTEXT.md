# Phase 10: Preview Panel - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a live preview panel: users see the current timeline frame rendered on a `<canvas>`, can play/pause with audio, see a timecode, and have per-clip filters (blur/brightness/contrast/saturation/crop/flip) visually reflected in the canvas. Playhead sync between timeline and preview is bidirectional. UI polish (three-panel layout, styled controls) is Phase 11.

</domain>

<decisions>
## Implementation Decisions

### Controls & layout
- Controls bar lives **below the canvas**: `[MM:SS] [▶/⏸] [MM:SS / total]`
- Timecode format: **MM:SS only** — drop hours (clips are typically short)
- Canvas aspect ratio: **letterbox/pillarbox** — video is drawn centered with black bars to preserve source aspect ratio; canvas fills available panel space
- Empty state (no clips): **dark canvas + centered hint text** ("Import clips to preview") — not the EmptyState drop-zone component

### Playback behavior
- End of timeline: **stop and hold last frame** — playhead stays at end, play button resets to ▶
- Clicking the timeline ruler (time axis): **seeks AND pauses playback** — sets `playheadTime` to clicked time and sets `isPlaying = false`
- Space bar: **global toggle** — handled in `useKeyboardShortcuts` (consistent with existing global key handling)

### Audio gap handling
- Gaps between audio clips on the audio track: **silence** (HTML audio element paused/unloaded during gaps — matches export behavior)
- Video clip audio: **plays naturally** — video elements are not muted; preview sounds like the export (both tracks heard)

### Filter rendering in canvas
- Filters applied via **Canvas 2D filter API**: `ctx.filter = 'blur(Npx) brightness(X) contrast(X) saturate(X)'` set before each `drawImage` call
- Crop: source-rect clipping in `ctx.drawImage(video, sx, sy, sw, sh, dx, dy, dw, dh)` — no extra compositing needed
- Flip: `ctx.save()` + `ctx.scale(-1, 1)` for flipH or `ctx.scale(1, -1)` for flipV (with translate to keep image in frame)
- Rotation (0/90/180/270°): `ctx.rotate(deg * Math.PI / 180)` with center-translate before drawImage
- Fidelity goal: visually correct approximation — not pixel-perfect to ffmpeg output, which is acceptable for a preview

### New store actions needed (not yet in types.ts)
- `setPlayheadTime(time: number)` — updates `ui.playheadTime`; excluded from Zundo (ui slice)
- `setIsPlaying(playing: boolean)` — updates `ui.isPlaying`; excluded from Zundo

### Claude's Discretion
- Implementation of the rAF loop (useRef handle, cancelled on unmount and pause — already noted in STATE.md decisions)
- Whether hidden video elements are one-per-clip or pooled; how to manage their lifecycle
- How to wire the xzdarcy `TimelineState` ref's cursor/time events to `setPlayheadTime`
- Exact layout proportions within the `<main>` panel (canvas vs controls bar height ratio)
- Whether a dedicated `usePreview` hook encapsulates all rAF + video element logic or it lives in a component

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — PREV-01, PREV-02, PREV-03, PREV-04 (preview requirements); also note SEL-04 deferral and CLIP-01–05 context
- `.planning/ROADMAP.md` § Phase 10 — success criteria (4 items), plan count, dependencies on Phases 5, 7, 9

### Store
- `src/store/types.ts` — `UiState` fields `playheadTime: number` and `isPlaying: boolean` already present (Phase 5). `StoreActions` needs `setPlayheadTime` and `setIsPlaying` added. `Clip` shape (startTime, endTime, trimStart, trimEnd, sourceFile, waveformPeaks).
- `src/store/index.ts` — Verify Zundo `partialize` still excludes `ui` after adding new actions; `setPlayheadTime`/`setIsPlaying` must NOT enter undo history.

### Layout integration
- `src/components/AppShell.tsx` — The `<main>` element currently renders a placeholder ("Clip settings — Phase 3"). This is where the `PreviewPanel` component goes. Layout: TopBar + ExportProgressBar + (ToolSidebar | **PreviewPanel** | ClipSettingsPanel) + TimelinePanel.

### Timeline interaction
- `src/components/TimelinePanel.tsx` — `timelineRef: useRef<TimelineState>` already set up (line ~43). The `@xzdarcy` library's `TimelineState` exposes a `listener` pattern for cursor time events — research which callback (`onSetTimeByTick`, `onCursorDrag`, or `time` prop) is the right hook for click-to-seek. The timeline's visual cursor must stay in sync with `playheadTime`.

### Existing patterns
- `src/hooks/useKeyboardShortcuts.ts` — Extend with Space bar → toggle `isPlaying`. Pattern to follow for adding global key handlers.
- `src/hooks/useThumbnailExtractor.ts` — Shows how to create hidden HTMLVideoElement + objectURL per clip; reuse this pattern for preview video elements.
- `src/utils/buildFilterGraph.ts` — Filter parameter ranges (blur: 0–10 int → canvas blur radius; brightness: -1.0–1.0 → CSS brightness 0–2; contrast: 0–2 float; saturation: 0–3 float; hue: degrees). Use these to map store values to Canvas 2D filter string.

No external specs — requirements fully captured in decisions above and ROADMAP.md § Phase 10 success criteria.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/hooks/useThumbnailExtractor.ts`: Creates hidden `<video>` elements with `src = URL.createObjectURL(file)`, seeks to timestamp, captures frame. The preview hook can follow the same objectURL + hidden video pattern but keep elements alive for rAF drawing.
- `src/hooks/useWaveformExtractor.ts`: Shows the `inFlightRef` pattern to prevent duplicate processing — useful for the preview hook's initialization guard.
- `src/utils/buildFilterGraph.ts`: Authoritative source for filter parameter ranges and semantics. Canvas filter string must map from the same store values.

### Established Patterns
- Global keyboard handlers live in `useKeyboardShortcuts` — add Space bar there, not in a component.
- rAF loop: `useRef<number>` for the animation frame ID; cancel on unmount (`return () => cancelAnimationFrame(id)`) and on pause. React 19 Strict Mode double-mounts in dev — handle cleanup correctly.
- Store actions for `ui` fields follow the pattern: `set(s => ({ ui: { ...s.ui, fieldName: value } }))` — no temporal/Zundo wrapping since `ui` is excluded from `partialize`.
- Object URLs (`URL.createObjectURL(clip.sourceFile)`) are already used for thumbnails. Preview video elements can reuse the same pattern; revoke on clip removal.

### Integration Points
- `AppShell.tsx` `<main>` → replace placeholder with `<PreviewPanel />`
- `TimelinePanel.tsx` `timelineRef` → subscribe to cursor-time events to call `setPlayheadTime`
- `useKeyboardShortcuts.ts` → add Space bar → `setIsPlaying(!isPlaying)` dispatch
- `src/store/index.ts` → add `setPlayheadTime` and `setIsPlaying` actions

</code_context>

<specifics>
## Specific Ideas

No specific references given — open to standard media player approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 10-preview-panel*
*Context gathered: 2026-03-18*
