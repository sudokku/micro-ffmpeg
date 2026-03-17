---
phase: 02-timeline-core
plan: "05"
subsystem: workers/hooks
tags: [ffmpeg, wasm, thumbnails, worker, comlink]
dependency_graph:
  requires: [02-03, 02-04]
  provides: [thumbnail-extraction-pipeline]
  affects: [src/workers/ffmpeg.worker.ts, src/hooks/useThumbnailExtractor.ts, src/components/AppShell.tsx]
tech_stack:
  added: ["@ffmpeg/core@0.12.10"]
  patterns: [comlink-worker-extension, fire-and-forget-async, processedRef-undo-guard, local-wasm-loading-via-toBlobURL]
key_files:
  created:
    - src/utils/computeTimestamps.ts
    - src/hooks/useThumbnailExtractor.ts
    - public/ffmpeg-core.js
    - public/ffmpeg-core.wasm
  modified:
    - src/workers/ffmpeg.worker.ts
    - src/workers/ffmpeg.worker.test.ts
    - src/components/AppShell.tsx
    - src/store/index.ts
    - src/hooks/useKeyboardShortcuts.ts
    - src/store/store.test.ts
decisions:
  - "Worker accepts Uint8Array (not File) for cross-browser structured clone compatibility; main thread converts via fetchFile"
  - "Worker returns Blob[] — main thread creates URL.createObjectURL for each blob (blob URL creation stays on main thread)"
  - "processedRef (Set outside Zustand) guards re-extraction on undo/redo (Pitfall 4 prevention)"
  - "ensureLoaded() singleton ensures FFmpeg WASM loaded only once per worker lifetime"
  - "@ffmpeg/core must be installed separately and served locally — CDN load fails under CORP headers; use toBlobURL with public/ files"
  - "deleteClip clears ui.selectedClipId in the same set() call to prevent a second Zundo history entry from a subsequent selectClip(null)"
metrics:
  duration: 35 minutes
  completed_date: "2026-03-17"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 10
requirements-completed: [PREV-01]
---

# Phase 2 Plan 05: FFmpeg Worker Thumbnail Extraction Summary

**FFmpeg WASM frame extraction pipeline via Comlink worker — @ffmpeg/core loaded locally via toBlobURL, single-undo delete fixed, thumbnails and shimmer verified in browser.**

## Performance

- **Duration:** ~35 min (including bug fix session after checkpoint)
- **Started:** 2026-03-16T22:25:00Z
- **Completed:** 2026-03-17T01:35:00Z
- **Tasks:** 3 of 3
- **Files modified:** 10

## Accomplishments

- Extended ffmpeg.worker.ts with FFmpeg WASM load + extractFrames (Uint8Array in, Blob[] out)
- Created useThumbnailExtractor hook — watches store for new video clips, fires extraction in worker, stores blob URLs
- Fixed @ffmpeg/core not installed — installed package and copied WASM files to public/ with local loading via toBlobURL
- Fixed double CMD+Z undo bug — deleteClip now clears selectedClipId atomically in one set() call
- All 45 tests passing, clean build

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend ffmpeg worker with extractFrames** - `8aa23d9` (feat)
2. **Task 2: Create useThumbnailExtractor hook** - `e175d48` (feat)
3. **Task 3 (verification + bugfixes):**
   - `09796b3` fix: install @ffmpeg/core and load WASM from local public/ files
   - `ede361c` fix: combine deleteClip deselect into single set() for single-undo

## Files Created/Modified

- `src/utils/computeTimestamps.ts` - Pure function: 1 frame per 5 seconds, min 1, centered timestamps
- `src/workers/ffmpeg.worker.ts` - Extended with FFmpeg.load via local toBlobURL + extractFrames
- `src/workers/ffmpeg.worker.test.ts` - computeTimestamps unit tests + API contract test
- `src/hooks/useThumbnailExtractor.ts` - Hook: watches clips, triggers extraction, stores blob URLs
- `src/components/AppShell.tsx` - Wires useThumbnailExtractor
- `src/store/index.ts` - deleteClip now clears ui.selectedClipId in same set() call
- `src/hooks/useKeyboardShortcuts.ts` - Removed redundant selectClip(null) after deleteClip
- `src/store/store.test.ts` - Added regression test for single-undo deleteClip
- `public/ffmpeg-core.js` - Copied from @ffmpeg/core for local serving
- `public/ffmpeg-core.wasm` - Copied from @ffmpeg/core for local serving

## Decisions Made

- `@ffmpeg/core` must be served locally — CORP headers (`require-corp`) block CDN fetch. Fixed by copying WASM files to `public/` and loading via `toBlobURL` in the worker.
- `deleteClip` clears `ui.selectedClipId` in the same `set()` call — prevents a second Zundo history entry from a subsequent `selectClip(null)`. Without `equality` or `diff` config, Zundo records every `set()` call as a history entry, even when partialized state hasn't changed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] @ffmpeg/core not installed — thumbnails never appeared**
- **Found during:** Task 3 (manual smoke test verification)
- **Issue:** `@ffmpeg/ffmpeg` v0.12 requires `@ffmpeg/core` to be separately installed. Without it, `ffmpeg.load()` tries to fetch from `https://unpkg.com/@ffmpeg/core...` which is blocked by the dev server's `Cross-Origin-Embedder-Policy: require-corp` headers. The worker silently failed, leaving clips with `thumbnailUrls: []` forever. The shimmer was correct but extraction never completed.
- **Fix:** Installed `@ffmpeg/core@0.12.10`, copied `ffmpeg-core.js` and `ffmpeg-core.wasm` to `public/`, updated `ffmpeg.worker.ts` to use `toBlobURL` pointing to `self.location.origin/ffmpeg-core.*`.
- **Files modified:** `src/workers/ffmpeg.worker.ts`, `public/ffmpeg-core.js`, `public/ffmpeg-core.wasm`, `package.json`, `package-lock.json`
- **Verification:** Build passes, thumbnails appear in browser after import
- **Committed in:** `09796b3`

**2. [Rule 1 - Bug] Double CMD+Z required to undo a clip delete**
- **Found during:** Task 3 (manual smoke test verification)
- **Issue:** `useKeyboardShortcuts` called `deleteClip(clipId)` then `selectClip(null)` as two separate calls. Zundo (without `equality`/`diff` config) records a history entry for every `set()` invocation, even when the partialized (tracked) state hasn't changed. The `selectClip` call only mutates `ui` (excluded from partialize), but still creates a Zundo entry. Undoing this empty entry consumes one CMD+Z without visible effect, requiring a second press.
- **Fix:** Moved `ui.selectedClipId: null` into `deleteClip`'s existing `set()` call. Removed separate `selectClip(null)` from the keyboard handler. Added regression test.
- **Files modified:** `src/store/index.ts`, `src/hooks/useKeyboardShortcuts.ts`, `src/store/store.test.ts`
- **Verification:** New test `deleteClip restores clip with single undo` passes; all 45 tests green
- **Committed in:** `ede361c`

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes were essential — thumbnails couldn't work without @ffmpeg/core, and undo behavior was broken. No scope creep.

## Known Limitations (By Design)

**Bug 1 (overlapping clips):** Video and audio clips can be placed on top of each other on the same track. The plan has no anti-overlap/collision requirement for Phase 2. `moveClip` and `trimClip` perform no overlap checks. This is a known limitation to be addressed in a future phase if needed.

## Issues Encountered

- ffmpeg.wasm silent failure under CORP headers — identified by checking @ffmpeg/core package presence in node_modules (not installed)
- Zundo history behavior with excluded-state `set()` calls — root-caused by reading Zundo source to understand `_handleSet` triggers

## User Setup Required

None - no external service configuration required. WASM files are served from `public/` (included in repo and Vite build output).

## Next Phase Readiness

- Phase 2 complete: import, clip display, trim, split, delete, reorder, undo/redo, thumbnails all working
- Phase 3 (Clip Settings) can read `clips[id]`, `clipSettings[id]`, and access `ui.selectedClipId`
- `thumbnailUrls` are stable blob URLs on each clip — Phase 3 can display them in the clip inspector panel

## Self-Check

### Files exist:
- [x] src/utils/computeTimestamps.ts
- [x] src/hooks/useThumbnailExtractor.ts
- [x] src/workers/ffmpeg.worker.ts (modified)
- [x] src/workers/ffmpeg.worker.test.ts (modified)
- [x] src/components/AppShell.tsx (modified)
- [x] src/store/index.ts (modified)
- [x] src/hooks/useKeyboardShortcuts.ts (modified)
- [x] public/ffmpeg-core.js
- [x] public/ffmpeg-core.wasm

### Commits exist:
- [x] 8aa23d9 — feat(02-05): extend ffmpeg worker with extractFrames and add computeTimestamps
- [x] e175d48 — feat(02-05): add useThumbnailExtractor hook and wire into AppShell
- [x] 09796b3 — fix(02-05): install @ffmpeg/core and load WASM from local public/ files
- [x] ede361c — fix(02-05): combine deleteClip deselect into single set() for single-undo

## Self-Check: PASSED
