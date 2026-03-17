---
status: complete
phase: 02-timeline-core
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md, 02-04-SUMMARY.md, 02-05-SUMMARY.md]
started: 2026-03-17T02:00:00Z
updated: 2026-03-17T02:30:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. Tool Sidebar Visible
expected: A narrow sidebar strip (~40px wide) is visible on the left side of the app with two icon buttons — a pointer/cursor icon (Select tool) and a scissors icon (Blade tool). One of them appears highlighted/active (blue ring).
result: pass

### 2. Switch Tools with Keyboard
expected: Press V — the Select (pointer) button in the sidebar gets a blue highlight ring. Press B — the Blade (scissors) button gets the blue highlight ring instead.
result: pass

### 3. Empty State Prompt
expected: When no clips have been imported, the main area shows a "No clips yet" message with a film icon and instructions to import a file.
result: pass

### 4. Import Button Opens File Picker
expected: Clicking the "Import" button in the top bar opens the native OS file picker filtered to video and audio files.
result: pass

### 5. Drag-Drop Shows Overlay
expected: Dragging a video or audio file over the browser window shows a translucent full-screen overlay with a dashed border and upload icon. Releasing the file imports it.
result: pass

### 6. Clip Appears on Timeline After Import
expected: After importing a video or audio file, a colored clip block appears on the correct track in the timeline (video files on the video track, audio files on the audio track). The clip shows the filename and duration.
result: pass

### 7. Move Clip
expected: Dragging a clip horizontally on the timeline repositions it to a new start time. Releasing the mouse commits the new position.
result: pass

### 8. Trim Clip
expected: Dragging the left or right edge of a clip resizes it (trims the in/out point). The clip shrinks or grows as you drag.
result: pass

### 9. Select Clip
expected: Clicking a clip highlights it with a white selection ring/outline. Clicking empty space deselects it.
result: pass

### 10. Blade Tool Split
expected: With Blade tool active (press B), clicking on a clip at a point within it splits it into two separate clips at that position.
result: pass

### 11. Delete Clip
expected: With a clip selected, pressing Delete or Backspace removes it from the timeline immediately.
result: pass

### 12. Undo and Redo
expected: After moving, trimming, or deleting a clip, pressing Cmd+Z undoes the last action. Pressing Cmd+Shift+Z redoes it.
result: pass

### 13. Single Undo for Delete
expected: Delete a clip using the Delete key. Press Cmd+Z once — the clip reappears. One press should fully restore it (not require two presses).
result: pass

### 14. Thumbnail Extraction
expected: After importing a video file, the clip initially shows a shimmer/loading animation. Within a few seconds, actual video frame thumbnails appear inside the clip on the timeline.
result: pass

## Summary

total: 14
passed: 14
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
