---
phase: 02-timeline-core
plan: 03
subsystem: ui
tags: [react, zustand, drag-drop, file-import, lucide-react]

# Dependency graph
requires:
  - phase: 02-timeline-core plan 01
    provides: addClip store action, Clip type with trackId/sourceDuration/startTime/endTime
  - phase: 02-timeline-core plan 02
    provides: TopBar layout with topbar-actions placeholder, lucide-react installed
provides:
  - useFileImport hook with window-level drag-drop handlers, MIME routing, duration detection
  - DropOverlay component with fade animation for file drag feedback
  - EmptyState component shown when no clips exist
  - Import button in TopBar wired to native file picker
  - AppShell integrated with all import/overlay/empty-state UI
affects: [03-clip-inspector, 04-export]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useCallback/useEffect for stable window event listener registration in hooks
    - Temporary media element (video/audio) for duration detection before adding to store
    - Opacity + pointer-events CSS pattern for overlay fade without DOM removal

key-files:
  created:
    - src/hooks/useFileImport.ts
    - src/hooks/useFileImport.test.ts
    - src/components/DropOverlay.tsx
    - src/components/EmptyState.tsx
  modified:
    - src/components/TopBar.tsx
    - src/components/AppShell.tsx

key-decisions:
  - "DragLeave hides overlay only when relatedTarget is null (leaving window) to prevent flicker on internal element transitions"
  - "fileInputRef kept in hook and passed as prop to TopBar to avoid splitting file input ownership"
  - "TopBar Import button is optional (prop-guarded) to preserve backward-compatible rendering if props omitted"

patterns-established:
  - "Window-level drag events on document.window with cleanup in useEffect return"
  - "MIME prefix check (startsWith) for video/* and audio/* routing"

requirements-completed: [IMPT-01, IMPT-02]

# Metrics
duration: 1min
completed: 2026-03-17
---

# Phase 2 Plan 3: File Import (Drag-Drop + Picker) Summary

**Window-level drag-drop and file picker import with MIME routing to video/audio tracks, DropOverlay with fade animation, and EmptyState prompt**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-17T00:19:14Z
- **Completed:** 2026-03-17T00:20:54Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- useFileImport hook handles window-level dragover/dragleave/drop events with showOverlay state, MIME-based track routing, and duration detection via temporary media element
- DropOverlay provides full-viewport translucent overlay with dashed border and Upload icon using CSS opacity/pointer-events for smooth fade
- EmptyState displays "No clips yet" with Film icon when clips record is empty
- Import button added to TopBar connected to hidden file input (accept video/*, audio/*); AppShell wires useFileImport to TopBar and renders DropOverlay at root

## Task Commits

1. **Task 1: Create useFileImport hook with drag-drop and file picker logic, plus tests** - `3188d1a` (feat)
2. **Task 2: Create DropOverlay, EmptyState components and wire Import button in TopBar** - `445537b` (feat)

## Files Created/Modified

- `src/hooks/useFileImport.ts` - Hook: drag-drop event handlers, MIME routing, duration detection, file picker trigger
- `src/hooks/useFileImport.test.ts` - Tests for addClip routing via video/audio track
- `src/components/DropOverlay.tsx` - Full-viewport overlay with fade animation shown during drag
- `src/components/EmptyState.tsx` - Empty-state prompt with Film icon and import instructions
- `src/components/TopBar.tsx` - Added Import button and hidden file input with optional prop interface
- `src/components/AppShell.tsx` - Integrated useFileImport, DropOverlay, EmptyState, and hasClips selector

## Decisions Made

- DragLeave hides overlay only when `relatedTarget === null` (cursor left window), preventing flicker when dragging over child elements
- `fileInputRef` kept inside the hook and passed as a prop to TopBar to keep file input lifecycle ownership centralized in the hook
- TopBar Import button rendered conditionally on `onImportClick` prop to maintain backward-compatible API

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- File import is fully functional; dragging or picking video/audio files creates clips on the correct track
- AppShell is ready for Phase 3 clip inspector to replace the "Clip settings — Phase 3" placeholder in the main region
- All 36 tests pass, vite build clean

---
*Phase: 02-timeline-core*
*Completed: 2026-03-17*
