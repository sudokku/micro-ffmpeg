---
phase: 9
slug: multi-clip-selection
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/store/store.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/store/store.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 9-01-01 | 01 | 1 | SEL-01 | unit | `npx vitest run src/store/store.test.ts` | ✅ extend | ⬜ pending |
| 9-01-02 | 01 | 1 | SEL-01 | unit | `npx vitest run src/store/store.test.ts` | ✅ extend | ⬜ pending |
| 9-01-03 | 01 | 1 | SEL-01 | unit | `npx vitest run src/store/store.test.ts` | ✅ extend | ⬜ pending |
| 9-01-04 | 01 | 1 | SEL-02 | unit | `npx vitest run src/store/store.test.ts` | ✅ extend | ⬜ pending |
| 9-01-05 | 01 | 1 | SEL-02 | unit | `npx vitest run src/store/store.test.ts` | ✅ extend | ⬜ pending |
| 9-01-06 | 01 | 1 | SEL-03 | unit | `npx vitest run src/store/store.test.ts` | ✅ extend | ⬜ pending |
| 9-01-07 | 01 | 1 | SEL-03 | unit | `npx vitest run src/store/store.test.ts` | ✅ extend | ⬜ pending |
| 9-02-01 | 02 | 2 | SEL-01 | integration | `npx vitest run src/components/ClipSettingsPanel.test.tsx` | ✅ extend | ⬜ pending |
| 9-02-02 | 02 | 2 | SEL-03 | unit (render) | `npx vitest run src/components/ClipSettingsPanel.test.tsx` | ✅ extend | ⬜ pending |
| 9-02-03 | 02 | 2 | SEL-03 | unit (render) | `npx vitest run src/components/ClipSettingsPanel.test.tsx` | ✅ extend | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. No new test files or framework setup needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cmd/Ctrl+click toggles selection highlight on clip in timeline | SEL-01 | Requires real browser interaction with timeline library rendering | Load app, add 2+ clips, Cmd+click second clip, verify white-ring outline on both clips |
| Backspace removes all selected clips from timeline UI | SEL-02 | Requires real keyboard event in browser context | Load app, select 2+ clips via Cmd+click, press Backspace, verify all removed; press Cmd+Z, verify all restored in one step |
| Click empty timeline area clears selection | SEL-01 | Requires onClickRow library integration test | Load app, Cmd+click 2 clips, click empty track area, verify selection clears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
