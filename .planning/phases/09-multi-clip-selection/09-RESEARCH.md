# Phase 9: Multi-Clip Selection - Research

**Researched:** 2026-03-18
**Domain:** Zustand multi-selection state, React keyboard event handling, timeline clip rendering
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Selection model:** Cmd/Ctrl+click toggles a clip in/out of `selectedClipIds`. `selectedClipId` (single) remains and always points to the last Cmd/Ctrl-clicked clip as the anchor for settings display. Plain single-click is unchanged: selects one clip, clears `selectedClipIds` to `[]`. Clicking empty timeline area deselects all.
- **No Shift+click range-select** — individual toggle only.
- **Visual feedback:** All clips in `selectedClipIds` get `outline outline-2 outline-offset-[-2px] outline-white` — same ring used by the single-selected clip. No color tinting. No anchor vs. non-anchor distinction.
- **ClipSettingsPanel:** Shows settings for `selectedClipId` (the anchor) when 2+ clips are selected. A small badge in the panel header reads "N clips selected" when `selectedClipIds.length > 1`. Any setting change fans out immediately to ALL clips in `selectedClipIds` via individual `updateClipSettings` calls — no "Apply to all" button.
- **Bulk delete:** Extend `useKeyboardShortcuts` — when Delete/Backspace fires and `selectedClipIds.length > 0`, delete all clips in a single undoable action (one `set()` call). After bulk delete, `selectedClipId = null` and `selectedClipIds = []`.
- **No new Delete button** added to the UI.
- **New store actions:** `toggleClipSelection(clipId)`, `clearSelection()`, `deleteSelectedClips()`.
- **Selection state lives in `UiState`** — excluded from Zundo history, so selection is not undoable.

### Claude's Discretion

- Whether `deleteSelectedClips` lives as a new store action or is inlined in `useKeyboardShortcuts` as a series of store mutations wrapped in `setState`.
- Exact CSS for the "N clips selected" badge (color, size, placement within the panel header).
- Whether `onClickRow` or `onClickTimeline` from the library is the right callback for empty-area deselect, or a `mousedown` on the container div.

### Deferred Ideas (OUT OF SCOPE)

- **SEL-04 (group drag)** — deferred to v2. `@xzdarcy/react-timeline-editor` has no native group drag (issue #74 open). Delta-based `onActionMoveEnd` workaround is unvalidated and risky.
- **Shift+click range-select** — deferred to v2. Cross-track range semantics are non-trivial.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SEL-01 | User can select multiple clips via Cmd/Ctrl+click | `handleClickAction` in `TimelinePanel.tsx` already receives `React.MouseEvent` (`_e` currently ignored); reading `e.metaKey || e.ctrlKey` unlocks multi-select path. `toggleClipSelection` store action follows the same `set({ ui: ... })` pattern as `selectClip`. |
| SEL-02 | User can delete all selected clips at once (Backspace) | `deleteSelectedClips` performs a single `set()` that removes all clips in `selectedClipIds` from `clips` and all relevant `track.clipIds` arrays — mirrors `deleteClip` logic but batched. Zundo captures this as one undo step. |
| SEL-03 | User can apply clip settings to all selected clips simultaneously | `ClipSettingsPanel` reads `selectedClipIds`; on any setting change, calls `updateClipSettings(id, patch)` for each id in the array. Because each `updateClipSettings` call produces a separate Zundo history entry, fan-out must be wrapped in a single `set()` call or use `useStore.setState` to batch. |
| SEL-04 | User can move selected clips together by dragging one | **Deferred to v2** per CONTEXT.md — not addressed in Phase 9. |
</phase_requirements>

---

## Summary

Phase 9 is a pure-state-and-wiring phase: no new UI chrome beyond one badge string, no new external dependencies, and no external API calls. Every piece of infrastructure it needs already exists in the codebase.

`selectedClipIds: string[]` is already declared in `UiState` and defaults to `[]`. The `partialize` function in `store/index.ts` already excludes the entire `ui` slice from Zundo, which is correct — selection changes are not undoable. The `deleteClip` action demonstrates the correct pattern: mutate `clips`, mutate `tracks[trackId].clipIds`, and clear selection all inside one `set()` call so Zundo records it as a single undo step. `deleteSelectedClips` follows the same discipline across N clips.

The timeline library exposes `onClickRow` (confirmed in the bundled CJS source). This fires when the user clicks the row area rather than a clip action, making it the appropriate hook for empty-area deselect — simpler than attaching a `mousedown` handler to the container div.

**Primary recommendation:** Implement `toggleClipSelection`, `clearSelection`, and `deleteSelectedClips` as store actions, wire them into `TimelinePanel.tsx` and `useKeyboardShortcuts.ts`, update `getActionRender` and `ClipSettingsPanel`, then add tests for each path.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | Existing | Selection state management | Already the store — `ui.selectedClipIds` field is in place |
| zundo | Existing | Temporal undo/redo | `partialize` already excludes `ui`; no changes needed to history config |
| React 19 | Existing | Component layer | Event handler upgrade (`_e` → `e`) is trivial |

No new packages required.

---

## Architecture Patterns

### Recommended Project Structure

No new files needed beyond the four existing files being modified:

```
src/
├── store/
│   ├── types.ts         # Add 3 new actions to StoreActions interface
│   └── index.ts         # Implement toggleClipSelection, clearSelection, deleteSelectedClips
├── components/
│   ├── TimelinePanel.tsx    # Wire metaKey/ctrlKey branch + onClickRow deselect
│   └── ClipSettingsPanel.tsx # Read selectedClipIds, fan-out, add badge
└── hooks/
    └── useKeyboardShortcuts.ts  # Extend Delete/Backspace to call deleteSelectedClips
```

### Pattern 1: Single-set Bulk Mutation (existing project convention)

**What:** All mutations to `clips`, `tracks`, and `ui` for a single logical operation go into one `set()` call.
**When to use:** Whenever the logical operation would otherwise produce multiple Zundo history entries. `deleteClip` is the canonical example.
**Example:**
```typescript
// Mirrors the existing deleteClip pattern — confirmed in src/store/index.ts lines 132-151
deleteSelectedClips: () => {
  set((state) => {
    const ids = new Set(state.ui.selectedClipIds)
    if (ids.size === 0) return state

    // Remove clips
    const remainingClips = Object.fromEntries(
      Object.entries(state.clips).filter(([id]) => !ids.has(id))
    )

    // Remove ids from each track's clipIds array
    const updatedTracks = {
      video: {
        ...state.tracks.video,
        clipIds: state.tracks.video.clipIds.filter((id) => !ids.has(id)),
      },
      audio: {
        ...state.tracks.audio,
        clipIds: state.tracks.audio.clipIds.filter((id) => !ids.has(id)),
      },
    }

    return {
      clips: remainingClips,
      tracks: updatedTracks,
      ui: { ...state.ui, selectedClipId: null, selectedClipIds: [] },
    }
  })
},
```

### Pattern 2: UiState spread (existing project convention)

**What:** All `ui` writes use `set({ ui: { ...state.ui, field: value } })`.
**When to use:** Every new selection action follows this — never replace the whole `ui` object from scratch.
**Example:**
```typescript
// Source: src/store/index.ts — selectClip, setActiveTool, setPixelsPerSecond
toggleClipSelection: (clipId) => {
  const state = get()
  const ids = state.ui.selectedClipIds
  const next = ids.includes(clipId)
    ? ids.filter((id) => id !== clipId)
    : [...ids, clipId]
  set({ ui: { ...state.ui, selectedClipId: clipId, selectedClipIds: next } })
},

clearSelection: () => {
  const state = get()
  set({ ui: { ...state.ui, selectedClipId: null, selectedClipIds: [] } })
},
```

### Pattern 3: getState() snapshot in keyboard handlers (existing project convention)

**What:** `useKeyboardShortcuts` reads fresh store state via `useStore.getState()` inside the event handler, not via the React hook selector.
**When to use:** Keyboard events — avoids stale closures.
**Example:**
```typescript
// Source: src/hooks/useKeyboardShortcuts.ts lines 45-51
if ((e.key === 'Delete' || e.key === 'Backspace')) {
  const { selectedClipIds, selectedClipId } = useStore.getState().ui
  if (selectedClipIds.length > 0) {
    e.preventDefault()
    useStore.getState().deleteSelectedClips()
  } else if (selectedClipId) {
    e.preventDefault()
    useStore.getState().deleteClip(selectedClipId)
  }
}
```

### Pattern 4: Fan-out settings update (SEL-03 — needs care)

**What:** Applying a setting change to N clips.
**When to use:** `ClipSettingsPanel` change handlers when `selectedClipIds.length > 1`.
**The pitfall:** Calling `updateClipSettings` N times in a row creates N Zundo history entries — one undo per clip. This is likely undesirable. The fix: add a `bulkUpdateClipSettings` action (or inline the logic) that patches all clips inside a single `set()` call, producing one undo step.

```typescript
// Option A: new store action (recommended)
bulkUpdateClipSettings: (ids: string[], patch: Partial<Omit<ClipSettings, 'clipId'>>) => {
  set((state) => {
    const updated: Record<string, ClipSettings> = { ...state.clipSettings }
    for (const id of ids) {
      const existing = updated[id] ?? { clipId: id, blur: 0, brightness: 0, contrast: 1, saturation: 1, crop: null, resize: null, speed: 1 as const, rotation: 0 as const, volume: 1.0, hue: 0, flipH: false, flipV: false }
      updated[id] = { ...existing, ...patch }
    }
    return { clipSettings: updated }
  })
},
```

### Pattern 5: Empty-area deselect via onClickRow

**What:** `@xzdarcy/react-timeline-editor` exposes `onClickRow` (confirmed in library CJS bundle). It fires when the user clicks the row/track area rather than a clip action.
**When to use:** To detect empty-area clicks and call `clearSelection()`.
**Example:**
```typescript
const handleClickRow = useCallback(
  (_e: React.MouseEvent, param: { row: TimelineRow; time: number }) => {
    clearSelection()
  },
  [clearSelection]
)

// In JSX:
<Timeline
  ...
  onClickRow={handleClickRow}
/>
```

### Anti-Patterns to Avoid

- **Multiple `set()` calls for one logical operation:** Each `set()` call creates a Zundo history entry. Bulk delete using `deleteClip` in a loop produces N undo steps — the user has to press Cmd+Z N times to undo a single delete gesture. Always consolidate into one `set()`.
- **Calling `updateClipSettings` in a loop for fan-out:** Same N-undo-steps problem. Batch via `bulkUpdateClipSettings` or inline the loop inside one `set()`.
- **Putting `selectedClipIds` anywhere outside `UiState`:** If it moves to tracked state, undo/redo starts reverting selection, which is wrong and causes confusing UX.
- **Reading `selectedClipIds` via React hook inside keyboard handler:** The hook selector creates a stale closure. Always use `useStore.getState().ui.selectedClipIds` inside event handlers.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Batch state mutation | Custom event queue | Single Zustand `set()` call | Zustand + Zundo already serializes; one `set()` = one undo step |
| Set membership check | Manual dedup logic | `Array.includes` or `new Set(ids)` | The array is small (≤ dozens of clips); no performance concern |
| Undo grouping | Transaction wrappers | Consolidate into one `set()` | Zundo tracks individual `set()` calls as history entries |

---

## Common Pitfalls

### Pitfall 1: N Undo Steps for Bulk Delete

**What goes wrong:** Calling `deleteClip(id)` inside a loop for each selected clip creates N separate Zundo history entries. User presses Cmd+Z and only one clip comes back.
**Why it happens:** Each `deleteClip` call invokes `set()`, which Zundo records as a checkpoint.
**How to avoid:** `deleteSelectedClips` must call `set()` exactly once with the full mutations applied in the callback.
**Warning signs:** Test `undo after deleteSelectedClips restores all N clips` fails — only one clip is restored.

### Pitfall 2: Multi-Select Fan-out Also Creates N Undo Steps

**What goes wrong:** `commitBlur` in `ClipSettingsPanel` calls `updateClipSettings(clipId, patch)` — fine for single clip. If the handler is extended to loop over `selectedClipIds` calling `updateClipSettings` per id, it creates N history entries.
**How to avoid:** Introduce `bulkUpdateClipSettings(ids, patch)` that batches into one `set()`. Call it when `selectedClipIds.length > 1`.
**Warning signs:** Undoing a fan-out setting change partially reverts — some clips keep the new value.

### Pitfall 3: `deriveEditorData` Signature Mismatch

**What goes wrong:** `deriveEditorData` currently accepts `selectedClipId: string | null`. The timeline library uses the `selected` field on actions for visual selection state. If multi-select is not surfaced here, the library's internal selection state diverges from the store.
**How to avoid:** `getActionRender` in `TimelinePanel` drives the white-ring UI independently of the library's `action.selected` field — it uses `isSelected` prop on `ClipAction`. The `deriveEditorData` function and `action.selected` can stay as-is (single-clip only) because `ClipAction.isSelected` already controls the visual. No changes to `deriveEditorData` are required.
**Warning signs:** Clips appear highlighted/unhighlighted incorrectly after switching tools or scrolling.

### Pitfall 4: `handleClickAction` Dependency Array Omits New Actions

**What goes wrong:** The new `toggleClipSelection` and `clearSelection` store action references are added to `handleClickAction` but not included in the `useCallback` dependency array.
**How to avoid:** Add `toggleClipSelection` and `clearSelection` to both the destructure from `useStore` and the `useCallback` deps array.
**Warning signs:** Multi-select works on first use but breaks after re-renders because the handler closes over stale store refs.

### Pitfall 5: `useKeyboardShortcuts` Effect Dependency

**What goes wrong:** The `useEffect` in `useKeyboardShortcuts` currently lists `[selectedClipId]` as its dependency. If the bulk delete path reads `selectedClipIds` from `getState()` inside the handler, the dependency array is still correct (no new selector needed). But if a developer adds a hook selector for `selectedClipIds` and accidentally omits it from deps, the handler will have a stale value.
**How to avoid:** Keep using `useStore.getState().ui.selectedClipIds` inside the handler body. Do not add a new `useStore` hook selector for `selectedClipIds` in this file.

### Pitfall 6: Empty `selectedClipIds` vs. Single-item array

**What goes wrong:** After a plain single-click, `selectedClipId` is set but `selectedClipIds` is `[]` (not `[clipId]`). The badge "N clips selected" must check `selectedClipIds.length > 1` not `> 0`. Fan-out in `ClipSettingsPanel` must check `length > 1` to fall through to single-clip mode.
**How to avoid:** Document the invariant clearly: `selectedClipIds` is empty for single-clip selection; it only contains entries when 2+ clips are selected via Cmd/Ctrl+click. Verify with a unit test: after `selectClip(id)`, assert `selectedClipIds === []`.

---

## Code Examples

Verified patterns from the actual source files in this repository:

### Adding a new action to StoreActions (types.ts pattern)

```typescript
// Source: src/store/types.ts — StoreActions interface (lines 55-68)
// Add to StoreActions:
toggleClipSelection: (clipId: string) => void
clearSelection: () => void
deleteSelectedClips: () => void
bulkUpdateClipSettings: (ids: string[], patch: Partial<Omit<ClipSettings, 'clipId'>>) => void
```

### Partialize must include new action names

```typescript
// Source: src/store/index.ts lines 214-219
// The destructure in partialize must name every action to exclude it:
const { ui, export: _export, addClip, moveClip, trimClip, splitClip, deleteClip,
  selectClip, setActiveTool, updateClipSettings, setExportStatus, setExportProgress,
  setWaveformPeaks, setPixelsPerSecond,
  // ADD:
  toggleClipSelection, clearSelection, deleteSelectedClips, bulkUpdateClipSettings,
  ...tracked } = state
return tracked
```

### ClipAction isSelected update (TimelinePanel.tsx getActionRender)

```typescript
// Source: src/components/TimelinePanel.tsx lines 75-88 — add selectedClipIds selector
const selectedClipIds = useStore((s) => s.ui.selectedClipIds)

const getActionRender = useCallback(
  (action: TimelineAction, _row: TimelineRow) => {
    const clip = clips[action.id]
    if (!clip) return null
    return (
      <ClipAction
        clip={clip}
        isSelected={selectedClipId === clip.id || selectedClipIds.includes(clip.id)}
        cursorClass={cursorClass}
      />
    )
  },
  [clips, selectedClipId, selectedClipIds, cursorClass]
)
```

### Badge in ClipSettingsPanel header

```typescript
// Source: src/components/ClipSettingsPanel.tsx lines 114-119 (header area)
// Replace the existing <h3> with:
<div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
  <h3 className="text-sm font-medium text-zinc-300 truncate">{clip.sourceFile.name}</h3>
  {selectedClipIds.length > 1 && (
    <span className="ml-2 flex-shrink-0 text-xs font-medium text-zinc-400 bg-zinc-800 rounded px-1.5 py-0.5">
      {selectedClipIds.length} clips
    </span>
  )}
</div>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single `selectedClipId` | `selectedClipId` (anchor) + `selectedClipIds[]` (set) | Phase 5 (store foundation) | `selectedClipIds` field already exists in the store; no schema migration needed |
| `deleteClip` called per clip | `deleteSelectedClips` batches all into one `set()` | Phase 9 | One undo step for bulk delete |

---

## Open Questions

1. **Should `deleteSelectedClips` be a store action or inlined in `useKeyboardShortcuts`?**
   - What we know: The existing `deleteClip` lives as a store action. `useKeyboardShortcuts` calls it via `useStore.getState().deleteClip(clipId)`.
   - What's unclear: whether inlining the bulk logic in the hook is acceptable given it bypasses the store's action encapsulation.
   - Recommendation: Make it a store action (`deleteSelectedClips`) for consistency and testability. Store action tests are simpler to write than hook tests.

2. **`bulkUpdateClipSettings` as a new action or inline fan-out?**
   - What we know: SEL-03 requires all selected clips receive the same setting change as one logical operation. Without batching, N Zundo entries are created.
   - What's unclear: How often users will actually want to undo a fan-out change — if seldom, N entries may be acceptable.
   - Recommendation: Add `bulkUpdateClipSettings` as a store action. It mirrors `updateClipSettings` but accepts an array of IDs. This is the safer choice from a UX perspective.

3. **`onClickRow` for empty-area deselect — what parameters does it receive?**
   - What we know: `onClickRow` is confirmed present in the library bundle. The CJS source shows its props shape includes `onClickRow: e` (where `e` is the callback). The callback likely mirrors `onClickAction` shape.
   - What's unclear: exact TypeScript signature of the callback parameters.
   - Recommendation: At implementation time, use `(e: React.MouseEvent, param: { row: TimelineRow; time: number }) => void` as the inferred type (same pattern as `onClickAction`). If the library types don't export this, fall back to `(e: React.MouseEvent, param: unknown) => void` or add a `mousedown` handler on the container div as a fallback.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (confirmed in `vitest.config.ts`) |
| Config file | `/Users/radu/Developer/micro-ffmpeg/vitest.config.ts` |
| Quick run command | `npx vitest run src/store/store.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEL-01 | `toggleClipSelection(id)` adds id to `selectedClipIds`, sets `selectedClipId`; calling again removes it | unit | `npx vitest run src/store/store.test.ts` | ✅ (extend existing) |
| SEL-01 | `clearSelection()` sets both fields to null/[] | unit | `npx vitest run src/store/store.test.ts` | ✅ (extend existing) |
| SEL-01 | `selectClip(id)` clears `selectedClipIds` to [] (invariant) | unit | `npx vitest run src/store/store.test.ts` | ✅ (extend existing) |
| SEL-01 | `toggleClipSelection` is NOT reverted by undo | unit | `npx vitest run src/store/store.test.ts` | ✅ (extend existing) |
| SEL-02 | `deleteSelectedClips()` removes all clips from `clips` and `tracks` in one undo step | unit | `npx vitest run src/store/store.test.ts` | ✅ (extend existing) |
| SEL-02 | Single undo after `deleteSelectedClips` restores all N clips | unit | `npx vitest run src/store/store.test.ts` | ✅ (extend existing) |
| SEL-03 | `bulkUpdateClipSettings([id1, id2], patch)` applies patch to both clips | unit | `npx vitest run src/store/store.test.ts` | ✅ (extend existing) |
| SEL-03 | Single undo after `bulkUpdateClipSettings` reverts all clip settings | unit | `npx vitest run src/store/store.test.ts` | ✅ (extend existing) |
| SEL-03 | Badge "N clips selected" renders when `selectedClipIds.length > 1` | unit (render) | `npx vitest run src/components/ClipSettingsPanel.test.tsx` | ✅ (extend existing) |
| SEL-03 | Badge not shown when `selectedClipIds.length <= 1` | unit (render) | `npx vitest run src/components/ClipSettingsPanel.test.tsx` | ✅ (extend existing) |

### Sampling Rate

- **Per task commit:** `npx vitest run src/store/store.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

None — existing test infrastructure covers all phase requirements. No new test files or framework setup needed.

---

## Sources

### Primary (HIGH confidence)

- Direct read of `src/store/types.ts` — confirmed `selectedClipIds: string[]` in `UiState`, `StoreActions` interface shape
- Direct read of `src/store/index.ts` — confirmed `partialize` pattern, `deleteClip` single-`set()` discipline, `selectClip`/`setActiveTool`/`setPixelsPerSecond` UiState spread pattern
- Direct read of `src/components/TimelinePanel.tsx` — confirmed `handleClickAction` receives `React.MouseEvent` (currently `_e`), `getActionRender` structure, `useCallback` deps pattern
- Direct read of `src/hooks/useKeyboardShortcuts.ts` — confirmed `getState()` snapshot pattern, existing Delete/Backspace handler structure
- Direct read of `src/components/ClipSettingsPanel.tsx` — confirmed header structure, `updateClipSettings` call pattern, component rendering logic
- Direct read of `src/components/ClipAction.tsx` — confirmed `isSelected` prop drives `outline-white` class
- Direct read of `src/utils/deriveEditorData.ts` — confirmed `action.selected` is single-clip only; no change required
- Direct read of `src/store/store.test.ts` — confirmed `beforeEach` reset pattern, Zundo partialize test conventions
- Grep of `node_modules/@xzdarcy/react-timeline-editor/dist/index.cjs.js` — confirmed `onClickRow` callback exists in the library

### Secondary (MEDIUM confidence)

- CONTEXT.md Phase 9 decisions — user-locked implementation choices including SEL-04 deferral rationale (library issue #74)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — entire implementation uses existing installed packages, no new dependencies
- Architecture: HIGH — all patterns are directly derived from existing source code in the repository
- Pitfalls: HIGH — N-undo-steps pitfall is a well-known Zustand/Zundo consequence confirmed by reading the `partialize` and `deleteClip` source; other pitfalls derived from direct code inspection
- Test mapping: HIGH — existing test files and Vitest config confirmed by direct file reads

**Research date:** 2026-03-18
**Valid until:** 2026-06-18 (stable stack — no fast-moving dependencies involved)
