# @xzdarcy/react-timeline-editor — API Reference

Researched 2026-03-17. Source: `node_modules/@xzdarcy/react-timeline-editor/src/`.

## Snap / Magnetic Behavior

Two independent snap mechanisms on the `<Timeline>` component:

| Prop | Type | Default | Effect |
|------|------|---------|--------|
| `dragLine` | `boolean` | `false` | Magnetic snap to other clips' start/end edges; shows visual guide lines |
| `gridSnap` | `boolean` | `false` | Snaps clip edges to grid subdivisions (`scaleWidth / scaleSplitCount`) |
| `autoScroll` | `boolean` | `false` | Auto-scrolls timeline horizontally when dragging near edge |

**Current setup (TimelinePanel.tsx):** `dragLine={true}`, `autoScroll={true}`, `gridSnap` not set (as of Phase 2).

### How `dragLine` works internally
- On drag/resize start: collects `start`/`end` pixel positions of every other clip
- During drag tick: if dragged edge is within `adsorptionDistance` (default **8px**) of a snap target, the clip locks to it
- Visual: `<DragLines>` renders a guide line at the snapped position

### Customising snap targets
```tsx
<Timeline
  dragLine={true}
  getAssistDragLineActionIds={({ action, row }) =>
    // only snap to clips on the same row
    row.actions.filter((a) => a.id !== action.id).map((a) => a.id)
  }
/>
```

## Collision / Overlap Prevention

**Not built-in.** The library does not prevent clips from overlapping.

To prevent overlap, implement it via callbacks:
```tsx
onActionMoving={({ action, row, start, end }) => {
  // return false to block the move
  for (const a of row.actions) {
    if (a.id === action.id) continue
    if (start < a.end && end > a.start) return false // overlap — block
  }
}}
```

Or clamp positions in `onActionMoveEnd` / `onActionResizeEnd`.

**Current status:** Overlapping is allowed by design in Phase 2 (no collision requirement).

## Boundary constraints per action

Each action in `TimelineRow.actions` can have:
```ts
{
  id: string
  start: number   // seconds
  end: number     // seconds
  minStart?: number
  maxEnd?: number   // caps resize; set to startTime + sourceDuration to prevent over-extension
  movable?: boolean
  flexible?: boolean  // allows resizing
}
```

**`maxEnd` in use:** `deriveEditorData` sets `maxEnd = clip.startTime + (clip.sourceDuration - clip.trimStart - clip.trimEnd)` so clips cannot be resized beyond the length of the imported source file.

## Exported types
`Timeline`, `TimelineEditor`, `TimelineState`, `TimelineRow`, `TimelineAction`, `TimelineEffect`

No utility functions are exported (all snap/pixel helpers are internal).

## FFmpeg Integration Note

**`@ffmpeg/ffmpeg` v0.12 must run on the main thread.** Its `load()` method spawns
an internal worker via `new Worker(new URL("./worker.js", import.meta.url))`.
When called from inside a Comlink worker, `import.meta.url` resolves to the bundled
worker blob URL — the internal worker can't be found → "failed to import ffmpeg-core.js".

Fix applied in `src/hooks/useThumbnailExtractor.ts`: FFmpeg singleton on main thread,
loaded once with `toBlobURL` pointing to `public/ffmpeg-core.js` + `public/ffmpeg-core.wasm`.
