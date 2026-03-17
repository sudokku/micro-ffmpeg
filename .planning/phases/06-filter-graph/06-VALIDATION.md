---
phase: 6
slug: filter-graph
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.0 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/utils/buildFilterGraph.test.ts src/hooks/useExport.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/utils/buildFilterGraph.test.ts src/hooks/useExport.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 6-01-01 | 01 | 1 | CLIP-01 | unit | `npx vitest run src/utils/buildFilterGraph.test.ts` | ✅ extend | ⬜ pending |
| 6-01-02 | 01 | 1 | CLIP-01 | unit | `npx vitest run src/utils/buildFilterGraph.test.ts` | ✅ extend | ⬜ pending |
| 6-01-03 | 01 | 1 | CLIP-02 | unit | `npx vitest run src/utils/buildFilterGraph.test.ts` | ✅ extend | ⬜ pending |
| 6-01-04 | 01 | 1 | CLIP-03 | unit | `npx vitest run src/utils/buildFilterGraph.test.ts` | ✅ new describe | ⬜ pending |
| 6-01-05 | 01 | 1 | CLIP-04 | unit | `npx vitest run src/utils/buildFilterGraph.test.ts` | ✅ extend | ⬜ pending |
| 6-01-06 | 01 | 1 | CLIP-05 | unit | `npx vitest run src/utils/buildFilterGraph.test.ts` | ✅ extend | ⬜ pending |
| 6-01-07 | 01 | 2 | CLIP-01 | unit | `npx vitest run src/hooks/useExport.test.ts` | ✅ new describe | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test files, config changes, or fixture setup needed. All new tests extend existing `describe` blocks in:
- `src/utils/buildFilterGraph.test.ts` — filter chain unit tests
- `src/hooks/useExport.test.ts` — `-t` scaling unit tests

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Exported video plays at correct speed | CLIP-01 | WASM ffmpeg can't run in vitest; visual playback check | Export a 4s clip at speed=2, verify output plays in 2s |
| Exported video is correctly rotated | CLIP-02 | Visual verification required | Export clip at rotation=90°, verify landscape→portrait transform |
| Exported audio has correct volume | CLIP-03 | Audio level verification | Export audio clip at volume=0.5, verify audible reduction |
| Hue and flip applied correctly | CLIP-04/05 | Visual color/orientation check | Export with hue=90° and flipH=true, verify visual result |

*Note: All filter chain logic is covered by unit tests. Manual checks are for end-to-end export correctness only.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
