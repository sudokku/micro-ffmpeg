---
phase: 10
slug: preview-panel
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 0 | PREV-04 | unit | `npx vitest run src/utils/buildCanvasFilter.test.ts` | ❌ W0 | ⬜ pending |
| 10-01-02 | 01 | 0 | PREV-01, PREV-03 | unit | `npx vitest run src/utils/previewUtils.test.ts` | ❌ W0 | ⬜ pending |
| 10-01-03 | 01 | 1 | PREV-02 | unit | `npx vitest run src/store/store.test.ts` | ✅ extend | ⬜ pending |
| 10-02-01 | 02 | 2 | PREV-01 | manual | Browser: scrub playhead, observe canvas frame | — | ⬜ pending |
| 10-02-02 | 02 | 2 | PREV-02 | manual | Browser: play/pause, observe audio + playhead | — | ⬜ pending |
| 10-02-03 | 02 | 2 | PREV-03 | manual | Browser: verify MM:SS timecode updates | — | ⬜ pending |
| 10-02-04 | 02 | 2 | PREV-04 | manual | Browser: apply blur/brightness, observe canvas | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/utils/buildCanvasFilter.ts` — CSS filter string builder (PREV-04)
- [ ] `src/utils/buildCanvasFilter.test.ts` — unit tests for filter mapping
- [ ] `src/utils/previewUtils.ts` — `findClipAt`, `computeTotalDuration`, `formatTimecode`
- [ ] `src/utils/previewUtils.test.ts` — unit tests for clip-finding and timecode formatting

*Note: Existing `src/store/store.test.ts` covers PREV-02 store actions (setPlayheadTime/setIsPlaying) — extend, don't create.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Canvas draws correct frame at playheadTime | PREV-01 | happy-dom has no Canvas 2D or HTMLVideoElement | Scrub timeline; verify canvas shows matching frame |
| Play/pause advances playhead with audio | PREV-02 | rAF and HTMLAudioElement not in happy-dom | Press Space/click play; confirm playhead moves, audio plays |
| Timecode display updates during playback | PREV-03 | Requires live rAF loop | Play; watch MM:SS counter increment |
| Filters visible in canvas | PREV-04 | drawImage + ctx.filter not in happy-dom | Set blur=5, brightness=-0.5 on a clip; confirm visual effect |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
