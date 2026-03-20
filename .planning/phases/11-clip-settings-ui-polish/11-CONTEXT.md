# Phase 11: Clip Settings UI + Polish - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Add UI controls for the Phase 6 store fields (speed, rotation, volume, hue, flipH, flipV) to ClipSettingsPanel; ensure all settings bulk-apply to multi-selected clips; and polish the editor to an iMovie-style three-panel layout. No new store fields, no new export logic — this is the user-visible delivery of CLIP-01 through CLIP-05 and UI-01.

</domain>

<decisions>
## Implementation Decisions

### New controls — widgets

- **Speed** (CLIP-01): 5-button segmented row — `[ 0.25× ][ 0.5× ][ 1× ][ 2× ][ 4× ]`. Active preset highlighted. One row within the Playback section.
- **Rotation** (CLIP-02): 4-button row — `[ 0° ][ 90° ][ 180° ][ 270° ]`. Active preset highlighted. Lives in Transform section.
- **Volume** (CLIP-03): Commit-on-release range slider, 0–200, step 5. Display shows "100%" style. Same pattern as blur/brightness sliders.
- **Hue** (CLIP-04): Commit-on-release range slider, -180 to +180, step 1. Display shows degrees (e.g. "0°"). Lives in Transform section.
- **Flip H/V** (CLIP-05): Two icon-style toggle buttons side-by-side — `[ ⇔ H ][ ⇕ V ]`. Each is a stateful toggle; active state visually distinct. Lives in Transform section.

### New controls — section grouping and order

Panel sections top-to-bottom:
1. **PLAYBACK** — Speed segmented row, Volume slider
2. **TRANSFORM** — Rotation button row, Flip H/V buttons, Hue slider
3. **FILTERS** — Blur, Brightness, Contrast, Saturation (existing)
4. **CROP** — X/Y/W/H numeric inputs (existing)
5. **RESIZE** — Width/Height with aspect-lock (existing)

All new controls bulk-apply to `selectedClipIds` when multiple clips are selected — same fan-out pattern as existing controls (`bulkUpdateClipSettings`).

### Audio vs video clip visibility

- **Audio clips** (`clip.trackId === 'audio'`): show only PLAYBACK section (speed, volume). TRANSFORM, FILTERS, CROP, RESIZE sections are hidden.
- **Video clips**: show all sections.
- Detection is by `clip.trackId`, not by file MIME type.

### Layout proportions

- Timeline height: reduce from `37vh` to `~28vh`.
- Preview panel takes the remaining vertical space proportionally more — dominant, center-stage.
- Settings sidebar: widen from `w-60` (240px) to `w-70` (280px) to give segmented button rows breathing room.

### Claude's Discretion

- All other visual polish details: button border-radius, hover/active states, TopBar spacing, timeline track labels, color palette tweaks, overall spacing rhythm — Claude decides based on what looks clean and consistent.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Store
- `src/store/types.ts` — `ClipSettings` interface: `speed`, `rotation`, `volume`, `hue`, `flipH`, `flipV` fields (all already present from Phase 6). `UiState.selectedClipIds`, `StoreActions.bulkUpdateClipSettings`.
- `src/store/index.ts` — Verify `bulkUpdateClipSettings` covers the new fields; check Zundo `partialize` is unchanged.

### Settings panel
- `src/components/ClipSettingsPanel.tsx` — Existing sliders use commit-on-release pattern (`onPointerUp`/`onTouchEnd`); new controls must follow the same pattern. Existing bulk-apply fan-out in `commitBlur` etc. is the template for new controls. Panel currently `w-60` → change to `w-70`.

### Layout
- `src/components/AppShell.tsx` — Timeline height currently hardcoded `37vh` → change to `~28vh`. Sidebar width change cascades from `ClipSettingsPanel`.

### Requirements
- `.planning/REQUIREMENTS.md` — CLIP-01 through CLIP-05, UI-01. Note: CLIP-01–05 span Phase 6 (filter logic) and Phase 11 (UI); this phase is the delivery phase for user-observable behavior.
- `.planning/ROADMAP.md` § Phase 11 — success criteria (3 items).

No external specs — requirements fully captured in decisions above and ROADMAP.md § Phase 11 success criteria.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ClipSettingsPanel.tsx` commit-on-release slider pattern: `localState` + `onChange` sets local, `onPointerUp`/`onTouchEnd` commits to store. Speed/rotation/flip buttons do not need local state (immediate commit on click).
- `bulkUpdateClipSettings(ids, patch)` action: already handles the fan-out for all `Partial<ClipSettings>` fields — new fields are covered automatically.
- Segmented button row has no existing component — build inline in ClipSettingsPanel; no new file needed for now.

### Established Patterns
- Store action pattern for settings: `updateClipSettings(clipId, { field: value })` or `bulkUpdateClipSettings(selectedClipIds, { field: value })` based on `selectedClipIds.length > 1`.
- Section headers: `text-xs font-semibold text-zinc-400 uppercase tracking-wide` — reuse for PLAYBACK and TRANSFORM headers.
- Active/selected button style to introduce: `bg-blue-600 text-white` (active) vs `bg-zinc-800 text-zinc-300 hover:bg-zinc-700` (inactive) for segmented rows.

### Integration Points
- `ClipSettingsPanel.tsx` — Add PLAYBACK and TRANSFORM sections; add `clip.trackId` guard for audio clips.
- `AppShell.tsx` — Change timeline `style={{ height: '37vh' }}` to `'28vh'`.
- No changes needed to store, hooks, or other components.

</code_context>

<specifics>
## Specific Ideas

No specific "I want it like X" references — standard segmented button / slider patterns apply. Polish pass is at Claude's discretion.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 11-clip-settings-ui-polish*
*Context gathered: 2026-03-20*
