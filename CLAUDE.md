# micro-ffmpeg — Project Rules

## Git Commits

- **One commit per Phase, no exceptions.** Do NOT commit mid-phase for individual plans, tasks, or checkpoints. Stage ALL changed files (source + planning docs) and make exactly one commit when the entire phase is complete — or when the user explicitly asks for a commit.
- **Planning artifacts (`.planning/`) are part of the phase commit.** Do not make separate commits for research, requirements, roadmap, or STATE updates. Bundle them with the phase's code changes.
- **No co-authors.** Never add `Co-Authored-By` lines or any AI/tool attribution.
- **Short messages.** Format: `type: short description` (e.g. `feat: add clip settings panel`). No bullet bodies, no trailers.
- **Target: ≤1 new commit per phase on GitHub.** The goal is a clean, readable history — one commit per phase, not one per file or plan.

## Code Quality

- Write production-ready code. No `console.log` left in production paths, no debug flags, no TODO comments in shipped code.
- Handle errors gracefully — no unhandled promise rejections, no silent swallows without at least a `console.error`.

## Tech Stack (locked — do not change)

- React 19 + TypeScript + Vite + TailwindCSS v4
- Timeline: `@xzdarcy/react-timeline-editor` — types come from `@xzdarcy/timeline-engine`
- State: Zustand + Zundo — `partialize` must exclude `ui` and `export` slices
- Processing: `@ffmpeg/ffmpeg` main-thread singleton (`ffmpegSingleton.ts`) — no Comlink
- `public/ffmpeg-core.js` must be the ESM build (`dist/esm/`), not UMD
