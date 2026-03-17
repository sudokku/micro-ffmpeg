---
phase: 5
slug: store-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.0 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 5-01-01 | 01 | 1 | SC-1 (UiState fields) | unit | `npm test` → `src/store/store.test.ts` | ❌ W0 | ⬜ pending |
| 5-01-02 | 01 | 1 | SC-2 (ClipSettings fields) | unit | `npm test` → `src/store/store.test.ts` | ❌ W0 | ⬜ pending |
| 5-01-03 | 01 | 1 | SC-3 (waveformPeaks field) | unit | `npm test` → `src/store/store.test.ts` | ❌ W0 | ⬜ pending |
| 5-01-04 | 01 | 1 | SC-4 (Zundo partialize) | unit | `npm test` → `src/store/store.test.ts` | ❌ W0 | ⬜ pending |
| 5-01-05 | 01 | 1 | SC-5 (no regression) | unit | `npm test` (full suite) | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/store/store.test.ts` — add test cases for new `UiState` field defaults (`playheadTime`, `isPlaying`, `pixelsPerSecond`, `selectedClipIds`)
- [ ] `src/store/store.test.ts` — add test cases for new `ClipSettings` field defaults (`speed`, `rotation`, `volume`, `hue`, `flipH`, `flipV`)
- [ ] `src/store/store.test.ts` — add test case verifying `waveformPeaks: null` on `addClip`
- [ ] `src/store/store.test.ts` — add test verifying Zundo `partialize` excludes new `UiState` fields (`playheadTime`, `isPlaying`, `pixelsPerSecond`, `selectedClipIds`)
- [ ] `src/store/store.test.ts` — update `beforeEach` reset to include new `UiState` fields
- [ ] `src/store/store.test.ts` — update `mockClip` literal to include `waveformPeaks: null`
- [ ] `src/utils/buildFilterGraph.test.ts` — update `ClipSettings` literals to include all new required fields

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
