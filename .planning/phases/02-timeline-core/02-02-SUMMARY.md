---
phase: 02-timeline-core
plan: 02
subsystem: ui
tags: [react, lucide-react, zustand, keyboard-shortcuts, toolbar]

# Dependency graph
requires:
  - phase: 02-timeline-core plan 01
    provides: store actions setActiveTool, deleteClip, selectClip, and temporal undo/redo
provides:
  - ToolSidebar component with Select and Blade tool buttons (40px wide sidebar strip)
  - useKeyboardShortcuts hook with V/B/Cmd+Z/Cmd+Shift+Z/Delete/Backspace bindings
  - Updated AppShell layout with flex-row sidebar column
  - TopBar with justify-between and topbar-actions placeholder div for Plan 03
affects: [03-import, plan 03 file import, any plan wiring TopBar Import button]

# Tech tracking
tech-stack:
  added: [lucide-react]
  patterns:
    - Global keydown handler registered in useEffect with cleanup on unmount
    - Cmd+Shift+Z checked before Cmd+Z to prevent redo from triggering undo
    - useStore.getState() inside event handler for fresh state (avoids stale closure)

key-files:
  created:
    - src/components/ToolSidebar.tsx
    - src/hooks/useKeyboardShortcuts.ts
  modified:
    - src/components/AppShell.tsx
    - src/components/TopBar.tsx
    - package.json

key-decisions:
  - "useKeyboardShortcuts reads selectedClipId via useStore.getState() inside handler (not from closure) to avoid stale closure bug"
  - "Cmd+Shift+Z guard placed before Cmd+Z so Shift modifier prevents undo from firing"

patterns-established:
  - "Global keyboard shortcut pattern: window.addEventListener in useEffect, return cleanup, skip INPUT/TEXTAREA/SELECT targets"

requirements-completed: [UNDO-01, UNDO-02]

# Metrics
duration: 2min
completed: 2026-03-17
---

# Phase 2 Plan 02: Sidebar, AppShell Layout, and Keyboard Shortcuts Summary

**40px ToolSidebar with Select/Blade icons, global keyboard shortcuts (V/B/Cmd+Z/Cmd+Shift+Z/Delete) wired to Zustand store, and AppShell refactored to flex-row layout**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-17T00:16:23Z
- **Completed:** 2026-03-17T00:17:37Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created ToolSidebar with MousePointer2 (Select) and Scissors (Blade) buttons, active state ring-1 ring-blue-500 highlight
- Created useKeyboardShortcuts hook: V/B tool switch, Cmd+Z undo, Cmd+Shift+Z redo, Delete/Backspace clip deletion
- Refactored AppShell to flex-row layout embedding ToolSidebar alongside main region
- Updated TopBar with justify-between spacing and topbar-actions placeholder div for Plan 03's Import button

## Task Commits

Each task was committed atomically:

1. **Task 1: Install lucide-react, create ToolSidebar, update AppShell layout** - `226ca91` (feat)
2. **Task 2: Create useKeyboardShortcuts hook with global key bindings** - `8ce599b` (feat)

## Files Created/Modified
- `src/components/ToolSidebar.tsx` - 40px sidebar strip with Select and Blade tool buttons, active state styling
- `src/hooks/useKeyboardShortcuts.ts` - Global keydown handler for V/B/Cmd+Z/Cmd+Shift+Z/Delete/Backspace
- `src/components/AppShell.tsx` - Updated to flex-row layout with ToolSidebar column; wires useKeyboardShortcuts
- `src/components/TopBar.tsx` - Added justify-between and topbar-actions div placeholder
- `package.json` - Added lucide-react dependency

## Decisions Made
- Used `useStore.getState()` inside the keydown handler rather than reading from React state via closure — ensures deletion reads fresh selectedClipId without needing to re-register the listener on every render.
- Placed the Cmd+Shift+Z check before Cmd+Z: without this ordering, pressing Cmd+Shift+Z would match the Cmd+Z guard first and trigger undo instead of redo.

## Deviations from Plan

None - plan executed exactly as written. The useKeyboardShortcuts hook was created as part of Task 1 work to unblock the vite build (AppShell imports it), but this matched the plan's intent since both tasks were designed to be committed separately.

## Issues Encountered
None — build passed on first attempt, all 33 tests green.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ToolSidebar and keyboard shortcuts fully wired to the store
- Plan 03 (file import) can safely add an Import button into `div#topbar-actions` in TopBar without restructuring the header layout
- All store actions from Plan 01 are reachable from keyboard

---
*Phase: 02-timeline-core*
*Completed: 2026-03-17*
