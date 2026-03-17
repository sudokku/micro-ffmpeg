# Phase 6: Filter Graph - Research

**Researched:** 2026-03-18
**Domain:** FFmpeg filter chain construction (video + audio), TypeScript unit testing
**Confidence:** HIGH

## Summary

Phase 6 is a pure logic extension. All decisions are locked in CONTEXT.md — no architecture choices remain open. The work is:
1. Extend `buildVfFilter` in `src/utils/buildFilterGraph.ts` with five new filter segments (setpts, transpose/vflip+hflip for 180°, hflip, vflip, hue).
2. Export a new `buildAfFilter` helper (or inline equivalent) for the `atempo` audio speed chain.
3. Modify the `-t` duration calculation in `useExport.ts` to scale by `speed` when speed != 1.
4. Modify the audio encode path in `useExport.ts` to append `-af volume=N` when volume != 1.0.
5. Add unit tests covering all 5 speed presets × audio/video and all rotation + flip combinations.

The existing codebase is in excellent shape: `buildVfFilter` uses a `filters.push/join` pattern that trivially extends, the store types already carry all new fields (`speed`, `rotation`, `volume`, `hue`, `flipH`, `flipV`), and 103 tests all pass green. No new dependencies are required.

**Primary recommendation:** Extend `buildVfFilter` in strict filter-order (setpts → transpose → hflip/vflip → scale → crop → boxblur → hue → eq), add `buildAfFilter` as a named export alongside it, and modify the two `useExport.ts` integration points (`-t` calculation and audio encode args).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Volume scope**
- Volume (CLIP-03, 0–200%) applies to audio-track clips only
- Applied as `-af volume=N` in the existing audio encode pass
- Video clips keep `-an` (audio stripped) — no new per-video-clip audio encode pass

**Speed & source window**
- Timeline clip duration `D = endTime - startTime` represents output duration
- For speed != 1: input `-t` must be `D × speed` (to feed enough source to the filters)
- `trimStart` (the `-ss` seek point) stays as-is — do not scale it by speed
- `setpts = 1/speed * PTS` goes in the vf chain (first filter, before all others)
- Audio speed uses `atempo` filter chain: 0.25× = `atempo=0.5,atempo=0.5`; 4× = `atempo=2.0,atempo=2.0`; 0.5× and 2× use a single `atempo` stage

**Rotation & flip**
- Filter order: rotate then flip (transpose first, then hflip/vflip)
- Use `transpose` filter (not the deprecated `rotate=` filter):
  - 90°  → `transpose=1` (90° CW)
  - 180° → `vflip,hflip`
  - 270° → `transpose=2` (90° CCW)
  - 0°   → no filter added
- flipH = `hflip`, flipV = `vflip`, applied after rotation filters

**vf filter chain order**
- Full order: `setpts` → rotation (`transpose`) → flip (`hflip`/`vflip`) → scale → crop → boxblur → hue → eq
- `setpts` is first to avoid AV sync drift on multi-clip exports
- `hue` syntax: `hue=h=N` (named param, not positional — deprecated in newer ffmpeg)

**GIF coverage**
- All new transforms (speed, rotation, hue, flip) apply to GIF exports too
- GIF vf chain uses same filter order as non-GIF; `fps=15,scale=480:-2:flags=lanczos` appended last
- Volume does not apply to GIF (GIF has no audio stream)
- Speed in GIF: same `-t = D × speed` input window + `setpts` in vf chain

### Claude's Discretion
- Exact `atempo` chaining helper implementation (1 vs 2 stages)
- Whether to extract shared filter-building logic into a `buildAfFilter` function or inline in the audio encode path
- Error handling for edge-case speed values (should not occur given the `0.25 | 0.5 | 1 | 2 | 4` literal type)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CLIP-01 | Per-clip playback speed (0.25×/0.5×/1×/2×/4× presets) — export side | `setpts=1/speed*PTS` in vf chain; `-t D*speed`; `atempo` chaining in af chain |
| CLIP-02 | Per-clip rotation (0°/90°/180°/270° presets) — export side | `transpose=1` (90°), `vflip,hflip` (180°), `transpose=2` (270°) in vf chain |
| CLIP-03 | Per-clip volume (0–200%) — export side | `-af volume=N` in audio encode pass; audio clips only |
| CLIP-04 | Per-clip hue shift — export side | `hue=h=N` in vf chain (named-param syntax); after flip, before eq |
| CLIP-05 | Per-clip flip H/V — export side | `hflip` and/or `vflip` in vf chain after rotation, before scale |
</phase_requirements>

## Standard Stack

No new dependencies. All implementation uses ffmpeg filter primitives already available in `@ffmpeg/ffmpeg` (the wasm build in use).

### Core (existing, unchanged)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@ffmpeg/ffmpeg` | ^0.12.15 | FFmpeg WASM execution | Already the project singleton |
| `vitest` | ^3.2.0 | Unit testing | Already configured, 103 tests passing |

### Installation
No new packages needed.

## Architecture Patterns

### Recommended File Changes

```
src/utils/
├── buildFilterGraph.ts    — extend buildVfFilter; add buildAfFilter export
├── buildFilterGraph.test.ts — add new speed/rotation/hue/flip test cases

src/hooks/
├── useExport.ts           — modify -t calculation (line 124); add -af to audio encode (line 181)
├── useExport.test.ts      — add -t scaling tests (new describe block)
```

### Pattern 1: Extending buildVfFilter — new filter insertion points

The current push order is: scale → crop → boxblur → eq.
New full order: **setpts → transpose/vflip+hflip → hflip/vflip → scale → crop → boxblur → hue → eq**

The `filters.push(...)` pattern is already established. New segments are prepended (setpts, rotation, flip) and inserted before `eq` (hue). The `eq` block check stays last.

```typescript
// setpts — FIRST, only when speed != 1
if (settings.speed !== 1) {
  filters.push(`setpts=${1 / settings.speed}*PTS`)
}

// rotation — after setpts, before flip
if (settings.rotation === 90) {
  filters.push('transpose=1')
} else if (settings.rotation === 180) {
  filters.push('vflip')
  filters.push('hflip')
} else if (settings.rotation === 270) {
  filters.push('transpose=2')
}

// flip — after rotation
if (settings.flipH) filters.push('hflip')
if (settings.flipV) filters.push('vflip')

// ... existing scale, crop, boxblur blocks unchanged ...

// hue — before eq
if (settings.hue !== 0) {
  filters.push(`hue=h=${settings.hue}`)
}

// eq — last (unchanged)
```

**Note on floating-point setpts:** `1/0.25 = 4`, `1/0.5 = 2`, `1/2 = 0.5`, `1/4 = 0.25` — all exact for the five literal speed values. No precision risk.

### Pattern 2: buildAfFilter helper

`atempo` range constraint: 0.5–2.0 per single stage. Chaining required for 0.25× and 4×.

```typescript
// Recommended as a named export for testability
export function buildAfFilter(speed: ClipSettings['speed'], volume: number): string {
  const parts: string[] = []
  // atempo — only when speed != 1
  if (speed !== 1) {
    if (speed === 0.25) parts.push('atempo=0.5', 'atempo=0.5')
    else if (speed === 0.5)  parts.push('atempo=0.5')
    else if (speed === 2)    parts.push('atempo=2.0')
    else if (speed === 4)    parts.push('atempo=2.0', 'atempo=2.0')
  }
  // volume — only when != 1.0
  if (volume !== 1.0) {
    parts.push(`volume=${volume}`)
  }
  return parts.join(',')
}
```

Placing this in `buildFilterGraph.ts` keeps all filter-string logic in one testable module.

### Pattern 3: useExport.ts — -t duration scaling

Current line 124:
```typescript
const execArgs: string[] = ['-ss', String(trimStart), '-i', inputName, '-t', String(duration)]
```

With speed factored in, `duration` passed to `-t` must be `D * speed` (source window). The clip's `endTime - startTime` remains the *output* duration and drives the timeline display — only the ffmpeg input window changes.

```typescript
const speed = settings?.speed ?? 1
const sourceDuration = duration * speed   // how much source to read
const execArgs: string[] = ['-ss', String(trimStart), '-i', inputName, '-t', String(sourceDuration)]
```

### Pattern 4: useExport.ts — audio encode with volume + speed

Current line 181 (the audio encode args array):
```typescript
['-ss', String(trimStart), '-i', inputName, '-t', String(duration), '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', outputName]
```

With speed and volume:
```typescript
const clipSettings = useStore.getState().clipSettings[audioClipIds[i]]
const audioSpeed = clipSettings?.speed ?? 1
const audioVolume = clipSettings?.volume ?? 1.0
const audioSourceDuration = duration * audioSpeed
const afFilter = buildAfFilter(audioSpeed, audioVolume)
const audioArgs: string[] = ['-ss', String(trimStart), '-i', inputName, '-t', String(audioSourceDuration), '-c:a', 'aac', '-b:a', '128k', '-ar', '48000']
if (afFilter) audioArgs.push('-af', afFilter)
audioArgs.push(outputName)
```

### Anti-Patterns to Avoid

- **Positional hue syntax `hue=N`:** Deprecated in newer ffmpeg builds. Always use `hue=h=N`.
- **`setpts` not first in vf chain:** Causes AV sync drift on multi-clip exports because PTS manipulation after scale/crop processes frames out of order relative to the audio timeline.
- **Scaling `-ss` by speed:** `trimStart` is a source offset — do not multiply it. Only `-t` changes.
- **Single `atempo=0.25` or `atempo=4.0`:** ffmpeg rejects values outside 0.5–2.0. Must chain two stages.
- **Applying volume/atempo to video clips:** Video encode path uses `-an`. No audio filter pass for video clips.
- **Applying volume to GIF:** GIF has no audio stream — skip `buildAfFilter` for GIF path.
- **`!== null` strict check for optional settings fields:** Existing codebase pattern uses `!= null` (loose) because the store may have `undefined`. New filter conditions follow the same pattern for `crop`/`resize` but the new fields (`speed`, `rotation`, `hue`, `flipH`, `flipV`) have non-null defaults so direct comparison is fine.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Speed change in video | Custom frame duplicator/dropper | `setpts=1/speed*PTS` in ffmpeg vf | FFmpeg handles PTS rewriting, codec rate, and decoder buffering correctly |
| Speed change in audio | Custom sample rate manipulation | `atempo` filter | Preserves pitch; handles resampling correctly |
| Rotation | Manual pixel transform | `transpose` filter | Handles metadata (SAR/DAR) and codec constraints correctly |
| Hue shift | Manual color matrix | `hue=h=N` filter | Handles colorspace conversion internally |
| Flip | Manual coordinate inversion | `hflip`/`vflip` | Zero-copy in ffmpeg; no manual pixel math needed |

**Key insight:** Every transform in this phase maps 1:1 to a single well-tested ffmpeg filter. There is nothing to hand-roll.

## Common Pitfalls

### Pitfall 1: atempo out-of-range values
**What goes wrong:** `atempo=0.25` or `atempo=4.0` causes ffmpeg to exit with error "Option tempo out of range [0.5, 2]".
**Why it happens:** The atempo filter has a hard range constraint in all ffmpeg builds.
**How to avoid:** Chain two stages: `atempo=0.5,atempo=0.5` for 0.25× and `atempo=2.0,atempo=2.0` for 4×. Locked decision in CONTEXT.md.
**Warning signs:** ffmpeg exit code != 0 with "out of range" in the log.

### Pitfall 2: AV sync drift with setpts not first
**What goes wrong:** Video plays at wrong speed relative to audio in multi-clip exports.
**Why it happens:** PTS-rewriting filters that appear after scale/crop operate on modified PTS values, causing the PTS-to-wall-clock mapping to diverge from the audio timeline.
**How to avoid:** `setpts` must be the first filter pushed into the `filters` array. Locked in CONTEXT.md.
**Warning signs:** Audio and video are offset by a consistent amount proportional to speed factor.

### Pitfall 3: Wrong source window for speed != 1
**What goes wrong:** Slow-motion clips are truncated (0.5× with `-t=D` reads only half the needed source). Fast-motion clips read less source than needed and output is short.
**Why it happens:** `-t` tells ffmpeg how much input to consume. For speed filters, the input consumed must be `D * speed`.
**How to avoid:** Scale `-t` by speed in `useExport.ts`. `trimStart` (`-ss`) is unchanged.
**Warning signs:** Exported clip is shorter than expected, or ends on a freeze frame.

### Pitfall 4: hue positional syntax
**What goes wrong:** `hue=45` may produce incorrect output or warnings with newer ffmpeg-wasm builds.
**Why it happens:** Positional `hue=angle` was deprecated; newer builds require `hue=h=angle`.
**How to avoid:** Always use named-param syntax `hue=h=${settings.hue}`.

### Pitfall 5: 180° rotation using transpose (wrong)
**What goes wrong:** There is no `transpose` value for 180°. Using `transpose=3` produces a flip+rotate that doesn't match 180°.
**Why it happens:** `transpose` only handles 90° increments with reflections (values 0–3).
**How to avoid:** 180° = `vflip,hflip` (two sequential filters). Locked in CONTEXT.md.

### Pitfall 6: Test covering only "happy path" speed
**What goes wrong:** Tests pass for 1× but 0.25× and 4× fail in export due to uncaught atempo range error.
**Why it happens:** Success criteria explicitly require all five presets to be tested.
**How to avoid:** Write test cases for all five presets (0.25, 0.5, 1, 2, 4) — both vf (setpts) and af (atempo) outputs.

## Code Examples

Verified patterns from official ffmpeg documentation and locked project decisions:

### setpts for speed change (vf chain)
```typescript
// speed: 0.25 | 0.5 | 1 | 2 | 4
// Only added when speed !== 1
filters.push(`setpts=${1 / settings.speed}*PTS`)
// 0.25x → setpts=4*PTS  (slow motion: stretch PTS)
// 0.5x  → setpts=2*PTS
// 2x    → setpts=0.5*PTS
// 4x    → setpts=0.25*PTS
```

### atempo chain for audio speed (af chain)
```typescript
// 0.25x: two stages (atempo range is 0.5–2.0)
'atempo=0.5,atempo=0.5'
// 0.5x: single stage
'atempo=0.5'
// 1x: no atempo filter at all
// 2x: single stage
'atempo=2.0'
// 4x: two stages
'atempo=2.0,atempo=2.0'
```

### transpose for rotation (vf chain)
```typescript
// 90° CW
filters.push('transpose=1')
// 180° — no transpose value; use two sequential filters
filters.push('vflip')
filters.push('hflip')
// 270° CCW (same as 90° CCW)
filters.push('transpose=2')
// 0° — nothing added
```

### hue shift (vf chain, named-param syntax)
```typescript
if (settings.hue !== 0) {
  filters.push(`hue=h=${settings.hue}`)
}
```

### volume in audio encode pass
```typescript
// Appended to execAndCheck args before outputName
if (audioVolume !== 1.0) {
  audioArgs.push('-af', `volume=${audioVolume}`)
}
```

### Full vf chain order example (all settings active: speed=0.5, rotation=90, flipH=true, blur=3, hue=45, brightness=0.2)
```
setpts=2*PTS,transpose=1,hflip,scale=...,crop=...,boxblur=3:3,hue=h=45,eq=brightness=0.2:contrast=1:saturation=1
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `rotate=angle*PI/180` filter | `transpose=1/2` | ffmpeg ~4.x | `rotate` still works but `transpose` is the canonical 90° filter and more efficient |
| Positional `hue=45` | Named `hue=h=45` | ffmpeg ~5.x | Positional deprecated; named param is forward-compatible |
| Single `atempo=0.25` | Chain `atempo=0.5,atempo=0.5` | Always | Single stage was never valid outside 0.5–2.0 range |

## Open Questions

1. **`hue` range for the slider**
   - What we know: `hue=h=N` accepts degrees; full rotation is 0–360 (or -180–180).
   - What's unclear: The `ClipSettings.hue` field is typed as `number` with no documented range in `types.ts`. Phase 11 (UI) defines the slider — Phase 6 just passes the value through.
   - Recommendation: Treat as pass-through; the filter accepts any float. No clamping needed in Phase 6. Document the assumption so Phase 11 defines the correct slider range.

2. **volume=0 edge case**
   - What we know: `volume=0` is valid ffmpeg and produces silence; the type is `number` (no lower bound enforced in types.ts).
   - What's unclear: Should 0% volume emit `-af volume=0` or `-an`?
   - Recommendation: Emit `-af volume=0` (consistent behavior; `-an` would require restructuring the audio path). The locked decision says volume applies as `-af volume=N` — this is consistent.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.0 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/utils/buildFilterGraph.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CLIP-01 | `setpts` in vf for all 5 speed presets | unit | `npx vitest run src/utils/buildFilterGraph.test.ts` | ✅ (extend) |
| CLIP-01 | `atempo` chain for all 5 speed presets | unit | `npx vitest run src/utils/buildFilterGraph.test.ts` | ✅ (new describe) |
| CLIP-01 | `-t` scaled by speed in useExport | unit | `npx vitest run src/hooks/useExport.test.ts` | ✅ (new describe) |
| CLIP-02 | `transpose=1` for 90°, `vflip,hflip` for 180°, `transpose=2` for 270° | unit | `npx vitest run src/utils/buildFilterGraph.test.ts` | ✅ (extend) |
| CLIP-03 | `volume=N` in af for audio clips | unit | `npx vitest run src/utils/buildFilterGraph.test.ts` | ✅ (new describe) |
| CLIP-04 | `hue=h=N` in vf chain, omitted when hue=0 | unit | `npx vitest run src/utils/buildFilterGraph.test.ts` | ✅ (extend) |
| CLIP-05 | `hflip`/`vflip` in vf chain, correct order relative to rotation | unit | `npx vitest run src/utils/buildFilterGraph.test.ts` | ✅ (extend) |

### Sampling Rate
- **Per task commit:** `npx vitest run src/utils/buildFilterGraph.test.ts src/hooks/useExport.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
None — existing test infrastructure covers all phase requirements. No new test files, config changes, or fixture setup needed. All new tests extend existing `describe` blocks in `buildFilterGraph.test.ts` and `useExport.test.ts`.

## Sources

### Primary (HIGH confidence)
- Direct code reading — `src/utils/buildFilterGraph.ts`, `src/utils/buildFilterGraph.test.ts`, `src/hooks/useExport.ts`, `src/store/types.ts` — current implementation fully understood
- `.planning/phases/06-filter-graph/06-CONTEXT.md` — all decisions locked and authoritative
- FFmpeg filter documentation (ffmpeg.org): `setpts`, `transpose`, `atempo`, `hflip`, `vflip`, `hue`, `volume` — all stable filters present in every modern ffmpeg build including the WASM variant

### Secondary (MEDIUM confidence)
- Project `STATE.md` accumulated decisions — confirms `atempo` range, `setpts` ordering, `hue=h=N` syntax

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new deps; all filter names verified from project decisions + well-known ffmpeg primitives
- Architecture: HIGH — codebase fully read; extension points are unambiguous
- Pitfalls: HIGH — majority derived from locked CONTEXT.md decisions and known ffmpeg constraints
- Test coverage map: HIGH — existing test files read and vitest run confirmed 103/103 green

**Research date:** 2026-03-18
**Valid until:** 2026-06-18 (stable — ffmpeg filter names don't change between patch versions)
