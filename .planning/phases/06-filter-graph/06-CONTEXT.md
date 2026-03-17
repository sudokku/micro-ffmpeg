# Phase 6: Filter Graph - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Extend `buildVfFilter` and the audio encode path so that the new per-clip settings (speed, rotation, volume, hue, flipH, flipV) are correctly encoded in the ffmpeg filter chain at export time. No UI changes — all controls come in Phase 11. Unit tests must cover all combinations per success criteria.

</domain>

<decisions>
## Implementation Decisions

### Volume scope
- Volume (CLIP-03, 0–200%) applies to **audio-track clips only**
- Applied as `-af volume=N` in the existing audio encode pass
- Video clips keep `-an` (audio stripped) — no new per-video-clip audio encode pass

### Speed & source window
- Timeline clip duration `D = endTime - startTime` represents **output duration**
- For speed ≠ 1: input `-t` must be `D × speed` (to feed enough source to the filters)
- `trimStart` (the `-ss` seek point) stays as-is — do not scale it by speed
- `setpts = 1/speed * PTS` goes in the vf chain (first filter, before all others)
- Audio speed uses `atempo` filter chain: 0.25× = `atempo=0.5,atempo=0.5`; 4× = `atempo=2.0,atempo=2.0`; 0.5× and 2× use a single `atempo` stage

### Rotation & flip
- Filter order: **rotate then flip** (transpose first, then hflip/vflip)
- Use `transpose` filter (not the deprecated `rotate=` filter):
  - 90°  → `transpose=1` (90° CW)
  - 180° → `vflip,hflip`
  - 270° → `transpose=2` (90° CCW)
  - 0°   → no filter added
- flipH = `hflip`, flipV = `vflip`, applied after rotation filters

### vf filter chain order
- Full order: `setpts` → rotation (`transpose`) → flip (`hflip`/`vflip`) → scale → crop → boxblur → hue → eq
- `setpts` is first to avoid AV sync drift on multi-clip exports
- `hue` syntax: `hue=h=N` (named param, not positional — deprecated in newer ffmpeg)

### GIF coverage
- All new transforms (speed, rotation, hue, flip) apply to GIF exports too
- GIF vf chain uses same filter order as non-GIF; `fps=15,scale=480:-2:flags=lanczos` appended last
- Volume does not apply to GIF (GIF has no audio stream)
- Speed in GIF: same `-t = D × speed` input window + `setpts` in vf chain

### Claude's Discretion
- Exact `atempo` chaining helper implementation (1 vs 2 stages)
- Whether to extract shared filter-building logic into a `buildAfFilter` function or inline in the audio encode path
- Error handling for edge-case speed values (should not occur given the `0.25 | 0.5 | 1 | 2 | 4` literal type)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing filter implementation
- `src/utils/buildFilterGraph.ts` — Current `buildVfFilter` to extend; `FORMAT_MAP` for format-specific paths
- `src/utils/buildFilterGraph.test.ts` — Existing test suite to extend with new filter coverage

### Export integration
- `src/hooks/useExport.ts` — Where `-t`, `-ss`, vf, and audio encode args are constructed; speed changes require modifying the `-t` calculation here

### Store types
- `src/store/types.ts` — `ClipSettings` with `speed: 0.25 | 0.5 | 1 | 2 | 4`, `rotation: 0 | 90 | 180 | 270`, `volume: number`, `hue: number`, `flipH: boolean`, `flipV: boolean`

### Requirements
- `CLIP-01`: speed presets (export side)
- `CLIP-02`: rotation (export side)
- `CLIP-03`: volume (export side)
- `CLIP-04`: hue shift (export side)
- `CLIP-05`: flip H/V (export side)
All defined in `.planning/REQUIREMENTS.md`

No external specs — requirements are fully captured in decisions above and the success criteria in ROADMAP.md § Phase 6.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `buildVfFilter(settings, clip) → string`: returns comma-joined vf filter string. Phase 6 extends this function directly — add setpts, transpose, hflip/vflip, hue logic here.
- `useExport.ts` audio encode path (lines 166–203): the per-audio-clip `-c:a aac` encode is where `-af volume=N` will be added.

### Established Patterns
- `!= null` (loose equality) for optional filter fields — `settings.crop != null`, `settings.resize != null` — because store can have `undefined` not `null`
- `filters.push(...)` then `filters.join(',')` — extend this pattern for new filters
- `buildVfFilter` receives both `settings` and `clip` (clip available if needed for source dimensions, though Phase 6 doesn't need it)

### Integration Points
- `useExport.ts:124` — `execArgs` construction where `-ss` and `-t` are set; speed changes the `-t` value here
- `useExport.ts:128–139` — where `buildVfFilter` result is woven into GIF and non-GIF vf chains
- `useExport.ts:178–182` — audio encode args where `-af volume=N` will be added
- Tests live in `src/utils/buildFilterGraph.test.ts` — new speed/rotation/volume/hue/flip cases go here; `useExport` tests for `-t` scaling go in `src/hooks/useExport.test.ts`

</code_context>

<specifics>
## Specific Ideas

No specific references or "I want it like X" moments — standard ffmpeg filter conventions apply.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 06-filter-graph*
*Context gathered: 2026-03-18*
