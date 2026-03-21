---
phase: 11
slug: clip-settings-ui-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vite.config.ts` |
| **Quick run command** | `npx vitest run src/components/ClipSettingsPanel` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/components/ClipSettingsPanel`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | CLIP-01 | unit | `npx vitest run src/components/ClipSettingsPanel` | ✅ | ⬜ pending |
| 11-01-02 | 01 | 1 | CLIP-02 | unit | `npx vitest run src/components/ClipSettingsPanel` | ✅ | ⬜ pending |
| 11-01-03 | 01 | 1 | CLIP-03 | unit | `npx vitest run src/components/ClipSettingsPanel` | ✅ | ⬜ pending |
| 11-01-04 | 01 | 1 | CLIP-04 | unit | `npx vitest run src/components/ClipSettingsPanel` | ✅ | ⬜ pending |
| 11-01-05 | 01 | 1 | CLIP-05 | unit | `npx vitest run src/components/ClipSettingsPanel` | ✅ | ⬜ pending |
| 11-02-01 | 02 | 2 | UI-01 | manual | N/A — visual layout | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.* `src/components/ClipSettingsPanel.test.tsx` already exists with 224 passing tests. No new test files needed for Wave 0.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| iMovie-style three-panel layout (preview center-top, sidebar right, timeline bottom) | UI-01 | Visual proportion judgment — 37vh→28vh timeline, 280px sidebar cannot be asserted by unit tests | Open editor, import a clip, verify layout matches three-panel spec in UI-SPEC.md |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
