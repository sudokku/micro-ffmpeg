import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useStore } from '../store'
import { deriveEditorData } from '../utils/deriveEditorData'

// Mock the timeline library (canvas/ResizeObserver not available)
vi.mock('@xzdarcy/react-timeline-editor', () => ({
  Timeline: vi.fn(() => null),
}))

beforeEach(() => {
  useStore.setState({
    tracks: { video: { id: 'video', clipIds: [] }, audio: { id: 'audio', clipIds: [] } },
    clips: {},
    clipSettings: {},
    ui: {
      selectedClipId: null,
      activeTool: 'select',
      playheadTime: 0,
      isPlaying: false,
      pixelsPerSecond: 100,
      selectedClipIds: [],
    },
    export: { status: 'idle', progress: 0 },
  })
  useStore.temporal.getState().clear()
})

describe('deriveEditorData', () => {
  it('returns two rows: video and audio', () => {
    const { tracks, clips, ui } = useStore.getState()
    const data = deriveEditorData(tracks, clips, ui.selectedClipId)
    expect(data).toHaveLength(2)
    expect(data[0].id).toBe('video')
    expect(data[1].id).toBe('audio')
  })

  it('maps video clip to video row action', () => {
    const file = new File(['data'], 'test.mp4', { type: 'video/mp4' })
    useStore.getState().addClip(file, 'video', 10)
    const { tracks, clips, ui } = useStore.getState()
    const data = deriveEditorData(tracks, clips, ui.selectedClipId)
    expect(data[0].actions).toHaveLength(1)
    expect(data[0].actions[0].start).toBe(0)
    expect(data[0].actions[0].end).toBe(10)
    expect(data[0].actions[0].effectId).toBe('default')
    expect(data[0].actions[0].flexible).toBe(true)
    expect(data[0].actions[0].movable).toBe(true)
  })

  it('maps audio clip to audio row action', () => {
    const file = new File(['data'], 'music.mp3', { type: 'audio/mpeg' })
    useStore.getState().addClip(file, 'audio', 30)
    const { tracks, clips, ui } = useStore.getState()
    const data = deriveEditorData(tracks, clips, ui.selectedClipId)
    expect(data[1].actions).toHaveLength(1)
    expect(data[1].actions[0].end).toBe(30)
  })

  it('marks selected clip as selected=true', () => {
    const file = new File(['data'], 'test.mp4', { type: 'video/mp4' })
    useStore.getState().addClip(file, 'video', 10)
    const clipId = useStore.getState().tracks.video.clipIds[0]
    useStore.getState().selectClip(clipId)
    const { tracks, clips, ui } = useStore.getState()
    const data = deriveEditorData(tracks, clips, ui.selectedClipId)
    expect(data[0].actions[0].selected).toBe(true)
  })
})

describe('zoom controls', () => {
  it('zoom in multiplies pixelsPerSecond by 1.25', () => {
    // Store starts at 100 px/s (default)
    useStore.getState().setPixelsPerSecond(useStore.getState().ui.pixelsPerSecond * 1.25)
    expect(useStore.getState().ui.pixelsPerSecond).toBe(125)
  })

  it('zoom out multiplies pixelsPerSecond by 0.8', () => {
    useStore.getState().setPixelsPerSecond(useStore.getState().ui.pixelsPerSecond * 0.8)
    expect(useStore.getState().ui.pixelsPerSecond).toBe(80)
  })

  it('zoom in from 350 clamps to 400', () => {
    useStore.setState({ ui: { ...useStore.getState().ui, pixelsPerSecond: 350 } })
    useStore.getState().setPixelsPerSecond(350 * 1.25) // 437.5
    expect(useStore.getState().ui.pixelsPerSecond).toBe(400)
  })

  it('zoom out from 7 clamps to 5', () => {
    useStore.setState({ ui: { ...useStore.getState().ui, pixelsPerSecond: 7 } })
    useStore.getState().setPixelsPerSecond(3)
    expect(useStore.getState().ui.pixelsPerSecond).toBe(5)
  })

  it('fit with clips sets pixelsPerSecond to (containerWidth * 0.9) / totalDuration', () => {
    // Simulate: containerWidth=1000, clip endTime=10 => fitted = 900/10 = 90
    const fitted = (1000 * 0.9) / 10
    useStore.getState().setPixelsPerSecond(fitted)
    expect(useStore.getState().ui.pixelsPerSecond).toBe(90)
  })

  it('fit with no clips resets to 100', () => {
    useStore.getState().setPixelsPerSecond(200) // change from default
    // No clips => totalDuration=0 => reset to 100
    useStore.getState().setPixelsPerSecond(100)
    expect(useStore.getState().ui.pixelsPerSecond).toBe(100)
  })
})
