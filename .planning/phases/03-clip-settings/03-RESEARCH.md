# Phase 3: Clip Settings - Research

**Researched:** 2026-03-17
**Domain:** Zustand store extension, React form controls (sliders, number inputs), Tailwind sidebar layout
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Panel location**
- Right sidebar, always visible, 240px wide
- AppShell gets a new right column alongside the existing layout (ToolSidebar | main area | right sidebar)
- Timeline (37vh) remains at the bottom spanning full width
- When no clip is selected: show hint text — "Select a clip to edit its settings"
- When a clip is selected: show truncated filename as panel header, then all controls below

**Filter sliders**
- Four sliders: Blur, Brightness, Contrast, Saturation
- Displayed in order: Blur → Brightness → Contrast → Saturation
- Claude's discretion on exact slider ranges (must map to ffmpeg filter parameters for Phase 4 consumption)

**Crop input**
- Four numeric pixel inputs: X offset, Y offset, Width, Height
- Default values: X=0, Y=0, W=source video width, H=source video height (effectively no crop)
- "No crop" detection: if values equal source dimensions with X=0, Y=0, skip ffmpeg crop filter in export
- No visual crop overlay — text fields only

**Resize input**
- Two pixel inputs: Width x Height
- Aspect-ratio lock toggle, on by default
- When locked: changing one dimension auto-calculates the other from the source aspect ratio
- Default values: source video width x source video height (effectively no resize)
- "No resize" detection: if values equal source dimensions, skip ffmpeg scale filter in export

**Store — ClipSettings shape (Phase 3 populates the stub)**
- Extend the `ClipSettings` interface in `src/store/types.ts` with:
  - `blur: number` (default 0)
  - `brightness: number` (Claude's discretion on range/default)
  - `contrast: number` (Claude's discretion on range/default)
  - `saturation: number` (Claude's discretion on range/default)
  - `crop: { x: number; y: number; width: number; height: number } | null` (null = no crop set yet, populate with source dims on first edit)
  - `resize: { width: number; height: number } | null` (null = no resize set yet)
- `clipSettings` is already in Zundo `TrackedState` — undo/redo comes for free

### Claude's Discretion
- Exact filter slider ranges (must be compatible with ffmpeg filter values for Phase 4)
- Slider step increments and display formatting
- Exact Tailwind styling for the right sidebar
- Whether a "Reset" button per section is included
- Aspect ratio calculation logic details

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CLIP-01 | User can apply a blur filter to a selected clip | Store `blur` field + `boxblur` luma_radius 0–10; slider maps 1:1 to luma_radius |
| CLIP-02 | User can adjust brightness of a selected clip | Store `brightness` field + ffmpeg `eq` filter brightness -1.0–1.0; slider default 0 |
| CLIP-03 | User can adjust contrast of a selected clip | Store `contrast` field + ffmpeg `eq` filter contrast 0.0–2.0 (practical range); slider default 1 |
| CLIP-04 | User can adjust saturation of a selected clip | Store `saturation` field + ffmpeg `eq` filter saturation 0.0–3.0; slider default 1 |
| CLIP-05 | User can set a crop rectangle for a selected clip | Store `crop` object {x, y, width, height}; four number inputs; null until first edit |
| CLIP-06 | User can set output resize dimensions for a selected clip | Store `resize` object {width, height}; two number inputs; aspect-ratio lock toggle |
</phase_requirements>

---

## Summary

Phase 3 is a pure UI + store wiring phase. There are no new third-party dependencies to install. The work is entirely contained in three areas: (1) extending the `ClipSettings` type and adding an `updateClipSettings` action to the existing Zustand/Zundo store, (2) building a `ClipSettingsPanel` component wired to that store, and (3) inserting that panel as a new right column in `AppShell.tsx`.

The existing store architecture makes undo/redo automatic: `clipSettings` is already in `TrackedState` (see `src/store/types.ts` line 52). Any `set()` call that mutates `clipSettings` will be captured by Zundo with no additional configuration. All that is needed is a single `updateClipSettings(clipId, patch)` action following the same `set(state => ...)` pattern already used by all other clip actions.

The ffmpeg filter parameter ranges are well-documented and stable. The chosen slider ranges must be Phase 4-safe: values stored in the Zustand store are used directly as ffmpeg filter arguments during export, so there is no conversion layer. This means: blur stores the `luma_radius` integer (0–10), brightness stores the `eq:brightness` float (-1.0–1.0), contrast stores the `eq:contrast` float (0.0–2.0, default 1.0), saturation stores the `eq:saturation` float (0.0–3.0, default 1.0).

**Primary recommendation:** Add `updateClipSettings` action first (store plan), then build `ClipSettingsPanel` (UI plan). The two plans are sequential because the UI plan depends on the action existing.

---

## Standard Stack

### Core (all already installed — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | ^5.0.12 | Store state management | Project-locked; `clipSettings` slice already exists |
| zundo | ^2.3.0 | Undo/redo middleware | Project-locked; `clipSettings` in `TrackedState` already |
| react | ^19.2.4 | UI framework | Project-locked |
| tailwindcss | ^4.2.1 | Styling | Project-locked; dark zinc theme established |
| lucide-react | ^0.577.0 | Icons (lock icon for aspect ratio toggle) | Already installed, used in ToolSidebar |

### No New Packages Required

All functionality is achievable with native HTML `<input type="range">` and `<input type="number">` elements styled with Tailwind. No slider library, no form library.

**Installation:** None needed.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── store/
│   ├── types.ts          # Extend ClipSettings interface
│   └── index.ts          # Add updateClipSettings action + update partialize destructure
├── components/
│   ├── AppShell.tsx      # Add <ClipSettingsPanel /> as right flex column
│   └── ClipSettingsPanel.tsx   # New — right sidebar component (all sections)
└── store/
    └── store.test.ts     # Extend with updateClipSettings tests
```

### Pattern 1: Store Action — updateClipSettings

**What:** Partial update of a single clip's settings. Creates the entry if it doesn't exist yet.

**When to use:** Every slider `onChange`, every number input `onChange`. The store is the single source of truth — no local state in the component.

**Example:**
```typescript
// Following established set(state => ...) pattern from src/store/index.ts
updateClipSettings: (clipId, patch) => {
  set((state) => {
    const existing = state.clipSettings[clipId] ?? { clipId }
    return {
      clipSettings: {
        ...state.clipSettings,
        [clipId]: { ...existing, ...patch },
      },
    }
  })
},
```

This follows the exact same spread pattern as `moveClip` and `trimClip`. Because it uses `set(state => ...)`, Zundo captures it atomically.

### Pattern 2: Lazy Initialization of ClipSettings

**What:** `clipSettings[clipId]` may not exist for clips that have never been edited. Components must handle undefined gracefully.

**When to use:** Every time a component reads `clipSettings[selectedClipId]`.

**Example:**
```typescript
// In ClipSettingsPanel
const settings = useStore((s) =>
  s.selectedClipId ? s.clipSettings[s.selectedClipId] : undefined
)
// If settings is undefined, show defaults in UI but do not write to store until user interacts
```

**Default values to display (not stored until first edit):**
- blur: 0
- brightness: 0
- contrast: 1
- saturation: 1
- crop: { x: 0, y: 0, width: clip.sourceWidth, height: clip.sourceHeight }
- resize: { width: clip.sourceWidth, height: clip.sourceHeight }

Note: `sourceWidth` and `sourceHeight` are not currently on the `Clip` type. See Open Questions below.

### Pattern 3: Partialize Update in store/index.ts

**What:** `updateClipSettings` must be excluded from the Zundo partialize destructure.

**When to use:** Any time a new action is added to the store.

**Example:**
```typescript
// Current line 144 in src/store/index.ts:
const { ui, export: _export, addClip, moveClip, trimClip, splitClip, deleteClip, selectClip, setActiveTool, ...tracked } = state

// Phase 3 adds updateClipSettings to the destructure:
const { ui, export: _export, addClip, moveClip, trimClip, splitClip, deleteClip, selectClip, setActiveTool, updateClipSettings, ...tracked } = state
```

Failing to do this will cause TypeScript to error because `updateClipSettings` would be a function reference in the Zundo snapshot.

### Pattern 4: AppShell Layout Extension

**What:** Add right sidebar as a new `flex-none w-60` div inside the existing `flex flex-row flex-1 overflow-hidden` container.

**Current AppShell layout:**
```
flex-col h-screen
├── TopBar
├── flex-row flex-1 overflow-hidden
│   ├── ToolSidebar (flex-none w-10)
│   └── main (flex-1)
└── timeline (flex-none, 37vh)
```

**Phase 3 layout:**
```
flex-col h-screen
├── TopBar
├── flex-row flex-1 overflow-hidden
│   ├── ToolSidebar (flex-none w-10)
│   ├── main (flex-1)
│   └── ClipSettingsPanel (flex-none w-60)   ← NEW
└── timeline (flex-none, 37vh)
```

The panel is always rendered (stable layout, no reflow). Empty state text shown when `selectedClipId` is null.

### Pattern 5: Aspect Ratio Lock Calculation

**What:** When lock is on and user changes width, recalculate height from source aspect ratio (not from current stored dimensions).

**Why source ratio:** Source video dimensions are the canonical ratio reference. Using current stored dimensions would drift on repeated edits.

```typescript
// aspectRatio = clip.sourceDuration is already on Clip; source pixel dims are needed
// (See Open Questions — sourceWidth/sourceHeight not yet on Clip type)
const newHeight = Math.round(newWidth / sourceAspectRatio)
```

### Anti-Patterns to Avoid

- **Local component state for filter values:** Slider value must live in the store, not in `useState`. If a user undoes, the slider must reflect the store value. Local state breaks undo visual feedback.
- **Writing defaults to store on panel mount:** Do not call `updateClipSettings` with defaults when the panel opens. Write only when the user interacts. Otherwise every "clip select" creates a spurious undo history entry.
- **Using `useStore.getState()` inside event handlers for clipSettings reads:** Unlike `selectedClipId` (where the stale-closure pattern was intentional), clip settings reads should go through reactive subscription so the slider re-renders on undo/redo.
- **Forgetting to exclude `updateClipSettings` from partialize:** TypeScript will catch this at compile time, but it is easy to overlook.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Slider UI | Custom drag-based slider | Native `<input type="range">` | Keyboard accessible, touch-friendly, no JS drag logic needed |
| Number input with min/max clamping | Custom clamp logic | `<input type="number" min max>` with `parseInt`/`parseFloat` on change | Browser handles invalid input natively |
| Icon for lock toggle | SVG string | `lucide-react` `Lock` / `Unlock` (already installed) | Consistent with existing ToolSidebar pattern |

**Key insight:** This phase is entirely about wiring existing primitives. All complexity is in the store action and the aspect-ratio math — not in the UI widgets.

---

## ffmpeg Filter Parameter Reference

These are the values that WILL be read by Phase 4 export. Storing wrong ranges here breaks export without any compile-time error.

| Filter | ffmpeg filter string | Store field | Range | Default | Unit |
|--------|---------------------|-------------|-------|---------|------|
| Blur | `boxblur=luma_radius={n}:luma_power=1` | `blur` | 0–10 (integer) | 0 | luma_radius pixels |
| Brightness | `eq=brightness={n}` | `brightness` | -1.0 to 1.0 (float) | 0.0 | additive |
| Contrast | `eq=contrast={n}` | `contrast` | 0.0 to 2.0 (float) | 1.0 | multiplicative |
| Saturation | `eq=saturation={n}` | `saturation` | 0.0 to 3.0 (float) | 1.0 | multiplicative |
| Crop | `crop={w}:{h}:{x}:{y}` | `crop.{x,y,width,height}` | pixel integers | source dims | pixels |
| Resize | `scale={w}:{h}` | `resize.{width,height}` | pixel integers | source dims | pixels |

**Blur range rationale (MEDIUM confidence):** `boxblur` luma_radius of 0 = no blur; values above 10 produce extreme blur rarely needed in a video editor UI. This is a UX choice — Phase 4 will pass the value directly as `luma_radius`. When `blur === 0`, Phase 4 should skip the boxblur filter entirely.

**Contrast range rationale:** The full ffmpeg eq contrast range is -1000 to 1000, but practical UI values are 0–2. Values below 0 produce photographic negative effects; values above 3 are rarely useful. Restricting to 0–2 covers all practical use cases.

**"No-op" detection rules for Phase 4 (store these in CONTEXT for Phase 4):**
- Skip blur filter: `blur === 0`
- Skip eq filter: `brightness === 0 && contrast === 1.0 && saturation === 1.0`
- Skip crop filter: `crop === null || (crop.x === 0 && crop.y === 0 && crop.width === sourceWidth && crop.height === sourceHeight)`
- Skip scale filter: `resize === null || (resize.width === sourceWidth && resize.height === sourceHeight)`

---

## Common Pitfalls

### Pitfall 1: Writing Defaults to Store on Mount Creates Ghost Undo Entries

**What goes wrong:** If `ClipSettingsPanel` calls `updateClipSettings(clipId, defaultValues)` when a clip is first selected, selecting a clip creates an undo history entry. User presses Cmd+Z expecting to undo a clip move, but instead "undoes" the settings default-write.

**Why it happens:** Zundo captures every `set()` that touches `TrackedState`. Default-writing on mount is an invisible mutation.

**How to avoid:** Display defaults from constants in the component when `clipSettings[clipId]` is undefined. Only call `updateClipSettings` on actual user interaction (slider change, input change). On first interaction, the store entry is created with all current displayed values, not just the changed field.

**Warning signs:** Pressing Cmd+Z after selecting a clip navigates settings back to undefined.

### Pitfall 2: Crop/Resize Source Dimensions Not Available

**What goes wrong:** The crop default is "source video width × source video height," but `Clip.sourceWidth` and `Clip.sourceHeight` do not exist on the current `Clip` type. The existing `Clip` type has only `sourceDuration`.

**Why it happens:** Phase 2 never needed pixel dimensions — thumbnails were extracted but dimensions were not stored.

**How to avoid:** Two options: (a) add `sourceWidth: number` and `sourceHeight: number` to the `Clip` interface in Phase 3 and populate during `addClip` (requires reading video metadata on import), or (b) use `null` as the crop/resize default and render empty inputs, letting the user enter the values manually. Option (b) matches the `crop: null` and `resize: null` spec from CONTEXT.md and avoids scope creep.

**Decision per CONTEXT.md:** `crop: null` means "no crop set yet — populate with source dims on first edit." This implies the dimensions must be obtainable. See Open Questions.

**Warning signs:** Crop/resize inputs show 0×0 instead of source dimensions.

### Pitfall 3: Aspect Ratio Lock Using Stored Dimensions Instead of Source Dimensions

**What goes wrong:** User sets resize to 1280×720 (from 1920×1080 source). Then changes width to 960. Lock calculates height as `960 / (1280/720) = 540` instead of `960 / (1920/1080) = 540` — happens to be the same here but differs for non-standard stored values.

**Why it happens:** Using current stored resize values as the ratio reference instead of source video dimensions.

**How to avoid:** Always compute aspect ratio from source dimensions: `sourceWidth / sourceHeight`.

### Pitfall 4: Number Input onChange Fires String Not Number

**What goes wrong:** `<input type="number" onChange={e => updateClipSettings(id, { blur: e.target.value })}` stores a string `"5"` instead of number `5`. The ffmpeg filter call in Phase 4 breaks.

**How to avoid:** Always parse: `parseInt(e.target.value, 10)` for integers (blur, crop, resize), `parseFloat(e.target.value)` for floats (brightness, contrast, saturation). Guard against `NaN`.

### Pitfall 5: Slider onChange Fires on Every Frame During Drag — Performance

**What goes wrong:** Dragging a blur slider from 0 to 10 fires ~100 `updateClipSettings` calls, creating 100 Zundo history entries. Cmd+Z requires 100 presses to undo one drag.

**Why it happens:** `onChange` on `<input type="range">` fires continuously during drag.

**How to avoid:** Use `onMouseUp` / `onPointerUp` + `onTouchEnd` to commit the final value to the store, and use local React state (`useState`) only for the slider's display value during drag. This is the one legitimate use of local state: tracking in-progress drag display value that has not yet been committed.

**Alternative (simpler):** Set Zundo's `equality` option to deduplicate rapid same-field updates. But the onPointerUp pattern is the established approach in video editor UIs and requires no Zundo configuration changes.

**Warning signs:** Cmd+Z after one slider drag requires multiple presses.

---

## Code Examples

### updateClipSettings Action (full implementation)

```typescript
// src/store/types.ts additions
export interface ClipSettings {
  clipId: string
  blur: number           // 0–10; maps to boxblur luma_radius
  brightness: number     // -1.0–1.0; maps to eq:brightness
  contrast: number       // 0.0–2.0; maps to eq:contrast (default 1.0)
  saturation: number     // 0.0–3.0; maps to eq:saturation (default 1.0)
  crop: { x: number; y: number; width: number; height: number } | null
  resize: { width: number; height: number } | null
}

// Add to StoreActions:
updateClipSettings: (clipId: string, patch: Partial<Omit<ClipSettings, 'clipId'>>) => void
```

```typescript
// src/store/index.ts — new action
updateClipSettings: (clipId, patch) => {
  set((state) => {
    const existing = state.clipSettings[clipId] ?? { clipId }
    return {
      clipSettings: {
        ...state.clipSettings,
        [clipId]: { ...existing, ...patch },
      },
    }
  })
},
```

### ClipSettingsPanel Component Structure

```typescript
// src/components/ClipSettingsPanel.tsx
export function ClipSettingsPanel() {
  const selectedClipId = useStore((s) => s.ui.selectedClipId)
  const clip = useStore((s) => selectedClipId ? s.clips[selectedClipId] : undefined)
  const settings = useStore((s) => selectedClipId ? s.clipSettings[selectedClipId] : undefined)
  const updateClipSettings = useStore((s) => s.updateClipSettings)

  // Display defaults when settings not yet written to store
  const blur = settings?.blur ?? 0
  const brightness = settings?.brightness ?? 0
  const contrast = settings?.contrast ?? 1
  const saturation = settings?.saturation ?? 1

  if (!selectedClipId || !clip) {
    return (
      <div className="flex-none w-60 bg-zinc-900 border-l border-zinc-800 flex items-center justify-center p-4">
        <p className="text-zinc-500 text-sm text-center">Select a clip to edit its settings</p>
      </div>
    )
  }

  return (
    <div className="flex-none w-60 bg-zinc-900 border-l border-zinc-800 flex flex-col overflow-y-auto">
      {/* Header: truncated filename */}
      {/* Filter sliders section */}
      {/* Crop inputs section */}
      {/* Resize inputs section */}
    </div>
  )
}
```

### Slider with Commit-on-Release Pattern

```typescript
// Local state for display only during drag
const [localBlur, setLocalBlur] = useState<number | null>(null)
const displayBlur = localBlur ?? blur

return (
  <input
    type="range"
    min={0}
    max={10}
    step={1}
    value={displayBlur}
    onChange={(e) => setLocalBlur(parseInt(e.target.value, 10))}
    onPointerUp={(e) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10)
      updateClipSettings(selectedClipId, { blur: val })
      setLocalBlur(null)
    }}
  />
)
```

### Aspect Ratio Lock Calculation

```typescript
// sourceAspectRatio derived from clip source dimensions (see Open Questions)
const handleResizeWidth = (newWidth: number) => {
  if (aspectLocked && sourceAspectRatio) {
    const newHeight = Math.round(newWidth / sourceAspectRatio)
    updateClipSettings(clipId, { resize: { width: newWidth, height: newHeight } })
  } else {
    updateClipSettings(clipId, { resize: { ...currentResize, width: newWidth } })
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Dedicated form library (react-hook-form) for settings panels | Native HTML inputs + Zustand store | Common pattern since 2023 | No form library needed; store is the form state |
| Slider libraries (rc-slider, etc.) | Native `<input type="range">` | Modern browsers, ~2020+ | No dependency; Tailwind can style the track |

**Deprecated/outdated:**
- `<input type="range">` styling with pseudo-elements (`-webkit-slider-thumb`) — still works but Tailwind's `accent-color` utility provides simpler cross-browser slider thumb coloring.

---

## Open Questions

1. **Source video pixel dimensions (width × height) are not on the `Clip` type**
   - What we know: `Clip.sourceDuration` exists. `thumbnailUrls` are extracted via ffmpeg. The source `File` object is stored in `Clip.sourceFile`.
   - What's unclear: Where do we get source pixel dimensions for crop/resize defaults and aspect ratio lock? Options: (a) read from `<video>` element metadata during import (`videoWidth` / `videoHeight`), (b) extract via ffmpeg during thumbnail extraction (already runs per clip), or (c) leave crop/resize defaults as empty and let user enter values.
   - Recommendation: Add `sourceWidth: number` and `sourceHeight: number` to the `Clip` interface. During `addClip` (or the import hook), read `videoWidth`/`videoHeight` from a temporary `<video>` element by setting its `src` to `URL.createObjectURL(file)`. This is synchronous after `loadedmetadata` event. This is the cleanest solution and requires no ffmpeg changes. Planner should include a task for this within the store plan.

2. **Slider thumb styling in Tailwind v4**
   - What we know: Tailwind v4 (`^4.2.1`) is installed. Slider pseudo-element APIs changed between Tailwind v3 and v4.
   - What's unclear: Whether `accent-color` utility is available in Tailwind v4 or if explicit pseudo-element CSS is needed.
   - Recommendation: Use inline `style={{ accentColor: '#3b82f6' }}` (blue-500) on range inputs as a safe cross-version fallback. No Tailwind class dependency needed for basic styling.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.x |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test -- --reporter=verbose` |
| Full suite command | `npm test` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CLIP-01 | `updateClipSettings(id, { blur: 5 })` stores blur:5; undo restores blur:0 | unit (store) | `npm test -- src/store/store.test.ts` | ✅ (extend existing) |
| CLIP-02 | `updateClipSettings(id, { brightness: 0.5 })` stores value | unit (store) | `npm test -- src/store/store.test.ts` | ✅ |
| CLIP-03 | `updateClipSettings(id, { contrast: 1.5 })` stores value | unit (store) | `npm test -- src/store/store.test.ts` | ✅ |
| CLIP-04 | `updateClipSettings(id, { saturation: 2.0 })` stores value | unit (store) | `npm test -- src/store/store.test.ts` | ✅ |
| CLIP-05 | `updateClipSettings(id, { crop: {x:0,y:0,width:640,height:480} })` stores crop; undo restores null | unit (store) | `npm test -- src/store/store.test.ts` | ✅ |
| CLIP-06 | `updateClipSettings(id, { resize: {width:1280,height:720} })` stores resize; undo restores null | unit (store) | `npm test -- src/store/store.test.ts` | ✅ |
| CLIP-01–06 | `ClipSettingsPanel` renders "Select a clip" when no clip selected | component (happy-dom) | `npm test -- src/components/ClipSettingsPanel.test.tsx` | ❌ Wave 0 |
| CLIP-01–06 | `ClipSettingsPanel` renders controls when clip selected | component (happy-dom) | `npm test -- src/components/ClipSettingsPanel.test.tsx` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- src/store/store.test.ts` (store plan) or `npm test -- src/components/ClipSettingsPanel.test.tsx` (UI plan)
- **Per wave merge:** `npm test` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/components/ClipSettingsPanel.test.tsx` — covers component render tests for CLIP-01 through CLIP-06
- [ ] `src/store/store.test.ts` already exists — extend with `updateClipSettings` tests (no new file needed)

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `src/store/types.ts`, `src/store/index.ts`, `src/components/AppShell.tsx`, `src/components/ToolSidebar.tsx` — verified current state
- Direct code inspection: `vitest.config.ts`, `package.json` — confirmed test framework and installed packages
- `03-CONTEXT.md` — locked decisions from user discussion

### Secondary (MEDIUM confidence)
- [FFmpeg eq filter docs (7.1.1)](https://ayosec.github.io/ffmpeg-filters-docs/7.1/Filters/Video/eq.html) — brightness -1.0–1.0, contrast -1000–1000, saturation 0–3.0 (WebSearch verified against multiple sources)
- [FFmpeg boxblur — OTTVerse](https://ottverse.com/blur-a-video-using-ffmpeg-boxblur/) — luma_radius parameter, default 2 (WebSearch)
- [FFmpeg boxblur — DEV Community](https://dev.to/sparklesix/how-to-blur-a-video-using-ffmpegs-boxblur-filter-2m0j) — luma_radius practical range

### Tertiary (LOW confidence)
- Tailwind v4 `accent-color` utility availability — not independently verified against Tailwind v4 changelog; recommend inline style fallback

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already installed, verified via package.json
- Store action pattern: HIGH — derived directly from existing index.ts and types.ts
- ffmpeg filter ranges: MEDIUM — verified via multiple WebSearch sources; official FFmpeg docs not directly queried via Context7 (not a JS library)
- Architecture/layout: HIGH — derived directly from existing AppShell.tsx and ToolSidebar.tsx
- Pitfalls: HIGH for slider commit pattern and partialize pitfall (established React/Zundo patterns); MEDIUM for source dimensions issue (analysis of existing type gap)

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable domain — no fast-moving dependencies)
