---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: completed
stopped_at: Completed 02-05-PLAN.md — Phase 2 fully complete
last_updated: "2026-03-16T23:33:29.629Z"
last_activity: "2026-03-17 — Phase 2 Plan 04 complete: timeline fully wired to store"
progress:
  total_phases: 4
  completed_phases: 2
  total_plans: 9
  completed_plans: 9
  percent: 88
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-16)

**Core value:** Timeline + store work perfectly: clip edits reflect instantly, undo/redo is flawless, export faithfully renders what the timeline shows
**Current focus:** Phase 2 — Timeline Core

## Current Position

Phase: 2 of 4 (Timeline Core) — COMPLETE
Plan: 4 of 4 in current phase
Status: Phase 2 complete — ready for Phase 3
Last activity: 2026-03-17 — Phase 2 Plan 04 complete: timeline fully wired to store

Progress: [████████░░] 88%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 01-foundation P01 | 4 | 2 tasks | 19 files |
| Phase 01-foundation P03 | 3 | 1 tasks | 3 files |
| Phase 01-foundation P02 | 2 | 2 tasks | 7 files |
| Phase 01-foundation P04 | 5 | 2 tasks | 5 files |
| Phase 02-timeline-core P01 | 3 | 2 tasks | 4 files |
| Phase 02-timeline-core P02 | 2 | 2 tasks | 5 files |
| Phase 02-timeline-core P03 | 1 | 2 tasks | 6 files |
| Phase 02-timeline-core P04 | 2 | 2 tasks | 4 files |
| Phase 02-timeline-core P05 | 2 | 2 tasks | 5 files |
| Phase 02-timeline-core P05 | 35 | 3 tasks | 10 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Project init: React 19 + @xzdarcy/react-timeline-editor hard-locked (previous Vue attempt failed)
- Project init: Zustand + Zundo — partialize MUST exclude ui and export slices (was #1 bug source in prior attempt)
- Project init (SUPERSEDED): ffmpeg.wasm was planned for Comlink worker — dropped in Phase 2 (see below)
- [Phase 01-foundation]: Downgraded Vite 8 to Vite 6.4.1: Node 22.2.0 installed, Vite 7/8 requires 22.12+
- [Phase 01-foundation]: Vitest 3.2.x used (not 4.x) to match Vite 6 ecosystem compatibility
- [Phase 01-foundation]: Separate vitest.config.ts from vite.config.ts for test environment isolation
- [Phase 01-foundation]: Phase 1 worker exposes only ping() — no @ffmpeg/ffmpeg import until Phase 2 to keep worker boundary testable without WASM
- [Phase 01-foundation]: Test uses @vitest-environment node to avoid jsdom 29 ERR_REQUIRE_ESM conflict in html-encoding-sniffer for worker tests
- [Phase 01-foundation]: Switched Vitest environment from jsdom to happy-dom: jsdom@29 has CJS/ESM conflict with @exodus/bytes
- [Phase 01-foundation]: Zundo partialize uses destructuring pattern — const { ui, export: _export, ...tracked } = state; return tracked
- [Phase 01-foundation P04]: Phase 1 uses static editorData in TimelinePanel; Phase 2 will wire useStore(state => state.tracks) — controlled display contract established
- [Phase 01-foundation P04]: TimelinePanel test uses vi.mock for @xzdarcy/react-timeline-editor — canvas/ResizeObserver not available in happy-dom
- [Phase 02-timeline-core]: Module-level colorIndex counter outside store persists across undo/redo; resetColorIndex() exported for test isolation
- [Phase 02-timeline-core]: TrackedState omits keyof StoreActions to avoid function references in Zundo partialize snapshot
- [Phase 02-timeline-core]: splitClip edge guard uses 0.01s threshold to prevent degenerate zero-duration clips
- [Phase 02-timeline-core]: useKeyboardShortcuts reads selectedClipId via useStore.getState() inside handler to avoid stale closure bug
- [Phase 02-timeline-core]: Cmd+Shift+Z guard placed before Cmd+Z to prevent redo from triggering undo
- [Phase 02-timeline-core]: DragLeave hides overlay only when relatedTarget is null (leaving window) to prevent flicker on internal element transitions
- [Phase 02-timeline-core]: fileInputRef kept in hook and passed as prop to TopBar to keep file input lifecycle ownership centralized
- [Phase 02-timeline-core]: TopBar Import button is optional (prop-guarded) to preserve backward-compatible rendering if props omitted
- [Phase 02-timeline-core P04]: effectId: 'default' used as single effect key linking all actions to renderer constant in effects object
- [Phase 02-timeline-core P04]: getActionRender returns null guard when clips[action.id] is undefined — prevents crash on stale action references
- [Phase 02-timeline-core P04]: cursorClass prop passed into ClipAction so component stays stateless; cursor determined by activeTool in parent
- [Phase 02-timeline-core]: fetchFile (@ffmpeg/util) converts File → Uint8Array on main thread before passing to ffmpeg.writeFile — no Comlink worker involved
- [Phase 02-timeline-core]: processedRef (Set outside Zustand) guards re-extraction on undo/redo; thumbnailUrls update goes through Zundo but is acceptable for v1
- [Phase 02-timeline-core]: @ffmpeg/core must be served locally via toBlobURL — CDN fetch blocked by CORP headers; WASM files copied to public/
- [Phase 02-timeline-core]: Comlink dropped entirely — @ffmpeg/ffmpeg.load() spawns its own internal worker via new Worker(new URL("./worker.js", import.meta.url)); running inside a Comlink worker breaks import.meta.url resolution (resolves to bundled blob URL). FFmpeg runs as main-thread singleton in useThumbnailExtractor.
- [Phase 02-timeline-core]: public/ffmpeg-core.js MUST be the ESM build (dist/esm/), NOT the UMD build. The internal ffmpeg worker loads it via dynamic import() and reads .default — UMD has no default export → ERROR_IMPORT_FAILURE.
- [Phase 02-timeline-core]: Frame extraction uses single first-frame grab: `-ss 0 -i input -frames:v 1 -vf scale=160:-2 -q:v 3`. Input seeking (`-ss` before `-i`) avoids decoding the full video; `-frames:v 1` stops immediately after one frame. Input file written with correct extension (input_<clipId>.mp4) for correct demuxer selection. fps-filter approach was abandoned — it decoded the full video to find timestamps and caused WASM heap exhaustion on 1920×1080 clips.
- [Phase 02-timeline-core]: @ffmpeg/ffmpeg WASM heap exhaustion — full-res decode + swscaler for 1920×1080 overflows the fixed heap. All thumbnail extraction must scale down (scale=160:-2) before encoding.
- [Phase 02-timeline-core]: FFmpeg singleton requires a Promise-chain serialization queue (enqueueFFmpegJob). @ffmpeg/ffmpeg's #send() posts messages to the internal worker immediately with no ordering guarantee — concurrent clips interleave writeFile/exec/readFile calls in the WASM FS, causing RuntimeError. fetchFile (pure JS) runs outside the queue so files buffer concurrently. Input/output filenames scoped to clipId as defence in depth.
- [Phase 02-timeline-core]: ClipAction redesigned — layout is [40px thumbnail or shimmer | filename | duration]. Video clips show thumbnail column (shimmer while loading); audio clips skip it. Single thumbnailUrls[0] used; no gradient overlay.
- [Phase 02-timeline-core]: deriveEditorData sets maxEnd = startTime + (sourceDuration - trimStart - trimEnd) on each action to prevent timeline resize beyond source file length.
- [Phase 02-timeline-core]: ClipAction label uses select-none to prevent text highlight on mouse drag.
- [Phase 02-timeline-core]: deleteClip clears ui.selectedClipId in same set() call — prevents second Zundo history entry from separate selectClip(null) call

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-03-17
Stopped at: Phase 2 post-execution fixes complete — ready to plan Phase 3
Resume file: None
