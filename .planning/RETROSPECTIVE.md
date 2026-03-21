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

## Milestone: v1.1 — Preview & Polish

**Shipped:** 2026-03-22
**Phases:** 7 (5-11) | **Plans:** 14 | **Tasks:** 23

### What Was Built
- Real-time canvas preview with rAF loop, HTML5 video/audio element pool, CSS filter rendering, and playhead sync
- Audio waveform extraction (Web Audio API OfflineAudioContext) + Audacity-style dual-layer canvas renderer
- Timeline zoom: +/−/fit buttons + Cmd/Ctrl+scroll cursor-anchored zoom (50–400px/s)
- Multi-clip selection: Cmd/Ctrl+click toggle, bulk delete + settings fan-out, all undoable as one action
- Per-clip speed/rotation/volume/hue/flip controls in ClipSettingsPanel with audio guard and bulk-apply
- ffmpeg filter extensions: atempo chaining, volume attenuation, hue/saturation/flip vf filters for export
- iMovie-style layout: 280px sidebar, 28vh timeline, three-panel composition

### What Worked
- **Wave-based parallel execution** — phases 6-9 were independent (all depend only on phase 5) and could be planned and executed in any order without conflicts. Wave grouping made this explicit.
- **TDD-first for preview utils** — `buildCanvasFilter` and `previewUtils` (findClipAt, formatTimecode, etc.) had 37 tests before `usePreview` hook was written. Caught edge cases in clip lookup and time bounds before integration.
- **Separate buildCanvasFilter from buildVfFilter** — CSS filter strings (preview) and ffmpeg vf args (export) look similar but differ in syntax and units. Testing them separately caught drift early.
- **atempo chaining design** was fully spec'd in phase 6 tests before the hook existed — all 5 speed presets verified at unit level before any UI touched it.
- **Audio clip guard** (single `{!isAudio && ...}` block wrapping TRANSFORM/FILTERS/CROP/RESIZE) was a clean pattern — easy to test, easy to reason about.

### What Was Inefficient
- Phase 10 (Preview Panel) had 3 plans but plan 10-02 (store actions + playhead sync) was smaller than expected — could have been merged with 10-01. The separation was cautious but added overhead.
- Multi-clip move-together (SEL-04) was in scope but not achievable without deep timeline library integration — discovered during Phase 9 execution. Should have been flagged as risky at planning time and moved to Out of Scope earlier.
- Phase 11 UI-SPEC research produced a detailed design contract that was largely redundant with what was already obvious from the Phase 6 filter work. Lighter research would have been sufficient for a polish phase.

### Patterns Established
- `buildCanvasFilter(settings)` → CSS filter string — parallel to `buildVfFilter` for export. Keeps preview and export filter logic independently testable.
- `rAF loop + video element pool` — single `<video>` per source file, seeked to the right position on each rAF tick. Avoids creating/destroying DOM elements during playback.
- `commit-on-release` extended to all new sliders (volume, hue) — same pattern as Phase 3 blur/brightness sliders.
- `isAudio` guard wrapping all non-playback sections — single boolean derived from `clip.trackId === 'audio'` gates transform/filter/crop/resize visibility.

### Key Lessons
1. **Independent phases should be identified at roadmap time.** Phases 6-9 were all Phase 5 dependents with no inter-dependencies — this could have been flagged in the roadmap for parallel execution opportunity.
2. **Timeline library constraints must be discovered early.** Multi-clip drag (SEL-04) required knowing the xzdarcy drag API supports only single-clip callbacks — this is a planning-time discovery, not execution-time.
3. **Preview = CSS filter + canvas, not DOM composition.** Using a single canvas with `drawImage` + `filter` gives the same visual result as DOM layering with far less complexity. The rAF approach scales to any clip count.
4. **atempo range constraint (0.5–2.0) must be handled in the filter layer, not the UI.** The UI shows 5 clean presets; the filter function chains atempo transparently for out-of-range values. UI and export both work without special cases at their level.
5. **Verifier spot-checks are trustworthy.** All 7 VERIFICATION.md files passed with 5/5 must-haves — no gap closure phases were needed this milestone. The TDD approach on pure functions upstream made downstream integration reliable.

### Cost Observations
- Model mix: balanced profile (sonnet for execution/verification, opus for planning research)
- Sessions: ~6 sessions across 5 days (2026-03-17 → 2026-03-22)
- Notable: Phases 6-10 all shipped within 2 days (2026-03-17 → 2026-03-18) — 9 plans in rapid succession with no rework

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Timeline | Key Change |
|-----------|--------|-------|----------|------------|
| v1.0 MVP | 4 | 13 | 2 days | First milestone — baseline established |
| v1.1 Preview & Polish | 7 | 14 | 5 days | Wave-based execution; TDD-first for preview/filter logic |

### Cumulative Quality

| Milestone | LOC | Files Changed | Commits |
|-----------|-----|---------------|---------|
| v1.0 | ~2,489 TS | 103 | 93 |
| v1.1 | ~5,029 TS | 88 changed/added | 44 |

### Top Lessons (Verified Across Milestones)

1. Store-first design: define types and actions before any UI component
2. Zundo partialize must exclude UI/export slices from day one
3. TDD pure functions (filter graph, preview utils) before any integration — catches semantic bugs at unit level
4. Identify independent phases at roadmap time — enables parallelism and wave execution
