---
phase: 2
slug: timeline-core
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.x + React Testing Library 16.x + happy-dom 20.x |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run src/store/store.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/store/store.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 0 | IMPT-01, IMPT-02 | unit | `npx vitest run src/hooks/useFileImport.test.ts` | ❌ W0 | ⬜ pending |
| 2-02-01 | 02 | 0 | TIME-01, TIME-02 | unit | `npx vitest run src/components/TimelinePanel.test.tsx` | ❌ W0 (rewrite) | ⬜ pending |
| 2-03-01 | 03 | 0 | TIME-03, TIME-04, TIME-05, TIME-06 | unit | `npx vitest run src/store/store.test.ts` | ❌ W0 | ⬜ pending |
| 2-04-01 | 04 | 0 | UNDO-01, UNDO-02 | unit | `npx vitest run src/store/store.test.ts` | ❌ W0 | ⬜ pending |
| 2-05-01 | 05 | 0 | PREV-01 | unit (contract) + manual | `npx vitest run src/workers/ffmpeg.worker.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/store/store.test.ts` — add tests for `addClip`, `moveClip`, `trimClip`, `splitClip`, `deleteClip`, and undo/redo of each (covers UNDO-01, UNDO-02, TIME-03, TIME-04, TIME-05, TIME-06)
- [ ] `src/hooks/useFileImport.test.ts` — covers IMPT-01 (drop event dispatches `addClip`) and IMPT-02 (file picker onChange dispatches `addClip`); mock store `addClip`
- [ ] `src/components/TimelinePanel.test.tsx` — update existing file: populate store before render, assert derived `editorData` rows have correct actions (covers TIME-01, TIME-02)
- [ ] `src/workers/ffmpeg.worker.test.ts` — extend existing file: add contract test for `extractFrames` method signature and `computeTimestamps` unit test (covers PREV-01 automated portion)

*PREV-01 note: Full WASM path cannot be unit-tested in Vitest without a real WASM environment. Worker API contract shape is tested; full frame extraction requires manual browser smoke test.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| ffmpeg.wasm actually extracts a frame from a real video file | PREV-01 | WASM runtime not available in Vitest/happy-dom | Dev browser: import a .mp4 file, confirm thumbnail appears on clip |
| Drag-and-drop file import feel | IMPT-01 | Drag events not fully simulatable | Dev browser: drag a video file onto the timeline drop zone |
| Timeline resize/trim interaction feel | TIME-03 | Pointer drag events on canvas-like element | Dev browser: drag clip edge, confirm bounds update |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
