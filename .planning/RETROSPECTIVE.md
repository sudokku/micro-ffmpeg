# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-17
**Phases:** 4 | **Plans:** 13 | **Commits:** 93

### What Was Built
- Two-track timeline editor: drag-and-drop import, trim/split/delete/reorder clips
- Zustand + Zundo store with correct partialize — undo/redo works without UI state contamination
- Per-clip settings panel: blur/brightness/contrast/saturation filters, crop rectangle, output resize
- Export pipeline: filter graph (`buildVfFilter`) covering all 6 settings, progress bar, cancel, download
- Static thumbnail extraction via ffmpeg.wasm in a shared singleton

### What Worked
- **Store-first design**: Defining the store shape before any UI made the entire timeline wiring mechanical — `deriveEditorData` was a clean pure function
- **TDD on core logic**: `buildVfFilter` had 16 unit tests before export UI was touched; caught filter ordering bugs early
- **FFmpeg singleton extraction** in Phase 4 was smooth because the store was already clean — it was just moving code, not redesigning state
- **Zundo partialize** was the key architectural insight that prevented the #1 bug from the prior failed attempt. Locking it in Phase 1 before any UI work removed an entire class of future undo bugs.

### What Was Inefficient
- Phase 2 plans had `[ ]` checkboxes that remained unchecked in the roadmap (cosmetic issue from incomplete state tracking during execution)
- Export format GIF was added to UI but not end-to-end tested — small scope creep not caught in planning
- The Comlink design from Phase 1 (ffmpeg.worker.ts with `expose()`) was ultimately not used — Phase 2 discovery that `@ffmpeg/ffmpeg` manages its own internal worker made Comlink unnecessary. The Phase 1 worker file is dead code.

### Patterns Established
- `deriveEditorData` — pure function pattern: store → timeline data, no side effects. Established in Phase 2, proved its value in Phase 4
- `buildVfFilter` — filter graph as a pure function with unit tests before any UI integration
- FFmpeg singleton in `ffmpegSingleton.ts` — single load, shared by thumbnails and export
- Slider commit-on-release: only commit to store on `onPointerUp`, not on every drag event, to prevent ghost undo entries

### Key Lessons
1. **Plan the store before any UI.** Every component that reads from the store is trivial to implement once the types and actions are solid.
2. **Zundo partialize is not optional.** Exclude UI state immediately in Phase 1. Retrofitting this after UI components exist is painful.
3. **ffmpeg.wasm on main thread is fine for this scope.** The internal worker handles threading. Don't add Comlink — it breaks the internal worker's `import.meta.url` resolution.
4. **Pure functions for filter/editor data** are easy to test and composed naturally with ffmpeg's filter graph syntax.
5. **Controlled timeline component** (read from store, dispatch actions) avoids dual-source-of-truth bugs entirely.

### Cost Observations
- Model mix: balanced profile (sonnet for execution, opus for planning)
- Sessions: ~8 sessions across 2 days
- Notable: Phase 1 + 2 both shipped same day (2026-03-16) — scaffolding + full timeline core in one session each

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Timeline | Key Change |
|-----------|--------|-------|----------|------------|
| v1.0 MVP | 4 | 13 | 2 days | First milestone — baseline established |

### Cumulative Quality

| Milestone | LOC | Files | Commits |
|-----------|-----|-------|---------|
| v1.0 | ~2,489 TS | 103 | 93 |

### Top Lessons (Verified Across Milestones)

1. Store-first design: define types and actions before any UI component
2. Zundo partialize must exclude UI/export slices from day one
