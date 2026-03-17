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
    ui: { selectedClipId: null, activeTool: 'select' },
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
