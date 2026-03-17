---
phase: 3
slug: clip-settings
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test -- --reporter=verbose` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --reporter=verbose`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | CLIP-01–06 | unit (store) | `npm test -- src/store/store.test.ts` | ✅ (extend) | ⬜ pending |
| 03-01-02 | 01 | 1 | CLIP-01 | unit (store) | `npm test -- src/store/store.test.ts` | ✅ | ⬜ pending |
| 03-01-03 | 01 | 1 | CLIP-02 | unit (store) | `npm test -- src/store/store.test.ts` | ✅ | ⬜ pending |
| 03-01-04 | 01 | 1 | CLIP-03 | unit (store) | `npm test -- src/store/store.test.ts` | ✅ | ⬜ pending |
| 03-01-05 | 01 | 1 | CLIP-04 | unit (store) | `npm test -- src/store/store.test.ts` | ✅ | ⬜ pending |
| 03-01-06 | 01 | 1 | CLIP-05 | unit (store) | `npm test -- src/store/store.test.ts` | ✅ | ⬜ pending |
| 03-01-07 | 01 | 1 | CLIP-06 | unit (store) | `npm test -- src/store/store.test.ts` | ✅ | ⬜ pending |
| 03-02-01 | 02 | 2 | CLIP-01–06 | component | `npm test -- src/components/ClipSettingsPanel.test.tsx` | ❌ Wave 0 | ⬜ pending |
| 03-02-02 | 02 | 2 | CLIP-01–06 | component | `npm test -- src/components/ClipSettingsPanel.test.tsx` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/ClipSettingsPanel.test.tsx` — stubs for CLIP-01 through CLIP-06 component render tests
- [ ] `src/store/store.test.ts` already exists — extend with `updateClipSettings` tests (no new file, just new test cases)

*Wave 0 only covers the component test file; store test file already exists.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Slider drag creates single undo entry (not per-pixel) | CLIP-01–04 | Requires pointer interaction | 1. Drag blur slider from 0 to 10. 2. Press Cmd+Z once. 3. Verify slider returns to 0 (one undo = one drag). |
| Aspect ratio lock recalculates height from source ratio | CLIP-06 | Requires video with known dimensions | 1. Import a 1920×1080 clip. 2. Open resize, enable lock. 3. Set width to 960. 4. Verify height shows 540. |
| Crop/resize defaults equal source video dimensions | CLIP-05, CLIP-06 | Requires video metadata read | 1. Import any clip. 2. Click clip to select. 3. Open crop/resize inputs. 4. Verify values match the source video's pixel dimensions. |
| No-op detection: selecting clip does NOT create undo entry | CLIP-01–06 | Requires undo history inspection | 1. Click clip. 2. Press Cmd+Z. 3. Verify undo goes to previous action (clip move/trim), not to settings. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
