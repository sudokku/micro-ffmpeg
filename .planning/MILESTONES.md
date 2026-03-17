# Milestones

## v1.0 MVP (Shipped: 2026-03-17)

**Phases completed:** 4 phases, 13 plans, 1 tasks

**Stats:** 93 commits, 103 files, ~2,489 LOC TypeScript | Timeline: 2026-03-16 → 2026-03-17

**Key accomplishments:**
1. Scaffolded Vite + React 19 + TypeScript + TailwindCSS v4 with all dependencies; ffmpeg.wasm + @xzdarcy/react-timeline-editor wired up
2. Zustand store + Zundo temporal middleware with correct partialize — ui/export excluded from undo history (core correctness requirement)
3. Full timeline editing: drag-and-drop/file import, two-track display, trim/split/delete/reorder clips
4. Static thumbnail extraction from video clips via ffmpeg.wasm worker
5. Per-clip settings panel: blur/brightness/contrast/saturation, crop rectangle, output resize — all undo-able via Zundo
6. Export pipeline: FFmpeg singleton + full filter graph (`buildVfFilter` with 16 unit tests), progress bar, cancel, and download

---

