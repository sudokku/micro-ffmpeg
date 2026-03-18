---
phase: 07-waveform-infrastructure
plan: 01
subsystem: store, utils
tags: [zustand, zundo, waveform, audio, peaks]

# Dependency graph
requires:
  - phase: 05-store-foundation
    provides: Zustand store with Zundo temporal, Clip type with waveformPeaks field
provides:
  - setWaveformPeaks store action (declared in StoreActions, implemented, excluded from partialize)
  - extractPeaks pure utility function (peak-normalized AudioBuffer downsampling)
affects:
  - 07-02 (useWaveformExtractor hook consumes both setWaveformPeaks and extractPeaks)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Waveform data lives on Clip in tracked state — peaks undo with clip edits"
    - "Store actions excluded from partialize via destructure pattern in temporal config"
    - "extractPeaks peak-normalizes so loudest peak is always 1.0 — divide-by-zero guarded"

key-files:
  created:
    - src/utils/extractPeaks.ts
    - src/utils/extractPeaks.test.ts
  modified:
    - src/store/types.ts
    - src/store/index.ts
    - src/store/store.test.ts

key-decisions:
  - "setWaveformPeaks updates clips record directly (not a separate waveformPeaks map) — peaks undo when clips undo"
  - "extractPeaks peak-normalizes output: globalMax divide ensures bars use full clip height"
  - "blockSize=0 guard returns array of zeros instead of panicking on tiny buffers"

patterns-established:
  - "Store action exclusion pattern: add action name to partialize destructure"
  - "AudioBuffer mock pattern for unit tests: Float32Array + partial object cast to AudioBuffer"

requirements-completed: [WAVE-01]

# Metrics
duration: 10min
completed: 2026-03-18
---

# Phase 7 Plan 01: Waveform Infrastructure — Store Action and Peak Extraction

**`setWaveformPeaks` Zustand action and peak-normalized `extractPeaks` utility with 9 new tests covering undo behavior, normalization, and silence safety**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-18T02:15:00Z
- **Completed:** 2026-03-18T02:16:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added `setWaveformPeaks(clipId, peaks)` to `StoreActions` interface and store implementation, excluded from Zundo partialize so undo/redo reverts peak data but not the action reference
- Created `extractPeaks(audioBuffer, peakCount)` pure function that downsamples AudioBuffer channel 0 to N peaks and peak-normalizes the result (max = 1.0), with divide-by-zero guard for silent audio
- Added 9 new tests (4 store + 5 utility); full suite grows from 139 to 148, all passing

## Files Created/Modified

- `src/store/types.ts` — added `setWaveformPeaks: (clipId: string, peaks: number[]) => void` to `StoreActions`
- `src/store/index.ts` — implemented `setWaveformPeaks` action and added it to partialize destructure
- `src/store/store.test.ts` — added `describe('setWaveformPeaks')` block with 4 tests
- `src/utils/extractPeaks.ts` — new pure peak extraction function
- `src/utils/extractPeaks.test.ts` — 5 unit tests with mock AudioBuffer factory

## Decisions Made

- Peaks stored directly on `Clip` (not a separate map) so Zundo undo/redo automatically reverts waveform data together with clip edits — no extra partialize tuning needed
- Peak normalization (divide by globalMax) makes renderer code simpler: map directly to canvas height without knowing amplitude range
- `blockSize === 0` early return fills zeros rather than throwing — handles edge case of peakCount > sample count

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `setWaveformPeaks` and `extractPeaks` are fully ready for Plan 02's `useWaveformExtractor` hook
- No blockers

---
*Phase: 07-waveform-infrastructure*
*Completed: 2026-03-18*
