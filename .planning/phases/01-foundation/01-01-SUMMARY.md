---
phase: 01-foundation
plan: 01
subsystem: infra
tags: [vite, react, typescript, tailwindcss, zustand, zundo, comlink, ffmpeg, vitest, jsdom]

# Dependency graph
requires: []
provides:
  - Vite 6.4.1 + React 19 + TypeScript project scaffold
  - TailwindCSS v4 with @tailwindcss/vite CSS-first setup
  - All project dependencies installed (zustand, zundo, comlink, @xzdarcy/react-timeline-editor, @ffmpeg/ffmpeg, @ffmpeg/util)
  - Vite configured with COOP/COEP headers for SharedArrayBuffer / ffmpeg.wasm
  - Vitest with jsdom environment and globals ready
  - Build pipeline confirmed working (vite build exits 0)
affects: [02-store, 03-worker, 04-ui, all-subsequent-plans]

# Tech tracking
tech-stack:
  added:
    - vite@6.4.1 (downgraded from 8 for Node 22.2.0 compat)
    - react@19.2.4
    - typescript@5.9.3
    - tailwindcss@4.2.1 + @tailwindcss/vite@4.2.1
    - zustand@5.0.12
    - zundo@2.3.0
    - comlink@4.4.2
    - "@xzdarcy/react-timeline-editor@1.0.0"
    - "@ffmpeg/ffmpeg@0.12.15"
    - "@ffmpeg/util@0.12.2"
    - vitest@3.2.4 + @vitest/ui + jsdom@29 + @testing-library/react + @testing-library/jest-dom
  patterns:
    - TailwindCSS v4 CSS-first: @import "tailwindcss" only, no tailwind.config.js
    - COOP/COEP headers in vite server config for SharedArrayBuffer support
    - @ffmpeg packages excluded from Vite optimizeDeps to avoid esbuild conflicts
    - Separate vitest.config.ts from vite.config.ts for test environment isolation

key-files:
  created:
    - package.json
    - vite.config.ts
    - vitest.config.ts
    - src/App.tsx
    - src/index.css
    - src/main.tsx
    - src/vite-env.d.ts
    - .prettierrc
    - tsconfig.json
    - tsconfig.app.json
    - tsconfig.node.json
    - index.html
  modified: []

key-decisions:
  - "Downgraded Vite 8 to Vite 6.4.1: Node 22.2.0 installed, Vite 7/8 requires 22.12+; Vite 6 supports >=22.0.0"
  - "Vitest 3.2.x used instead of 4.x: compatible with Vite 6 ecosystem"
  - "Separate vitest.config.ts from vite.config.ts: avoids test environment pollution in dev builds"
  - "COOP/COEP headers set from day one: mandatory for ffmpeg.wasm SharedArrayBuffer multi-thread mode"

patterns-established:
  - "Pattern: TailwindCSS v4 - @import tailwindcss in CSS, @tailwindcss/vite plugin in vite.config.ts"
  - "Pattern: ffmpeg exclusion - @ffmpeg/ffmpeg and @ffmpeg/util always in optimizeDeps.exclude"

requirements-completed: [SC-1]

# Metrics
duration: 4min
completed: 2026-03-16
---

# Phase 1 Plan 01: Project Scaffold Summary

**Vite 6 + React 19 + TypeScript scaffold with TailwindCSS v4, all project dependencies (zustand/zundo/comlink/ffmpeg/timeline-editor), COOP/COEP headers for SharedArrayBuffer, and Vitest jsdom test framework**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-16T17:26:03Z
- **Completed:** 2026-03-16T17:30:42Z
- **Tasks:** 2
- **Files modified:** 19

## Accomplishments

- Scaffolded Vite + React 19 + TypeScript project and installed all 10 project dependencies in one session
- Replaced generated App.tsx with minimal dark placeholder, replaced index.css with TailwindCSS v4 single-import
- Configured vite.config.ts with COOP/COEP headers, ffmpeg optimizeDeps exclusion, and Tailwind plugin; created vitest.config.ts with jsdom; build exits 0

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Vite + React 19 + TypeScript project and install all dependencies** - `fffbc0e` (feat)
2. **Task 2: Configure Vite with COOP/COEP headers and Vitest with jsdom** - `d87e1a9` (feat)

## Files Created/Modified

- `package.json` - All project deps declared; test scripts added
- `package-lock.json` - Lock file for reproducible installs
- `vite.config.ts` - COOP/COEP headers, @tailwindcss/vite plugin, ffmpeg optimizeDeps exclude, esnext target
- `vitest.config.ts` - jsdom environment, globals: true
- `src/App.tsx` - Minimal dark placeholder with bg-zinc-950 Tailwind class
- `src/index.css` - TailwindCSS v4 single import line only
- `src/main.tsx` - React 19 root render (unchanged from scaffold)
- `src/vite-env.d.ts` - Vite client types reference
- `.prettierrc` - Code style: no semi, single quotes, trailing commas, 100 printWidth
- `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` - TypeScript strict configuration
- `index.html` - Vite entry HTML

## Decisions Made

- Downgraded from Vite 8 to Vite 6.4.1: installed Node is 22.2.0, Vite 7/8 requires ^22.12.0. Vite 6 supports >=22.0.0.
- Used Vitest 3.2.x (not 4.x) to stay in the Vite 6 ecosystem compatibility range.
- Kept separate `vitest.config.ts` from `vite.config.ts` for clean separation of dev and test environments.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Downgraded Vite from 8.0.0 to 6.4.1 for Node.js version compatibility**
- **Found during:** Task 1 (build verification)
- **Issue:** `npx vite build` failed — Vite 8 requires Node >=22.12.0, installed Node is 22.2.0. The `@rolldown/binding-darwin-arm64` native module was not resolving.
- **Fix:** Pinned `vite` to `^6.4.1` in package.json (supports Node >=22.0.0), pinned `@vitejs/plugin-react` to `^4.5.2`, pinned `vitest` and `@vitest/ui` to `^3.2.0`. Cleaned node_modules and package-lock.json, reinstalled.
- **Files modified:** `package.json`, `package-lock.json`
- **Verification:** `npx vite build` exits 0 with Vite v6.4.1 shown in output
- **Committed in:** `fffbc0e` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking)
**Impact on plan:** Version downgrade does not change any API surface used by this project. Vite 6 and 7/8 behave identically for this stack. No scope creep.

## Issues Encountered

- `npm create vite@latest . -- --template react-ts` was cancelled because the directory was non-empty. Fixed by scaffolding to a temp directory and copying files over.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Build foundation confirmed (vite build exits 0, CSS 7.85 kB with Tailwind classes processed)
- All state management, worker, and timeline dependencies installed and available for Phase 1 Plans 02-04
- COOP/COEP headers in place for ffmpeg.wasm from the start
- Vitest ready to accept test files as Plans 02-04 add store/worker/component tests

---
*Phase: 01-foundation*
*Completed: 2026-03-16*
