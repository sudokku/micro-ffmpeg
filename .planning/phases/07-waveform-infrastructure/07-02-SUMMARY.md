---
phase: 07-waveform-infrastructure
plan: 02
subsystem: ui, hooks
tags: [react, canvas, waveform, web-audio, zustand, hooks]

# Dependency graph
requires:
  - phase: 07-waveform-infrastructure plan 01
    provides: setWaveformPeaks store action, extractPeaks utility function, waveformPeaks on Clip type
provides:
  - useWaveformExtractor hook (auto-extracts WaveformBar[] peaks for audio clips on import via OfflineAudioContext)
  - WaveformCanvas component (Audacity-style dual-layer waveform: faint min/max envelope + bright RMS fill, log scale, center-anchored)
  - AppShell mounts useWaveformExtractor alongside useThumbnailExtractor
affects:
  - 07-03 and later (any phase building on the waveform rendering pipeline)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "OfflineAudioContext mock via vi.stubGlobal for hook tests in happy-dom environment"
    - "inFlightRef with delete-on-completion allows re-extraction after undo (unlike permanent processedRef)"
    - "WaveformCanvas uses DPR-aware canvas sizing for crisp rendering on retina displays"
    - "Waveform canvas is position:absolute inset-0 with pointer-events-none so clip drag/select still works"
    - "ResizeObserver drives canvas redraw so waveform stays sharp on clip resize"
    - "Dual-layer Audacity-style rendering: outer faint envelope (min/max) + inner bright RMS fill"
    - "Log-scale amplitude mapping with -60 dB floor keeps quiet signals visible without blowout"

key-files:
  created:
    - src/hooks/useWaveformExtractor.ts
    - src/hooks/useWaveformExtractor.test.ts
    - src/components/ClipAction.test.tsx
  modified:
    - src/utils/extractPeaks.ts
    - src/utils/extractPeaks.test.ts
    - src/store/types.ts
    - src/store/store.test.ts
    - src/components/ClipAction.tsx
    - src/components/AppShell.tsx
    - src/hooks/useWaveformExtractor.ts (updated with WaveformBar type)
    - src/hooks/useWaveformExtractor.test.ts (updated with WaveformBar type)

key-decisions:
  - "WaveformBar { min, max, rms } per bar instead of number[] — preserves peak envelope and RMS for dual-layer rendering"
  - "10 bars/second (duration-proportional) instead of fixed 200 — waveform scales with clip duration"
  - "Log-scale amplitude (−60 dB floor via ampToHeight) — readable dynamics for both quiet and loud signals"
  - "Dual-layer rendering: rgba(255,255,255,0.3) envelope + rgba(255,255,255,0.75) RMS fill — Audacity-style"
  - "ResizeObserver in WaveformCanvas so bars redraw on clip resize without re-extracting peaks"
  - "inFlightRef.delete in finally (not after setWaveformPeaks) so undo can re-trigger extraction correctly"
  - "WaveformCanvas defined in same file as ClipAction — no separate file needed at this scope"
  - "BARS_PER_SECOND=10 exported from extractPeaks.ts — single source of truth for resolution"

patterns-established:
  - "OfflineAudioContext stub pattern: vi.stubGlobal with class having decodeAudioData method"
  - "Hook subscription pattern with inFlightRef: subscribe → filter → deduplicate → async → cleanup"
  - "WaveformBar[] over number[] when renderer needs envelope data (min/max) in addition to amplitude (rms)"

requirements-completed: [WAVE-01]

# Metrics
duration: ~30min
completed: 2026-03-18
---

# Phase 7 Plan 02: Waveform Infrastructure — Hook and Canvas Renderer

**`useWaveformExtractor` drives Web Audio API peak extraction into Zustand; `WaveformCanvas` renders an Audacity-style dual-layer waveform (min/max envelope + RMS fill, log-scale) on audio clips in the timeline**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-03-18T00:17:39Z
- **Completed:** 2026-03-18T00:48:00Z
- **Tasks:** 2 automated + 1 human-verify checkpoint (approved)
- **Files modified:** 8

## Accomplishments

- Created `useWaveformExtractor` hook that subscribes to the Zustand store, detects audio clips with `waveformPeaks === null`, extracts `WaveformBar[]` peaks via `OfflineAudioContext` + `extractPeaks`, and calls `setWaveformPeaks` — with in-flight dedup using `inFlightRef` that cleans up on completion
- Created `WaveformCanvas` component (in ClipAction.tsx) rendering a two-pass waveform: faint `rgba(255,255,255,0.3)` outer envelope (min/max peaks) + bright `rgba(255,255,255,0.75)` inner RMS fill, using log-scale amplitude mapping (−60 dB floor) and a ResizeObserver for live redraws
- Changed peak representation from `number[]` to `WaveformBar[] { min, max, rms }` and resolution from fixed 200 bars to 10 bars/second (duration-proportional) — updated extractPeaks.ts, types.ts, and all dependent tests
- Added conditional render in `ClipAction`: audio clips with non-null peaks show `WaveformCanvas`; video clips and audio clips with `null` peaks show nothing
- Mounted `useWaveformExtractor()` in `AppShell` on the line after `useThumbnailExtractor()`
- Added tests for hook and ClipAction; full suite runs at 157 tests all passing, visually verified by human checkpoint

## Task Commits

Per CLAUDE.md, one commit per phase. All task work bundled into phase commit.

## Files Created/Modified

- `src/utils/extractPeaks.ts` — Updated to return `WaveformBar[]` at 10 bars/second with min/max/rms per bar; no global normalization
- `src/utils/extractPeaks.test.ts` — Updated tests for WaveformBar shape and BARS_PER_SECOND constant
- `src/store/types.ts` — Changed `waveformPeaks: number[] | null` to `waveformPeaks: WaveformBar[] | null`
- `src/store/store.test.ts` — Updated setWaveformPeaks tests to use WaveformBar[]
- `src/hooks/useWaveformExtractor.ts` — Side-effect hook: subscribes to store, extracts WaveformBar[] peaks for unprocessed audio clips via Web Audio API, in-flight dedup
- `src/hooks/useWaveformExtractor.test.ts` — Hook tests: extraction fires, video clips ignored, already-extracted clips skipped, in-flight dedup
- `src/components/ClipAction.tsx` — Added `WaveformCanvas` component with dual-layer rendering, log scale, ResizeObserver; conditional render for audio clips with peaks
- `src/components/ClipAction.test.tsx` — 3 tests: canvas present (audio+peaks), absent (video), absent (audio+null)
- `src/components/AppShell.tsx` — Added `useWaveformExtractor` import and hook call after `useThumbnailExtractor`

## Decisions Made

- `WaveformBar { min, max, rms }` per bar instead of `number[]` — needed to render both the peak envelope and the RMS loudness layer simultaneously; flat `number[]` would only allow one representation
- `BARS_PER_SECOND = 10` (duration-proportional) rather than fixed 200 — short clips get the same visual density as long clips; exported from `extractPeaks.ts` as a single source of truth
- Log-scale amplitude mapping (`ampToHeight`) with −60 dB floor — linear scaling made quiet audio barely visible; log scale produces readable dynamics matching standard DAW behavior
- Dual-layer Audacity-style rendering: outer faint envelope shows transient peaks, inner bright fill shows perceived loudness — much clearer than single-layer at a glance
- `ResizeObserver` drives canvas redraws — waveform stays pixel-sharp when clip is resized on the timeline without re-extracting peaks
- `inFlightRef.delete` in `finally` block — cleanup happens even if extraction succeeds after undo removes the clip, preventing stale ref state

## Deviations from Plan

### Auto-improved Implementation

**1. [Rule 1 - Enhancement] WaveformBar[] replaces number[] for dual-layer rendering**
- **Found during:** Task 1/2 (initial WaveformCanvas implementation)
- **Issue:** Plan specified `number[]` peaks but a single array cannot express both peak envelope (min/max) and RMS loudness simultaneously; waveform was visually poor
- **Fix:** Changed `WaveformBar { min, max, rms }` as the peak data shape; updated extractPeaks.ts, types.ts, and all dependent tests and hooks
- **Files modified:** src/utils/extractPeaks.ts, src/utils/extractPeaks.test.ts, src/store/types.ts, src/store/store.test.ts, src/hooks/useWaveformExtractor.ts, src/hooks/useWaveformExtractor.test.ts, src/components/ClipAction.tsx
- **Verification:** 157 tests passing; waveform visually verified at checkpoint

**2. [Rule 1 - Enhancement] 10 bars/second (duration-proportional) replaces fixed 200**
- **Found during:** Task 2 (WaveformCanvas rendering)
- **Issue:** Fixed 200 bars looked inconsistent — very short clips were over-detailed, very long clips under-detailed
- **Fix:** `BARS_PER_SECOND = 10` exported from `extractPeaks.ts`; bar count = `ceil(duration × 10)`
- **Files modified:** src/utils/extractPeaks.ts
- **Verification:** Visual checkpoint approved

**3. [Rule 1 - Enhancement] Log-scale amplitude + dual-layer rendering**
- **Found during:** Task 2 (WaveformCanvas rendering)
- **Issue:** Plan specified top-anchored linear bars at rgba(255,255,255,0.6); linear scale made quiet audio invisible; single-layer gave poor readability
- **Fix:** `ampToHeight` maps linear amplitude to −60 dB log scale; two-pass render: faint envelope + bright RMS fill; center-anchored (not top-anchored)
- **Files modified:** src/components/ClipAction.tsx
- **Verification:** Visual checkpoint approved — user confirmed waveform rendering correct

---

**Total deviations:** 3 auto-improved (all rendering quality improvements; no scope creep, no architectural changes)
**Impact on plan:** All improvements were inline WaveformCanvas/extractPeaks changes. No new files, no new dependencies, no API surface changes beyond the WaveformBar type. Must-have visual truths (waveform on audio, not on video, null = no canvas) all satisfied.

## Issues Encountered

None — all deviations were proactive quality improvements, not blocking problems.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Complete waveform infrastructure delivered and visually verified
- `WaveformBar[]` type established as the canonical peak representation for future use
- `BARS_PER_SECOND = 10` exported from `extractPeaks.ts` — future phases can use this constant
- No blockers for subsequent phases

## Self-Check: PASSED

- `src/hooks/useWaveformExtractor.ts` — FOUND
- `src/hooks/useWaveformExtractor.test.ts` — FOUND
- `src/components/ClipAction.test.tsx` — FOUND
- `src/components/ClipAction.tsx` — contains `WaveformCanvas`, `ampToHeight`, `!isVideoClip && clip.waveformPeaks`, `ResizeObserver`, dual-layer rendering
- `src/components/AppShell.tsx` — contains `useWaveformExtractor` import and call
- `src/utils/extractPeaks.ts` — contains `WaveformBar`, `BARS_PER_SECOND = 10`
- 157 tests passing; human visual verification approved at Task 3 checkpoint

---
*Phase: 07-waveform-infrastructure*
*Completed: 2026-03-18*
