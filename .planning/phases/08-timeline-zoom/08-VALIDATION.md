---
phase: 8
slug: timeline-zoom
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^3.2.0 |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `npx vitest run src/store/store.test.ts src/components/TimelinePanel.test.tsx` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/store/store.test.ts src/components/TimelinePanel.test.tsx`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 8-01-01 | 01 | 1 | ZOOM-01 | unit | `npx vitest run src/store/store.test.ts -t "setPixelsPerSecond"` | ❌ Wave 0 | ⬜ pending |
| 8-01-02 | 01 | 1 | ZOOM-01 | unit | `npx vitest run src/store/store.test.ts -t "setPixelsPerSecond"` | ❌ Wave 0 | ⬜ pending |
| 8-01-03 | 01 | 1 | ZOOM-01, ZOOM-02, ZOOM-03 | unit | `npx vitest run src/components/TimelinePanel.test.tsx` | ❌ Wave 0 | ⬜ pending |
| 8-02-01 | 02 | 2 | ZOOM-02 | unit | `npx vitest run src/components/TimelinePanel.test.tsx -t "wheel"` | ❌ Wave 0 | ⬜ pending |
| 8-02-02 | 02 | 2 | ZOOM-03 | unit | `npx vitest run src/components/TimelinePanel.test.tsx -t "fit"` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/store/store.test.ts` — add `setPixelsPerSecond` test cases (file exists; append tests for clamping and undo exclusion)
- [ ] `src/components/TimelinePanel.test.tsx` — add wheel handler and fit button tests (file exists; append tests)

*Existing test infrastructure (Vitest + jsdom) covers all phase requirements — no new framework installation needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cursor-anchored scroll position after zoom | ZOOM-02 | Requires visual inspection of scroll offset vs cursor position | Zoom with Cmd+scroll; verify the time point under cursor stays in place |
| Timeline header strip layout | ZOOM-01, ZOOM-03 | Visual positioning of − / + / ⊡ buttons | Open app, confirm buttons appear above tracks, right-aligned |
| Zoom clamped at bounds (no overflow) | ZOOM-01 | Visual — library may clip or overflow at extreme scales | Zoom in/out past bounds; verify timeline stays inside container |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
