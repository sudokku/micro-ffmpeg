# Phase 2: Timeline Core - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Import video and audio files → display as clips on the two-track timeline → edit clips (trim, split, delete, reorder) → undo/redo all operations → show thumbnail previews extracted via ffmpeg.wasm.

No real-time playback (v1 out of scope). No clip settings/filters (Phase 3). No export (Phase 4).

</domain>

<decisions>
## Implementation Decisions

### File import — Drop zone
- Full-canvas drag overlay: dragging a file anywhere over the app window triggers a translucent overlay ("Drop video or audio files here")
- Import button in TopBar opens the native file picker as an alternative entry point
- When the timeline is empty, the middle region shows an empty-state prompt: "Drop files or click Import to get started"

### File import — Track routing
- Auto-detect by MIME type: `video/*` files go to the video track, `audio/*` files go to the audio track
- No manual track assignment prompt — zero friction

### File import — Appending
- Always append: new clips are placed after the last existing clip on their respective track
- No confirmation dialog when the timeline already has clips — undo handles mistakes

### Toolbar layout
- Left sidebar strip (narrow vertical column) holds the tool icons, not the TopBar
- Phase 1 AppShell layout will need to be extended: add a left sidebar column alongside the middle region and timeline
- Two tools in Phase 2: Select (←→) and Blade (✂)

### Tool switching
- Keyboard shortcuts: **V** = Select tool, **B** = Blade tool (NLE convention, like Premiere)
- Active tool stored in `ui.activeTool` (already in store as `'select' | 'blade'`)

### Blade tool interaction
- With Blade active, clicking directly on a clip splits it at the exact click position
- Click position on the clip's time axis determines the split point
- No intermediate playhead-based step — direct click-to-split

### Clip deletion
- Click to select (in Select mode) → press Delete or Backspace to remove from timeline
- No confirmation dialog — Cmd+Z undoes the deletion

### Clip visual design — Colors
- One shared rotating color palette cycling across ALL clips (video and audio alike)
- Each new clip imported gets the next color from the array; clips are distinguished individually, not by track
- Suggested palette (Claude's discretion on exact shades): blue, violet, emerald, amber, rose, sky, fuchsia, teal
- Color is assigned at import time and stored on the Clip (new field: `color: string`)

### Clip visual design — Label
- Show filename + duration on each clip (e.g., `interview.mp4  2:34`)
- Label truncated to fit clip width; prioritize filename, drop duration if too narrow

### Clip visual design — Selection
- Selected clip shows a white border ring (2px outline)
- Unselected clips show no border

### Thumbnail generation — Timing
- Extract immediately on import (not lazy) — triggered as soon as the clip is added to the store
- Extraction runs in the Comlink ffmpeg Web Worker (extending the worker API added in Phase 1)

### Thumbnail generation — Frame count
- Dynamic: 1 frame per 5 seconds of clip duration (min 1 frame)
- Frames tiled horizontally to fill the clip width in the timeline

### Thumbnail generation — Loading state
- Animated shimmer/pulse skeleton in the clip's color while ffmpeg.wasm extracts frames
- No layout shift: clip occupies full width from the start; thumbnails replace the shimmer in-place
- `thumbnailUrl` field on Clip (already in store as `string | null`) extended to array: `thumbnailUrls: string[]` (or kept as `thumbnailUrl` pointing to a composite — Claude's discretion on storage shape)

### Undo / redo
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project constraints and requirements
- `.planning/PROJECT.md` — Tech stack constraints (React 19, @xzdarcy/react-timeline-editor v1.x, Zustand+Zundo), key decisions, scope
- `.planning/REQUIREMENTS.md` — Phase 2 requirements: IMPT-01, IMPT-02, TIME-01 through TIME-06, UNDO-01, UNDO-02, PREV-01

### Prior phase context (locked decisions)
- `.planning/phases/01-foundation/01-CONTEXT.md` — Store shape, Clip type fields, Zundo partialize rules, AppShell layout contract, dark theme

### Timeline library
- `node_modules/@xzdarcy/react-timeline-editor/dist/interface/timeline.d.ts` — Full Timeline component prop interface: `editorData`, `effects`, `onChange`, `onActionMoveEnd`, `onActionResizeEnd`, `onClickAction`, `getActionRender`, keyboard/cursor callbacks

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/store/index.ts` — `useStore` with Zundo temporal middleware; `ui.activeTool` already `'select' | 'blade'`, `ui.selectedClipId` already `string | null`
- `src/store/types.ts` — `Clip` type (needs `color` field added), `Track`, `UiState`, `StoreState`; `ClipSettings` stub ready for Phase 3
- `src/hooks/useTemporalStore.ts` — Reactive hook for undo/redo: `useTemporalStore(s => s.undo)`, `useTemporalStore(s => s.redo)`
- `src/workers/ffmpeg.worker.ts` — Comlink worker with `ping()` stub; Phase 2 adds `extractFrames(file: File, timestamps: number[]): Promise<string[]>` (or similar)
- `src/workers/ffmpeg.proxy.ts` — Singleton `getFfmpegProxy()` — already wired, just extend the worker API
- `src/components/AppShell.tsx` — Current layout: TopBar + middle region + 37vh timeline panel. Phase 2 adds left sidebar strip column

### Established Patterns
- Controlled display: `TimelinePanel` reads `editorData` derived from `useStore(state => state.tracks)` — never holds internal state
- Store actions dispatch via Zundo-wrapped `set()` — all clip mutations (add, move, resize, split, delete) go through store actions so undo history is captured automatically
- Test environment: `happy-dom` for React component tests; `@vitest-environment node` for Comlink worker tests
- `vi.mock('@xzdarcy/react-timeline-editor')` in component tests (canvas/ResizeObserver not available in happy-dom)

### Integration Points
- `TimelinePanel.tsx` → connect `editorData` to store: `useStore(state => state.tracks)` + `useStore(state => state.clips)` → derive `TimelineRow[]`
- `Timeline` `onChange` / `onActionMoveEnd` / `onActionResizeEnd` callbacks → dispatch store actions (move clip, resize/trim clip)
- `Timeline` `onClickAction` → select clip (`ui.selectedClipId`) or split clip (when Blade active)
- `AppShell.tsx` → add left sidebar column containing tool buttons; `ui.activeTool` drives active state
- `ffmpeg.worker.ts` → extend API with frame extraction method; `@ffmpeg/ffmpeg` is installed, ready to import inside the worker

</code_context>

<specifics>
## Specific Ideas

- The left sidebar strip layout is like a minimal NLE: narrow icon column on the far left, content to the right
- Clip colors are individual (per clip), not per-track — similar to how DaVinci Resolve colors individual clips

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-timeline-core*
*Context gathered: 2026-03-16*
