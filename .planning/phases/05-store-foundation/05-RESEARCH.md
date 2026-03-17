# Phase 5: Store Foundation - Research

**Researched:** 2026-03-17
**Domain:** Zustand + Zundo store schema extension — TypeScript type additions, partialize safety, zero UI changes
**Confidence:** HIGH

---

## Summary

Phase 5 is a pure TypeScript schema extension. The existing v1.0 store is fully understood from direct codebase inspection: `src/store/types.ts` defines `Clip`, `ClipSettings`, `UiState`, `ExportState`, `StoreActions`, `StoreState`, and `TrackedState`. The `src/store/index.ts` wires Zustand + Zundo with a `partialize` function that excludes `ui` and `export` from undo history.

The goal is to add six new fields to two interfaces (`UiState` and `ClipSettings`) and one field to `Clip`, then verify `partialize` remains correct. No new libraries are needed. No UI components change. The only consumers of the store that might need guard-clause updates are `buildFilterGraph.ts` (which reads `ClipSettings`) and `ClipSettingsPanel.tsx` (which reads `ui.selectedClipId`).

The critical constraint from STATE.md: `selectedClipIds` must live inside `UiState` as `string[]` (not `Set<string>`, not top-level) to avoid polluting Zundo history. This is a locked architectural decision.

**Primary recommendation:** Extend the two type files (`types.ts`, `index.ts`), add defaults in the initial store state, update `TrackedState` if needed, then run the full test suite to confirm zero regression.

---

## Standard Stack

No new libraries. The full stack is locked by CLAUDE.md:

| Library | Version | Role in this Phase |
|---------|---------|-------------------|
| zustand | 5.0.12 | Store container — no changes to its API usage |
| zundo | 2.3.0 | Temporal middleware — `partialize` must be verified after adding new fields |
| typescript | ~5.9.3 | Type checking — interface additions are the primary deliverable |
| vitest | 3.2.0 | Test runner — existing test suite is the regression harness |

**Installation:** Nothing to install.

---

## Architecture Patterns

### Current Store Shape (v1.0 — verified from src/store/types.ts)

```typescript
// Current UiState — must be extended
export interface UiState {
  selectedClipId: string | null   // single selection only
  activeTool: 'select' | 'blade'
}

// Current ClipSettings — must be extended
export interface ClipSettings {
  clipId: string
  blur: number
  brightness: number
  contrast: number
  saturation: number
  crop: { x: number; y: number; width: number; height: number } | null
  resize: { width: number; height: number } | null
}

// Current Clip — must be extended
export interface Clip {
  id: string
  trackId: 'video' | 'audio'
  sourceFile: File
  sourceDuration: number
  sourceWidth: number
  sourceHeight: number
  startTime: number
  endTime: number
  trimStart: number
  trimEnd: number
  color: string
  thumbnailUrls: string[]
}

// TrackedState — excludes ui + export + actions from Zundo
export type TrackedState = Omit<StoreState, 'ui' | 'export' | keyof StoreActions>
```

### Target Store Shape (v1.1 Phase 5)

```typescript
// Extended UiState — all new fields in this slice (excluded from undo)
export interface UiState {
  selectedClipId: string | null    // keep for single-select compat (Phase 9 adds multi)
  activeTool: 'select' | 'blade'
  playheadTime: number             // seconds; default 0
  isPlaying: boolean               // default false
  pixelsPerSecond: number          // timeline zoom; default 100 (safe mid-range)
  selectedClipIds: string[]        // multi-select; default []; use Set only at call site
}

// Extended ClipSettings — new fields added, all with explicit defaults
export interface ClipSettings {
  clipId: string
  blur: number
  brightness: number
  contrast: number
  saturation: number
  crop: { x: number; y: number; width: number; height: number } | null
  resize: { width: number; height: number } | null
  // New in v1.1
  speed: 0.25 | 0.5 | 1 | 2 | 4   // default 1
  rotation: 0 | 90 | 180 | 270     // default 0
  volume: number                    // 0.0–2.0 float; default 1.0 (= 100%)
  hue: number                       // -180 to 180 degrees; default 0
  flipH: boolean                    // default false
  flipV: boolean                    // default false
}

// Extended Clip — one new field
export interface Clip {
  // ... all existing fields unchanged ...
  waveformPeaks: number[] | null   // null until extracted; set by Phase 7
}
```

### Partialize Invariant

The existing `partialize` in `index.ts` destructures named keys to exclude them:

```typescript
partialize: (state): TrackedState => {
  const { ui, export: _export, addClip, moveClip, trimClip, splitClip,
          deleteClip, selectClip, setActiveTool, updateClipSettings,
          setExportStatus, setExportProgress, ...tracked } = state
  return tracked
},
```

After Phase 5, `ui` still covers all new `UiState` fields (`playheadTime`, `isPlaying`, `pixelsPerSecond`, `selectedClipIds`) because they are inside the `ui` object — no change to `partialize` logic is needed. The new `ClipSettings` fields and `waveformPeaks` on `Clip` are part of `clipSettings` and `clips` respectively, which ARE tracked (correctly included in undo history). No partialize changes required.

### Store Initial State Updates

```typescript
// In index.ts, the initial state object must include defaults for new fields:
ui: {
  selectedClipId: null,
  activeTool: 'select',
  playheadTime: 0,
  isPlaying: false,
  pixelsPerSecond: 100,
  selectedClipIds: [],
},

// In addClip, the clip literal must include waveformPeaks:
const clip = {
  // ... existing fields ...
  waveformPeaks: null,
}

// In updateClipSettings, the defaults for new ClipSettings fields
// should be included in the fallback object:
const existing = state.clipSettings[clipId] ?? {
  clipId,
  blur: 0,
  brightness: 0,
  contrast: 1,
  saturation: 1,
  crop: null,
  resize: null,
  speed: 1,
  rotation: 0,
  volume: 1.0,
  hue: 0,
  flipH: false,
  flipV: false,
}
```

### Anti-Patterns to Avoid

- **`selectedClipIds` as `Set<string>` in store:** Zundo's equality check cannot diff `Set` instances. Two sets with identical contents are not equal, so every selection change creates a history entry. Store as `string[]`, convert to `Set` at the call site only (`new Set(state.ui.selectedClipIds)`).
- **New fields at top-level store instead of inside `ui`:** `playheadTime`, `isPlaying`, `pixelsPerSecond`, `selectedClipIds` are all transient UI state. Placing any of them outside `UiState` makes them tracked by Zundo and undoable via Cmd+Z, which is wrong.
- **Removing `selectedClipId`:** Keep the existing single-select field. Phase 9 will wire multi-select. Phase 5 only adds the new fields; no existing consumers should break.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Zundo exclusion mechanism | Custom undo filter | Existing `partialize` — just verify it still works | The pattern is already proven and tested in v1.0 |
| Default ClipSettings values | Separate defaults registry | Inline `?? { clipId, blur: 0, ... }` in `updateClipSettings` | Already the v1.0 pattern; consistent, tested |
| Type guards for new ClipSettings fields | Runtime validators | TypeScript strict mode + compile-time checks | The store is always typed; no runtime coercion needed |

---

## Common Pitfalls

### Pitfall 1: Forgetting to Add `waveformPeaks: null` in `addClip`

**What goes wrong:** TypeScript requires `waveformPeaks` on `Clip` after the interface change. If the `addClip` action's clip literal doesn't include it, the build fails. More dangerously, if TypeScript `strictNullChecks` is disabled or the field is added as optional (`?`), the field is silently absent and Phase 7's waveform code gets `undefined` instead of `null`.

**How to avoid:** Add `waveformPeaks: null` to the clip literal in `addClip`. Keep the type as `number[] | null` (not `number[] | null | undefined`). TypeScript will enforce presence at compile time.

### Pitfall 2: Test Suite Fails on `beforeEach` Store Reset (Missing New Fields)

**What goes wrong:** `store.test.ts` calls `useStore.setState({ tracks: ..., clips: {}, clipSettings: {}, ui: { selectedClipId: null, activeTool: 'select' }, export: ... })` in `beforeEach`. After adding new `UiState` fields, this `setState` call no longer provides the full `UiState` shape. Depending on whether Zustand merges or replaces, the reset state may have `undefined` for new fields. Tests that check `ui.selectedClipIds` will fail or behave unpredictably.

**How to avoid:** Update the `beforeEach` setState call in `store.test.ts` to include all new `UiState` fields with their defaults.

### Pitfall 3: `buildVfFilter` TypeScript Errors From Non-Optional New Fields

**What goes wrong:** `buildVfFilter` in `buildFilterGraph.ts` receives `ClipSettings | undefined`. After Phase 5 adds `speed`, `rotation`, `volume`, `hue`, `flipH`, `flipV` as required fields (not optional), any partial `ClipSettings` object used in tests will fail to compile.

**How to avoid:** The existing `ClipSettings` tests pass partial patches through `updateClipSettings` which merges with defaults — that pattern is safe. Direct `ClipSettings` object literals in test files (`buildFilterGraph.test.ts`) need updating. Review all literal `ClipSettings` objects in tests and add the new fields.

### Pitfall 4: `pixelsPerSecond` Default Value Choice

**What goes wrong:** The default for `pixelsPerSecond` matters because it sets the initial timeline zoom. Too low (< 20) and the timeline collapses. Too high (> 500) and short clips overflow the viewport. The existing `TimelinePanel` uses hardcoded `scaleWidth` behavior from the library — the Phase 5 default must match the library's own default (`scaleWidth: 160` per the library's EditData interface) or the timeline will visibly shift on first render.

**How to avoid:** Check the library's default `scaleWidth` (160 px per tick). Phase 8 will wire the `pixelsPerSecond` store field to the `scaleWidth` prop. For Phase 5, the default only needs to be a sane non-zero value that doesn't break anything. A value of `100` is safe and within the clamped range that Phase 8 will enforce (min: 40, max: 640 per PITFALLS.md research).

---

## Code Examples

### Correct `UiState` Extension

```typescript
// Source: direct codebase + STATE.md locked decision
export interface UiState {
  selectedClipId: string | null
  activeTool: 'select' | 'blade'
  playheadTime: number
  isPlaying: boolean
  pixelsPerSecond: number
  selectedClipIds: string[]  // NOT Set<string> — Zundo equality
}
```

### Correct `ClipSettings` Extension

```typescript
// Source: ROADMAP.md success criteria + STACK.md field table
export interface ClipSettings {
  clipId: string
  blur: number
  brightness: number
  contrast: number
  saturation: number
  crop: { x: number; y: number; width: number; height: number } | null
  resize: { width: number; height: number } | null
  speed: 0.25 | 0.5 | 1 | 2 | 4
  rotation: 0 | 90 | 180 | 270
  volume: number
  hue: number
  flipH: boolean
  flipV: boolean
}
```

### Correct Store Initial State

```typescript
// Source: src/store/index.ts pattern
ui: {
  selectedClipId: null,
  activeTool: 'select',
  playheadTime: 0,
  isPlaying: false,
  pixelsPerSecond: 100,
  selectedClipIds: [],
},
```

### Correct `addClip` Clip Literal

```typescript
// Source: src/store/index.ts addClip action
const clip = {
  id,
  trackId,
  sourceFile: file,
  sourceDuration: duration,
  sourceWidth,
  sourceHeight,
  startTime,
  endTime,
  trimStart: 0,
  trimEnd: duration,
  color,
  thumbnailUrls: [],
  waveformPeaks: null,   // new
}
```

### Correct `updateClipSettings` Default Object

```typescript
// Source: src/store/index.ts updateClipSettings action — extended
const existing = state.clipSettings[clipId] ?? {
  clipId,
  blur: 0,
  brightness: 0,
  contrast: 1,
  saturation: 1,
  crop: null,
  resize: null,
  speed: 1 as const,
  rotation: 0 as const,
  volume: 1.0,
  hue: 0,
  flipH: false,
  flipV: false,
}
```

### Accessing `selectedClipIds` as a Set at Call Site

```typescript
// Source: STATE.md locked decision — store string[], convert at use site
const selectedSet = new Set(useStore.getState().ui.selectedClipIds)
if (selectedSet.has(clipId)) { /* ... */ }
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single `selectedClipId: string | null` | Adding `selectedClipIds: string[]` alongside (not replacing) | Phase 5 | Both coexist; Phase 9 wires multi-select behavior |
| No playhead tracking in store | `playheadTime: number` in `UiState` | Phase 5 | Phase 10 (preview) reads this to sync canvas |
| No zoom field in store | `pixelsPerSecond: number` in `UiState` | Phase 5 | Phase 8 (zoom) reads/writes this |

**Deprecated/outdated:** Nothing from v1.0 is deprecated in this phase. All existing fields are preserved.

---

## Open Questions

1. **Should `selectedClipId` (singular) be kept after adding `selectedClipIds` (plural)?**
   - What we know: Current consumers (`ClipSettingsPanel`, `TimelinePanel`) read `ui.selectedClipId`
   - Recommendation: Keep `selectedClipId` in Phase 5. Phase 9 will reconcile single/multi-select. Removing it now would break all existing consumers unnecessarily.

2. **Should new `ClipSettings` fields be optional (`speed?: ...`) or required?**
   - What we know: Existing fields like `blur`, `brightness` are required (no `?`). Defaults come from the `?? { clipId }` fallback in `updateClipSettings`.
   - Recommendation: Make them required (no `?`) to match the existing pattern. The fallback object in `updateClipSettings` provides the defaults. Optional fields would require null-checks throughout Phase 6 filter code.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.0 |
| Config file | `vitest.config.ts` (exists) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements to Test Map

Phase 5 has no user-visible requirements (it unblocks later phases). The validation targets are the five success criteria from ROADMAP.md:

| Success Criterion | Test Type | Automated Command | File Exists? |
|-------------------|-----------|-------------------|-------------|
| `UiState` contains `playheadTime`, `isPlaying`, `pixelsPerSecond`, `selectedClipIds: string[]` | unit (type + runtime shape) | `npm test` — `src/store/store.test.ts` | exists, needs new test cases |
| `ClipSettings` contains `speed`, `rotation`, `volume`, `hue`, `flipH`, `flipV` | unit (type + runtime shape) | `npm test` — `src/store/store.test.ts` | exists, needs new test cases |
| `Clip` has `waveformPeaks: number[] | null` | unit (addClip result shape) | `npm test` — `src/store/store.test.ts` | exists, needs new test case |
| Zundo `partialize` still excludes all `UiState` fields | unit (existing undo tests + new field test) | `npm test` — `src/store/store.test.ts` | exists, needs one new test |
| All existing v1.0 features work without regression | unit (full existing test suite must pass) | `npm test` | all test files exist |

### Sampling Rate

- **Per task commit:** `npm test` (all tests, runs in < 5 seconds)
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before marking phase complete

### Wave 0 Gaps

- [ ] New test cases in `src/store/store.test.ts` — cover new `UiState` field defaults, new `ClipSettings` field defaults, `waveformPeaks: null` on `addClip`, and Zundo exclusion of new `UiState` fields
- [ ] Update `beforeEach` reset in `src/store/store.test.ts` to include new `UiState` fields
- [ ] Update `mockClip` literal in `src/store/store.test.ts` to include `waveformPeaks: null`
- [ ] Update `ClipSettings` literals in `src/utils/buildFilterGraph.test.ts` to include new required fields

---

## Sources

### Primary (HIGH confidence)

- `src/store/types.ts` — complete current interface definitions, verified by direct read
- `src/store/index.ts` — complete current store implementation, partialize function verified by direct read
- `src/store/store.test.ts` — existing test suite shape, beforeEach pattern, mockClip literal verified
- `src/utils/buildFilterGraph.ts` — ClipSettings consumer, verifies which fields are accessed
- `.planning/STATE.md` — locked decisions including `selectedClipIds: string[]` in `UiState`, partialize pattern
- `.planning/research/STACK.md` — field table for speed/rotation/volume/hue/flipH/flipV with types and defaults
- `.planning/research/PITFALLS.md` — Pitfall 3 (Zundo + Set), Pitfall 10 (zoom bounds), Technical Debt table
- `.planning/ROADMAP.md` — Phase 5 success criteria (exact field names and types)

### Secondary (MEDIUM confidence)

- `.planning/research/STACK.md` — `pixelsPerSecond` default guidance (100 vs library default of 160); the exact default matters when Phase 8 wires zoom but is harmless in Phase 5

---

## Metadata

**Confidence breakdown:**
- Types to add: HIGH — field names, types, and defaults are all specified in ROADMAP.md success criteria and STATE.md decisions
- Partialize impact: HIGH — verified by reading the current partialize implementation; new fields inside `ui` are automatically excluded
- Test updates needed: HIGH — identified all four files that need updating from direct codebase inspection
- `pixelsPerSecond` default value: MEDIUM — 100 is safe but the exact value is not prescribed; Phase 8 will enforce bounds anyway

**Research date:** 2026-03-17
**Valid until:** Stable — this is pure TypeScript schema work against a locked stack; no expiry concern
