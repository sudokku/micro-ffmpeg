# Phase 3: Clip Settings - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Per-clip settings panel: blur, brightness, contrast, saturation filter sliders; crop rectangle (x/y/w/h pixel inputs); output resize dimensions (w/h with aspect-ratio lock). All settings persist in the `clipSettings` slice of the Zustand store and are undo-able via Zundo. No playback, no export rendering — this phase is pure UI + store wiring.

</domain>

<decisions>
## Implementation Decisions

### Panel location
- Right sidebar, always visible, 240px wide
- AppShell gets a new right column alongside the existing layout (ToolSidebar | main area | right sidebar)
- Timeline (37vh) remains at the bottom spanning full width
- When no clip is selected: show hint text — "Select a clip to edit its settings"
- When a clip is selected: show truncated filename as panel header, then all controls below

### Filter sliders
- Four sliders: Blur, Brightness, Contrast, Saturation
- Displayed in order: Blur → Brightness → Contrast → Saturation
- Claude's discretion on exact slider ranges (should map to ffmpeg filter parameters for Phase 4 consumption)

### Crop input
- Four numeric pixel inputs: X offset, Y offset, Width, Height
- Default values: X=0, Y=0, W=source video width, H=source video height (effectively no crop)
- "No crop" detection: if values equal source dimensions with X=0, Y=0, skip ffmpeg crop filter in export
- No visual crop overlay — text fields only

### Resize input
- Two pixel inputs: Width × Height
- Aspect-ratio lock toggle, **on by default**
- When locked: changing one dimension auto-calculates the other from the source aspect ratio
- Default values: source video width × source video height (effectively no resize)
- "No resize" detection: if values equal source dimensions, skip ffmpeg scale filter in export

### Store — ClipSettings shape (Phase 3 populates the stub)
- Extend the `ClipSettings` interface in `src/store/types.ts` with:
  - `blur: number` (default 0)
  - `brightness: number` (Claude's discretion on range/default)
  - `contrast: number` (Claude's discretion on range/default)
  - `saturation: number` (Claude's discretion on range/default)
  - `crop: { x: number; y: number; width: number; height: number } | null` (null = no crop set yet, populate with source dims on first edit)
  - `resize: { width: number; height: number } | null` (null = no resize set yet)
- `clipSettings` is already in Zundo `TrackedState` — undo/redo comes for free

### Claude's Discretion
- Exact filter slider ranges (must be compatible with ffmpeg filter values for Phase 4)
- Slider step increments and display formatting
- Exact Tailwind styling for the right sidebar
- Whether a "Reset" button per section is included
- Aspect ratio calculation logic details

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project constraints and requirements
- `.planning/PROJECT.md` — Tech stack constraints (React 19, Zustand+Zundo), key decisions, scope
- `.planning/REQUIREMENTS.md` — Phase 3 requirements: CLIP-01 through CLIP-06

### Prior phase context (locked decisions)
- `.planning/phases/02-timeline-core/02-CONTEXT.md` — Established patterns: store-first design, dark zinc-950 theme, left sidebar strip, AppShell layout contract
- `.planning/phases/02-timeline-core/02-01-SUMMARY.md` — Current `ClipSettings` stub definition, `TrackedState` type (confirms clipSettings is tracked by Zundo)

### Store shape
- `src/store/types.ts` — Current `ClipSettings` stub, `StoreState`, `TrackedState` — Phase 3 extends `ClipSettings` here
- `src/components/AppShell.tsx` — Current layout: TopBar + (ToolSidebar | main | timeline) — Phase 3 adds right sidebar column

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/store/types.ts` — `ClipSettings` stub (`clipId: string` only) ready to be populated; `TrackedState` already includes `clipSettings`
- `src/store/index.ts` — `useStore`; `clipSettings` slice initialized as `{}`; needs `updateClipSettings` action added
- `src/components/AppShell.tsx` — Current flex-row layout: ToolSidebar + main + timeline. Add right sidebar as a new `flex-none w-60` column inside the flex-row
- `src/components/ToolSidebar.tsx` — 40px left sidebar strip pattern; right sidebar can follow same structural pattern (different width, different content)
- `ui.selectedClipId` in store — drives which clip's settings to display; already reactive

### Established Patterns
- Store-first: all settings changes dispatch through a store action; component never holds local filter state
- Zundo partialize: `clipSettings` is already in `TrackedState` — any store action that mutates it is automatically undo-able
- Dark theme: `bg-zinc-950 text-white`, borders `border-zinc-800`, muted text `text-zinc-500`
- Component tests use `happy-dom`; store-level tests use node environment

### Integration Points
- `AppShell.tsx` → add `<ClipSettingsPanel />` as right column in the flex-row (alongside ToolSidebar and main)
- `src/store/index.ts` → add `updateClipSettings(clipId, patch)` action; mutates `clipSettings[clipId]` through Zundo-captured `set()`
- Phase 4 (export) will read `clipSettings[clipId]` to build ffmpeg filter chains — field names and value ranges established here must be stable

</code_context>

<specifics>
## Specific Ideas

- Right sidebar is always visible (240px), never slides in/out — stable layout, no reflow when selecting/deselecting clips
- Crop default = source dimensions (not empty fields) — "no crop" is inferred by comparing to source, not by null check
- Aspect ratio lock is ON by default for resize — protects against accidental stretching

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-clip-settings*
*Context gathered: 2026-03-17*
