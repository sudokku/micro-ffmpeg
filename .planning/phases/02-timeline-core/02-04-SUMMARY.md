---
phase: 02-timeline-core
plan: 04
subsystem: ui
tags: [react, zustand, timeline, xzdarcy-react-timeline-editor, vitest]

# Dependency graph
requires:
  - phase: 02-timeline-core/02-01
    provides: store actions (addClip, moveClip, trimClip, splitClip, deleteClip, selectClip)
  - phase: 02-timeline-core/02-02
    provides: keyboard shortcuts and store wiring foundation
  - phase: 02-timeline-core/02-03
    provides: file import and TopBar integration
provides:
  - deriveEditorData pure function converting store state to TimelineRow[]
  - ClipAction renderer with color background, label, selection ring, shimmer
  - TimelinePanel fully wired to store with all interaction callbacks
  - Store-driven timeline tests verifying clip-to-action derivation
affects: [03-export, 04-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "deriveEditorData: pure function mapping normalized store state to library-specific types"
    - "getActionRender: controlled renderer pattern — timeline library delegates clip display to app"
    - "useMemo for editorData derivation; useCallback for all timeline event handlers"
    - "No onChange mutations — only onActionMoveEnd/onActionResizeEnd dispatch to store"

key-files:
  created:
    - src/utils/deriveEditorData.ts
    - src/components/ClipAction.tsx
  modified:
    - src/components/TimelinePanel.tsx
    - src/components/TimelinePanel.test.tsx

key-decisions:
  - "effectId: 'default' used consistently across deriveEditorData and effects constant to link actions to renderer"
  - "getActionRender returns null for unknown clip IDs (defensive guard against stale action.id)"
  - "cursorClass derived from activeTool and passed to ClipAction — keeps cursor logic in one place"

patterns-established:
  - "Timeline library is read-only consumer: store is source of truth, never timeline internal state"
  - "ClipAction color uses hex+D9 suffix for 85% opacity, shimmer uses hex+40 for 25% opacity"

requirements-completed: [TIME-01, TIME-02, TIME-03, TIME-04, TIME-05, TIME-06]

# Metrics
duration: 2min
completed: 2026-03-17
---

# Phase 2 Plan 04: Timeline Store Wiring Summary

**Store-derived timeline with ClipAction renderer: video/audio clips appear as draggable, resizable, selectable actions wired to Zustand via move/trim/split/select callbacks**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-17T00:22:42Z
- **Completed:** 2026-03-17T00:24:06Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Pure `deriveEditorData` function maps store tracks/clips to `TimelineRow[]` with correct effectId, flexible, movable, and selected flags
- `ClipAction` custom renderer displays clip color background, filename+duration label, selection ring (white outline), and shimmer placeholder for unloaded thumbnails
- `TimelinePanel` rewritten to derive all display state from store via `useMemo`; all six callbacks dispatch to correct store actions
- TimelinePanel tests replaced with 4 store-driven unit tests verifying `deriveEditorData` output against real store operations

## Task Commits

Each task was committed atomically:

1. **Task 1: Create deriveEditorData utility and ClipAction renderer** - `8fcc0fe` (feat)
2. **Task 2: Wire TimelinePanel to store with all callbacks and update tests** - `3369e42` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/utils/deriveEditorData.ts` - Pure function: store tracks+clips+selectedClipId -> TimelineRow[]
- `src/components/ClipAction.tsx` - Custom clip renderer: color, label, selection ring, shimmer/thumbnails
- `src/components/TimelinePanel.tsx` - Rewritten: store-connected, all timeline callbacks wired
- `src/components/TimelinePanel.test.tsx` - Replaced static tests with store-driven deriveEditorData tests

## Decisions Made
- `effectId: 'default'` used as the single effect key linking all actions to the renderer constant
- `getActionRender` returns `null` guard when `clips[action.id]` is undefined — prevents crash on stale action references
- `cursorClass` prop passed into `ClipAction` so the component stays stateless; cursor determined by `activeTool` in parent

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Timeline is fully wired to store: clips appear, drag/resize/click all dispatch store actions
- Undo/redo works through Zundo since all mutations go through the store
- Phase 3 (export) can read `clips` and `tracks` directly from the same store
- No blockers

---
*Phase: 02-timeline-core*
*Completed: 2026-03-17*

## Self-Check: PASSED

- FOUND: src/utils/deriveEditorData.ts
- FOUND: src/components/ClipAction.tsx
- FOUND: src/components/TimelinePanel.tsx
- FOUND: src/components/TimelinePanel.test.tsx
- FOUND: .planning/phases/02-timeline-core/02-04-SUMMARY.md
- FOUND: commit 8fcc0fe
- FOUND: commit 3369e42
