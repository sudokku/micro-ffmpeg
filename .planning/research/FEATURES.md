# Feature Research

**Domain:** Browser-based NLE video editor (client-side, ffmpeg.wasm)
**Researched:** 2026-03-17
**Confidence:** HIGH (core browser APIs) / MEDIUM (NLE UX patterns) / HIGH (ffmpeg filter behavior)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist in any video editor. Missing these makes the product feel broken or half-finished.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Preview panel shows current frame | Every NLE from iMovie to Premiere has a viewer — no preview = blind editing | MEDIUM | Seek to playhead position via `video.currentTime`, draw to canvas via `drawImage`. Must handle the `seeked` event before capturing; setting `currentTime` is async (20–100ms decode delay). |
| Play/pause button in preview | Users cannot evaluate edits without playback | LOW | `video.play()` / `video.pause()` on a hidden video element; drive `requestAnimationFrame` loop to sync canvas + playhead. |
| Timecode display | Standard in all NLEs — tells user where they are | LOW | Format `HH:MM:SS:FF` or simpler `MM:SS.ms`. Drives off `video.currentTime` updated each RAF tick. |
| Playhead syncs to preview position | If scrubbing the timeline doesn't move the preview, the tool feels broken | MEDIUM | Timeline library fires time-change events; editor must relay them to `video.currentTime`. Bidirectional: preview playback must drive timeline cursor too. |
| Audio plays during playback | Silent preview is disorienting, especially for music/dialogue clips | MEDIUM | `<audio>` element for the audio track, synchronized via shared `currentTime` offset. The video element's own audio stream covers video clips with audio. |
| Timeline zoom | Standard interaction — without it, precision trimming on long clips is impossible | MEDIUM | Scale the pixels-per-second value. `@xzdarcy/react-timeline-editor` has a `scale` prop; +/− buttons + Cmd/Ctrl+scroll event handler updating that value in store/ui state. |
| Multi-clip delete | Users batch-delete takes all the time; one-by-one is unusable for long projects | LOW | Requires multi-selection to exist first; then `deleteClip` called for each selected ID. |
| Per-clip volume control | Basic audio mixing — expected in any tool that handles audio clips | LOW | Store field `volume: number` (0.0–2.0). Maps to ffmpeg `volume` audio filter at export time. |
| Clip speed change | CapCut and iMovie both offer it; target audience (CapCut-style) expects this | MEDIUM | ffmpeg: `setpts=PTS/SPEED` for video + chained `atempo` for audio (see atempo section below). |

### Differentiators (Competitive Advantage)

Features that go beyond baseline expectations for a stripped-down tool.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Audio waveforms on timeline | Makes audio editing feel professional; iMovie has this, most browser editors omit it | HIGH | `OfflineAudioContext` decodes the audio file to an `AudioBuffer`, then peak data is extracted per-pixel and drawn to a canvas overlay on each audio clip. This is expensive to compute — must be done once per file and cached. |
| Multi-clip selection with bulk settings | Editing many clips uniformly (volume pass, color correction) is painful one-by-one | MEDIUM | Requires selection set in store (`selectedClipIds: Set<string>`). Settings panel applies to all selected clips via `updateClipSettings` loop. |
| Move selected clips together | Dragging multiple clips together is a standard NLE power-user feature | HIGH | The timeline library (`@xzdarcy`) renders individual clip actions. Coordinated multi-move requires intercepting drag events and offsetting all selected clips by the same delta — needs careful handling to avoid clips overlapping. |
| Per-clip rotation presets | Handles portrait video shot on phones — very common use case | LOW | ffmpeg `transpose` filter (0/1/2/3) or `rotate` for 180°. Store field `rotation: 0 \| 90 \| 180 \| 270`. |
| Flip H/V | Mirrors clips — used for corrections and creative effect | LOW | ffmpeg `hflip` and `vflip` filters. Store fields `flipH: boolean`, `flipV: boolean`. |
| Hue shift | Beyond basic color grading; useful for creative color treatment | LOW | ffmpeg `hue=h=DEGREES` filter. Store field `hue: number` (0–360). |
| iMovie-style UI polish | Most browser editors look like developer demos; polished UI builds user trust | MEDIUM | Three-panel layout: media sidebar (left or collapsible), preview (center, 16:9 aspect), clip settings (right). Timeline at bottom. Consistent spacing, rounded controls, dark theme already established. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time preview of ffmpeg filters | Users want to see blur/brightness applied in the preview | Extremely expensive: would require re-encoding via ffmpeg.wasm on every settings change. ffmpeg.wasm is single-threaded; a single filter render on a 10s clip takes 5–15s | Show raw unfiltered preview; filters only apply at export. Make this explicit in the UI with a label like "Filters applied on export." |
| Frame-accurate multi-clip preview composition | Compositing video + audio tracks in sync in the browser without re-encoding | Requires WebGL shader pipeline or a library like BBC VideoContext; massive complexity for marginal gain in a two-track editor | Single active video track; audio plays alongside via a separate `<audio>` element |
| Continuous smooth scrubbing | Dragging playhead with fluid frame-by-frame video update | `video.currentTime` seek is async (seeked event fires 20–100ms after set); setting it faster than it decodes causes frame skipping and visual glitches | Throttle seeks to ~150ms minimum intervals; show a loading indicator on the canvas during decode |
| Drag-and-drop waveform trimming | Users may want to trim by dragging on the waveform | The timeline library owns trimming UX; a separate waveform-based trim surface would conflict with it | Keep trim on the timeline clip edges (already built); waveform is display-only |
| Per-frame keyframe animation | Animating filter values over time | Enormous complexity: requires keyframe data model, interpolation, timeline markers | Fixed per-clip settings are sufficient for the target audience |

---

## Feature Dependencies

```
Preview Panel (canvas frame display)
    └──requires──> Hidden <video> element with source object URL
                       └──requires──> Clip object URLs (already built in thumbnail system)

Play/Pause Playback
    └──requires──> Preview Panel
    └──requires──> Timeline playhead control (bidirectional sync)

Timecode Display
    └──requires──> Preview Panel (currentTime source)

Audio Waveform Rendering
    └──requires──> Audio file decoded via OfflineAudioContext (per-file, cached)
    └──renders to──> Canvas overlay on timeline audio clip actions

Timeline Zoom
    └──requires──> scale prop wired to @xzdarcy/react-timeline-editor
    └──enhances──> Playhead sync (pixel coordinates change with zoom)

Multi-Clip Selection
    └──requires──> selectedClipIds set in UiState (store schema change from single string to Set)
    └──enables──> Bulk delete (SEL-02)
    └──enables──> Bulk settings apply (SEL-03)
    └──enables──> Coordinated multi-clip move (SEL-04)

Bulk Settings Apply (SEL-03)
    └──requires──> Multi-Clip Selection
    └──requires──> ClipSettings store supports batch updateClipSettings

Clip Speed (CLIP-01)
    └──requires──> speed field in ClipSettings (store schema change)
    └──requires──> buildFilterGraph updated: setpts + chained atempo

Rotation / Flip / Hue (CLIP-02/04/05)
    └──requires──> rotation/flipH/flipV/hue fields in ClipSettings
    └──requires──> buildFilterGraph updated: transpose/hflip/vflip/hue filters

Volume (CLIP-03)
    └──requires──> volume field in ClipSettings
    └──requires──> buildFilterGraph updated: volume audio filter

UI Polish (UI-01)
    └──enhances──> Preview Panel (needs to be in center layout)
    └──enhances──> ClipSettingsPanel (expanded with new fields)
    └──conflicts with (timing)──> Doing layout before preview panel is wired
```

### Dependency Notes

- **Multi-clip selection requires store schema change:** `UiState.selectedClipId: string | null` must become `selectedClipIds: Set<string>` (or `string[]`). Every consumer of `selectedClipId` must be updated simultaneously. This is the highest-impact schema migration in the milestone.
- **Speed requires chained atempo in filter graph:** `atempo` only accepts values between 0.5 and 2.0 without quality degradation. For 0.25× speed: `atempo=0.5,atempo=0.5`. For 4× speed: `atempo=2.0,atempo=2.0`. `buildFilterGraph.ts` must handle this chaining automatically.
- **Preview panel layout must be resolved before ClipSettingsPanel expansion:** The main content area currently shows a placeholder. The three-panel layout needs to be established first so the new clip settings fields have a home.
- **Waveform rendering is expensive and must be cached:** Decoding a large audio file via `OfflineAudioContext` blocks the event loop briefly. Cache the peak data keyed by `File` reference or a hash; never re-compute on re-render.

---

## MVP Definition

This is a subsequent milestone (v1.1) — everything below is in scope. The ordering within the milestone matters.

### Phase 1 Priority (Foundation — unblocks everything else)

- [ ] Store schema: add `speed`, `rotation`, `flipH`, `flipV`, `hue`, `volume` to `ClipSettings`; migrate `selectedClipId` to `selectedClipIds` — required by nearly every other feature
- [ ] Preview panel: hidden video element + canvas frame display + playhead sync — the central feature of the milestone
- [ ] Timeline zoom: `scale` prop wired to store ui state — low effort, high value

### Phase 2 Priority (Core NLE features)

- [ ] Play/pause with audio sync — depends on preview panel
- [ ] Timecode display — trivial once preview panel exists
- [ ] Multi-clip selection (Cmd/Ctrl+click) — depends on store schema change
- [ ] Bulk delete + bulk settings — depends on multi-clip selection
- [ ] Per-clip speed, rotation, flip, hue, volume in ClipSettingsPanel + filter graph

### Phase 3 Priority (Polish and waveforms)

- [ ] Audio waveform rendering (OfflineAudioContext → canvas) — highest complexity, no blockers except stable timeline
- [ ] Coordinated multi-clip drag (move together) — depends on multi-select; highest UX complexity
- [ ] iMovie-style UI polish pass — depends on preview panel being in place

### Future Consideration (v2+)

- [ ] Real-time filter preview — requires shader pipeline or re-encode; too expensive for v1.1
- [ ] Keyframe animation — entirely different data model
- [ ] Waveform-based trimming — conflicts with timeline library's own trim handles

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Preview panel (canvas frame + seek) | HIGH | MEDIUM | P1 |
| Play/pause with audio sync | HIGH | MEDIUM | P1 |
| Timecode display | MEDIUM | LOW | P1 |
| Timeline zoom | HIGH | LOW | P1 |
| Store schema migration (selectedClipIds, new ClipSettings fields) | HIGH (enables others) | MEDIUM | P1 |
| Multi-clip selection | HIGH | MEDIUM | P1 |
| Bulk delete | MEDIUM | LOW | P1 |
| Bulk settings apply | MEDIUM | LOW | P2 |
| Per-clip speed (setpts + atempo) | HIGH | MEDIUM | P1 |
| Per-clip rotation/flip | MEDIUM | LOW | P2 |
| Per-clip volume | MEDIUM | LOW | P2 |
| Per-clip hue shift | LOW | LOW | P2 |
| Audio waveforms | MEDIUM | HIGH | P2 |
| Coordinated multi-clip move | MEDIUM | HIGH | P2 |
| UI polish (iMovie layout) | HIGH | MEDIUM | P2 |
| Real-time filter preview | LOW | VERY HIGH | P3 |

**Priority key:**
- P1: Implement in first phase of milestone
- P2: Implement in second/third phase; unlocked by P1
- P3: Defer to v2+

---

## Competitor Feature Analysis

| Feature | iMovie (Mac) | CapCut (Web) | Our Approach |
|---------|--------------|--------------|--------------|
| Preview panel | Full viewer, always visible, center top | Full viewer, center | HTML5 video + canvas, center panel; no filter compositing |
| Playback | Native, smooth, filters applied | Native, smooth | `requestAnimationFrame` loop drawing video frames to canvas; filters shown raw in preview |
| Timeline zoom | Scroll wheel on timeline | Pinch/scroll | Cmd/Ctrl+scroll + +/− buttons via `@xzdarcy` `scale` prop |
| Audio waveforms | Yes, always rendered | Yes | OfflineAudioContext peak extraction, rendered once per file to canvas |
| Multi-clip select | Click + Shift/Cmd | Click + Shift | Cmd/Ctrl+click for multi-select; no box-select (out of scope) |
| Speed change | 12 presets (0.1×–8×) | Continuous slider + presets | 5 presets: 0.25×/0.5×/1×/2×/4× |
| Audio pitch on speed | Preserved (native engine) | Preserved | Preserved at export via chained `atempo` |
| Rotation | 90° increments | 0–360° dial | 4 presets: 0°/90°/180°/270° |
| Volume | Per-clip slider | Per-clip slider | Per-clip slider, applied via ffmpeg `volume` filter at export |
| Flip H/V | Yes | Yes | Yes, toggle buttons |
| Hue shift | No (only saturation) | Yes | Yes, slider (hue filter) |

---

## Implementation Notes by Feature Area

### Preview Panel Sync

The key implementation challenge is the async gap between setting `video.currentTime` and the frame being available. The `seeked` event must fire before `drawImage` is called. Pattern:

```
video.currentTime = targetTime
video.addEventListener('seeked', () => ctx.drawImage(video, 0, 0), { once: true })
```

During active playback, use a `requestAnimationFrame` loop instead — the video element handles decoding, and `drawImage` is called each frame. The loop must also push `video.currentTime` back to the timeline's playhead position.

The video element should be hidden (`display: none` or off-screen), with the canvas as the visible preview. This avoids double-render.

### Audio Waveform Rendering

Pattern: fetch the `File` → `arrayBuffer()` → `AudioContext.decodeAudioData()` (or `OfflineAudioContext`) → extract `getChannelData()` peaks → draw bars/lines on canvas element sized to the clip width in timeline pixels.

Critical: cache the peak array keyed on file identity. Re-computing on every render or zoom level change will freeze the UI. At zoom change, redraw from cached peaks — no re-decode needed.

`OfflineAudioContext` vs `AudioContext.decodeAudioData`: Either works for decoding. `OfflineAudioContext` is not necessary for waveform extraction — standard `AudioContext.decodeAudioData` (available everywhere) produces the same `AudioBuffer`. Use standard `AudioContext` for simplicity.

### Speed Filter Graph

For audio clips or video clips with audio, `atempo` must be chained:
- 0.25× → `atempo=0.5,atempo=0.5`
- 0.5× → `atempo=0.5`
- 1× → (no filter)
- 2× → `atempo=2.0`
- 4× → `atempo=2.0,atempo=2.0`

For video, `setpts=PTS/(SPEED)` — the inverse multiplier. At speed=2, `setpts=0.5*PTS`.

`atempo` values above 2.0 technically work (up to 100.0) but the filter skips samples rather than blending — quality degrades. Chaining two 2.0 filters for 4× is the correct approach.

### Multi-Clip Selection Store Migration

`UiState.selectedClipId: string | null` must become `selectedClipIds: string[]` (array, not Set, to keep Zustand serializable and Zundo-compatible). The single-select use case becomes `selectedClipIds[0] ?? null`.

Zundo `partialize` already excludes `ui` from undo history — no change needed there. But every component that reads `ui.selectedClipId` must be updated to read `ui.selectedClipIds`.

---

## Sources

- [MDN: Manipulating video using canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Manipulating_video_using_canvas) — HIGH confidence
- [MDN: OfflineAudioContext](https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext) — HIGH confidence
- [MDN: Web Audio API Visualizations](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API) — HIGH confidence
- [web.dev: requestVideoFrameCallback](https://web.dev/articles/requestvideoframecallback-rvfc) — HIGH confidence
- [FFmpeg atempo filter docs (7.1)](https://ayosec.github.io/ffmpeg-filters-docs/7.1/Filters/Audio/atempo.html) — HIGH confidence
- [Shotstack: FFmpeg speed up/slow down](https://shotstack.io/learn/ffmpeg-speed-up-video-slow-down-videos/) — MEDIUM confidence
- [Creatomate: Building a video editor in JavaScript](https://creatomate.com/blog/how-to-build-a-video-editor-in-javascript) — MEDIUM confidence
- [DEV: Building a TypeScript Video Editor as a Solo Dev](https://dev.to/bladerik/building-a-typescript-video-editor-as-a-solo-dev-2oo8) — MEDIUM confidence
- [Apple: iMovie window layout](https://support.apple.com/guide/imovie/change-the-window-layout-movcab8cb6ef/mac) — HIGH confidence

---
*Feature research for: browser NLE video editor (micro-ffmpeg v1.1 milestone)*
*Researched: 2026-03-17*
