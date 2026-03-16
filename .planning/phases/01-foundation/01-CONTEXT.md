# Phase 1: Foundation - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Technical chassis only — Vite scaffold, Zustand store wired with Zundo, Comlink/ffmpeg.wasm Web Worker, and @xzdarcy/react-timeline-editor rendering an empty two-track shell. No user-facing features. All v1 requirements land in Phases 2–4.

</domain>

<decisions>
## Implementation Decisions

### Store: Clip identity
- Clips use UUID strings as primary key (`crypto.randomUUID()`) — collision-free, serializable, safe across undo/redo delete cycles

### Store: Data shape
- Normalized layout: `clips: Record<string, Clip>` at the top level; tracks hold `clipIds: string[]` (ordered)
- Track keys: `video` and `audio` (two fixed tracks, matches @xzdarcy/react-timeline-editor two-row model)

### Store: Clip fields
Full Clip shape defined in Phase 1 (even though Phase 2 fills the data):
- `id: string` (UUID)
- `trackId: 'video' | 'audio'`
- `sourceFile: File` (reference to the raw File object)
- `sourceDuration: number` (seconds)
- `startTime: number` (position on timeline, seconds)
- `endTime: number` (position on timeline, seconds)
- `trimStart: number` (seconds trimmed from clip head)
- `trimEnd: number` (seconds trimmed from clip tail)
- `thumbnailUrl: string | null` (extracted frame blob URL, null until generated)

### Store: ui slice (excluded from Zundo)
- `selectedClipId: string | null`
- `activeTool: 'select' | 'blade'`

### Store: export slice (excluded from Zundo)
- Claude's discretion — at minimum `status: 'idle' | 'rendering' | 'done' | 'error'` and `progress: number`

### Store: Zundo partialize
- MUST include in temporal history: `tracks`, `clips`, `clipSettings`
- MUST exclude: `ui`, `export`

### App shell layout
- Top bar + timeline at bottom layout
- Header (~48px): app name "micro-ffmpeg" + tool buttons placeholder
- Middle region (flex-grow): empty placeholder div with label "Clip settings — Phase 3"
- Timeline (~35–40% viewport height): @xzdarcy/react-timeline-editor with two empty rows (video + audio)

### Visual theme
- Dark color scheme: background in zinc-950 / #0f0f0f range — no light mode, no system preference toggle in v1

### Claude's Discretion
- Exact Clip fields for `ClipSettings` slice shape (blur, brightness, contrast, saturation, crop, resize) — Phase 1 can stub the type, values filled in Phase 3
- ESLint/Prettier config strictness
- TypeScript strict mode level
- Directory structure within `src/` (store/, workers/, components/, hooks/, types/)
- Exact Comlink worker interface beyond the `ping` smoke test
- export slice full shape

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements are fully captured in decisions above and in:
- `.planning/PROJECT.md` — Tech stack constraints, key decisions, Zundo partialize rule
- `.planning/REQUIREMENTS.md` — Full v1 requirement list (Phases 2–4 deliver these; Phase 1 sets up the chassis)
- `.planning/ROADMAP.md` — Phase 1 success criteria and plan outlines

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield repository. Only `.git` and `.planning/` exist.

### Established Patterns
- None yet — Phase 1 establishes all patterns.

### Integration Points
- @xzdarcy/react-timeline-editor must receive a controlled `actions` prop derived from the Zustand store (never hold clip state internally)
- Comlink worker exposes typed interface; main thread imports proxy only — never imports ffmpeg directly

</code_context>

<specifics>
## Specific Ideas

- Shell layout matches the ASCII mockup chosen during discussion: top bar → middle placeholder → timeline panel
- The timeline is a controlled display from day one — this pattern must be established in Phase 1 before any clip data exists

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-16*
