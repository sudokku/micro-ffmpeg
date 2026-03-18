---
phase: 09-multi-clip-selection
plan: 02
subsystem: ui
tags: [react, zustand, timeline, multi-select, keyboard-shortcuts]

# Dependency graph
requires:
  - phase: 09-01
    provides: store actions toggleClipSelection, clearSelection, deleteSelectedClips, bulkUpdateClipSettings
provides:
  - Cmd/Ctrl+click multi-select wired in TimelinePanel with white outline on all selected clips
  - Empty-area deselect via onClickRow in Timeline
  - Bulk delete via Delete/Backspace using deleteSelectedClips in useKeyboardShortcuts
  - Settings fan-out to all selected clips via bulkUpdateClipSettings in ClipSettingsPanel
  - "N clips" badge in ClipSettingsPanel header when 2+ clips selected
affects:
  - phase-10-preview-panel
  - phase-11-clip-settings-ui

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fan-out pattern: check selectedClipIds.length > 1, call bulk action, else call single-clip action"
    - "onClickRow={handler as never} cast for @xzdarcy/react-timeline-editor untyped prop"
    - "getState() inside event handler avoids stale closure — existing pattern in useKeyboardShortcuts"

key-files:
  created: []
  modified:
    - src/components/TimelinePanel.tsx
    - src/hooks/useKeyboardShortcuts.ts
    - src/components/ClipSettingsPanel.tsx

key-decisions:
  - "onClickRow cast as never to work around missing TS type export in @xzdarcy/react-timeline-editor (runtime supports it)"
  - "selectedClipIds read via getState() in keyboard handler — consistent with existing pattern, avoids stale closure"
  - "Fan-out in all 6 commit handlers (blur, brightness, contrast, saturation, crop, resize) — complete coverage"

patterns-established:
  - "Fan-out pattern: if (selectedClipIds.length > 1) bulkUpdate(...) else singleUpdate(...)"

requirements-completed: [SEL-01, SEL-02, SEL-03]

# Metrics
duration: 12min
completed: 2026-03-18
---

# Phase 9 Plan 02: Multi-Clip Selection Summary

**Cmd/Ctrl+click multi-select, bulk delete, and settings fan-out wired into TimelinePanel, useKeyboardShortcuts, and ClipSettingsPanel**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-18T21:00:00Z
- **Completed:** 2026-03-18T21:12:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- TimelinePanel handles Cmd/Ctrl+click to call `toggleClipSelection`, plain click to call `selectClip`, and onClickRow to call `clearSelection`
- All selected clips (both `selectedClipId` and `selectedClipIds` entries) show the white outline ring via `isSelected` prop
- Delete/Backspace in useKeyboardShortcuts checks `selectedClipIds.length > 0` first and calls `deleteSelectedClips()`, falls back to single-clip delete
- ClipSettingsPanel fans out all 6 commit handlers (blur, brightness, contrast, saturation, crop, resize) to `bulkUpdateClipSettings` when 2+ clips selected
- "N clips" badge appears in the panel header when `selectedClipIds.length > 1`

## Task Commits

Per CLAUDE.md, no per-task commits — one commit for the entire phase.

1. **Task 1: Wire multi-select into TimelinePanel** - pending phase commit
2. **Task 2: Bulk delete + fan-out + badge** - pending phase commit

## Files Created/Modified
- `src/components/TimelinePanel.tsx` - Added selectedClipIds/toggleClipSelection/clearSelection selectors; Cmd/Ctrl+click detection; multi-highlight in getActionRender; handleClickRow for empty-area deselect
- `src/hooks/useKeyboardShortcuts.ts` - Delete/Backspace now checks selectedClipIds.length > 0 and calls deleteSelectedClips()
- `src/components/ClipSettingsPanel.tsx` - Added selectedClipIds/bulkUpdateClipSettings selectors; fan-out in all 6 commit handlers; "N clips" badge in header

## Decisions Made
- `onClickRow` cast as `never` to work around missing TypeScript type export in `@xzdarcy/react-timeline-editor` — the runtime supports the prop but the library's TS types don't expose it
- Used `getState()` inside the keyboard handler for `selectedClipIds` — consistent with the existing pattern in the file, avoids stale closure

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 9 (SEL-01, SEL-02, SEL-03) complete — multi-select, bulk delete, and settings fan-out all functional
- SEL-04 (group drag) deferred per existing blocker in STATE.md: `@xzdarcy/react-timeline-editor` has no native group drag
- Phase 10 (Preview Panel) can proceed — depends on Phases 5, 7, 9 (all complete)

---
*Phase: 09-multi-clip-selection*
*Completed: 2026-03-18*

## Self-Check: PASSED

- FOUND: src/components/TimelinePanel.tsx
- FOUND: src/hooks/useKeyboardShortcuts.ts
- FOUND: src/components/ClipSettingsPanel.tsx
- FOUND: .planning/phases/09-multi-clip-selection/09-02-SUMMARY.md
- TypeScript: 0 errors
- Tests: 182/182 passing
