---
phase: 04-export
plan: 02
subsystem: ui
tags: [react, zustand, ffmpeg, export, progress-bar, tailwind]

# Dependency graph
requires:
  - phase: 04-export plan 01
    provides: useExport hook, ExportFormat type, ExportState in store
provides:
  - ExportProgressBar component: thin full-width progress bar with blue/red states
  - TopBar extended with format dropdown and Export/Cancel/Download button
  - AppShell wired to useExport with UI lockout overlay during rendering
  - Keyboard shortcuts blocked during export rendering

affects: [end-to-end export flow, manual verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Export status drives button label: idle/error=Export, rendering=Cancel, done=Download"
    - "UI lockout via pointer-events-none opacity-50 on content div and timeline div"
    - "Keyboard shortcut blocking via useStore.getState().export.status check in handler"

key-files:
  created:
    - src/components/ExportProgressBar.tsx
    - src/components/TopBar.test.tsx
  modified:
    - src/components/TopBar.tsx
    - src/components/AppShell.tsx
    - src/hooks/useKeyboardShortcuts.ts

key-decisions:
  - "ExportProgressBar renders null for idle/done states — only visible during rendering and error"
  - "UI lockout applied separately to content row and timeline div so TopBar/progress bar remain interactive"
  - "Keyboard blocking uses getState() (not subscribed hook) to avoid stale closure on export status"

patterns-established:
  - "TDD pattern: write failing test first, then implement to green"
  - "TopBar props remain optional (backward-compatible) with store-driven button label via useStore"

requirements-completed: [EXPO-01, EXPO-02, EXPO-03]

# Metrics
duration: 15min
completed: 2026-03-17
---

# Phase 4 Plan 02: Export UI Summary

**Format dropdown and Export/Cancel/Download button in TopBar, full-width progress bar, UI lockout overlay, and keyboard shortcut blocking wired end-to-end to useExport hook**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-17T12:31:00Z
- **Completed:** 2026-03-17T12:34:00Z
- **Tasks:** 2 of 3 complete (Task 3 is human-verify checkpoint)
- **Files modified:** 5

## Accomplishments

- ExportProgressBar: thin `h-1.5` bar, blue during rendering, red with "Export failed. Try again." on error
- TopBar extended with `<select>` format dropdown (MP4/WebM/MOV/GIF) and state-driven action button
- AppShell wired: useExport hook, ExportProgressBar mounted, isExporting drives pointer-events-none opacity-50 lockout
- Keyboard shortcuts (undo/redo/delete/tool-switch) blocked when `export.status === 'rendering'`
- 5 new TopBar tests (button label states + dropdown), full suite 91/91 passing

## Task Commits

Each task was committed atomically:

1. **Task 1: TopBar export controls, ExportProgressBar, and TopBar tests** - `273f538` (feat)
2. **Task 2: Wire AppShell with useExport, ExportProgressBar, UI lockout, and keyboard blocking** - `dce8ac3` (feat)
3. **Task 3: Verify complete export flow** - awaiting human verification (checkpoint:human-verify)

**Plan metadata:** (pending — created after checkpoint)

_Note: Task 1 used TDD: test RED → implement GREEN sequence_

## Files Created/Modified

- `src/components/ExportProgressBar.tsx` - Full-width thin progress bar visible during rendering/error states
- `src/components/TopBar.tsx` - Extended with format dropdown and Export/Cancel/Download button driven by store
- `src/components/TopBar.test.tsx` - 5 tests covering all button label states and format dropdown options
- `src/components/AppShell.tsx` - Wired useExport, ExportProgressBar, and UI lockout
- `src/hooks/useKeyboardShortcuts.ts` - Added export.status === 'rendering' early return to block shortcuts

## Decisions Made

- ExportProgressBar renders null for idle/done — progress bar only visible when actionable (rendering progress or error recovery needed)
- UI lockout applied to two separate divs (content row + timeline) rather than entire app shell so TopBar + progress bar stay interactive
- Keyboard blocking reads `useStore.getState()` inside event handler to avoid stale closure (consistent with Phase 2 decision pattern)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript build errors in unrelated files (TimelinePanel.tsx, useExport.ts, useThumbnailExtractor.ts, deriveEditorData.ts, useTemporalStore.ts) were noted but are out of scope — they existed before this plan and do not affect the Vite dev server or test suite.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Export UI complete: format dropdown, Export/Cancel/Download button, progress bar, UI lockout, keyboard blocking
- Awaiting Task 3 human verification: end-to-end export flow with real video files
- After verification passes, Phase 4 (Export) is complete and v1.0 milestone is reached

---
*Phase: 04-export*
*Completed: 2026-03-17*
