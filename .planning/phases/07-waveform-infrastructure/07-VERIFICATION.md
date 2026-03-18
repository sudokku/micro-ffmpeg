---
phase: 07-waveform-infrastructure
verified: 2026-03-18T04:05:00Z
status: gaps_found
score: 6/7 must-haves verified
gaps:
  - truth: "ClipAction.test.tsx type-checks correctly against WaveformBar[]"
    status: failed
    reason: "Test file passes number[] literals ([0.5, 1.0, 0.3]) where WaveformBar[] is now required; tsc emits 6 TS2322 errors in this file on npm run build"
    artifacts:
      - path: "src/components/ClipAction.test.tsx"
        issue: "Lines 30 and 43 — waveformPeaks: [0.5, 1.0, 0.3] should be waveformPeaks: [{ min: -0.5, max: 0.5, rms: 0.35 }, ...] (WaveformBar shapes)"
    missing:
      - "Replace number[] literals with WaveformBar[] objects in waveformPeaks overrides on lines 30 and 43"
human_verification:
  - test: "Visual waveform appearance on audio clips"
    expected: "Audacity-style dual-layer waveform (faint envelope + bright RMS fill) on audio clips; absent on video clips; absent while peaks are null (loading)"
    why_human: "Canvas pixel rendering cannot be verified programmatically in happy-dom — already approved at Task 3 checkpoint per SUMMARY"
---

# Phase 7: Waveform Infrastructure Verification Report

**Phase Goal:** Users can see audio waveforms rendered on audio clips in the timeline — peaks are extracted once on import and drawn from cached store data
**Verified:** 2026-03-18T04:05:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `setWaveformPeaks(clipId, peaks)` updates `clip.waveformPeaks` in the store | VERIFIED | `src/store/index.ts:185-193` — implementation present; store.test.ts:484 tests it |
| 2 | `setWaveformPeaks` is excluded from Zundo partialize | VERIFIED | `src/store/index.ts:198` — name in partialize destructure |
| 3 | `waveformPeaks` data IS reverted by undo | VERIFIED | `store.test.ts:496-504` — undo test passes |
| 4 | `extractPeaks` returns `WaveformBar[]` at 10 bars/second (improvement over planned `number[]`) | VERIFIED | `src/utils/extractPeaks.ts` — exports `WaveformBar`, `BARS_PER_SECOND=10`, 7 tests pass |
| 5 | After importing an audio file, waveform peaks appear on the clip in the timeline | VERIFIED (human) | `useWaveformExtractor` → `OfflineAudioContext` → `setWaveformPeaks` pipeline wired; human checkpoint approved |
| 6 | Video clips show no waveform canvas | VERIFIED | `ClipAction.tsx:135` — `{!isVideoClip && clip.waveformPeaks && ...}`; ClipAction.test.tsx test 2 confirms |
| 7 | `ClipAction.test.tsx` type-checks correctly against `WaveformBar[]` | FAILED | Lines 30 and 43 pass `[0.5, 1.0, 0.3]` (number[]) — `tsc` emits 6 TS2322 errors; tests pass at runtime via Vitest but build fails |

**Score:** 6/7 truths verified

---

### Required Artifacts

| Artifact | Provides | Status | Details |
|----------|----------|--------|---------|
| `src/store/types.ts` | `setWaveformPeaks` in `StoreActions`; `WaveformBar[]` on `Clip` | VERIFIED | Line 66: `setWaveformPeaks: (clipId: string, peaks: WaveformBar[]) => void`; line 17: `waveformPeaks: WaveformBar[] | null` |
| `src/store/index.ts` | `setWaveformPeaks` action + partialize exclusion | VERIFIED | Lines 185-193 (impl), line 198 (partialize destructure) |
| `src/utils/extractPeaks.ts` | `WaveformBar` type, `BARS_PER_SECOND`, `extractPeaks` function | VERIFIED | All three exported; function body is substantive (46 lines) |
| `src/utils/extractPeaks.test.ts` | 7 unit tests for `WaveformBar` shape, duration-proportional count, silence, rms/max relationship | VERIFIED | 7 `it(` blocks all passing |
| `src/store/store.test.ts` | `describe('setWaveformPeaks')` with 4 tests | VERIFIED | Line 476; tests use `WaveformBar[]` mocks correctly |
| `src/hooks/useWaveformExtractor.ts` | Side-effect hook for audio clip peak extraction | VERIFIED | Exports `useWaveformExtractor`; subscribes to store, filters audio clips, uses `OfflineAudioContext`, in-flight dedup with `finally`-delete |
| `src/hooks/useWaveformExtractor.test.ts` | 4 hook tests | VERIFIED | Covers: extraction fires, video ignored, already-extracted skipped, in-flight dedup |
| `src/components/ClipAction.tsx` | `WaveformCanvas` component with dual-layer rendering | VERIFIED | `WaveformCanvas` defined lines 19-95; `ampToHeight` log scale; ResizeObserver; `rgba(255,255,255,0.3)` envelope + `rgba(255,255,255,0.75)` RMS; conditional render line 135 |
| `src/components/ClipAction.test.tsx` | 3 conditional render tests | STUB (type error) | Tests pass at runtime; `waveformPeaks: [0.5, 1.0, 0.3]` is `number[]` not `WaveformBar[]` — TS2322 errors in build |
| `src/components/AppShell.tsx` | `useWaveformExtractor` mounted | VERIFIED | Line 12 import; line 21 call after `useThumbnailExtractor()` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/hooks/useWaveformExtractor.ts` | `src/utils/extractPeaks.ts` | `import { extractPeaks }` | WIRED | Line 3: `import { extractPeaks } from '../utils/extractPeaks'`; called line 30 |
| `src/hooks/useWaveformExtractor.ts` | `src/store/index.ts` | `useStore.getState().setWaveformPeaks` | WIRED | Line 32: `useStore.getState().setWaveformPeaks(clipId, peaks)` |
| `src/components/ClipAction.tsx` | `clip.waveformPeaks` | conditional canvas render | WIRED | Line 135: `{!isVideoClip && clip.waveformPeaks && (<WaveformCanvas bars={clip.waveformPeaks} .../>)}` |
| `src/components/AppShell.tsx` | `src/hooks/useWaveformExtractor.ts` | hook mount | WIRED | Line 12 import; line 21 `useWaveformExtractor()` |

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| WAVE-01 | 07-01, 07-02 | User can see audio waveforms rendered on audio clips in the timeline | SATISFIED | Full pipeline wired: import → extraction hook → store → canvas renderer; visual checkpoint approved; REQUIREMENTS.md updated to `[x]` |

No orphaned requirements — only WAVE-01 is mapped to Phase 7 in REQUIREMENTS.md traceability table.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/ClipAction.test.tsx` | 30, 43 | `waveformPeaks: [0.5, 1.0, 0.3]` (number[] assigned to WaveformBar[]) | Blocker | `npm run build` fails with 6 TS2322 errors; Vitest tests pass at runtime only because Vitest does not type-check |

**Pre-existing build errors (introduced before Phase 7, not phase 7's responsibility):**
- `ClipSettingsPanel.test.tsx` — 5 errors (missing `waveformPeaks` field and incomplete `UiState` mock)
- `TimelinePanel.test.tsx` — 1 error (incomplete `UiState` mock)
- `useFileImport.test.ts` — 1 error (incomplete `UiState` mock)
- `store.test.ts` — 1 error (incomplete `UiState` mock)

These 8 pre-existing errors exist in the `HEAD` commit before any phase 7 files were applied; they are not regressions from this phase.

---

### Human Verification Required

#### 1. Visual waveform correctness

**Test:** Run `npm run dev`, open `http://localhost:5173`, import an MP3/WAV file, observe the audio clip on the timeline
**Expected:** Audacity-style dual-layer waveform bars appear within a few seconds — faint white outer envelope (min/max transients) plus bright white inner fill (RMS loudness), center-anchored, no bars on video clips, no bars while peaks are null
**Why human:** Canvas pixel rendering is not verifiable in happy-dom. This was already approved at Task 3 checkpoint per the 07-02-SUMMARY.

---

### Gaps Summary

One gap blocks the phase from being considered fully clean:

**`ClipAction.test.tsx` uses stale `number[]` types for `waveformPeaks`.** When the implementation was upgraded from `number[]` to `WaveformBar[]` during Plan 02 execution, the test file at lines 30 and 43 was not updated to match. The array literals `[0.5, 1.0, 0.3]` should be `[{ min: -0.25, max: 0.5, rms: 0.35 }, ...]` (or equivalent `WaveformBar` objects). Because Vitest transpiles without type-checking, the tests pass at runtime — but `tsc -b` (run as part of `npm run build`) fails with 6 TS2322 errors exclusively from this file.

The fix is minimal: replace the two `waveformPeaks: [0.5, 1.0, 0.3]` literals with `WaveformBar[]` object arrays. No logic changes are needed — only the data shape of the test fixtures.

---

_Verified: 2026-03-18T04:05:00Z_
_Verifier: Claude (gsd-verifier)_
