# Phase 8: Timeline Zoom - Research

**Researched:** 2026-03-18
**Domain:** React timeline zoom — `@xzdarcy/react-timeline-editor` scaleWidth prop, wheel event cursor-anchored zoom, Zustand UiState action
**Confidence:** HIGH

## Summary

Phase 8 is a self-contained UI feature with zero ambiguity: the `pixelsPerSecond` field is already in `UiState`, the `<Timeline>` component accepts `scaleWidth` directly, and the ref-based `setScrollLeft` method is available for cursor-anchored scroll positioning. All decisions are locked in CONTEXT.md with precise formulas.

The only implementation subtlety is the scroll-anchor math: the timeline library places a `startLeft=20` offset before time=0, so the correct cursor-time formula must include that offset. The `TimelineState` ref (forwarded by `<Timeline>`) exposes `setScrollLeft(val)` which calls `setState({ scrollLeft: Math.max(val, 0) })` on the internal react-virtualized scroller — this is the correct API for programmatic scroll repositioning after a zoom.

No new external dependencies are required. The entire phase is three coordinated changes: add `setPixelsPerSecond` to the store, wire `scaleWidth` in `TimelinePanel`, and add a header strip with zoom buttons + wheel handler.

**Primary recommendation:** Wire `scaleWidth={pixelsPerSecond}` + `scale={1}` into the existing `<Timeline>` call, expose a `setPixelsPerSecond` store action, add a header strip above the timeline, and attach a `onWheel` handler to the wrapper div.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Button placement**
- Zoom controls live in a **timeline header strip** rendered above the track rows (not in TopBar)
- Strip is right-aligned: `[ − ]  [ + ]  [ ⊡ ]`
- Reset button is icon-only (fit/zoom-to-fit icon) with a tooltip on hover
- Same zinc-800 / hover:zinc-700 button style as the existing TopBar buttons

**Zoom range & step**
- Range: **50–400 px/s**, hard-clamped at both ends
- Default: 100 px/s (existing `UiState` default — unchanged)
- Each **+** click: multiply by **1.25** (clamped to 400)
- Each **−** click: multiply by **0.8** (clamped to 50)
- Modifier+scroll uses the same 1.25×/0.8× multiplier per scroll tick

**Scroll zoom behavior**
- Modifier: **Cmd/Ctrl** (`metaKey || ctrlKey`)
- Scroll event is on the timeline container element (wheel event listener)
- Anchor: **cursor position** — the timeline shifts so the time under the cursor stays fixed in the viewport
  - Compute `cursorTime = (cursorX - timelineLeft + scrollLeft) / oldPixelsPerSecond`
  - After updating `pixelsPerSecond`, set `scrollLeft` so `cursorTime` maps back to the same `cursorX`
- Prevent default on the wheel event when modifier is held (avoids browser zoom)

**Reset-to-fit**
- Fit calculation: `pixelsPerSecond = (containerWidth × 0.9) / totalDuration`
  - `totalDuration` = max `endTime` across all clips; if zero (no clips) → snap to default 100 px/s
- Result is clamped to [50, 400] range
- Reading `containerWidth` via a `ref` on the timeline container element (same ref used for scroll anchor)

### Claude's Discretion
- Exact icon/symbol used for the fit button (⊡, ↔, or a custom SVG)
- Whether the wheel listener goes on the Timeline component's wrapper div or a dedicated overlay
- Debounce/throttle strategy for rapid scroll events

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ZOOM-01 | User can zoom the timeline in/out via +/- buttons | Store action `setPixelsPerSecond` + header strip buttons + `scaleWidth` prop wiring |
| ZOOM-02 | User can zoom the timeline via modifier+scroll over the timeline | `onWheel` handler on wrapper div + `timelineRef.current.setScrollLeft()` for scroll anchor |
| ZOOM-03 | User can reset zoom to fit the full timeline on screen | Fit calculation using container `ref.current.offsetWidth` + max clip `endTime` across store |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@xzdarcy/react-timeline-editor` | 1.0.0 | Timeline component; `scaleWidth` prop controls px per scale unit | Already installed; `scaleWidth` is the documented zoom knob |
| `zustand` | ^5.0.12 | State management; `setPixelsPerSecond` action goes here | Already the project state layer |
| React `useRef` | (built-in) | `containerRef` for width + `timelineRef` for `setScrollLeft` | Zero deps, React idiom |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zundo` | ^2.3.0 | Temporal undo — `pixelsPerSecond` already excluded from history via `partialize` | No changes needed; zoom does not pollute undo stack |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Component Structure

```
TimelinePanel/
  ├── <div ref={containerRef} onWheel={handleWheel}>   // wrapper — width reading + scroll events
  │     ├── <div class="timeline-header-strip">        // right-aligned zoom buttons
  │     │     ├── <button>−</button>
  │     │     ├── <button>+</button>
  │     │     └── <button title="Fit to screen">⊡</button>
  │     └── <Timeline ref={timelineRef}
  │               scaleWidth={pixelsPerSecond}
  │               scale={1}
  │               ... />
  └── </div>
```

### Pattern 1: scaleWidth as px/s with scale=1

**What:** The Timeline component maps time→pixels as `px = startLeft + (time / scale) * scaleWidth`. With `scale=1`, this becomes `px = startLeft + time * scaleWidth`, making `scaleWidth` directly equal to pixels per second.

**Source (verified from dist/index.es.js:5981-5988):**
```typescript
// Time-to-pixel (library internals):
// pixel = startLeft + (time / scale) * scaleWidth
// With scale=1: pixel = startLeft + time * scaleWidth

// Default startLeft = 20 (DEFAULT_START_LEFT constant)
const START_LEFT = 20

// Usage:
<Timeline
  scaleWidth={pixelsPerSecond}   // pixels per second
  scale={1}                       // time unit = 1 second
  editorData={editorData}
  effects={effects}
  // ... other existing props
/>
```

**When to use:** Always in this phase. `scale=1` is the correct pairing with `pixelsPerSecond`.

### Pattern 2: Store action — setPixelsPerSecond

**What:** Follows the established `set({ ui: { ...state.ui, field: value } })` spread pattern used by `selectClip` and `setActiveTool`. `ui` is excluded from Zundo history by `partialize`, so zoom changes correctly do not appear in undo stack.

```typescript
// In store/types.ts — add to StoreActions:
setPixelsPerSecond: (pps: number) => void

// In store/index.ts — add action (inside temporal callback):
setPixelsPerSecond: (pps) => {
  const state = get()
  const clamped = Math.min(400, Math.max(50, pps))
  set({ ui: { ...state.ui, pixelsPerSecond: clamped } })
},

// Partialize destructure must be updated to exclude the new action:
const { ui, export: _export, addClip, ..., setPixelsPerSecond, ...tracked } = state
```

### Pattern 3: Cursor-anchored scroll zoom

**What:** When zooming via scroll wheel, the pixel position under the cursor must map to the same time before and after zoom.

**Key formula** (accounting for `startLeft=20`):
```typescript
const START_LEFT = 20  // DEFAULT_START_LEFT from library constants

function handleWheel(e: React.WheelEvent<HTMLDivElement>) {
  if (!e.metaKey && !e.ctrlKey) return
  e.preventDefault()

  const container = containerRef.current
  const tlRef = timelineRef.current
  if (!container || !tlRef) return

  const rect = container.getBoundingClientRect()
  const cursorX = e.clientX - rect.left          // cursor x relative to container

  // Current scroll position — tracked in local state via onScroll callback
  const currentScrollLeft = scrollLeftRef.current

  // Time under cursor BEFORE zoom
  const oldPps = pixelsPerSecond
  const cursorTime = (cursorX + currentScrollLeft - START_LEFT) / oldPps

  // Apply zoom
  const factor = e.deltaY < 0 ? 1.25 : 0.8
  const newPps = Math.min(400, Math.max(50, oldPps * factor))
  setPixelsPerSecond(newPps)

  // New scrollLeft so cursorTime stays under cursorX
  const newScrollLeft = cursorTime * newPps + START_LEFT - cursorX
  tlRef.setScrollLeft(Math.max(0, newScrollLeft))
}
```

**Tracking scrollLeft:** The `<Timeline>` component exposes `onScroll` callback with `{ scrollLeft, scrollTop }`. Use a `useRef<number>` to track the current scroll position without triggering re-renders:
```typescript
const scrollLeftRef = useRef(0)
// ...
<Timeline
  onScroll={({ scrollLeft }) => { scrollLeftRef.current = scrollLeft }}
  // ...
/>
```

### Pattern 4: Reset-to-fit

```typescript
function handleFit() {
  const container = containerRef.current
  if (!container) return

  const containerWidth = container.offsetWidth
  const allClips = Object.values(clips)
  const totalDuration = allClips.length > 0
    ? Math.max(...allClips.map(c => c.endTime))
    : 0

  if (totalDuration <= 0) {
    setPixelsPerSecond(100)
    return
  }

  const fitted = (containerWidth * 0.9) / totalDuration
  setPixelsPerSecond(fitted)  // store action clamps to [50, 400]
}
```

### Pattern 5: Header strip layout

```tsx
// Right-aligned strip above timeline — matches TopBar button style
const BUTTON_CLASS = "text-sm font-medium px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"

<div className="flex items-center justify-end gap-1 px-2 py-1 border-b border-zinc-800 flex-none">
  <button onClick={handleZoomOut} className={BUTTON_CLASS}>−</button>
  <button onClick={handleZoomIn} className={BUTTON_CLASS}>+</button>
  <button onClick={handleFit} className={BUTTON_CLASS} title="Fit to screen">⊡</button>
</div>
```

### Anti-Patterns to Avoid

- **Querying the DOM for scrollLeft:** Do not use `document.querySelector` or refs to the internal virtualized grid. Use the `onScroll` callback to track scroll position, and `timelineRef.current.setScrollLeft()` to write it.
- **Putting zoom in TopBar:** The context is explicit — zoom strip lives inside `TimelinePanel`, not `TopBar`.
- **Including `setPixelsPerSecond` in tracked state:** The `partialize` destructure must include the new action name, otherwise Zundo will try to track it and TypeScript will error.
- **Omitting `scale={1}` prop:** Without `scale={1}`, the library defaults to `DEFAULT_SCALE=1` anyway, but explicit is better and prevents drift if defaults change.
- **`e.preventDefault()` in passive listener:** React's synthetic `onWheel` is not passive by default in happy-dom tests, but in real browsers the wheel event may be registered as passive. Use `{ passive: false }` if attaching via `addEventListener` directly — or rely on the React `onWheel` prop which is non-passive.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Programmatic scroll position | Manual DOM scrollLeft mutation | `timelineRef.current.setScrollLeft(val)` | Library controls its internal react-virtualized state; direct DOM mutation will desync |
| Pixel↔time math | Custom formula | `pixel = START_LEFT + time * pixelsPerSecond` (verified from library source) | Library uses exactly this formula; any deviation causes visual desync |
| Zoom clamping | Inline `Math.min/max` scattered everywhere | Centralize in `setPixelsPerSecond` store action | Single source of truth; all callers (buttons, scroll, fit) get clamping automatically |

---

## Common Pitfalls

### Pitfall 1: startLeft offset missing from cursor-time formula

**What goes wrong:** Zoom appears to jump/stutter — the anchor point drifts slightly on each scroll tick.

**Why it happens:** The timeline content starts at `startLeft=20px` from the left edge. If the formula omits this offset, cursor-time is calculated incorrectly.

**How to avoid:** Always use `(cursorX + scrollLeft - START_LEFT) / pps` for time, and `time * pps + START_LEFT - cursorX` for the new scrollLeft.

**Warning signs:** Zoom test with cursor at time=0 shows non-zero displacement.

### Pitfall 2: Passive wheel event listener in browser

**What goes wrong:** `e.preventDefault()` in `onWheel` throws "Unable to preventDefault inside passive event listener" in Chrome/Safari when the page registers wheel listeners as passive.

**Why it happens:** Modern browsers default wheel listeners to passive for scroll performance.

**How to avoid:** Use the React `onWheel` prop (not `addEventListener`) — React's synthetic event is not passive. If using `addEventListener`, pass `{ passive: false }` explicitly.

**Warning signs:** Browser-level zoom still fires during Cmd+scroll.

### Pitfall 3: setPixelsPerSecond missing from partialize destructure

**What goes wrong:** TypeScript compile error in `store/index.ts`; or `tracked` accidentally contains the action, causing Zundo serialization warnings.

**Why it happens:** The `partialize` callback must destructure every action to exclude it from the tracked state.

**How to avoid:** When adding `setPixelsPerSecond` to `StoreActions`, also add it to the destructure in `partialize`.

### Pitfall 4: containerRef.offsetWidth returns 0 for fit calculation

**What goes wrong:** Reset-to-fit snaps to 50px/s (min clamp) when no width is read.

**Why it happens:** `offsetWidth` is 0 if the element is not yet mounted or has `display:none` or `visibility:hidden`.

**How to avoid:** The container is always visible when the user can click Fit. Add a guard: `if (containerWidth <= 0) return`.

---

## Code Examples

### setScrollLeft API (verified from dist/index.es.js:9357)

```typescript
// TimelineState.setScrollLeft is the correct programmatic scroll API:
setScrollLeft: (F) => {
  V.current && V.current.setState({ scrollLeft: Math.max(F, 0) });
}

// Usage via ref:
const timelineRef = useRef<TimelineState>(null)
// ...
timelineRef.current?.setScrollLeft(newScrollLeft)

// Ref attachment:
<Timeline ref={timelineRef} ... />
```

### Time↔pixel conversion (verified from dist/index.es.js:5981-5988)

```typescript
// Library source (minified, deobfuscated):
// timeToPixel: pixel = startLeft + (time / scale) * scaleWidth
// pixelToTime: time  = (pixel - startLeft) / scaleWidth * scale

// With scale=1 and scaleWidth=pixelsPerSecond:
const timeToPixel = (t: number, pps: number) => START_LEFT + t * pps
const pixelToTime = (px: number, pps: number) => (px - START_LEFT) / pps

const START_LEFT = 20  // DEFAULT_START_LEFT
```

### onScroll tracking pattern

```typescript
const scrollLeftRef = useRef(0)

<Timeline
  ref={timelineRef}
  onScroll={({ scrollLeft }) => { scrollLeftRef.current = scrollLeft }}
  // ...
/>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `scaleWidth` not wired (default 160) | `scaleWidth={pixelsPerSecond}` with `scale={1}` | Phase 8 | px/s zoom control enabled |
| No zoom actions in store | `setPixelsPerSecond` in `StoreActions` | Phase 8 | Centralized clamp, excluded from undo |

---

## Open Questions

1. **Debounce/throttle for rapid scroll**
   - What we know: The `setPixelsPerSecond` store write + `setScrollLeft` ref call happen synchronously on each wheel tick. React 19 batches state updates, so rapid scrolling will produce many render cycles.
   - What's unclear: Whether this causes perceptible lag on low-end hardware with long timelines.
   - Recommendation: Start without throttle (simplest). If jank is observed, add `requestAnimationFrame` gating — one RAF frame per scroll event. Do not use `debounce` (too much lag).

2. **Fit button icon**
   - What we know: CONTEXT.md marks this as Claude's Discretion.
   - What's unclear: Whether a Unicode symbol (⊡ U+22A1, ↔ U+2194) renders consistently across platforms or requires an SVG.
   - Recommendation: Use `↔` (U+2194) as a recognizable "fit width" symbol — universally available in system fonts. Wrap with `title="Fit to screen"` tooltip.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^3.2.0 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run src/store/store.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ZOOM-01 | `setPixelsPerSecond(125)` stores clamped value in `ui.pixelsPerSecond`; does NOT create undo history entry | unit | `npx vitest run src/store/store.test.ts -t "setPixelsPerSecond"` | ❌ Wave 0 |
| ZOOM-01 | `setPixelsPerSecond` clamps below 50 → 50, above 400 → 400 | unit | `npx vitest run src/store/store.test.ts -t "setPixelsPerSecond"` | ❌ Wave 0 |
| ZOOM-02 | Wheel handler with `metaKey=true` + `deltaY=-1` calls `setPixelsPerSecond` with `oldPps * 1.25` | unit | `npx vitest run src/components/TimelinePanel.test.tsx -t "wheel"` | ❌ Wave 0 |
| ZOOM-02 | Wheel handler without modifier key does NOT call `setPixelsPerSecond` | unit | `npx vitest run src/components/TimelinePanel.test.tsx -t "wheel"` | ❌ Wave 0 |
| ZOOM-03 | Fit handler sets `pixelsPerSecond = containerWidth * 0.9 / totalDuration` (clamped) | unit | `npx vitest run src/components/TimelinePanel.test.tsx -t "fit"` | ❌ Wave 0 |
| ZOOM-03 | Fit with no clips → snaps to 100 px/s | unit | `npx vitest run src/components/TimelinePanel.test.tsx -t "fit"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/store/store.test.ts src/components/TimelinePanel.test.tsx`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/store/store.test.ts` — add `setPixelsPerSecond` test cases (file exists; append tests)
- [ ] `src/components/TimelinePanel.test.tsx` — add wheel handler and fit button tests (file exists; append tests)

---

## Sources

### Primary (HIGH confidence)

- `node_modules/@xzdarcy/react-timeline-editor/dist/interface/timeline.d.ts` — Full `TimelineEditor` and `TimelineState` interface; confirmed `scaleWidth`, `scale`, `onScroll`, `setScrollLeft`
- `node_modules/@xzdarcy/react-timeline-editor/dist/interface/const.d.ts` — Confirmed `DEFAULT_START_LEFT = 20`, `DEFAULT_SCALE_WIDTH = 160`, `DEFAULT_SCALE = 1`
- `node_modules/@xzdarcy/react-timeline-editor/dist/index.es.js:5981-5988` — Verified `timeToPixel` and `pixelToTime` formulas: `pixel = startLeft + (time/scale)*scaleWidth`
- `node_modules/@xzdarcy/react-timeline-editor/dist/index.es.js:9357-9362` — Verified `setScrollLeft` implementation calls `setState({ scrollLeft: Math.max(val, 0) })`
- `src/store/types.ts` — Confirmed `UiState.pixelsPerSecond: number` exists with default 100
- `src/store/index.ts` — Confirmed `partialize` pattern; all `ui` actions use `set({ ui: { ...state.ui, field } })`
- `src/components/TimelinePanel.tsx` — Confirmed `<Timeline>` call site at line 69; no `scaleWidth`/`scale` yet
- `src/components/TopBar.tsx` — Confirmed button className: `"text-sm font-medium px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"`

### Secondary (MEDIUM confidence)
- `node_modules/@xzdarcy/react-timeline-editor/dist/components/timeline.d.ts` — Confirmed `Timeline` is `React.ForwardRefExoticComponent<TimelineEditor & React.RefAttributes<TimelineState>>`

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all APIs verified directly from library source and type declarations
- Architecture: HIGH — all patterns derived from verified library internals and existing codebase patterns
- Pitfalls: HIGH — pitfalls derived from verified implementation details (startLeft offset, passive events, partialize)
- Validation: HIGH — test framework and existing test files confirmed by filesystem scan

**Research date:** 2026-03-18
**Valid until:** 2026-06-18 (library is pinned at 1.0.0; no updates expected)
