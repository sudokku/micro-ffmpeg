---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (bundled with Vite ecosystem) |
| **Config file** | `vitest.config.ts` (none yet — Wave 0 installs) |
| **Quick run command** | `npx vitest run --reporter=dot` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=dot`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| SC-1 | 01-01 | 1 | Vite+React 19 builds | smoke | `npx vite build` | ❌ W0 | ⬜ pending |
| SC-2 | 01-02 | 1 | Store slice shape correct | unit | `npx vitest run src/store/store.test.ts` | ❌ W0 | ⬜ pending |
| SC-3 | 01-02 | 1 | Zundo partialize excludes ui+export | unit | `npx vitest run src/store/store.test.ts` | ❌ W0 | ⬜ pending |
| SC-4 | 01-03 | 2 | Comlink worker responds to ping | integration | `npx vitest run src/workers/ffmpeg.worker.test.ts` | ❌ W0 | ⬜ pending |
| SC-5 | 01-04 | 2 | Timeline renders two rows | unit/render | `npx vitest run src/components/TimelinePanel.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — vitest config with jsdom environment for React component tests
- [ ] `src/store/store.test.ts` — stubs covering SC-2 (store slice shape) and SC-3 (Zundo partialize exclusions)
- [ ] `src/workers/ffmpeg.worker.test.ts` — stub covering SC-4 (Comlink ping round-trip)
- [ ] `src/components/TimelinePanel.test.tsx` — stub covering SC-5 (two-row timeline render)
- [ ] Install test dependencies: `npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Vite dev server starts and hot-reloads | SC-1 | Browser visual verification | Run `npm run dev`, open browser, confirm React app renders with dark background |
| Dark shell layout renders correctly | CONTEXT layout decision | Visual | Header visible, middle placeholder visible, empty timeline rows visible |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
