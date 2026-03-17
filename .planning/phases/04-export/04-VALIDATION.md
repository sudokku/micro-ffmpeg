---
phase: 4
slug: export
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.0 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run src/utils/buildFilterGraph.test.ts src/store/store.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/utils/buildFilterGraph.test.ts src/store/store.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 0 | EXPO-01 | unit | `npx vitest run src/utils/buildFilterGraph.test.ts` | ❌ W0 | ⬜ pending |
| 4-01-02 | 01 | 0 | EXPO-03 | unit | `npx vitest run src/hooks/useExport.test.ts` | ❌ W0 | ⬜ pending |
| 4-01-03 | 01 | 0 | EXPO-03 | unit (React) | `npx vitest run src/components/TopBar.test.tsx` | ❌ W0 | ⬜ pending |
| 4-01-04 | 01 | 1 | EXPO-01 | unit | `npx vitest run src/store/store.test.ts` | ✅ extend | ⬜ pending |
| 4-01-05 | 01 | 1 | EXPO-01 | unit | `npx vitest run src/utils/buildFilterGraph.test.ts` | ❌ W0 | ⬜ pending |
| 4-01-06 | 01 | 1 | EXPO-02 | unit | `npx vitest run src/utils/buildFilterGraph.test.ts` | ❌ W0 | ⬜ pending |
| 4-02-01 | 02 | 2 | EXPO-03 | unit (React) | `npx vitest run src/components/TopBar.test.tsx` | ❌ W0 | ⬜ pending |
| 4-02-02 | 02 | 2 | EXPO-01 | manual | N/A — WASM not available in happy-dom | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/utils/buildFilterGraph.test.ts` — stubs for EXPO-01 filter string generation and EXPO-02 progress calculation
- [ ] `src/hooks/useExport.test.ts` — stubs for EXPO-03 download trigger (mock `URL.createObjectURL`)
- [ ] `src/components/TopBar.test.tsx` — stubs for EXPO-03 button label states (idle/rendering/done)

*Note: `src/store/store.test.ts` already exists — extend with export slice action tests.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| ffmpeg.wasm actually encodes clips in order and produces valid output file | EXPO-01 | WASM not available in happy-dom test environment | Load app, add 2+ clips with settings, click Export, verify output file plays in browser |
| Progress bar visually updates in real time during encode | EXPO-02 | Requires real ffmpeg.wasm execution | Start export with 3+ clips, observe bar incrementing per clip |
| Cancel button terminates encode and resets to idle state | EXPO-01 | Requires real ffmpeg.wasm execution | Start export, click Cancel before completion, verify UI resets |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
