# Phase 8: Timeline Zoom - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire the `pixelsPerSecond` field (already in `UiState` from Phase 5) into the timeline's `scaleWidth` prop, add +/- and reset-to-fit buttons in a timeline header strip, and handle modifier+scroll zoom over the timeline. No playback, no scrubbing — zoom only.

</domain>

<decisions>
## Implementation Decisions

### Button placement
- Zoom controls live in a **timeline header strip** rendered above the track rows (not in TopBar)
- Strip is right-aligned: `[ − ]  [ + ]  [ ⊡ ]`
- Reset button is icon-only (fit/zoom-to-fit icon) with a tooltip on hover
- Same zinc-800 / hover:zinc-700 button style as the existing TopBar buttons

### Zoom range & step
- Range: **50–400 px/s**, hard-clamped at both ends
- Default: 100 px/s (existing `UiState` default — unchanged)
- Each **+** click: multiply by **1.25** (clamped to 400)
- Each **−** click: multiply by **0.8** (clamped to 50)
- Modifier+scroll uses the same 1.25×/0.8× multiplier per scroll tick

### Scroll zoom behavior
- Modifier: **Cmd/Ctrl** (`metaKey || ctrlKey`)
- Scroll event is on the timeline container element (wheel event listener)
- Anchor: **cursor position** — the timeline shifts so the time under the cursor stays fixed in the viewport
  - Compute `cursorTime = (cursorX - timelineLeft + scrollLeft) / oldPixelsPerSecond`
  - After updating `pixelsPerSecond`, set `scrollLeft` so `cursorTime` maps back to the same `cursorX`
- Prevent default on the wheel event when modifier is held (avoids browser zoom)

### Reset-to-fit
- Fit calculation: `pixelsPerSecond = (containerWidth × 0.9) / totalDuration`
  - `totalDuration` = max `endTime` across all clips; if zero (no clips) → snap to default 100 px/s
- Result is clamped to [50, 400] range
- Reading `containerWidth` via a `ref` on the timeline container element (same ref used for scroll anchor)

### Claude's Discretion
- Exact icon/symbol used for the fit button (⊡, ↔, or a custom SVG)
- Whether the wheel listener goes on the Timeline component's wrapper div or a dedicated overlay
- Debounce/throttle strategy for rapid scroll events

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Store
- `src/store/types.ts` — `UiState.pixelsPerSecond: number` (already present). Add `setPixelsPerSecond` action to `StoreActions`.
- `src/store/index.ts` — Where `setPixelsPerSecond` action will be added; verify Zundo `partialize` still excludes `ui`.

### Timeline component
- `src/components/TimelinePanel.tsx` — Pass `scaleWidth={pixelsPerSecond}` (with `scale={1}`) to `<Timeline>`. Add wheel event listener. Add timeline header strip.

### Zoom controls UI
- `src/components/TopBar.tsx` — Reference for button style; zoom buttons use the same zinc pattern but live in `TimelinePanel`, not here.

### Requirements
- `ZOOM-01`: +/- buttons — `.planning/REQUIREMENTS.md`
- `ZOOM-02`: modifier+scroll — `.planning/REQUIREMENTS.md`
- `ZOOM-03`: reset-to-fit — `.planning/REQUIREMENTS.md`

No external specs — requirements fully captured in decisions above and ROADMAP.md § Phase 8 success criteria.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `UiState.pixelsPerSecond: number` (default 100) — already in store, just needs a `setPixelsPerSecond` action
- `TopBar.tsx` button pattern (`className="text-sm font-medium px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"`) — reuse for zoom buttons

### Established Patterns
- Store actions follow the `set({ ui: { ...state.ui, field: value } })` spread pattern
- `UiState` is excluded from Zundo history via `partialize` — `pixelsPerSecond` changes won't pollute undo stack (correct behavior)

### Integration Points
- `TimelinePanel.tsx:69` — `<Timeline>` component; add `scale={1}` and `scaleWidth={pixelsPerSecond}` props
- `TimelinePanel.tsx` — Add a wrapper div with `ref` for container width reading and `onWheel` handler
- New timeline header strip: `<div className="flex items-center justify-end ...">[ − ][ + ][ ⊡ ]</div>` rendered above `<Timeline>`
- `AppShell.tsx` — No changes needed; `TimelinePanel` is self-contained

</code_context>

<specifics>
## Specific Ideas

No specific "I want it like X" references — standard zoom controls apply.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 08-timeline-zoom*
*Context gathered: 2026-03-18*
