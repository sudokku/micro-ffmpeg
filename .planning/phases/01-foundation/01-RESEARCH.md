# Phase 1: Foundation - Research

**Researched:** 2026-03-16
**Domain:** Vite + React 19 + TailwindCSS v4, Zustand + Zundo, Comlink Web Worker, @xzdarcy/react-timeline-editor
**Confidence:** HIGH (all core findings verified from npm registry, extracted package types, and official docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Clips use UUID strings as primary key (`crypto.randomUUID()`) — collision-free, serializable, safe across undo/redo delete cycles
- Normalized layout: `clips: Record<string, Clip>` at the top level; tracks hold `clipIds: string[]` (ordered)
- Track keys: `video` and `audio` (two fixed tracks, matches @xzdarcy/react-timeline-editor two-row model)
- Full Clip shape defined in Phase 1 (even though Phase 2 fills the data):
  - `id: string` (UUID)
  - `trackId: 'video' | 'audio'`
  - `sourceFile: File`
  - `sourceDuration: number` (seconds)
  - `startTime: number` (position on timeline, seconds)
  - `endTime: number` (position on timeline, seconds)
  - `trimStart: number` (seconds trimmed from clip head)
  - `trimEnd: number` (seconds trimmed from clip tail)
  - `thumbnailUrl: string | null`
- ui slice (excluded from Zundo): `selectedClipId: string | null`, `activeTool: 'select' | 'blade'`
- export slice (excluded from Zundo): at minimum `status: 'idle' | 'rendering' | 'done' | 'error'` and `progress: number`
- Zundo MUST include in temporal history: `tracks`, `clips`, `clipSettings`; MUST exclude: `ui`, `export`
- App shell layout: Header (~48px) top bar + middle placeholder (flex-grow) + timeline panel (~35-40% viewport height)
- Dark color scheme: zinc-950 / #0f0f0f range; no light mode
- @xzdarcy/react-timeline-editor must receive a controlled `actions` prop derived from the Zustand store (never hold clip state internally)
- Comlink worker exposes typed interface; main thread imports proxy only — never imports ffmpeg directly

### Claude's Discretion

- Exact Clip fields for `ClipSettings` slice shape (blur, brightness, contrast, saturation, crop, resize) — Phase 1 can stub the type, values filled in Phase 3
- ESLint/Prettier config strictness
- TypeScript strict mode level
- Directory structure within `src/` (store/, workers/, components/, hooks/, types/)
- Exact Comlink worker interface beyond the `ping` smoke test
- export slice full shape

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

## Summary

Phase 1 assembles a greenfield technical chassis: a Vite + React 19 + TailwindCSS v4 scaffold, a Zustand store with five slices wired through Zundo's temporal middleware (tracks/clips/clipSettings in history; ui/export excluded), a Comlink-wrapped Web Worker that holds an @ffmpeg/ffmpeg instance and responds to a ping call, and an @xzdarcy/react-timeline-editor rendering two empty rows (video + audio). No user-facing features land here.

All major library versions are confirmed from the npm registry as of the research date. The @xzdarcy/react-timeline-editor package exports full TypeScript types — verified by extracting and reading the package's .d.ts files directly. TailwindCSS v4 introduces a breaking change: configuration is now CSS-first and requires the `@tailwindcss/vite` plugin instead of `tailwind.config.js`. Comlink can be wired manually (expose + wrap) or via `vite-plugin-comlink`; the manual pattern is preferred here for explicit type control.

**Primary recommendation:** Scaffold with `npm create vite@latest -- --template react-ts`, layer in TailwindCSS v4 via the `@tailwindcss/vite` plugin, then add Zustand/Zundo, Comlink, the timeline editor, and ffmpeg packages in sequence. Keep Vite config COOP/COEP headers in place from day one since ffmpeg.wasm requires them.

---

## Standard Stack

### Core

| Library | Version (verified) | Purpose | Why Standard |
|---------|-------------------|---------|--------------|
| react | 19.1.0 | UI framework | Project-locked |
| react-dom | 19.1.0 | DOM renderer | Paired with react |
| typescript | 5.9.3 | Type safety | Project-locked |
| vite | 8.0.0 | Dev server + bundler | Project-locked |
| @vitejs/plugin-react | 6.0.1 | React fast refresh | Official Vite React plugin |
| tailwindcss | 4.2.1 | Utility CSS | Project-locked |
| @tailwindcss/vite | 4.2.1 | Vite-native Tailwind integration | Required for TW v4 |
| zustand | 5.0.12 | State management | Project-locked |
| zundo | 2.3.0 | Temporal (undo/redo) middleware for Zustand | Project-locked |
| comlink | 4.4.2 | RPC over Web Workers | Project-locked pattern |
| @xzdarcy/react-timeline-editor | 1.0.0 | Timeline UI component | Hard-locked |
| @ffmpeg/ffmpeg | 0.12.15 | ffmpeg.wasm runtime | Project-locked |
| @ffmpeg/util | 0.12.2 | fetchFile, toBlobURL helpers | Paired with @ffmpeg/ffmpeg |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vite-plugin-comlink | 5.3.0 | Optional — eliminates expose/wrap boilerplate | Skip in favor of manual Comlink for explicit TS control |
| @ffmpeg/core | 0.12.10 | Single-thread WASM core | Use when SharedArrayBuffer unavailable |
| @ffmpeg/core-mt | 0.12.10 | Multi-thread WASM core | Use when COOP/COEP headers are in place (default for this project) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @tailwindcss/vite plugin | postcss tailwindcss config | v3 approach; v4 makes it obsolete |
| Manual Comlink setup | vite-plugin-comlink | Plugin removes boilerplate but adds a build plugin dependency |
| @ffmpeg/core-mt | @ffmpeg/core | Single-thread avoids SharedArrayBuffer requirement but blocks UI |

**Installation:**

```bash
# Scaffold
npm create vite@latest micro-ffmpeg -- --template react-ts
cd micro-ffmpeg

# TailwindCSS v4 (no tailwind.config.js needed)
npm install tailwindcss @tailwindcss/vite

# State + undo
npm install zustand zundo

# Comlink
npm install comlink

# Timeline editor
npm install @xzdarcy/react-timeline-editor

# ffmpeg.wasm
npm install @ffmpeg/ffmpeg @ffmpeg/util
# For multi-thread (requires COOP/COEP headers):
npm install @ffmpeg/core-mt
# Or single-thread fallback:
npm install @ffmpeg/core
```

**Version verification (confirmed 2026-03-16):**

```bash
npm view @xzdarcy/react-timeline-editor version  # 1.0.0
npm view zustand version                          # 5.0.12
npm view zundo version                            # 2.3.0
npm view @ffmpeg/ffmpeg version                   # 0.12.15
npm view comlink version                          # 4.4.2
npm view tailwindcss version                      # 4.2.1
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── components/
│   ├── AppShell.tsx        # Top bar + middle placeholder + timeline panel layout
│   ├── TopBar.tsx          # App name + tool buttons placeholder
│   └── TimelinePanel.tsx   # @xzdarcy/react-timeline-editor wrapper
├── store/
│   ├── index.ts            # create() with temporal() wrapping all slices
│   ├── types.ts            # Clip, Track, ClipSettings types; store root type
│   ├── tracksSlice.ts      # tracks state + actions
│   ├── clipsSlice.ts       # clips state + actions
│   ├── clipSettingsSlice.ts # clipSettings stub (filled Phase 3)
│   ├── uiSlice.ts          # ui state (excluded from Zundo)
│   └── exportSlice.ts      # export state (excluded from Zundo)
├── workers/
│   ├── ffmpeg.worker.ts    # FFmpeg instance + Comlink.expose
│   └── ffmpeg.proxy.ts     # Main-thread worker factory (never import FFmpeg here)
├── hooks/
│   └── useTemporalStore.ts # Reactive wrapper for temporal.undo/redo
├── types/
│   └── timeline.ts         # Re-exports / augmentations for timeline editor types
└── main.tsx
```

### Pattern 1: TailwindCSS v4 Setup (CSS-First)

**What:** v4 eliminates `tailwind.config.js`; all config is in CSS using `@import` and `@theme`.
**When to use:** Always for new v4 projects.

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // ... other config
})
```

```css
/* src/index.css — only line needed for Tailwind */
@import "tailwindcss";
```

### Pattern 2: Vite Config for ffmpeg.wasm (SharedArrayBuffer)

**What:** SharedArrayBuffer requires cross-origin isolation headers. These are set at Vite dev server level and must also be mirrored in production hosting.
**When to use:** Mandatory for @ffmpeg/ffmpeg with multi-thread core.

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
  build: {
    target: 'esnext',
  },
})
```

**Important:** After adding these headers, fully stop and restart the Vite dev server (hot reload does not apply header changes).

### Pattern 3: Zustand Store with Zundo Temporal Middleware

**What:** `temporal()` wraps the store creator. `partialize` selects which slices go into undo history. Actions for undo/redo come from `useStore.temporal.getState()`.
**When to use:** Single combined store with partialize to exclude ui and export slices.

```typescript
// Source: https://github.com/charkour/zundo + verified from raw README
import { create } from 'zustand'
import { temporal } from 'zundo'
import type { TemporalState } from 'zundo'

// Exclude ui and export from undo history
const useStore = create<StoreState>()(
  temporal(
    (set, get) => ({
      // tracks, clips, clipSettings slices
      tracks: { video: { id: 'video', clipIds: [] }, audio: { id: 'audio', clipIds: [] } },
      clips: {},
      clipSettings: {},
      // ui slice (excluded)
      ui: { selectedClipId: null, activeTool: 'select' },
      // export slice (excluded)
      export: { status: 'idle', progress: 0 },
    }),
    {
      partialize: (state) => {
        const { ui, export: exportSlice, ...rest } = state
        return rest  // only tracks, clips, clipSettings in history
      },
    },
  ),
)

// Undo/redo access — non-reactive (for keyboard handlers)
const { undo, redo } = useStore.temporal.getState()

// Reactive temporal hook (for UI that shows undo stack status)
const useTemporalStore = <T,>(selector: (state: TemporalState<TrackedState>) => T) =>
  useStore.temporal(selector)
```

### Pattern 4: Comlink Web Worker Setup

**What:** Worker file exposes an object via `Comlink.expose()`. Main thread creates a typed proxy via `Comlink.wrap()`. FFmpeg instance lives inside the worker; main thread never imports @ffmpeg/ffmpeg.

**Worker file (`src/workers/ffmpeg.worker.ts`):**

```typescript
// Source: https://github.com/GoogleChromeLabs/comlink
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL } from '@ffmpeg/util'
import * as Comlink from 'comlink'

const ffmpeg = new FFmpeg()

const api = {
  async ping(): Promise<'pong'> {
    return 'pong'
  },
  async load(): Promise<void> {
    const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core-mt@0.12.10/dist/esm'
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
    })
  },
}

Comlink.expose(api)
export type FfmpegWorkerApi = typeof api
```

**Main thread proxy factory (`src/workers/ffmpeg.proxy.ts`):**

```typescript
import * as Comlink from 'comlink'
import type { FfmpegWorkerApi } from './ffmpeg.worker'

export function createFfmpegWorker(): Comlink.Remote<FfmpegWorkerApi> {
  const worker = new Worker(
    new URL('./ffmpeg.worker.ts', import.meta.url),
    { type: 'module' }
  )
  return Comlink.wrap<FfmpegWorkerApi>(worker)
}
```

**Usage in React (main thread):**

```typescript
// Never: import { FFmpeg } from '@ffmpeg/ffmpeg'  <-- banned on main thread
import { createFfmpegWorker } from '../workers/ffmpeg.proxy'

const ffmpegProxy = createFfmpegWorker()
const result = await ffmpegProxy.ping() // 'pong'
```

### Pattern 5: @xzdarcy/react-timeline-editor Empty Two-Row Shell

**What:** The Timeline component takes `editorData: TimelineRow[]` and `effects: Record<string, TimelineEffect>`. For the Phase 1 shell, pass two rows (video + audio) with empty `actions: []` arrays. CSS import is required.
**When to use:** Phase 1 establishes this controlled pattern; Phase 2 populates actions from the store.

```typescript
// Source: extracted from @xzdarcy/react-timeline-editor package .d.ts files
import { Timeline, TimelineRow, TimelineEffect } from '@xzdarcy/react-timeline-editor'
import '@xzdarcy/react-timeline-editor/dist/react-timeline-editor.css'

// Empty rows derived from store (or static for Phase 1 shell)
const editorData: TimelineRow[] = [
  { id: 'video', actions: [] },
  { id: 'audio', actions: [] },
]

// At minimum an empty effects map is required
const effects: Record<string, TimelineEffect> = {}

export function TimelinePanel() {
  return (
    <Timeline
      editorData={editorData}
      effects={effects}
      autoScroll={false}
      style={{ height: '100%', width: '100%', backgroundColor: '#191b1d' }}
    />
  )
}
```

**Key props for Phase 1 (from extracted types):**

| Prop | Type | Default | Use |
|------|------|---------|-----|
| `editorData` | `TimelineRow[]` | required | The two track rows |
| `effects` | `Record<string, TimelineEffect>` | required | Pass `{}` for shell |
| `onChange` | `(editorData: TimelineRow[]) => void` | — | Wire to store dispatch in Phase 2 |
| `autoScroll` | `boolean` | `false` | Enable when clips exist |
| `autoReRender` | `boolean` | `true` | Keep default |
| `rowHeight` | `number` | `32` | Increase for video thumbnails (Phase 2) |
| `style` | `React.CSSProperties` | — | Set height/width to fill panel |

**TimelineAction fields (for Phase 2 reference):**

```typescript
interface TimelineAction {
  id: string           // clip UUID
  start: number        // clip.startTime
  end: number          // clip.endTime
  effectId: string     // 'video-effect' or 'audio-effect'
  flexible?: boolean   // allow resize (trim)
  movable?: boolean    // allow drag
}
```

### Anti-Patterns to Avoid

- **Holding clip state inside the Timeline component:** The component must be fully controlled — `editorData` always comes from the Zustand store; `onChange` dispatches back to the store.
- **Importing `@ffmpeg/ffmpeg` in main-thread files:** Any file in `src/` that is not a worker must never import from `@ffmpeg/ffmpeg`. All ffmpeg access goes through `ffmpeg.proxy.ts`.
- **Skipping the CSS import for the timeline editor:** The component requires `@xzdarcy/react-timeline-editor/dist/react-timeline-editor.css` — without it, layout and interaction visuals break.
- **Using Zundo without partialize:** Including `ui` and `export` in undo history causes undo to restore wrong selected clip / export status (confirmed bug from prior project attempt).
- **Using TailwindCSS v3 setup patterns with v4:** `tailwind.config.js` and `@tailwind base/components/utilities` directives do not work in v4. Use `@import "tailwindcss"` in CSS only.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Timeline drag/trim/snap interactions | Custom drag handlers | @xzdarcy/react-timeline-editor | Previous Vue attempt failed doing this; timeline physics are complex |
| Undo/redo state management | Custom history stack | Zundo `temporal` middleware | Handles immer-style snapshots, partialize, future states |
| Worker RPC messaging | postMessage + event listener patterns | Comlink | Type-safe, async/await, transfer objects handled |
| CSS utility classes | Custom CSS properties | TailwindCSS | Design system consistency |
| ffmpeg.wasm worker spawning | Manual Worker() + WASM init | @ffmpeg/ffmpeg inside Comlink worker | ffmpeg.wasm manages its own internal worker; wrapping it in a Comlink proxy gives you the clean API boundary |

**Key insight:** The project's core value is "timeline + store work perfectly." Hand-rolling timeline interactions is where the previous attempt failed. The library selection exists precisely to prevent this.

---

## Common Pitfalls

### Pitfall 1: Zundo Partialize Misses `ui` or `export`

**What goes wrong:** Undo restores selected clip ID or export progress along with clip positions, causing UI state to jump unexpectedly. This was the #1 bug in the prior project attempt.
**Why it happens:** If partialize is omitted, Zundo tracks the entire store state by default.
**How to avoid:** Use destructuring in partialize: `const { ui, export: exportSlice, ...rest } = state; return rest`
**Warning signs:** After pressing Cmd+Z, the selected clip changes to what was selected before the undone action.

### Pitfall 2: ffmpeg.wasm SharedArrayBuffer Not Available

**What goes wrong:** Multi-thread ffmpeg fails with "SharedArrayBuffer is not defined" in the browser console.
**Why it happens:** Missing `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers.
**How to avoid:** Add COOP/COEP headers to `vite.config.ts` server.headers and fully restart the dev server.
**Warning signs:** Browser console shows SharedArrayBuffer error on ffmpeg.load().

### Pitfall 3: ffmpeg Packages Not Excluded from Vite's Pre-Bundling

**What goes wrong:** Vite tries to pre-bundle `@ffmpeg/ffmpeg` or `@ffmpeg/util`, fails with opaque errors about WASM or worker imports.
**Why it happens:** These packages use dynamic worker spawning patterns incompatible with Vite's pre-bundler (esbuild).
**How to avoid:** Add `optimizeDeps: { exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'] }` to `vite.config.ts`.
**Warning signs:** Errors during dev server startup referencing esbuild failing to process ffmpeg files.

### Pitfall 4: Missing CSS Import for Timeline Editor

**What goes wrong:** Timeline renders with broken layout — rows invisible or overlapping, cursor not showing, actions unstyled.
**Why it happens:** The component bundles its CSS separately in `dist/react-timeline-editor.css` and does not auto-import it.
**How to avoid:** Add `import '@xzdarcy/react-timeline-editor/dist/react-timeline-editor.css'` at the top of the file that renders the Timeline (or in `main.tsx`).
**Warning signs:** Timeline component renders a blank or collapsed box.

### Pitfall 5: TailwindCSS v4 Config Mismatch

**What goes wrong:** Tailwind classes have no effect in the browser.
**Why it happens:** Using v3 setup (`tailwind.config.js`, `@tailwind base` directives) in a v4 project, or forgetting to add the `@tailwindcss/vite` plugin to `vite.config.ts`.
**How to avoid:** Install `@tailwindcss/vite`, add it to `plugins` in vite.config.ts, and use only `@import "tailwindcss"` in CSS.
**Warning signs:** `bg-zinc-950` or any Tailwind class produces no visible style.

### Pitfall 6: Importing @ffmpeg/ffmpeg on Main Thread

**What goes wrong:** The architecture constraint is violated; future refactors are harder.
**Why it happens:** Developers import FFmpeg directly for convenience during prototyping.
**How to avoid:** Only `src/workers/ffmpeg.worker.ts` imports from `@ffmpeg/ffmpeg`. The proxy factory in `src/workers/ffmpeg.proxy.ts` uses only Comlink types.
**Warning signs:** Any grep for `from '@ffmpeg/ffmpeg'` outside of `workers/` directory.

### Pitfall 7: Timeline Editor Peer Dependency Conflicts

**What goes wrong:** `react-virtualized` (a dependency of @xzdarcy/react-timeline-editor) may emit peer dep warnings for React 19, since it was built for React 16-18.
**Why it happens:** The peer dep declaration in react-virtualized predates React 19.
**How to avoid:** Use `--legacy-peer-deps` flag when installing, or accept npm warnings (runtime compatibility is not affected).
**Warning signs:** npm install fails or warns about react-virtualized peer deps.

---

## Code Examples

### Zustand Store: Complete Slice Shape (Phase 1)

```typescript
// Source: verified against Zustand 5.x and Zundo 2.3.0 docs
import { create } from 'zustand'
import { temporal } from 'zundo'
import type { TemporalState } from 'zundo'

// --- Types ---

export interface Clip {
  id: string
  trackId: 'video' | 'audio'
  sourceFile: File
  sourceDuration: number
  startTime: number
  endTime: number
  trimStart: number
  trimEnd: number
  thumbnailUrl: string | null
}

export interface Track {
  id: 'video' | 'audio'
  clipIds: string[]
}

// Stub — fields populated in Phase 3
export interface ClipSettings {
  clipId: string
}

export interface UiState {
  selectedClipId: string | null
  activeTool: 'select' | 'blade'
}

export interface ExportState {
  status: 'idle' | 'rendering' | 'done' | 'error'
  progress: number
}

export interface StoreState {
  tracks: { video: Track; audio: Track }
  clips: Record<string, Clip>
  clipSettings: Record<string, ClipSettings>
  ui: UiState
  export: ExportState
}

// The subset tracked in undo history
type TrackedState = Omit<StoreState, 'ui' | 'export'>

// --- Store ---

export const useStore = create<StoreState>()(
  temporal(
    (_set) => ({
      tracks: {
        video: { id: 'video', clipIds: [] },
        audio: { id: 'audio', clipIds: [] },
      },
      clips: {},
      clipSettings: {},
      ui: { selectedClipId: null, activeTool: 'select' },
      export: { status: 'idle', progress: 0 },
    }),
    {
      partialize: (state): TrackedState => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { ui, export: _export, ...tracked } = state
        return tracked
      },
    },
  ),
)

// Reactive undo/redo hook
export const useTemporalStore = <T,>(
  selector: (state: TemporalState<TrackedState>) => T,
): T => useStore.temporal(selector)
```

### Comlink Worker: Ping Smoke Test

```typescript
// src/workers/ffmpeg.worker.ts
// Source: https://github.com/GoogleChromeLabs/comlink
import * as Comlink from 'comlink'

const api = {
  async ping(): Promise<'pong'> {
    return 'pong'
  },
}

Comlink.expose(api)
export type FfmpegWorkerApi = typeof api
```

```typescript
// src/workers/ffmpeg.proxy.ts
import * as Comlink from 'comlink'
import type { FfmpegWorkerApi } from './ffmpeg.worker'

let _proxy: Comlink.Remote<FfmpegWorkerApi> | null = null

export function getFfmpegProxy(): Comlink.Remote<FfmpegWorkerApi> {
  if (!_proxy) {
    const worker = new Worker(
      new URL('./ffmpeg.worker.ts', import.meta.url),
      { type: 'module' },
    )
    _proxy = Comlink.wrap<FfmpegWorkerApi>(worker)
  }
  return _proxy
}
```

### App Shell Layout

```tsx
// src/components/AppShell.tsx
export function AppShell() {
  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white">
      {/* Top bar ~48px */}
      <header className="flex-none h-12 flex items-center px-4 border-b border-zinc-800">
        <span className="text-sm font-medium">micro-ffmpeg</span>
      </header>

      {/* Middle placeholder */}
      <main className="flex-1 flex items-center justify-center text-zinc-600 text-sm">
        Clip settings — Phase 3
      </main>

      {/* Timeline panel ~37% viewport height */}
      <div className="flex-none" style={{ height: '37vh' }}>
        <TimelinePanel />
      </div>
    </div>
  )
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwind.config.js` + postcss | `@tailwindcss/vite` plugin + CSS `@import "tailwindcss"` | TW v4.0 (Jan 2025) | No config file needed; first-party Vite plugin |
| `@tailwind base/components/utilities` directives | Single `@import "tailwindcss"` | TW v4.0 | Old directives cause errors in v4 |
| Zundo `include`/`exclude` options | Single `partialize` function | Zundo v2.0 | Simpler, more flexible |
| `@ffmpeg/core` (single-thread only) | `@ffmpeg/core` + `@ffmpeg/core-mt` (separate packages) | @ffmpeg/ffmpeg 0.12 | Must choose correct core at load time |
| `createFFmpeg()` API | `new FFmpeg()` + `ffmpeg.load()` | @ffmpeg/ffmpeg 0.12 | Backward incompatible — 0.11 code does not work |
| Vite `?worker` import suffix | `new Worker(new URL(...), { type: 'module' })` | Vite 3+ | Both work; `new URL()` form is more portable |

**Deprecated/outdated:**
- `@tailwind base`: Replaced by `@import "tailwindcss"` in v4
- `createFFmpeg()` from `@ffmpeg/ffmpeg`: Removed in 0.12; use `new FFmpeg()` + `ffmpeg.load()`
- Zundo `include`/`exclude` options: Removed in v2.0; use `partialize`

---

## Open Questions

1. **ffmpeg.wasm inside a Comlink worker: nested worker constraint**
   - What we know: @ffmpeg/ffmpeg v0.12 internally spawns its own web worker (`ffmpeg.worker`). Some older GitHub issues (pre-0.12) noted `document is not defined` when running ffmpeg inside a worker, but this was for the pre-0.12 API.
   - What's unclear: Whether the 0.12 `new FFmpeg()` object, when instantiated inside a Comlink worker, can successfully spawn its internal sub-worker. Browsers support nested workers (Worker inside Worker) in modern versions, but behavior may vary.
   - Recommendation for Phase 1: The `ping` smoke test does not invoke ffmpeg.load(), so it will succeed regardless. Validate ffmpeg.load() in the worker context during Plan 01-03. If nested worker spawning fails, fall back to: hold the FFmpeg instance on the main thread but wrap all ffmpeg calls behind a store action + useEffect pattern (still avoiding direct import in components).

2. **react-virtualized peer dep warnings with React 19**
   - What we know: @xzdarcy/react-timeline-editor depends on `react-virtualized@^9.22.3`, which declares peer deps for React 16-18.
   - What's unclear: Whether this causes actual runtime errors or only install warnings.
   - Recommendation: Install with `--legacy-peer-deps`. The library uses basic react-virtualized APIs (List/Grid) that have not changed in React 19.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (bundled with Vite ecosystem) |
| Config file | `vitest.config.ts` (none yet — Wave 0 gap) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

Phase 1 has no functional requirements (pure infrastructure). Validation is via success criteria smoke tests:

| ID | Behavior | Test Type | Automated Command | File Exists? |
|----|----------|-----------|-------------------|-------------|
| SC-1 | Vite dev server starts and React 19 app renders | smoke | `npx vite build --mode test` (build passes) | Wave 0 |
| SC-2 | Zustand store initialised with correct slice shape | unit | `npx vitest run src/store/store.test.ts` | Wave 0 |
| SC-3 | Zundo partialize excludes ui and export slices | unit | `npx vitest run src/store/store.test.ts` | Wave 0 |
| SC-4 | Comlink worker responds to ping | integration | `npx vitest run src/workers/ffmpeg.worker.test.ts` | Wave 0 |
| SC-5 | Timeline renders two rows (video + audio) | unit/render | `npx vitest run src/components/TimelinePanel.test.tsx` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run --reporter=dot`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `vitest.config.ts` — framework config with jsdom environment
- [ ] `src/store/store.test.ts` — covers SC-2, SC-3 (store shape + partialize)
- [ ] `src/workers/ffmpeg.worker.test.ts` — covers SC-4 (ping)
- [ ] `src/components/TimelinePanel.test.tsx` — covers SC-5 (two-row render)
- [ ] Framework install: `npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom`

---

## Sources

### Primary (HIGH confidence)

- npm registry — `@xzdarcy/react-timeline-editor@1.0.0` package metadata, version, deps
- Package .d.ts files — extracted `interface/timeline.d.ts` and `interface/action.d.ts` directly from the npm tarball (verified TypelineRow, TimelineAction, TimelineEffect, TimelineEditor props)
- npm registry — `zustand@5.0.12`, `zundo@2.3.0`, `comlink@4.4.2`, `@ffmpeg/ffmpeg@0.12.15`, `tailwindcss@4.2.1` versions all verified
- https://raw.githubusercontent.com/charkour/zundo/main/README.md — temporal middleware API, partialize pattern, undo/redo access
- https://tailwindcss.com/blog/tailwindcss-v4 — v4 Vite plugin setup (CSS-first approach)
- https://vite.dev/guide/features.html — Web Worker import patterns

### Secondary (MEDIUM confidence)

- https://debugplay.com/posts/ffmpeg-react-setup/ — vite.config.ts for COOP/COEP headers, optimizeDeps exclude (verified against ffmpegwasm docs)
- https://github.com/mathe42/vite-plugin-comlink — Comlink + Vite worker setup patterns
- https://ffmpegwasm.netlify.app/docs/overview/ — ffmpeg.wasm 0.12 threading model

### Tertiary (LOW confidence)

- Various GitHub issues re: ffmpeg.wasm in nested workers — see Open Questions #1

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all versions confirmed from npm registry on research date
- Architecture patterns: HIGH — Zustand/Zundo/Comlink types verified from source; Timeline types extracted from package tarball
- TailwindCSS v4: HIGH — official docs confirm CSS-first setup
- ffmpeg.wasm in Comlink worker: MEDIUM — known to work in principle but nested-worker behavior unconfirmed at runtime

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (packages in this ecosystem are relatively stable; @xzdarcy/react-timeline-editor published 1.0.0 one month ago so interface is fresh)
