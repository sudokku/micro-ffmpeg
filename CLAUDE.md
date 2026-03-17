# micro-ffmpeg — Project Rules

## Git Commits

- **Commit once per Phase**, not per task or per plan. Stage all changed files for the phase and make one commit when the phase is complete.
- **No co-authors.** Never add `Co-Authored-By` lines or any AI/tool attribution.
- **Short messages.** Format: `type: short description` (e.g. `feat: add clip settings panel`). No bullet bodies, no trailers.

## Code Quality

- Write production-ready code. No `console.log` left in production paths, no debug flags, no TODO comments in shipped code.
- Handle errors gracefully — no unhandled promise rejections, no silent swallows without at least a `console.error`.

## Tech Stack (locked — do not change)

- React 19 + TypeScript + Vite + TailwindCSS v4
- Timeline: `@xzdarcy/react-timeline-editor` — types come from `@xzdarcy/timeline-engine`
- State: Zustand + Zundo — `partialize` must exclude `ui` and `export` slices
- Processing: `@ffmpeg/ffmpeg` main-thread singleton (`ffmpegSingleton.ts`) — no Comlink
- `public/ffmpeg-core.js` must be the ESM build (`dist/esm/`), not UMD
