# Phase 11: Clip Settings UI + Polish - Research

**Researched:** 2026-03-20
**Domain:** React component UI — ClipSettingsPanel controls + layout polish
**Confidence:** HIGH

## Summary

Phase 11 is a pure UI delivery phase. The store foundation is complete: `ClipSettings` in `src/store/types.ts` already has `speed`, `rotation`, `volume`, `hue`, `flipH`, `flipV` fields (typed with literal union for speed/rotation). The `bulkUpdateClipSettings` action already handles fan-out for all `Partial<ClipSettings>` fields, so new controls require zero store changes.

The work is concentrated in exactly two files: `src/components/ClipSettingsPanel.tsx` (add PLAYBACK and TRANSFORM sections, widen to `w-70`, add audio clip guard) and `src/components/AppShell.tsx` (change timeline height from `37vh` to `28vh`). No new components, no new files, no new packages. All UI primitives — segmented button rows, toggle buttons, sliders — are built inline in `ClipSettingsPanel.tsx` using the patterns already established in the codebase.

The `11-UI-SPEC.md` is the authoritative visual contract for this phase. It specifies exact Tailwind class strings, color values, copy strings, section order, and interaction timing (immediate vs commit-on-release). The planner must treat UI-SPEC as the source of truth for visual decisions.

**Primary recommendation:** Implement in two tasks: (1) add PLAYBACK + TRANSFORM sections to ClipSettingsPanel including audio guard and width change, (2) change AppShell timeline height. Update the existing ClipSettingsPanel test file to cover new controls.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Speed** (CLIP-01): 5-button segmented row — `[ 0.25× ][ 0.5× ][ 1× ][ 2× ][ 4× ]`. Active preset highlighted. One row within the Playback section.
- **Rotation** (CLIP-02): 4-button row — `[ 0° ][ 90° ][ 180° ][ 270° ]`. Active preset highlighted. Lives in Transform section.
- **Volume** (CLIP-03): Commit-on-release range slider, 0–200, step 5. Display shows "100%" style. Same pattern as blur/brightness sliders.
- **Hue** (CLIP-04): Commit-on-release range slider, -180 to +180, step 1. Display shows degrees (e.g. "0°"). Lives in Transform section.
- **Flip H/V** (CLIP-05): Two icon-style toggle buttons side-by-side — `[ ⇔ H ][ ⇕ V ]`. Each is a stateful toggle; active state visually distinct. Lives in Transform section.
- Panel sections top-to-bottom: PLAYBACK (Speed, Volume), TRANSFORM (Rotation, Flip H/V, Hue), FILTERS (existing), CROP (existing), RESIZE (existing).
- All new controls bulk-apply to `selectedClipIds` when multiple clips are selected — same fan-out pattern as existing controls (`bulkUpdateClipSettings`).
- **Audio clips** (`clip.trackId === 'audio'`): show only PLAYBACK section. TRANSFORM, FILTERS, CROP, RESIZE sections hidden.
- Detection is by `clip.trackId`, not by file MIME type.
- Timeline height: reduce from `37vh` to `~28vh`.
- Settings sidebar: widen from `w-60` (240px) to `w-70` (280px).

### Claude's Discretion

- All other visual polish details: button border-radius, hover/active states, TopBar spacing, timeline track labels, color palette tweaks, overall spacing rhythm.

### Deferred Ideas (OUT OF SCOPE)

- None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CLIP-01 | User can set per-clip playback speed (0.25×/0.5×/1×/2×/4× presets) | Store field `speed: 0.25 | 0.5 | 1 | 2 | 4` exists. UI: 5-button segmented row, immediate commit on click. |
| CLIP-02 | User can set per-clip rotation (0°/90°/180°/270° presets) | Store field `rotation: 0 | 90 | 180 | 270` exists. UI: 4-button segmented row, immediate commit. |
| CLIP-03 | User can set per-clip volume (0–200%) | Store field `volume: number` exists (1.0 = 100%). UI: range slider 0–200, step 5, commit-on-release. Store receives value/100. |
| CLIP-04 | User can set per-clip hue shift | Store field `hue: number` exists. UI: range slider -180 to +180, step 1, commit-on-release. |
| CLIP-05 | User can flip a clip horizontally or vertically | Store fields `flipH: boolean`, `flipV: boolean` exist. UI: two toggle buttons with Lucide FlipHorizontal/FlipVertical icons. |
| UI-01 | User sees a focused iMovie-style UI polish (preview panel layout, sidebar, timeline appearance, buttons) | AppShell timeline `37vh` → `28vh`. ClipSettingsPanel `w-60` → `w-70`. Both empty-state and populated render paths need the width update. |
</phase_requirements>

## Standard Stack

### Core (already in project — no new packages)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 19 + TypeScript | 19 / 5.x | Component rendering | Project lock |
| TailwindCSS v4 | 4.x | Utility classes | Project lock |
| lucide-react | 0.577.0 | Icons (`FlipHorizontal`, `FlipVertical`, existing `Lock`, `Unlock`) | Project lock |
| Zustand + Zundo | existing | State read/write via `useStore` | Project lock |

**No new packages required.** `FlipHorizontal` and `FlipVertical` are confirmed present in lucide-react 0.577.0 (verified via `node -e`).

**Installation:** none needed.

## Architecture Patterns

### Relevant Project Structure
```
src/
├── components/
│   ├── ClipSettingsPanel.tsx   # PRIMARY CHANGE — add PLAYBACK + TRANSFORM sections
│   ├── ClipSettingsPanel.test.tsx  # Must be extended with new control tests
│   └── AppShell.tsx            # SECONDARY CHANGE — timeline height only
├── store/
│   ├── types.ts                # ClipSettings interface — READ ONLY, no changes
│   └── index.ts                # bulkUpdateClipSettings action — READ ONLY, no changes
```

### Pattern 1: Commit-on-Release Slider
**What:** Local state tracks drag value; store commits only on pointer/touch release.
**When to use:** Volume slider, Hue slider (continuous numeric values).
**Example (from existing ClipSettingsPanel.tsx):**
```typescript
const [localBlur, setLocalBlur] = useState<number | null>(null)
const blurDisplay = localBlur ?? settings?.blur ?? 0

<input
  type="range"
  value={blurDisplay}
  onChange={(e) => setLocalBlur(parseInt(e.target.value, 10))}
  onPointerUp={(e) => commitBlur((e.target as HTMLInputElement).value)}
  onTouchEnd={(e) => commitBlur((e.target as HTMLInputElement).value)}
  style={{ accentColor: '#3b82f6' }}
/>
```
New sliders (Volume, Hue) must use `useState<number | null>` + `onPointerUp`/`onTouchEnd` — same pattern.

### Pattern 2: Immediate Commit on Click (Segmented Buttons)
**What:** No local state. Click directly calls commit function.
**When to use:** Speed buttons, Rotation buttons, Flip H, Flip V (discrete presets).
**Example (to build):**
```typescript
// Segmented button row — no local state needed
function commitSpeed(value: 0.25 | 0.5 | 1 | 2 | 4) {
  if (selectedClipIds.length > 1) {
    bulkUpdateClipSettings(selectedClipIds, { speed: value })
  } else {
    updateClipSettings(clipId, { speed: value })
  }
}

<div className="flex rounded overflow-hidden border border-zinc-700">
  {([0.25, 0.5, 1, 2, 4] as const).map((v) => (
    <button
      key={v}
      onClick={() => commitSpeed(v)}
      className={`flex-1 text-xs py-1.5 font-normal transition-colors ${
        currentSpeed === v
          ? 'bg-blue-600 text-white'
          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
      }`}
    >
      {v}×
    </button>
  ))}
</div>
```

### Pattern 3: Bulk-Apply Fan-Out
**What:** Check `selectedClipIds.length > 1`; if true call `bulkUpdateClipSettings`, else call `updateClipSettings`.
**When to use:** Every commit handler for every control.
**Source:** Established in Phases 9+. `bulkUpdateClipSettings` covers all `Partial<ClipSettings>` fields automatically.

### Pattern 4: Audio Clip Guard
**What:** Conditional section rendering based on `clip.trackId`.
**When to use:** TRANSFORM, FILTERS, CROP, RESIZE sections — hide for audio clips.
```typescript
const isAudio = clip.trackId === 'audio'

{/* TRANSFORM section */}
{!isAudio && (
  <> ... </>
)}
```

### Pattern 5: Section Header
**What:** Consistent label style for panel sections.
**Exact class string (copy verbatim):**
```
text-xs font-semibold text-zinc-400 uppercase tracking-wide
```
Used for existing FILTERS/CROP/RESIZE and new PLAYBACK/TRANSFORM headers.

### Anti-Patterns to Avoid
- **Adding local state for button groups:** Speed, Rotation, Flip buttons commit immediately — no `useState` wrapper needed.
- **Detecting audio by MIME type:** Use `clip.trackId === 'audio'`, not `clip.sourceFile.type`.
- **Updating only one render path for width:** Both the empty-state `<div>` and the populated render path start with `flex-none w-60` — both must change to `w-70`.
- **Forgetting the Zundo partialize invariant:** No store field changes; `partialize` is already complete and covers all actions.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Flip icons | Custom SVG | `FlipHorizontal`, `FlipVertical` from lucide-react 0.577.0 | Already present, confirmed available |
| Aspect ratio toggle | Custom icon | `Lock`, `Unlock` from lucide-react | Already in use in the file |
| State management | Separate context/hook | Existing `useStore` + `bulkUpdateClipSettings` | Action already handles all `Partial<ClipSettings>` fields |

**Key insight:** The entire phase is UI surface over an already-complete store. There is no business logic to implement — only rendering and event wiring.

## Common Pitfalls

### Pitfall 1: Volume Store vs Display Mismatch
**What goes wrong:** `ClipSettings.volume` is stored as a float (e.g., `1.0` = 100%, `2.0` = 200%). The UI slider range is 0–200 (integer percent). If you read `settings?.volume ?? 1.0` directly as the slider value, the slider starts at 1 instead of 100.
**How to avoid:** Convert on read (`(settings?.volume ?? 1.0) * 100`) and on commit (`parsed / 100`). Display as `"${Math.round(displayVal)}%"`.
**Warning signs:** Slider initializes to far-left position on first render.

### Pitfall 2: Missing Width Change on Empty-State Path
**What goes wrong:** `ClipSettingsPanel` has two top-level `<div>` returns: the empty-state (`!selectedClipId || !clip`) and the populated panel. Both currently use `w-60`. If only one is updated to `w-70`, the panel jumps width when a clip is selected/deselected.
**How to avoid:** Grep for `w-60` in `ClipSettingsPanel.tsx` and replace all instances with `w-70`.
**Warning signs:** Sidebar width visually changes when selecting/deselecting a clip.

### Pitfall 3: Speed Type Literal
**What goes wrong:** `ClipSettings.speed` is typed as `0.25 | 0.5 | 1 | 2 | 4` (literal union). Passing a plain `number` from `parseFloat` will cause a TypeScript error.
**How to avoid:** Use `as const` array for the speed presets: `([0.25, 0.5, 1, 2, 4] as const).map(...)`. When committing, the callback receives the typed value directly.

### Pitfall 4: Local State Initialization for Hue Slider
**What goes wrong:** Hue default in store is `0`. `localHue ?? settings?.hue ?? 0` works — but only if `settings` is loaded. For a newly added clip with no `clipSettings` entry, `settings` is `undefined`, so `settings?.hue` is `undefined`, falling back to `0` correctly. No special handling needed beyond the existing pattern.

### Pitfall 5: Segmented Button Row `flex-1` Overflow
**What goes wrong:** On a 280px sidebar with 5 speed buttons (`flex-1` each), buttons are ~47px wide. Longer labels like `0.25×` may truncate or overflow.
**How to avoid:** Use `text-xs` (12px) for button labels as specified. `0.25×` is 5 chars at 12px — approximately 36px — comfortably within 47px.

### Pitfall 6: Rotation Segmented Row Width
**What goes wrong:** Rotation has 4 buttons with labels `0°`, `90°`, `180°`, `270°`. `270°` is the longest (4 chars) — at `flex-1` across 280px, each button is 70px. This fits `text-xs` comfortably.

## Code Examples

Verified patterns from existing source:

### Volume Commit Handler (new — follows existing blur pattern)
```typescript
const [localVolume, setLocalVolume] = useState<number | null>(null)
// Display: stored value is 0.0–2.0 float; UI is 0–200 integer
const volumeDisplay = localVolume ?? Math.round((settings?.volume ?? 1.0) * 100)

function commitVolume(value: string) {
  const parsed = parseInt(value, 10)
  if (isNaN(parsed)) return
  const storeVal = parsed / 100  // Convert percent back to float
  if (selectedClipIds.length > 1) {
    bulkUpdateClipSettings(selectedClipIds, { volume: storeVal })
  } else {
    updateClipSettings(clipId, { volume: storeVal })
  }
  setLocalVolume(null)
}
```

### Hue Commit Handler
```typescript
const [localHue, setLocalHue] = useState<number | null>(null)
const hueDisplay = localHue ?? (settings?.hue ?? 0)

function commitHue(value: string) {
  const parsed = parseInt(value, 10)
  if (isNaN(parsed)) return
  if (selectedClipIds.length > 1) {
    bulkUpdateClipSettings(selectedClipIds, { hue: parsed })
  } else {
    updateClipSettings(clipId, { hue: parsed })
  }
  setLocalHue(null)
}
```

### Flip Toggle Handler
```typescript
function commitFlip(field: 'flipH' | 'flipV', current: boolean) {
  const next = !current
  if (selectedClipIds.length > 1) {
    bulkUpdateClipSettings(selectedClipIds, { [field]: next })
  } else {
    updateClipSettings(clipId, { [field]: next })
  }
}

// Render
<div className="flex gap-2">
  <button
    onClick={() => commitFlip('flipH', settings?.flipH ?? false)}
    className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs font-normal transition-colors ${
      (settings?.flipH ?? false) ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
    }`}
  >
    <FlipHorizontal size={14} />
    H
  </button>
  <button
    onClick={() => commitFlip('flipV', settings?.flipV ?? false)}
    className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs font-normal transition-colors ${
      (settings?.flipV ?? false) ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
    }`}
  >
    <FlipVertical size={14} />
    V
  </button>
</div>
```

### AppShell Timeline Height Change
```typescript
// Before:
style={{ height: '37vh' }}
// After:
style={{ height: '28vh' }}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ClipSettingsPanel w-60 (240px) | w-70 (280px) | Phase 11 | Segmented button rows have breathing room |
| Timeline 37vh | 28vh | Phase 11 | Preview panel gains ~9vh — more center-stage feel |
| No PLAYBACK/TRANSFORM sections | Add both sections | Phase 11 | CLIP-01–05 become user-observable |

**Deprecated/outdated:**
- None — no APIs deprecated in this phase.

## Open Questions

1. **Volume slider step granularity**
   - What we know: CONTEXT.md specifies step 5 (0%, 5%, 10%, ... 200%)
   - What's unclear: Nothing — fully specified
   - Recommendation: Use step={5}

2. **Hue slider step granularity**
   - What we know: CONTEXT.md specifies step 1 (every integer degree)
   - What's unclear: Nothing — fully specified
   - Recommendation: Use step={1}

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + @testing-library/react + happy-dom |
| Config file | `vite.config.ts` (vitest inline) |
| Quick run command | `npm run test -- --run src/components/ClipSettingsPanel.test.tsx` |
| Full suite command | `npm run test -- --run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CLIP-01 | Speed buttons render and active preset highlights | unit | `npm run test -- --run src/components/ClipSettingsPanel.test.tsx` | ✅ (extend) |
| CLIP-02 | Rotation buttons render and active preset highlights | unit | `npm run test -- --run src/components/ClipSettingsPanel.test.tsx` | ✅ (extend) |
| CLIP-03 | Volume slider renders with correct display value | unit | `npm run test -- --run src/components/ClipSettingsPanel.test.tsx` | ✅ (extend) |
| CLIP-04 | Hue slider renders with correct range | unit | `npm run test -- --run src/components/ClipSettingsPanel.test.tsx` | ✅ (extend) |
| CLIP-05 | Flip H and Flip V buttons render and toggle | unit | `npm run test -- --run src/components/ClipSettingsPanel.test.tsx` | ✅ (extend) |
| UI-01 | Audio clip shows only PLAYBACK section | unit | `npm run test -- --run src/components/ClipSettingsPanel.test.tsx` | ✅ (extend) |

### Sampling Rate
- **Per task commit:** `npm run test -- --run src/components/ClipSettingsPanel.test.tsx`
- **Per wave merge:** `npm run test -- --run`
- **Phase gate:** Full suite green (currently 224 tests, all passing) before `/gsd:verify-work`

### Wave 0 Gaps
- None — existing test infrastructure covers the file. New test cases must be added to `src/components/ClipSettingsPanel.test.tsx` as part of implementation tasks (not a separate Wave 0 setup).

## Sources

### Primary (HIGH confidence)
- Codebase: `src/components/ClipSettingsPanel.tsx` — existing slider pattern, commit handlers, bulk-apply fan-out, section header classes
- Codebase: `src/store/types.ts` — `ClipSettings` interface, all new fields confirmed present
- Codebase: `src/store/index.ts` — `bulkUpdateClipSettings` covers all `Partial<ClipSettings>`; `partialize` confirmed correct
- Codebase: `src/components/AppShell.tsx` — timeline height target line confirmed
- `.planning/phases/11-clip-settings-ui-polish/11-UI-SPEC.md` — visual contract: class strings, colors, copy, section order
- `.planning/phases/11-clip-settings-ui-polish/11-CONTEXT.md` — locked decisions

### Secondary (MEDIUM confidence)
- `node -e` runtime check: `FlipHorizontal` and `FlipVertical` confirmed as objects in lucide-react 0.577.0

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed in package.json and node_modules
- Architecture: HIGH — all patterns verified by reading actual source files
- Pitfalls: HIGH — volume unit mismatch, double width fix, type literal pitfalls are all code-verified
- Test infrastructure: HIGH — ran full suite, 224 tests pass, framework confirmed

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (stable domain — React component additions, no external API dependencies)
