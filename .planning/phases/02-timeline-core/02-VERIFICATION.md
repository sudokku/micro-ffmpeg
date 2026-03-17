---
phase: 02-timeline-core
verified: 2026-03-17T01:35:00Z
status: passed
score: 11/11 must-haves verified
re_verification: false
---

# Phase 2: Timeline Core Verification Report

**Phase Goal:** Import clips, display on two-track timeline, trim/split/delete/reorder, undo/redo, static thumbnails
**Verified:** 2026-03-17T01:35:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth                                                                              | Status     | Evidence                                                                                   |
|----|------------------------------------------------------------------------------------|------------|--------------------------------------------------------------------------------------------|
| 1  | addClip creates a clip in the clips record and appends its ID to the correct track | VERIFIED   | `src/store/index.ts` lines 25-57; store.test.ts 20 action tests all pass                  |
| 2  | moveClip updates startTime and endTime for a clip                                  | VERIFIED   | `src/store/index.ts` lines 59-66; test "moveClip updates clip.startTime" passes            |
| 3  | trimClip updates startTime and endTime for a clip                                  | VERIFIED   | `src/store/index.ts` lines 68-75; test "trimClip updates clip.startTime" passes            |
| 4  | splitClip replaces one clip with two clips covering the original range             | VERIFIED   | `src/store/index.ts` lines 77-108; edge-guard at 0.01s; splitClip tests pass               |
| 5  | deleteClip removes a clip and clears selectedClipId atomically                     | VERIFIED   | `src/store/index.ts` lines 110-129; single-undo regression test passes                    |
| 6  | undo() reverts the last clip mutation; redo() restores it                          | VERIFIED   | Zundo temporal store; undo/redo tests pass; selectClip and setActiveTool excluded from history |
| 7  | Left sidebar with Select/Blade tool buttons visible                                | VERIFIED   | `src/components/ToolSidebar.tsx` — MousePointer2 + Scissors buttons with active ring-blue-500 |
| 8  | Cmd+Z calls undo; Cmd+Shift+Z calls redo; V/B switch tools; Delete deletes clip    | VERIFIED   | `src/hooks/useKeyboardShortcuts.ts` — all bindings present, Shift+Z checked before Z      |
| 9  | Video/audio clips appear in correct timeline track rows                            | VERIFIED   | `src/components/TimelinePanel.tsx` wired to store via deriveEditorData; 4 timeline tests pass |
| 10 | Dragging/clicking dispatches correct store actions                                 | VERIFIED   | onActionMoveEnd→moveClip, onActionResizeEnd→trimClip, onClickAction→selectClip/splitClip  |
| 11 | Video clips trigger thumbnail extraction; shimmer shows until thumbnails arrive    | VERIFIED   | `src/hooks/useThumbnailExtractor.ts` + processedRef guard; ffmpeg worker extractFrames     |

**Score:** 11/11 truths verified

---

### Required Artifacts

| Artifact                               | Provides                                               | Exists | Substantive | Wired  | Status     |
|----------------------------------------|--------------------------------------------------------|--------|-------------|--------|------------|
| `src/store/types.ts`                   | Clip type with color and thumbnailUrls fields          | YES    | YES         | YES    | VERIFIED   |
| `src/store/index.ts`                   | All 7 store actions; CLIP_COLORS import                | YES    | YES         | YES    | VERIFIED   |
| `src/store/store.test.ts`              | 30 tests for store shape, Zundo, and all 7 actions     | YES    | YES (30 tests, 279 lines) | N/A | VERIFIED |
| `src/constants/clipColors.ts`          | CLIP_COLORS 8-color palette                            | YES    | YES         | YES    | VERIFIED   |
| `src/components/ToolSidebar.tsx`       | 40px sidebar with Select/Blade buttons                 | YES    | YES         | YES    | VERIFIED   |
| `src/hooks/useKeyboardShortcuts.ts`    | V/B/Cmd+Z/Cmd+Shift+Z/Delete bindings                  | YES    | YES         | YES    | VERIFIED   |
| `src/components/AppShell.tsx`          | Wires all hooks and components                         | YES    | YES         | YES    | VERIFIED   |
| `src/hooks/useFileImport.ts`           | Drag-drop + file picker + MIME routing + duration      | YES    | YES         | YES    | VERIFIED   |
| `src/hooks/useFileImport.test.ts`      | 3 tests for video/audio track routing                  | YES    | YES         | N/A    | VERIFIED   |
| `src/components/DropOverlay.tsx`       | Full-viewport translucent overlay on drag              | YES    | YES         | YES    | VERIFIED   |
| `src/components/EmptyState.tsx`        | "No clips yet" empty state                             | YES    | YES         | YES    | VERIFIED   |
| `src/components/TopBar.tsx`            | Import button wired to file picker                     | YES    | YES         | YES    | VERIFIED   |
| `src/utils/deriveEditorData.ts`        | Pure function: store state to TimelineRow[]            | YES    | YES         | YES    | VERIFIED   |
| `src/components/ClipAction.tsx`        | Color background, label, selection ring, shimmer       | YES    | YES         | YES    | VERIFIED   |
| `src/components/TimelinePanel.tsx`     | Timeline wired to store with all callbacks             | YES    | YES         | YES    | VERIFIED   |
| `src/components/TimelinePanel.test.tsx`| 4 store-driven deriveEditorData tests                  | YES    | YES         | N/A    | VERIFIED   |
| `src/workers/ffmpeg.worker.ts`         | FFmpeg WASM load + extractFrames                       | YES    | YES         | YES    | VERIFIED   |
| `src/workers/ffmpeg.proxy.ts`          | Comlink proxy factory for worker                       | YES    | YES         | YES    | VERIFIED   |
| `src/workers/ffmpeg.worker.test.ts`    | computeTimestamps tests + API contract                 | YES    | YES (8 tests) | N/A  | VERIFIED   |
| `src/utils/computeTimestamps.ts`       | 1 frame per 5 seconds, min 1, centered timestamps      | YES    | YES         | YES    | VERIFIED   |
| `src/hooks/useThumbnailExtractor.ts`   | Watches clips, triggers extraction, stores blob URLs   | YES    | YES         | YES    | VERIFIED   |
| `public/ffmpeg-core.js`               | Local WASM core JS (avoids CDN CORP block)             | YES    | YES         | YES    | VERIFIED   |
| `public/ffmpeg-core.wasm`             | Local WASM binary                                      | YES    | YES         | YES    | VERIFIED   |

---

### Key Link Verification

| From                                | To                              | Via                                     | Status    | Details                                                        |
|-------------------------------------|---------------------------------|-----------------------------------------|-----------|----------------------------------------------------------------|
| `src/store/index.ts`                | `src/store/types.ts`            | `import Clip type`                      | WIRED     | Line 3: `import type { StoreState, TrackedState } from './types'` |
| `src/store/index.ts`                | `src/constants/clipColors.ts`   | `import CLIP_COLORS`                    | WIRED     | Line 4: `import { CLIP_COLORS } from '../constants/clipColors'` |
| `src/hooks/useKeyboardShortcuts.ts` | `src/store/index.ts`            | `temporal.getState().undo/redo`         | WIRED     | Lines 31, 36: `useStore.temporal.getState().redo/undo()`       |
| `src/components/ToolSidebar.tsx`    | `src/store/index.ts`            | `setActiveTool action`                  | WIRED     | Lines 6, 11, 26: `setActiveTool('select'/'blade')`             |
| `src/hooks/useFileImport.ts`        | `src/store/index.ts`            | `addClip action`                        | WIRED     | Line 35: `useStore.getState().addClip(file, trackId, duration)` |
| `src/hooks/useFileImport.ts`        | `src/components/DropOverlay.tsx`| `showOverlay state controls visibility` | WIRED     | AppShell passes `showOverlay` to `<DropOverlay visible={showOverlay} />` |
| `src/components/TimelinePanel.tsx`  | `src/store/index.ts`            | `useStore selectors for tracks/clips`   | WIRED     | Lines 12-19: useStore selectors for tracks, clips, ui, actions |
| `src/components/TimelinePanel.tsx`  | `src/utils/deriveEditorData.ts` | `derives editorData from store state`   | WIRED     | Lines 21-24: `useMemo(() => deriveEditorData(...))`             |
| `src/components/TimelinePanel.tsx`  | `@xzdarcy/react-timeline-editor`| `onActionMoveEnd/ResizeEnd/ClickAction` | WIRED     | Lines 73-76: all three callbacks passed to `<Timeline>`         |
| `src/hooks/useThumbnailExtractor.ts`| `src/workers/ffmpeg.proxy.ts`   | `getFfmpegProxy().extractFrames()`      | WIRED     | Lines 3, 33, 36: `getFfmpegProxy()` + `proxy.extractFrames()`  |
| `src/hooks/useThumbnailExtractor.ts`| `src/store/index.ts`            | `useStore to watch clips, set thumbnailUrls` | WIRED | Lines 14, 44: `useStore.subscribe()` + `useStore.setState()`    |
| `src/workers/ffmpeg.worker.ts`      | `@ffmpeg/ffmpeg`                | `FFmpeg.load, exec, writeFile, readFile`| WIRED     | Lines 12-15, 26-43: `ensureLoaded()` + full exec pipeline       |

---

### Requirements Coverage

| Requirement | Source Plan | Description                                                       | Status    | Evidence                                                        |
|-------------|------------|-------------------------------------------------------------------|-----------|-----------------------------------------------------------------|
| IMPT-01     | 02-03      | User can drag-and-drop video and audio files onto the editor      | SATISFIED | `useFileImport.ts`: window dragover/dragleave/drop listeners, `importFile()` wired to `addClip` |
| IMPT-02     | 02-03      | User can use a file picker to import video and audio files        | SATISFIED | TopBar Import button + hidden file input, `openFilePicker()` wired via AppShell |
| TIME-01     | 02-04      | User can see imported video clips on video track                  | SATISFIED | `TimelinePanel.tsx` derives editorData from store; video row maps to `tracks.video.clipIds` |
| TIME-02     | 02-04      | User can see imported audio clips on audio track                  | SATISFIED | `deriveEditorData` produces two rows: video and audio; audio clips mapped correctly |
| TIME-03     | 02-01, 02-04 | User can trim a clip by dragging its left or right edge         | SATISFIED | `trimClip` action in store; `onActionResizeEnd` → `trimClip` in TimelinePanel |
| TIME-04     | 02-01, 02-04 | User can split a clip at a point using a blade tool             | SATISFIED | `splitClip` action in store; `onClickAction` → `splitClip` when `activeTool === 'blade'` |
| TIME-05     | 02-01, 02-02 | User can delete a clip from the timeline                        | SATISFIED | `deleteClip` action in store; keyboard shortcut Delete/Backspace dispatches it |
| TIME-06     | 02-01, 02-04 | User can reorder clips by dragging within a track               | SATISFIED | `moveClip` action in store; `onActionMoveEnd` → `moveClip` in TimelinePanel |
| UNDO-01     | 02-01, 02-02 | User can undo the last clip operation via Cmd+Z                 | SATISFIED | Zundo temporal store; `useKeyboardShortcuts` binds Cmd+Z to `temporal.getState().undo()` |
| UNDO-02     | 02-01, 02-02 | User can redo an undone operation via Cmd+Shift+Z               | SATISFIED | Zundo temporal store; Cmd+Shift+Z checked before Cmd+Z; binds to `.redo()` |
| PREV-01     | 02-05      | User can see static frame thumbnails from video clips via ffmpeg.wasm | SATISFIED | `ffmpeg.worker.ts` extractFrames + `useThumbnailExtractor` → `thumbnailUrls` on clip → `ClipAction` renders them |

**All 11 Phase 2 requirements satisfied. No orphaned requirements.**

---

### Anti-Patterns Found

| File                          | Line | Pattern                           | Severity | Impact                                      |
|-------------------------------|------|-----------------------------------|----------|---------------------------------------------|
| `src/store/types.ts`          | 19   | `// Stub — fields populated in Phase 3` | Info | ClipSettings intentionally minimal for Phase 2; Phase 3 extends it |
| `src/components/AppShell.tsx` | 28   | `"Clip settings — Phase 3"` placeholder span | Info | Main area placeholder for Phase 3 clip inspector; does not block Phase 2 goal |

No blocker or warning anti-patterns found. Both items are intentional forward-compatibility markers, not stubs blocking functionality.

---

### Human Verification Required

The following behaviors require a running browser to confirm, as they cannot be verified programmatically from the test suite alone:

#### 1. Drag-and-drop overlay appearance

**Test:** Drag any video or audio file over the browser window.
**Expected:** Full-viewport translucent overlay appears with "Drop video or audio files here" text and an upload icon.
**Why human:** CSS opacity/pointer-events animation cannot be verified in jsdom.

#### 2. Thumbnail extraction pipeline

**Test:** Import a .mp4 video file via drag-drop or the Import button.
**Expected:** Clip appears on video track immediately with a shimmer animation; within a few seconds, JPEG frame thumbnails replace the shimmer.
**Why human:** `ffmpeg.wasm` runs in a real Web Worker; cannot execute in Vitest/jsdom. The test suite only covers the type contract and computeTimestamps logic.

#### 3. Trim, split, move interactions

**Test:** In the timeline, drag a clip edge to trim, drag a clip body to move, press B then click a clip to split.
**Expected:** Clip dimensions update immediately; undo (Cmd+Z) reverts each operation.
**Why human:** @xzdarcy/react-timeline-editor interaction callbacks require a real DOM with canvas/pointer events.

#### 4. Cursor change on tool switch

**Test:** Press V (Select) and hover over a clip, then press B (Blade) and hover again.
**Expected:** Cursor shows pointer in Select mode, crosshair in Blade mode.
**Why human:** CSS cursor property cannot be asserted in jsdom.

---

### Test Suite Results

```
Test Files  4 passed (4)
     Tests  45 passed (45)
  Duration  516ms
```

All 45 tests pass with zero failures.

- `src/store/store.test.ts` — 30 tests (store shape, Zundo partialize, all 7 actions + undo/redo + single-undo regression)
- `src/hooks/useFileImport.test.ts` — 3 tests (video/audio track routing via addClip)
- `src/components/TimelinePanel.test.tsx` — 4 tests (deriveEditorData: two rows, video clip, audio clip, selected flag)
- `src/workers/ffmpeg.worker.test.ts` — 8 tests (computeTimestamps, API contract, proxy export)

Build: `npx vite build` exits 0, clean 466 kB bundle with separate worker chunk.

---

### Notable Implementation Details Verified

- **Single-undo delete fix:** `deleteClip` clears `ui.selectedClipId` in the same `set()` call (line 126 in store/index.ts) — avoids the Zundo double-history-entry bug. Regression test at line 269 in store.test.ts confirms single Cmd+Z is sufficient.
- **Undo exclusion:** `selectClip` and `setActiveTool` mutate only the `ui` slice. The Zundo `partialize` function (lines 142-147 in store/index.ts) explicitly excludes `ui`, `export`, and all `keyof StoreActions` keys — verified by tests 8 and 9 in store.test.ts.
- **Color rotation isolation:** Module-level `colorIndex` counter exposed via `resetColorIndex()` export; called in `beforeEach` across all test files.
- **WASM loading:** `ffmpeg.worker.ts` uses `toBlobURL` pointing to `self.location.origin/ffmpeg-core.*` (served from `public/`) — both files confirmed present.
- **Timeline library is read-only consumer:** No `onChange` handler in TimelinePanel (anti-pattern documented in research); only `onActionMoveEnd` and `onActionResizeEnd` dispatch mutations.

---

## Gaps Summary

None. All 11 phase requirements satisfied. All artifacts exist, are substantive, and are correctly wired. The full test suite (45 tests across 4 files) passes. Build is clean.

---

_Verified: 2026-03-17T01:35:00Z_
_Verifier: Claude (gsd-verifier)_
