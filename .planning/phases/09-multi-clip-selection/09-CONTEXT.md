# Phase 9: Multi-Clip Selection - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Add multi-clip selection to the timeline: Cmd/Ctrl+click to select multiple clips, then delete all selected via Backspace, and apply clip settings to all selected simultaneously. Group drag (SEL-04) is explicitly deferred to v2. No new UI chrome beyond a count badge in ClipSettingsPanel.

</domain>

<decisions>
## Implementation Decisions

### Selection model
- Cmd/Ctrl+click **toggles** a clip in/out of `selectedClipIds`. `selectedClipId` (single) remains and always points to the last Cmd/Ctrl-clicked clip — it is the "anchor" for settings display.
- Plain single-click behavior is unchanged: selects one clip, clears `selectedClipIds` to `[]`.
- Clicking an empty area of the timeline deselects all: `selectedClipId = null`, `selectedClipIds = []`.
- No Shift+click range-select — individual toggle only. Range-select deferred to v2.
- The `handleClickAction` callback in `TimelinePanel.tsx` already receives `React.MouseEvent` (currently `_e`) — read `e.metaKey || e.ctrlKey` to branch into multi-select path.

### Visual feedback on timeline
- All clips in `selectedClipIds` get the same white outline ring (`outline outline-2 outline-offset-[-2px] outline-white`) that the single-selected clip already uses.
- No additional color tinting or special treatment for the anchor clip vs. the others.
- `getActionRender` must check `selectedClipIds.includes(clip.id)` in addition to `selectedClipId === clip.id` when computing `isSelected`.

### ClipSettingsPanel — multi-select state
- When 2+ clips are selected, the panel continues to show settings for `selectedClipId` (the last-clicked clip's values). This is the "reference" clip.
- A small badge in the panel header reads **"N clips selected"** (e.g. "3 clips selected") whenever `selectedClipIds.length > 1`.
- Any setting change fans out immediately to **all** clips in `selectedClipIds` via individual `updateClipSettings` calls — no "Apply to all" button.
- When `selectedClipIds` is empty (or has 1 entry), behavior is identical to current single-clip mode.

### Bulk delete (SEL-02)
- Extend `useKeyboardShortcuts`: when Delete/Backspace fires and `selectedClipIds.length > 0`, delete all clips in `selectedClipIds` in a single undoable action (one `set()` call — not N separate `deleteClip` calls).
- After bulk delete, `selectedClipId = null` and `selectedClipIds = []`.
- No new Delete button added to the UI.

### Group move (SEL-04)
- **Deferred to v2.** `@xzdarcy/react-timeline-editor` has no native group drag (issue #74 open). The delta-based `onActionMoveEnd` workaround is unvalidated and risks snap/jitter artifacts. SEL-04 will be excluded from Phase 9's scope and success criteria.

### New store actions needed
- `toggleClipSelection(clipId: string)` — adds to `selectedClipIds` if absent, removes if present; also sets `selectedClipId = clipId`.
- `clearSelection()` — sets `selectedClipId = null`, `selectedClipIds = []`.
- `deleteSelectedClips()` — bulk-deletes all clips in `selectedClipIds` in one `set()` call; clears selection.
- These actions update `UiState` fields which are excluded from Zundo history (correct — selection state is not undoable).

### Claude's Discretion
- Whether `deleteSelectedClips` lives as a new store action or is inlined in `useKeyboardShortcuts` as a series of store mutations wrapped in `setState`.
- Exact CSS for the "N clips selected" badge (color, size, placement within the panel header).
- Whether `onClickRow` or `onClickTimeline` from the library is the right callback for empty-area deselect, or a `mousedown` on the container div.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Store
- `src/store/types.ts` — `UiState.selectedClipIds: string[]` already present (Phase 5). `selectClip` action and `deleteClip` action to extend/complement with new multi-select actions.
- `src/store/index.ts` — Where new `toggleClipSelection`, `clearSelection`, `deleteSelectedClips` actions will be added; verify Zundo `partialize` still excludes `ui`.

### Timeline interaction
- `src/components/TimelinePanel.tsx` — `handleClickAction` (line ~62) receives `React.MouseEvent` (`_e` currently ignored) — extend to detect `metaKey || ctrlKey`. `getActionRender` (line ~75) to check `selectedClipIds.includes(clip.id)`. Empty-area deselect via library callback or container mousedown.

### Keyboard shortcuts
- `src/hooks/useKeyboardShortcuts.ts` — Extend Delete/Backspace handler to loop over `selectedClipIds` for bulk delete.

### Settings panel
- `src/components/ClipSettingsPanel.tsx` — Add `selectedClipIds` read; fan out changes to all selected clips; add "N clips selected" badge.

### Clip rendering
- `src/components/ClipAction.tsx` — `isSelected` prop already drives the white outline; no change to rendering logic, only to how `isSelected` is computed in `getActionRender`.

### Requirements
- `.planning/REQUIREMENTS.md` — SEL-01, SEL-02, SEL-03 (SEL-04 deferred to v2).

No external specs — requirements fully captured in decisions above and ROADMAP.md § Phase 9 success criteria.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `UiState.selectedClipIds: string[]` — already in store with default `[]` (Phase 5). No new store shape changes needed, only actions.
- `selectClip(clipId)` — sets `selectedClipId`; companion `toggleClipSelection` follows same pattern.
- `deleteClip(clipId)` — clears `selectedClipId` in the same `set()` call; `deleteSelectedClips` follows same single-`set()` discipline.
- `ClipAction` `isSelected` prop + white outline — already works; just needs to check `selectedClipIds.includes` in addition to `selectedClipId ===`.

### Established Patterns
- Store actions use `set({ ui: { ...state.ui, field: value } })` spread — same for new selection actions.
- `UiState` excluded from Zundo via `partialize` — selection state is not undoable (correct).
- `useKeyboardShortcuts` reads `selectedClipId` from store snapshot (`useStore.getState()`) — extend to also read `selectedClipIds`.
- `!= null` (loose equality) for optional store fields — consistent throughout.

### Integration Points
- `TimelinePanel.tsx:62` — `handleClickAction`: change `_e` to `e`, add `if (e.metaKey || e.ctrlKey) { toggleClipSelection(...) } else { selectClip(...) }` branch.
- `TimelinePanel.tsx:75` — `getActionRender`: `isSelected={selectedClipId === clip.id || selectedClipIds.includes(clip.id)}`.
- `useKeyboardShortcuts.ts:45` — Extend Delete/Backspace block to handle `selectedClipIds.length > 0`.
- `ClipSettingsPanel.tsx:6` — Add `selectedClipIds` selector; fan out `updateClipSettings` to each; add badge when `length > 1`.
- `AppShell.tsx` — No changes needed.

</code_context>

<specifics>
## Specific Ideas

No specific "I want it like X" references — standard multi-select behavior (Figma/Premiere-style toggle) applies.

</specifics>

<deferred>
## Deferred Ideas

- **SEL-04 (group drag)** — defer to v2. `@xzdarcy` library has no native group drag (issue #74). Delta-based workaround is unvalidated and risky.
- **Shift+click range-select** — defer to v2. Cross-track range semantics are non-trivial to define correctly.

</deferred>

---

*Phase: 09-multi-clip-selection*
*Context gathered: 2026-03-18*
