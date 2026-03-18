---
phase: 7
slug: waveform-infrastructure
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-18
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.0 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 7-01-01 | 01 | 0 | WAVE-01 | unit | `npm run test -- src/utils/extractPeaks.test.ts` | ❌ W0 | ⬜ pending |
| 7-01-02 | 01 | 0 | WAVE-01 | unit | `npm run test -- src/store/store.test.ts` | ❌ W0 | ⬜ pending |
| 7-01-03 | 01 | 0 | WAVE-01 | unit | `npm run test -- src/hooks/useWaveformExtractor.test.ts` | ❌ W0 | ⬜ pending |
| 7-01-04 | 02 | 0 | WAVE-01 | unit | `npm run test -- src/components/ClipAction.test.tsx` | ❌ W0 | ⬜ pending |
| 7-01-05 | 01 | 1 | WAVE-01 | unit | `npm run test -- src/utils/extractPeaks.test.ts` | ❌ W0 | ⬜ pending |
| 7-01-06 | 01 | 1 | WAVE-01 | unit | `npm run test -- src/store/store.test.ts` | ❌ W0 | ⬜ pending |
| 7-01-07 | 01 | 1 | WAVE-01 | unit | `npm run test -- src/hooks/useWaveformExtractor.test.ts` | ❌ W0 | ⬜ pending |
| 7-01-08 | 02 | 2 | WAVE-01 | unit | `npm run test -- src/components/ClipAction.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/utils/extractPeaks.test.ts` — unit tests for `extractPeaks` pure function (covers WAVE-01 extraction logic: correct length, normalization)
- [ ] `src/hooks/useWaveformExtractor.test.ts` — hook tests with mocked `OfflineAudioContext` (covers WAVE-01 extraction dispatch, video clip exclusion)
- [ ] `src/components/ClipAction.test.tsx` — rendering tests for canvas presence/absence (covers WAVE-01 render branch: audio+peaks, video clip, audio+null peaks) — **created in Plan 02 Task 2**
- [ ] New test cases appended to `src/store/store.test.ts` — covers `setWaveformPeaks` action, undo behavior, partialize exclusion

**Mock setup needed for Web Audio tests:**
```typescript
vi.stubGlobal('OfflineAudioContext', class MockOfflineAudioContext {
  decodeAudioData(buffer: ArrayBuffer): Promise<AudioBuffer> {
    const channelData = new Float32Array(1000).fill(0.5)
    return Promise.resolve({
      getChannelData: () => channelData,
      numberOfChannels: 1,
      length: 1000,
      sampleRate: 22050,
      duration: 1000 / 22050,
    } as unknown as AudioBuffer)
  }
})
```

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Waveform bars visible on audio clip in timeline after import | WAVE-01 | Canvas rendering output cannot be verified by happy-dom | Import an MP3/WAV, observe timeline — bars should appear within a few seconds |
| Waveform does NOT appear on video clips | WAVE-01 | Visual check in timeline | Import an MP4, confirm no waveform canvas on video track |
| Waveform persists through trim/split/reorder operations | WAVE-01 | Requires interactive timeline manipulation | Import audio, trim and reorder clips, confirm waveform still drawn |
| Waveform re-extracts after undo of import and re-import | WAVE-01 | Requires undo/redo cycle interaction | Import audio, undo, re-import same file — waveform should appear again |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
